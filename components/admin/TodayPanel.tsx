"use client";

import { useMemo, useState } from "react";
import styles from "@/components/admin/today.module.css";
import { daysUntil } from "@/lib/onboarding";
import { formatHuf } from "@/lib/subscriptions";
import type { BillingoIssue, ChangeRequest, ClientProject, ClientTicket, Lead, Ticket, WebsitePurchase } from "@/components/admin/types";

/**
 * „MA" — egyetlen teendőlista.
 *
 * A probléma, amit megold: az admin felületen hét fül volt, és a teendők
 * mindegyiken szét voltak szórva. Ahhoz, hogy valaki megtudja, mit kell ma
 * csinálnia, végig kellett kattintania mindet, fejben összeszedni, és
 * remélni, hogy nem maradt ki semmi. A számolások (`pendingTransfers`,
 * `adminTurnProjectsCount`, `pendingBuyouts`…) EDDIG IS megvoltak — csak
 * hét külön helyen jelentek meg, egy-egy számként egy fülcímke mellett.
 *
 * Itt egyetlen, FONTOSSÁG SZERINT rendezett lista van. A sorrend nem
 * ízlés kérdése:
 *
 *   1. amiben pénz vagy kiesés van (nem elérhető oldal, elmaradt befizetés),
 *   2. amiben az ügyfél vár rám (ticket, jóváhagyás, kérelem),
 *   3. amiben lehetőség van (új érdeklődő),
 *   4. amit jó tudni (lejáró domain, félbehagyott adatlap).
 *
 * Ha nincs teendő, azt is kimondjuk. Egy üres lista, ami üresnek LÁTSZIK,
 * többet ér, mint hét fül, amiről nem tudod, végignézted-e.
 */

export type TodayItem = {
  id: string;
  /** 1 = sürgős, 2 = rám vár, 3 = lehetőség, 4 = jó tudni. */
  priority: 1 | 2 | 3 | 4;
  title: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
};

type Props = {
  projects: ClientProject[];
  tickets: Ticket[];
  clientTickets: ClientTicket[];
  leads: Lead[];
  changeRequests: ChangeRequest[];
  websitePurchases: WebsitePurchase[];
  billingoIssues: BillingoIssue[];
  pendingPayments: Array<{
    id: string;
    project_id: string;
    amount: number;
    due_date: string | null;
    status?: string;
    payment_reference?: string | null;
    transfer_reported_at?: string | null;
  }>;
  briefDraftCount: number;
  onOpenTab: (tab: "inbox" | "projects" | "tickets" | "managed" | "drafts" | "users" | "leads") => void;
  onOpenProject: (projectId: string) => void;
};

const PRIORITY_LABEL: Record<number, string> = {
  1: "Sürgős",
  2: "Rád vár",
  3: "Lehetőség",
  4: "Jó tudni"
};

