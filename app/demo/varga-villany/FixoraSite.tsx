"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DemoBar } from "@/components/demo/DemoBar";
import { useDemoNotice } from "@/components/demo/DemoNotice";
import { BeforeAfter } from "./BeforeAfter";
import { CurrentRail } from "./CurrentRail";

/**
 * Varga Villanyszerelés — mintaprojekt.
 *
 * Vizuális irány: „retro szaki". Meleg krém alap, egyetlen mély narancsvörös
 * akcens, kövér display betű, futó szalagok a szekciók között és körbélyegzők.
 * A korábbi verzió szűkszavú fekete-lime lap volt, ami ugyanazt a ritmust
 * követte, mint a másik négy mintaprojekt; ez szándékosan más karakter.
 */

/* ── apró építőelemek ─────────────────────────────────────────────────────── */

function Marquee({ items, tone = "red" }: { items: string[]; tone?: "red" | "ink" }) {
  /* A listát kétszer írjuk ki: a második példány adja a végtelen futás
     illúzióját, amikor az első kicsúszik balra. */
  const line = (
    <span className="fxr-marquee-line">
      {items.map((item) => (
        <span key={item}>
          {item}
          <b aria-hidden="true">✦</b>
        </span>
      ))}
    </span>
  );

  return (
    <div aria-hidden="true" className={`fxr-marquee ${tone}`}>
      {line}
      {line}
    </div>
  );
}

function Stamp({ label, sub }: { label: string; sub: string }) {
  return (
    <span className="fxr-stamp">
      <svg viewBox="0 0 100 100">
        <defs>
          <path d="M50 50 m -37 0 a 37 37 0 1 1 74 0 a 37 37 0 1 1 -74 0" id="stamp-ring" />
        </defs>
        <text>
          <textPath href="#stamp-ring" startOffset="0%">
            {`${label} · ${label} · `}
          </textPath>
        </text>
      </svg>
      <b>{sub}</b>
    </span>
  );
}

/* Kézzel rajzolt ikonkészlet: azonos 96-as rácson, azonos vonalvastagsággal.
   Korábban unicode karakterek (⌁ ↯ ◉) álltak itt, amelyek betűtípusonként
   máshogy jelentek meg, és eltérő magasságuk elcsúsztatta a három oszlopot. */
const ICONS: Record<string, ReactNode> = {
  hiba: (
    <>
      <path d="M52 8 30 52h18l-6 36 28-46H52l6-34Z" />
      <circle cx="20" cy="76" r="7" />
      <path d="M8 88h84" />
    </>
  ),
  felujitas: (
    <>
      <rect height="52" rx="4" width="72" x="12" y="24" />
      <path d="M28 24V12M48 24V12M68 24V12" />
      <path d="M24 44h48M24 58h32" />
    </>
  ),
  okos: (
    <>
      <rect height="60" rx="8" width="44" x="28" y="18" />
      <path d="M40 34h20M40 48h20" />
      <circle cx="50" cy="64" r="5" />
      <path d="M14 30c-6 12-6 26 0 38M86 30c6 12 6 26 0 38" />
    </>
  )
};

/* Keresztbe tett csavarhúzópár dísznek. Fotókivágás helyett rajz: a nyers
   fényképnek fényudvara volt, amit nem lehetett tisztán leválasztani, és a
   retro nyelvbe amúgy is jobban illik az illusztráció. */
function Screwdriver({ cx, tone }: { cx: number; tone: "red" | "mustard" }) {
  return (
    <g>
      <rect className={`fill-${tone}`} height="82" rx="17" width="38" x={cx - 19} y="14" />
      <path className="line" d={`M${cx - 15} 40h30M${cx - 15} 58h30M${cx - 15} 76h30`} />
      <rect className="fill-paper" height="14" rx="3" width="26" x={cx - 13} y="94" />
      <rect className="fill-paper" height="52" width="16" x={cx - 8} y="106" />
      <path className="fill-ink" d={`M${cx - 11} 158h22v12l-11 16-11-16z`} />
    </g>
  );
}

