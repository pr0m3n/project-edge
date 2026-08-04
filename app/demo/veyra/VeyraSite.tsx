"use client";

import { useEffect, useRef, useState } from "react";
import { DemoBar } from "@/components/demo/DemoBar";

/* ── tartalom ─────────────────────────────────────────────────────────── */

const features = [
  {
    span: "wide",
    icon: "calendar",
    title: "Foglalási naptár, ami sosem duplázza le magát",
    copy: "Online időpontfoglalás a saját oldaladról, valós idejű szabad idősávokkal. Ha valaki lefoglal egy időpontot, az a többi csatornán azonnal eltűnik.",
    chips: ["Google Naptár szinkron", "Puffer idő", "Csoportos alkalmak"]
  },
  {
    span: "tall",
    icon: "bell",
    title: "Automatikus emlékeztetők",
    copy: "SMS és email 24 órával az időpont előtt. A meg nem jelenések a töredékére esnek vissza, neked pedig egy telefonhívásod sincs vele.",
    chips: ["SMS", "Email", "Saját szöveg"]
  },
  {
    span: "",
    icon: "card",
    title: "Előleg és online fizetés",
    copy: "Kérj foglaláskor előleget bankkártyával — a no-show ezzel gyakorlatilag megszűnik.",
    chips: []
  },
  {
    span: "one",
    icon: "users",
    title: "Ügyfélkartonok",
    copy: "Előzmények, jegyzetek, kedvenc szolgáltatás. Minden ott van, mielőtt beköszön az ajtón.",
    chips: []
  },
  {
    span: "full",
    icon: "chart",
    title: "Bevétel és kihasználtság egy képernyőn",
    copy: "Látod, melyik szolgáltatás hoz igazán pénzt, melyik napszak áll üresen, és mennyit ér egy visszatérő vendég. Nem érzésre döntesz, hanem számokból.",
    chips: ["Napi bontás", "Szolgáltatásonként", "Export"]
  }
];

const steps = [
  {
    n: "01",
    title: "Beállítod a szolgáltatásaid",
    copy: "Név, időtartam, ár, ki végzi. Tizenöt perc, és kész a kínálat — sablonból is indulhatsz."
  },
  {
    n: "02",
    title: "Kiteszed a foglalási linket",
    copy: "Weboldalra, Instagram bióba, Google profilra. Aki rákattint, két kattintással foglal."
  },
  {
    n: "03",
    title: "Te már csak dolgozol",
    copy: "A naptár megtelik, az emlékeztetők mennek, a bevétel gyűlik a kimutatásban."
  }
];

const tabs = [
  {
    id: "naptar",
    label: "Naptár",
    title: "A heted egy képernyőn",
    copy: "Húzd-ejtsd az időpontokat, láss minden kollégát egymás mellett, és szúrd ki egy pillantással az üresen álló sávokat."
  },
  {
    id: "ugyfelek",
    label: "Ügyfelek",
    title: "Mindenkiről tudsz mindent",
    copy: "Ki mikor járt nálad, mennyit költött, mit szeret. A visszatérő vendég a legolcsóbb marketing."
  },
  {
    id: "bevetel",
    label: "Bevétel",
    title: "Számok, nem érzések",
    copy: "Napi, heti, havi bontás szolgáltatásonként. Egy kattintással exportálod a könyvelőnek."
  }
];

const plans = [
  {
    name: "Indulás",
    monthly: 0,
    yearly: 0,
    tagline: "Egyedül dolgozol, most kezded",
    features: ["1 munkatárs", "Havi 40 foglalás", "Online foglalási oldal", "Email emlékeztető"],
    cta: "Ingyen kipróbálom",
    featured: false
  },
  {
    name: "Műhely",
    monthly: 9900,
    yearly: 7900,
    tagline: "Kis csapat, tele naptár",
    features: [
      "5 munkatárs",
      "Korlátlan foglalás",
      "SMS emlékeztető",
      "Előleg és online fizetés",
      "Ügyfélkartonok",
      "Bevételi kimutatás"
    ],
    cta: "14 nap próba",
    featured: true
  },
  {
    name: "Stúdió",
    monthly: 19900,
    yearly: 15900,
    tagline: "Több telephely, több csapat",
    features: [
      "Korlátlan munkatárs",
      "Több telephely",
      "Csapat jogosultságok",
      "API hozzáférés",
      "Dedikált support"
    ],
    cta: "Beszéljünk",
    featured: false
  }
];

