"use client";

import { useEffect, useMemo, useState } from "react";
import { formatHuf, isWebsitePurchaseRequest } from "@/lib/subscriptions";
import type { BillingoIssue, ChangeRequest, ClientProject, ClientTicket, WebsitePurchase } from "@/components/admin/types";

/**
 * Admin teendőlista — „mi vár rám most?".
 *
 * Ez a lista MINDEN ügyfél MINDEN nyitott ügyét egy helyen mutatja, sürgősség
 * és várakozási idő szerint rendezve. Lehetőséget biztosít az elintézett tételek
 * elrejtésére/ürítésére, és azonnali közvetlen navigációt ad a kivásárlásokhoz és projektekhez.
 */

type InboxKind =
  | "billingo"
  | "bug"
  | "transfer"
  | "subscription"
  | "purchase"
  | "review"
  | "delete"
  | "change"
  | "ticket"
  | "followup"
  | "domain";

type InboxItem = {
  id: string;
  kind: InboxKind;
  /** 1 = legsürgősebb. A rendezés elsődleges kulcsa. */
  priority: number;
  label: string;
  client: string;
  detail: string;
  since: string | null;
  projectId: string | null;
  subTab?: "prompt" | "brief" | "build" | "changes" | "subscription";
  action?: { label: string; run: () => void | Promise<void>; busy?: boolean };
};

const KIND_LABELS: Record<InboxKind, string> = {
  billingo: "Számlázás",
  bug: "Technikai hiba",
  transfer: "Utalás ellenőrzése",
  subscription: "Előfizetési kérelem",
  purchase: "💎 Weboldal Kivásárlás",
  review: "Élesítésre vár",
  delete: "Törlési kérelem",
  change: "Módosítási kérés",
  ticket: "Megválaszolatlan üzenet",
  followup: "📬 Elakadt onboarding",
  domain: "Domain lejár"
};

/** Sürgősség: pénz és jogi kötelezettség előre, kényelmi ügyek hátra. */
const KIND_PRIORITY: Record<InboxKind, number> = {
  billingo: 1,
  purchase: 2,
  bug: 2,
  transfer: 3,
  delete: 3,
  subscription: 4,
  review: 5,
  change: 6,
  ticket: 6,
  followup: 7,
  domain: 8
};

function daysSince(value: string | null | undefined) {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}

function waitingLabel(value: string | null | undefined) {
  const days = daysSince(value);
  if (days === null) return null;
  if (days === 0) return "ma";
  if (days === 1) return "1 napja";
  return `${days} napja`;
}

const DISMISSED_STORAGE_KEY = "projectedge_admin_dismissed_inbox_v1";

type AdminInboxProps = {
  projects: ClientProject[];
  changeRequests: ChangeRequest[];
  websitePurchases: WebsitePurchase[];
  billingoIssues: BillingoIssue[];
  tickets: ClientTicket[];
  billingoRetryId: string | null;
  onRetryBillingo: (paymentId: string) => void | Promise<void>;
  onOpenProject: (projectId: string, subTab?: "prompt" | "brief" | "build" | "changes" | "subscription") => void;
};

