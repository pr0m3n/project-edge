import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";

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

  const emailResult = await sendProjectEdgeEmail({
    to: "admin@projectedge.hu",
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
