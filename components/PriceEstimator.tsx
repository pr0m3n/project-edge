"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { IconBank, IconGuarantee, IconLock, IconWallet } from "@/components/payment-marks";
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
  buyoutCreditMonths,
  buyoutFloorPrice,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_SHARED_INCLUDED,
  ANNUAL_FREE_MONTHS,
  billingTerm,
  termEffectiveMonthly,
  termSaving,
  termTotal,
  formatHuf,
  type SubscriptionPlanKey
} from "@/lib/subscriptions";
import { TransitionLink } from "@/components/TransitionLink";
import { huArticle } from "@/lib/hu";

type PriceEstimatorProps = {
  /**
   * Van-e MÁR fejléc a blokk fölött. A főoldalon és a landing oldalakon a
   * befoglaló szekciónak saját „Árak" felcímkéje és H2-je van, tehát a saját
   * bevezetőnk ott szó szerint megismételné ugyanazt két sorral lejjebb.
   */
  showLead?: boolean;
};

/**
 * Az árkártyáról indított csomagválasztás átadása a briefnek.
 *
 * Session storage-ban megy, nem URL-ben: így ugyanazon az oldalon marad a
 * látogató (a `#projektbrief` horgony csak odagörget), és a landing oldalakon
 * is működik, ahol a brief a lap alján van.
 */
export const PLAN_PRESELECT_KEY = "pe-preselect-plan";

function preselectPlan(key: SubscriptionPlanKey) {
  try {
    window.sessionStorage.setItem(PLAN_PRESELECT_KEY, key);
    window.dispatchEvent(new CustomEvent("projectedge:plan-preselected", { detail: key }));
  } catch {
    /* Privát módban a sessionStorage tiltott lehet — a horgony ettől még működik. */
  }
}

