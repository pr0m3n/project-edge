"use client";

import { useState } from "react";
import {
  CHANGE_QUOTA_EXCLUDED,
  CHANGE_QUOTA_FREE,
  CHANGE_QUOTA_INCLUDED,
  PLAN_COMPARISON_ROWS,
  PLAN_DECISION_RULE,
  PRICE_TAX_NOTE,
  PURCHASE_PRICES,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_SHARED_INCLUDED,
  formatHuf,
  type SubscriptionPlanKey
} from "@/lib/subscriptions";
import { TransitionLink } from "@/components/TransitionLink";
import { trackEvent } from "@/lib/analytics";

const PURCHASE_DETAILS = [
  "Egyetlen ajánlat vagy kampány fókuszált bemutatására",
  "Többoldalas céges jelenlét és ügyfélszerző folyamat",
  "Saját vizuális rendszer és összetettebb működés",
  "Belépés, adatkezelés vagy egyedi üzleti folyamat"
];

const PURCHASE_INCLUDED = [
  { number: "01", title: "Forráskód", copy: "A projekt teljes kódja átadásra kerül." },
  { number: "02", title: "Hozzáférések", copy: "Domain, technikai fiókok és szükséges belépések." },
  { number: "03", title: "Éles indulás", copy: "Beállítás, ellenőrzés és működő rendszer átadása." },
  { number: "04", title: "30 nap garancia", copy: "Az átadás után felmerülő technikai hibák javítása." }
];

