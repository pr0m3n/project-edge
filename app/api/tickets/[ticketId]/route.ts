import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Params = {
  params: Promise<{
    ticketId: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const { ticketId } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const supabase = createServerSupabaseClient();

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id, name, email, status, visitor_token")
    .eq("id", ticketId)
    .eq("visitor_token", token)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  const { data: messages, error: messagesError } = await supabase
    .from("support_ticket_messages")
    .select("id, sender, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    return NextResponse.json({ error: "Could not load messages." }, { status: 500 });
  }

  return NextResponse.json({
    ticket: {
      id: ticket.id,
      email: ticket.email,
      name: ticket.name,
      status: ticket.status,
      visitorToken: ticket.visitor_token
    },
    messages: messages ?? []
  });
}