export function PriceEstimator({ showLead = true }: PriceEstimatorProps) {
  /**
   * Havi vagy éves árakat mutasson-e a táblázat.
   *
   * Nem két külön csomagkészlet: UGYANAZ a csomag, más fizetési ütemezéssel.
   * A váltó azért kell, mert az éves ár önmagában nagynak látszik (149 000),
   * a havi vetülete viszont épp az érv mellette (12 417 Ft/hó) — a kettőt
   * egymás mellett kell látni ahhoz, hogy a kedvezmény értelmet nyerjen.
   */
  const [annual, setAnnual] = useState(false);
  const [detailPlan, setDetailPlan] = useState<SubscriptionPlanKey>("business");
  const activePlan = SUBSCRIPTION_PLANS.find((plan) => plan.key === detailPlan) ?? SUBSCRIPTION_PLANS[1];

  return (
    <section className="model-pricing" id="arak">
      {showLead ? (
        <div className="pricing-lead">
          <p className="micro-label dark">Árak</p>
          <h3>Havidíjas weboldal, egyetlen fix díjjal.</h3>
          <p>
            A domaint, a tárhelyet és a karbantartást is én intézem. Ha később a sajátod lenne, bármikor
            megveheted — <a href="#veteli-opcio">lentebb látod, mennyiért</a>.
          </p>
        </div>
      ) : null}

      <div className="subscription-pricing-panel" id="pricing-panel-subscription">
          {/* A legerősebb érv a legfeltűnőbb helyen.
              A legtöbb stúdió 50% előleget kér egy még el sem készült
              weboldalért. Itt fordítva van, és ezt ki kell mondani — nem
              egy apróbetűs sorban, hanem az árak FÖLÖTT. */}
          <div className="pricing-promise pricing-promise-lead">
            <span className="promise-icon"><IconGuarantee /></span>
            <p>
              <strong>Csak akkor fizetsz, ha kész — és tetszik.</strong> Megépítem a weboldalad,
              megnézed, és a díj csak azután esedékes, hogy jóváhagytad. Nincs előleg, nincs foglaló,
              nincs belépési díj. Ha nem tetszik, nem fizetsz.
            </p>
          </div>

          <div className="pricing-promise">
            <span className="promise-icon is-soft"><IconWallet /></span>
            <p><strong>Utána sincs más költséged.</strong> Én veszem meg és kezelem a domaint, biztosítom a tárhelyet, figyelem és frissítem az oldalt — mindez a havidíjban van.</p>
          </div>

          {/* Fizetési ütemezés váltó.
              A `radiogroup` szerep nem díszítés: nyíllal is válthatóvá teszi,
              és a képernyőolvasó két egymást kizáró lehetőségként olvassa fel,
              nem két független gombként. */}
          <div className="billing-switch" role="radiogroup" aria-label="Fizetési ütemezés">
            <button
              type="button"
              role="radio"
              aria-checked={!annual}
              className={annual ? "" : "is-active"}
              onClick={() => setAnnual(false)}
            >
              Havonta
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={annual}
              className={annual ? "is-active" : ""}
              onClick={() => setAnnual(true)}
            >
              Évente
              <span className="billing-switch-badge">−{ANNUAL_FREE_MONTHS} hónap</span>
            </button>
          </div>

          {/* Egyetlen fizetési sáv, valódi márkajelekkel.
              A két külön doboz helyett egy sor: a logók önmagukban hordozzák
              a felismerhetőséget, keret nélkül tisztábban ülnek. Szűk
              képernyőn a logósor vízszintesen görgethető, és a jobb szélén
              elhalványul — így a levágás szándékosnak látszik, nem hibának. */}
          <div className="pay-bar">
            <div className="pay-cards">
              <span className="pay-label">Bankkártya</span>
              <div className="pay-logos">
                <img src="/logo/pay/visa.svg" alt="Visa" width="52" height="17" loading="lazy" />
                <img src="/logo/pay/mastercard.svg" alt="Mastercard" width="30" height="23" loading="lazy" />
                <img src="/logo/pay/amex.svg" alt="American Express" width="23" height="23" loading="lazy" />
                <img src="/logo/pay/jcb.svg" alt="JCB" width="29" height="23" loading="lazy" />
                <img src="/logo/pay/apple-pay.svg" alt="Apple Pay" width="46" height="19" loading="lazy" />
              </div>
            </div>

            <div className="pay-divider" aria-hidden="true" />

            <div className="pay-transfer">
              <IconBank size={18} />
              <div>
                <strong>Banki átutalás</strong>
                <small>féléves és éves fizetésnél</small>
              </div>
            </div>
          </div>

          {/* Egyetlen folyó mondat, a logóval egy szó helyén.
              Korábban flex-konténer volt: az a mondatot elemekre bontotta, és
              a tördelés a logó MELLETT vágta ketté — „A fizetést a [stripe]" /
              „kezeli — …". Inline elemekkel a szöveg úgy folyik, ahogy kell. */}
          <p className="pay-secure">
            <IconLock />{" "}A fizetést a{" "}
            <img src="/logo/pay/stripe.svg" alt="Stripe" width="46" height="19" loading="lazy" />{" "}
            kezeli — a kártyaadataid hozzám nem jutnak el, és nem is tárolom őket.
          </p>

          <div className="subscription-plan-grid">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <article className={`subscription-plan ${plan.featured ? "featured" : ""}`} key={plan.key}>
                {plan.featured ? <span className="plan-ribbon">Legnépszerűbb</span> : null}
                <div className="plan-number">{plan.key === "presence" ? "01" : plan.key === "business" ? "02" : "03"}</div>
                <h3>{plan.name}</h3>
                <p>{plan.short}</p>
                <div className="plan-scope"><strong>{plan.pages}</strong><span>{plan.buildTime.replace("Jellemzően ", "elkészül ")}</span></div>
                <div className="plan-fit"><span>Válaszd, ha…</span><p>{PLAN_DECISION_RULE[plan.key]}</p></div>
                <div className="plan-price">
                  <strong>{formatHuf(annual ? termEffectiveMonthly(plan.price, billingTerm("annual")) : plan.price)}</strong>
                  <span>/ hó</span>
                </div>
                {annual ? (
                  <p className="plan-annual-note">
                    {formatHuf(termTotal(plan.price, billingTerm("annual")))} egy évre —{" "}
                    <b>{formatHuf(termSaving(plan.price, billingTerm("annual"))?.saved ?? 0)} megtakarítás</b>
                  </p>
                ) : null}
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
                {/* Korábban ez az ügyfélkapuba vitt, ahol fiókot kellett létrehozni:
                    a mérés szerint öten eljutottak idáig, és egyikük sem regisztrált.
                    A regisztráció ott legyen kötelező, ahol van mit védeni (szerződés,
                    fizetés) — nem ott, ahol valaki még csak érdeklődik. */}
                <a className="button primary" href="#projektbrief" onClick={() => preselectPlan(plan.key)}>Ezt választom</a>
              </article>
            ))}
          </div>
          <MobileFold label="Mi a különbség a csomagok között?">
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
          </MobileFold>

          <MobileFold label="Részletes csomagtartalom">
          <section className="plan-detail-panel" id="csomag-reszletek">
            <header><div><span>RÉSZLETES CSOMAGTARTALOM</span><h3>{activePlan.name}</h3><p>{activePlan.idealFor}</p></div><div><strong>{formatHuf(annual ? termEffectiveMonthly(activePlan.price, billingTerm("annual")) : activePlan.price)}<small>/hó</small></strong><span>{annual ? `${formatHuf(termTotal(activePlan.price, billingTerm("annual")))} / év` : activePlan.buildTime}</span></div></header>
            <div>{activePlan.detailGroups.map((group, index) => <article key={group.title}><span>0{index + 1}</span><h4>{group.title}</h4><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></article>)}</div>
            <footer><p><strong>A brief is ehhez igazodik.</strong> Csak {huArticle(activePlan.name)} {activePlan.name} csomagban elérhető oldalakra, funkciókra és induló anyagokra kérdezünk rá.</p><a className="button primary" href="#projektbrief" onClick={() => preselectPlan(activePlan.key)}>{huArticle(activePlan.name) === "az" ? "Az" : "A"} {activePlan.name} csomagot választom</a></footer>
          </section>
          </MobileFold>
          <div className="subscription-footnotes">
            <span>Csak jóváhagyás után fizetsz</span>
            <span>Bármikor lemondható</span>
            <span>Kötelező jogi oldalak díjmentesek</span>
            <span>Díjmentes email továbbítás</span>
            <span>Szüneteltethető</span>
            <small>{PRICE_TAX_NOTE}</small>
          </div>
      </div>

      <MobileFold label="Vételi opció — bármikor megveheted">
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
          <p>
            És minél tovább bérled, annál olcsóbb: <strong>a befizetett havidíjad fele beszámít a vételárba</strong>, egészen addig, amíg a
            vételár a felére nem csökken. Nagyjából egy-másfél év bérlés után tehát feleáron veheted meg — a havidíj addig nem
            elvesztegetett pénz, hanem félig már a tulajdonlásra megy. Nem kell előre eldöntened, melyik utat választod.
          </p>
          <ol>
            <li>Az ügyfélkapun elindítod a megvásárlást</li>
            <li>Átadási összefoglalót kapsz — benne a felhalmozott beszámítással és a fizetendő összeggel</li>
            <li>A vételár beérkezése után átadom a forráskódot és a hozzáféréseket</li>
            <li>A domaint átíratom a saját fiókodra</li>
            <li>Az átadás lezárásától <strong>30 nap díjmentes hibajavítás</strong> jár</li>
          </ol>
          <p className="buyout-note">
            Az átadás lépésenként megy, írásban, útmutatókkal — és végigkísérlek rajta. Jelszót,
            bankkártyaadatot vagy API kulcsot egyik fél sem küld a másiknak. Az utolsó átadási
            lépéstől számított 30 napban az átadáskor vállalt működés igazolt hibáit díjmentesen
            javítom, akkor is, ha az oldal onnantól már teljesen a tiéd.
          </p>
        </div>
        <div className="buyout-prices">
          <span>Vételár csomagonként</span>
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div key={plan.key}>
              <strong>{plan.name}</strong>
              <span className="buyout-price-cell">
                <b>{formatHuf(PURCHASE_OPTION_PRICES[plan.key])}</b>
                <em>{buyoutCreditMonths(plan.key)} hónap bérlés után {formatHuf(buyoutFloorPrice(plan.key))}</em>
              </span>
            </div>
          ))}
          <small>A beszámítás a befizetett havidíjak feléből gyűlik, és a vételár felénél áll meg. Felmondáskor a fel nem használt beszámítás elvész.</small>
          <small>{PRICE_TAX_NOTE}</small>
        </div>
      </section>
      </MobileFold>
    </section>
  );
}

