"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { briefSteps } from "@/components/portal/brief-fields";
import { useAdmin } from "@/components/admin/console/AdminData";
import { LEAD_SOURCE_LABEL, LEAD_STATUSES, formatDate, formatDateTime, relativeTime } from "@/components/admin/console/derive";
import { BlurField } from "@/components/admin/console/fields";
import { IconLeads, IconRefresh, IconSearch } from "@/components/admin/console/icons";
import { Badge, Count, EmptyState, ListSkeleton, PageHead, type Tone } from "@/components/admin/console/ui";
import { briefDraftProgress } from "@/lib/brief-draft";
import { formatHuf, subscriptionPlan } from "@/lib/subscriptions";

/**
 * Érdeklődők — ajánlatkérések, félbehagyott adatlapok és regisztrált fiókok.
 *
 * A régi „Érdeklődők (Leadek)", „Félbehagyott adatlapok" és „Felhasználók"
 * fül egy helyen, saját címmel (`/admin/erdeklodok/felbehagyott` …).
 */

type View = "ajanlatkeresek" | "felbehagyott" | "fiokok";

const VIEWS: Array<[View, string, string]> = [
  ["ajanlatkeresek", "Ajánlatkérések", "/admin/erdeklodok"],
  ["felbehagyott", "Félbehagyott adatlapok", "/admin/erdeklodok/felbehagyott"],
  ["fiokok", "Regisztrált fiókok", "/admin/erdeklodok/fiokok"]
];

const STATUS_TONE: Record<string, Tone> = { new: "accent", contacted: "ai", proposal_sent: "ai", won: "success", lost: "neutral", archived: "neutral" };

export function LeadsView() {
  const admin = useAdmin();
  const params = useParams<{ nezet?: string[] }>();
  const segment = Array.isArray(params?.nezet) ? params.nezet[0] : undefined;
  const view: View = segment === "felbehagyott" || segment === "fiokok" ? segment : "ajanlatkeresek";

  return (
    <>
      <PageHead
        compact
        subtitle={`${admin.counts.freshLeads} új érdeklődő · ${admin.briefDrafts.length} félbehagyott adatlap`}
        title="Érdeklődők"
      />
      <nav aria-label="Érdeklődők nézetei" className="pa-tabs">
        {VIEWS.map(([value, label, href]) => (
          <Link aria-current={view === value ? "page" : undefined} href={href} key={value} scroll={false}>
            {label}
            {value === "ajanlatkeresek" ? <Count tone={admin.counts.freshLeads ? "hot" : undefined} value={admin.counts.freshLeads} /> : null}
            {value === "felbehagyott" ? <Count value={admin.briefDrafts.length} /> : null}
          </Link>
        ))}
      </nav>
      {view === "ajanlatkeresek" ? <QuoteRequests /> : view === "felbehagyott" ? <Drafts /> : <Accounts />}
    </>
  );
}

