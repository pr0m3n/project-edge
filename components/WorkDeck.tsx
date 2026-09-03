import Image from "next/image";
import { TransitionLink } from "@/components/TransitionLink";

/**
 * A főoldal referencia-szakasza.
 *
 * Korábban EGYETLEN projektet emelt ki (Checky.hu), és az volt az egyetlen
 * bizonyíték a főoldalon. A `/munkak` oldalon viszont hét munka van — két
 * élesben futó oldal (köztük egy fizető ügyfélé) és öt mintaprojekt. Ez a
 * szakasz mindet megmutatja egyszerre, perspektivikus pakliban, és a
 * gyűjtőoldalra visz: az „ért hozzá és sokfélét csinált" üzenet erősebb, mint
 * egyetlen kiragadott példa. Az élesben futók állnak elöl.
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
  { name: "Auto Aesthetik", goal: "Éles ügyfélmunka", src: "/work/refs/autoaesthetik.webp", width: 1440, height: 900 },
  { name: "Checky.hu", goal: "Full-stack rendszer", src: "/work/refs/checky.webp", width: 1440, height: 814 },
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
          Hét munka, <em>kettő élesben.</em>
        </h2>
        <p>
          Két oldal, ami épp most is fut — köztük egy ügyfélmunka —, és öt mintaprojekt: webshop
          kosárral, időpontfoglalás, dashboard, ingatlankereső és érdeklődőszerző oldal.
          Mindegyiket meg tudod nyitni.
        </p>
        <TransitionLink className="button primary" href="/munkak">
          Az összes munka megnézése
        </TransitionLink>
        <dl className="work-deck-stats">
          <div>
            <dt>2</dt>
            <dd>élesben futó oldal</dd>
          </div>
          <div>
            <dt>5</dt>
            <dd>végigkattintható minta</dd>
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
