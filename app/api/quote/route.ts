import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const budgetOptions = new Set([
  "100k-300k",
  "300k-600k",
  "600k-1m",
  "1m-2m",
  "2m-plus",
  "not-sure"
]);

type QuotePayload = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  website?: string;
  projectType?: string;
  budget?: string;
  goals?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  let payload: QuotePayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = clean(payload.name);
  const email = clean(payload.email).toLowerCase();
  const phone = clean(payload.phone);
  const company = clean(payload.company);
  const website = clean(payload.website);
  const projectType = clean(payload.projectType);
  const budget = clean(payload.budget);
  const goals = clean(payload.goals);

  if (!name || !email || !projectType || !goals) {
    return NextResponse.json({ error: "Please fill every required field." }, { status: 400 });
  }

  if (!email.includes("@") || email.length > 160) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  if (budget && !budgetOptions.has(budget)) {
    return NextResponse.json({ error: "Invalid budget option." }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("quote_requests").insert({
    name,
    email,
    phone,
    company,
    website,
    project_type: projectType,
    budget,
    timeline: "not specified",
    goals,
    status: "new",
    source: "projectedge.hu"
  });

  if (error) {
    return NextResponse.json({ error: "Could not save request." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