function QuoteRequests() {
  const admin = useAdmin();
  const [status, setStatus] = useState<string>("active");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return admin.leads.filter((lead) => {
      if (status === "active" && ["won", "lost", "archived"].includes(lead.status)) return false;
      if (status !== "active" && status !== "all" && lead.status !== status) return false;
      if (!needle) return true;
      return [lead.name, lead.email, lead.company, lead.phone, lead.goals, lead.project_type].filter(Boolean).some((field) => (field as string).toLowerCase().includes(needle));
    });
  }, [admin.leads, query, status]);

  const won = admin.leads.filter((lead) => lead.status === "won").length;

  return (
    <>
      <div className="pa-toolbar">
        <label className="pa-search">
          <IconSearch />
          <span className="sr-only">Keresés</span>
          <input className="pa-input" onChange={(event) => setQuery(event.target.value)} placeholder="Keresés név, email, cég szerint" type="search" value={query} />
        </label>
        <div aria-label="Szűrés állapot szerint" className="pa-chips is-scroll" role="group">
          {[["active", "Nyitott"], ["new", "Új"], ["won", "Nyert"], ["lost", "Elveszett"], ["all", "Mind"]].map(([value, label]) => (
            <button aria-pressed={status === value} className="pa-chip" key={value} onClick={() => setStatus(value)} type="button">{label}</button>
          ))}
        </div>
      </div>
      <p className="pa-faint" style={{ marginBottom: 12 }}>{admin.leads.length} érdeklődő összesen · {admin.counts.freshLeads} új · {won} nyert</p>

      {admin.loading ? <ListSkeleton /> : rows.length === 0 ? (
        <div className="pa-card"><EmptyState icon={<IconLeads />} title="Nincs ilyen érdeklődő">{query ? "Próbálj más kulcsszót." : "Ebben a szűrésben most nincs senki."}</EmptyState></div>
      ) : (
        <div className="pa-stack is-tight">
          {rows.map((lead) => (
            <article className="pa-card pa-card-pad" key={lead.id}>
              <div className="pa-split" style={{ gap: 18 }}>
                <div className="pa-stack is-tight">
                  <div className="pa-row-top">
                    <strong style={{ fontSize: 15 }}>{lead.name}</strong>
                    <Badge tone={STATUS_TONE[lead.status] ?? "neutral"}>{LEAD_STATUSES.find(([value]) => value === lead.status)?.[1] ?? lead.status}</Badge>
                    {lead.source ? <Badge>{LEAD_SOURCE_LABEL[lead.source] ?? lead.source}</Badge> : null}
                    <span className="pa-faint" title={formatDateTime(lead.created_at)}>{relativeTime(lead.created_at, admin.nowMs)}</span>
                  </div>
                  <div className="pa-client-meta" style={{ marginTop: 0 }}>
                    <a href={`mailto:${lead.email}`}>{lead.email}</a>
                    {lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : null}
                    {lead.company ? <span>{lead.company}</span> : null}
                    {lead.website ? <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} rel="noreferrer" target="_blank">{lead.website} ↗</a> : null}
                  </div>
                  <div className="pa-kv">
                    <div><span>Projekt</span><strong>{lead.project_type || "—"}</strong></div>
                    <div><span>Büdzsé</span><strong>{lead.budget || "nincs megadva"}</strong></div>
                  </div>
                  {lead.goals ? <p className="pa-muted" style={{ whiteSpace: "pre-wrap" }}>{lead.goals}</p> : null}
                </div>
                <div className="pa-stack is-tight">
                  <label className="pa-field">
                    <span>Állapot</span>
                    <select className="pa-select" onChange={(event) => void admin.actions.updateLead(lead.id, { status: event.target.value })} value={lead.status}>
                      {LEAD_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <BlurField label="Jegyzet" multiline onSave={(next) => admin.actions.updateLead(lead.id, { notes: next })} placeholder="Következő lépés, hívás dátuma…" rows={3} value={lead.notes} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function Drafts() {
  const admin = useAdmin();
  return (
    <>
      <p className="pa-faint" style={{ marginBottom: 12 }}>
        Megkezdett, de be nem küldött adatlapok. Beküldéskor a sor eltűnik innen, és projektként jelenik meg. 24 óra tétlenség után automatikusan megy egy — és csak egy — emlékeztető levél.
      </p>
      {admin.loading ? <ListSkeleton /> : admin.briefDrafts.length === 0 ? (
        <div className="pa-card"><EmptyState title="Nincs félbehagyott adatlap">Ha valaki elkezdi kitölteni a projektindító adatlapot, de nem küldi be, itt látod.</EmptyState></div>
      ) : (
        <div className="pa-list">
          {admin.briefDrafts.map((draft) => {
            const stepCount = draft.step_count || briefSteps.length;
            const percent = briefDraftProgress(draft.step, stepCount);
            const stepLabel = briefSteps[Math.min(Math.max(draft.step, 0), briefSteps.length - 1)] ?? "Alapok";
            const answers = draft.data ?? {};
            const filled = ([
              ["Cél", answers.goals ?? ""],
              ["Célközönség", answers.audience ?? ""],
              ["Oldalak", answers.pages ?? ""],
              ["Funkciók", answers.features ?? ""],
              ["Bemutatkozás", answers.contentBrief ?? ""]
            ] as Array<[string, string]>).filter(([, value]) => Boolean(value?.trim()));
            return (
              <div className="pa-row" key={draft.user_id}>
                <div className="pa-row-main">
                  <div className="pa-row-top">
                    <span className="pa-row-title">{draft.full_name || "Névtelen"}</span>
                    <Badge tone="ai">{percent}% · {stepLabel}</Badge>
                    <Badge>{draft.commercial_model === "subscription" ? `Bérlés · ${subscriptionPlan(draft.subscription_plan).name}` : draft.commercial_model === "purchase" ? "Vásárlás" : "Egyedi projekt"}</Badge>
                  </div>
                  <span className="pa-row-sub"><a className="pa-link" href={`mailto:${draft.email}`}>{draft.email}</a>{draft.company ? ` · ${draft.company}` : ""}</span>
                  {filled.length ? filled.map(([label, value]) => (
                    <span className="pa-row-meta" key={label}><b>{label}:</b> {value.length > 140 ? `${value.slice(0, 139)}…` : value}</span>
                  )) : <span className="pa-row-meta">Még csak az alapoknál járt.</span>}
                </div>
                <div className="pa-row-side" style={{ display: "grid", justifyItems: "end", gap: 4 }}>
                  <span className="pa-faint">Mentve: {formatDate(draft.updated_at)}</span>
                  <span className="pa-faint">{draft.reminder_sent_at ? `Emlékeztető: ${formatDate(draft.reminder_sent_at)}` : "Emlékeztető még nem ment ki"}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function Accounts() {
  const admin = useAdmin();
  const [query, setQuery] = useState("");
  const { usersLoaded, usersLoading } = admin;
  const loadAdminUsers = admin.actions.loadAdminUsers;

  // A fiókok (`auth.users`) csak szerveren keresztül olvashatók — akkor kérjük
  // le, amikor ez a nézet megnyílik.
  useEffect(() => {
    if (!usersLoaded && !usersLoading) void loadAdminUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersLoaded]);

  const rows = admin.adminUsers.filter((account) => {
    const needle = query.trim().toLowerCase();
    return !needle || `${account.fullName ?? ""} ${account.email}`.toLowerCase().includes(needle);
  });

  return (
    <>
      <div className="pa-toolbar">
        <label className="pa-search">
          <IconSearch />
          <span className="sr-only">Keresés</span>
          <input className="pa-input" onChange={(event) => setQuery(event.target.value)} placeholder="Keresés név vagy email szerint" type="search" value={query} />
        </label>
        <button className="pa-btn" disabled={usersLoading} onClick={() => void loadAdminUsers()} type="button">
          <IconRefresh /> {usersLoading ? "Frissítés…" : "Frissítés"}
        </button>
      </div>
      <p className="pa-faint" style={{ marginBottom: 12 }}>{admin.adminUsers.length} fiók. A legutóbb mozgó felhasználó van elöl.</p>

      {admin.usersError ? <div className="pa-banner is-danger" role="alert"><div><strong>Hiba</strong><p>{admin.usersError}</p></div></div> : null}

      {usersLoading && admin.adminUsers.length === 0 ? <ListSkeleton /> : rows.length === 0 ? (
        <div className="pa-card"><EmptyState title="Nincs megjeleníthető fiók" /></div>
      ) : (
        <div className="pa-list">
          {rows.map((account) => (
            <div className="pa-row" key={account.id}>
              <div className="pa-row-main">
                <div className="pa-row-top">
                  <span className="pa-row-title">{account.fullName || "Névtelen"}</span>
                  {account.monthlyRevenue > 0 ? <Badge tone="success">{formatHuf(account.monthlyRevenue)} / hó</Badge> : account.projectCount > 0 ? <Badge>Nincs aktív előfizetés</Badge> : <Badge>Csak fiók</Badge>}
                  {!account.emailConfirmedAt ? <Badge tone="warn">Email nincs megerősítve</Badge> : null}
                  {account.providers.includes("google") ? <Badge>Google</Badge> : null}
                </div>
                <span className="pa-row-sub"><a className="pa-link" href={`mailto:${account.email}`}>{account.email}</a> · regisztrált: {formatDate(account.registeredAt)}</span>
                <span className="pa-row-meta">
                  {account.lastActivityLabel ?? "Még semmit nem csinált"}{account.lastActivityAt ? ` · ${relativeTime(account.lastActivityAt, admin.nowMs)}` : ""}
                  {" · "}{account.projectCount} projekt{account.activeProjectCount ? ` (${account.activeProjectCount} aktív)` : ""}
                  {" · "}{account.ticketCount} ticket{account.openTicketCount ? ` (${account.openTicketCount} nyitott)` : ""}
                  {" · "}{account.changeRequestCount} módosítási kérés
                </span>
                {account.draft ? (
                  <span className="pa-row-meta" style={{ color: "var(--pa-warn)" }}>
                    Félbehagyott adatlap: {briefDraftProgress(account.draft.step, account.draft.stepCount)}%{account.draft.reminderSentAt ? " · emlékeztetve" : " · nincs emlékeztetve"}
                  </span>
                ) : null}
              </div>
              <div className="pa-row-side" style={{ display: "grid", justifyItems: "end" }}>
                <strong title={account.lastSignInAt ? formatDateTime(account.lastSignInAt) : "Még sosem lépett be"}>{relativeTime(account.lastSignInAt, admin.nowMs)}</strong>
                <span className="pa-faint">utoljára fent</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
