import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { EffectsRail } from "@/components/EffectsRail";

export const metadata: Metadata = {
  title: "Munkák és esettanulmány | ProjectEdge",
  description: "Egyedi weboldalak és full-stack rendszerek bemutatása: probléma, megoldás és technikai megvalósítás."
};

const capabilities = [
  {
    dark: true,
    fx: "fx-aurora",
    eyebrow: "Háttér / motion",
    title: "Aurora háttér",
    copy: "Mozgó háttér, ami nem vonja el a figyelmet a szövegről.",
    stage: null
  },
  {
    dark: false,
    fx: "fx-tilt",
    eyebrow: "Interakció",
    title: "3D mélység",
    copy: "Vidd fölé az egered: a kártya megdől.",
    stage: (
      <div className="tilt-card">
        <span className="tilt-chip" />
        <span className="tilt-bar" />
        <span className="tilt-bar short" />
      </div>
    )
  },
  {
    dark: true,
    fx: "fx-scan",
    eyebrow: "Felület",
    title: "Holografikus fény",
    copy: "Fényhatás a sötét felületen.",
    stage: null
  },
  {
    dark: false,
    fx: "fx-gtext",
    eyebrow: "Tipográfia",
    title: "Élő gradiens cím",
    copy: "Színátmenet a kiemelt szavakon.",
    stage: <span className="gword">Edge.</span>
  },
  {
    dark: true,
    fx: "fx-glow",
    eyebrow: "Hangsúly",
    title: "Fénygyűrűk",
    copy: "Kiemelés, ami a gombra viszi a szemet.",
    stage: (
      <div className="glow-wrap">
        <span className="glow-core" />
        <span className="glow-ring" />
        <span className="glow-ring" />
        <span className="glow-ring" />
      </div>
    )
  },
  {
    dark: true,
    fx: "fx-border",
    eyebrow: "Keret",
    title: "Forgó gradiens-keret",
    copy: "Forgó fénykeret a kártya körül.",
    stage: (
      <div className="bcard">
        <span>Edge</span>
      </div>
    )
  }
];

const voices = [
  {
    feature: true,
    quote:
      "Nem sablonból dolgozom, és nem kell írogatnod, hogy hol tart. Belépsz, és látod, mi készült el és mi jön ezután.",
    name: "Átlátható munka",
    role: "tervezéstől az indításig"
  },
  {
    feature: false,
    quote:
      "Aki rákeres a szolgáltatásodra, megtalálja az oldalad, és két koppintással ír neked. Telefonon is.",
    name: "Eredményre tervezve",
    role: "sebesség + ügyfélszerzés"
  },
  {
    feature: false,
    quote:
      "Hívás nélkül: az ügyfélkapun indítod a projektet, követed a haladást és fizetsz.",
    name: "Kényelmes folyamat",
    role: "minden egy helyen"
  }
];

