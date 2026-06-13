import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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
    .select("id, visitor_token")
    .eq("id", ticketId)
    .eq("visitor_token", token)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
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

  return NextResponse.json({ message });
}