/* A viewBox szélesebb, mint a rajz: az elforgatott csavarhúzók így nem
   vágódnak le a széleken. */
function ToolsMark() {
  return (
    <svg aria-hidden="true" className="fxr-tools" viewBox="0 0 240 210">
      <g transform="rotate(-26 88 105)">
        <Screwdriver cx={88} tone="mustard" />
      </g>
      <g transform="rotate(25 152 105)">
        <Screwdriver cx={152} tone="red" />
      </g>
    </svg>
  );
}

const SERVICES = [
  {
    icon: "hiba",
    title: "Hibafeltárás",
    copy: "Zárlat, leverő biztosíték vagy ismeretlen hiba — műszeres beméréssel, nem találgatással.",
    price: "28 000 Ft-tól"
  },
  {
    icon: "felujitas",
    title: "Hálózatfelújítás",
    copy: "Teljes vagy részleges hálózatcsere, fotózott munkanaplóval és dokumentált átadással.",
    price: "180 000 Ft-tól"
  },
  {
    icon: "okos",
    title: "Okosotthon",
    copy: "Világítás, árnyékolás és energiafigyelés egy rendszerben, amit tényleg kezelni is tudsz.",
    price: "95 000 Ft-tól"
  }
];

const REVIEWS = [
  {
    text: "Kedden írtam, szerdán már itt volt. Megmutatta, mi a baj, megmondta mennyi lesz, és annyi lett.",
    name: "Kovács Anita",
    where: "II. kerület"
  },
  {
    text: "A régi táblát húsz éve senki nem merte megnézni. Zsolt egy nap alatt kicserélte, és feliratozta is.",
    name: "Tóth Gergely",
    where: "XI. kerület"
  },
  {
    text: "Ami tetszett: minden este lefotózta, hol tart. Nem kellett kérdezgetnem.",
    name: "Nagy Réka",
    where: "XIII. kerület"
  }
];

const PRICES: Record<string, number> = { hiba: 28000, felujitas: 180000, okos: 95000 };

/* ── az oldal ─────────────────────────────────────────────────────────────── */