export default function WorkPage() {
  return (
    <main className="site-shell light-page">
      <SiteNav />

      <section className="page-hero compact">
        <p className="micro-label dark">Munkák</p>
        <h1>Nézd meg, mit építettem.</h1>
        <p>
          Egy valós ügyfélmunka és két végigkattintható mintaprojekt.
        </p>
      </section>

      <section className="case-study">
        <p className="micro-label dark">Valós ügyfélmunka / Checky.hu</p>
        <a href="https://checky.hu" rel="noreferrer" target="_blank">
          <img alt="Checky.hu weboldal referencia" className="case-shot" src="/work/checky.png" />
        </a>
        <div className="case-grid">
          <article className="case-block">
            <span>A helyzet</span>
            <p>
              Nem bemutatkozó oldal kellett, hanem működő rendszer: felület, háttér-logika és
              adatkezelés együtt.
            </p>
          </article>
          <article className="case-block">
            <span>A megoldás</span>
            <p>
              Egy kézben csináltam a frontendet és a backendet is, Next.js alapon — gyorsra és
              bővíthetőre.
            </p>
          </article>
          <article className="case-block">
            <span>Az eredmény</span>
            <p>
              Élesben használt rendszer, ami egy felületen fogja össze az adatokat és a
              folyamatokat.
            </p>
          </article>
        </div>
        <div className="case-metrics">
          <div className="case-metric">
            <strong>100%</strong>
            <span>egyedi kód, sablon nélkül</span>
          </div>
          <div className="case-metric">
            <strong>Full-stack</strong>
            <span>felület és háttérrendszer együtt</span>
          </div>
          <div className="case-metric">
            <strong>1</strong>
            <span>kéz: frontend + backend</span>
          </div>
        </div>
      </section>

      <section className="demos-section">
        <div className="section-head">
          <p className="micro-label dark">Mintaprojektek</p>
          <h2>Két teljes oldal, végigkattintható.</h2>
          <p>
            A márkák kitaláltak, a kód és a működés viszont éles.
          </p>
        </div>

        <div className="demos-grid">
          <article className="demo-card">
            <a className="demo-preview veyra" href="/demo/veyra">
              <span className="demo-tag">Mintaprojekt</span>
              <span className="demo-mock-window">
                <span className="demo-mock-bar">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="demo-mock-body">
                  <span className="demo-mock-title" />
                  <span className="demo-mock-line" />
                  <span className="demo-mock-line short" />
                  <span className="demo-mock-cta" />
                </span>
              </span>
            </a>
            <div className="demo-body">
              <span className="demo-kind">Landing page</span>
              <h3>Veyra — SaaS termékoldal</h3>
              <p>
                Egy foglalórendszer bemutatkozó oldala. Sötét, mozgalmas, de a szöveg marad a
                főszereplő.
              </p>
              <ul className="demo-points">
                <li>Görgetésre megjelenő szekciók, animált számlálók</li>
                <li>Interaktív árazás és GYIK</li>
                <li>Fotó nélkül, tiszta kódból rajzolt felületek</li>
              </ul>
              <a className="button ghost" href="/demo/veyra">
                Megnézem élőben
              </a>
            </div>
          </article>

          <article className="demo-card">
            <a className="demo-preview zamat" href="/demo/zamat">
              <span className="demo-tag">Mintaprojekt</span>
              <span className="demo-mock-shop">
                <span className="demo-mock-tile" />
                <span className="demo-mock-tile" />
                <span className="demo-mock-tile" />
                <span className="demo-mock-tile" />
              </span>
            </a>
            <div className="demo-body">
              <span className="demo-kind">Webáruház</span>
              <h3>Zamat — kávépörkölő webshop</h3>
              <p>
                Teljes vásárlási út: terméklista, termékoldal és működő kosár. A kosár tartalma az
                újratöltést is túléli.
              </p>
              <ul className="demo-points">
                <li>Valódi kosárlogika, variánsokkal és mennyiséggel</li>
                <li>Külön termékoldalak, kapcsolódó termékekkel</li>
                <li>Meleg, magazinos arculat — a SaaS demó ellentéte</li>
              </ul>
              <a className="button ghost" href="/demo/zamat">
                Megnézem élőben
              </a>
            </div>
          </article>
        </div>

        <p className="cap-note">
          A fizetés ezekben a demókban nincs élesítve — a te oldaladon lehet.
        </p>
      </section>

      <section className="cap-section">
        <div className="section-head">
          <p className="micro-label dark">Vizuális eszközök</p>
          <h2>Effektek, amiket az oldaladba tehetek.</h2>
          <p>
            Ezek nem képek — élő, mozgó elemek, itt a böngésződben. Pont ezekből rakom össze azt a
            karaktert, amitől egy oldal emlékezetes marad.
          </p>
        </div>
        <EffectsRail capabilities={capabilities} />
        <p className="cap-note">
          Ezek példák. A tiédhez a márkádhoz illőt építek.
        </p>
      </section>

      <section className="voices-section">
        <div className="section-head">
          <p className="micro-label dark">Mire számíthatsz</p>
          <h2>Ezt kapod tőlem.</h2>
        </div>
        <div className="voices-grid">
          {voices.map((voice) => (
            <article className={`voice-card ${voice.feature ? "feature" : ""}`} key={voice.name}>
              <blockquote>{voice.quote}</blockquote>
              <div className="voice-author">
                <div>
                  <strong>{voice.name}</strong>
                  <span>{voice.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2>Van egy ötleted vagy egy meglévő oldalad? Abból el lehet indulni.</h2>
        <TransitionLink className="button primary" href="/ugyfelkapu">
          Beszéljünk róla
        </TransitionLink>
      </section>
    </main>
  );
}
