import Image from "next/image";
import { TransitionLink } from "@/components/TransitionLink";

/**
 * A mintaprojektek választós nézete a `/munkak` oldalon.
 *
 * Korábban öt nagy kártya állt egymás alatt, plusz fölöttük ugyanannak az öt
 * projektnek egy külön összefoglaló sora — kétszer ugyanaz az információ, és
 * együtt akkora felület, amin nehéz volt eligazodni. Itt egyszerre EGY projekt
 * látszik nagyban; a bal oldali listából lehet váltani köztük.
 *
 * A váltás rejtett rádiógombokkal megy, nem JavaScripttel: így akkor is
 * működik, ha a szkript nem fut le, és nincs benne böngészőfüggő rész.
 */

type Demo = {
  id: string;
  index: string;
  kind: string;
  name: string;
  copy: string;
  href: string;
  src: string;
};

const DEMOS: Demo[] = [
  {
    id: "veyra",
    index: "01",
    kind: "SaaS",
    name: "Veyra",
    copy: "Termékbemutatás, dashboard felület, interaktív árazás és mozgás.",
    href: "/demo/veyra",
    src: "/work/demos/veyra.webp"
  },
  {
    id: "zamat",
    index: "02",
    kind: "Webshop",
    name: "Zamat",
    copy: "Termékvariánsok, kosár, termékoldalak és megőrzött állapot.",
    href: "/demo/zamat",
    src: "/work/demos/zamat.webp"
  },
  {
    id: "varga",
    index: "03",
    kind: "Érdeklődőszerzés",
    name: "Varga Villany",
    copy: "Helyi ügyfélszerzés, árkalkulátor, körzetellenőrzés és gyors ajánlatkérés.",
    href: "/demo/varga-villany",
    src: "/work/demos/varga-villany.webp"
  },
  {
    id: "liget",
    index: "04",
    kind: "Foglalás",
    name: "Liget Bőrstúdió",
    copy: "Prémium márka és teljes, több lépéses időpontfoglalási folyamat.",
    href: "/demo/liget-borstudio",
    src: "/work/demos/liget-borstudio.webp"
  },
  {
    id: "budai",
    index: "05",
    kind: "Katalógus",
    name: "Budai Otthonok",
    copy: "Szűrés, mentés, részletes adatlap, hitelbecslés és érdeklődés.",
    href: "/demo/budai-otthonok",
    src: "/work/demos/budai-otthonok.webp"
  }
];

export function DemoPicker() {
  return (
    <section className="demo-picker">
      {DEMOS.map((demo, index) => (
        <input
          className="demo-picker-switch"
          defaultChecked={index === 0}
          id={`demo-${demo.id}`}
          key={`switch-${demo.id}`}
          name="demo-picker"
          type="radio"
        />
      ))}

      <div className="section-head">
        <p className="micro-label dark">Mintaprojektek</p>
        <h2>Öt teljes oldal, végigkattintható.</h2>
        <p>
          A márkák kitaláltak, a felületek és az interakciók viszont működnek. Válaszd azt, amelyik a
          te üzleti célodhoz áll a legközelebb.
        </p>
      </div>

      <div className="demo-picker-body">
        <nav aria-label="Mintaprojekt választása" className="demo-picker-list">
          {DEMOS.map((demo) => (
            <label className="demo-picker-tab" htmlFor={`demo-${demo.id}`} key={`tab-${demo.id}`}>
              <span className="demo-picker-num">{demo.index}</span>
              <span className="demo-picker-meta">
                <b>{demo.name}</b>
                <small>{demo.kind}</small>
              </span>
              <span aria-hidden="true" className="demo-picker-caret">
                →
              </span>
            </label>
          ))}
        </nav>

        <div className="demo-picker-stage">
          {DEMOS.map((demo) => (
            <figure className={`demo-picker-panel panel-${demo.id}`} key={`panel-${demo.id}`}>
              <TransitionLink className="demo-picker-shot" href={demo.href}>
                <Image
                  alt={`${demo.name} — ${demo.kind} mintaprojekt előnézete`}
                  height={900}
                  sizes="(max-width: 900px) calc(100vw - 40px), 60vw"
                  src={demo.src}
                  width={1440}
                />
                <span className="demo-picker-shine" aria-hidden="true" />
              </TransitionLink>
              <figcaption>
                <p className="micro-label dark">
                  {demo.index} / {demo.kind}
                </p>
                <h3>{demo.name}</h3>
                <p>{demo.copy}</p>
                <TransitionLink className="button primary" href={demo.href}>
                  Megnézem élőben
                </TransitionLink>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
