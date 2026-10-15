"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "@/components/admin/console/AdminData";
import { BlurField } from "@/components/admin/console/fields";
import { Badge, Card } from "@/components/admin/console/ui";
import type { ClientProject } from "@/components/admin/types";
import { supabase } from "@/lib/supabase/client";

/**
 * Kapcsolattartás egy ügyfélnél (048–049): ügyfélkapu, csak e-mailes
 * állapotjelentés, vagy csendes. Itt látszik az állapotjelentés előnézete is
 * — pontosan az, ami kimenne, a mostani mérésből és a figyelmeztetésekkel.
 */

type Mode = "portal" | "reports" | "silent";

type Preview = {
  subject: string;
  html: string;
  to: string | null;
  warnings: Array<{ level: "block" | "warn"; message: string }>;
  data: { uptime: { checks: number; failures: number; uptime_percent: number | null; avg_response_ms: number | null } | null; lastCheckAt: string | null; liveCheck: { ok: boolean; responseMs: number | null } | null; period: { label: string } };
};

const MODE_LABEL: Record<Mode, string> = {
  portal: "Ügyfélkapuval",
  reports: "Csak e-mailes állapotjelentés",
  silent: "Csendes — semmi nem megy ki"
};

function modeOf(project: ClientProject): Mode {
  if (project.status_reports) return "reports";
  return project.silent ? "silent" : "portal";
}

async function authedPost(url: string, body: unknown) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : `Hiba (${response.status})`);
  return payload;
}

export function ContactModeCard({ project }: { project: ClientProject }) {
  const admin = useAdmin();
  const mode = modeOf(project);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState<"" | "preview" | "queue">("");
  const [error, setError] = useState("");

  async function changeMode(next: Mode) {
    if (next === mode) return;
    if (next === "portal") {
      const ok = await admin.confirm({
        title: "Ügyfélkapus módra váltás",
        message: `Ettől kezdve „${project.title}" megkapja a rendszerleveleket (havi jelentés, fizetési emlékeztető, számla). Meghívót ez még nem küld. Biztosan?`,
        confirmLabel: "Váltás"
      });
      if (!ok) return;
    }
    await admin.actions.updateClientProject(project.id, {
      silent: next !== "portal",
      status_reports: next === "reports"
    });
  }

  async function run(action: "preview" | "queue") {
    setBusy(action);
    setError("");
    try {
      if (action === "preview") {
        setPreview(await authedPost("/api/admin/status-report", { projectId: project.id, action: "preview", period: "current" }));
      } else {
        await authedPost("/api/admin/status-report", { projectId: project.id, action: "queue", period: "current" });
        admin.actions.notify("Jóváhagyásra vár a Levelek oldalon — onnan küldhető el.", "success");
        await admin.actions.reload(true);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nem sikerült.");
    } finally {
      setBusy("");
    }
  }

  const uptime = preview?.data.uptime;

  return (
    <Card title="Kapcsolattartás" subtitle={MODE_LABEL[mode]}>
      <div className="pa-stack" style={{ gap: 10 }}>
        <div className="pa-inline" style={{ flexWrap: "wrap", gap: 8 }}>
          {(Object.keys(MODE_LABEL) as Mode[]).map((value) => (
            <button
              aria-pressed={mode === value}
              className={`pa-btn is-sm${mode === value ? " is-primary" : ""}`}
              key={value}
              onClick={() => void changeMode(value)}
              type="button"
            >
              {MODE_LABEL[value]}
            </button>
          ))}
        </div>

        {mode === "silent" ? (
          <p className="pa-muted">Semmilyen levelet, értesítést vagy automatikus számlát nem kap. Az esedékességről és a késésről te kapsz jelzést.</p>
        ) : null}

        {mode === "reports" ? (
          <>
            <p className="pa-muted">
              Negyedévente (január, április, július, október 2-án) magázó állapotjelentést kap a valódi mérésekből, gomb és ügyfélkapu nélkül. Ezen kívül semmit.
            </p>
            <BlurField
              hint={`Üresen: „Tisztelt ${project.contact_name || "Ügyfelünk"}!"`}
              label="Megszólítás"
              onSave={(next) => admin.actions.updateClientProject(project.id, { report_salutation: next.trim() || null })}
              placeholder="pl. Tisztelt Doktornő!"
              value={project.report_salutation ?? ""}
            />
            <label className="pa-check">
              <input
                checked={Boolean(project.status_report_autosend)}
                onChange={(event) => void admin.actions.updateClientProject(project.id, { status_report_autosend: event.target.checked })}
                type="checkbox"
              />
              <span>Automatikus küldés, ha a mérés hibátlan (az első jelentést és a gyanúsakat így is te hagyod jóvá)</span>
            </label>
            <div className="pa-inline" style={{ flexWrap: "wrap", gap: 8 }}>
              <button className="pa-btn is-sm" disabled={Boolean(busy)} onClick={() => void run("preview")} type="button">
                {busy === "preview" ? "Összeállítás…" : "Előnézet a mostani mérésből"}
              </button>
              <button className="pa-btn is-sm" disabled={Boolean(busy)} onClick={() => void run("queue")} type="button">
                {busy === "queue" ? "Sorba állítás…" : "Jóváhagyásra tesz (kézi küldés)"}
              </button>
              <Link className="pa-link" href="/admin/levelek">Levelek →</Link>
            </div>
            {error ? <p className="pa-muted" role="alert" style={{ color: "var(--pa-danger-text)" }}>{error}</p> : null}
          </>
        ) : null}

        {preview && mode === "reports" ? (
          <div className="pa-stack" style={{ gap: 10 }}>
            <div className="pa-kv">
              <div><span>Címzett</span><strong>{preview.to ?? "— nincs —"}</strong></div>
              <div><span>Időszak</span><strong>{preview.data.period.label} (eddig)</strong></div>
              <div><span>Mérések</span><strong>{uptime ? `${uptime.checks} db, ${uptime.failures} hiba` : "nincs"}</strong></div>
              <div><span>Elérhetőség</span><strong>{uptime?.uptime_percent ?? "—"}%</strong></div>
              <div><span>Élő próba most</span><strong>{preview.data.liveCheck ? (preview.data.liveCheck.ok ? `válaszolt (${preview.data.liveCheck.responseMs} ms)` : "NEM válaszolt") : "—"}</strong></div>
            </div>
            {preview.warnings.length ? (
              <ul className="pa-stack" style={{ gap: 6, listStyle: "none", margin: 0, padding: 0 }}>
                {preview.warnings.map((warning) => (
                  <li className="pa-inline" key={warning.message} style={{ alignItems: "flex-start", gap: 8 }}>
                    <Badge tone={warning.level === "block" ? "danger" : "warn"}>{warning.level === "block" ? "Nem küldhető" : "Nézd meg"}</Badge>
                    <span>{warning.message}</span>
                  </li>
                ))}
              </ul>
            ) : <Badge tone="success">A mérés rendben, nincs figyelmeztetés</Badge>}
            <iframe
              sandbox=""
              srcDoc={preview.html}
              style={{ background: "#f1f0ec", border: "1px solid var(--pa-border)", borderRadius: 12, height: 720, width: "100%" }}
              title={preview.subject}
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
