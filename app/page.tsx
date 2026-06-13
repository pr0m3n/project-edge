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
    eyebrow: "02 / Hogyan dolgozunk",
    title: "Előbb megértjük az ajánlatod, aztán jöhet a látvány.",
    copy: "Rövid egyeztetések, látható haladás, nincs felesleges kör. Mindig tudod, épp min dolgozunk."
  },
  {
    href: "/ajanlatkeres",
    eyebrow: "03 / Indítás",
    title: "Írd le pár mondatban, hol tartasz most.",
    copy: "Lehet új oldal, redesign, gyorsítás vagy csak egy jobb ajánlatkérő. Visszajelzek, merre érdemes indulni."
  }
];

const metrics = ["Vercel", "Supabase", "Next.js", "CRM-ready"];

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
              Olyan weboldalakat építek, ahol a látvány, a szöveg és az ajánlatkérés egy irányba
              dolgozik. Ha már van oldalad, rendbe rakjuk. Ha nincs, felépítjük úgy, hogy ne kelljen
              fél év múlva újrakezdeni.
            </p>
            <div className="hero-command">
              <Link className="button primary" href="/ajanlatkeres">
                Projekt indítása
              </Link>
              <Link className="button spectral" href="/szolgaltatasok">
                Rendszer megnézése
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

      <section className="featured-work">
        <div className="featured-copy">
          <p className="micro-label dark">Referencia</p>
          <h2>Checky.hu</h2>
          <p>
            A Checky.hu-nál nem csak a felület készült el. Mi raktuk össze a teljes rendszert:
            frontend, backend, adatkezelés, üzleti logika és a bonyolultabb működési folyamatok is
            egy kézben épültek.
          </p>
          <a className="button primary" href="https://checky.hu" rel="noreferrer" target="_blank">
            checky.hu megnyitása
          </a>
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

      <section className="orbit-section">
        <div className="orbit-copy">
          <p className="micro-label">3D / Motion / Karakter</p>
          <h2>Legyen emlékezetes, de maradjon használható.</h2>
          <p>
            A mozgás és a 3D akkor működik jól, ha nem akadályozza az olvasást. Itt pont ez a cél:
            adjon karaktert, de ne vigye el a figyelmet arról, amit el akarsz mondani.
          </p>
          <Link className="button spectral" href="/munkak">
            Milyen irányok lehetnek?
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