export function AdminInbox({
  projects,
  changeRequests,
  websitePurchases,
  billingoIssues,
  tickets,
  billingoRetryId,
  onRetryBillingo,
  onOpenProject
}: AdminInboxProps) {
  const [showAll, setShowAll] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Load dismissed IDs from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (stored) {
        setDismissedIds(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const saveDismissed = (ids: string[]) => {
    setDismissedIds(ids);
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(ids));
    } catch {}
  };

  const handleDismiss = (id: string) => {
    const next = [...dismissedIds, id];
    saveDismissed(next);
  };

  const handleDismissAll = (allIds: string[]) => {
    const next = Array.from(new Set([...dismissedIds, ...allIds]));
    saveDismissed(next);
  };

  const handleResetDismissed = () => {
    saveDismissed([]);
  };

  const rawItems = useMemo(() => {
    const byId = new Map(projects.map((project) => [project.id, project]));
    const nameOf = (projectId: string | null) => {
      if (!projectId) return "Ismeretlen ügyfél";
      const project = byId.get(projectId);
      return project?.company || project?.contact_name || project?.title || "Ismeretlen ügyfél";
    };

    const list: InboxItem[] = [];

    for (const issue of billingoIssues) {
      list.push({
        id: `billingo-${issue.id}`,
        kind: "billingo",
        priority: KIND_PRIORITY.billingo,
        label: KIND_LABELS.billingo,
        client: nameOf(issue.project_id),
        detail: `${formatHuf(issue.amount)} beérkezett, AAM-számla nincs${issue.billingo_error ? ` — ${issue.billingo_error.slice(0, 120)}` : ""}`,
        since: issue.paid_at,
        projectId: issue.project_id,
        action: {
          label: billingoRetryId === issue.id ? "Számlázás…" : "Számla újrapróbálása",
          run: () => onRetryBillingo(issue.id),
          busy: billingoRetryId === issue.id
        }
      });
    }

    for (const purchase of websitePurchases) {
      if (["completed", "declined", "cancelled"].includes(purchase.status)) continue;
      const reported = purchase.status === "transfer_reported";
      list.push({
        id: `purchase-${purchase.id}`,
        kind: reported ? "transfer" : "purchase",
        priority: reported ? KIND_PRIORITY.transfer : KIND_PRIORITY.purchase,
        label: reported ? KIND_LABELS.transfer : KIND_LABELS.purchase,
        client: nameOf(purchase.project_id),
        detail: `Weboldal tulajdonba vétele · ${formatHuf(purchase.amount)}${reported ? " · utalás ellenőrzésre vár" : ""}`,
        since: reported ? purchase.transfer_reported_at : purchase.created_at,
        projectId: purchase.project_id,
        subTab: "subscription"
      });
    }

    for (const request of changeRequests) {
      if (["completed", "declined"].includes(request.status)) continue;
      if (isWebsitePurchaseRequest(request.description)) {
        list.push({
          id: `change-buyout-${request.id}`,
          kind: "purchase",
          priority: KIND_PRIORITY.purchase,
          label: KIND_LABELS.purchase,
          client: nameOf(request.project_id),
          detail: request.description,
          since: request.requested_at,
          projectId: request.project_id,
          subTab: "subscription"
        });
        continue;
      }
      const kind: InboxKind = request.category === "technical" ? "bug" : "change";
      list.push({
        id: `change-${request.id}`,
        kind,
        priority: KIND_PRIORITY[kind],
        label: KIND_LABELS[kind],
        client: nameOf(request.project_id),
        detail: request.description.slice(0, 140),
        since: request.requested_at,
        projectId: request.project_id,
        subTab: "changes"
      });
    }

    for (const project of projects) {
      if (["pause_requested", "resume_requested", "cancel_requested"].includes(project.subscription_status ?? "")) {
        list.push({
          id: `sub-${project.id}`,
          kind: "subscription",
          priority: KIND_PRIORITY.subscription,
          label: KIND_LABELS.subscription,
          client: nameOf(project.id),
          detail: project.subscription_status === "pause_requested"
            ? "Szüneteltetést kért"
            : project.subscription_status === "resume_requested"
              ? "Újraaktiválást kért"
              : "Lemondást kért",
          since: project.pause_requested_at ?? project.resume_requested_at ?? project.cancel_effective_at,
          projectId: project.id,
          subTab: "subscription"
        });
      }

      if (project.delete_requested) {
        list.push({
          id: `del-${project.id}`,
          kind: "delete",
          priority: KIND_PRIORITY.delete,
          label: KIND_LABELS.delete,
          client: nameOf(project.id),
          detail: "Az ügyfél a projekt törlését kérte",
          since: project.delete_requested_at,
          projectId: project.id
        });
      }

      if (project.status === "review" && project.review_approved) {
        list.push({
          id: `rev-${project.id}`,
          kind: "review",
          priority: KIND_PRIORITY.review,
          label: KIND_LABELS.review,
          client: nameOf(project.id),
          detail: "Az ügyfél jóváhagyta az előnézetet — élesíthető",
          since: project.last_modified_at,
          projectId: project.id,
          subTab: "build"
        });
      }

      if (project.status === "deposit_pending" && project.deposit_transfer_reported) {
        list.push({
          id: `dep-${project.id}`,
          kind: "transfer",
          priority: KIND_PRIORITY.transfer,
          label: KIND_LABELS.transfer,
          client: nameOf(project.id),
          detail: "Az ügyfél jelezte a foglaló utalását",
          since: project.last_modified_at,
          projectId: project.id
        });
      }

      if (project.final_transfer_reported && !project.final_payment_paid) {
        list.push({
          id: `fin-${project.id}`,
          kind: "transfer",
          priority: KIND_PRIORITY.transfer,
          label: KIND_LABELS.transfer,
          client: nameOf(project.id),
          detail: "Az ügyfél jelezte a végszámla utalását",
          since: project.last_modified_at,
          projectId: project.id
        });
      }

      // Elakadt onboarding (24+ órája nincs továbblépés a szerződésben / fizetésben)
      if (
        ["request_received", "contract_pending", "deposit_pending"].includes(project.status) &&
        !project.delete_requested
      ) {
        const ageDays = daysSince(project.created_at);
        if (ageDays !== null && ageDays >= 1) {
          list.push({
            id: `followup-${project.id}`,
            kind: "followup",
            priority: KIND_PRIORITY.followup,
            label: KIND_LABELS.followup,
            client: nameOf(project.id),
            detail: project.status === "contract_pending"
              ? "Szerződéskötésnél megállt"
              : project.status === "deposit_pending"
                ? "Első fizetésnél megállt"
                : "Projektindításra vár",
            since: project.created_at,
            projectId: project.id,
            subTab: "brief"
          });
        }
      }

      const renewalDays = daysSince(project.domain_renewal_at);
      if (project.domain_renewal_at && renewalDays !== null && renewalDays >= -30 && renewalDays <= 0) {
        list.push({
          id: `dom-${project.id}`,
          kind: "domain",
          priority: KIND_PRIORITY.domain,
          label: KIND_LABELS.domain,
          client: nameOf(project.id),
          detail: `${project.managed_domain_name || "A domain"} megújítása ${new Date(project.domain_renewal_at).toLocaleDateString("hu-HU")}`,
          since: null,
          projectId: project.id
        });
      }
    }

    for (const ticket of tickets) {
      if (ticket.status !== "open") continue;
      list.push({
        id: `tic-${ticket.id}`,
        kind: "ticket",
        priority: KIND_PRIORITY.ticket,
        label: KIND_LABELS.ticket,
        client: ticket.contact_name || ticket.contact_email || "Ügyfél",
        detail: ticket.subject,
        since: ticket.last_message_at,
        projectId: ticket.project_id
      });
    }

    return list.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (daysSince(b.since) ?? 0) - (daysSince(a.since) ?? 0);
    });
  }, [projects, changeRequests, websitePurchases, billingoIssues, tickets, billingoRetryId, onRetryBillingo]);

  const items = useMemo(() => {
    return rawItems.filter((item) => !dismissedIds.includes(item.id));
  }, [rawItems, dismissedIds]);

  if (!items.length) {
    return (
      <section className="admin-inbox empty" style={{ background: "var(--adm-panel)", border: "1px solid var(--adm-ink-08)", borderRadius: "20px", padding: "24px" }}>
        <div style={{ display: "grid", gap: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--adm-accent-text)" }}>TEENDŐK</span>
          <strong style={{ fontSize: "18px", color: "var(--adm-text)" }}>Nincs aktív nyitott teendő.</strong>
          <p style={{ margin: 0, color: "var(--adm-ink-60)", fontSize: "13.5px" }}>Minden ügyfélkérés, befizetés és számlázás elintézve.</p>
          {dismissedIds.length > 0 && (
            <button
              type="button"
              className="admin-btn-secondary"
              style={{ marginTop: "12px", width: "fit-content" }}
              onClick={handleResetDismissed}
            >
              ↩️ Elrejtett teendők visszaállítása ({dismissedIds.length})
            </button>
          )}
        </div>
      </section>
    );
  }

  const urgent = items.filter((item) => item.priority <= 3).length;
  const visible = showAll ? items : items.slice(0, 8);

  return (
    <section className="admin-inbox" style={{ background: "var(--adm-panel)", border: "1px solid var(--adm-ink-08)", borderRadius: "20px", padding: "20px", display: "grid", gap: "16px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid var(--adm-ink-06)", paddingBottom: "14px" }}>
        <div>
          <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--adm-accent-text)" }}>TEENDŐK</span>
          <strong style={{ fontSize: "18px", color: "var(--adm-text)", display: "block", marginTop: "2px" }}>{items.length} nyitott ügy</strong>
          <p style={{ margin: "2px 0 0", color: "var(--adm-ink-60)", fontSize: "13px" }}>
            {urgent > 0 ? `Ebből ${urgent} sürgős — pénz vagy beavatkozást igényel.` : "Nincs sürgős tétel."}
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {dismissedIds.length > 0 && (
            <button
              type="button"
              className="admin-btn-secondary"
              style={{ minHeight: "auto", padding: "6px 12px", fontSize: "12px" }}
              onClick={handleResetDismissed}
              title="Korábban elrejtett tételek megjelenítése"
            >
              ↩️ Visszaállítás ({dismissedIds.length})
            </button>
          )}
          <button
            type="button"
            className="admin-btn-secondary"
            style={{ minHeight: "auto", padding: "6px 12px", fontSize: "12px", borderColor: "var(--adm-ink-15)" }}
            onClick={() => handleDismissAll(items.map((i) => i.id))}
            title="Összes jelenlegi teendő elrejtése"
          >
            🗑️ Inbox ürítése
          </button>
        </div>
      </header>

      <div className="admin-inbox-list" style={{ display: "grid", gap: "10px" }}>
        {visible.map((item) => {
          const waited = waitingLabel(item.since);
          const isPurchase = item.kind === "purchase";
          return (
            <article
              key={item.id}
              className={`admin-inbox-row prio-${Math.min(item.priority, 6)}`}
              style={{
                background: isPurchase ? "rgba(118, 171, 174, 0.08)" : "var(--adm-inset)",
                border: isPurchase ? "1px solid rgba(118, 171, 174, 0.35)" : "1px solid var(--adm-ink-06)",
                borderRadius: "14px",
                padding: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "12px"
              }}
            >
              <div className="admin-inbox-main" style={{ display: "grid", gap: "4px", flex: 1, minWidth: "240px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      padding: "2px 7px",
                      borderRadius: "6px",
                      background: isPurchase ? "rgba(118, 171, 174, 0.2)" : "var(--adm-ink-06)",
                      color: isPurchase ? "var(--adm-accent-text)" : "var(--adm-text-muted)"
                    }}
                  >
                    {item.label}
                  </span>
                  {waited ? <small style={{ color: "var(--adm-ink-45)", fontSize: "11.5px" }}>{waited}</small> : null}
                </div>
                <strong style={{ color: "var(--adm-text)", fontSize: "14.5px" }}>{item.client}</strong>
                <p style={{ margin: 0, color: "var(--adm-ink-80)", fontSize: "13px", lineHeight: 1.4 }}>{item.detail}</p>
              </div>

              <div className="admin-inbox-side" style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {item.action ? (
                  <button
                    className="admin-btn-primary"
                    disabled={item.action.busy}
                    onClick={() => item.action?.run()}
                    style={{ minHeight: "auto", padding: "6px 12px", fontSize: "12px" }}
                    type="button"
                  >
                    {item.action.label}
                  </button>
                ) : null}

                {item.projectId ? (
                  <button
                    className={isPurchase ? "admin-btn-primary" : "admin-btn-secondary"}
                    onClick={() => onOpenProject(item.projectId as string, item.subTab)}
                    style={{ minHeight: "auto", padding: "6px 14px", fontSize: "12px" }}
                    type="button"
                  >
                    {isPurchase ? "💎 Kivásárlás kezelése" : "Megnyitás"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => handleDismiss(item.id)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--adm-ink-10)",
                    color: "var(--adm-ink-50)",
                    borderRadius: "8px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontSize: "12px"
                  }}
                  title="Tétel elrejtése / elintézve"
                >
                  ✓ Elrejtés
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {items.length > 8 ? (
        <button
          className="admin-btn-secondary"
          onClick={() => setShowAll(!showAll)}
          style={{ width: "100%", justifyContent: "center" }}
          type="button"
        >
          {showAll ? "Kevesebb megjelenítése" : `További ${items.length - 8} ügy megjelenítése`}
        </button>
      ) : null}
    </section>
  );
}