export function PriceEstimator() {
  const [mode, setMode] = useState<"subscription" | "purchase">("subscription");
  const [detailPlan, setDetailPlan] = useState<SubscriptionPlanKey>("business");
  const activePlan = SUBSCRIPTION_PLANS.find((plan) => plan.key === detailPlan) ?? SUBSCRIPTION_PLANS[1];

  function selectMode(next: "subscription" | "purchase") {
    setMode(next);
    trackEvent("pricing_model_viewed", { model: next });
  }

  return (
    <section className="model-pricing" id="arak">
      <p className="model-switch-hint">
        <span aria-hidden="true" />
        Kétféleképpen dolgozom. Kattints, és megnézed a másikat is.
      </p>
      <div className="model-switch" role="tablist" aria-label="Weboldal konstrukció" onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const next = mode === "subscription" ? "purchase" : "subscription";
        selectMode(next);
        document.getElementById(`pricing-tab-${next}`)?.focus();
      }}>
        <button aria-controls="pricing-panel-subscription" className={mode === "subscription" ? "active" : ""} id="pricing-tab-subscription" onClick={() => selectMode("subscription")} role="tab" aria-selected={mode === "subscription"} tabIndex={mode === "subscription" ? 0 : -1} type="button">
          <span>01 · A leggyakoribb</span>
          <strong>Weboldal bérlése</strong>
          <small>Havidíjat fizetsz, az oldal az enyém marad — a domaint, a tárhelyet és a karbantartást is én intézem.</small>
        </button>
        <button aria-controls="pricing-panel-purchase" className={mode === "purchase" ? "active" : ""} id="pricing-tab-purchase" onClick={() => selectMode("purchase")} role="tab" aria-selected={mode === "purchase"} tabIndex={mode === "purchase" ? 0 : -1} type="button">
          <span>02</span>
          <strong>Weboldal megvásárlása</strong>
          <small>Egyszeri díjat fizetsz, és az oldal a forráskóddal együtt a tiéd lesz.</small>
        </button>
        <i className={mode === "purchase" ? "right" : ""} aria-hidden="true" />
      </div>

      {mode === "subscription" ? (
        <div aria-labelledby="pricing-tab-subscription" className="subscription-pricing-panel" id="pricing-panel-subscription" role="tabpanel">
          <div className="pricing-promise">
            <span className="live-pulse" />
            <p><strong>Nincs induló díj.</strong> Én veszem meg és kezelem a domaint, biztosítom a tárhelyet, figyelem és frissítem az oldalt.</p>
          </div>
          <div className="subscription-plan-grid">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <article className={`subscription-plan ${plan.featured ? "featured" : ""}`} key={plan.key}>
                {plan.featured ? <span className="plan-ribbon">Legnépszerűbb</span> : null}
                <div className="plan-number">{plan.key === "presence" ? "01" : plan.key === "business" ? "02" : "03"}</div>
                <h3>{plan.name}</h3>
                <p>{plan.short}</p>
                <div className="plan-scope"><strong>{plan.pages}</strong><span>{plan.buildTime.replace("Jellemzően ", "elkészül ")}</span></div>
                <div className="plan-fit"><span>Válaszd, ha…</span><p>{PLAN_DECISION_RULE[plan.key]}</p></div>
                <div className="plan-price"><strong>{formatHuf(plan.price)}</strong><span>/ hó</span></div>
                <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                <div className="plan-meta"><span>{plan.changes}</span><span>{plan.response}</span></div>
                <button className="plan-detail-trigger" type="button" onClick={() => { setDetailPlan(plan.key); window.setTimeout(() => document.getElementById("csomag-reszletek")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }}>Részletes tartalom</button>
                <TransitionLink className="button primary" href={`/ugyfelkapu?model=subscription&plan=${plan.key}`}>Ezt választom</TransitionLink>
              </article>
            ))}
          </div>
          {/* Közös tengelyek. A három külön jellemzőlistából nem derült ki, mi a
              különbség — itt minden sor ugyanazt a kérdést teszi fel. */}
          <section className="plan-compare" aria-labelledby="plan-compare-title">
            <header>
              <h3 id="plan-compare-title">Mi a különbség a csomagok között?</h3>
              <p>Ugyanaz a kérdés mindhárom oszlopban, hogy egyben lásd a különbséget.</p>
            </header>
            <div className="plan-compare-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">&nbsp;</th>
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <th className={plan.featured ? "featured-col" : ""} key={plan.key} scope="col">{plan.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PLAN_COMPARISON_ROWS.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {SUBSCRIPTION_PLANS.map((plan) => (
                        <td className={plan.featured ? "featured-col" : ""} key={plan.key}>{row.value(plan)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="plan-shared">
              <span>Mindhárom csomagban benne van</span>
              <ul>{SUBSCRIPTION_SHARED_INCLUDED.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <details className="plan-quota-explainer">
              <summary>Mi számít „kisebb módosításnak"?</summary>
              <div>
                <div><span>Beleszámít a keretbe</span><ul>{CHANGE_QUOTA_INCLUDED.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div><span>Külön ajánlat</span><ul>{CHANGE_QUOTA_EXCLUDED.map((item) => <li key={item}>{item}</li>)}</ul></div>
                <div className="quota-free"><span>Mindig ingyenes</span><ul>{CHANGE_QUOTA_FREE.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
              <p>A felhasznált keretet az ügyfélkapun bármikor látod — nem kell számolgatnod.</p>
            </details>
          </section>

          <section className="plan-detail-panel" id="csomag-reszletek">
            <header><div><span>RÉSZLETES CSOMAGTARTALOM</span><h3>{activePlan.name}</h3><p>{activePlan.idealFor}</p></div><div><strong>{formatHuf(activePlan.price)}<small>/hó</small></strong><span>{activePlan.buildTime}</span></div></header>
            <div>{activePlan.detailGroups.map((group, index) => <article key={group.title}><span>0{index + 1}</span><h4>{group.title}</h4><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>
            <footer><p><strong>A brief is ehhez igazodik.</strong> Csak a {activePlan.name} csomagban elérhető oldalakra, funkciókra és induló anyagokra kérdezünk rá.</p><TransitionLink className="button primary" href={`/ugyfelkapu?model=subscription&plan=${activePlan.key}`}>{activePlan.name} csomagot választom</TransitionLink></footer>
          </section>
          <div className="subscription-footnotes">
            <span>0 Ft induló díj</span><span>Bármikor lemondható</span><span>Első hónap előre fizetendő</span><span>Szüneteltethető</span><small>{PRICE_TAX_NOTE}</small>
          </div>
        </div>
      ) : (
        <div aria-labelledby="pricing-tab-purchase" className="purchase-pricing-panel" id="pricing-panel-purchase" role="tabpanel">
          <div className="purchase-intro">
            <div><span className="micro-label dark">Egyszeri projekt · teljes tulajdon</span><h3>Egyszer fizetsz.<br /><em>Minden a tiéd.</em></h3></div>
            <div className="purchase-intro-copy"><p>A forráskódot, a domaint és a szükséges hozzáféréseket rendezett technikai átadással kapod meg. Nem maradsz egy zárt rendszerhez vagy kötelező havidíjhoz kötve.</p><span><i /> TELJES TECHNIKAI ÁTADÁS</span></div>
          </div>
          <div className="purchase-included" aria-label="A vásárlás részei">
            {PURCHASE_INCLUDED.map((item) => <article key={item.number}><span>{item.number}</span><div><strong>{item.title}</strong><p>{item.copy}</p></div></article>)}
          </div>
          <div className="purchase-list-head"><span>PROJEKTTÍPUS</span><span>INDULÓ ÁR</span></div>
          <div className="purchase-list">
            {PURCHASE_PRICES.map((item, index) => <div key={item.name}><span>0{index + 1}</span><div><strong>{item.name}</strong><small>{PURCHASE_DETAILS[index]}</small></div><b>{item.price}</b><i aria-hidden="true">→</i></div>)}
          </div>
          <div className="purchase-actions">
            <div><span>AZ INDULÁS MENETE</span><p>Kiválasztod a típust, kitöltöd a projektbriefet, majd az ügyfélkapuban követed az egyeztetést és a megvalósítást.</p></div>
            <TransitionLink className="button primary" href="/ugyfelkapu?model=purchase">Weboldal-vásárlás indítása</TransitionLink>
          </div>
          <div className="purchase-fine-print"><p><strong>Fontos:</strong> a későbbi tárhely, üzemeltetés és módosítás nem része az egyszeri vételárnak, de külön gondozási csomag kérhető.</p><small>{PRICE_TAX_NOTE}</small></div>
        </div>
      )}
    </section>
  );
}
