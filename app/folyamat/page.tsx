import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { IconMessageCircle, IconCompass, IconPenTool, IconGear, IconSparkles, IconPackage, IconWrench, IconLock } from "@/components/icons";

const steps = [
  {
    number: "01",
    title: "Átbeszéljük",
    copy: "Az ügyfélkapun kitöltött brief alapján átnézem, mi van most, mi nem működik, és milyen ügyfeleket szeretnél elérni. Hívás nélkül is megy — de ha jobban szereted, beszélhetünk is.",
    tag: "hívás nélkül is",
    Icon: IconMessageCircle
  },
  {
    number: "02",
    title: "Rendet rakok",
    copy: "Összerakom az oldalszerkezetet, az ügyfélutat és a fontos döntési pontokat. Itt dől el, mire van tényleg szükség — és mire nem, hogy ne fizess feleslegesen.",
    tag: "1–2 nap",
    Icon: IconCompass
  },
  {
    number: "03",
    title: "Megtervezem",
    copy: "Kapsz egy konkrét vizuális irányt, mielőtt bármit kódolnék. Nem sablonból: a te szolgáltatásodhoz és ügyfeleidhez szabva. Itt módosítunk, amíg nem stimmel.",
    tag: "jóváhagyásra váró irány",
    Icon: IconPenTool
  },
  {
    number: "04",
    title: "Felépítem",
    copy: "Next.js, Supabase, gyors betöltés, mobilnézet, domain és Vercel deploy. A szövegeket megírom, a hozzáféréseket bekötöm. Közben az ügyfélkapun végig látod a haladást.",
    tag: "a projekt nagy része",
    Icon: IconGear
  },
  {
    number: "05",
    title: "Finomítom",
    copy: "Indulás után megnézem, hogyan viselkedik az oldal a valóságban, és javítok azon, ami csak éles használatban derül ki. Nem tűnök el a leszállítás után.",
    tag: "indulás után is",
    Icon: IconSparkles
  }
];

const extras = [
  {
    Icon: IconMessageCircle,
    title: "Folyamatos kapcsolat",
    copy: "Az ügyfélkapun ticketet nyitsz, követed a státuszt és visszanézed a beszélgetést. Nem vész el semmi emailben."
  },
  {
    Icon: IconPackage,
    title: "Mit kapsz a végén",
    copy: "Kész, élő oldal saját domainen, a hozzáférésekkel együtt. A tiéd — nem zárlak be egy rendszerbe, amiből nem tudsz kilépni."
  },
  {
    Icon: IconWrench,
    title: "Indulás után",
    copy: "Igény szerint havi karbantartás: frissítés, mentés, mérés és apró fejlesztések, hogy az oldal ne öregedjen el."
  },
  {
    Icon: IconLock,
    title: "Miért van foglaló",
    copy: "Egy alacsony, fix összegű foglaló indítja a projektet — ez csak annyit szűr, hogy komoly szándékkal vágjunk bele. A teljes díjat csak a kész oldal átadásakor kérem, tehát nálad nincs kockázat."
  }
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
        {steps.map(({ number, title, copy, tag, Icon }) => (
          <article className="proc-step" key={number}>
            <span className="proc-num">{number}</span>
            <div className="proc-body">
              <h2>{title}</h2>
              <p>{copy}</p>
              <span className="step-tag">{tag}</span>
            </div>
            <div className="proc-icon" aria-hidden="true">
              <Icon size={28} />
            </div>
          </article>
        ))}
      </section>
      <section className="process-extras">
        {extras.map(({ Icon, title, copy }) => (
          <article className="process-extra" key={title}>
            <div className="extra-ico" aria-hidden="true">
              <Icon size={24} />
            </div>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>
      <section className="cta-band dark">
        <h2>Ha szereted, amikor átlátható a munka, valószínűleg jól fogunk haladni.</h2>
        <TransitionLink className="button primary" href="/ugyfelkapu">
          Projekt indítása
        </TransitionLink>
      </section>
    </main>
  );
}