const faqs = [
  {
    q: "Mennyi idő alatt állok át?",
    a: "A legtöbben egy délután alatt végeznek. A szolgáltatásaidat sablonból is behúzhatod, a meglévő ügyféllistát pedig táblázatból importáljuk."
  },
  {
    q: "Mi történik a régi foglalásaimmal?",
    a: "Semmi nem vész el. A jövőbeli időpontokat importáljuk, a naptárszinkron pedig két irányban működik, így az átállás hetében sem tudsz duplán foglalni."
  },
  {
    q: "Kell hozzá saját weboldal?",
    a: "Nem. Kapsz egy foglalási oldalt saját címen, amit kirakhatsz az Instagram bióba vagy a Google profilodra. Ha van oldalad, egy sor kóddal beépül."
  },
  {
    q: "Mi van, ha mégsem válik be?",
    a: "Bármikor lemondható, kötelező hűségidő nincs. Az adataidat pedig egy kattintással exportálod, nem tartjuk túszként."
  }
];

/* ── ikonok ───────────────────────────────────────────────────────────── */

function Icon({ name }: { name: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.6,
    viewBox: "0 0 24 24"
  };

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect height="16" rx="3" width="18" x="3" y="5" />
        <path d="M3 10h18M8 3v4M16 3v4" />
        <path d="M8 14h3v3H8z" fill="currentColor" stroke="none" opacity="0.7" />
      </svg>
    );
  }
  if (name === "bell") {
    return (
      <svg {...common}>
        <path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
        <path d="M10.3 20a2 2 0 0 0 3.4 0" />
      </svg>
    );
  }
  if (name === "card") {
    return (
      <svg {...common}>
        <rect height="14" rx="3" width="20" x="2" y="5" />
        <path d="M2 10h20M6 15h4" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" />
        <circle cx="9" cy="7" r="3.4" />
        <path d="M17 4.2a3.4 3.4 0 0 1 0 6.6M22 20v-1.5a4 4 0 0 0-3-3.8" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3 20h18" />
      <path d="M6 20v-6M11 20V8M16 20v-9M21 20V5" />
    </svg>
  );
}

/* ── segéd: görgetésre megjelenő blokkok ──────────────────────────────── */

function useReveal() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = root.current;
    if (!host) return;

    const targets = Array.from(host.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return root;
}

/* ── termékképernyők (CSS/SVG mockupok) ───────────────────────────────── */

const dayNames = ["H", "K", "Sze", "Cs", "P", "Szo"];

