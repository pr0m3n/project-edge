import Image from "next/image";
import { TransitionLink } from "@/components/TransitionLink";
import { WORKS } from "@/lib/works";

/**
 * A főoldal referencia-szakasza.
 *
 * Korábban EGYETLEN projektet emelt ki (Checky.hu), és az volt az egyetlen
 * bizonyíték a főoldalon. Ez a szakasz az ÖSSZESET megmutatja egyszerre,
 * perspektivikus pakliban, és a gyűjtőoldalra visz: az „ért hozzá és sokfélét
 * csinált" üzenet erősebb, mint egyetlen kiragadott példa.
 *
 * A lista a `lib/works.ts`-ből jön, a darabszámok pedig BELŐLE számolódnak —
 * sem itt, sem a címben nincs beégetett szám, tehát új munka felvételekor ezt
 * a fájlt nem kell hozzányúlni.
 *
 * A pakli tiszta CSS-sel legyeződik szét — nincs JS, nincs böngészőfüggő
 * szűrő. Érintőn a `:hover` nem sül el, ezért ott a nyugalmi állapot is
 * olvasható marad: minden kártya címkéje látszik.
 */

export function WorkDeck() {
  return (
    <section className="work-deck">
      <div className="work-deck-glow" aria-hidden="true" />

      <div className="work-deck-copy">
        <p className="micro-label dark">Munkák</p>
        <h2>
          Minden munka egy <em>üzleti célra.</em>
        </h2>
        <p>
          Autóápolás, webshop kosárral, időpontfoglalás, dashboard, ingatlankereső és
          érdeklődőszerző oldal — köztük élesben futó ügyfélmunka. Mindegyiket meg tudod nyitni.
        </p>
        <TransitionLink className="button primary" href="/munkak">
          Az összes munka megnézése
        </TransitionLink>
        <dl className="work-deck-stats">
          <div>
            <dt>{WORKS.length}</dt>
            <dd>végigkattintható munka</dd>
          </div>
          <div>
            <dt>{new Set(WORKS.map((work) => work.goal)).size}</dt>
            <dd>különböző üzleti cél</dd>
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
