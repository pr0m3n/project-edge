import { NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { checkDurableRateLimit, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { supportResumePath } from "@/lib/support-link";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptions";

/**
 * Ingyenes látványterv-kérés a főoldalról.
 *
 * Ugyanabba a ticket-postaládába fut, mint a chat és a gyorselemzés: az
 * adminban `latvanyterv` forrással jelenik meg, a látogató pedig a
 * visszaigazoló levél gombjával ugyanabban a beszélgetésben folytathatja.
 * Szándékosan NINCS fiók és nincs több lépés: a hideg leveleknél ez az
 * ajánlat hozta a legtöbb igent, és ott is csak egy válasz kellett hozzá.
 */

type MockupPayload = {
  name?: string;
  email?: string;
  hasSite?: boolean;
  website?: string;
  business?: string;
  note?: string;
  plan?: string;
  model?: string;
  /** Csomagról érkező, aki látványterv nélkül, egyből ajánlatot kér. */
  skipMockup?: boolean;
  startedAt?: number;
  honeypot?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUrl(url: string) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export async function POST(request: Request) {
  const rate = await checkDurableRateLimit(request, "mockup-request", 5, 10 * 60);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const parsed = await readJsonBody<MockupPayload>(request, 8_000);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const name = clean(payload.name);
  const email = clean(payload.email).toLowerCase();
  const hasSite = payload.hasSite !== false;
  const website = hasSite ? normalizeUrl(clean(payload.website)) : "";
  const business = clean(payload.business);
  const note = clean(payload.note);
  const startedAt = Number(payload.startedAt);
  // A csomagot csak a valódi listából fogadjuk el — szabad szöveg ne kerüljön a levélbe.
  const plan = SUBSCRIPTION_PLANS.find((item) => item.key === clean(payload.plan)) ?? null;
  const model = clean(payload.model) === "purchase" ? "egyszeri vásárlás" : "havidíj";
  // Csak csomaggal együtt értelmes: csomag nélkül mindig látványterv-kérés.
  const direct = Boolean(plan) && payload.skipMockup === true;
  const kind = direct ? "Ajánlatkérés csomagra" : "Ingyenes látványterv-kérés";

  if (
    clean(payload.honeypot) ||
    !Number.isFinite(startedAt) ||
    Date.now() - startedAt < 1_200 ||
    Date.now() - startedAt > 2 * 60 * 60 * 1_000
  ) {
    return NextResponse.json({ error: "Érvénytelen beküldés." }, { status: 400 });
  }

  if (!name || !email) {
    return NextResponse.json({ error: "Kérlek, add meg a neved és az e-mail-címed." }, { status: 400 });
  }
  if (hasSite && !website) {
    return NextResponse.json({ error: "Írd be a mostani weboldalad címét." }, { status: 400 });
  }
  if (!hasSite && !business) {
    return NextResponse.json({ error: "Írd le pár szóban, mivel foglalkozol." }, { status: 400 });
  }
  if (name.length > 120 || website.length > 300 || business.length > 300 || note.length > 2_000) {
    return NextResponse.json({ error: "Túl hosszú mezőérték." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return NextResponse.json({ error: "Érvénytelen e-mail-cím." }, { status: 400 });
  }

  const subject = hasSite ? website : business;
  // Magyar névsorrend: a megszólításhoz az utolsó tag a keresztnév („Kovács Anna” → „Anna”).
  const firstName = name.split(/\s+/).slice(-1)[0] || name;
  const lines = [
    kind,
    "",
    hasSite ? `Mostani weboldal: ${website}` : `Még nincs weboldala. Vállalkozás: ${business}`,
    plan ? `Csomag: ${plan.name} (${model})${direct ? " — látványterv nélkül, egyből ajánlatot kér" : ""}` : null,
    note ? `Megjegyzés: ${note}` : null
  ].filter((line): line is string => line !== null);
  const ticketMessage = lines.join("\n");

  const supabase = createServerSupabaseAdminClient();
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      name,
      email,
      message: ticketMessage,
      status: "open",
      source: "latvanyterv",
      visitor_token: crypto.randomUUID()
    })
    .select("id, visitor_token")
    .single();

  if (ticketError || !ticket) {
    console.error("Mockup ticket insert failed", ticketError);
    return NextResponse.json({ error: "Nem sikerült elmenteni a kérést. Kérlek, próbáld újra." }, { status: 500 });
  }

  await supabase.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    sender: "customer",
    body: ticketMessage
  });

  const details = [
    { label: "Név", value: name },
    { label: "E-mail", value: email },
    hasSite ? { label: "Weboldal", value: website } : { label: "Vállalkozás", value: business },
    ...(plan ? [{ label: "Csomag", value: `${plan.name} · ${model}` }] : []),
    ...(note ? [{ label: "Megjegyzés", value: note }] : [])
  ];

  const adminEmail = process.env.RESEND_NOTIFICATION_EMAIL || process.env.RESEND_REPLY_TO || "info@projectedge.hu";
  await sendProjectEdgeEmail({
    to: adminEmail,
    // A „Válasz” gomb egyből az érdeklődőnek írjon, ne a saját címünkre.
    replyTo: email,
    subject: `${direct ? "Új ajánlatkérés" : "Új látványterv-kérés"}: ${subject} (${name})`,
    eyebrow: direct ? "PROJECTEDGE · AJÁNLATKÉRÉS" : "PROJECTEDGE · LÁTVÁNYTERV-KÉRÉS",
    preheader: `${name}: ${kind.toLowerCase()} — ${subject}`,
    message: `${name} ${direct ? "ajánlatot kért a(z) " + plan?.name + " csomagra, látványterv nélkül" : "ingyenes látványtervet kért"}.\n\n${lines.slice(2).join("\n")}`,
    link: "/admin/dashboard",
    linkLabel: "Megnyitás az adminban",
    details,
    tags: [direct ? "Ajánlatkérés" : "Látványterv", "Lead"]
  });

  if (direct && plan) {
    await sendProjectEdgeEmail({
      to: email,
      subject: `Megkaptam az ajánlatkérésedet (${plan.name} csomag)`,
      eyebrow: "PROJECTEDGE · AJÁNLATKÉRÉS",
      preheader: `Szia ${firstName}! Egy munkanapon belül küldöm az ajánlatot.`,
      message: `Szia ${firstName}!\n\nKöszönöm, megkaptam az ajánlatkérésedet a(z) ${plan.name} csomagra (${model}). Egy munkanapon belül válaszolok a pontos ajánlattal és a következő lépéssel.\n\nHa van logód, fotód vagy szöveged, a lenti gombbal már most elküldheted.`,
      link: supportResumePath(ticket.id, ticket.visitor_token),
      linkLabel: "Beszélgetés megnyitása",
      details: [
        hasSite ? { label: "Weboldal", value: website } : { label: "Vállalkozás", value: business },
        { label: "Csomag", value: `${plan.name} · ${model}` }
      ],
      tags: ["Ajánlatkérés", "ProjectEdge"]
    });
    return NextResponse.json({ ok: true });
  }

  await sendProjectEdgeEmail({
    to: email,
    subject: "Megkaptam a látványterv-kérésedet",
    eyebrow: "PROJECTEDGE · INGYENES LÁTVÁNYTERV",
    preheader: `Szia ${firstName}! Néhány munkanapon belül küldöm a látványtervet.`,
    message: hasSite
      ? `Szia ${firstName}!\n\nKöszönöm, megkaptam a kérésedet. Átnézem a(z) ${website} oldalt, és néhány munkanapon belül elküldöm erre a címre a látványtervet PDF-ben: hogyan nézne ki az új főoldalad telefonon és számítógépen.\n\nHa közben eszedbe jut valami, amit mindenképp látnál benne (fotók, egy oldal, ami tetszik), írd meg a lenti gombbal.`
      : `Szia ${firstName}!\n\nKöszönöm, megkaptam a kérésedet. Néhány munkanapon belül elküldöm erre a címre a látványtervet PDF-ben: hogyan nézne ki a vállalkozásod főoldala telefonon és számítógépen.\n\nHa van logód, fotód vagy egy oldal, ami tetszik, a lenti gombbal elküldheted, és beleteszem a tervbe.`,
    link: supportResumePath(ticket.id, ticket.visitor_token),
    linkLabel: "Beszélgetés megnyitása",
    details: [
      hasSite ? { label: "Weboldal", value: website } : { label: "Vállalkozás", value: business },
      { label: "Várható válasz", value: "néhány munkanapon belül" }
    ],
    tags: ["Látványterv", "ProjectEdge"]
  });

  return NextResponse.json({ ok: true });
}
