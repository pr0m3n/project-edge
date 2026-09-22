"use client";

import { useMemo, useState } from "react";
import styles from "@/components/admin/today.module.css";
import revenue from "@/components/admin/revenue.module.css";
import { addBillingInterval, daysUntil, monthlyRevenue, projectCycleMonths } from "@/lib/onboarding";
import { formatHuf } from "@/lib/subscriptions";
import type { ClientProject, Lead } from "@/components/admin/types";

/**
 * BEVÉTEL ÉS PIPELINE.
 *
 * Az admin felület eddig EGYETLEN számot mutatott a pénzről: az aktív
 * előfizetések havidíjának összegét, egy csempén. Abból nem derült ki, hogy
 * mikor jön be a pénz, kitől, és hogy honnan érkeznek egyáltalán az ügyfelek.
 *
 * Két dolgot mutat, mert a kettő együtt válaszol arra, hogy „hogy állok":
 *
 *  1. VÁRHATÓ BEVÉTEL — a következő három hónap esedékességei, ügyfelenként.
 *     Nem előrejelzés: a `subscription_payments` már rögzített fordulónapjaiból
 *     számol, plusz a ciklus szerinti következő kettőt vetíti előre.
 *
 *  2. HONNAN JÖNNEK — az érdeklődők forrás és státusz szerint. Ez azért
 *     lényeges, mert a mérés szerint a hideg email az egyetlen csatorna, ami
 *     ténylegesen vevőt hozott, miközben erről a felületen eddig semmi nem
 *     látszott — a kampány külön CSV-fájlokban élt, a rendszeren kívül.
 *
 * Az éves előre fizető NEM tizenkétszeres havi bevétel: a pénz egyszer jön be.
 * A havi vetítés (MRR) és a tényleges pénzbeáramlás ezért külön sor.
 */

type Props = {
  projects: ClientProject[];
  leads: Lead[];
  pendingPayments: Array<{ id: string; project_id: string; amount: number; due_date: string | null }>;
};

const LEAD_STATUS_LABEL: Record<string, string> = {
  new: "Új",
  contacted: "Megkeresve",
  proposal_sent: "Ajánlat kiment",
  won: "Nyert",
  lost: "Elveszett",
  archived: "Archivált"
};

const SOURCE_LABEL: Record<string, string> = {
  cold_email: "Hideg email",
  "projectedge.hu": "Weboldal",
  gyorssav: "Gyorssáv"
};

