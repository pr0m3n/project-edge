import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { EffectsRail } from "@/components/EffectsRail";
import { DemoPicker } from "@/components/DemoPicker";
import { LiveWorkBand } from "@/components/LiveWorkBand";

export const metadata: Metadata = {
  title: "Munkák és projektbemutatók | ProjectEdge",
  description: "Élesben futó ügyfélmunkák és végigkattintható mintaprojektek: mit építek, kinek, és hogyan néz ki használat közben.",
  alternates: { canonical: "/munkak" }
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
      "Kényelmes folyamat: az ügyfélkapun indítod a projektet, követed a haladást és fizetsz. Felesleges körök és kötelező értekezletek nélkül.",
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
          Élesben futó oldalak valódi ügyfeleknek, és öt végigkattintható mintaprojekt — öt különböző
          üzleti célra.
        </p>
      </section>

      <LiveWorkBand />

      <DemoPicker />

      <section className="cap-section">
        <div className="section-head">
          <p className="micro-label dark">Vizuális részletek</p>
          <h2>A működés mellé karakter is jár.</h2>
          <p>
            A jó felület először használható, aztán emlékezetes. Ezekből a finom, élő részletekből
            csak annyit használok, amennyi a márkádat erősíti.
          </p>
        </div>
        <EffectsRail capabilities={capabilities} />
        <p className="cap-note">
          Ezek példák. A tiédhez a márkádhoz illőt építek.
        </p>
      </section>

      <section className="voices-section">
        <div className="section-head">
          <p className="micro-label dark">Így dolgozom</p>
          <h2>Három vállalásom minden projektnél.</h2>
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
