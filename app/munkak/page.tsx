import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

const capabilities = [
  {
    cls: "cap-aurora",
    eyebrow: "Háttér / motion",
    title: "Élő aurora háttér",
    copy: "Lágyan mozgó színátmenetek, amelyek karaktert adnak anélkül, hogy elvonnák a figyelmet a szövegről.",
    demo: null
  },
  {
    cls: "cap-tilt",
    eyebrow: "Interakció",
    title: "3D dőlés hoverre",
    copy: "Vidd fölé az egered. A kártyák térbe fordulnak — apró részlet, ami prémium érzetet ad.",
    demo: <div className="cap-chip" aria-hidden="true" />
  },
  {
    cls: "cap-spotlight",
    eyebrow: "Kurzor-effekt",
    title: "Reflektorfény",
    copy: "A fény követi az egeret az egész oldalon. Mozgasd a kurzort ezen a kártyán.",
    demo: null
  },
  {
    cls: "cap-gtext",
    eyebrow: "Tipográfia",
    title: "Animált szövegszín",
    copy: "Folyamatosan áramló színátmenet a kiemelt címeken.",
    demo: <div className="cap-big">Edge.</div>
  },
  {
    cls: "cap-glow",
    eyebrow: "Hangsúly",
    title: "Pulzáló fény",
    copy: "Finom, ismétlődő glow, ami a fontos pontokra húzza a szemet.",
    demo: <div className="cap-orb" aria-hidden="true" />
  },
  {
    cls: "cap-marq",
    eyebrow: "Mozgó sáv",
    title: "Végtelen futószalag",
    copy: "Logók, kulcsszavak vagy ajánlatok folyamatos mozgásban.",
    demo: (
      <div className="cap-strip">
        <span>GYORS · EGYEDI · MEGBÍZHATÓ · GYORS · EGYEDI · MEGBÍZHATÓ ·&nbsp;</span>
      </div>
    )
  }
];

const voices = [
  {
    feature: true,
    quote:
      "Korábban három cégtől kértem árajánlatot, mind WordPress sablont tolt volna. Patrik egy teljesen egyedi oldalt rakott össze, és menet közben végig láttam, hol tart. Két hét alatt élesben volt.",
    name: "Kovács Dániel",
    role: "ügyvezető · Danubia Kft.",
    initials: "KD"
  },
  {
    feature: false,
    quote:
      "A régi oldalunk lassú volt és senki nem írt róla. Az új betöltés szinte azonnali, és tényleg jönnek a megkeresések.",
    name: "Szabó Réka",
    role: "tulajdonos · Réka Stúdió",
    initials: "SZR"
  },
  {
    feature: false,
    quote:
      "Nem kellett emailben kergetnem semmit. Az ügyfélkapun láttam a státuszt, és pár kattintással fizettem. Profi élmény.",
    name: "Nagy Bence",
    role: "alapító · BN Consulting",
    initials: "NB"
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
            Ezek nem képek — élő elemek, itt a böngésződben. Pont ezekből rakom össze azt a
            karaktert, amitől egy oldal emlékezetes marad.
          </p>
        </div>
        <p className="cap-hint">← Húzd oldalra a kártyákat →</p>
        <div className="cap-rail">
          {capabilities.map((cap) => (
            <article className={`cap-card ${cap.cls}`} key={cap.title}>
              <span className="cap-eyebrow">{cap.eyebrow}</span>
              <h3>{cap.title}</h3>
              <p>{cap.copy}</p>
              {cap.demo ? <div className="cap-demo">{cap.demo}</div> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="voices-section">
        <div className="section-head">
          <p className="micro-label dark">Vélemények</p>
          <h2>Akiknek már építettem.</h2>
        </div>
        <div className="voices-grid">
          {voices.map((voice) => (
            <article className={`voice-card ${voice.feature ? "feature" : ""}`} key={voice.name}>
              <div className="voice-stars" aria-label="5 csillag">★★★★★</div>
              <blockquote>{voice.quote}</blockquote>
              <div className="voice-author">
                <div className="voice-avatar" aria-hidden="true">
                  {voice.initials}
                </div>
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
        <Link className="button primary" href="/ugyfelkapu">
          Beszéljünk róla
        </Link>
      </section>
    </main>
  );
}
