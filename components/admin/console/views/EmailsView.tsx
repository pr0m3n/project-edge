"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/console/AdminData";
import { clientHref, formatDate, formatDateTime } from "@/components/admin/console/derive";
import { Badge, Card, EmptyState, ListSkeleton, PageHead, type Tone } from "@/components/admin/console/ui";
import { supabase } from "@/lib/supabase/client";

/**
 * LEVELEK (049) — minden kimenő levél egy helyen.
 *
 * Három kérdésre ad választ: mi vár jóváhagyásra (és miért), mi ment ki
 * (pontosan milyen tartalommal), és mi nem ment ki (milyen hibával). A
 * jelentéseknél a levél mellett ott a mért adat is, amiből készült — így
 * küldés előtt látszik, ha a mérés hamis.
 */

type Status = "pending_approval" | "sent" | "failed" | "discarded";
type Warning = { level: "block" | "warn"; message: string };

type Row = {
  id: string;
  created_at: string;
  project_id: string | null;
  kind: string;
  to_email: string | null;
  subject: string;
  status: Status;
  error: string | null;
  warnings: Warning[] | null;
  period_key: string | null;
  sent_at: string | null;
};

type Detail = Row & { html: string | null; text_body: string | null; data: Record<string, unknown> | null };

const TABS: Array<{ key: Status | "all"; label: string }> = [
  { key: "pending_approval", label: "Jóváhagyásra vár" },
  { key: "sent", label: "Elküldve" },
  { key: "failed", label: "Hibás" },
  { key: "all", label: "Mind" }
];

const STATUS_BADGE: Record<Status, { tone: Tone; label: string }> = {
  pending_approval: { tone: "warn", label: "Jóváhagyásra vár" },
  sent: { tone: "success", label: "Elküldve" },
  failed: { tone: "danger", label: "Hibás" },
  discarded: { tone: "neutral", label: "Elvetve" }
};

const KIND_LABEL: Record<string, string> = { status_report: "Állapotjelentés" };
const kindLabel = (kind: string) => KIND_LABEL[kind] ?? kind.charAt(0).toLocaleUpperCase("hu-HU") + kind.slice(1);

const LIST_COLUMNS = "id,created_at,project_id,kind,to_email,subject,status,error,warnings,period_key,sent_at";

