"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { DemoBar } from "@/components/demo/DemoBar";
import { useDemoNotice } from "@/components/demo/DemoNotice";
import { PendantCanvas } from "./PendantCanvas";

const PRICE = 235000;
const CHAINS = [40, 45, 50] as const;

/** Ezres tagolás nem törő szóközzel — szerveren és böngészőben ugyanúgy. */
const grouped = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
const forint = (value: number) => `${grouped(value)}\u00a0Ft`;

/**
 * Az alexandrit színe a fényhőmérséklet függvényében (6500 K → 2700 K).
 * A 3D kő a saját fénykövetéséből kapja a színét; ez a skála a feliratnak
 * és a színmintának kell, hogy szóban is kimondjuk, mit lát a látogató.
 */
const STONE_SCALE = [
  { at: 0, color: [31, 122, 92], name: "smaragdzöld" },
  { at: 0.25, color: [38, 108, 112], name: "kékeszöld" },
  { at: 0.5, color: [92, 88, 122], name: "szürkés ibolya" },
  { at: 0.75, color: [110, 52, 134], name: "ametisztlila" },
  { at: 1, color: [146, 44, 112], name: "málnalila" }
] as const;

function stoneAt(mix: number) {
  const upper = STONE_SCALE.findIndex((stop) => stop.at >= mix);
  const b = STONE_SCALE[Math.max(0, upper)];
  const a = STONE_SCALE[Math.max(0, upper - 1)];
  const t = b.at === a.at ? 0 : (mix - a.at) / (b.at - a.at);
  const rgb = a.color.map((channel, index) => Math.round(channel + (b.color[index] - channel) * t));
  const nearest = STONE_SCALE.reduce((best, stop) => (Math.abs(stop.at - mix) < Math.abs(best.at - mix) ? stop : best));
  return { color: `rgb(${rgb.join(",")})`, name: nearest.name };
}

const kelvinToMix = (kelvin: number) => (6500 - kelvin) / 3800;

const LIGHT_PRESETS = [
  { kelvin: 2700, label: "Gyertya" },
  { kelvin: 3300, label: "Lámpa" },
  { kelvin: 4500, label: "Alkony" },
  { kelvin: 6500, label: "Nappal" }
];

const SPECS: [string, string][] = [
  ["Fém", "14 karátos fehérarany, ródiumbevonattal, magyar fémjellel"],
  ["Középső kő", "Alexandrit, kerek briliáns, 4,2 mm (kb. 0,30 ct)"],
  ["Gyémántok", "44 db, összesen 0,14 ct, G szín, VS tisztaság"],
  ["Foglalat", "Táncoló (tengelyen billenő) foglalat, a szíven gyöngyfoglalás"],
  ["Méret", "20 × 20 mm, fülecskével 25 mm"],
  ["Lánc", "Ankerlánc fehéraranyból, 40, 45 vagy 50 cm"],
  ["Súly", "3,2 g lánc nélkül"]
];

const FAQS: [string, string][] = [
  [
    "Valódi gyémántok?",
    "Igen, természetes gyémántok, G színnel és VS tisztasággal. A kövekről szóló tanúsítványt a medál mellé csomagoljuk, a fémjelet a fülecske belső oldalán találod."
  ],
  [
    "Tényleg színt vált a kő?",
    "Igen, ez az alexandrit természete. Napfényben és nappali lámpafényben kékeszöld, izzó- és gyertyafényben vöröses ibolya. Vegyes fényben, például alkonyatkor, a kettő között áll meg."
  ],
  [
    "Mennyire bírja a táncoló foglalat a mindennapokat?",
    "A kő egy fehérarany tengelyen billeg, ami a mindennapi viselést gond nélkül bírja. Zuhanyzás, úszás és edzés előtt azért vedd le: a krém és a klór elhomályosítja a köveket."
  ],
  [
    "Hogyan tisztítsam?",
    "Langyos, kevés mosogatószeres vízben, puha fogkefével, aztán szöszmentes kendővel szárítsd. Évente egyszer hozd be hozzánk: ingyen átnézzük a foglalatot és ultrahanggal megtisztítjuk."
  ],
  [
    "Mi van, ha mégsem tetszik?",
    "30 napon belül kérdés nélkül visszaküldheted, a vételárat visszautaljuk. A visszaküldés is ingyenes, a futárt mi rendeljük."
  ]
];

