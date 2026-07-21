import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { EffectsRail } from "@/components/EffectsRail";

const capabilities = [
  {
    dark: true,
    fx: "fx-aurora",
    eyebrow: "Háttér / motion",
    title: "Aurora háttér",
    copy: "Lágyan mozgó színátmenetek, amelyek karaktert adnak — finoman, a szöveg zavarása nélkül.",
    stage: null
  },
  {
    dark: false,
    fx: "fx-tilt",
    eyebrow: "Interakció",
    title: "3D mélység",
    copy: "Vidd fölé az egered: a kártya térbe fordul, az elemei rétegekben mozognak.",
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
    copy: "Folyamatosan átsuhanó fénypászta egy finom pontrácson.",
    stage: null
  },
  {
    dark: false,
    fx: "fx-gtext",
    eyebrow: "Tipográfia",
    title: "Élő gradiens cím",
    copy: "Áramló színátmenet a kiemelt szavakon, folyamatos mozgásban.",
    stage: <span className="gword">Edge.</span>
  },
  {
    dark: true,
    fx: "fx-glow",
    eyebrow: "Hangsúly",
    title: "Fénygyűrűk",
    copy: "Pulzáló fény, ami a fontos pontokra húzza a szemet.",
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
    copy: "Lassan forgó, színes fénykeret egy sötét kártya körül.",
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
      "Egyedi kód sablon helyett, és menet közben végig látod, hol tart a projekt. Nincs feketedoboz — az ügyfélkapun bármikor megnézed a státuszt és a következő lépést.",
    name: "Átlátható munka",
    role: "tervezéstől az indításig"
  },
  {
    feature: false,
    quote:
      "Gyors, mobilbarát oldal, ami tényleg segít megtalálni téged — nem csak szép, hanem a megkeresésekre optimalizált.",
    name: "Eredményre tervezve",
    role: "sebesség + ügyfélszerzés"
  },
  {
    feature: false,
    quote:
      "Hívás és emailezgetés nélkül: az ügyfélkapun indítod a projektet, követed a haladást és pár kattintással fizetsz.",
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
        <h1>
          Nem csak <span className="gradient-text">szép</span>. Bizonyítottan működik.
        </h1>
        <p>
          Egy jó munka mögött ott a probléma, a döntés és az eredmény. Itt megmutatom a legutóbbi
          projektet részletesen — és pár olyan effektet, amit a saját oldaladba is be tudok építeni.
        </p>
      </section>

      <section className="case-study">
        <p className="micro-label dark">Esettanulmány / Checky.hu</p>
        <a href="https://checky.hu" rel="noreferrer" target="_blank">
          <img alt="Checky.hu weboldal referencia" className="case-shot" src="/work/checky.png" />
        </a>
        <div className="case-grid">
          <article className="case-block">
            <span>A helyzet</span>
            <p>
              A Checky-nek nem egy egyszerű bemutatkozó oldal kellett, hanem egy teljes működő
              rendszer: felhasználói felület, háttér-logika, adatkezelés és a bonyolultabb üzleti
              folyamatok kezelése.
            </p>
          </article>
          <article className="case-block">
            <span>A megoldás</span>
            <p>
              Egy kézben raktam össze a teljes stacket — frontend, backend, adatfolyamok és üzleti
              logika. Next.js alapokon, gyors betöltésre és későbbi bővíthetőségre tervezve.
            </p>
          </article>
          <article className="case-block">
            <span>Az eredmény</span>
            <p>
              Egy stabil, gyors rendszer, ami a komplex működést is elbírja — nem egy sablon, amit
              fél év múlva újra kell kezdeni.
            </p>
          </article>
        </div>
        <div className="case-metrics">
          <div className="case-metric">
            <strong>100%</strong>
            <span>egyedi kód, sablon nélkül</span>
          </div>
          <div className="case-metric">
            <strong>&lt;1s</strong>
            <span>tipikus betöltési idő</span>
          </div>
          <div className="case-metric">
            <strong>1</strong>
            <span>kéz: frontend + backend</span>
          </div>
        </div>
      </section>

      <section className="cap-section">
        <div className="section-head">
          <p className="micro-label dark">Mire vagyok képes</p>
          <h2>Effektek, amiket az oldaladba építhetek.</h2>
          <p>
            Ezek nem képek — élő, mozgó elemek, itt a böngésződben. Pont ezekből rakom össze azt a
            karaktert, amitől egy oldal emlékezetes marad.
          </p>
        </div>
        <EffectsRail capabilities={capabilities} />
        <p className="cap-note">
          Ezek csak <b>példák</b> — a te oldaladhoz pont olyan effekteket és animációkat építek,
          amilyet a márkád megkíván. Sokkal többre vagyok képes, mint ami ide kifér.
        </p>
      </section>

      <section className="voices-section">
        <div className="section-head">
          <p className="micro-label dark">Mire számíthatsz</p>
          <h2>Amit egy közös munkában kapsz.</h2>
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
        <h2>Ha van egy ötleted vagy meglévő oldalad, abból már el lehet indulni.</h2>
        <TransitionLink className="button primary" href="/ugyfelkapu">
          Beszéljünk róla
        </TransitionLink>
      </section>
    </main>
  );
}