export function TodayPanel({
  projects,
  tickets,
  clientTickets,
  leads,
  changeRequests,
  websitePurchases,
  billingoIssues,
  pendingPayments,
  briefDraftCount,
  onOpenTab,
  onOpenProject
}: Props) {
  // A „most" a renderen kívülről: renderben `Date.now()`-t hívni instabil
  // kimenetet adna azonos bemenetre.
  const [nowMs] = useState(() => Date.now());

  const items = useMemo<TodayItem[]>(() => {
    const list: TodayItem[] = [];
    const now = new Date(nowMs);

    // ── 1. Nem elérhető weboldal ────────────────────────────────────────
    for (const project of projects.filter((p) => p.site_health_status === "offline")) {
      list.push({
        id: `offline-${project.id}`,
        priority: 1,
        title: `Nem elérhető: ${project.title}`,
        detail: "Az óránkénti ellenőrzés szerint az oldal nem válaszol. Ez a legdrágább hiba, amit egy havidíjas ügyfél észrevehet.",
        actionLabel: "Projekt megnyitása",
        onAction: () => onOpenProject(project.id)
      });
    }

    // ── 2. Bejelentett utalás ───────────────────────────────────────────
    //
    // Ez a legmagasabb prioritású pénzügyi tétel: az ügyfél ELKÜLDTE a pénzt,
    // csak még nincs rögzítve. Amíg nem rögzíted, ő fizetetlennek látszik a
    // rendszerben, és emlékeztetőket kapna — annak ellenére, hogy fizetett.
    for (const payment of pendingPayments.filter((row) => row.status === "reported")) {
      const project = projects.find((p) => p.id === payment.project_id);
      if (!project) continue;
      list.push({
        id: `reported-${payment.id}`,
        priority: 1,
        title: `Bejelentett utalás: ${project.title}`,
        detail: `${formatHuf(payment.amount)}${payment.payment_reference ? ` · közlemény: ${payment.payment_reference}` : ""} — nézd meg a bankszámlán, és rögzítsd. Amíg nem teszed, az ügyfél fizetetlennek látszik.`,
        actionLabel: "Befizetés rögzítése",
        onAction: () => onOpenTab("managed")
      });
    }

    // ── 3. Elmaradt befizetés ───────────────────────────────────────────
    for (const payment of pendingPayments) {
      if (payment.status === "reported") continue;
      if (!payment.due_date) continue;
      const days = daysUntil(new Date(payment.due_date), now);
      if (days > 0) continue;

      const project = projects.find((p) => p.id === payment.project_id);
      if (!project) continue;

      list.push({
        id: `payment-${payment.id}`,
        priority: days < -5 ? 1 : 2,
        title: days === 0
          ? `Ma esedékes: ${project.title}`
          : `${Math.abs(days)} napja esedékes: ${project.title}`,
        detail: `${formatHuf(payment.amount)} — ha megérkezett, rögzítsd, különben az ügyfél további emlékeztetőket kap.`,
        actionLabel: "Befizetés rögzítése",
        onAction: () => onOpenTab("managed")
      });
    }

    // ── 4. Kiszámlázatlan befizetés ─────────────────────────────────────
    if (billingoIssues.length) {
      list.push({
        id: "billingo",
        priority: 1,
        title: `${billingoIssues.length} befizetéshez nem készült számla`,
        detail: "A pénz beérkezett, a számla viszont nem állt ki. Ez NAV szempontból sem hagyható nyitva.",
        actionLabel: "Megnyitás",
        onAction: () => onOpenTab("managed")
      });
    }

    // ── 5. Nyitott ticketek ─────────────────────────────────────────────
    const openTickets = tickets.filter((t) => t.status === "open").length
      + clientTickets.filter((t) => t.status === "open").length;
    if (openTickets) {
      list.push({
        id: "tickets",
        priority: 2,
        title: `${openTickets} megválaszolatlan üzenet`,
        detail: "A vállalásod szerint írásos kérésre 1 munkanapon belül visszaigazolsz.",
        actionLabel: "Üzenetek",
        onAction: () => onOpenTab("tickets")
      });
    }

    // ── 6. Rajtad a sor a projekten ─────────────────────────────────────
    const adminTurn = projects.filter((p) =>
      ["request_received", "planning", "in_progress"].includes(p.status)
      || (p.status === "deposit_pending" && p.deposit_transfer_reported)
      || (p.status === "review" && p.review_approved)
      || (p.status === "launched" && p.final_transfer_reported && !p.final_payment_paid)
    );
    for (const project of adminTurn) {
      list.push({
        id: `turn-${project.id}`,
        priority: 2,
        title: `Rajtad a sor: ${project.title}`,
        detail: project.next_step || "A projekt a te lépésedre vár.",
        actionLabel: "Projekt megnyitása",
        onAction: () => onOpenProject(project.id)
      });
    }

    // ── 7. Új módosítási kérések ────────────────────────────────────────
    const newChanges = changeRequests.filter((request) => request.status === "new").length;
    if (newChanges) {
      list.push({
        id: "changes",
        priority: 2,
        title: `${newChanges} új módosítási kérés`,
        detail: "Vissza kell igazolni, és eldönteni, belefér-e a keretbe.",
        actionLabel: "Megnyitás",
        onAction: () => onOpenTab("managed")
      });
    }

    // ── 8. Előfizetés-kérelmek és törlések ──────────────────────────────
    const subRequests = projects.filter((p) =>
      ["pause_requested", "resume_requested", "cancel_requested"].includes(p.subscription_status ?? "")
    );
    for (const project of subRequests) {
      list.push({
        id: `sub-${project.id}`,
        priority: 2,
        title: `Előfizetés-kérelem: ${project.title}`,
        detail: project.subscription_status === "cancel_requested"
          ? "Lemondást kért. Érdemes felhívni, mielőtt jóváhagyod."
          : "Szüneteltetést vagy visszaállítást kért.",
        actionLabel: "Projekt megnyitása",
        onAction: () => onOpenProject(project.id)
      });
    }

    for (const project of projects.filter((p) => p.delete_requested)) {
      list.push({
        id: `delete-${project.id}`,
        priority: 2,
        title: `Törlési kérelem: ${project.title}`,
        detail: "Az ügyfél a projekt törlését kérte. Ez nem visszavonható.",
        actionLabel: "Projekt megnyitása",
        onAction: () => onOpenProject(project.id)
      });
    }

    // ── 9. Kivásárlás ───────────────────────────────────────────────────
    const buyouts = websitePurchases.filter((purchase) =>
      ["requested", "payment_pending", "transfer_reported"].includes(purchase.status)
    ).length;
    if (buyouts) {
      list.push({
        id: "buyouts",
        priority: 2,
        title: `${buyouts} folyamatban lévő tulajdonba vétel`,
        detail: "Valaki meg akarja venni a weboldalát — ez a legnagyobb egyszeri bevétel egy ügyféltől.",
        actionLabel: "Megnyitás",
        onAction: () => onOpenTab("projects")
      });
    }

    // ── 10. Új érdeklődő ────────────────────────────────────────────────
    const freshLeads = leads.filter((lead) => lead.status === "new").length;
    if (freshLeads) {
      list.push({
        id: "leads",
        priority: 3,
        title: `${freshLeads} új érdeklődő`,
        detail: "Még senki nem vette fel velük a kapcsolatot.",
        actionLabel: "Érdeklődők",
        onAction: () => onOpenTab("leads")
      });
    }

    if (briefDraftCount) {
      list.push({
        id: "drafts",
        priority: 3,
        title: `${briefDraftCount} félbehagyott adatlap`,
        detail: "Elkezdték kitölteni, de nem küldték be. Egy emailre sokan visszatérnek.",
        actionLabel: "Piszkozatok",
        onAction: () => onOpenTab("drafts")
      });
    }

    // ── 11. Lejáró domain és SSL ────────────────────────────────────────
    for (const project of projects) {
      const domainDays = project.domain_expires_at ? daysUntil(new Date(project.domain_expires_at), now) : null;
      if (domainDays !== null && domainDays <= 30) {
        list.push({
          id: `domain-${project.id}`,
          priority: domainDays <= 7 ? 1 : 4,
          title: `Lejáró domain: ${project.managed_domain_name ?? project.title}`,
          detail: `${domainDays} nap múlva jár le. A megújítás elmulasztása egyik napról a másikra leviszi az oldalt.`,
          actionLabel: "Projekt megnyitása",
          onAction: () => onOpenProject(project.id)
        });
      }
    }

    return list.sort((a, b) => a.priority - b.priority);
  }, [
    projects, tickets, clientTickets, leads, changeRequests, websitePurchases,
    billingoIssues, pendingPayments, briefDraftCount, nowMs, onOpenTab, onOpenProject
  ]);

  const urgent = items.filter((item) => item.priority === 1).length;

  if (!items.length) {
    return (
      <section className={styles.panel}>
        <div className={styles.empty}>
          <strong>Nincs teendőd.</strong>
          <p>
            Minden ügyfélnek működik az oldala, nincs megválaszolatlan üzenet, és nincs elmaradt
            befizetés. Ez a lista magától megtelik, ha bármelyik megváltozik.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <header className={styles.head}>
        <div>
          <span className={styles.eyebrow}>Ma</span>
          <h3>{items.length} teendő{urgent ? ` · ${urgent} sürgős` : ""}</h3>
        </div>
      </header>

      <ol className={styles.list}>
        {items.map((item) => (
          <li key={item.id} className={`${styles.item} ${styles[`p${item.priority}`]}`}>
            <div className={styles.itemBody}>
              <span className={styles.badge}>{PRIORITY_LABEL[item.priority]}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
            <button className="admin-btn-secondary" type="button" onClick={item.onAction}>
              {item.actionLabel}
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
