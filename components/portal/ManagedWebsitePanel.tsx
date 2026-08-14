"use client";

import type { ClientChangeRequest, Project } from "@/components/portal/types";
import { useState } from "react";
import { ChangeThread } from "@/components/portal/ChangeThread";
import { BANK_TRANSFER_DETAILS } from "@/components/portal/format";
import {
  CHANGE_QUOTA_EXCLUDED,
  CHANGE_QUOTA_FREE,
  CHANGE_QUOTA_INCLUDED,
  changeQuotaLabel,
  consumesChangeQuota,
  formatHuf,
  quotaPeriodKey,
  quotaRenewsAt,
  subscriptionPlan
} from "@/lib/subscriptions";

type Props = {
  project: Project;
  requests: ClientChangeRequest[];
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onManageBilling: () => void;
  onRequestChange: (category: string, description: string) => Promise<void>;
  /** Kereten felüli módosítás ajánlatának elfogadása / elutasítása / utalás jelzése. */
  onQuoteDecision: (requestId: string, decision: "accept" | "decline" | "transfer") => Promise<void>;
  onQuoteCardPayment: (requestId: string) => Promise<void>;
  onThreadMessage: (requestId: string) => Promise<void>;
};

export function ManagedWebsitePanel({ project, requests, onPause, onResume, onCancel, onManageBilling, onRequestChange, onQuoteDecision, onQuoteCardPayment, onThreadMessage }: Props) {
  const plan = subscriptionPlan(project.subscription_plan);
  // A módosítás és a hibabejelentés ugyanazt az űrlapot használja, de más
  // kategóriakészlettel — a kettő keveredése volt az egyik oka annak, hogy
  // technikai hiba is „módosításnak" látszott.
  const [composer, setComposer] = useState<false | "change" | "bug">(false);
  const [category, setCategory] = useState("content");
  const [description, setDescription] = useState("");
  const paused = project.subscription_status === "paused" || project.status === "paused";
  const paymentProblem = project.subscription_status === "past_due";
  const cancelPending = project.subscription_status === "cancel_requested";
  const pausePending = project.subscription_status === "pause_requested";
  const resumePending = project.subscription_status === "resume_requested";
  // ── Módosítási keret ────────────────────────────────────────────────────
  // A keret a számlázási fordulónaphoz igazodik. A technikai hiba sosem
  // fogyaszt, ezért a hibabejelentés külön, keretfüggetlen útvonalon megy.
  const quota = plan.changeQuota;
  const billingAnchor = project.billing_cycle_started_at ?? project.created_at;
  const currentPeriod = quotaPeriodKey(billingAnchor, quota);
  const renewsAt = quotaRenewsAt(billingAnchor, quota);
  const usedInPeriod = requests.filter(
    (request) => (request.period_key ?? currentPeriod) === currentPeriod && consumesChangeQuota(request)
  ).length;
  const quotaLeft = Math.max(0, quota.count - usedInPeriod);
  const quotaExhausted = quotaLeft === 0;

  return (
    <section className="managed-hub">
      <header className="managed-hub-head">
        <div><span className={`health-dot ${project.site_health_status === "attention" ? "warn" : ""}`} /><div><small>MENEDZSELT WEBOLDAL</small><h3>{project.managed_domain_name || project.brief_data?.domainName || "A weboldalad"}</h3></div></div>
        <span className={`subscription-state ${paused || paymentProblem ? "paused" : ""}`}>{paused ? "Szüneteltetve" : paymentProblem ? "Fizetési probléma" : "● Aktív és felügyelt"}</span>
      </header>

      <div className="managed-metrics">
        <article><span>Csomag</span><strong>{plan.name}</strong><small>{formatHuf(project.monthly_price ?? plan.price)} / hó</small></article>
        <article><span>Következő időszak</span><strong>{project.next_billing_at ? new Date(project.next_billing_at).toLocaleDateString("hu-HU") : "Beállítás alatt"}</strong><small>Előre fizetett havidíj</small></article>
        <article className={quotaExhausted ? "quota-tile spent" : "quota-tile"}>
          <span>Módosítási keret</span>
          <strong>{usedInPeriod}/{quota.count} felhasználva</strong>
          <small>{renewsAt ? `Újul: ${renewsAt.toLocaleDateString("hu-HU")}` : changeQuotaLabel(quota)}</small>
        </article>
        <article><span>Utolsó ellenőrzés</span><strong>{project.last_health_check_at ? new Date(project.last_health_check_at).toLocaleDateString("hu-HU") : "Induláskor"}</strong><small>Domain · SSL · űrlapok</small></article>
      </div>

      <div className="managed-command-grid">
        <article className="managed-command primary-command">
          <span>01 / MÓDOSÍTÁS</span>
          <h4>Változott valami a vállalkozásodban?</h4>
          <p>
            {quotaExhausted
              ? `Az időszak kerete elfogyott. Kérést továbbra is küldhetsz — arra előzetes ajánlatot adok, és csak a jóváhagyásod után készül el.`
              : `Szöveg, ár, kép vagy kisebb designmódosítás. Ebben az időszakban még ${quotaLeft} módosítás van a keretedben.`}
          </p>
          <button className="button primary" type="button" onClick={() => { setCategory("content"); setComposer(composer !== "change" ? "change" : false); }}>
            {quotaExhausted ? "Módosítás kérése (ajánlattal)" : "Új módosítás kérése"}
          </button>
        </article>
        <article className="managed-command">
          <span>02 / HIBA</span>
          <h4>Nem működik valami?</h4>
          <p>A technikai hiba javítása a szolgáltatás része: <strong>soha nem fogyasztja a módosítási keretet</strong>, és nem kell hozzá ajánlat.</p>
          <button className="button secondary" type="button" onClick={() => { setCategory("technical"); setComposer(composer !== "bug" ? "bug" : false); }}>
            Hibát jelentek
          </button>
        </article>
      </div>

      <details className="quota-explainer">
        <summary>Mi számít bele a módosítási keretbe?</summary>
        <div className="quota-explainer-grid">
          <div><span>Beleszámít</span><ul>{CHANGE_QUOTA_INCLUDED.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><span>Külön ajánlat</span><ul>{CHANGE_QUOTA_EXCLUDED.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className="quota-free"><span>Mindig ingyenes</span><ul>{CHANGE_QUOTA_FREE.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
      </details>

      {composer ? (
        <form
          className="change-composer"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!description.trim()) return;
            await onRequestChange(composer === "bug" ? "technical" : category, description);
            setDescription("");
            setComposer(false);
          }}
        >
          {composer === "bug" ? (
            <div className="composer-note">
              <strong>Hibabejelentés</strong>
              <span>Ez nem fogyaszt a keretedből. Írd le, mit tapasztalsz, és hol.</span>
            </div>
          ) : (
            <div>
              <label htmlFor={`change-category-${project.id}`}>Milyen módosítás?</label>
              <select id={`change-category-${project.id}`} value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="content">Szöveg, kép vagy adat</option>
                <option value="design">Kisebb designmódosítás</option>
                <option value="new_feature">Új funkció — külön ajánlat</option>
              </select>
            </div>
          )}
          <div>
            <label htmlFor={`change-description-${project.id}`}>Írd le röviden</label>
            <textarea
              id={`change-description-${project.id}`}
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={composer === "bug" ? "Mit tapasztalsz, melyik oldalon, mikortól?" : "Mit módosítsunk, és mi legyen helyette?"}
            />
          </div>
          {composer === "change" && category !== "new_feature" ? (
            <small className="composer-hint">
              {quotaExhausted
                ? "Az időszak kerete elfogyott — erre előzetes ajánlatot küldök, és csak a jóváhagyásod után készül el."
                : `Ez a kérés a keretedbe fog számítani (${usedInPeriod + 1}/${quota.count}), ha kisebb módosításnak minősül.`}
            </small>
          ) : null}
          <button className="button primary" type="submit">{composer === "bug" ? "Hiba bejelentése" : "Kérés elküldése"}</button>
        </form>
      ) : null}

      {requests.length ? <div className="client-request-timeline"><div><strong>Módosítási és hibabejelentések</strong><span>{requests.filter((request) => !["completed", "declined"].includes(request.status)).length} folyamatban</span></div>{requests.map((request) => <article key={request.id}><span className={`request-status status-${request.status}`}>{request.status === "new" ? "Beérkezett" : request.status === "planned" ? "Tervezve" : request.status === "in_progress" ? "Folyamatban" : request.status === "waiting_client" ? "Válaszra vár" : request.status === "completed" ? "Lezárva" : "Külön egyeztetés"}</span><p>{request.description}</p><small>{request.category === "technical" ? "Technikai hiba — nem fogyaszt keretet" : request.included_in_plan === true ? "A keretbe beleszámít" : request.included_in_plan === false ? "Külön ajánlat szükséges" : "A keretet még ellenőrizzük"} · {new Date(request.requested_at).toLocaleDateString("hu-HU")}</small>{request.admin_note ? <em>{request.admin_note}</em> : null}

        {/* Kereten felüli módosítás ajánlata. */}
        {request.quoted_amount ? (
          <div className="client-quote-box">
            <div className="client-quote-head">
              <span>AJÁNLAT ERRE A MÓDOSÍTÁSRA</span>
              <strong>{formatHuf(request.quoted_amount)}</strong>
            </div>
            {request.quote_note ? <p>{request.quote_note}</p> : null}
            {request.paid_at ? (
              <small className="client-quote-done">Kifizetve — a módosítás munkában van.</small>
            ) : request.transfer_reported_at ? (
              <small className="client-quote-done">Az utalást jeleztük. Amint megérkezik, indul a munka.</small>
            ) : request.quote_accepted_at ? (
              <div className="client-quote-pay">
                <div className="client-quote-payment-choice">
                  <div>
                    <strong>Bankkártya</strong>
                    <small>Azonnali fizetés a Stripe biztonságos oldalán.</small>
                    <button className="button primary" type="button" onClick={() => onQuoteCardPayment(request.id)}>Fizetek bankkártyával</button>
                  </div>
                  <div>
                    <strong>Banki átutalás</strong>
                    <b>{BANK_TRANSFER_DETAILS.accountNumber}</b>
                    <small>{BANK_TRANSFER_DETAILS.name} · Közlemény: {request.payment_reference ?? "—"}</small>
                    <button className="button secondary" type="button" onClick={() => onQuoteDecision(request.id, "transfer")}>Elutaltam</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="client-quote-actions">
                <button className="button primary" type="button" onClick={() => onQuoteDecision(request.id, "accept")}>Elfogadom</button>
                <button className="button secondary" type="button" onClick={() => onQuoteDecision(request.id, "decline")}>Nem kérem</button>
              </div>
            )}
          </div>
        ) : null}

        <ChangeThread requestId={request.id} role="client" onSent={() => onThreadMessage(request.id)} /></article>)}</div> : null}

      <details className="subscription-manage">
        <summary>Előfizetés kezelése</summary>
        <article className="purchase-option-card"><strong>Bankkártya és Stripe-számlázás</strong><p>A Stripe biztonságos felületén frissítheted a kártyát és ellenőrizheted a fizetési adatokat.</p><button className="button secondary" onClick={onManageBilling} type="button">Stripe számlázás megnyitása</button></article>
        <div><div><strong>Szüneteltetés</strong><p>Az oldal parkolóállapotba kerül, a domain és a rendszer megmarad. Parkolási díj: 2 900 Ft/hó.</p>{pausePending || resumePending ? <div className="purchase-request-state"><strong>Kérelem elküldve</strong><span>Az adminisztrátor feldolgozza, az eredményről itt és emailben is értesítést kapsz.</span></div> : paused ? <button className="button secondary" onClick={onResume} type="button">Újraaktiválás kérése</button> : <button className="button secondary" onClick={onPause} type="button">Szüneteltetés kérése</button>}</div><div className="danger-zone"><strong>Lemondás</strong><p>A weboldal a kifizetett időszak végén leáll. Ez nem projektátadás és nem jár forráskóddal vagy 30 napos garanciával. Ha szeretnéd megtartani az oldalt, előbb a tulajdonba-vételi folyamatot indítsd el.</p>{cancelPending ? <div className="purchase-request-state"><strong>Lemondási kérelem elküldve</strong><span>A szolgáltatás a kifizetett időszak végén zárul le. Az időpontról értesítést kapsz.</span></div> : <button className="button secondary" onClick={onCancel} type="button">Előfizetés lemondása</button>}</div></div>
      </details>
    </section>
  );
}
