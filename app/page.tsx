import type { Metadata } from "next";
import Image from "next/image";
import { ShaderBackdrop } from "@/components/ShaderBackdrop";
import { ModelViewer } from "@/components/ModelViewer";
import { TransitionLink } from "@/components/TransitionLink";
import { SiteNav } from "@/components/SiteNav";
import { PosterHero, PosterHeroFollow } from "@/components/PosterHero";
import { PriceEstimator } from "@/components/PriceEstimator";
import { BriefStage } from "@/components/BriefStage";
import { WorkDeck } from "@/components/WorkDeck";
import { AuditRequestSection } from "@/components/AuditRequestSection";
import { PhoneLink } from "@/components/PhoneLink";
import { ContactButton } from "@/components/ContactButton";
import { STUDIO_PHONE_LABEL } from "@/lib/contact";
import { HOME_FAQS } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Weboldal készítés vállalkozásoknak | ProjectEdge",
  description: "Egyedi, gyors weboldal készítés 14 900 Ft/hó-tól, külön belépési díj nélkül, vagy egyszeri vásárlással 179 000 Ft-tól. Egyedi megjelenés és átlátható folyamat.",
  alternates: { canonical: "/" }
};

const paths = [
  {
    href: "/szolgaltatasok",
    eyebrow: "01 / Mit kapsz",
    title: "Weboldal, ami után könnyebb megkeresni téged.",
    copy: "Tiszta ajánlat, jó első benyomás, átgondolt űrlap. Nem kell túlbonyolítani, csak rendesen összerakni."
  },
  {
    href: "/folyamat",
    eyebrow: "02 / Hogyan dolgozom",
    title: "Előbb megértem az ajánlatod, aztán jöhet a látvány.",
    copy: "Rövid egyeztetések, látható haladás, nincs felesleges kör. Mindig tudod, épp min dolgozom."
  },
  {
    href: "/ugyfelkapu",
    eyebrow: "03 / Indítás",
    title: "Indíts projektet saját ügyfél dashboardból.",
    copy: "Belépés után ticketet nyithatsz, projektet indíthatsz, és később visszanézed az összes előzményt."
  }
];

const proof = [
  "Egyedi felépítés",
  "Mobilra tervezve",
  "Mérhető teljesítmény",
  "Frontend + backend egy kézben",
  "Ügyfélkapu és admin háttér",
  "Átlátható projektfolyamat"
];

