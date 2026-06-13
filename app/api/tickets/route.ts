import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type TicketPayload = {
  email?: string;
  message?: string;
  name?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let payload: TicketPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = clean(payload.name);
  const email = clean(payload.email).toLowerCase();
  const message = clean(payload.message);

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!email.includes("@") || email.length > 160) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const visitorToken = crypto.randomUUID();
  const supabase = createServerSupabaseClient();

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
    return NextResponse.json({ error: "Could not save message." }, { status: 500 });
  }

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      email: ticket.email,
      name: ticket.name,
      status: ticket.status,
      visitorToken: ticket.visitor_token
    },
    messages: [firstMessage]
  });
}
