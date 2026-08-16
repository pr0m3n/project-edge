import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { supportResumePath } from "@/lib/support-link";

type Params = { params: Promise<{ ticketId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { ticketId } = await params;
  if (!isUuid(ticketId)) return NextResponse.json({ error: "Érvénytelen ticket." }, { status: 400 });
  const rate = checkRateLimit(request, "support-admin-reply", 30, 10 * 60 * 1000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });

  const caller = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: { user } } = await caller.auth.getUser(token);
  const { data: adminRow } = user
    ? await caller.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle()
    : { data: null };
  if (!user || !adminRow) return NextResponse.json({ error: "Nincs admin jogosultság." }, { status: 403 });

  const parsed = await readJsonBody<{ body?: unknown }>(request, 7_000);
  if (!parsed.ok) return parsed.response;
  const body = typeof parsed.data?.body === "string" ? parsed.data.body.trim() : "";
  if (!body || body.length > 5_000) return NextResponse.json({ error: "Érvénytelen üzenet." }, { status: 400 });

  const admin = createServerSupabaseAdminClient();
  const { data: ticket } = await admin.from("support_tickets").select("id, name, email, status, visitor_token").eq("id", ticketId).maybeSingle();
  if (!ticket) return NextResponse.json({ error: "A ticket nem található." }, { status: 404 });
  if (ticket.status === "closed") return NextResponse.json({ error: "A ticket lezárt." }, { status: 409 });

  const { data: message, error } = await admin.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    sender: "admin",
    body
  }).select("id, ticket_id, sender, body, created_at").single();
  if (error || !message) return NextResponse.json({ error: "A válasz mentése nem sikerült." }, { status: 500 });

  // A link a `visitor_token`-t hordozza a hash-ében, tehát a beszélgetés
  // bármelyik eszközön folytatható — nem csak abban a böngészőben, amelyikben
  // elindult.
  const emailResult = await sendProjectEdgeEmail({
    to: ticket.email,
    subject: "Új válasz érkezett a ProjectEdge-től",
    eyebrow: "PROJECTEDGE · SUPPORT VÁLASZ",
    preheader: "Új válasz érkezett a support beszélgetésedben.",
    message: `Szia ${ticket.name}!\n\nÚj válasz érkezett:\n\n${body}\n\nA lenti gombbal bármelyik eszközön folytathatod a beszélgetést — telefonon is.`,
    link: supportResumePath(ticket.id, ticket.visitor_token),
    linkLabel: "Beszélgetés folytatása",
    details: [{ label: "Ticket", value: ticket.id.slice(0, 8).toUpperCase() }]
  });

  return NextResponse.json({ message, emailSent: emailResult.ok, emailError: emailResult.ok ? null : emailResult.error });
}
