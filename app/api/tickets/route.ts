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

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("support_tickets").insert({
    name,
    email,
    message,
    status: "open",
    source: "projectedge.hu"
  });

  if (error) {
    return NextResponse.json({ error: "Could not save ticket." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
