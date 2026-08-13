import { NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { checkDurableRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";

type Params = {
  params: Promise<{
    ticketId: string;
  }>;
};

type MessagePayload = {
  body?: string;
  token?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, { params }: Params) {
  const { ticketId } = await params;
  if (!isUuid(ticketId)) {
    return NextResponse.json({ error: "Invalid ticket id." }, { status: 400 });
  }

  const rate = await checkDurableRateLimit(request, "support-ticket-message", 20, 10 * 60);
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSeconds);
  }

  const parsed = await readJsonBody<MessagePayload>(request, 7_000);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const token = request.headers.get("x-visitor-token")?.trim() || clean(payload.token);
  const body = clean(payload.body);

  if (!token || !body || token.length > 128 || body.length > 5_000) {
    return NextResponse.json({ error: "Missing message." }, { status: 400 });
  }

  const supabase = createServerSupabaseAdminClient();
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id, name, email, visitor_token, status")
    .eq("id", ticketId)
    .eq("visitor_token", token)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  if (ticket.status === "closed") {
    return NextResponse.json({ error: "Ticket is closed." }, { status: 409 });
  }

  const { data: message, error: messageError } = await supabase
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender: "customer",
      body
    })
    .select("id, sender, body, created_at")
    .single();

  if (messageError || !message) {
    return NextResponse.json({ error: "Could not save message." }, { status: 500 });
  }

  const emailResult = await sendProjectEdgeEmail({
    to: process.env.RESEND_NOTIFICATION_EMAIL || process.env.RESEND_REPLY_TO || "info@projectedge.hu",
    subject: `Új üzenet a ticketben: ${ticket.name}`,
    eyebrow: "PROJECTEDGE · SUPPORT",
    preheader: `${ticket.name} új választ küldött a support beszélgetésben.`,
    message: `${ticket.name} folytatta a support beszélgetést.\n\n${body}`,
    link: "/admin/dashboard",
    linkLabel: "Válasz az adminban",
    details: [
      { label: "Név", value: ticket.name },
      { label: "Email", value: ticket.email },
      { label: "Ticket", value: ticket.id.slice(0, 8).toUpperCase() }
    ]
  });

  return NextResponse.json({
    message,
    emailSent: emailResult.ok,
    emailError: emailResult.ok ? null : emailResult.error
  });
}
