import Link from "next/link";
import { ModelViewer } from "@/components/ModelViewer";
import { ScrollScene } from "@/components/ScrollScene";
import { SiteNav } from "@/components/SiteNav";

const paths = [
  {
    href: "/szolgaltatasok",
    eyebrow: "01 / Mit kapsz",
    title: "Weboldal, ajánlatkérő rendszer, admin felület.",
    copy: "Nem sablonos bemutatkozó oldal, hanem olyan digitális rendszer, ami bizalmat épít és érdeklődőket hoz."
  },
  {
    href: "/folyamat",
    eyebrow: "02 / Hogyan dolgozunk",
    title: "Stratégia után design. Design után rendszer.",
    copy: "Világos döntési pontok, gyors iterációk, mérhető célok és tiszta indulási terv."
  },
  {
    href: "/ajanlatkeres",
    eyebrow: "03 / Indítás",
    title: "Mondd el, mit építsünk, és kapsz egy irányt.",
    copy: "Az ajánlatkérő már lead-kezelő rendszerbe érkezik, hogy a projekt ne chatüzenetek között vesszen el."
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
              Prémium weboldalakat, ajánlatkérő folyamatokat és ügyfélkezelő admin rendszereket
              építek olyan vállalkozásoknak, akik komolyabb online jelenlétet akarnak, nem még egy
              átlagos landing page-et.
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

      <section className="route-section">
        <div className="route-intro">
          <p className="micro-label dark">Válassz belépési pontot</p>
          <h2>Nem kell mindent egy oldalon eldöntened.</h2>
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
          <h2>Az oldalnak legyen saját világa, ne csak szekciói.</h2>
          <p>
            A mozgás és a 3D nem öncélú dísz: segít megkülönböztetni a márkát, emlékezetesebbé
            teszi az első benyomást, és prémiumabb digitális környezetet ad.
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
          <span className="orbit-dot" />
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
          <span>ProjectEdge elv</span>
          <h2>A jó weboldal nem dekoráció. Ügyfélszerző infrastruktúra.</h2>
          <Link className="button secondary" href="/folyamat">
            Nézd meg a folyamatot
          </Link>
        </article>
      </section>
    </main>
  );
}