function Mark({ className }: { className?: string }) {
  // Alkony: a horizonton félig lebukó nap — itt egy csiszolt kő koronája,
  // alatta halványan a tükörképe (a pavilon).
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 40 40">
      <path d="M2.5 23.5h35" stroke="currentColor" strokeLinecap="round" strokeWidth="1.3" />
      <path d="M8 23.5 13 16h14l5 7.5" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.3" />
      <path d="M13 16l4 7.5 3-7.5 3 7.5 4-7.5" stroke="currentColor" strokeLinejoin="round" strokeWidth="0.9" />
      <path d="M10 26.5 20 36l10-9.5" opacity="0.42" stroke="currentColor" strokeLinejoin="round" strokeWidth="0.9" />
    </svg>
  );
}

function Logo() {
  return (
    <span className="ak-logo">
      <Mark className="ak-logo-mark" />
      <span className="ak-logo-word">Alkony</span>
    </span>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.4" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <path
          d={`M${10 + 6 * Math.cos((angle * Math.PI) / 180)} ${10 + 6 * Math.sin((angle * Math.PI) / 180)} L${10 + 8.2 * Math.cos((angle * Math.PI) / 180)} ${10 + 8.2 * Math.sin((angle * Math.PI) / 180)}`}
          key={angle}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.4"
        />
      ))}
    </svg>
  );
}

function CandleIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
      <path d="M10 2.2c1.9 2.2 2.3 3.7 2.3 4.6a2.3 2.3 0 0 1-4.6 0c0-.9.4-2.4 2.3-4.6Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.3" />
      <rect height="8.2" rx="1" stroke="currentColor" strokeWidth="1.3" width="5.6" x="7.2" y="10.3" />
    </svg>
  );
}

