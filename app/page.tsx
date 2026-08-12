import Image from "next/image";
import { ModelViewer } from "@/components/ModelViewer";
import { TransitionLink } from "@/components/TransitionLink";
import { SiteNav } from "@/components/SiteNav";
import { PriceEstimator } from "@/components/PriceEstimator";
import { PublicBriefWizard } from "@/components/PublicBriefWizard";

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

const metrics = ["Stratégia", "Szöveg", "Design", "Fejlesztés"];

const proof = [
  "Egyedi felépítés",
  "Mobilra tervezve",
  "Mérhető teljesítmény",
  "Frontend + backend egy kézben",
  "Ügyfélkapu és admin háttér",
  "Átlátható projektfolyamat"
];

const faqs = [
  [
    "Mennyibe kerül egy weboldal?",
    "Kétféleképpen lehet. Bérlésnél 14 900 Ft/hó-tól indulsz, induló díj nincs — az oldal az enyém marad, én üzemeltetem. Ha inkább a sajátod legyen, meg is veheted 179 000 Ft-tól, akkor a forráskóddal együtt átadom."
  ],
  [
    "Mennyi idő alatt készül el?",
    "Egy egyszerűbb oldal 1–2 nap, egy összetettebb rendszer pár hét. A méret dönti el."
  ],
  [
    "Mi van, ha nem tetszik az irány?",
    "Előbb kapsz egy látványtervet, és azon módosítunk, amíg jó nem lesz. Nem a végén derül ki, hogy nem ezt szeretted volna."
  ],
  [
    "Kell hozzá saját domain és tárhely?",
    "Bérlésnél nem kell: a domaint és a tárhelyet is én intézem. Vásárlásnál mindent átadok neked."
  ],
  [
    "Mi van a leszállítás után?",
    "30 napig díjmentesen javítom, ha hiba van. Új funkció nem tartozik ide, arra külön karbantartás kérhető."
  ],
  [
    "Kinél lesznek a hozzáférések és ki fizeti a futtatást?",
    "Bérlésnél nálam: a domaint, a tárhelyet és a számlákat is én kezelem, neked ezzel nincs dolgod. Vásárlásnál a tiéd lesz minden — a forráskódot, a domaint és a hozzáféréseket lépésről lépésre átadom."
  ]
];