export function EmailsView() {
  const admin = useAdmin();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Status | "all">("pending_approval");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const projects = useMemo(() => new Map(admin.clientProjects.map((project) => [project.id, project])), [admin.clientProjects]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("email_log").select(LIST_COLUMNS).order("created_at", { ascending: false }).limit(300);
    if (error) {
      setLoadError("A levélnaplót nem sikerült betölteni. Lehet, hogy a 049-es migráció még nincs fent.");
      setRows([]);
      return;
    }
    setLoadError("");
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- aszinkron betöltés: állapotot csak a hálózati válasz után ír
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void supabase.from("email_log").select("*").eq("id", selectedId).maybeSingle().then(({ data }) => {
      if (!cancelled) setDetail((data as Detail | null) ?? null);
    });
    return () => { cancelled = true; };
  }, [selectedId]);

  const counts = useMemo(() => {
    const all = rows ?? [];
    return {
      pending_approval: all.filter((row) => row.status === "pending_approval").length,
      sent: all.filter((row) => row.status === "sent").length,
      failed: all.filter((row) => row.status === "failed").length,
      all: all.length
    } as Record<Status | "all", number>;
  }, [rows]);

  const visible = (rows ?? []).filter((row) => tab === "all" || row.status === tab);

  async function decide(action: "send" | "discard") {
    if (!detail) return;
    const blocking = (detail.warnings ?? []).filter((warning) => warning.level === "block");
    const ok = await admin.confirm({
      title: action === "send" ? "Levél elküldése" : "Levél elvetése",
      message: action === "send"
        ? `Elküldöd a(z) ${detail.to_email ?? "?"} címre: „${detail.subject}"?${blocking.length ? `\n\nFIGYELEM: ${blocking.map((w) => w.message).join(" ")}` : ""}`
        : "A levél nem megy ki, és elvetettként a naplóban marad.",
      confirmLabel: action === "send" ? "Küldés" : "Elvetés"
    });
    if (!ok) return;
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch(`/api/admin/emails/${detail.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : `Hiba (${response.status})`);
      admin.actions.notify(action === "send" ? "A levél elment." : "A levél elvetve.", "success");
      await load();
      setSelectedId(null);
      setDetail(null);
      void admin.actions.reload(true);
    } catch (cause) {
      admin.actions.notify(cause instanceof Error ? cause.message : "Nem sikerült.", "error");
      await load();
    } finally {
      setBusy(false);
    }
  }

  const data = detail?.data as null | {
    period?: { label?: string };
    monitoredSince?: string | null;
    uptime?: { checks: number; failures: number; uptime_percent: number | null; avg_response_ms: number | null } | null;
    lastCheckAt?: string | null;
    liveCheck?: { ok: boolean; responseMs: number | null; error: string | null } | null;
    sslExpiresAt?: string | null;
    domainExpiresAt?: string | null;
    psiPerformance?: number | null;
  };

  return (
    <>
      <PageHead compact subtitle="Minden kimenő levél, a tartalmával és az eredményével" title="Levelek" />

      <div className="pa-inline" role="tablist" style={{ flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {TABS.map((item) => (
          <button
            aria-selected={tab === item.key}
            className={`pa-btn is-sm${tab === item.key ? " is-primary" : ""}`}
            key={item.key}
            onClick={() => { setTab(item.key); setSelectedId(null); setDetail(null); }}
            role="tab"
            type="button"
          >
            {item.label} · {counts[item.key]}
          </button>
        ))}
      </div>

      {loadError ? <p className="pa-banner is-danger" role="alert">{loadError}</p> : null}

      <div className="pa-grid-2">
        <Card pad={false} title={TABS.find((item) => item.key === tab)?.label}>
          {rows === null ? <ListSkeleton rows={5} /> : visible.length === 0 ? (
            <EmptyState title={tab === "pending_approval" ? "Nincs jóváhagyásra váró levél" : "Nincs itt levél"}>
              {tab === "pending_approval" ? "Az állapotjelentések ide kerülnek, ha az első alkalomról van szó, vagy a mérésben valami gyanús." : null}
            </EmptyState>
          ) : (
            <div className="pa-list">
              {visible.map((row) => {
                const project = row.project_id ? projects.get(row.project_id) : null;
                const warnCount = (row.warnings ?? []).length;
                return (
                    <button
                      aria-current={selectedId === row.id ? "true" : undefined}
                      className="pa-row"
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      style={selectedId === row.id ? { background: "var(--pa-hover)" } : undefined}
                      type="button"
                    >
                      <div className="pa-row-main">
                        <div className="pa-row-top">
                          <span className="pa-row-title">{row.subject}</span>
                          <Badge tone={STATUS_BADGE[row.status].tone}>{STATUS_BADGE[row.status].label}</Badge>
                          {warnCount ? <Badge tone="warn">{warnCount} figyelmeztetés</Badge> : null}
                        </div>
                        <span className="pa-row-meta">
                          {[kindLabel(row.kind), project?.title ?? row.to_email ?? "—", formatDateTime(row.sent_at ?? row.created_at)].join(" · ")}
                        </span>
                      </div>
                    </button>
                );
              })}
            </div>
          )}
        </Card>

        <div className="pa-stack">
          {!selectedId ? (
            <Card title="Részletek"><p className="pa-muted">Válassz egy levelet a listából.</p></Card>
          ) : !detail ? (
            <Card title="Részletek"><ListSkeleton rows={3} /></Card>
          ) : (
            <>
              <Card
                actions={detail.status === "pending_approval" ? (
                  <div className="pa-inline" style={{ gap: 8 }}>
                    <button className="pa-btn is-sm" disabled={busy} onClick={() => void decide("discard")} type="button">Elvetés</button>
                    <button className="pa-btn is-sm is-primary" disabled={busy} onClick={() => void decide("send")} type="button">{busy ? "Küldés…" : "Küldés"}</button>
                  </div>
                ) : null}
                title={kindLabel(detail.kind)}
              >
                <div className="pa-kv">
                  <div><span>Állapot</span><strong><Badge tone={STATUS_BADGE[detail.status].tone}>{STATUS_BADGE[detail.status].label}</Badge></strong></div>
                  <div><span>Címzett</span><strong>{detail.to_email ?? "—"}</strong></div>
                  <div><span>Tárgy</span><strong>{detail.subject}</strong></div>
                  {detail.project_id && projects.get(detail.project_id) ? (
                    <div><span>Ügyfél</span><strong><Link className="pa-link" href={clientHref(detail.project_id)}>{projects.get(detail.project_id)?.title}</Link></strong></div>
                  ) : null}
                  <div><span>Létrehozva</span><strong>{formatDateTime(detail.created_at)}</strong></div>
                  {detail.sent_at ? <div><span>Elküldve</span><strong>{formatDateTime(detail.sent_at)}</strong></div> : null}
                  {detail.error ? <div><span>Hiba</span><strong style={{ color: "var(--pa-danger-text)" }}>{detail.error}</strong></div> : null}
                </div>
              </Card>

              {(detail.warnings ?? []).length ? (
                <Card title="Mielőtt elküldöd">
                  <ul className="pa-stack" style={{ gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
                    {(detail.warnings ?? []).map((warning) => (
                      <li className="pa-inline" key={warning.message} style={{ alignItems: "flex-start", gap: 8 }}>
                        <Badge tone={warning.level === "block" ? "danger" : "warn"}>{warning.level === "block" ? "Nem küldhető" : "Nézd meg"}</Badge>
                        <span>{warning.message}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}

              {data && detail.kind === "status_report" ? (
                <Card title="A mérés, amiből a levél készült">
                  <div className="pa-kv">
                    <div><span>Időszak</span><strong>{data.period?.label ?? "—"}</strong></div>
                    {data.monitoredSince ? <div><span>Mérés kezdete</span><strong>{formatDateTime(data.monitoredSince)}</strong></div> : null}
                    <div><span>Mérések</span><strong>{data.uptime ? `${data.uptime.checks} db, ebből ${data.uptime.failures} sikertelen` : "nincs"}</strong></div>
                    <div><span>Elérhetőség</span><strong>{data.uptime?.uptime_percent ?? "—"}%</strong></div>
                    <div><span>Átlagos válaszidő</span><strong>{data.uptime?.avg_response_ms ?? "—"} ms</strong></div>
                    <div><span>Utolsó mérés</span><strong>{data.lastCheckAt ? formatDateTime(data.lastCheckAt) : "—"}</strong></div>
                    <div><span>Élő próba</span><strong>{data.liveCheck ? (data.liveCheck.ok ? `válaszolt, ${data.liveCheck.responseMs} ms` : `NEM válaszolt (${data.liveCheck.error ?? "?"})`) : "—"}</strong></div>
                    <div><span>SSL lejárat</span><strong>{data.sslExpiresAt ? formatDate(data.sslExpiresAt) : "nincs adat"}</strong></div>
                    <div><span>Domain lejárat</span><strong>{data.domainExpiresAt ? formatDate(data.domainExpiresAt) : "nincs adat"}</strong></div>
                    <div><span>PageSpeed</span><strong>{data.psiPerformance ?? "nincs adat"}</strong></div>
                  </div>
                </Card>
              ) : null}

              <Card pad={false} title="Így néz ki">
                {detail.html ? (
                  <iframe
                    sandbox=""
                    srcDoc={detail.html}
                    style={{ background: "#f1f0ec", border: 0, borderRadius: "0 0 12px 12px", display: "block", height: 760, width: "100%" }}
                    title={detail.subject}
                  />
                ) : <p className="pa-muted" style={{ padding: 16 }}>A levél tartalma nincs elmentve.</p>}
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
