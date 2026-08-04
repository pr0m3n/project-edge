"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DemoBar } from "@/components/demo/DemoBar";
import { useDemoNotice } from "@/components/demo/DemoNotice";

/* a demóban nincs valódi fiók — a CTA-k ezt írják ki némán semmittevés helyett */
const SIGNUP_NOTICE =
  "A regisztráció és a belépés ebben a mintaprojektben nincs élesítve — éles projektnél ez a rész is elkészül.";

/* ── tartalom ─────────────────────────────────────────────────────────── */

const features = [
  {
    icon: "calendar",
    kicker: "Naptár",
    title: "Sosem duplázza le magát",
    copy: "Online foglalás a saját oldaladról, valós idejű szabad idősávokkal. Ha valaki lefoglal egy időpontot, az a többi csatornán azonnal eltűnik.",
    chips: ["Google Naptár szinkron", "Puffer idő"]
  },
  {
    icon: "bell",
    kicker: "Emlékeztető",
    title: "Nem neked kell telefonálni",
    copy: "SMS és email 24 órával az időpont előtt, a te szövegeddel. A meg nem jelenések a töredékére esnek vissza.",
    chips: ["SMS", "Email", "Saját szöveg"]
  },
  {
    icon: "card",
    kicker: "Fizetés",
    title: "Előleg már foglaláskor",
    copy: "Kérj foglaláskor előleget bankkártyával — a no-show ezzel gyakorlatilag megszűnik, a pénz pedig ott van, mielőtt bejönne.",
    chips: ["Bankkártya", "Számlázás"]
  },
  {
    icon: "users",
    kicker: "Ügyfelek",
    title: "Tudod, ki lép be az ajtón",
    copy: "Előzmények, jegyzetek, kedvenc szolgáltatás, elköltött összeg. Minden ott van, mielőtt beköszön.",
    chips: ["Kartonok", "Címkék"]
  },
  {
    icon: "chart",
    kicker: "Bevétel",
    title: "Számokból döntesz, nem érzésre",
    copy: "Látod, melyik szolgáltatás hoz igazán pénzt, melyik napszak áll üresen, és mennyit ér egy visszatérő vendég.",
    chips: ["Napi bontás", "Export"]
  }
];

