"use client";

import { useState } from "react";
import styles from "@/components/admin/add-client.module.css";
import { supabase } from "@/lib/supabase/client";
import { daysUntil, billingIntervalLabel, projectCycleMonths } from "@/lib/onboarding";
import { formatHuf } from "@/lib/subscriptions";
import type { ClientProject } from "@/components/admin/types";

/**
 * FIZETÉSI TEENDŐK EGY PROJEKTNÉL.
 *
 * Két gomb, ami eddig nem létezett, és ami nélkül a kézzel felvett ügyfél
 * nyilvántartása megállt volna az első fordulónapnál:
 *
 *  · „Befizetés rögzítése" — az utalás megérkezett a bankszámlára. Ezt csak az
 *    admin tudja; a rendszernek nincs honnan értesülnie róla. Enélkül az
 *    ügyfél a nyilvántartásban örökre fizetetlen maradna, és a fizetési
 *    emlékeztető újra és újra kiment volna neki — annak ellenére, hogy rendezte.
 *
 *  · „Fizetési link" — ha kártyával akar fizetni. A Stripe Checkout munkamenet
 *    a projekthez kötve jön létre, a linket bemásolod egy levélbe, és a
 *    beérkezést a webhook könyveli le magától.
 *
 * A rögzítés egyúttal kiállítja az AAM-számlát és értesíti az ügyfelet, mert
 * ez a három dolog a valóságban egyetlen esemény — külön gombokra bontva
 * garantáltan elmaradna valamelyik.
 */

