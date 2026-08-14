import type { Metadata } from "next";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { PriceEstimator } from "@/components/PriceEstimator";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Weboldal készítés villanyszerelőknek és kivitelezőknek | ProjectEdge",
  description:
    "Weboldal, ami kiszűri a potyázókat és azonnal elhozza a fizető helyi ügyfeleket. Kiszállási körzetellenőrző, árbecslő és gyors ajánlatkérés egy kézben.",
  alternates: { canonical: "/weboldal-kivitelezoknek-szakembereknek" }
};

export default function KivitelezoPage() {
  return (
    <main className="site-shell light-page industry-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Weboldal készítés kivitelezőknek és szakembereknek",
          description:
            "Weboldal készítés villanyszerelőknek, gépészeknek, klímásoknak és építőipari kivitelezőknek árbecslővel és körzetellenőrzővel.",
          provider: { "@id": "https://www.projectedge.hu/#business" },
          areaServed: { "@type": "Country", name: "Magyarország" },
          url: "https://www.projectedge.hu/weboldal-kivitelezoknek-szakembereknek"
        }}
      />
      <SiteNav />

      {/* Hero */}
      <section className="industry-hero">
        <div className="industry-hero-copy">
          <p className="micro-label dark">Kivitelezők & Szakemberek · Weboldal és ügyfélszerzés</p>
          <h1>Kevesebb felesleges telefon. Több konkrét munka.</h1>
          <p className="industry-hero-lead">
            Ha épp a létrán állsz vagy szerszámmal dolgozol, nincs időd hosszasan magyarázni a telefonban,
            hogy vállalsz-e kiszállást a város másik végére. Olyan oldalt építek neked, ami azonnal
            ellenőrzi a kiszállási körzetet, árbecslést ad, és egy kattintással ajánlatkérésig viszi a helyi megrendelőt.
          </p>
          <div className="hero-command">
            <a className="button primary" href="#arak">Csomagok és árak</a>
            <TransitionLink className="button spectral" href="/demo/varga-villany">
              Kattints bele az élő demóba →
            </TransitionLink>
          </div>
        </div>

        <div className="industry-hero-stage">
          <div className="industry-mockup-window">
            <div className="industry-window-bar">
              <span /><span /><span />
              <b>varga-villanyszereles / arbecslo</b>
            </div>
            <div className="industry-mockup-media">
              <Image
                alt="Varga Villanyszerelés weboldal és árbecslő minta"
                height={780}
                priority
                sizes="(max-width: 900px) calc(100vw - 36px), 48vw"
                src="/work/demos/varga-villany.webp"
                width={1280}
              />
            </div>
            <div className="industry-stage-badge">
              <small>MŰKÖDŐ MINTAPROJEKT</small>
              <strong>Varga Villanyszerelés</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Pain points vs Solutions */}
      <section className="industry-reality">
        <div className="section-head">
          <p className="micro-label dark">Miért veszítesz most időt?</p>
          <h2>A tipikus szakember-weboldal hibái:</h2>
          <p>
            A legtöbb szakember oldala csak egy statikus névjegykártya. A mi megközelítésünk azonnal
            szűri és segíti a megrendelőt:
          </p>
        </div>

        <div className="reality-grid">
          <article className="reality-card">
            <span className="reality-tag bad">A PROBLÉMA</span>
            <h3>Potyautas ajánlatkérők</h3>
            <p>
              Olyanok hívnak, akik csak a legolcsóbb munkadíjat vadásszák, vagy 100 kilométerrel arrébb
              laknak, mint ahol te dolgozol.
            </p>
            <div className="reality-fix">
              <strong>A megoldás:</strong>
              <span>Irányítószámos kiszállási körzetellenőrző és tájékoztató jellegű kalkulátor az oldalon.</span>
            </div>
          </article>

          <article className="reality-card">
            <span className="reality-tag bad">A PROBLÉMA</span>
            <h3>Bizonytalan első benyomás</h3>
            <p>
              A megrendelő fél a kóklerektől. Ha nincs rendezett, referenciákkal és garanciákkal ellátott
              oldalad, nem mer megbízni benned.
            </p>
            <div className="reality-fix">
              <strong>A megoldás:</strong>
              <span>Fotós referenciák, világos garanciális feltételek és hiteles szakmai bemutatkozás.</span>
            </div>
          </article>

          <article className="reality-card">
            <span className="reality-tag bad">A PROBLÉMA</span>
            <h3>Nehézkes elérhetőség mobilon</h3>
            <p>
              Vészhelyzetben (pl. zárlat, csőtörés, klímahiba) a látogató nem akar 10 mezős űrlapokat
              töltögetni — azonnal hívni akar.
            </p>
            <div className="reality-fix">
              <strong>A megoldás:</strong>
              <span>Fixen látható, 1-kattintásos hívásindító gomb és egyszerű gyorsűrlap telefonra optimalizálva.</span>
            </div>
          </article>
        </div>
      </section>

      {/* Demo callout */}
      <section className="industry-demo-banner">
        <div className="demo-banner-content">
          <span className="demo-banner-kicker">MŰKÖDŐ PÉLDA · VALÓS FUNKCIÓK</span>
          <h2>Próbáld ki a Varga Villanyszerelés élő mintaoldalt!</h2>
          <p>
            Kattints a demóra: teszteld az irányítószámos körzet-ellenőrzést, a szolgáltatási árbecslőt
            és a gyors ajánlatkérőt. Pontosan ilyen hatékony rendszert kapsz.
          </p>
          <TransitionLink className="button primary" href="/demo/varga-villany">
            Élő szakember-demó megnyitása →
          </TransitionLink>
        </div>
      </section>

      {/* Feature pillars */}
      <section className="industry-pillars">
        <div className="section-head">
          <p className="micro-label dark">Mit tartalmaz</p>
          <h2>Funkciók, amik valódi munkákat hoznak.</h2>
        </div>

        <div className="pillars-grid">
          <article className="pillar-card">
            <span>01 / KÖRNYÉK</span>
            <h3>Helyi SEO & Keresőoptimalizálás</h3>
            <p>
              Hogy a saját városodban és a környező településeken azok találjanak meg, akik épp
              szakembert keresnek a Google-ben.
            </p>
          </article>

          <article className="pillar-card">
            <span>02 / INTERAKCIÓ</span>
            <h3>Kalkulátor & Körzetellenőrző</h3>
            <p>
              A látogató beírja a települését vagy a feladatot, és rögtön látja, hogy vállalod-e a
              munkát, és körülbelül milyen költségre számíthat.
            </p>
          </article>

          <article className="pillar-card">
            <span>03 / GONDTALANSÁG</span>
            <h3>Teljes üzemeltetés egy kézben</h3>
            <p>
              Domain, szupergyors tárhely, SSL és frissítések. Ha új munkát fotóztál, csak átküldöd,
              és kiteszem a referenciák közé.
            </p>
          </article>
        </div>
      </section>

      {/* Pricing */}
      <section className="industry-pricing-wrap">
        <div className="section-head">
          <p className="micro-label dark">Konstrukciók</p>
          <h2>Bérlés 0 Ft induló díjjal, vagy egyszeri vásárlás.</h2>
          <p>
            A legtöbb szakember a havidíjas bérlést választja, mert nincs nagy kezdeti kiadás és minden
            technikai feladatot leveszek a vállukról.
          </p>
        </div>
        <PriceEstimator />
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="section-head">
          <p className="micro-label dark">Kérdések és válaszok</p>
          <h2>Gyakori kérdések kivitelezői oldalakhoz.</h2>
        </div>
        <div className="faq-list">
          <details className="faq-item">
            <summary>Nem értek az informatikához, mennyire lesz bonyolult nekem?</summary>
            <p>
              Semennyire. Neked csak el kell mondanod, milyen munkákat vállalsz és melyik körzetben.
              A szövegeket megírom, a rendszert felépítem, a beérkező érdeklődések pedig egyszerűen
              az emailedre vagy telefonodra érkeznek.
            </p>
          </details>
          <details className="faq-item">
            <summary>Hogyan tudom frissíteni a referenciáimat?</summary>
            <p>
              Előfizetés esetén bármikor átküldheted az új munkák képeit (akár Viberen vagy emailben),
              és én beillesztem őket a megfelelő helyre az oldalon.
            </p>
          </details>
          <details className="faq-item">
            <summary>Mi történik, ha egyedi funkciókat (pl. összetett kalkulátort) szeretnék?</summary>
            <p>
              Minden egyedi logikát kódból építek fel, így bármilyen speciális felmérési folyamatot vagy
              árazási szabályt pontosan a te munkafolyamataidra tudok szabni.
            </p>
          </details>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band">
        <h2>Szeretnél több jó minőségű helyi megkeresést?</h2>
        <TransitionLink className="button primary" href="/#projektbrief">
          Projekt indítása az online brief kitöltésével
        </TransitionLink>
      </section>
    </main>
  );
}