export function FixoraSite({ fontClass = "" }: { fontClass?: string }) {
  const notice = useDemoNotice();
  const [service, setService] = useState("hiba");
  const [size, setSize] = useState(50);
  const [postcode, setPostcode] = useState("");
  const [areaStatus, setAreaStatus] = useState<"idle" | "inside" | "outside">("idle");

  const estimate = useMemo(
    () => PRICES[service] + Math.max(size - 30, 0) * (service === "felujitas" ? 3200 : 850),
    [service, size]
  );

  const send = () =>
    notice("A kalkulátor működik, de ez egy mintaprojekt: az ajánlatkérés nem kerül elküldésre.");
  const checkArea = () => setAreaStatus(/^1\d{3}$/.test(postcode.trim()) ? "inside" : "outside");

  return (
    <div className={`fxr-root ${fontClass}`} id="top">
      <DemoBar project="Varga Villanyszerelés" />
      <CurrentRail />

      <Marquee
        items={["Varga Villany", "1998 óta", "Budapest és 30 km-es körzete", "Villanyszerelés"]}
      />

      <header className="fxr-nav">
        <a className="fxr-brand" href="#top">
          <span aria-hidden="true">V</span>
          Varga Villany
        </a>
        <nav aria-label="Varga Villanyszerelés navigáció">
          <a href="#szolgaltatasok">Szolgáltatások</a>
          <a href="#munka">Munkáink</a>
          <a href="#szaki">Ki jön ki</a>
          <a href="#ajanlat">Árbecslő</a>
        </nav>
        <a className="fxr-call" href="tel:+3615550182">
          +36 1 555 0182
        </a>
      </header>

      <main>
        {/* ── hero ─────────────────────────────────────────────────────── */}
        <section className="fxr-hero">
          <div className="fxr-hero-copy">
            <p className="fxr-kicker">Budapest és 30 km-es körzete</p>
            <h1>
              Áram legyen.
              <em>Meglepetés ne.</em>
            </h1>
            <p className="fxr-lede">
              Precíz villanyszerelés előre tisztázott költséggel. Fotózd le a problémát, kérj
              becslést, és két órán belül visszahívunk.
            </p>
            <div className="fxr-actions">
              <a className="fxr-btn" href="#ajanlat">
                Gyors árbecslés
                <b aria-hidden="true">→</b>
              </a>
              <a className="fxr-link" href="#munka">
                Megnézem a munkákat
              </a>
            </div>
          </div>

          <div className="fxr-hero-media">
            <div className="fxr-photo tilt-a">
              <Image
                alt="Villanyszerelő okoskapcsolót szerel egy nappaliban"
                fill
                priority
                sizes="(max-width: 1000px) 100vw, 620px"
                src="/demo/varga-villany/hero.webp"
              />
            </div>
            <Stamp label="4,9 ★ 126 értékelés" sub="4,9" />
            <ToolsMark />
          </div>
        </section>

        <Marquee
          items={[
            "2 órán belül visszahívunk",
            "Fix munkadíj egyeztetés után",
            "2 év garancia",
            "Fotós munkanapló",
            "Tiszta átadás"
          ]}
        />

        {/* ── szolgáltatások ───────────────────────────────────────────── */}
        <section className="fxr-services" id="szolgaltatasok">
          <div className="fxr-head">
            <p className="fxr-kicker">Amiben segítünk</p>
            <h2>
              Nem csak megjavítjuk.
              <br />
              Rendbe is tesszük.
            </h2>
          </div>

          <div className="fxr-service-grid">
            {SERVICES.map((item, index) => (
              <article className="fxr-service" key={item.title}>
                <span className="fxr-service-num">{`0${index + 1}`}</span>
                <span aria-hidden="true" className="fxr-icon">
                  <svg viewBox="0 0 100 100">{ICONS[item.icon]}</svg>
                </span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <footer>
                  <span>{item.price}</span>
                  <a href="#ajanlat">Árat számolok →</a>
                </footer>
              </article>
            ))}
          </div>
        </section>

        {/* ── munkáink ─────────────────────────────────────────────────── */}
        <section className="fxr-work" id="munka">
          <div className="fxr-head center">
            <p className="fxr-kicker light">Esettanulmány / II. kerület</p>
            <h2>
              Egy 1987-es lakás,
              <br />
              újragondolva.
            </h2>
          </div>

          <BeforeAfter
            afterAlt="Az új, DIN-sínes kapcsolószekrény rendezett vezetékezéssel"
            afterSrc="/demo/varga-villany/after-panel.webp"
            beforeAlt="A régi, elhanyagolt kapcsolószekrény porcelán biztosítékokkal"
            beforeSrc="/demo/varga-villany/before-panel.webp"
          />

          <p className="fxr-work-note">
            68 m² teljes hálózatcseréje, okos világítás-előkészítéssel. A lakás végig lakható
            maradt, a munka öt ütemben készült el.
          </p>

          <ul className="fxr-work-facts">
            <li>
              <strong>68 m²</strong>
              <span>alapterület</span>
            </li>
            <li>
              <strong>9 nap</strong>
              <span>a felméréstől az átadásig</span>
            </li>
            <li>
              <strong>42</strong>
              <span>új áramkör és aljzat</span>
            </li>
            <li>
              <strong>0 Ft</strong>
              <span>utólag felmerült költség</span>
            </li>
          </ul>
        </section>

        {/* ── ki jön ki ────────────────────────────────────────────────── */}
        <section className="fxr-person" id="szaki">
          <div className="fxr-photo tilt-b">
            <Image
              alt="Varga Zsolt villanyszerelő"
              fill
              sizes="(max-width: 1000px) 92vw, 520px"
              src="/demo/varga-villany/portre.webp"
            />
          </div>
          <div className="fxr-person-copy">
            <p className="fxr-kicker">Ki jön ki hozzád</p>
            <h2>Varga Zsolt</h2>
            <p>
              Huszonkét éve csinálom, tizennégy éve a saját nevemben. Nincs alvállalkozó és nincs
              csapat, aki felméri, az szereli is — így nincs kinek áttolni a felelősséget.
            </p>
            <p>
              Amit nem vállalok el, arra megmondom, hogy miért, és szólok, ki csinálja jobban.
            </p>
            <dl className="fxr-person-facts">
              <div>
                <dt>22 év</dt>
                <dd>a szakmában</dd>
              </div>
              <div>
                <dt>Regisztrált</dt>
                <dd>villanyszerelő</dd>
              </div>
              <div>
                <dt>Biztosított</dt>
                <dd>felelősségbiztosítással</dd>
              </div>
            </dl>
          </div>
        </section>

        <Marquee items={["Árbecslés 60 másodperc alatt", "Ingyenes és nem kötelez semmire"]} tone="ink" />

        {/* ── árbecslő ─────────────────────────────────────────────────── */}
        <section className="fxr-estimator" id="ajanlat">
          <div className="fxr-est-copy">
            <p className="fxr-kicker">60 másodperces becslés</p>
            <h2>Mivel kapcsolatban keresel?</h2>
            <p>
              Ez egy tájékoztató ársáv. A végleges ajánlatot fotók vagy helyszíni felmérés után
              rögzítjük — és onnantól az az ár marad.
            </p>
          </div>

          <div className="fxr-form">
            <div className="fxr-options">
              {[
                ["hiba", "Hibafeltárás"],
                ["felujitas", "Hálózatfelújítás"],
                ["okos", "Okosotthon"]
              ].map(([value, label]) => (
                <button
                  className={service === value ? "active" : ""}
                  key={value}
                  onClick={() => setService(value)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="fxr-slider">
              <span>Ingatlan mérete</span>
              <strong>{size} m²</strong>
              <input
                max="180"
                min="30"
                onChange={(event) => setSize(Number(event.target.value))}
                type="range"
                value={size}
              />
            </label>

            <div className="fxr-area-check">
              <div>
                <span>Kiszállási terület</span>
                <strong>Add meg az irányítószámot</strong>
              </div>
              <div className="fxr-area-input">
                <input
                  aria-label="Irányítószám"
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(event) => {
                    setPostcode(event.target.value);
                    setAreaStatus("idle");
                  }}
                  placeholder="pl. 1024"
                  value={postcode}
                />
                <button onClick={checkArea} type="button">
                  Ellenőrzés
                </button>
              </div>
              {areaStatus !== "idle" && (
                <p className={areaStatus}>
                  {areaStatus === "inside"
                    ? "✓ A címed a kiszállási területünkön belül van."
                    : "Ez a körzet egyedi egyeztetést igényel — kérj visszahívást."}
                </p>
              )}
            </div>

            <div className="fxr-result">
              <span>Várható induló költség</span>
              <strong>{estimate.toLocaleString("hu-HU")} Ft-tól</strong>
              <small>Kiszállással és alapanyaggal becsülve</small>
            </div>

            <button className="fxr-submit" onClick={send} type="button">
              Kérek pontos ajánlatot
              <b aria-hidden="true">→</b>
            </button>
          </div>
        </section>

        {/* ── vélemények ───────────────────────────────────────────────── */}
        <section className="fxr-reviews">
          <div className="fxr-head center">
            <p className="fxr-kicker">Amit mondanak</p>
            <h2>126 értékelés, 4,9 átlag.</h2>
          </div>
          <div className="fxr-review-grid">
            {REVIEWS.map((review) => (
              <blockquote key={review.name}>
                <p>{review.text}</p>
                <cite>
                  <strong>{review.name}</strong>
                  <span>{review.where}</span>
                </cite>
              </blockquote>
            ))}
          </div>
        </section>
      </main>

      <footer className="fxr-footer">
        <div className="fxr-footer-top">
          <a className="fxr-call big" href="tel:+3615550182">
            +36 1 555 0182
          </a>
          <p>Villanyszerelés · Budapest és 30 km-es körzete · H–P 7:00–18:00</p>
        </div>
        <p aria-hidden="true" className="fxr-wordmark">
          Varga Villany
        </p>
        <small>Mintaprojekt · ProjectEdge</small>
      </footer>
    </div>
  );
}
