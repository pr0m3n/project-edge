import type { Metadata } from "next";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { EffectsRail } from "@/components/EffectsRail";
import { DemoPicker } from "@/components/DemoPicker";
import { WorkStrip } from "@/components/WorkStrip";

export const metadata: Metadata = {
  title: "Munkák és projektbemutatók | ProjectEdge",
  description: "Egyedi weboldalak és full-stack rendszerek bemutatása: probléma, megoldás és technikai megvalósítás.",
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

      <section className="page-hero compact with-strip">
        <p className="micro-label dark">Munkák</p>
        <h1>Nézd meg, mit építettem.</h1>
        <p>
          Egy éles full-stack rendszer és öt végigkattintható mintaprojekt — öt különböző üzleti célra.
        </p>
      </section>

      <WorkStrip />

      <section className="case-study">
        <div className="case-title-row">
          <div>
            <p className="micro-label dark">Éles full-stack rendszer / Checky.hu</p>
            <h2>Nem látványterv. Naponta használt rendszer.</h2>
          </div>
          <a className="case-live-link" href="https://checky.hu" rel="noreferrer" target="_blank">Élő oldal megnyitása ↗</a>
        </div>
        <a href="https://checky.hu" rel="noreferrer" target="_blank">
          <Image
            alt="Checky.hu weboldal referencia"
            className="case-shot"
            height={1662}
            sizes="(max-width: 1100px) calc(100vw - 36px), 1040px"
            src="/work/checky.png"
            width={2940}
          />
        </a>
        {/* Három különálló doboz helyett egy összefüggő, számozott narratíva:
            helyzet → megoldás → eredmény, összekötve. */}
        <div className="case-grid case-story">
          <article className="case-block">
            <span>A helyzet</span>
            <p>
              Nem bemutatkozó oldal kellett, hanem olyan felület, ahol a felhasználói folyamatok,
              az adatok és az üzleti logika egy rendszerben működnek.
            </p>
          </article>
          <article className="case-block">
            <span>A megoldás</span>
            <p>
              A felhasználói felülettől az adatkezelésig és a háttérfolyamatokig teljes egészében
              én terveztem és fejlesztettem a rendszert.
            </p>
          </article>
          <article className="case-block">
            <span>Az eredmény</span>
            <p>
              Egy élesben elérhető, bővíthető termék született — nem különálló oldalak, hanem
              egymásra épülő, végigvezetett folyamatok.
            </p>
          </article>
        </div>
        {/* Korábban három nagy színes tábla volt, köztük egy türkiz — kilógott
            a lap színvilágából. Most egy sáv, függőleges elválasztókkal. */}
        <div className="case-facts">
          <div className="case-fact">
            <strong>Éles</strong>
            <span>valós felhasználóknak készült rendszer</span>
          </div>
          <div className="case-fact">
            <strong>Full-stack</strong>
            <span>felület, adat és háttérfolyamat együtt</span>
          </div>
          <div className="case-fact">
            <strong>End-to-end</strong>
            <span>tervezéstől az éles indulásig</span>
          </div>
        </div>
        <div className="case-project-link-row"><TransitionLink className="button primary" href="/munkak/checky">Így épült a Checky</TransitionLink></div>
      </section>

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
