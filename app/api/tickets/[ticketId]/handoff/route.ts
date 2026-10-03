import { NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { checkDurableRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { supportResumePath } from "@/lib/support-link";

/**
 * Átadás az AI-asszisztenstől Patriknak.
 *
 * A látogató itt adja meg a nevét és az emailjét — csak ekkor, amikor már van
 * miért: az AI nem tudott válaszolni, vagy ő kérte, hogy Patrik vegye át. A
 * ticket innentől `open`, tehát az adminban megválaszolatlan ügyként jelenik
 * meg, és Patrik emailben megkapja a teljes eddigi beszélgetést.
 */

type Params = { params: Promise<{ ticketId: string }> };

type HandoffPayload = {
  email?: string;
  name?: string;
  /** Ki kezdeményezte: a bot javasolta, vagy a látogató maga kérte a gombbal. */
  initiator?: string;
};

const VISITOR_REQUEST_REASON = "A látogató kérte, hogy Patrik vegye át.";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function transcriptText(messages: Array<{ sender: string; body: string }>) {
  return messages
    .map((message) => {
      const who = message.sender === "customer" ? "Látogató" : message.sender === "bot" ? "AI" : "Patrik";
      return `${who}: ${message.body}`;
    })
    .join("\n\n");
}

export async function POST(request: Request, { params }: Params) {
  const { ticketId } = await params;
  if (!isUuid(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket id." }, { status: 400 });
  }

  const rate = await checkDurableRateLimit(request, "support-bot-handoff", 5, 10 * 60);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const parsed = await readJsonBody<HandoffPayload>(request, 2_000);
  if (!parsed.ok) return parsed.response;

  const token = request.headers.get("x-visitor-token")?.trim() ?? "";
  const name = clean(parsed.data.name);
  const email = clean(parsed.data.email).toLowerCase();
  const visitorInitiated = parsed.data.initiator === "visitor";

  if (!token || token.length > 128) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Add meg a neved." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const supabase = createServerSupabaseAdminClient();
  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, status, visitor_token, handoff_reason, name, email")
    .eq("id", ticketId)
    .eq("visitor_token", token)
    .maybeSingle();
  if (!ticket) return NextResponse.json({ error: "Ticket not found." }, { status: 404 });

  // Kétszeri beküldés (dupla kattintás, újrapróbálás): ha már átadtuk, nem
  // küldünk még egy értesítőt, csak visszaadjuk a meglévő állapotot.
  if (ticket.status !== "bot") {
    return NextResponse.json({
      ticket: { id: ticket.id, name: ticket.name, email: ticket.email, status: ticket.status, visitorToken: ticket.visitor_token }
    });
  }

  const reason = ticket.handoff_reason ?? (visitorInitiated ? VISITOR_REQUEST_REASON : "Az AI átadást javasolt.");
  const { data: updated, error } = await supabase
    .from("support_tickets")
    .update({ name, email, status: "open", handoff_at: new Date().toISOString(), handoff_reason: reason })
    .eq("id", ticket.id)
    .eq("status", "bot")
    .select("id, name, email, status, visitor_token")
    .maybeSingle();
  if (error) {
    console.error("Support handoff update failed", error);
    return NextResponse.json({ error: "Could not hand off." }, { status: 500 });
  }
  if (!updated) {
    // Egy párhuzamos kérés megelőzött — az az egy küldi az értesítőt.
    return NextResponse.json({ error: "Already handed off." }, { status: 409 });
  }

  const { data: messages } = await supabase
    .from("support_ticket_messages")
    .select("sender, body, created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true })
    .limit(80);

  const notify = await sendProjectEdgeEmail({
    to: process.env.RESEND_NOTIFICATION_EMAIL || process.env.RESEND_REPLY_TO || "info@projectedge.hu",
    subject: `AI-chat átadás: ${name}`,
    eyebrow: "PROJECTEDGE · AI-CHAT ÁTADÁS",
    preheader: `${name} beszélt az AI-asszisztenssel, és most téged kér.`,
    message: `${name} az AI-asszisztenssel beszélt, és átadta neked a beszélgetést.\n\nMiért: ${reason}\n\n— A beszélgetés —\n\n${transcriptText(messages ?? [])}`,
    replyTo: email,
    link: "/admin/dashboard",
    linkLabel: "Válasz az adminban",
    details: [
      { label: "Név", value: name },
      { label: "Email", value: email },
      { label: "Forrás", value: "AI-chat átadás" },
      { label: "Ticket", value: ticket.id.slice(0, 8).toUpperCase() }
    ]
  });
  if (!notify.ok) console.error("Support handoff notification failed", notify.error);

  const receipt = await sendProjectEdgeEmail({
    to: email,
    subject: "Megkaptam az üzeneted — ProjectEdge",
    eyebrow: "PROJECTEDGE · ÜZENET RÖGZÍTVE",
    preheader: `Szia ${name}! Átvettem a beszélgetést, hamarosan válaszolok.`,
    message: `Szia ${name}!\n\nÁtvettem a beszélgetést az AI-asszisztenstől — általában pár percen belül válaszolok, legkésőbb a következő munkanapon.\n\nA lenti gombbal bármelyik eszközön megnyithatod és folytathatod a beszélgetést — a válaszomról is emailt küldök.`,
    link: supportResumePath(ticket.id, ticket.visitor_token),
    linkLabel: "Beszélgetés megnyitása",
    details: [{ label: "Ticket", value: ticket.id.slice(0, 8).toUpperCase() }]
  });
  if (!receipt.ok) console.error("Support handoff receipt failed", receipt.error);

  return NextResponse.json({
    ticket: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      status: updated.status,
      visitorToken: updated.visitor_token
    }
  });
}
