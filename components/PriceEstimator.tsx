"use client";

import { useState } from "react";
import { PRICE_TAX_NOTE, PURCHASE_PRICES, SUBSCRIPTION_PLANS, formatHuf, type SubscriptionPlanKey } from "@/lib/subscriptions";
import { TransitionLink } from "@/components/TransitionLink";

export function PriceEstimator() {
  const [mode, setMode] = useState<"subscription" | "purchase">("subscription");
  const [detailPlan, setDetailPlan] = useState<SubscriptionPlanKey>("business");
  const activePlan = SUBSCRIPTION_PLANS.find((plan) => plan.key === detailPlan) ?? SUBSCRIPTION_PLANS[1];

  return (
    <section className="model-pricing" id="arak">
      <p className="model-switch-hint">
        <span aria-hidden="true" />
        Kétféleképpen dolgozom. Kattints, és megnézed a másikat is.
      </p>
      <div className="model-switch" role="tablist" aria-label="Weboldal konstrukció">
        <button className={mode === "subscription" ? "active" : ""} onClick={() => setMode("subscription")} role="tab" aria-selected={mode === "subscription"} type="button">
          <span>01 · A leggyakoribb</span>
          <strong>Weboldal bérlése</strong>
          <small>Havidíjat fizetsz, az oldal az enyém marad — a domaint, a tárhelyet és a karbantartást is én intézem.</small>
        </button>
        <button className={mode === "purchase" ? "active" : ""} onClick={() => setMode("purchase")} role="tab" aria-selected={mode === "purchase"} type="button">
          <span>02</span>
          <strong>Weboldal megvásárlása</strong>
          <small>Egyszeri díjat fizetsz, és az oldal a forráskóddal együtt a tiéd lesz.</small>
        </button>
        <i className={mode === "purchase" ? "right" : ""} aria-hidden="true" />
      </div>

      {mode === "subscription" ? (
        <div className="subscription-pricing-panel" role="tabpanel">
          <div className="pricing-promise">
            <span className="live-pulse" />
            <p><strong>Nincs induló díj.</strong> Mi vesszük meg és kezeljük a domaint, biztosítjuk a tárhelyet, figyeljük és frissítjük az oldalt.</p>
          </div>
          <div className="subscription-plan-grid">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <article className={`subscription-plan ${plan.featured ? "featured" : ""}`} key={plan.key}>
                {plan.featured ? <span className="plan-ribbon">Legnépszerűbb</span> : null}
                <div className="plan-number">{plan.key === "presence" ? "01" : plan.key === "business" ? "02" : "03"}</div>
                <h3>{plan.name}</h3>
                <p>{plan.short}</p>
                <div className="plan-fit"><span>Kinek való?</span><p>{plan.idealFor}</p></div>
                <div className="plan-price"><strong>{formatHuf(plan.price)}</strong><span>/ hó</span></div>
                <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
                <div className="plan-meta"><span>{plan.changes}</span><span>{plan.response}</span></div>
                <button className="plan-detail-trigger" type="button" onClick={() => { setDetailPlan(plan.key); window.setTimeout(() => document.getElementById("csomag-reszletek")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }}>Részletes tartalom</button>
                <TransitionLink className="button primary" href={`/ugyfelkapu?model=subscription&plan=${plan.key}`}>Ezt választom</TransitionLink>
              </article>
            ))}
          </div>
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
        <div className="purchase-pricing-panel" role="tabpanel">
          <div className="purchase-intro">
            <div><span className="micro-label dark">Egyszeri projekt</span><h3>A rendszer a tiéd lesz.</h3></div>
            <p>A forráskódot, a domaint és a szükséges hozzáféréseket átadom. A későbbi hosting, üzemeltetés és módosítás nem része a vételárnak, de külön gondozási csomag kérhető.</p>
          </div>
          <div className="purchase-list">
            {PURCHASE_PRICES.map((item, index) => <div key={item.name}><span>0{index + 1}</span><strong>{item.name}</strong><b>{item.price}</b></div>)}
          </div>
          <div className="purchase-actions">
            <TransitionLink className="button primary" href="/ugyfelkapu?model=purchase">Egyedi ajánlatot kérek</TransitionLink>
            <p>Technikai átadás · forráskód · 30 nap hibagarancia<br /><small>{PRICE_TAX_NOTE}</small></p>
          </div>
        </div>
      )}
    </section>
  );
}