export default function Home() {
  return (
    <main className="site-shell">
      <SiteNav />

      {/* A korábbi heró (auróra-shader + szerkesztői oszlop + lebegő
          dashboard-makett) helyére került a poszter-heró. A makett volt az
          oldal legáltalánosabb eleme — minden SaaS-sablon hozza —, a
          kéz-ceruza viszont emberi és megjegyezhető. Az ár és a fő gomb nem
          veszett el: a heró alsó sávjában állnak. */}
      <PosterHero />

      {/* A sötét nyitórészt közvetlenül a referenciák követik. */}
      <PosterHeroFollow>
      <WorkDeck />
      <section className="proof-marquee" aria-label="ProjectEdge előnyök">
        <div className="proof-track">
          {[...proof, ...proof].map((item, index) => (
            <span className="proof-pill" key={index}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="price-teaser">
        <div className="section-head">
          <p className="micro-label dark">Árak</p>
          <h2>Havidíjjal vagy egyszeri vásárlással.</h2>
          <p>
            Havidíjnál én kezelem a domaint, a tárhelyet és a karbantartást.
            Egyszeri vásárlásnál a kész weboldalt a forráskóddal és a hozzáférésekkel együtt átadom neked.
          </p>
        </div>
        {/* A saját bevezetője itt kikapcsolva: a fenti section-head már
            ugyanezt mondja el, két azonos „Árak" fejléc egymás alatt volt. */}
        <PriceEstimator showLead={false} />
      </section>

      {/* Az árak megismerése után következik a projektindítás. */}
      <BriefStage />

      <section className="founder-section">
        <div className="founder-card">
          <Image
            alt="Patrik, a ProjectEdge alapítója és fejlesztője"
            className="founder-photo"
            fill
            sizes="(max-width: 880px) calc(100vw - 36px), 42vw"
            src="/profile/patrik.png"
          />
          <span className="founder-photo-tag">{"// Szia, Patrik vagyok."}</span>
          <div className="founder-badge">
            <strong>Patrik</strong>
            <span>alapító · fejlesztő · ProjectEdge</span>
          </div>
        </div>
        <div className="founder-copy">
          <p className="micro-label dark">Ki vagyok</p>
          <h2>Egy ember, aki végigviszi a projektedet.</h2>
          <p>
            Nem ügynökség vagyok, hanem egy fejlesztő, aki a tervezéstől a kódig és az indításig
            mindent maga csinál. Nálad nem lesz kihez passzolgatni a felelősséget — velem beszélsz,
            én építem, és én is felelek érte.
          </p>
          <div className="founder-tags">
            <span>Next.js</span>
            <span>Supabase</span>
            <span>Full-stack</span>
            <span>3D / Motion</span>
            <span>UI/UX</span>
          </div>
        </div>
      </section>

      <section className="orbit-section">
        {/* A „mindent egy kézben" üzenetet a fenti founder-szekció mondja ki;
            itt már csak az érdekel, mi történik a start és az élesítés között. */}
        <div className="orbit-copy">
          <p className="micro-label">Folyamat / lépésről lépésre</p>
          <h2>Mi történik az indulás és az élesítés között?</h2>
          <p>
            Nem kell külön tervezőt, fejlesztőt és technikai kapcsolattartót összehangolnod, ezért
            gyorsabbak a döntések és kevesebb részlet vész el útközben. Három szakasz van, és
            mindegyik végén látod, hol tart az oldalad.
          </p>
          <ul className="orbit-facts">
            <li>Struktúra és vizuális tervezés</li>
            <li>Fejlesztés és rendszerkapcsolatok</li>
            <li>Mobilos finomhangolás és élesítés</li>
          </ul>
          <TransitionLink className="button spectral" href="/folyamat">
            Megnézem, hogyan dolgozol
          </TransitionLink>
        </div>
        <div className="planet-stage">
          <ModelViewer
            alt="A teljes projektfolyamatot jelképező pixelbolygó"
            className="model-frame planet-model"
            exposure="0.9"
            src="/models/pixel_planet_trappist-1-e.glb"
          />
          <span className="orbit-line one" />
          <span className="orbit-line two" />
        </div>
      </section>

      <section className="no-call">
        <ShaderBackdrop variant="halftone" />
        <div className="no-call-scrim" aria-hidden="true" />
        <div>
          <p className="micro-label">Ügyfélkapu & Egyeztetés</p>
          <h2>Nem kötelező telefonálnod.</h2>
          <p className="nc-copy">
            Az ügyfélkapun elindítod a projektet, követed a haladást, fizetsz és kérdezel — amikor
            neked kényelmes. A teljes folyamat zökkenőmentesen végigvihető írásban, kötelező értekezletek
            nélkül, de ha telefonon vagy online megbeszélésen egyeztetnél, természetesen állok rendelkezésedre.
          </p>
          {/* Korábban „Indítás az ügyfélkapun" volt, ami regisztrációra vitt —
              a mérés szerint aki odáig jutott, egyikük sem regisztrált. Az
              egyetlen eddigi hirdetési megkeresés viszont chaten jött. Ezért a
              fő gomb a chatet nyitja; a meglévő ügyfél a belépést lent találja. */}
          <ContactButton className="button primary">Írj nekem chaten</ContactButton>
          {/* A szakasz eddig azzal zárult, hogy „ha telefonon egyeztetnél,
              állok rendelkezésedre" — csak épp nem volt mit hívni. */}
          <p className="nc-phone">
            Ha mégis inkább telefonálnál: <PhoneLink>{STUDIO_PHONE_LABEL}</PhoneLink>
            <br />
            Már ügyfél vagy? <TransitionLink href="/ugyfelkapu">Belépés az ügyfélkapuba</TransitionLink>
          </p>
        </div>
        <ul className="nc-list">
          <li>Teljes folyamat írásban — vagy igény szerint gyors hívással</li>
          <li>Adatlap, státusz és fizetés egy helyen</li>
          <li>Közvetlen segítség és válaszok az ügyfélkapun</li>
        </ul>
      </section>

      <section className="faq-section" id="gyik">
        <div className="section-head">
          <p className="micro-label dark">GYIK</p>
          <h2>A leggyakoribb kérdések.</h2>
        </div>
        <div className="faq-list">
          {HOME_FAQS.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <AuditRequestSection />

      {/* Kivezető linkek szándékosan a lap végén: a funnel közepén elvitték
          a fizetett forgalmat az árak és a brief elől. */}
      <section className="route-section">
        <div className="route-intro">
          <p className="micro-label dark">Hova tovább?</p>
          <h2>Mi érdekel?</h2>
        </div>
        <div className="route-grid">
          {paths.map((path) => (
            <TransitionLink className="route-tile" href={path.href} key={path.href}>
              <span>{path.eyebrow}</span>
              <h3>{path.title}</h3>
              <p>{path.copy}</p>
              <strong>Megnyitás</strong>
            </TransitionLink>
          ))}
        </div>
      </section>

      <section className="manifesto">
        <ShaderBackdrop variant="shadow" />
        <div>
          <p>Design</p>
          <p>rendszer</p>
          <p>adat</p>
          <p>konverzió</p>
        </div>
        <article>
          <span>Röviden</span>
          <h2>A jó weboldal nem magyarázkodik. Tisztán vezet tovább.</h2>
          <TransitionLink className="button secondary" href="/folyamat">
            Nézd meg a folyamatot
          </TransitionLink>
        </article>
      </section>
      </PosterHeroFollow>
    </main>
  );
}