const storySteps = [
  {
    id: "naptar",
    n: "01",
    label: "Reggel",
    title: "Kinyitod, és már tudod, mi lesz ma",
    copy: "Minden kolléga egymás mellett, húzd-ejtsd időpontokkal. Az üresen álló sávok azonnal kiszúrhatók — és be is tölthetők."
  },
  {
    id: "ugyfelek",
    n: "02",
    label: "Munka közben",
    title: "Mindenkiről tudsz mindent",
    copy: "Ki mikor járt nálad, mennyit költött, mit szeret, mire allergiás. A visszatérő vendég a legolcsóbb marketing."
  },
  {
    id: "bevetel",
    n: "03",
    label: "Zárás után",
    title: "Öt perc, és megvan a hét",
    copy: "Napi, heti, havi bontás szolgáltatásonként. Egy kattintással exportálod a könyvelőnek, és nem kell táblázatot vezetned."
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

/* a fejléc alatti futószalag: érkező foglalások */
const ticker = [
  { t: "09:00", who: "Nagy Péter", what: "Hajvágás" },
  { t: "09:45", who: "Tóth Réka", what: "Festés" },
  { t: "10:30", who: "Kiss Bence", what: "Szakállvágás" },
  { t: "11:15", who: "Fehér Mónika", what: "Melír" },
  { t: "12:00", who: "Erdei Zsolt", what: "Konzultáció" },
  { t: "13:30", who: "Szabó Lilla", what: "Hajvágás + szárítás" },
  { t: "14:30", who: "Kovács Anna", what: "Festés" },
  { t: "15:15", who: "Barna Gergő", what: "Szakállvágás" },
  { t: "16:00", who: "Vas Dóra", what: "Melír" },
  { t: "17:00", who: "Deák Ákos", what: "Hajvágás" }
];

/* a nap-tárcsa foglalásai — 7:00 és 21:00 közötti sávban */
const dayBookings = [
  { from: 8, to: 9, tone: "a", label: "Hajvágás" },
  { from: 9.25, to: 10.5, tone: "b", label: "Festés" },
  { from: 10.75, to: 11.5, tone: "c", label: "Szakáll" },
  { from: 12.5, to: 14, tone: "b", label: "Melír" },
  { from: 14.25, to: 15, tone: "a", label: "Hajvágás" },
  { from: 15.25, to: 16.5, tone: "c", label: "Konzultáció" },
  { from: 17, to: 18.5, tone: "b", label: "Festés" }
];

/* a hero mockupban körbejáró élő értesítések */
const liveFeed = [
  { slot: 0, who: "Nagy Péter", what: "Hajvágás", when: "ma 09:00" },
  { slot: 4, who: "Szabó Lilla", what: "Melír", when: "ma 13:30" },
  { slot: 2, who: "Kiss Bence", what: "Szakáll", when: "ma 10:30" },
  { slot: 5, who: "Erdei Zsolt", what: "Konzultáció", when: "ma 16:00" }
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

/* ── segédek ──────────────────────────────────────────────────────────── */

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function useReveal() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = root.current;
    if (!host) return;

    const targets = Array.from(host.querySelectorAll<HTMLElement>("[data-reveal]"));

    if (prefersReducedMotion()) {
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
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return root;
}

function useInView<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, seen };
}

/* ── hero: 3D-be döntött, élő naptár ──────────────────────────────────── */

const dayNames = ["H", "K", "Sze", "Cs", "P", "Szo"];

const heroSlots = [
  { day: 0, top: 6, h: 20, tone: "a", label: "Hajvágás", who: "Nagy P." },
  { day: 1, top: 30, h: 26, tone: "b", label: "Festés", who: "Tóth R." },
  { day: 2, top: 12, h: 16, tone: "c", label: "Szakáll", who: "Kiss B." },
  { day: 3, top: 44, h: 22, tone: "a", label: "Hajvágás", who: "Fehér M." },
  { day: 4, top: 20, h: 30, tone: "b", label: "Melír", who: "Szabó L." },
  { day: 5, top: 58, h: 18, tone: "c", label: "Konzultáció", who: "Erdei Zs." }
];

function CalendarScreen({ active = -1 }: { active?: number }) {
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
            {heroSlots
              .filter((s) => s.day === i)
              .map((s) => (
                <div
                  className={`vy-slot tone-${s.tone} ${active === i ? "is-live" : ""}`}
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

/* ── nap-tárcsa: az oldal saját objektuma ─────────────────────────────── */

const DIAL_R = 118;
const DIAL_C = 2 * Math.PI * DIAL_R;
const DAY_START = 7;
const DAY_LENGTH = 14;

function DayDial() {
  const { ref, seen } = useInView<HTMLDivElement>(0.3);
  const booked = dayBookings.reduce((sum, b) => sum + (b.to - b.from), 0);
  const usage = Math.round((booked / DAY_LENGTH) * 100);

  return (
    <div className="vy-dial-wrap" ref={ref}>
      <svg className={`vy-dial ${seen ? "is-in" : ""}`} viewBox="0 0 300 300">
        <g transform="translate(150 150) rotate(-90)">
          <circle
            className="vy-dial-track"
            cx="0"
            cy="0"
            fill="none"
            r={DIAL_R}
            strokeWidth="26"
          />
          {dayBookings.map((b, i) => {
            const len = (DIAL_C * (b.to - b.from)) / DAY_LENGTH;
            const offset = (-DIAL_C * (b.from - DAY_START)) / DAY_LENGTH;
            return (
              <circle
                className={`vy-dial-arc tone-${b.tone}`}
                cx="0"
                cy="0"
                fill="none"
                key={b.label + b.from}
                r={DIAL_R}
                strokeDasharray={seen ? `${len} ${DIAL_C}` : `0 ${DIAL_C}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                strokeWidth="26"
                style={{ transitionDelay: `${i * 90}ms` }}
              />
            );
          })}
        </g>

        {/* óracímkék */}
        {[8, 10, 12, 14, 16, 18, 20].map((h) => {
          const angle = ((h - DAY_START) / DAY_LENGTH) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const rr = DIAL_R + 27;
          // kerekítve, különben a szerver és a kliens más tizedesjegyet ad,
          // és a React hidratálási eltérést jelez
          const round = (n: number) => Math.round(n * 100) / 100;
          return (
            <text
              className="vy-dial-hour"
              key={h}
              x={round(150 + rr * Math.cos(rad))}
              y={round(150 + rr * Math.sin(rad) + 4)}
            >
              {h}
            </text>
          );
        })}

        <text className="vy-dial-value" x="150" y="146">
          {usage}%
        </text>
        <text className="vy-dial-label" x="150" y="170">
          kihasználtság
        </text>
        <text className="vy-dial-sub" x="150" y="190">
          kedd · 7 foglalás
        </text>
      </svg>

      <div className="vy-dial-legend">
        <span>
          <i className="tone-a" /> Hajvágás
        </span>
        <span>
          <i className="tone-b" /> Festés, melír
        </span>
        <span>
          <i className="tone-c" /> Egyéb
        </span>
      </div>
    </div>
  );
}

/* ── számláló ─────────────────────────────────────────────────────────── */

function Counter({
  to,
  suffix = "",
  decimals = 0
}: {
  to: number;
  suffix?: string;
  decimals?: number;
}) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
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

/* ── vízszintes funkció-sín ───────────────────────────────────────────── */

function FeatureRail() {
  const rail = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const onScroll = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  }, []);

  const nudge = (dir: number) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".vy-rail-card");
    const step = card ? card.offsetWidth + 20 : 360;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className="vy-rail-wrap">
      <div className="vy-rail" onScroll={onScroll} ref={rail}>
        {features.map((f) => (
          <article className="vy-rail-card" key={f.title}>
            <span className="vy-card-icon">
              <Icon name={f.icon} />
            </span>
            <span className="vy-rail-kicker">{f.kicker}</span>
            <h3>{f.title}</h3>
            <p>{f.copy}</p>
            <div className="vy-chips">
              {f.chips.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
          </article>
        ))}
        <span className="vy-rail-pad" aria-hidden="true" />
      </div>

      <div className="vy-rail-controls">
        <div className="vy-rail-track">
          {/* a hüvelyk 34% széles, ezért 66%-nyi úton mozog végig */}
          <span style={{ left: `${progress * 66}%` }} />
        </div>
        <div className="vy-rail-arrows">
          <button aria-label="Előző" onClick={() => nudge(-1)} type="button">
            <span />
          </button>
          <button aria-label="Következő" onClick={() => nudge(1)} type="button">
            <span />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── görgetéshez kötött termékbemutató ────────────────────────────────── */

function StoryScroller() {
  const [active, setActive] = useState(0);
  const steps = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const nodes = steps.current.filter(Boolean) as HTMLDivElement[];
    if (!nodes.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = nodes.indexOf(entry.target as HTMLDivElement);
            if (index >= 0) setActive(index);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  const current = storySteps[active];

  return (
    <div className="vy-story">
      <div className="vy-story-steps">
        {storySteps.map((s, i) => (
          <div
            className={`vy-story-step ${active === i ? "is-active" : ""}`}
            key={s.id}
            ref={(el) => {
              steps.current[i] = el;
            }}
          >
            <span className="vy-story-n">
              {s.n}
              <em>{s.label}</em>
            </span>
            <h3>{s.title}</h3>
            <p>{s.copy}</p>
          </div>
        ))}
      </div>

      <div className="vy-story-stage">
        <div className="vy-story-sticky">
          <div className="vy-window">
            <div className="vy-window-bar">
              <span className="vy-wdot" />
              <span className="vy-wdot" />
              <span className="vy-wdot" />
              <span className="vy-window-title">Veyra · {current.label}</span>
            </div>
            <div className="vy-screen-swap" key={current.id}>
              {current.id === "naptar" && <CalendarScreen />}
              {current.id === "ugyfelek" && <ClientsScreen />}
              {current.id === "bevetel" && <RevenueScreen />}
            </div>
          </div>
          <div className="vy-story-dots">
            {storySteps.map((s, i) => (
              <span className={active === i ? "is-on" : ""} key={s.id} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── oldal ────────────────────────────────────────────────────────────── */

export function VeyraSite() {
  const root = useReveal();
  const notice = useDemoNotice();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [yearly, setYearly] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [feed, setFeed] = useState(0);
  const [clock, setClock] = useState<string | null>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      setScrolled(window.scrollY > 24);
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* a hero mockupban körbejáró élő foglalás */
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setInterval(() => setFeed((v) => (v + 1) % liveFeed.length), 4200);
    return () => clearInterval(id);
  }, []);

  /* valódi óra — csak kliensen, hogy ne legyen hidratálási eltérés */
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
      );
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);

  /* kurzort követő fény a heróban */
  useEffect(() => {
    const el = heroRef.current;
    if (!el || prefersReducedMotion()) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--sx", `${e.clientX - r.left}px`);
      el.style.setProperty("--sy", `${e.clientY - r.top}px`);
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

  const live = liveFeed[feed];

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
            <a href="#nap" onClick={() => setMenuOpen(false)}>
              Egy nap
            </a>
            <a href="#funkciok" onClick={() => setMenuOpen(false)}>
              Funkciók
            </a>
            <a href="#arak" onClick={() => setMenuOpen(false)}>
              Árak
            </a>
            <a href="#gyik" onClick={() => setMenuOpen(false)}>
              GYIK
            </a>
          </nav>
          <div className="vy-nav-cta">
            <button className="vy-ghost" onClick={() => notice(SIGNUP_NOTICE)} type="button">
              Belépés
            </button>
            <button className="vy-btn" onClick={() => notice(SIGNUP_NOTICE)} type="button">
              Ingyen kipróbálom
            </button>
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
        <span className="vy-nav-progress" style={{ transform: `scaleX(${progress})` }} />
      </header>

      <main id="top">
        {/* ── hero: aszimmetrikus, térbe döntött mockuppal ── */}
        <section className="vy-hero" ref={heroRef}>
          <div className="vy-orb one" aria-hidden="true" />
          <div className="vy-orb two" aria-hidden="true" />
          <div className="vy-grid-bg" aria-hidden="true" />
          <div className="vy-spotlight" aria-hidden="true" />

          <div className="vy-hero-copy" data-reveal>
            <span className="vy-pill">
              <span className="vy-dot" />
              Élő: {clock ?? "14:32"} — most is érkezik foglalás
            </span>
            <h1>
              A naptárad
              <span className="vy-h1-row">
                <em>tele.</em>
                <span className="vy-h1-note">
                  Heti 6,5 óra
                  <br />
                  adminisztráció nélkül.
                </span>
              </span>
              A fejed üres.
            </h1>
            <p>
              A Veyra elintézi a foglalást, az emlékeztetőt és a fizetést, hogy te azzal
              foglalkozz, amihez értesz.
            </p>
            <div className="vy-hero-actions">
              <button className="vy-btn lg" onClick={() => notice(SIGNUP_NOTICE)} type="button">
                14 napig ingyen
              </button>
              <a className="vy-ghost lg" href="#nap">
                <span className="vy-play" aria-hidden="true" />
                Nézz meg egy napot
              </a>
            </div>
            <ul className="vy-hero-trust">
              <li>Bankkártya nélkül</li>
              <li>15 perc alatt kész</li>
              <li>Bármikor lemondható</li>
            </ul>
          </div>

          <div className="vy-hero-stage" data-reveal>
            <div className="vy-tilt">
              <div className="vy-window">
                <div className="vy-window-bar">
                  <span className="vy-wdot" />
                  <span className="vy-wdot" />
                  <span className="vy-wdot" />
                  <span className="vy-window-title">Veyra · Naptár</span>
                </div>
                <CalendarScreen active={live.slot} />
              </div>
            </div>

            <div className="vy-live" key={feed}>
              <span className="vy-live-icon">
                <Icon name="bell" />
              </span>
              <div>
                <strong>{live.who}</strong>
                <span>
                  {live.what} · {live.when}
                </span>
              </div>
              <span className="vy-live-badge">Új</span>
            </div>
          </div>
        </section>

        {/* ── ferde futószalag ── */}
        <section className="vy-ticker" aria-hidden="true">
          <div className="vy-ticker-row">
            <div className="vy-ticker-track">
              {[...ticker, ...ticker].map((item, i) => (
                <span className="vy-ticker-item" key={`a${i}`}>
                  <b>{item.t}</b>
                  {item.who}
                  <i>{item.what}</i>
                </span>
              ))}
            </div>
          </div>
          <div className="vy-ticker-row reverse">
            <div className="vy-ticker-track">
              {[...ticker, ...ticker].reverse().map((item, i) => (
                <span className="vy-ticker-item" key={`b${i}`}>
                  <b>{item.t}</b>
                  {item.who}
                  <i>{item.what}</i>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── nap-tárcsa + számok ── */}
        <section className="vy-day" id="nap">
          <div className="vy-day-inner">
            <div className="vy-day-copy" data-reveal>
              <span className="vy-eyebrow">Egy nap a Veyrával</span>
              <h2>
                Nem az a kérdés, hány órád van.
                <br />
                Hanem hogy <em>mennyi áll üresen.</em>
              </h2>
              <p>
                A tárcsa egyetlen kedd. Minden ív egy foglalás, a rések a kiesett bevétel. A
                Veyra ezeket a réseket tölti fel — emlékeztetővel, várólistával és online
                foglalással, ami éjjel is dolgozik.
              </p>
              <div className="vy-day-stats">
                <div>
                  <strong>
                    <Counter to={71} suffix="%" />
                  </strong>
                  <span>kevesebb meg nem jelenés</span>
                </div>
                <div>
                  <strong>
                    <Counter decimals={1} to={6.5} suffix=" óra" />
                  </strong>
                  <span>megspórolt admin hetente</span>
                </div>
                <div>
                  <strong>
                    <Counter to={2400} suffix="+" />
                  </strong>
                  <span>szolgáltató használja</span>
                </div>
              </div>
            </div>

            <div className="vy-day-object" data-reveal>
              <DayDial />
            </div>
          </div>
        </section>

        {/* ── probléma / megoldás, eltolt kártyákkal ── */}
        <section className="vy-problem">
          <div className="vy-problem-grid">
            <div className="vy-problem-card bad" data-reveal>
              <span className="vy-problem-tag">Enélkül</span>
              <ul>
                <li>Foglalás öt csatornán: telefon, Messenger, DM, email, papír</li>
                <li>Este 10-kor válaszolgatsz, hogy mikor érsz rá</li>
                <li>Aki nem jön el, az kiesett bevétel</li>
                <li>Fogalmad sincs, melyik szolgáltatás hoz igazán pénzt</li>
              </ul>
            </div>
            <div className="vy-problem-card good" data-reveal>
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

        {/* ── görgetéshez kötött termékbemutató ── */}
        <section className="vy-story-section">
          <div className="vy-section-head left" data-reveal>
            <span className="vy-eyebrow">A felület</span>
            <h2>
              Reggeltől zárásig <em>egy helyen.</em>
            </h2>
          </div>
          <StoryScroller />
        </section>

        {/* ── funkció-sín ── */}
        <section className="vy-features" id="funkciok">
          <div className="vy-section-head left" data-reveal>
            <span className="vy-eyebrow">Funkciók</span>
            <h2>
              Amit egy tele naptár <em>megkövetel.</em>
            </h2>
            <p>Húzd oldalra — nem funkciólista a lista kedvéért.</p>
          </div>
          <FeatureRail />
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
                  <button
                    className={p.featured ? "vy-btn full" : "vy-ghost full"}
                    onClick={() => notice(SIGNUP_NOTICE)}
                    type="button"
                  >
                    {p.cta}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        {/* ── GYIK ── */}
        <section className="vy-faq" id="gyik">
          <div className="vy-section-head left" data-reveal>
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
            <button className="vy-btn lg" onClick={() => notice(SIGNUP_NOTICE)} type="button">
              Elindítom a próbaidőszakot
            </button>
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
