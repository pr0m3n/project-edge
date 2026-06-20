import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

const steps = [
  [
    "01",
    "Átbeszéljük",
    "Egy rövid hívás vagy a brief alapján átnézzük, mi van most, mi nem működik, és milyen ügyfeleket szeretnél elérni. Nem a technikáról beszélünk, hanem az üzletedről.",
    "kb. 30 perc",
    "💬"
  ],
  [
    "02",
    "Rendet rakok",
    "Összerakom az oldalszerkezetet, az ügyfélutat és a fontos döntési pontokat. Itt dől el, mire van tényleg szükség — és mire nem, hogy ne fizess feleslegesen.",
    "1–2 nap",
    "🧭"
  ],
  [
    "03",
    "Megtervezem",
    "Kapsz egy konkrét vizuális irányt, mielőtt bármit kódolnék. Nem sablonból: a te szolgáltatásodhoz és ügyfeleidhez szabva. Itt módosítunk, amíg nem stimmel.",
    "jóváhagyásra váró irány",
    "🎨"
  ],
  [
    "04",
    "Felépítem",
    "Next.js, Supabase, gyors betöltés, mobilnézet, domain és Vercel deploy. A szövegeket megírom, a hozzáféréseket bekötöm. Közben az ügyfélkapun végig látod a haladást.",
    "a projekt nagy része",
    "⚙️"
  ],
  [
    "05",
    "Finomítom",
    "Indulás után megnézem, hogyan viselkedik az oldal a valóságban, és javítok azon, ami csak éles használatban derül ki. Nem tűnök el a leszállítás után.",
    "indulás után is",
    "✨"
  ]
];

const extras = [
  [
    "💬",
    "Folyamatos kapcsolat",
    "Az ügyfélkapun ticketet nyitsz, követed a státuszt és visszanézed a beszélgetést. Nem vész el semmi emailben."
  ],
  [
    "📦",
    "Mit kapsz a végén",
    "Kész, élő oldal saját domainen, a hozzáférésekkel együtt. A tiéd — nem zárlak be egy rendszerbe, amiből nem tudsz kilépni."
  ],
  [
    "🔧",
    "Indulás után",
    "Igény szerint havi karbantartás: frissítés, mentés, mérés és apró fejlesztések, hogy az oldal ne öregedjen el."
  ]
];

export default function ProcessPage() {
  return (
    <main className="site-shell dark-page">
      <SiteNav />
      <section className="page-hero compact inverse">
        <p className="micro-label">Folyamat</p>
        <h1>Előbb kitalálom, mit kell mondania az oldalnak.</h1>
        <p className="process-intro">
          Nem ugrunk fejest a designba. Először az üzleted és az ügyfeleid logikáját rakjuk rendbe —
          utána jön a látvány és a kód. Így nem fél év múlva derül ki, hogy valami alapból nem
          stimmel.
        </p>
      </section>
      <section className="proc-list">
        {steps.map(([number, title, copy, tag, icon]) => (
          <article className="proc-step" key={number}>
            <span className="proc-num">{number}</span>
            <div className="proc-body">
              <h2>{title}</h2>
              <p>{copy}</p>
              <span className="step-tag">{tag}</span>
            </div>
            <div className="proc-icon" aria-hidden="true">
              {icon}
            </div>
          </article>
        ))}
      </section>
      <section className="process-extras">
        {extras.map(([ico, title, copy]) => (
          <article className="process-extra" key={title}>
            <div className="extra-ico" aria-hidden="true">
              {ico}
            </div>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>
      <section className="cta-band dark">
        <h2>Ha szereted, amikor átlátható a munka, valószínűleg jól fogunk haladni.</h2>
        <Link className="button primary" href="/ugyfelkapu">
          Projekt indítása
        </Link>
      </section>
    </main>
  );
}
