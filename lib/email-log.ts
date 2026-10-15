import "server-only";

import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import type { ReportWarning } from "@/lib/status-report";

/**
 * LEVÉLNAPLÓ (049). Minden kimenő levél ide kerül a tartalmával és az
 * eredményével, hogy az adminban utólag is látszódjon, mi ment ki, kinek,
 * és sikerült-e.
 *
 * A naplózás SOHA nem bukhatja meg a küldést: egy hiányzó tábla vagy egy
 * adatbázis-kimaradás miatt a levélnek akkor is ki kell mennie.
 */

export type EmailLogStatus = "pending_approval" | "sent" | "failed" | "discarded";

export type EmailLogEntry = {
  projectId?: string | null;
  kind: string;
  to: string | null;
  subject: string;
  html?: string | null;
  text?: string | null;
  status: EmailLogStatus;
  error?: string | null;
  providerId?: string | null;
  data?: unknown;
  warnings?: ReportWarning[];
  periodKey?: string | null;
  decidedBy?: string | null;
};

export async function recordEmail(entry: EmailLogEntry): Promise<string | null> {
  try {
    const db = createServerSupabaseAdminClient();
    const { data, error } = await db.from("email_log").insert({
      project_id: entry.projectId ?? null,
      kind: entry.kind,
      to_email: entry.to,
      subject: entry.subject.slice(0, 300),
      html: entry.html ?? null,
      text_body: entry.text ?? null,
      status: entry.status,
      error: entry.error ?? null,
      provider_id: entry.providerId ?? null,
      data: entry.data ?? null,
      warnings: entry.warnings ?? [],
      period_key: entry.periodKey ?? null,
      sent_at: entry.status === "sent" ? new Date().toISOString() : null,
      decided_by: entry.decidedBy ?? null
    }).select("id").single();
    if (error) {
      console.error("A levélnaplóba írás nem sikerült:", error.message);
      return null;
    }
    return data.id as string;
  } catch (error) {
    console.error("A levélnaplóba írás nem sikerült:", error);
    return null;
  }
}

/** A rendszerlevél fajtája a fejlécéből („PROJECTEDGE · HAVI JELENTÉS" → „havi jelentés"). */
export function kindFromEyebrow(eyebrow: string | undefined) {
  const label = (eyebrow ?? "").replace(/^PROJECTEDGE\s*·\s*/i, "").trim();
  return label ? label.toLocaleLowerCase("hu-HU") : "rendszerlevél";
}
