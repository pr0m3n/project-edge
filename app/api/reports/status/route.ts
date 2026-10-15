import { NextResponse } from "next/server";
import { recordEmail } from "@/lib/email-log";
import { deliverEmail } from "@/lib/projectedge-email";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { previousQuarter } from "@/lib/status-report";
import { REPORT_PROJECT_COLUMNS, prepareStatusReport, reportData, reportSender, type ReportProject } from "@/lib/status-report-server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * NEGYEDÉVES ÁLLAPOTJELENTÉS — ügyfélkapu nélküli ügyfeleknek (049).
 *
 * A negyedév második napján fut, és az ELŐZŐ, lezárt negyedévet jelenti le
 * minden olyan projektnél, ahol a `status_reports` be van kapcsolva.
 *
 * A levél csak akkor megy ki magától, ha az ügyfélnél be van kapcsolva az
 * automatikus küldés ÉS a mérés ellenőrzése semmi gyanúsat nem talált. Minden
 * más esetben jóváhagyásra vár az admin „Levelek" oldalán, és az admin
 * értesítést kap. Egy időszakról egy jelentés: a napló egyedi indexe őrzi.
 */

async function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return true;
  const user = await authenticatedUser(request);
  return Boolean(user && (await isAdminUser(request, user.id)));
}

async function runStatusReports(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  }

  const db = createServerSupabaseAdminClient();
  const now = new Date();
  const period = previousQuarter(now);
  const sent: string[] = [];
  const queued: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  const { data: projects, error } = await db
    .from("client_projects")
    .select(REPORT_PROJECT_COLUMNS)
    .eq("status_reports", true)
    .returns<ReportProject[]>();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const project of projects ?? []) {
    try {
      const { count: existing } = await db
        .from("email_log")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("kind", "status_report")
        .eq("period_key", period.key)
        .neq("status", "discarded");
      if (existing) {
        skipped.push(project.title);
        continue;
      }

      const prepared = await prepareStatusReport(db, project, period, now);
      const base = {
        projectId: project.id,
        kind: "status_report",
        to: project.contact_email,
        subject: prepared.email.subject,
        html: prepared.email.html,
        text: prepared.email.text,
        data: reportData(prepared),
        warnings: prepared.warnings,
        periodKey: period.key
      };

      if (prepared.autoSend && project.contact_email) {
        const result = await deliverEmail({
          to: project.contact_email,
          subject: prepared.email.subject,
          html: prepared.email.html,
          text: prepared.email.text,
          replyTo: reportSender().email
        });
        await recordEmail({
          ...base,
          status: result.ok ? "sent" : "failed",
          error: result.ok ? null : result.error,
          providerId: result.ok ? result.id ?? null : null
        });
        if (result.ok) sent.push(project.title);
        else errors.push(`${project.title}: ${result.error}`);
        continue;
      }

      await recordEmail({ ...base, status: "pending_approval" });
      queued.push(project.title);
      await db.from("notifications").insert({
        user_id: null,
        title: `Jóváhagyásra vár: állapotjelentés · ${project.title}`,
        message: prepared.warnings.length
          ? `${prepared.warnings.length} dolgot érdemes megnézni küldés előtt: ${prepared.warnings.map((w) => w.message).join(" ")}`.slice(0, 900)
          : "A mérés rendben van; az automatikus küldés ennél az ügyfélnél nincs bekapcsolva.",
        link: "/admin/levelek"
      });
    } catch (reportError) {
      errors.push(`${project.title}: ${reportError instanceof Error ? reportError.message : "ismeretlen hiba"}`);
    }
  }

  if (errors.length) {
    await db.from("notifications").insert({
      user_id: null,
      title: "Állapotjelentés: hiba",
      message: errors.join(" · ").slice(0, 900),
      link: "/admin/levelek"
    });
  }

  return NextResponse.json({ period: period.key, sent, queued, skipped, errors });
}

export const GET = runStatusReports;
export const POST = runStatusReports;
