import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { recordEmail } from "@/lib/email-log";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { previousQuarter, quarterPeriod } from "@/lib/status-report";
import { REPORT_PROJECT_COLUMNS, prepareStatusReport, reportData, type ReportProject } from "@/lib/status-report-server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Állapotjelentés kézzel, egy ügyfélre (049).
 *
 *  · `preview` — összerakja a levelet a mostani mérésből, és visszaadja
 *    (HTML, mért adat, figyelmeztetések). Nem ment és nem küld semmit.
 *  · `queue`   — ugyanezt jóváhagyásra váró levélként a naplóba teszi, ahonnan
 *    a „Levelek" oldalon egy gombbal elküldhető. Küldeni itt sem küld.
 *
 * Időszak: `current` = a folyó negyedév eddigi része, `previous` = az előző,
 * lezárt negyedév (ezt küldi a cron is).
 */

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "admin-status-report", 20, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const admin = await authenticatedUser(request);
  if (!admin) return bad("Érvénytelen vagy lejárt munkamenet.", 401);
  if (!(await isAdminUser(request, admin.id))) return bad("Nincs admin jogosultság.", 403);

  const parsed = await readJsonBody<{ projectId?: unknown; action?: unknown; period?: unknown }>(request, 2_000);
  if (!parsed.ok) return parsed.response;
  const { projectId, action, period: periodChoice } = parsed.data ?? {};
  if (typeof projectId !== "string" || !isUuid(projectId)) return bad("Érvénytelen projektazonosító.");
  if (action !== "preview" && action !== "queue") return bad("Ismeretlen művelet.");

  const db = createServerSupabaseAdminClient();
  const { data: project, error } = await db
    .from("client_projects")
    .select(REPORT_PROJECT_COLUMNS)
    .eq("id", projectId)
    .maybeSingle<ReportProject>();
  if (error) return bad(error.message, 500);
  if (!project) return bad("A projekt nem található.", 404);

  const now = new Date();
  const period = periodChoice === "previous" ? previousQuarter(now) : quarterPeriod(now);
  const prepared = await prepareStatusReport(db, project, period, now);

  if (action === "preview") {
    return NextResponse.json({
      subject: prepared.email.subject,
      html: prepared.email.html,
      to: project.contact_email,
      warnings: prepared.warnings,
      data: reportData(prepared)
    }, { headers: { "Cache-Control": "no-store" } });
  }

  // Kézi sorba állításnál az időszak-kulcs egyedi, hogy a negyedév végi
  // automatikus jelentést ne zárja ki egy próbaküldés.
  const id = await recordEmail({
    projectId: project.id,
    kind: "status_report",
    to: project.contact_email,
    subject: prepared.email.subject,
    html: prepared.email.html,
    text: prepared.email.text,
    data: reportData(prepared),
    warnings: prepared.warnings,
    periodKey: `${period.key}-kezi-${now.toISOString()}`,
    status: "pending_approval",
    decidedBy: admin.id
  });
  if (!id) return bad("A levelet nem sikerült a naplóba tenni.", 500);
  return NextResponse.json({ ok: true, id });
}