/**
 * Telefonon összecsukható blokk.
 *
 * Miért: a `.model-pricing` telefonon 5838 pixel magas volt — a főoldal
 * egyharmada. Ebből az összehasonlító tábla (1158px), a részletes
 * csomagtartalom (1061px) és a vételi opció (899px) MÁSODLAGOS tartalom:
 * a döntéshez a három csomagkártya elég, a többit az nézi meg, akit érdekel.
 *
 * A nyitva/csukva állapot különbségét CSS dönti el, nem JavaScript: a szerver
 * mindig ugyanazt a jelöléskódot adja (nincs hidratálási eltérés és nincs
 * összecsukódó villanás), asztali nézetben a `.mobile-fold` szabályok meg sem
 * szólalnak, a gomb is rejtve marad. A tartalom VÉGIG a DOM-ban van, tehát a
 * kereső és a képernyőolvasó ugyanúgy látja.
 */
function MobileFold({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const id = useId();

  /* Ha a lap horgonya (`#veteli-opcio`, `#csomag-reszletek`) egy ITT BELÜL lévő
     elemre mutat, a blokk kinyitja magát — különben a link egy összecsukott
     dobozra ugrana, és a látogató nem találná, amit keres. */
  useEffect(() => {
    function openIfTargeted() {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const target = document.getElementById(hash);
      if (target && bodyRef.current?.contains(target)) setOpen(true);
    }
    openIfTargeted();
    window.addEventListener("hashchange", openIfTargeted);
    return () => window.removeEventListener("hashchange", openIfTargeted);
  }, []);

  return (
    <div className={`mobile-fold${open ? " is-open" : ""}`}>
      <button
        aria-controls={id}
        aria-expanded={open}
        className="mobile-fold-toggle"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span>{label}</span>
        {/* Forduló nyíl a korábbi +/− helyett: egyetlen elem, ami elfordul —
            nem két külön jel, ami helyet cserél. */}
        <i aria-hidden="true">
          <svg fill="none" viewBox="0 0 16 16">
            <path d="M3.5 6L8 10.5L12.5 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
          </svg>
        </i>
      </button>
      <div className="mobile-fold-body" id={id} ref={bodyRef}>
        {children}
      </div>
    </div>
  );
}
