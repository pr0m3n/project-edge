import type { Metadata } from "next";
import Image from "next/image";
import { ModelViewer } from "@/components/ModelViewer";
import { TransitionLink } from "@/components/TransitionLink";
import { SiteNav } from "@/components/SiteNav";
import { PriceEstimator } from "@/components/PriceEstimator";
import { PublicBriefWizard } from "@/components/PublicBriefWizard";
import { AuditRequestSection } from "@/components/AuditRequestSection";

export const metadata: Metadata = {
  title: "Weboldal készítés vállalkozásoknak | ProjectEdge",
  description: "Egyedi, gyors weboldal készítés 0 Ft induló díjjal, 14 900 Ft/hó-tól. Domain, tárhely, email továbbítás és folyamatos karbantartás egyben, rugalmas vételi opcióval.",
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
    "Mennyibe kerül a weboldal?",
    "Menedzselt bérlésben 14 900 Ft/hó-tól indulsz, 0 Ft induló díj mellett — a domain, a tárhely és a havi karbantartás mind benne van a díjban. Ha később a sajátodként szeretnéd a forráskóddal és a technikai fiókokkal együtt, a rögzített vételi opcióval bármikor megvásárolhatod."
  ],
  [
    "Mennyi idő alatt készül el?",
    "A hiánytalan brief, az első havidíj és a szükséges anyagok beérkezésétől számítva a Jelenlét oldal jellemzően 2–4 munkanap, az Üzleti 3–6 munkanap, az Egyedi 5–14 munkanap. Összetett webappnál külön ütemezést adok."
  ],
  [
    "Mi van, ha nem tetszik az irány?",
    "Az élesítés előtt megkapod a kész oldalt egy privát előnézeti linken, és ott kérsz módosítást — annyiszor, ahányszor kell, amíg jó nem lesz. Csak a jóváhagyásod után kerül ki élesbe."
  ],
  [
    "Jár céges email cím a weboldalhoz?",
    "Igen, a domainhez tartozó email címről (pl. info@cegnev.hu) díjmentesen biztosítunk automata email továbbítást a meglévő privát vagy céges fiókodba (pl. Gmail). Ha külön önálló Google Workspace vagy Microsoft 365 postafiókokat szeretnél, annak a beállításában és DNS konfigurációjában is segítünk."
  ],
  [
    "Kell hozzá saját domain és tárhely?",
    "Nem kell semmit külön venned: a .hu vagy .com domaint, az SSL-tanúsítványt és a gyors felhőtárhelyet is intézem a havidíj részeként."
  ],
  [
    "Mi van az élesítés után?",
    "A havidíj tartalmazza a folyamatos technikai felügyeletet, a 99.9%-os rendelkezésre állást, az automata biztonsági mentéseket és a csomagodhoz tartozó havi kisebb tartalmi/design módosításokat."
  ],
  [
    "Kinél lesznek a hozzáférések és ki fizeti a futtatást?",
    "A domaint, a tárhelyet és a technikai infrastruktúrát én kezelem, neked ezzel nincs adminisztrációs teendőd. Ha egyszer úgy döntesz, hogy kivásárolod az oldalt, a forráskódot és a teljes infrastruktúrát átadom a saját fiókjaidba."
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
              <a className="button primary" href="#arak">Csomagok és árak</a>
              <TransitionLink className="button spectral" href="/munkak">
                Munkáim és demók
              </TransitionLink>
            </div>
            <p className="hero-subhint">
              Vagy kezdd azonnal: <a href="#projektbrief">online projektbrief kitöltése →</a>
            </p>
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
          <TransitionLink className="button primary" href="/munkak/checky">
            Így épült a Checky
          </TransitionLink>
        </div>
        <a className="checky-card" href="https://checky.hu" rel="noreferrer" target="_blank">
          <span className="case-tag">Full-stack munka</span>
          {/* 1,25 MB PNG volt nyers <img>-ként — a főoldal legnagyobb LCP-tétele.
              A next/image automatikusan WebP/AVIF változatot és a viewporthoz
              illő méretet szolgál ki. */}
          <Image
            alt="Checky.hu weboldal referencia"
            height={1662}
            sizes="(max-width: 880px) calc(100vw - 36px), 46vw"
            src="/work/checky.png"
            width={2940}
          />
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
          <p className="micro-label">Ügyfélkapu & Egyeztetés</p>
          <h2>Nem kötelező telefonálnod.</h2>
          <p className="nc-copy">
            Az ügyfélkapun elindítod a projektet, követed a haladást, fizetsz és kérdezel — amikor
            neked kényelmes. A teljes folyamat zökkenőmentesen végigvihető írásban, kötelező értekezletek
            nélkül, de ha telefonon vagy online megbeszélésen egyeztetnél, természetesen állok rendelkezésedre.
          </p>
          <TransitionLink className="button primary" href="/ugyfelkapu">
            Indítás az ügyfélkapun
          </TransitionLink>
        </div>
        <ul className="nc-list">
          <li>Teljes folyamat írásban — vagy igény szerint gyors hívással</li>
          <li>Adatlap, státusz és fizetés egy helyen</li>
          <li>Közvetlen segítség és válaszok az ügyfélkapun</li>
        </ul>
      </section>

      <section className="price-teaser">
        <div className="section-head">
          <p className="micro-label dark">Árak</p>
          <h2>Menedzselt weboldal, 0 Ft induló díjjal.</h2>
          <p>
            A domaint, a tárhelyet, a karbantartást és a havi módosításokat mind intézem egyetlen fix havidíjért.
            Ha később a saját tulajdonodba vennéd, a forráskóddal együtt bármikor megvásárolhatod.
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

      <PublicBriefWizard />

      <AuditRequestSection />

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
