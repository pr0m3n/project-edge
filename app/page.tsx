import { ModelViewer } from "@/components/ModelViewer";
import { TransitionLink } from "@/components/TransitionLink";
import { ScrollScene } from "@/components/ScrollScene";
import { SiteNav } from "@/components/SiteNav";
import { PriceEstimator } from "@/components/PriceEstimator";

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

const metrics = ["Vercel", "Supabase", "Next.js", "CRM-ready"];

const proof = [
  "100% egyedi kód",
  "Next.js + Supabase",
  "<1s betöltés",
  "Frontend + backend egy kézben",
  "Ügyfélkapu és admin háttér",
  "2 naptól 4 hétig, mérettől függően"
];

const faqs = [
  [
    "Mennyibe kerül egy weboldal?",
    "50 000 Ft-tól indulnak az áraim, és a legtöbb piaci szereplőnél olcsóbban dolgozom. A pontos árat mindig a brief alapján adom meg — a fenti csúszkával te is meg tudod becsülni, kb. mire számíthatsz."
  ],
  [
    "Mennyi idő alatt készül el?",
    "Nem dolgozom rajta a szükségesnél tovább: egy kisebb, egyszerű oldal akár 1–2 nap alatt kész, egy összetettebb, egyedi rendszer pár hét. A pontos időt a terjedelem és a bonyolultság határozza meg."
  ],
  [
    "Mi van, ha nem tetszik az irány?",
    "Először egy vizuális irányt kapsz, mielőtt bármit véglegesítenénk. Ott módosítunk, amíg jó nem lesz — nem a végén derül ki, hogy nem ezt szeretted volna."
  ],
  [
    "Kell hozzá saját domain és tárhely?",
    "Ha van, bekötöm. Ha nincs, segítek beszerezni. A tárhely modern, gyors (Vercel), és a beállításokat én intézem."
  ],
  [
    "Mi van a leszállítás után?",
    "Indulás után megnézem, hogyan viselkedik az oldal, és javítok azon, ami a valós használatban látszik. Igény szerint havi karbantartás is kérhető."
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
            <h1>
              <span>Weboldal,</span>
              <span>ami nem csak</span>
              <span className="outlined">szép.</span>
              <span>Dolgozik.</span>
            </h1>
            <p className="hero-lead">
              Olyan weboldalakat építek, ahol a látvány, a szöveg és az ügyfélszerzés egy irányba
              dolgozik. Ha már van oldalad, rendbe rakom. Ha nincs, felépítem úgy, hogy ne kelljen
              fél év múlva újrakezdeni.
            </p>
            <div className="hero-command">
              <TransitionLink className="button primary" href="/ugyfelkapu">
                Projekt indítása
              </TransitionLink>
              <TransitionLink className="button spectral" href="/munkak">
                Munkáim megnézése
              </TransitionLink>
            </div>
          </div>
          <div className="hero-visual-stack">
            <ModelViewer
              alt="3D laptop modell ProjectEdge weboldal vizuálhoz"
              className="model-frame laptop-model"
              exposure="1.25"
              src="/models/laptop_v2.glb"
            />
            <ScrollScene />
          </div>
        </div>
      </section>

      <section className="signal-strip" aria-label="Technológiai alapok">
        {metrics.map((metric) => (
          <span key={metric}>{metric}</span>
        ))}
      </section>

      <section className="proof-marquee" aria-label="Ügyfél-visszajelzések">
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
          <p className="micro-label dark">Válassz belépési pontot</p>
          <h2>Nézd meg külön, ami most érdekel.</h2>
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
          <div className="founder-name">
            <span className="founder-tag">// ProjectEdge</span>
            <span className="founder-hi">
              Szia, <span className="founder-wave" aria-hidden="true">👋</span>
            </span>
            <b>Patrik vagyok.</b>
          </div>
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
          <p>
            A modern eszközök (Next.js, Supabase, AI-támogatott munkamenet) miatt gyors vagyok. De a
            minőséget nem az AI adja, hanem hogy minden sort átnézek és érdekel a vállalkozásod.
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
          <h2>Hívás és emailezgetés nélkül, az elejétől a végéig.</h2>
          <p className="nc-copy">
            Nem kell időpontot egyeztetni, telefonálgatni vagy e-mailekben kutakodni. Az
            ügyfélkapun elindítod a projektet, kitöltöd a briefet, követed a haladást, fizetsz és
            kérdezel — akkor, amikor neked kényelmes. A teljes weboldal online elintézhető.
          </p>
          <TransitionLink className="button primary" href="/ugyfelkapu">
            Indítás az ügyfélkapun
          </TransitionLink>
        </div>
        <ul className="nc-list">
          <li>Nincs kötelező telefonhívás</li>
          <li>Nincs időpont-egyeztetés</li>
          <li>Minden egy helyen: brief, státusz, fizetés</li>
          <li>Kérdés bármikor, ticketen</li>
          <li>A saját idődben haladsz</li>
        </ul>
      </section>

      <section className="price-teaser">
        <div className="section-head">
          <p className="micro-label dark">Árak</p>
          <h2>Nem nagy sávok — próbáld ki, mennyibe kerülne a tiéd.</h2>
          <p>
            50 000 Ft-tól indulnak az áraim, jellemzően olcsóbban a piaci átlagnál. Válaszd ki, mihez
            hasonlót szeretnél, és a csúszkával pontosítsd — azonnal látod a hozzávetőleges árat és
            átfutási időt.
          </p>
        </div>
        <PriceEstimator />
      </section>

      <section className="orbit-section">
        <div className="orbit-copy">
          <p className="micro-label">3D / Motion / Karakter</p>
          <h2>Legyen emlékezetes, de maradjon használható.</h2>
          <p>
            A mozgás és a 3D akkor működik jól, ha nem akadályozza az olvasást. Itt pont ez a cél:
            adjon karaktert, de ne vigye el a figyelmet arról, amit el akarsz mondani.
          </p>
          <TransitionLink className="button spectral" href="/munkak">
            Mire vagyok képes?
          </TransitionLink>
        </div>
        <div className="planet-stage">
          <ModelViewer
            alt="Pixel bolygó 3D modell"
            className="model-frame planet-model"
            exposure="0.9"
            src="/models/pixel_planet_trappist-1-e.glb"
          />
          <span className="orbit-line one" />
          <span className="orbit-line two" />
        </div>
      </section>

      <section className="voices-section">
        <div className="section-head">
          <p className="micro-label dark">Mire számíthatsz</p>
          <h2>Amit egy közös munkában kapsz.</h2>
        </div>
        <div className="voices-grid">
          <article className="voice-card feature">
            <blockquote>
              Egyedi kód sablon helyett, és menet közben végig látod, hol tart a projekt. Nincs
              feketedoboz: az ügyfélkapun bármikor megnézed a státuszt és a következő lépést.
            </blockquote>
            <div className="voice-author">
              <div>
                <strong>Átlátható munka</strong>
                <span>tervezéstől az indításig</span>
              </div>
            </div>
          </article>
          <article className="voice-card">
            <blockquote>
              Gyors, mobilbarát oldal, ami tényleg segít megtalálni téged — nem csak szép, hanem a
              megkeresésekre optimalizált.
            </blockquote>
            <div className="voice-author">
              <div>
                <strong>Eredményre tervezve</strong>
                <span>sebesség + ügyfélszerzés</span>
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