export default function Home() {
  return (
    <main className="site-shell">
      <SiteNav />

      <section className="home-hero">
        <div className="hero-noise" aria-hidden="true" />
        <div className="home-hero-grid">
          <div className="hero-editorial">
            <p className="micro-label">ProjectEdge / Digital Build Studio</p>
            <h1 className="hero-statement">
              <span>Weboldal, amit</span>
              <span className="hero-accent">bérelsz.</span>
              <span>Én építem, én üzemeltetem.</span>
            </h1>
            <p className="hero-lead">
              Nincs induló díj. A domaint, a tárhelyet és a karbantartást is én intézem — egy
              havidíjért. Ha inkább a sajátod lenne, meg is veheted.
            </p>
            <div className="hero-command">
              <a className="button primary" href="#projektbrief">Projektbrief indítása</a>
              <TransitionLink className="button spectral" href="/szolgaltatasok#arak">Csomagok és árak</TransitionLink>
              <TransitionLink className="button spectral" href="/munkak">
                Munkáim megnézése
              </TransitionLink>
            </div>
          </div>
          <div className="hero-system" aria-label="ProjectEdge projektfolyamat előnézet">
            <div className="system-glow" aria-hidden="true" />
            <div className="system-window">
              <div className="system-window-bar">
                <span /><span /><span />
                <b>projectedge / live build</b>
              </div>
              <div className="system-preview">
                <span className="system-kicker">ÚJ PROJEKT</span>
                <strong>Az ötlettől az éles oldalig.</strong>
                <p>Stratégia, design és fejlesztés egyetlen átlátható folyamatban.</p>
                <i>Projekt indítása →</i>
              </div>
            </div>
            <div className="system-card progress-card">
              <span>Fejlesztés</span>
              <strong>72%</strong>
              <div><i /></div>
            </div>
            <div className="system-card status-card">
              <span className="status-dot" />
              <div><small>KÖVETKEZŐ LÉPÉS</small><strong>Mobilnézet finomítása</strong></div>
            </div>
            <div className="system-card delivery-card">
              <small>EGY KÉZBEN</small>
              <span>Szöveg</span><span>Design</span><span>Kód</span>
            </div>
          </div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Technológiai alapok">
        {metrics.map((metric) => (
          <span key={metric}>{metric}</span>
        ))}
      </section>

      <PublicBriefWizard />

      <section className="proof-marquee" aria-label="ProjectEdge előnyök">
        <div className="proof-track">
          {[...proof, ...proof].map((item, index) => (
            <span className="proof-pill" key={index}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="featured-work">
        <div className="featured-copy">
          <p className="micro-label dark">Referencia</p>
          <h2>Checky.hu</h2>
          <p>
            A Checky.hu-nál nem csak a felület készült el. Magam raktam össze a teljes rendszert:
            frontend, backend, adatkezelés, üzleti logika és a bonyolultabb működési folyamatok is
            egy kézben épültek.
          </p>
          <TransitionLink className="button primary" href="/munkak">
            Esettanulmány megnézése
          </TransitionLink>
        </div>
        <a className="checky-card" href="https://checky.hu" rel="noreferrer" target="_blank">
          <span className="case-tag">Full-stack munka</span>
          <img alt="Checky.hu weboldal referencia" src="/work/checky.png" />
          <div>
            <strong>Checky.hu</strong>
            <small>Frontend, backend, adatfolyamok, komplex webes rendszer.</small>
          </div>
        </a>
      </section>

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

      <section className="no-call">
        <div>
          <p className="micro-label">Ügyfélkapu</p>
          <h2>Nem kell telefonálnod.</h2>
          <p className="nc-copy">
            Az ügyfélkapun elindítod a projektet, követed a haladást, fizetsz és kérdezel — amikor
            neked jó. Ha szóban gyorsabb, azért beszélhetünk.
          </p>
          <TransitionLink className="button primary" href="/ugyfelkapu">
            Indítás az ügyfélkapun
          </TransitionLink>
        </div>
        <ul className="nc-list">
          <li>Nincs kötelező telefonhívás</li>
          <li>Adatlap, státusz és fizetés egy helyen</li>
          <li>Kérdés bármikor, írásban</li>
        </ul>
      </section>

      <section className="price-teaser">
        <div className="section-head">
          <p className="micro-label dark">Árak</p>
          <h2>Béreled vagy megveszed.</h2>
          <p>
            Bérlésnél nincs induló díj, és semmilyen technikai teendőd. Vásárlásnál a forráskód és
            minden hozzáférés a tiéd lesz.
          </p>
        </div>
        <PriceEstimator />
      </section>

      <section className="orbit-section">
        <div className="orbit-copy">
          <p className="micro-label">Egy kézben / az ötlettől az indulásig</p>
          <h2>Végigviszem az egész pályát.</h2>
          <p>
            Nem kell külön tervezőt, fejlesztőt és technikai kapcsolattartót összehangolnod. A
            felépítéstől az éles indulásig egy kézben marad a projekt, ezért gyorsabbak a döntések
            és kevesebb részlet vész el útközben.
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

      {/* Ezek szándékosan NEM idézetek: saját vállalások. A korábbi
          blockquote + „szerző" felépítés ügyfélvéleménynek látszott, holott
          nincs mögötte valós referencia — ezért lett belőle nyílt vállalás-kártya. */}
      <section className="voices-section">
        <div className="section-head">
          <p className="micro-label dark">Mire számíthatsz</p>
          <h2>Ezt kapod tőlem.</h2>
        </div>
        <div className="voices-grid">
          <article className="voice-card feature">
            <p className="voice-claim">
              Nem sablonból dolgozom, és nem kell írogatnod, hogy hol tart. Belépsz, és látod, mi
              készült el és mi jön ezután.
            </p>
            <div className="voice-author">
              <div>
                <strong>Átlátható munka</strong>
                <span>tervezéstől az indításig</span>
              </div>
            </div>
          </article>
          <article className="voice-card">
            <p className="voice-claim">
              Aki rákeres a szolgáltatásodra, megtalálja az oldalad, és két koppintással ír neked.
              Telefonon is.
            </p>
            <div className="voice-author">
              <div>
                <strong>Eredményre tervezve</strong>
                <span>sebesség + ügyfélszerzés</span>
              </div>
            </div>
          </article>
          <article className="voice-card">
            <p className="voice-claim">
              Ha megveszed, a végén minden a tiéd: domain, forráskód, adatbázis. Az átadás
              lépésenként megy, írásban.
            </p>
            <div className="voice-author">
              <div>
                <strong>Nincs bezárás</strong>
                <span>átadás + 30 napos garancia</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="faq-section">
        <div className="section-head">
          <p className="micro-label dark">GYIK</p>
          <h2>A leggyakoribb kérdések.</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="manifesto">
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
    </main>
  );
}
