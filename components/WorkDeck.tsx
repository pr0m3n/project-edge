import { DeckImage } from "@/components/DeckImage";
import { TransitionLink } from "@/components/TransitionLink";
import { WORKS, type Work } from "@/lib/works";

/**
 * A főoldal referencia-szakasza: az ÖSSZES munka egy folyamatosan, balról
 * jobbra haladó sávban.
 *
 * Korábban perspektivikus pakli állt itt. Amíg hat-hét munka volt, olvasható
 * maradt, de húsz fölött a lapok lépcsője kifutott a képernyőből, és csak a
 * legelső lap látszott; a többi csak egérrel nyílt szét, érintőn sehogy. A
 * sávban minden munka sorra elhalad, mindegyik kártya kattintható, és
 * telefonon is ugyanígy működik.
 *
 * A lista a `lib/works.ts`-ből jön, a darabszám és a sáv sebessége is belőle
 * számolódik — új munka felvételekor ezt a fájlt nem kell hozzányúlni.
 *
 * A sáv kétszer tartalmazza a listát, hogy a végtelen futásnak ne legyen
 * varrata. A második példány a képernyőolvasók és a Tab elől el van rejtve,
 * így minden munka egyszer szerepel az akadálymentes fában.
 *
 * A képek NEM lusták: a szakasz közvetlenül a nyitókép alatt van, és a sáv
 * folyamatosan hozza be őket a képernyőre. Alacsony prioritással indulnak,
 * hogy a nyitókép képét ne előzzék meg; a `DeckImage` a még úton lévő képet
 * csillanással jelzi, és beúsztatja, amikor megérkezik.
 */

function ReelCard({ work, hidden }: { work: Work; hidden?: boolean }) {
  return (
    <a
      aria-hidden={hidden || undefined}
      className="work-reel-card"
      href={work.href}
      rel={work.external ? "noopener" : undefined}
      tabIndex={hidden ? -1 : undefined}
      target={work.external ? "_blank" : undefined}
    >
      <span className="work-reel-shot">
        <DeckImage
          alt={hidden ? "" : `${work.name} — ${work.goal}`}
          fetchPriority="low"
          height={work.height}
          loading="eager"
          sizes="(max-width: 620px) 250px, 340px"
          src={work.src}
          width={work.width}
        />
      </span>
      <span className="work-reel-label">
        <b>{work.name}</b>
        <small>{work.external ? `${work.href.replace(/^https?:\/\//, "")} ↗` : work.goal}</small>
      </span>
    </a>
  );
}

export function WorkDeck() {
  return (
    <section className="work-deck">
      <div className="work-deck-glow" aria-hidden="true" />

      <div className="work-deck-copy">
        <div>
          <p className="micro-label dark">Munkák</p>
          <h2>
            Minden munka egy <em>üzleti célra.</em>
          </h2>
        </div>
        <div className="work-deck-side">
          <p>
            Ügyvédi iroda, panzió, gyártó, utazási iroda, webshop és időpontfoglalás — köztük
            élesben futó ügyfélmunka. Bármelyikre kattintva megnyílik.
          </p>
          <TransitionLink className="button primary" href="/munkak">
            Az összes munka megnézése
          </TransitionLink>
        </div>
      </div>

      <div className="work-reel" style={{ "--n": WORKS.length } as React.CSSProperties}>
        <div className="work-reel-track">
          {WORKS.map((work) => (
            <ReelCard key={work.id} work={work} />
          ))}
          {WORKS.map((work) => (
            <ReelCard hidden key={`${work.id}-2`} work={work} />
          ))}
        </div>
      </div>
    </section>
  );
}
