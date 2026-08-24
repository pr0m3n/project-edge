import Image from "next/image";
import { TransitionLink } from "@/components/TransitionLink";

/**
 * A főoldal referencia-szakasza.
 *
 * Korábban EGYETLEN projektet emelt ki (Checky.hu), és az volt az egyetlen
 * bizonyíték a főoldalon. A `/munkak` oldalon viszont hat munka van — egy
 * valódi full-stack rendszer és öt mintaprojekt, öt különböző iparágra. Ez a
 * szakasz mindet megmutatja egyszerre, perspektivikus pakliban, és a
 * gyűjtőoldalra visz: az „ért hozzá és sokfélét csinált" üzenet erősebb, mint
 * egyetlen kiragadott példa.
 *
 * A pakli tiszta CSS-sel legyeződik szét — nincs JS, nincs böngészőfüggő
 * szűrő. Érintőn a `:hover` nem sül el, ezért ott a nyugalmi állapot is
 * olvasható marad: minden kártya címkéje látszik.
 */

type Work = {
  name: string;
  goal: string;
  src: string;
  width: number;
  height: number;
};

const WORKS: Work[] = [
  { name: "Checky.hu", goal: "Full-stack rendszer", src: "/work/checky.png", width: 2940, height: 1662 },
  { name: "Veyra", goal: "SaaS + dashboard", src: "/work/demos/veyra.webp", width: 1440, height: 900 },
  { name: "Zamat", goal: "Webshop + kosár", src: "/work/demos/zamat.webp", width: 1440, height: 900 },
  { name: "Budai Otthonok", goal: "Ingatlan + kereső", src: "/work/demos/budai-otthonok.webp", width: 1440, height: 900 },
  { name: "Liget Bőrstúdió", goal: "Időpontfoglalás", src: "/work/demos/liget-borstudio.webp", width: 1440, height: 900 },
  { name: "Varga Villany", goal: "Érdeklődőszerzés", src: "/work/demos/varga-villany.webp", width: 1440, height: 900 }
];

export function WorkDeck() {
  return (
    <section className="work-deck">
      <div className="work-deck-glow" aria-hidden="true" />

      <div className="work-deck-copy">
        <p className="micro-label dark">Munkák</p>
        <h2>
          Hat munka, <em>öt iparág.</em>
        </h2>
        <p>
          Egy éles, működő full-stack rendszer és öt mintaprojekt: webshop kosárral,
          időpontfoglalás, dashboard, ingatlankereső és érdeklődőszerző oldal. Mindegyiket meg
          tudod nyitni és végig tudod kattintani.
        </p>
        <TransitionLink className="button primary" href="/munkak">
          Az összes munka megnézése
        </TransitionLink>
        <dl className="work-deck-stats">
          <div>
            <dt>6</dt>
            <dd>végigkattintható projekt</dd>
          </div>
          <div>
            <dt>5</dt>
            <dd>különböző iparág</dd>
          </div>
          <div>
            <dt>1</dt>
            <dd>ember, a tervtől a kódig</dd>
          </div>
        </dl>
      </div>

      <TransitionLink aria-label="Munkák és projektbemutatók megnyitása" className="work-deck-stack" href="/munkak">
        {WORKS.map((work, index) => (
          <span className="work-deck-card" key={work.src} style={{ "--i": index } as React.CSSProperties}>
            <Image
              alt={`${work.name} — ${work.goal}`}
              height={work.height}
              sizes="(max-width: 980px) calc(100vw - 40px), 46vw"
              src={work.src}
              width={work.width}
            />
            <span className="work-deck-label">
              <b>{work.name}</b>
              <small>{work.goal}</small>
            </span>
          </span>
        ))}
        <span aria-hidden="true" className="work-deck-hint">
          Vidd fölé — a pakli szétnyílik
        </span>
      </TransitionLink>
    </section>
  );
}
