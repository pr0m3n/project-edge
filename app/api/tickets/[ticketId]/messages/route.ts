import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  let payload: MessagePayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const token = clean(payload.token);
  const body = clean(payload.body);

  if (!token || !body) {
    return NextResponse.json({ error: "Missing message." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
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
    to: "admin@projectedge.hu",
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