export function RevenuePanel({ projects, leads, pendingPayments }: Props) {
  const [nowMs] = useState(() => Date.now());

  const money = useMemo(() => {
    const active = projects.filter(
      (p) => p.commercial_model === "subscription" && p.subscription_status === "active"
    );

    // MRR: a havi vetített bevétel összege. Az éves előre fizetőnél NEM a
    // listaárat vesszük, hanem az alkudott éves díj tizenketted részét —
    // különben minden kedvezményes ügyfélnél felfelé tévednénk, és pont a
    // bevételi kimutatás lenne az, amiben nem lehet megbízni.
    const mrr = active.reduce((sum, p) => sum + monthlyRevenue({
      monthlyPrice: Number(p.monthly_price ?? 0),
      interval: projectCycleMonths(p),
      agreed: p.billing_amount ?? null
    }), 0);

    /** Mennyivel kevesebb ez, mint a listaár — ennyi kedvezményt adtál összesen. */
    const listMrr = active.reduce((sum, p) => sum + Number(p.monthly_price ?? 0), 0);
    const discountPerMonth = Math.max(0, listMrr - mrr);

    const yearly = active.filter((p) => projectCycleMonths(p) > 1);
    const byTransfer = active.filter((p) => p.payment_method !== "stripe");

    return { active, mrr, arr: mrr * 12, yearly, byTransfer, discountPerMonth };
  }, [projects]);

  /**
   * A következő 90 nap esedékességei.
   *
   * A már rögzített `pending` sorokból indulunk, és onnan vetítünk előre a
   * ciklus szerint. Azért nem csak a rögzített sorokat mutatjuk, mert azokból
   * projektenként mindig csak EGY van — a következő. A rákövetkezőket a
   * fordulónapból lehet kiszámolni, és pont azok adják meg, hogy „mi jön be a
   * negyedévben".
   */
  const upcoming = useMemo(() => {
    const now = new Date(nowMs);
    const horizon = now.getTime() + 90 * 86_400_000;
    const rows: Array<{ key: string; title: string; amount: number; due: Date; projected: boolean }> = [];

    for (const payment of pendingPayments) {
      if (!payment.due_date) continue;
      const project = projects.find((p) => p.id === payment.project_id);
      if (!project || project.subscription_status !== "active") continue;

      const interval = projectCycleMonths(project);
      let due = new Date(payment.due_date);

      for (let step = 0; step < 6 && due.getTime() <= horizon; step += 1) {
        rows.push({
          key: `${payment.id}-${step}`,
          title: project.title,
          amount: payment.amount,
          due,
          projected: step > 0
        });
        due = addBillingInterval(due, interval, 1);
      }
    }

    return rows.sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [pendingPayments, projects, nowMs]);

  const quarterTotal = upcoming.reduce((sum, row) => sum + row.amount, 0);

  const pipeline = useMemo(() => {
    const bySource = new Map<string, Map<string, number>>();
    for (const lead of leads) {
      const source = lead.status === "archived" ? "archived" : (SOURCE_LABEL[lead.source ?? ""] ?? lead.source ?? "Ismeretlen");
      if (source === "archived") continue;
      const bucket = bySource.get(source) ?? new Map<string, number>();
      bucket.set(lead.status, (bucket.get(lead.status) ?? 0) + 1);
      bySource.set(source, bucket);
    }
    return Array.from(bySource.entries()).map(([source, statuses]) => ({
      source,
      total: Array.from(statuses.values()).reduce((a, b) => a + b, 0),
      won: statuses.get("won") ?? 0,
      statuses: Array.from(statuses.entries()).sort((a, b) => b[1] - a[1])
    })).sort((a, b) => b.total - a.total);
  }, [leads]);

  return (
    <section className={styles.panel}>
      <header className={styles.head}>
        <div>
          <span className={styles.eyebrow}>Bevétel</span>
          <h3>{formatHuf(money.mrr)} / hó · {formatHuf(money.arr)} / év</h3>
        </div>
      </header>

      <div className={revenue.tiles}>
        <article>
          <span>Aktív előfizető</span>
          <strong>{money.active.length}</strong>
          <small>{money.yearly.length} előre fizető · {money.active.length - money.yearly.length} havi</small>
        </article>
        <article>
          <span>Következő 90 nap</span>
          <strong>{formatHuf(quarterTotal)}</strong>
          <small>{upcoming.length} esedékesség</small>
        </article>
        <article>
          <span>Utalásos ügyfél</span>
          <strong>{money.byTransfer.length}</strong>
          <small>náluk kézzel kell rögzíteni a befizetést</small>
        </article>
        <article>
          <span>{money.discountPerMonth > 0 ? "Adott kedvezmény" : "Átlagos havidíj"}</span>
          <strong>
            {money.discountPerMonth > 0
              ? formatHuf(money.discountPerMonth)
              : money.active.length ? formatHuf(Math.round(money.mrr / money.active.length)) : "—"}
          </strong>
          <small>{money.discountPerMonth > 0 ? "havi szinten, a listaárhoz képest" : "aktív előfizetőnként"}</small>
        </article>
      </div>

      {/* ── Várható bevétel ─────────────────────────────────────────────── */}
      <div className={revenue.block}>
        <div className={revenue.blockHead}>
          <strong>Mikor jön be a pénz</strong>
          <span>következő 90 nap</span>
        </div>
        {upcoming.length ? (
          <ul className={revenue.list}>
            {upcoming.map((row) => {
              const days = daysUntil(row.due, new Date(nowMs));
              return (
                <li key={row.key} className={days < 0 ? revenue.late : ""}>
                  <div>
                    <b>{row.title}</b>
                    <small>
                      {row.due.toLocaleDateString("hu-HU")}
                      {row.projected ? " · előrevetítve" : days < 0 ? ` · ${Math.abs(days)} napja esedékes` : ` · ${days} nap múlva`}
                    </small>
                  </div>
                  <span>{formatHuf(row.amount)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={revenue.empty}>Nincs rögzített esedékesség. Vegyél fel ügyfelet, vagy rögzítsd egy meglévő befizetését.</p>
        )}
      </div>

      {/* ── Honnan jönnek az ügyfelek ───────────────────────────────────── */}
      <div className={revenue.block}>
        <div className={revenue.blockHead}>
          <strong>Honnan jönnek az érdeklődők</strong>
          <span>{leads.length} összesen</span>
        </div>
        {pipeline.length ? (
          <ul className={revenue.list}>
            {pipeline.map((entry) => (
              <li key={entry.source}>
                <div>
                  <b>{entry.source}</b>
                  <small>
                    {entry.statuses.map(([status, count]) =>
                      `${LEAD_STATUS_LABEL[status] ?? status}: ${count}`
                    ).join(" · ")}
                  </small>
                </div>
                <span>
                  {entry.won > 0
                    ? `${entry.won} nyert (${Math.round((entry.won / entry.total) * 100)}%)`
                    : `${entry.total} db`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={revenue.empty}>
            Még nincs érdeklődő a rendszerben. A hideg email kampány listáját a{" "}
            <code>scripts/import-cold-leads.mjs</code> tölti be ide.
          </p>
        )}
      </div>
    </section>
  );
}
