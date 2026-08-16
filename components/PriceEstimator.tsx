"use client";

import { useState } from "react";
import {
  CHANGE_QUOTA_EXCLUDED,
  CHANGE_QUOTA_FREE,
  CHANGE_QUOTA_INCLUDED,
  CHANGE_LEAD_REALITY,
  changeLeadLabel,
  PLAN_COMPARISON_ROWS,
  PLAN_DECISION_RULE,
  PRICE_TAX_NOTE,
  PURCHASE_OPTION_PRICES,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_SHARED_INCLUDED,
  formatHuf,
  type SubscriptionPlanKey
} from "@/lib/subscriptions";
import { TransitionLink } from "@/components/TransitionLink";

export function PriceEstimator() {
  const [detailPlan, setDetailPlan] = useState<SubscriptionPlanKey>("business");
  const activePlan = SUBSCRIPTION_PLANS.find((plan) => plan.key === detailPlan) ?? SUBSCRIPTION_PLANS[1];

  return (
    <section className="model-pricing" id="arak">
      <div className="pricing-lead">
        <p className="micro-label dark">Árak</p>
        <h3>Havidíjas weboldal, induló díj nélkül.</h3>
        <p>
          A domaint, a tárhelyet és a karbantartást is én intézem. Ha később a sajátod lenne, bármikor
          megveheted — <a href="#veteli-opcio">lentebb látod, mennyiért</a>.
        </p>
      </div>

      <div className="subscription-pricing-panel" id="pricing-panel-subscription">
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
                {/* A módosítási keret és a határidő a kártya alján külön kiemelést
                    kap (.plan-meta), ezért a jellemzőlistából kihagyjuk őket —
                    korábban szó szerint kétszer szerepeltek egymás alatt. */}
                <ul>
                  {plan.features
                    .filter((feature) => feature !== plan.changes && feature !== changeLeadLabel(plan.changeLeadDays))
                    .map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <div className="plan-meta"><span>{plan.changes}</span><span>{changeLeadLabel(plan.changeLeadDays)}</span></div>
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
              <small>{CHANGE_LEAD_REALITY}</small>
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
            <span>0 Ft induló díj</span>
            <span>Bármikor lemondható</span>
            <span>Kötelező jogi oldalak díjmentesek</span>
            <span>Díjmentes email továbbítás</span>
            <span>Szüneteltethető</span>
            <small>{PRICE_TAX_NOTE}</small>
          </div>
      </div>

      {/* A vásárlás KIMENET, nem belépő: a bérlés az egyetlen belépési pont, és
          a tulajdonszerzés egy később lehívható opció. Így a hideg forgalom nem
          a nagy egyösszegű döntéssel találkozik először, az „és ha egyszer a
          sajátom akarom?" kifogásra viszont van válasz. */}
      <section className="buyout-band" id="veteli-opcio">
        <div className="buyout-copy">
          <span className="micro-label dark">Vételi opció</span>
          <h3>Nem zárlak be. Bármikor megveheted.</h3>
          <p>
            Ha bármikor (akár néhány hónap, akár évek múltán) a saját tulajdonodba vennéd a weboldalt, egyetlen egyszeri díjért
            átveszed a teljes Next.js forráskódot, a domaint és a technikai fiókokat. Az előfizetés ekkor lezárul, és nincs több havidíj.
          </p>
          <ol>
            <li>Az ügyfélkapun elindítod a megvásárlást</li>
            <li>Átadási összefoglalót és fizetési adatokat kapsz</li>
            <li>A vételár beérkezése után átadom a forráskódot és a hozzáféréseket</li>
            <li>A domaint átíratom a saját fiókodra</li>
          </ol>
          <p className="buyout-note">
            Az átadás lépésenként megy, írásban, útmutatókkal — és végigkísérlek rajta. Jelszót,
            bankkártyaadatot vagy API kulcsot egyik fél sem küld a másiknak.
          </p>
        </div>
        <div className="buyout-prices">
          <span>Vételár csomagonként</span>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div key={plan.key}>
              <strong>{plan.name}</strong>
              <b>{formatHuf(PURCHASE_OPTION_PRICES[plan.key])}</b>
            </div>
          ))}
          <small>{PRICE_TAX_NOTE}</small>
        </div>
      </section>
    </section>
  );
}
