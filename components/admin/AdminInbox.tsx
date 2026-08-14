"use client";

import { useMemo, useState } from "react";
import { formatHuf, isWebsitePurchaseRequest } from "@/lib/subscriptions";
import type { BillingoIssue, ChangeRequest, ClientProject, ClientTicket } from "@/components/admin/types";

/**
 * Admin teendőlista — „mi vár rám most?".
 *
 * Miért kellett: az admin eddig projektenként egy hosszú lapot mutatott, és a
 * teendők ebbe voltak beágyazva (nyitott módosítási kérés a projekt közepén,
 * ügyfélkérelem a menedzselt kártyán, hibás számlázás külön dobozban). Egy-két
 * ügyfélnél ez még átlátható, húsznál nem: nem derül ki, mi sürgős és mi vár
 * napok óta.
 *
 * Ez a lista MINDEN ügyfél MINDEN nyitott ügyét egy helyen mutatja, sürgősség
 * és várakozási idő szerint rendezve. Nem helyettesíti a projektnézetet, hanem
 * odavezet: minden sorból egy kattintással a megfelelő projektnél vagy.
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
  action?: { label: string; run: () => void | Promise<void>; busy?: boolean };
};

const KIND_LABELS: Record<InboxKind, string> = {
  billingo: "Számlázás",
  bug: "Technikai hiba",
  transfer: "Utalás ellenőrzése",
  subscription: "Előfizetési kérelem",
  purchase: "Kivásárlás",
  review: "Élesítésre vár",
  delete: "Törlési kérelem",
  change: "Módosítási kérés",
  ticket: "Megválaszolatlan üzenet",
  domain: "Domain lejár"
};

/** Sürgősség: pénz és jogi kötelezettség előre, kényelmi ügyek hátra. */
const KIND_PRIORITY: Record<InboxKind, number> = {
  billingo: 1,
  bug: 2,
  transfer: 3,
  delete: 3,
  subscription: 4,
  purchase: 4,
  review: 5,
  change: 6,
  ticket: 6,
  domain: 7
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

type AdminInboxProps = {
  projects: ClientProject[];
  changeRequests: ChangeRequest[];
  billingoIssues: BillingoIssue[];
  tickets: ClientTicket[];
  billingoRetryId: string | null;
  onRetryBillingo: (paymentId: string) => void | Promise<void>;
  onOpenProject: (projectId: string) => void;
};

export function AdminInbox({
  projects,
  changeRequests,
  billingoIssues,
  tickets,
  billingoRetryId,
  onRetryBillingo,
  onOpenProject
}: AdminInboxProps) {
  const [showAll, setShowAll] = useState(false);

  const items = useMemo(() => {
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

    for (const request of changeRequests) {
      if (["completed", "declined"].includes(request.status)) continue;
      const purchase = isWebsitePurchaseRequest(request.description);
      const kind: InboxKind = purchase ? "purchase" : request.category === "technical" ? "bug" : "change";
      // Az utalást jelző kérés a pénzről szól, ezért előrébb kerül.
      const reported = purchase && request.transfer_reported_at && !request.paid_at;
      list.push({
        id: `change-${request.id}`,
        kind: reported ? "transfer" : kind,
        priority: reported ? KIND_PRIORITY.transfer : KIND_PRIORITY[kind],
        label: reported ? KIND_LABELS.transfer : KIND_LABELS[kind],
        client: nameOf(request.project_id),
        detail: purchase
          ? `Kivásárlási igény${request.quoted_amount ? ` · ${formatHuf(request.quoted_amount)}` : ""}${reported ? " · az ügyfél jelezte az utalást" : ""}`
          : request.description.slice(0, 140),
        since: request.requested_at,
        projectId: request.project_id
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
          projectId: project.id
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
          projectId: project.id
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
  }, [projects, changeRequests, billingoIssues, tickets, billingoRetryId, onRetryBillingo]);

  if (!items.length) {
    return (
      <section className="admin-inbox empty">
        <div>
          <span>TEENDŐK</span>
          <strong>Nincs nyitott ügy.</strong>
          <p>Minden ügyfélkérés, befizetés és számlázás rendezve van.</p>
        </div>
      </section>
    );
  }

  const urgent = items.filter((item) => item.priority <= 3).length;
  const visible = showAll ? items : items.slice(0, 6);

  return (
    <section className="admin-inbox">
      <header>
        <div>
          <span>TEENDŐK</span>
          <strong>{items.length} nyitott ügy</strong>
          <p>{urgent > 0 ? `Ebből ${urgent} sürgős — pénz vagy hibajavítás.` : "Nincs sürgős tétel."}</p>
        </div>
      </header>

      <div className="admin-inbox-list">
        {visible.map((item) => {
          const waited = waitingLabel(item.since);
          return (
            <article className={`admin-inbox-row prio-${Math.min(item.priority, 6)}`} key={item.id}>
              <div className="admin-inbox-main">
                <span className="admin-inbox-kind">{item.label}</span>
                <strong>{item.client}</strong>
                <p>{item.detail}</p>
              </div>
              <div className="admin-inbox-side">
                {waited ? <small>{waited}</small> : null}
                {item.action ? (
                  <button className="button primary" disabled={item.action.busy} onClick={() => item.action?.run()} type="button">
                    {item.action.label}
                  </button>
                ) : null}
                {item.projectId ? (
                  <button className="button secondary" onClick={() => onOpenProject(item.projectId as string)} type="button">
                    Megnyitás
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {items.length > 6 ? (
        <button className="admin-inbox-more" onClick={() => setShowAll(!showAll)} type="button">
          {showAll ? "Kevesebb" : `További ${items.length - 6} ügy megjelenítése`}
        </button>
      ) : null}
    </section>
  );
}