type Props = {
  project: ClientProject & {
    billing_interval?: string | null;
    billing_period_months?: number | null;
    payment_method?: string | null;
    prepaid_until?: string | null;
  };
  /** A projekt nyitott, várt befizetése — ha van. */
  nextDue: {
    id: string;
    amount: number;
    due_date: string | null;
    payment_reference: string | null;
    status?: string;
    transfer_reported_at?: string | null;
  } | null;
  onDone: () => void | Promise<void>;
  onNotice: (message: string) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

export function PaymentActionsPanel({ project, nextDue, onDone, onNotice }: Props) {
  const [open, setOpen] = useState<false | "record" | "link">(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);

  const [paidAt, setPaidAt] = useState(today());
  const [amount, setAmount] = useState(String(nextDue?.amount ?? project.monthly_price ?? 0));
  const [reference, setReference] = useState(nextDue?.payment_reference ?? "");
  const [note, setNote] = useState("");
  const [issueInvoice, setIssueInvoice] = useState(true);
  /** Hány ciklust fedez ez a befizetés. Egy utalás lehet több hónap vagy év is. */
  const [periods, setPeriods] = useState("1");

  const interval = projectCycleMonths(project);
  const [nowMs] = useState(() => Date.now());
  const dueDays = nextDue?.due_date ? daysUntil(new Date(nextDue.due_date), new Date(nowMs)) : null;

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("A munkamenet lejárt. Jelentkezz be újra.");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    };
  }

  async function recordPayment() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          projectId: project.id,
          paymentId: nextDue?.id,
          amount: Number(amount),
          periods: Math.max(1, Number(periods) || 1),
          paidAt,
          reference,
          note,
          issueInvoice
        })
      });
      const payload = await response.json() as {
        error?: string;
        nextBillingAt?: string;
        invoice?: { ok: boolean; message: string };
      };
      if (!response.ok) throw new Error(payload.error || "A befizetés rögzítése nem sikerült.");

      const next = payload.nextBillingAt ? new Date(payload.nextBillingAt).toLocaleDateString("hu-HU") : "";
      onNotice(
        payload.invoice?.ok
          ? `Befizetés rögzítve, számla kiállítva. Következő esedékesség: ${next}.`
          : `Befizetés rögzítve. ${payload.invoice?.message ?? ""}`
      );
      setOpen(false);
      await onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A befizetés rögzítése nem sikerült.");
    } finally {
      setBusy(false);
    }
  }

  async function createLink(kind: "one_off" | "subscription") {
    setBusy(true);
    setError("");
    setLink("");
    try {
      const response = await fetch("/api/admin/payment-link", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ projectId: project.id, kind, paymentId: nextDue?.id })
      });
      const payload = await response.json() as { error?: string; url?: string; warning?: string | null };
      if (!response.ok || !payload.url) throw new Error(payload.error || "A fizetési link nem hozható létre.");
      setLink(payload.url);
      if (payload.warning) setError(payload.warning);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "A fizetési link nem hozható létre.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.panel} style={{ padding: 18, borderRadius: 18 }}>
      <div className={styles.previewRow}>
        <span>
          {nextDue
            ? `Következő ${billingIntervalLabel(interval)} díj`
            : "Nincs nyitott várt befizetés"}
        </span>
        <b>
          {nextDue ? formatHuf(nextDue.amount) : "—"}
          {nextDue?.due_date ? ` · ${new Date(nextDue.due_date).toLocaleDateString("hu-HU")}` : ""}
        </b>
      </div>

      {nextDue?.status === "reported" ? (
        <p className={`${styles.previewNote} ${styles.warn}`}>
          <b>Az ügyfél jelezte, hogy elutalta</b>
          {nextDue.transfer_reported_at ? ` (${new Date(nextDue.transfer_reported_at).toLocaleDateString("hu-HU")})` : ""}.
          Ellenőrizd a bankszámlán, és rögzítsd — addig fizetetlennek látszik, és emlékeztetőt kapna.
        </p>
      ) : null}

      {dueDays !== null ? (
        <p className={`${styles.previewNote} ${dueDays < 0 ? styles.warn : ""}`}>
          {dueDays < 0
            ? `${Math.abs(dueDays)} napja esedékes és még nem érkezett meg. Az ügyfél automatikus emlékeztetőt kapott.`
            : dueDays === 0
              ? "Ma esedékes."
              : `${dueDays} nap múlva esedékes.`}
          {nextDue?.payment_reference ? ` Közlemény: ${nextDue.payment_reference}` : ""}
        </p>
      ) : null}

      <div className={styles.actions}>
        <button
          className="admin-btn-primary"
          type="button"
          onClick={() => { setOpen(open === "record" ? false : "record"); setError(""); }}
        >
          Befizetés rögzítése
        </button>
        <button
          className="admin-btn-secondary"
          type="button"
          onClick={() => { setOpen(open === "link" ? false : "link"); setError(""); setLink(""); }}
        >
          Fizetési link
        </button>
      </div>

      {/* ── Utalás rögzítése ──────────────────────────────────────────── */}
      {open === "record" ? (
        <div className={styles.group}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Mikor érkezett meg</span>
              <input type="date" value={paidAt} max={today()} onChange={(e) => setPaidAt(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>Összeg (Ft)</span>
              <input type="number" min={1000} step={100} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>Hány {interval >= 12 ? "évet" : interval === 6 ? "félévet" : interval === 3 ? "negyedévet" : "hónapot"} fedez</span>
              <input type="number" min={1} max={120} step={1} value={periods} onChange={(e) => setPeriods(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>Közlemény / azonosító</span>
              <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="a bankkivonatról" />
            </label>
          </div>
          <label className={styles.field}>
            <span>Jegyzet</span>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ha van bármi különleges ebben a befizetésben" />
          </label>

          <label className={styles.checkRow}>
            <input type="checkbox" checked={issueInvoice} onChange={(e) => setIssueInvoice(e.target.checked)} />
            <div>
              <strong>Számla kiállítása a Billingóban</strong>
              <small>
                AAM-számla készül és automatikusan kimegy az ügyfélnek. Vedd ki a pipát, ha kézzel
                már kiszámláztad — utólag a „Kiszámlázatlan befizetések" kártyáról is pótolható.
              </small>
            </div>
          </label>

          <p className={styles.hint}>
            A rögzítés egyúttal előreviszi a fordulónapot, létrehozza a következő várt befizetést,
            és értesíti az ügyfelet emailben.
          </p>

          <div className={styles.actions}>
            <button className="admin-btn-primary" type="button" disabled={busy} onClick={() => void recordPayment()}>
              {busy ? "Rögzítés…" : "Megérkezett — rögzítem"}
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Fizetési link ─────────────────────────────────────────────── */}
      {open === "link" ? (
        <div className={styles.group}>
          <p className={styles.hint}>
            A linket bemásolod egy levélbe. A beérkezést a webhook könyveli le magától — nem kell
            utólag rögzítened.
          </p>
          <div className={styles.actions}>
            <button className="admin-btn-secondary" type="button" disabled={busy} onClick={() => void createLink("one_off")}>
              Egyszeri fizetés ({billingIntervalLabel(interval)} díj)
            </button>
            <button className="admin-btn-secondary" type="button" disabled={busy} onClick={() => void createLink("subscription")}>
              Ismétlődő kártyás fizetés
            </button>
          </div>

          {link ? (
            <div className={styles.success}>
              <strong>A link elkészült</strong>
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} style={{ width: "100%" }} />
              <div className={styles.actions}>
                <button
                  className="admin-btn-primary"
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(link).then(() => setCopied(true));
                  }}
                >
                  {copied ? "Kimásolva" : "Másolás vágólapra"}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
