"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdmin, type TodayItem } from "@/components/admin/console/AdminData";
import { PRIORITY_LABEL, monthlyRecurringRevenue, relativeTime, targetHref } from "@/components/admin/console/derive";
import { IconCheck } from "@/components/admin/console/icons";
import { Badge, EmptyState, ListSkeleton, PageHead, Stat, type Tone } from "@/components/admin/console/ui";
import { formatHuf } from "@/lib/subscriptions";

/**
 * „Ma" — minden, ami rád vár, egyetlen listában, fontosság szerint.
 *
 * A régi „Ma" és „Teendők & Inbox" fül egyesítése: a származtatott tételek
 * ezen a gépen elrejthetők, a módosítási kérések az adatbázisban lezárhatók,
 * a számlázási hiba innen újrapróbálható.
 */

const PRIORITY_TONE: Record<TodayItem["priority"], Tone> = { 1: "danger", 2: "accent", 3: "ai", 4: "neutral" };
const PAGE = 12;

export function TodayView() {
  const admin = useAdmin();
  const [showAll, setShowAll] = useState(false);
  const { today, counts } = admin;

  const urgent = counts.todayUrgent;
  const dateLabel = admin.nowMs
    ? new Intl.DateTimeFormat("hu-HU", { weekday: "long", month: "long", day: "numeric" }).format(new Date(admin.nowMs))
    : "";
  const visible = showAll ? today : today.slice(0, PAGE);
  const mrr = monthlyRecurringRevenue(admin.clientProjects);

  return (
    <>
      <PageHead
        compact
        subtitle={admin.loading ? "Betöltés…" : `${dateLabel ? `${dateLabel.charAt(0).toUpperCase()}${dateLabel.slice(1)} · ` : ""}${today.length ? `${today.length} teendő${urgent ? `, ebből ${urgent} sürgős` : ""}` : "nincs teendőd"}`}
        title="Ma"
      />

      <div className="pa-stats">
        <Stat hint={urgent ? "pénz vagy kiesés" : "minden rendben"} label="Sürgős" tone={urgent ? "hot" : "good"} value={urgent} />
        <Stat
          hint={`${counts.aiConversations} AI-beszélgetés`}
          href="/admin/beszelgetesek"
          label="Válaszra vár"
          tone={counts.needsReply ? "hot" : undefined}
          value={counts.needsReply}
        />
        <Stat hint={`${counts.liveProjects} élő projektből`} href="/admin/ugyfelek" label="Rajtad a sor" value={counts.adminTurn} />
        <Stat hint={`${admin.clientProjects.filter((p) => p.commercial_model === "subscription" && p.subscription_status === "active").length} aktív előfizetés`} href="/admin/penz" label="Havi bevétel" value={formatHuf(mrr)} />
      </div>

      <div className="pa-section-title">
        <h2>Teendők</h2>
        <div className="pa-inline">
          {admin.hiddenTodayCount ? (
            <button className="pa-link" onClick={() => admin.actions.restoreDismissed()} type="button">
              Elrejtettek visszaállítása ({admin.hiddenTodayCount})
            </button>
          ) : null}
          {today.some((item) => item.dismissible) ? (
            <button
              className="pa-link"
              onClick={() => admin.actions.dismissAllToday(today.filter((item) => item.dismissible).map((item) => item.id))}
              title="Csak ezen a gépen rejti el. A lezárható kérések maradnak."
              type="button"
            >
              Összes elrejtése
            </button>
          ) : null}
        </div>
      </div>

      {admin.loading ? (
        <ListSkeleton rows={5} />
      ) : today.length === 0 ? (
        <div className="pa-card">
          <EmptyState icon={<IconCheck />} title="Nincs teendőd">
            Minden ügyfélnek működik az oldala, nincs megválaszolatlan üzenet és nincs elmaradt befizetés. A lista magától megtelik, ha valami változik.
          </EmptyState>
        </div>
      ) : (
        <ol className="pa-list" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {visible.map((item) => (
            <TaskRow item={item} key={item.id} />
          ))}
        </ol>
      )}

      {today.length > PAGE ? (
        <button className="pa-btn is-block" onClick={() => setShowAll((value) => !value)} style={{ marginTop: 12 }} type="button">
          {showAll ? "Kevesebb" : `További ${today.length - PAGE} teendő`}
        </button>
      ) : null}
    </>
  );
}

function TaskRow({ item }: { item: TodayItem }) {
  const admin = useAdmin();
  const since = item.since ? relativeTime(item.since, admin.nowMs) : null;
  const action = item.action;
  const busy = action?.kind === "billingo-retry" && admin.billingoRetryId === action.paymentId;

  return (
    <li className={`pa-task p${item.priority}`}>
      <div className="pa-task-body">
        <div className="pa-row-top">
          <Badge tone={PRIORITY_TONE[item.priority]}>{item.priority <= 2 ? PRIORITY_LABEL[item.priority] : item.category}</Badge>
          {item.priority <= 2 ? <span className="pa-faint">{item.category}</span> : null}
          {since && since !== "soha" ? <span className="pa-faint">· {since}</span> : null}
        </div>
        <strong>{item.title}</strong>
        <p>{item.detail}</p>
      </div>
      <div className="pa-task-actions">
        {action?.kind === "billingo-retry" ? (
          <button className="pa-btn is-sm is-primary" disabled={busy} onClick={() => void admin.actions.retryBillingoInvoice(action.paymentId)} type="button">
            {busy ? "Számlázás…" : "Számla újrapróbálása"}
          </button>
        ) : null}
        <Link className={`pa-btn is-sm${action?.kind === "billingo-retry" ? "" : " is-primary"}`} href={targetHref(item.target)}>
          {item.targetLabel}
        </Link>
        {action?.kind === "resolve-change" ? (
          <button
            className="pa-btn is-sm is-ghost"
            onClick={() => void admin.actions.resolveChangeRequest(action.requestId)}
            title="A kérés lezárása az adatbázisban — mindenhonnan eltűnik"
            type="button"
          >
            Lezárás
          </button>
        ) : item.dismissible ? (
          <button
            className="pa-btn is-sm is-ghost"
            onClick={() => admin.actions.dismissTodayItem(item.id)}
            title="Csak ezen a gépen rejti el. A tétel akkor szűnik meg, ha a mögötte lévő állapot rendeződik."
            type="button"
          >
            Elrejtés
          </button>
        ) : null}
      </div>
    </li>
  );
}
