import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Params = {
  params: Promise<{
    ticketId: string;
  }>;
};

type RatingPayload = {
  rating?: number;
  ratingComment?: string;
  token?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request, { params }: Params) {
  const { ticketId } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const supabase = createServerSupabaseClient();

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id, name, email, status, visitor_token, rating, rating_comment")
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
      rating: ticket.rating,
      ratingComment: ticket.rating_comment,
      status: ticket.status,
      visitorToken: ticket.visitor_token
    },
    messages: messages ?? []
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const { ticketId } = await params;
  let payload: RatingPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const token = clean(payload.token);
  const rating = Number(payload.rating);
  const ratingComment = clean(payload.ratingComment);

  if (!token || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid rating." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id, visitor_token, status")
    .eq("id", ticketId)
    .eq("visitor_token", token)
    .single();

  if (ticketError || !ticket) {
    return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
  }

  if (ticket.status !== "closed") {
    return NextResponse.json({ error: "Ticket is not closed." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("support_tickets")
    .update({
      rating,
      rating_comment: ratingComment || null
    })
    .eq("id", ticketId)
    .eq("visitor_token", token)
    .select("id, rating, rating_comment")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save rating." }, { status: 500 });
  }

  return NextResponse.json({
    rating: data.rating,
    ratingComment: data.rating_comment
  });
}
