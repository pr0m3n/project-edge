import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { deliverEmail } from "@/lib/projectedge-email";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { reportSender } from "@/lib/status-report-server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ emailId: string }> };

/**
 * Jóváhagyásra váró levél elküldése vagy elvetése (049).
 *
 * Pontosan azt küldi ki, amit az admin az előnézetben látott: a naplóban
 * tárolt HTML-t. Csak `pending_approval` állapotú levélre fut, így egy
 * dupla kattintás sem küld kétszer (a második kérés már `sent` sort talál).
 */

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request, { params }: Params) {
  const { emailId } = await params;
  if (!isUuid(emailId)) return bad("Érvénytelen levélazonosító.");

  const rate = checkRateLimit(request, "admin-email-decision", 30, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const admin = await authenticatedUser(request);
  if (!admin) return bad("Érvénytelen vagy lejárt munkamenet.", 401);
  if (!(await isAdminUser(request, admin.id))) return bad("Nincs admin jogosultság.", 403);

  const parsed = await readJsonBody<{ action?: unknown }>(request, 500);
  if (!parsed.ok) return parsed.response;
  const action = parsed.data?.action;
  if (action !== "send" && action !== "discard") return bad("Ismeretlen művelet.");

  const db = createServerSupabaseAdminClient();

  // Előbb „lefoglaljuk" a sort: csak az a kérés megy tovább, amelyik a
  // pending_approval → (sending) váltást megnyerte.
  const { data: claimed, error: claimError } = await db
    .from("email_log")
    .update({ status: action === "discard" ? "discarded" : "failed", error: action === "send" ? "Küldés folyamatban…" : null, decided_by: admin.id, updated_at: new Date().toISOString() })
    .eq("id", emailId)
    .eq("status", "pending_approval")
    .select("id,to_email,subject,html,text_body,kind")
    .maybeSingle();
  if (claimError) return bad(claimError.message, 500);
  if (!claimed) return bad("Ez a levél már nem vár jóváhagyásra.", 409);

  if (action === "discard") return NextResponse.json({ ok: true, status: "discarded" });

  if (!claimed.to_email || !claimed.html) {
    await db.from("email_log").update({ error: "Nincs címzett vagy tartalom.", updated_at: new Date().toISOString() }).eq("id", emailId);
    return bad("Nincs címzett vagy tartalom, a levél nem küldhető.", 422);
  }

  const result = await deliverEmail({
    to: claimed.to_email,
    subject: claimed.subject,
    html: claimed.html,
    text: claimed.text_body ?? "",
    replyTo: claimed.kind === "status_report" ? reportSender().email : undefined
  });

  await db.from("email_log").update({
    status: result.ok ? "sent" : "failed",
    error: result.ok ? null : result.error,
    provider_id: result.ok ? result.id ?? null : null,
    sent_at: result.ok ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }).eq("id", emailId);

  if (!result.ok) return bad(`A küldés nem sikerült: ${result.error}`, 502);
  return NextResponse.json({ ok: true, status: "sent" });
}