function CalendarScreen() {
  const slots = [
    { day: 0, top: 6, h: 20, tone: "a", label: "Hajvágás", who: "Nagy P." },
    { day: 1, top: 30, h: 26, tone: "b", label: "Festés", who: "Tóth R." },
    { day: 2, top: 12, h: 16, tone: "c", label: "Szakáll", who: "Kiss B." },
    { day: 3, top: 44, h: 22, tone: "a", label: "Hajvágás", who: "Fehér M." },
    { day: 4, top: 20, h: 30, tone: "b", label: "Melír", who: "Szabó L." },
    { day: 5, top: 58, h: 18, tone: "c", label: "Konzultáció", who: "Erdei Zs." }
  ];

  return (
    <div className="vy-screen vy-cal">
      <div className="vy-cal-head">
        {dayNames.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="vy-cal-body">
        {dayNames.map((d, i) => (
          <div className="vy-cal-col" key={d}>
            {slots
              .filter((s) => s.day === i)
              .map((s) => (
                <div
                  className={`vy-slot tone-${s.tone}`}
                  key={s.label}
                  style={{ height: `${s.h}%`, top: `${s.top}%` }}
                >
                  <strong>{s.label}</strong>
                  <span>{s.who}</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientsScreen() {
  const rows = [
    { name: "Tóth Réka", meta: "12 alkalom · utoljára 3 hete", value: "184 000 Ft", tone: "a" },
    { name: "Nagy Péter", meta: "7 alkalom · utoljára 1 hete", value: "63 000 Ft", tone: "b" },
    { name: "Szabó Lilla", meta: "24 alkalom · utoljára 4 napja", value: "412 000 Ft", tone: "c" },
    { name: "Kiss Bence", meta: "3 alkalom · utoljára 2 hónapja", value: "27 000 Ft", tone: "a" }
  ];

  return (
    <div className="vy-screen vy-clients">
      {rows.map((r) => (
        <div className="vy-client-row" key={r.name}>
          <span className={`vy-avatar tone-${r.tone}`}>
            {r.name
              .split(" ")
              .map((p) => p[0])
              .join("")}
          </span>
          <div className="vy-client-meta">
            <strong>{r.name}</strong>
            <span>{r.meta}</span>
          </div>
          <span className="vy-client-value">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

function RevenueScreen() {
  const bars = [42, 58, 51, 74, 66, 88, 96];
  const labels = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

  return (
    <div className="vy-screen vy-revenue">
      <div className="vy-rev-head">
        <div>
          <span>Heti bevétel</span>
          <strong>1 284 000 Ft</strong>
        </div>
        <span className="vy-rev-delta">+18,4%</span>
      </div>
      <div className="vy-rev-chart">
        {bars.map((b, i) => (
          <div className="vy-rev-bar-wrap" key={labels[i]}>
            <div className="vy-rev-bar" style={{ height: `${b}%` }} />
            <span>{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── számláló ─────────────────────────────────────────────────────────── */

function Counter({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }

    let frame = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          // a rAF időbélyege lehet korábbi a mérés kezdeténél — a nullára
          // vágás nélkül negatív értéket villantana a számláló
          const p = Math.min(1, Math.max(0, (now - start) / 1400));
          const eased = 1 - Math.pow(1 - p, 3);
          setValue(to * eased);
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [to]);

  const shown =
    decimals > 0
      ? value.toFixed(decimals).replace(".", ",")
      : Math.round(value).toLocaleString("hu-HU");

  return (
    <span ref={ref}>
      {shown}
      {suffix}
    </span>
  );
}

/* ── oldal ────────────────────────────────────────────────────────────── */

export function VeyraSite() {
  const root = useReveal();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState(tabs[0].id);
  const [yearly, setYearly] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const activeTab = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <div className="vy-root" ref={root}>
      <DemoBar project="Veyra" />

      <header className={`vy-nav ${scrolled ? "is-stuck" : ""}`}>
        <div className="vy-nav-inner">
          <a className="vy-logo" href="#top">
            <span className="vy-logo-mark" aria-hidden="true" />
            Veyra
          </a>
          <nav className={`vy-nav-links ${menuOpen ? "is-open" : ""}`}>
            <a href="#funkciok" onClick={() => setMenuOpen(false)}>
              Funkciók
            </a>
            <a href="#hogyan" onClick={() => setMenuOpen(false)}>
              Hogyan működik
            </a>
            <a href="#arak" onClick={() => setMenuOpen(false)}>
              Árak
            </a>
            <a href="#gyik" onClick={() => setMenuOpen(false)}>
              GYIK
            </a>
          </nav>
          <div className="vy-nav-cta">
            <a className="vy-ghost" href="#arak">
              Belépés
            </a>
            <a className="vy-btn" href="#arak">
              Ingyen kipróbálom
            </a>
            <button
              aria-label="Menü"
              className="vy-burger"
              onClick={() => setMenuOpen((v) => !v)}
              type="button"
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ── hero ── */}
        <section className="vy-hero">
          <div className="vy-orb one" aria-hidden="true" />
          <div className="vy-orb two" aria-hidden="true" />
          <div className="vy-grid-bg" aria-hidden="true" />

          <div className="vy-hero-inner">
            <div className="vy-hero-copy" data-reveal>
              <span className="vy-pill">
                <span className="vy-dot" />
                Új: előleg bekérés foglaláskor
              </span>
              <h1>
                A naptárad tele.
                <br />
                A fejed <em>üres.</em>
              </h1>
              <p>
                A Veyra elintézi a foglalást, az emlékeztetőt és a fizetést, hogy te azzal
                foglalkozz, amihez értesz. Szolgáltató vállalkozásoknak, akik unják a
                telefonálgatást.
              </p>
              <div className="vy-hero-actions">
                <a className="vy-btn lg" href="#arak">
                  14 napig ingyen
                </a>
                <a className="vy-ghost lg" href="#hogyan">
                  <span className="vy-play" aria-hidden="true" />
                  Hogyan működik
                </a>
              </div>
              <ul className="vy-hero-trust">
                <li>Bankkártya nélkül</li>
                <li>15 perc alatt kész</li>
                <li>Bármikor lemondható</li>
              </ul>
            </div>

            <div className="vy-hero-art" data-reveal>
              <div className="vy-window">
                <div className="vy-window-bar">
                  <span className="vy-wdot" />
                  <span className="vy-wdot" />
                  <span className="vy-wdot" />
                  <span className="vy-window-title">Veyra · Naptár</span>
                </div>
                <CalendarScreen />
              </div>

              <div className="vy-float one">
                <span className="vy-float-icon">
                  <Icon name="bell" />
                </span>
                <div>
                  <strong>Új foglalás</strong>
                  <span>Kovács Anna · ma 14:30</span>
                </div>
              </div>

              <div className="vy-float two">
                <span className="vy-float-icon alt">
                  <Icon name="chart" />
                </span>
                <div>
                  <strong>+32% bevétel</strong>
                  <span>az elmúlt negyedévben</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── számok ── */}
        <section className="vy-stats" data-reveal>
          <div className="vy-stat">
            <strong>
              <Counter to={2400} suffix="+" />
            </strong>
            <span>szolgáltató használja</span>
          </div>
          <div className="vy-stat">
            <strong>
              <Counter to={71} suffix="%" />
            </strong>
            <span>kevesebb meg nem jelenés</span>
          </div>
          <div className="vy-stat">
            <strong>
              <Counter decimals={1} to={6.5} suffix=" óra" />
            </strong>
            <span>megspórolt adminisztráció / hét</span>
          </div>
          <div className="vy-stat">
            <strong>
              <Counter decimals={1} to={4.9} />
            </strong>
            <span>átlagos értékelés</span>
          </div>
        </section>

        {/* ── probléma ── */}
        <section className="vy-problem" data-reveal>
          <div className="vy-section-head">
            <span className="vy-eyebrow">A valóság</span>
            <h2>
              Nem a munka fáraszt ki. Hanem a <em>körülötte lévő zaj.</em>
            </h2>
          </div>
          <div className="vy-problem-grid">
            <div className="vy-problem-card bad">
              <span className="vy-problem-tag">Enélkül</span>
              <ul>
                <li>Foglalás öt csatornán: telefon, Messenger, DM, email, papír</li>
                <li>Este 10-kor válaszolgatsz, hogy mikor érsz rá</li>
                <li>Aki nem jön el, az kiesett bevétel</li>
                <li>Fogalmad sincs, melyik szolgáltatás hoz igazán pénzt</li>
              </ul>
            </div>
            <div className="vy-problem-card good">
              <span className="vy-problem-tag">Veyrával</span>
              <ul>
                <li>Egy link, ahol az ügyfél magától foglal — éjjel is</li>
                <li>Az emlékeztetőt a rendszer küldi, nem te</li>
                <li>Előleg foglaláskor, így tényleg megjelennek</li>
                <li>Egy képernyő, amin látod, mi működik</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── funkciók ── */}
        <section className="vy-features" id="funkciok">
          <div className="vy-section-head" data-reveal>
            <span className="vy-eyebrow">Funkciók</span>
            <h2>
              Minden, amit egy tele naptár <em>megkövetel.</em>
            </h2>
            <p>
              Nem funkciólista a funkciólista kedvéért — pontosan az, ami egy szolgáltató
              vállalkozás napi működéséhez kell.
            </p>
          </div>

          <div className="vy-bento">
            {features.map((f) => (
              <article className={`vy-card ${f.span}`} data-reveal key={f.title}>
                <span className="vy-card-icon">
                  <Icon name={f.icon} />
                </span>
                <h3>{f.title}</h3>
                <p>{f.copy}</p>
                {f.chips.length > 0 && (
                  <div className="vy-chips">
                    {f.chips.map((c) => (
                      <span key={c}>{c}</span>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* ── hogyan működik ── */}
        <section className="vy-steps" id="hogyan">
          <div className="vy-section-head" data-reveal>
            <span className="vy-eyebrow">Hogyan működik</span>
            <h2>
              Három lépés, egy <em>délután.</em>
            </h2>
          </div>
          <div className="vy-steps-grid">
            {steps.map((s) => (
              <article className="vy-step" data-reveal key={s.n}>
                <span className="vy-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.copy}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── termékbemutató fülekkel ── */}
        <section className="vy-showcase" data-reveal>
          <div className="vy-showcase-inner">
            <div className="vy-showcase-copy">
              <span className="vy-eyebrow">A felület</span>
              <div className="vy-tabs" role="tablist">
                {tabs.map((t) => (
                  <button
                    aria-selected={tab === t.id}
                    className={tab === t.id ? "is-active" : ""}
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    role="tab"
                    type="button"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <h2>{activeTab.title}</h2>
              <p>{activeTab.copy}</p>
              <a className="vy-ghost" href="#arak">
                Kipróbálom élesben
              </a>
            </div>

            <div className="vy-showcase-art">
              <div className="vy-window">
                <div className="vy-window-bar">
                  <span className="vy-wdot" />
                  <span className="vy-wdot" />
                  <span className="vy-wdot" />
                  <span className="vy-window-title">Veyra · {activeTab.label}</span>
                </div>
                <div className="vy-screen-swap" key={tab}>
                  {tab === "naptar" && <CalendarScreen />}
                  {tab === "ugyfelek" && <ClientsScreen />}
                  {tab === "bevetel" && <RevenueScreen />}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── vélemény ── */}
        <section className="vy-quote" data-reveal>
          <blockquote>
            Két hét alatt megtelt a naptáram olyan időpontokkal is, amikre azelőtt rá se
            kérdeztek. Azóta nem veszem fel a telefont munka közben — és senki nem hiányolja.
          </blockquote>
          <div className="vy-quote-author">
            <span className="vy-avatar tone-b">HK</span>
            <div>
              <strong>Halász Kata</strong>
              <span>tulajdonos · Kata Studio (fiktív szereplő)</span>
            </div>
          </div>
        </section>

        {/* ── árak ── */}
        <section className="vy-pricing" id="arak">
          <div className="vy-section-head" data-reveal>
            <span className="vy-eyebrow">Árak</span>
            <h2>
              Annyit fizetsz, amennyit <em>használsz.</em>
            </h2>
            <div className="vy-toggle">
              <button
                className={!yearly ? "is-active" : ""}
                onClick={() => setYearly(false)}
                type="button"
              >
                Havi
              </button>
              <button
                className={yearly ? "is-active" : ""}
                onClick={() => setYearly(true)}
                type="button"
              >
                Éves <span className="vy-save">−20%</span>
              </button>
            </div>
          </div>

          <div className="vy-plans">
            {plans.map((p) => {
              const price = yearly ? p.yearly : p.monthly;
              return (
                <article
                  className={`vy-plan ${p.featured ? "is-featured" : ""}`}
                  data-reveal
                  key={p.name}
                >
                  {p.featured && <span className="vy-plan-badge">Legnépszerűbb</span>}
                  <h3>{p.name}</h3>
                  <p className="vy-plan-tagline">{p.tagline}</p>
                  <div className="vy-plan-price">
                    <strong>{price === 0 ? "0 Ft" : `${price.toLocaleString("hu-HU")} Ft`}</strong>
                    <span>/ hó {yearly && price > 0 ? "(éves)" : ""}</span>
                  </div>
                  <ul>
                    {p.features.map((f) => (
                      <li key={f}>
                        <span className="vy-check" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a className={p.featured ? "vy-btn full" : "vy-ghost full"} href="#top">
                    {p.cta}
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── GYIK ── */}
        <section className="vy-faq" id="gyik">
          <div className="vy-section-head" data-reveal>
            <span className="vy-eyebrow">GYIK</span>
            <h2>
              Amit <em>tényleg</em> kérdezni szoktak.
            </h2>
          </div>
          <div className="vy-faq-list" data-reveal>
            {faqs.map((f, i) => (
              <div className={`vy-faq-item ${openFaq === i ? "is-open" : ""}`} key={f.q}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} type="button">
                  {f.q}
                  <span className="vy-faq-sign" aria-hidden="true" />
                </button>
                <div className="vy-faq-answer">
                  <p>{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── záró CTA ── */}
        <section className="vy-cta" data-reveal>
          <div className="vy-cta-inner">
            <h2>
              A következő foglalásod már <em>magától</em> is beeshetne.
            </h2>
            <p>14 nap próba, bankkártya nélkül. Ha nem válik be, egy kattintással lelépsz.</p>
            <a className="vy-btn lg" href="#top">
              Elindítom a próbaidőszakot
            </a>
          </div>
        </section>
      </main>

      <footer className="vy-footer">
        <div className="vy-footer-inner">
          <div className="vy-footer-brand">
            <a className="vy-logo" href="#top">
              <span className="vy-logo-mark" aria-hidden="true" />
              Veyra
            </a>
            <p>Foglalás, ügyfelek és bevétel egy helyen — szolgáltató vállalkozásoknak.</p>
          </div>
          <div className="vy-footer-cols">
            <div>
              <span>Termék</span>
              <a href="#funkciok">Funkciók</a>
              <a href="#arak">Árak</a>
              <a href="#gyik">GYIK</a>
            </div>
            <div>
              <span>Cég</span>
              <a href="#top">Rólunk</a>
              <a href="#top">Blog</a>
              <a href="#top">Karrier</a>
            </div>
            <div>
              <span>Jog</span>
              <a href="#top">ÁSZF</a>
              <a href="#top">Adatkezelés</a>
              <a href="#top">Cookie-k</a>
            </div>
          </div>
        </div>
        <div className="vy-footer-bottom">
          <span>© 2026 Veyra — kitalált márka, ProjectEdge mintaprojekt.</span>
          <a href="https://www.projectedge.hu">Készítette: ProjectEdge</a>
        </div>
      </footer>
    </div>
  );
}
