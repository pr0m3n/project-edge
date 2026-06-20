import Link from "next/link";
import { ModelViewer } from "@/components/ModelViewer";
import { ScrollScene } from "@/components/ScrollScene";
import { SiteNav } from "@/components/SiteNav";

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
  "★★★★★ „Két hét alatt élesben volt.”",
  "100% egyedi kód",
  "★★★★★ „Végre jönnek a megkeresések.”",
  "<1s betöltés",
  "★★★★★ „Profi élmény az ügyfélkapun.”",
  "Frontend + backend egy kézben"
];

const prices = [
  ["Landing / bemutatkozó", "Egy gyors, meggyőző oldal, ha most indulsz.", "150–300e Ft"],
  ["Céges weboldal", "Több aloldal, bizalomépítés, ajánlatkérés.", "400–800e Ft"],
  ["Webes rendszer", "Belépés, admin, ügyfélkapu, automatizáció.", "800e Ft-tól"],
  ["Meglévő oldal felújítása", "WordPress vagy egyedi — megnézem, mi gátol.", "120–350e Ft"]
];

const faqs = [
  [
    "Mennyibe kerül egy weboldal?",
    "A pontos árat a brief alapján adom meg, de tájékoztató sávok: egy landing 150–300e Ft, egy komolyabb céges oldal 400–800e Ft, egyedi rendszer 800e Ft-tól. A szövegírás az árban van."
  ],
  [
    "Mennyi idő alatt készül el?",
    "A legtöbb oldal 2–4 hét. AI-támogatott munkamenettel gyorsabb vagyok a piac nagy részénél, de minden sor kódot átnézek — nem sablonból dolgozom."
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
              <Link className="button primary" href="/ugyfelkapu">
                Projekt indítása
              </Link>
              <Link className="button spectral" href="/munkak">
                Munkáim megnézése
              </Link>
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
          <Link className="button primary" href="/munkak">
            Esettanulmány megnézése
          </Link>
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
            <Link className="route-tile" href={path.href} key={path.href}>
              <span>{path.eyebrow}</span>
              <h3>{path.title}</h3>
              <p>{path.copy}</p>
              <strong>Megnyitás</strong>
            </Link>
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
            <strong>Boczán Patrik</strong>
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

      <section className="price-teaser">
        <div className="section-head">
          <p className="micro-label dark">Árak</p>
          <h2>Átlátható nagyságrendek, nem rejtett tételek.</h2>
          <p>
            Tájékoztató sávok a magyar piacon. A pontos ajánlatot a projekt terjedelme alapján adom
            meg — ezért kezdünk mindig egy rövid brieffel.
          </p>
        </div>
        <div className="price-rows">
          {prices.map(([title, desc, price]) => (
            <div className="price-row" key={title}>
              <strong>{title}</strong>
              <span>{desc}</span>
              <b>{price}</b>
            </div>
          ))}
        </div>
      </section>

      <section className="orbit-section">
        <div className="orbit-copy">
          <p className="micro-label">3D / Motion / Karakter</p>
          <h2>Legyen emlékezetes, de maradjon használható.</h2>
          <p>
            A mozgás és a 3D akkor működik jól, ha nem akadályozza az olvasást. Itt pont ez a cél:
            adjon karaktert, de ne vigye el a figyelmet arról, amit el akarsz mondani.
          </p>
          <Link className="button spectral" href="/munkak">
            Mire vagyok képes?
          </Link>
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
          <p className="micro-label dark">Vélemények</p>
          <h2>Amit az ügyfeleim mondanak.</h2>
        </div>
        <div className="voices-grid">
          <article className="voice-card feature">
            <div className="voice-stars" aria-label="5 csillag">★★★★★</div>
            <blockquote>
              Korábban három cégtől kértem árajánlatot, mind sablont tolt volna. Patrik egy
              teljesen egyedi oldalt rakott össze, és menet közben végig láttam, hol tart. Két hét
              alatt élesben volt.
            </blockquote>
            <div className="voice-author">
              <div className="voice-avatar" aria-hidden="true">KD</div>
              <div>
                <strong>Kovács Dániel</strong>
                <span>ügyvezető · Danubia Kft.</span>
              </div>
            </div>
          </article>
          <article className="voice-card">
            <div className="voice-stars" aria-label="5 csillag">★★★★★</div>
            <blockquote>
              A régi oldalunk lassú volt és senki nem írt róla. Az új betöltés szinte azonnali, és
              tényleg jönnek a megkeresések.
            </blockquote>
            <div className="voice-author">
              <div className="voice-avatar" aria-hidden="true">SZR</div>
              <div>
                <strong>Szabó Réka</strong>
                <span>tulajdonos · Réka Stúdió</span>
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
          <Link className="button secondary" href="/folyamat">
            Nézd meg a folyamatot
          </Link>
        </article>
      </section>
    </main>
  );
}
