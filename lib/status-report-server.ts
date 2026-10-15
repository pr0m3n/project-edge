import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { checkSite } from "@/lib/site-monitor";
import {
  canAutoSend,
  defaultSalutation,
  evaluateReport,
  measuredWindow,
  type ReportInputs,
  type ReportPeriod,
  type ReportWarning,
  type UptimeSummary
} from "@/lib/status-report";
import { buildStatusReportEmail, type StatusReportEmail, type StatusReportSender } from "@/lib/status-report-template";

/**
 * Az állapotjelentés összerakása egy projektre: mérés lekérése, élő
 * ellenőrzés, a mérés ellenőrzése és a levél. Küldeni NEM küld — azt a
 * hívó dönti el a figyelmeztetések alapján.
 */

export const REPORT_PROJECT_COLUMNS =
  "id,title,contact_name,contact_email,report_salutation,live_url,website,managed_domain_name,ssl_expires_at,domain_expires_at,psi_performance,onboarded_at,subscription_started_at,created_at,status_reports,status_report_autosend";

export type ReportProject = {
  id: string;
  title: string;
  contact_name: string | null;
  contact_email: string | null;
  report_salutation: string | null;
  live_url: string | null;
  website: string | null;
  managed_domain_name: string | null;
  ssl_expires_at: string | null;
  domain_expires_at: string | null;
  psi_performance: number | null;
  onboarded_at: string | null;
  subscription_started_at: string | null;
  created_at: string;
  status_reports: boolean;
  status_report_autosend: boolean;
};

export type PreparedReport = {
  inputs: ReportInputs;
  warnings: ReportWarning[];
  email: StatusReportEmail;
  autoSend: boolean;
};

export function reportSender(): StatusReportSender {
  return {
    name: process.env.STATUS_REPORT_SENDER_NAME || "Boczán Patrik",
    role: "ProjectEdge · weboldal-üzemeltetés",
    email: process.env.STATUS_REPORT_REPLY_TO || "patrik@projectedgestudio.hu",
    phone: process.env.STATUS_REPORT_PHONE || "+36 20 406 4954"
  };
}

const date = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export async function prepareStatusReport(
  db: SupabaseClient,
  project: ReportProject,
  period: ReportPeriod,
  now: Date,
  options: { liveCheck?: boolean } = {}
): Promise<PreparedReport> {
  // A monitor a felvétel napjától méri az oldalt — előtte nincs mit számon kérni.
  const monitoredSince = date(project.onboarded_at) ?? date(project.created_at);
  const window = measuredWindow(period, monitoredSince, now);
  const siteUrl = project.live_url || project.website || null;

  const [{ data: summaryRows }, { data: lastCheck }, { count: sentBefore }] = await Promise.all([
    db.rpc("site_uptime_summary", {
      target_project: project.id,
      period_start: window.from.toISOString(),
      period_end: window.to.toISOString()
    }),
    db.from("site_checks").select("checked_at").eq("project_id", project.id).order("checked_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("email_log").select("id", { count: "exact", head: true }).eq("project_id", project.id).eq("kind", "status_report").eq("status", "sent")
  ]);

  const summary = (Array.isArray(summaryRows) ? summaryRows[0] : summaryRows) as UptimeSummary | null;
  const uptime: UptimeSummary | null = summary ? {
    checks: Number(summary.checks ?? 0),
    failures: Number(summary.failures ?? 0),
    uptime_percent: summary.uptime_percent === null ? null : Number(summary.uptime_percent),
    avg_response_ms: summary.avg_response_ms === null ? null : Number(summary.avg_response_ms),
    last_failure_at: summary.last_failure_at ?? null
  } : null;

  // Élő próba a levél pillanatában: a „rendben működött" levél ne menjen ki
  // éppen leállt oldalról, és ez egy második, független forrás a monitor mellett.
  let liveCheck: ReportInputs["liveCheck"] = null;
  if (options.liveCheck !== false && siteUrl) {
    const result = await checkSite(siteUrl);
    liveCheck = { ok: result.ok, responseMs: result.responseMs ?? null, error: result.error ?? null };
  }

  const inputs: ReportInputs = {
    projectTitle: project.title,
    siteUrl,
    salutation: project.report_salutation?.trim() || defaultSalutation(project.contact_name),
    toEmail: project.contact_email,
    period,
    monitoredSince,
    uptime,
    lastCheckAt: date((lastCheck as { checked_at?: string } | null)?.checked_at),
    liveCheck,
    sslExpiresAt: date(project.ssl_expires_at),
    domainName: project.managed_domain_name,
    domainExpiresAt: date(project.domain_expires_at),
    psiPerformance: typeof project.psi_performance === "number" ? project.psi_performance : null,
    now,
    isFirstReport: !sentBefore
  };

  const warnings = evaluateReport(inputs);
  return {
    inputs,
    warnings,
    email: buildStatusReportEmail(inputs, reportSender()),
    autoSend: canAutoSend(warnings, project.status_report_autosend)
  };
}

/** A naplóba kerülő mért adat: ebből lehet utólag ellenőrizni a levelet. */
export function reportData(prepared: PreparedReport) {
  const i = prepared.inputs;
  return {
    period: { key: i.period.key, label: i.period.label, start: i.period.start.toISOString(), end: i.period.end.toISOString() },
    monitoredSince: i.monitoredSince?.toISOString() ?? null,
    siteUrl: i.siteUrl,
    uptime: i.uptime,
    lastCheckAt: i.lastCheckAt?.toISOString() ?? null,
    liveCheck: i.liveCheck,
    sslExpiresAt: i.sslExpiresAt?.toISOString() ?? null,
    domainName: i.domainName,
    domainExpiresAt: i.domainExpiresAt?.toISOString() ?? null,
    psiPerformance: i.psiPerformance,
    salutation: i.salutation,
    isFirstReport: i.isFirstReport,
    generatedAt: i.now.toISOString()
  };
}
