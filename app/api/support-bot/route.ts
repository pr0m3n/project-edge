import { NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import {
  checkDurableRateLimit,
  checkGlobalDurableLimit,
  isUuid,
  rateLimitResponse,
  readJsonBody
} from "@/lib/api-guard";
import { ticketSource } from "@/lib/support-source";
import { generateBotReply, type TranscriptMessage } from "@/lib/support-bot/reply";
import { redactCardNumbers } from "@/lib/support-bot/redact";

/**
 * A chat AI-asszisztense.
 *
 * Az első üzenetnél név és email NÉLKÜL jön létre egy `bot` állapotú ticket —
 * a látogatónak semmit nem kell megadnia ahhoz, hogy kérdezzen. Minden üzenet
 * (a látogatóé és a boté is) a megszokott `support_ticket_messages` táblába
 * kerül, tehát az adminban ugyanott olvasható, mint egy kézi beszélgetés.
 *
 * Ha a bot átadást jelez, a ticket `bot` marad, amíg a látogató meg nem adja
 * a nevét és az emailjét (`/api/tickets/[id]/handoff`). A `handoff_reason`
 * viszont már most beíródik: az adminban az is látszik, aki átadást kért,
 * de végül nem hagyott elérhetőséget.
 */

type BotPayload = {
  ticketId?: string;
  message?: string;
  source?: string;
  startedAt?: number;
  website?: string;
};

/** Egy botnak szánt üzenet hossza. A kézi chatben 5 000, itt kevesebb is bőven elég. */
const MAX_MESSAGE_LENGTH = 2_000;
/** Ennyi bot-válasz után a beszélgetést mindenképp Patrik veszi át. */
const MAX_BOT_REPLIES_PER_TICKET = 25;
/** Ennyi korábbi üzenetet lát a modell. */
const TRANSCRIPT_WINDOW = 30;

const FALLBACK_REPLY =
  "Most technikai okból nem tudok válaszolni. Add meg lent a neved és az email címed, és Patrik személyesen válaszol — általában pár percen belül.";
const LIMIT_REPLY =
  "Ez már egy hosszabb beszélgetés — innen Patrik viszi tovább, hogy biztosan pontos választ kapj. Add meg lent a neved és az email címed, és ő válaszol.";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const rate = await checkDurableRateLimit(request, "support-bot-message", 30, 10 * 60);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const parsed = await readJsonBody<BotPayload>(request, 6_000);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const message = redactCardNumbers(clean(payload.message));
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Az üzenet üres vagy túl hosszú." }, { status: 400 });
  }

  const supabase = createServerSupabaseAdminClient();
  const ticketId = clean(payload.ticketId);
  let ticket: { id: string; visitor_token: string; status: string; handoff_reason: string | null };
  let created = false;

  if (ticketId) {
    const token = request.headers.get("x-visitor-token")?.trim() ?? "";
    if (!isUuid(ticketId) || !token || token.length > 128) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }
    const { data } = await supabase
      .from("support_tickets")
      .select("id, visitor_token, status, handoff_reason")
      .eq("id", ticketId)
      .eq("visitor_token", token)
      .maybeSingle();
    if (!data) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    // Ha Patrik már átvette (vagy lezárta), a bot nem szól bele. A kliens
    // ebből tudja, hogy a sima üzenetküldésre kell váltania.
    if (data.status !== "bot") {
      return NextResponse.json({ error: "A beszélgetést már Patrik viszi.", status: data.status }, { status: 409 });
    }
    ticket = data;
  } else {
    // Ugyanaz a botszűrés, mint a kézi ticketnél: rejtett mező és minimális
    // kitöltési idő. Egy új bot-beszélgetés pénzbe kerül, ezt nem nyitjuk meg
    // egy egyszerű scriptnek.
    const startedAt = Number(payload.startedAt);
    if (
      clean(payload.website) ||
      !Number.isFinite(startedAt) ||
      Date.now() - startedAt < 1_500 ||
      Date.now() - startedAt > 2 * 60 * 60 * 1_000
    ) {
      return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        name: null,
        email: null,
        message,
        status: "bot",
        source: ticketSource(payload.source),
        visitor_token: crypto.randomUUID()
      })
      .select("id, visitor_token, status, handoff_reason")
      .single();
    if (error || !data) {
      console.error("Support bot ticket insert failed", error);
      return NextResponse.json({ error: "Could not save ticket." }, { status: 500 });
    }
    ticket = data;
    created = true;
  }

  const { data: customerMessage, error: customerError } = await supabase
    .from("support_ticket_messages")
    .insert({ ticket_id: ticket.id, sender: "customer", body: message })
    .select("id, sender, body, created_at")
    .single();
  if (customerError || !customerMessage) {
    console.error("Support bot customer message insert failed", customerError);
    return NextResponse.json({ error: "Could not save message." }, { status: 500 });
  }

  const { data: history } = await supabase
    .from("support_ticket_messages")
    .select("sender, body, created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: false })
    .limit(TRANSCRIPT_WINDOW);
  const transcript: TranscriptMessage[] = (history ?? [])
    .reverse()
    .map((row) => ({ sender: row.sender as TranscriptMessage["sender"], body: row.body }));

  const { count: botReplies } = await supabase
    .from("support_ticket_messages")
    .select("id", { count: "exact", head: true })
    .eq("ticket_id", ticket.id)
    .eq("sender", "bot");

  let reply: string;
  let handoff: boolean;
  let handoffReason: string | null;

  if ((botReplies ?? 0) >= MAX_BOT_REPLIES_PER_TICKET) {
    reply = LIMIT_REPLY;
    handoff = true;
    handoffReason = "Hosszú AI-beszélgetés — a látogató sok kérdést tett fel.";
  } else {
    // A napi plafon a teljes oldalra szól: ha elfogy, a látogató nem marad
    // válasz nélkül, csak Patrikhoz kerül.
    const budget = await checkGlobalDurableLimit("support-bot-daily", 1_500, 24 * 60 * 60);
    const generated = budget.allowed ? await generateBotReply(transcript, { ticketId: ticket.id }) : null;
    if (generated) {
      ({ reply, handoff, handoffReason } = generated);
    } else {
      reply = FALLBACK_REPLY;
      handoff = true;
      handoffReason = budget.allowed
        ? "Az AI technikai hiba miatt nem tudott válaszolni."
        : "Az AI napi kerete elfogyott.";
    }
  }

  const { data: botMessage, error: botError } = await supabase
    .from("support_ticket_messages")
    .insert({ ticket_id: ticket.id, sender: "bot", body: reply })
    .select("id, sender, body, created_at")
    .single();
  if (botError || !botMessage) {
    console.error("Support bot reply insert failed", botError);
    return NextResponse.json({ error: "Could not save reply." }, { status: 500 });
  }

  if (handoff) {
    await supabase
      .from("support_tickets")
      .update({ handoff_reason: handoffReason ?? ticket.handoff_reason ?? "Az AI átadást javasolt." })
      .eq("id", ticket.id);
  }

  return NextResponse.json({
    ticket: created ? { id: ticket.id, visitorToken: ticket.visitor_token, status: "bot" } : undefined,
    messages: [customerMessage, botMessage],
    handoff
  });
}