export function AlkonySite() {
  const notice = useDemoNotice();
  const [candle, setCandle] = useState(false);
  const [kelvin, setKelvin] = useState(6500);
  const [chain, setChain] = useState<(typeof CHAINS)[number]>(45);
  const [cardOn, setCardOn] = useState(false);
  const [card, setCard] = useState("");
  const [cart, setCart] = useState<{ chain: number; card: string; quantity: number } | null>(null);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [drawer]);

  // a lap fényállása a kőközeli csúszkáját is odaviszi
  const setLight = (next: boolean) => {
    setCandle(next);
    setKelvin(next ? 2700 : 6500);
  };

  const heroStone = stoneAt(candle ? 1 : 0);
  const macroMix = kelvinToMix(kelvin);
  const macroStone = stoneAt(macroMix);
  const count = cart?.quantity ?? 0;

  const addToCart = () => {
    setCart((current) => ({
      card: cardOn ? card.trim() : "",
      chain,
      quantity: current && current.chain === chain ? Math.min(3, current.quantity + 1) : 1
    }));
    setDrawer(true);
  };

  const photo = (
    <Image alt="Esthajnal medál elölről" className="ak-fallback-photo" fetchPriority="high" height={1493} loading="eager" src="/demo/alkony/elolrol.webp" unoptimized width={900} />
  );

  return (
    <div className="ak-root" data-light={candle ? "candle" : "day"} id="top">
      <DemoBar project="Alkony" />

      <header className="ak-nav">
        <a aria-label="Alkony — vissza az oldal tetejére" className="ak-nav-logo" href="#top">
          <Logo />
        </a>
        <nav aria-label="Fő navigáció">
          <a href="#ko">A kő</a>
          <a href="#reszletek">Részletek</a>
          <a href="#rendeles">Rendelés</a>
          <a href="#gyik">Kérdések</a>
        </nav>
        <div className="ak-nav-actions">
          <button
            aria-label={candle ? "Nappali fény" : "Gyertyafény"}
            aria-pressed={candle}
            className="ak-icon-button"
            onClick={() => setLight(!candle)}
            title={candle ? "Nappali fény" : "Gyertyafény"}
            type="button"
          >
            {candle ? <SunIcon /> : <CandleIcon />}
          </button>
          <button className="ak-cart-button" onClick={() => setDrawer(true)} type="button">
            Kosár <span>{count}</span>
          </button>
        </div>
      </header>

      <main>
        {/* ── Nyitókép: mi ez, mennyi, és a medál maga ─────────────────── */}
        <section className="ak-hero" aria-labelledby="ak-title">
          <div className="ak-hero-intro">
            <p className="ak-eyebrow">Alexandrit és gyémánt medál</p>
            <h1 id="ak-title">
              <span className="ak-h1-name">Esthajnal</span>
              <span className="ak-h1-sub">kelta csomó, gyémántszív, színváltó kő</span>
            </h1>
            <p className="ak-lead">
              Hármas csomó és 44 gyémánttal kirakott szív 14 karátos fehéraranyból. Középen egy
              alexandrit billeg a tengelyén: nappali fényben zöld, gyertyafényben lila.
            </p>
          </div>

          <div className="ak-stage">
            <div className="ak-stage-light day" aria-hidden="true" />
            <div className="ak-stage-light candle" aria-hidden="true" />
            <PendantCanvas
              fallback={photo}
              framing="full"
              label="Az Esthajnal medál valós idejű 3D-ben. Húzással körbeforgatható."
              light={candle ? 1 : 0}
            />
            <p className="ak-stage-hint" aria-hidden="true">
              Valós idejű 3D · húzd körbe
            </p>
            <p className="ak-stage-chip" aria-live="polite">
              <i style={{ background: heroStone.color }} />
              <span>A kő most {heroStone.name}</span>
            </p>
            <div className="ak-switch" role="group" aria-label="Megvilágítás">
              <button aria-pressed={!candle} onClick={() => setLight(false)} type="button">
                <SunIcon />
                <span>
                  Nappali fény <small>6500 K</small>
                </span>
              </button>
              <button aria-pressed={candle} onClick={() => setLight(true)} type="button">
                <CandleIcon />
                <span>
                  Gyertyafény <small>2700 K</small>
                </span>
              </button>
            </div>
          </div>

          <div className="ak-hero-buy">
            <p className="ak-price">
              {forint(PRICE)}
              <small>Ingyenes, biztosított szállítás · 30 nap visszaküldés</small>
            </p>
            <div className="ak-actions">
              <button className="ak-button" onClick={addToCart} type="button">
                Kosárba
              </button>
              <button className="ak-button ghost" onClick={() => setLight(!candle)} type="button">
                {candle ? "Vissza a nappali fénybe" : "Nézd meg gyertyafényben"}
              </button>
            </div>
            <ul className="ak-facts">
              <li>
                <b>44</b> gyémánt, 0,14 ct
              </li>
              <li>
                <b>4,2 mm</b> alexandrit
              </li>
              <li>
                <b>14 kt</b> fehérarany
              </li>
            </ul>
          </div>
        </section>

        {/* ── A kő: fényhőmérséklet-csúszka a kőközelihez ─────────────── */}
        <section className="ak-stone" id="ko" aria-labelledby="ak-stone-title">
          <div
            className="ak-macro"
            style={{ "--dusk": 1 - Math.abs(macroMix * 2 - 1), "--mix": macroMix } as React.CSSProperties}
          >
            <div className="ak-macro-light day" aria-hidden="true" />
            <div className="ak-macro-light candle" aria-hidden="true" />
            <div className="ak-macro-light dusk" aria-hidden="true" />
            <PendantCanvas
              fallback={null}
              framing="stone"
              label="Az alexandrit közelről, a választott fényben. Koppintásra megbillen."
              light={macroMix}
            />
            <p className="ak-macro-tap" aria-hidden="true">
              Koppints a kőre
            </p>
          </div>

          <div className="ak-stone-copy">
            <p className="ak-eyebrow">A kő</p>
            <h2 id="ak-stone-title">Nappal zöld. Este lila.</h2>
            <p>
              Az alexandrit a krizoberill ritka, krómot tartalmazó változata. Két színtartományban
              engedi át a fényt, és a fényforrás dönti el, melyik az erősebb: napfényben a
              kékeszöld, izzó- és gyertyafényben a vöröses ibolya. Az 1830-as években találták az
              Urálban, a későbbi II. Sándor cárról kapta a nevét.
            </p>

            <div className="ak-kelvin">
              <div className="ak-kelvin-head">
                <label htmlFor="ak-kelvin">Fényhőmérséklet</label>
                <output htmlFor="ak-kelvin">{`${grouped(kelvin)}\u00a0K`}</output>
              </div>
              <input
                id="ak-kelvin"
                max={6500}
                min={2700}
                onChange={(event) => setKelvin(Number(event.target.value))}
                step={100}
                style={{ "--fill": `${(1 - macroMix) * 100}%` } as React.CSSProperties}
                type="range"
                value={kelvin}
              />
              <div className="ak-kelvin-presets">
                {LIGHT_PRESETS.map((preset) => (
                  <button aria-pressed={kelvin === preset.kelvin} key={preset.kelvin} onClick={() => setKelvin(preset.kelvin)} type="button">
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="ak-kelvin-result" aria-live="polite">
                <i style={{ background: macroStone.color }} />
                <span>
                  Ebben a fényben a kő <b>{macroStone.name}</b>.
                </span>
              </p>
            </div>

            <div className="ak-dance">
              <h3>Táncoló foglalat</h3>
              <p>
                A kő nincs mereven rögzítve: egy vékony tengelyen ül, ezért minden lépésnél megbillen,
                és újra meg újra elkapja a fényt. Viselve sem áll meg, a szikrázása ebből jön.
              </p>
            </div>
          </div>
        </section>

        {/* ── Részletek: a valódi fotók és a pontos adatok ────────────── */}
        <section className="ak-details" id="reszletek" aria-labelledby="ak-details-title">
          <div className="ak-details-head">
            <p className="ak-eyebrow">Részletek</p>
            <h2 id="ak-details-title">Húsz milliméter, közelről.</h2>
          </div>

          <div className="ak-gallery">
            <figure className="ak-photo worn">
              <Image alt="Az Esthajnal medál viselve, 45 cm-es lánccal" fill sizes="(max-width: 900px) 92vw, 46vw" src="/demo/alkony/viselve.webp" />
              <figcaption>Viselve, 45 cm-es lánccal: épp a kulcscsont alatt ül.</figcaption>
            </figure>
            <figure className="ak-photo plain front">
              <Image alt="Az Esthajnal medál elölről" fill sizes="(max-width: 900px) 46vw, 23vw" src="/demo/alkony/elolrol.webp" />
              <figcaption>Elölről: a szív két ívén gyöngyfoglalásban ülnek a gyémántok.</figcaption>
            </figure>
            <figure className="ak-photo plain side">
              <Image alt="Az Esthajnal medál oldalról" fill sizes="(max-width: 900px) 46vw, 23vw" src="/demo/alkony/oldalrol.webp" />
              <figcaption>Oldalról: a kő a tengelyén kissé előrebillen.</figcaption>
            </figure>
          </div>

          <dl className="ak-specs">
            {SPECS.map(([term, value]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ── Rendelés ─────────────────────────────────────────────────── */}
        <section className="ak-order" id="rendeles" aria-labelledby="ak-order-title">
          <div className="ak-order-copy">
            <p className="ak-eyebrow">Rendelés</p>
            <h2 id="ak-order-title">Díszdobozban, holnapra.</h2>
            <p>
              Ha délután kettőig megrendeled, másnap biztosított futár viszi. Budapesten személyesen is
              átveheted a bemutatótermünkben, előre egyeztetett időpontban.
            </p>
            <ul className="ak-promises">
              <li>Ingyenes, biztosított kiszállítás</li>
              <li>30 napos visszaküldés, kérdés nélkül</li>
              <li>Tanúsítvány a kövekről, 2 év garancia</li>
              <li>Évente ingyenes tisztítás és foglalat-ellenőrzés</li>
            </ul>
          </div>

          <div className="ak-order-panel">
            <div className="ak-order-product">
              <span className="ak-order-thumb">
                <Image alt="" fill sizes="88px" src="/demo/alkony/elolrol.webp" />
              </span>
              <div>
                <strong>Esthajnal medál</strong>
                <small>14 kt fehérarany · alexandrit · 44 gyémánt</small>
              </div>
              <b>{forint(PRICE)}</b>
            </div>

            <fieldset className="ak-chain">
              <legend>Lánchossz</legend>
              <div>
                {CHAINS.map((length) => (
                  <label key={length}>
                    <input checked={chain === length} name="chain" onChange={() => setChain(length)} type="radio" value={length} />
                    <span>
                      {length} cm
                      <small>{length === 40 ? "nyakhoz simul" : length === 45 ? "kulcscsont alatt" : "dekoltázsban"}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="ak-card-toggle">
              <input checked={cardOn} onChange={(event) => setCardOn(event.target.checked)} type="checkbox" />
              <span>
                Kézzel írt kártya a dobozba <small>ingyenes</small>
              </span>
            </label>
            {cardOn && (
              <div className="ak-card-field">
                <textarea
                  aria-label="A kártya szövege"
                  maxLength={120}
                  onChange={(event) => setCard(event.target.value)}
                  placeholder="Pl. Boldog évfordulót! Minden estére."
                  rows={3}
                  value={card}
                />
                <small>{card.length}/120</small>
              </div>
            )}

            <button className="ak-button wide" onClick={addToCart} type="button">
              Kosárba · {forint(PRICE)}
            </button>
          </div>
        </section>

        {/* ── Kérdések ─────────────────────────────────────────────────── */}
        <section className="ak-faq" id="gyik" aria-labelledby="ak-faq-title">
          <div>
            <p className="ak-eyebrow">Kérdések</p>
            <h2 id="ak-faq-title">Mielőtt döntesz.</h2>
          </div>
          <div className="ak-faq-list">
            {FAQS.map(([question, answer], index) => (
              <details key={question} open={index === 0}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="ak-footer">
        <div className="ak-footer-brand">
          <Logo />
          <p>Ékszerház · Budapest. Bemutatóterem előzetes egyeztetéssel.</p>
        </div>
        <div className="ak-footer-links">
          <a href="#ko">Az alexandritról</a>
          <a href="#reszletek">Méret és anyag</a>
          <a href="#rendeles">Szállítás és visszaküldés</a>
          <a href="#gyik">Gondozás</a>
        </div>
        <small>© 2026 Alkony — kitalált márka, a ProjectEdge mintaprojektje.</small>
      </footer>

      <div className={`ak-drawer-backdrop${drawer ? " is-open" : ""}`} onClick={() => setDrawer(false)} aria-hidden="true" />
      <aside aria-hidden={!drawer} aria-label="Kosár" className={`ak-drawer${drawer ? " is-open" : ""}`} inert={!drawer}>
        <div className="ak-drawer-head">
          <h2>Kosár</h2>
          <button aria-label="Kosár bezárása" className="ak-icon-button" onClick={() => setDrawer(false)} type="button">
            <svg aria-hidden="true" fill="none" viewBox="0 0 20 20">
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
        {cart ? (
          <>
            <div className="ak-drawer-item">
              <span className="ak-order-thumb">
                <Image alt="" fill sizes="88px" src="/demo/alkony/elolrol.webp" />
              </span>
              <div>
                <strong>Esthajnal medál</strong>
                <small>
                  {cart.chain} cm-es lánc{cart.card ? ` · kártya: „${cart.card}”` : ""}
                </small>
                <div className="ak-quantity">
                  <button aria-label="Eggyel kevesebb" onClick={() => setCart(cart.quantity > 1 ? { ...cart, quantity: cart.quantity - 1 } : null)} type="button">
                    −
                  </button>
                  <span>{cart.quantity}</span>
                  <button aria-label="Eggyel több" disabled={cart.quantity >= 3} onClick={() => setCart({ ...cart, quantity: cart.quantity + 1 })} type="button">
                    +
                  </button>
                </div>
              </div>
              <b>{forint(PRICE * cart.quantity)}</b>
            </div>
            <dl className="ak-drawer-sum">
              <div>
                <dt>Szállítás</dt>
                <dd>ingyenes</dd>
              </div>
              <div>
                <dt>Összesen</dt>
                <dd>{forint(PRICE * cart.quantity)}</dd>
              </div>
            </dl>
            <button
              className="ak-button wide"
              onClick={() =>
                notice("A mintaprojektben a pénztár nincs élesítve. Egy valódi boltban itt fizetne a vásárló bankkártyával, Apple Pay-jel vagy átutalással.")
              }
              type="button"
            >
              Tovább a pénztárhoz
            </button>
            <button className="ak-text-button" onClick={() => setDrawer(false)} type="button">
              Folytatom a nézelődést
            </button>
          </>
        ) : (
          <p className="ak-drawer-empty">A kosarad üres. Az Esthajnal medál egy kattintásra van.</p>
        )}
      </aside>
    </div>
  );
}
