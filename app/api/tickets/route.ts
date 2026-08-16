import { NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { checkDurableRateLimit, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { supportResumePath } from "@/lib/support-link";

type TicketPayload = {
  email?: string;
  message?: string;
  name?: string;
  startedAt?: number;
  website?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  // Nyilvános, emailt kiváltó végpont — a korlátnak a teljes telepítésre
  // kell érvényesnek lennie, nem példányonként.
  const rate = await checkDurableRateLimit(request, "support-ticket-create", 5, 10 * 60);
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSeconds);
  }

  const parsed = await readJsonBody<TicketPayload>(request, 8_000);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const name = clean(payload.name);
  const email = clean(payload.email).toLowerCase();
  const message = clean(payload.message);
  const honeypot = clean(payload.website);
  const startedAt = Number(payload.startedAt);

  if (
    honeypot ||
    !Number.isFinite(startedAt) ||
    Date.now() - startedAt < 1_500 ||
    Date.now() - startedAt > 2 * 60 * 60 * 1_000
  ) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (name.length > 120 || message.length > 5_000) {
    return NextResponse.json({ error: "A név vagy az üzenet túl hosszú." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const visitorToken = crypto.randomUUID();
  const supabase = createServerSupabaseAdminClient();

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      name,
      email,
      message,
      status: "open",
      source: "projectedge.hu",
      visitor_token: visitorToken
    })
    .select("id, name, email, status, visitor_token")
    .single();

  if (ticketError || !ticket) {
    console.error("Support ticket insert failed", ticketError);
    return NextResponse.json({ error: "Could not save ticket." }, { status: 500 });
  }

  const { data: firstMessage, error: messageError } = await supabase
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticket.id,
      sender: "customer",
      body: message
    })
    .select("id, sender, body, created_at")
    .single();

  if (messageError || !firstMessage) {
    console.error("Support ticket message insert failed", messageError);
    await supabase.from("support_tickets").delete().eq("id", ticket.id);
    return NextResponse.json({ error: "Could not save message." }, { status: 500 });
  }

  const emailResult = await sendProjectEdgeEmail({
    to: process.env.RESEND_NOTIFICATION_EMAIL || process.env.RESEND_REPLY_TO || "info@projectedge.hu",
    subject: `Új üzenet a weboldalról: ${name}`,
    eyebrow: "PROJECTEDGE · ÚJ ÜZENET",
    preheader: `${name} új support üzenetet küldött a projectedge.hu oldalon.`,
    message: `${name} új support beszélgetést indított.\n\n${message}`,
    link: "/admin/dashboard",
    linkLabel: "Megnyitás az adminban",
    details: [
      { label: "Név", value: name },
      { label: "Email", value: email },
      { label: "Ticket", value: ticket.id.slice(0, 8).toUpperCase() }
    ]
  });

  // Visszaigazolás a látogatónak, benne a beszélgetés folytatására szolgáló
  // linkkel. Enélkül a beszélgetés ahhoz az egy böngészőhöz volt kötve, ahol
  // elindult: aki törölte a tárolt adatait vagy eszközt váltott, elvesztette.
  // A kézbesítés hibája nem buktatja el a ticket létrehozását — a beszélgetés
  // az aktuális eszközön mindenképp működik.
  const receiptResult = await sendProjectEdgeEmail({
    to: ticket.email,
    subject: "Megkaptam az üzeneted — ProjectEdge",
    eyebrow: "PROJECTEDGE · ÜZENET RÖGZÍTVE",
    preheader: `Szia ${ticket.name}! Megkaptam az üzeneted, hamarosan válaszolok.`,
    message: `Szia ${ticket.name}!\n\nMegkaptam az üzeneted, munkanapokon jellemzően 1 munkanapon belül válaszolok.\n\nAmit írtál:\n\n${message}\n\nA lenti gombbal bármelyik eszközön megnyithatod és folytathatod a beszélgetést — a válaszomról is emailt küldök.`,
    link: supportResumePath(ticket.id, ticket.visitor_token),
    linkLabel: "Beszélgetés megnyitása",
    details: [{ label: "Ticket", value: ticket.id.slice(0, 8).toUpperCase() }]
  });
  if (!receiptResult.ok) {
    console.error("Support ticket receipt email failed", receiptResult.error);
  }

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      email: ticket.email,
      name: ticket.name,
      status: ticket.status,
      visitorToken: ticket.visitor_token
    },
    messages: [firstMessage],
    emailSent: emailResult.ok,
    emailError: emailResult.ok ? null : emailResult.error
  });
}
