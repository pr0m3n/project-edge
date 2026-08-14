import type { Metadata } from "next";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { PriceEstimator } from "@/components/PriceEstimator";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Weboldal készítés ingatlanközvetítőknek és irodáknak | ProjectEdge",
  description:
    "Prémium ingatlankatalógus szűrőkkel, részletes adatlapokkal, hitelbecslővel és megtekintési űrlappal. Ne csak a hirdetési portálokon függj.",
  alternates: { canonical: "/weboldal-ingatlankozvetitoknek" }
};

export default function IngatlanosPage() {
  return (
    <main className="site-shell light-page industry-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Weboldal készítés ingatlanközvetítőknek és irodáknak",
          description:
            "Kereshető ingatlankatalógus weboldal közvetítőknek, irodáknak és lakóparki fejlesztőknek.",
          provider: { "@id": "https://www.projectedge.hu/#business" },
          areaServed: { "@type": "Country", name: "Magyarország" },
          url: "https://www.projectedge.hu/weboldal-ingatlankozvetitoknek"
        }}
      />
      <SiteNav />

      {/* Hero */}
      <section className="industry-hero">
        <div className="industry-hero-copy">
          <p className="micro-label dark">Ingatlan & Portfólió · Weboldal és katalógus</p>
          <h1>Saját, prémium márkát érdemel a kínálatod.</h1>
          <p className="industry-hero-lead">
            A nagy hirdetési portálok drágák, és a versenytársaid hirdetéseit tolják a te megbízásaid
            mellé. Olyan modern, elegáns ingatlankatalógust építek neked, ahol a vevők szűrhetnek a
            kínálatodban, megnézhetik a fotókat, alaprajzokat, és azonnal időpontot kérhetnek a megtekintésre.
          </p>
          <div className="hero-command">
            <a className="button primary" href="#arak">Csomagok és árak</a>
            <TransitionLink className="button spectral" href="/demo/budai-otthonok">
              Kattints bele az élő demóba →
            </TransitionLink>
          </div>
        </div>

        <div className="industry-hero-stage">
          <div className="industry-mockup-window">
            <div className="industry-window-bar">
              <span /><span /><span />
              <b>budai-otthonok / katalogus</b>
            </div>
            <div className="industry-mockup-media">
              <Image
                alt="Budai Otthonok kereshető ingatlankatalógus minta"
                height={780}
                priority
                sizes="(max-width: 900px) calc(100vw - 36px), 48vw"
                src="/work/demos/budai-otthonok.webp"
                width={1280}
              />
            </div>
            <div className="industry-stage-badge">
              <small>MŰKÖDŐ MINTAPROJEKT</small>
              <strong>Budai Otthonok</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Pain points vs Solutions */}
      <section className="industry-reality">
        <div className="section-head">
          <p className="micro-label dark">Miért nem elég a portálhirdetés?</p>
          <h2>Így nyersz el több exkluzív megbízást:</h2>
          <p>
            Amikor egy eladó tulajdonos közvetítőt választ, a megjelenésed és a professzionalizmusod
            dönti el, hogy téged bíz-e meg a milliós jutalékért:
          </p>
        </div>

        <div className="reality-grid">
          <article className="reality-card">
            <span className="reality-tag bad">A PROBLÉMA</span>
            <h3>Függőség a hirdetési felületektől</h3>
            <p>
              A nagy portálokon a te hirdetésed mellett ott villog másik tíz ingatlanos ajánlata.
              Nincs saját ügyfélbázisod, csak bérled a figyelmet drága kattintásokért.
            </p>
            <div className="reality-fix">
              <strong>A megoldás:</strong>
              <span>Saját weboldal, ahová hirdetésből vagy ajánlásból érkezve csak a te kínálatodat látják.</span>
            </div>
          </article>

          <article className="reality-card">
            <span className="reality-tag bad">A PROBLÉMA</span>
            <h3>Bonyolult eladói meggyőzés</h3>
            <p>
              Nehéz megindokolni a jutalékot egy ingatlannál, ha nincs egy reprezentatív, nívós oldalad,
              ahol megmutathatod az eladónak: „Nézd, így fog kinézni a lakásod nálunk”.
            </p>
            <div className="reality-fix">
              <strong>A megoldás:</strong>
              <span>Prémium fotós galériák, alaprajz-megjelenítés, részletes műszaki paraméterek és virtuális séta integráció.</span>
            </div>
          </article>

          <article className="reality-card">
            <span className="reality-tag bad">A PROBLÉMA</span>
            <h3>Elvesző érdeklődők</h3>
            <p>
              A vevő megnézi a hirdetést, de nincs azonnali kalkuláció vagy egyszerű megtekintési űrlap,
              ezért továbbgörget anélkül, hogy megadná az elérhetőségét.
            </p>
            <div className="reality-fix">
              <strong>A megoldás:</strong>
              <span>Beépített törlesztőrészlet-becslő, kedvencek mentése és közvetlen megtekintés-kérő űrlap.</span>
            </div>
          </article>
        </div>
      </section>

      {/* Demo callout */}
      <section className="industry-demo-banner">
        <div className="demo-banner-content">
          <span className="demo-banner-kicker">INTERAKTÍV KATALÓGUS · TESZTELHETŐ</span>
          <h2>Kattints végig a Budai Otthonok prémium demón!</h2>
          <p>
            Próbáld ki a szűrést (kerület, ár, szobaszám), nyisd meg a részletes ingatlan-adatlapot,
            és teszteld a törlesztő-kalkulátort és az érdeklődő űrlapot élőben.
          </p>
          <TransitionLink className="button primary" href="/demo/budai-otthonok">
            Élő ingatlankatalógus demó megnyitása →
          </TransitionLink>
        </div>
      </section>

      {/* Feature pillars */}
      <section className="industry-pillars">
        <div className="section-head">
          <p className="micro-label dark">Főbb képességek</p>
          <h2>Minden, ami egy prémium ingatlanos oldalhoz kell.</h2>
        </div>

        <div className="pillars-grid">
          <article className="pillar-card">
            <span>01 / KATALÓGUS</span>
            <h3>Gyors szűrés és keresés</h3>
            <p>
              A látogató azonnal megtalálja a keresett kategóriát, lokációt, ársávot vagy alapterületet.
              Oldalújratöltés nélkül, azonnal frissülő találati listával.
            </p>
          </article>

          <article className="pillar-card">
            <span>02 / ADATLAP</span>
            <h3>Részletes ingatlanoldal</h3>
            <p>
              Nagyfelbontású képgaléria, letölthető alaprajz, részletes helyiséglista, rezsiköltség és
              környékbemutató egyetlen rendezett felületen.
            </p>
          </article>

          <article className="pillar-card">
            <span>03 / ÜGYFÉLSZERZÉS</span>
            <h3>Megtekintés és ajánlatkérés</h3>
            <p>
              A vevőjelölt egy perc alatt beküldi, melyik napon és időpontban szeretné megtekinteni
              az ingatlant, te pedig azonnal értesítést kapsz.
            </p>
          </article>
        </div>
      </section>

      {/* Pricing */}
      <section className="industry-pricing-wrap">
        <div className="section-head">
          <p className="micro-label dark">Árazási lehetőségek</p>
          <h2>Havidíjas felügyelet vagy egyedi saját tulajdon.</h2>
          <p>
            Válassz havidíjas csomagot folyamatos technikai gondozással, vagy kérj egyszeri egyedi
            ajánlatot a teljes forráskód és adatbázis átadásával.
          </p>
        </div>
        <PriceEstimator />
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="section-head">
          <p className="micro-label dark">Gyakori kérdések</p>
          <h2>Kérdések ingatlanos weboldalak kapcsán.</h2>
        </div>
        <div className="faq-list">
          <details className="faq-item">
            <summary>Hogyan tudok új ingatlanokat felvinni vagy a meglévőket módosítani?</summary>
            <p>
              Igény szerint készítek hozzá egy könnyen kezelhető kezelőfelületet (adminisztrációs pultot),
              vagy menedzselt havidíjas modellben egyszerűen átküldöd a képeket és az adatokat, és én
              feltöltöm őket a rendszerbe.
            </p>
          </details>
          <details className="faq-item">
            <summary>Lehet integrálni ingatlanos szoftverekkel (pl. CRM rendszerekkel)?</summary>
            <p>
              Igen. Mivel egyedi Next.js + Supabase alapon épül a weboldal, lehetőség van API vagy
              webhook alapú adatátadásra külső CRM és hirdetéskezelő rendszerek felé.
            </p>
          </details>
          <details className="faq-item">
            <summary>Alkalmas lakóparkok és újépítésű projektek értékesítésére is?</summary>
            <p>
              Kifejezetten. A struktúra tökéletesen alkalmas többlakásos projektek, alaprajzok, műszaki
              leírások és szabad/foglalt lakáslisták bemutatására is.
            </p>
          </details>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band">
        <h2>Építsünk egy olyan katalógust, ami emeli a márkád értékét!</h2>
        <TransitionLink className="button primary" href="/#projektbrief">
          Projekt indítása az online briefből
        </TransitionLink>
      </section>
    </main>
  );
}
