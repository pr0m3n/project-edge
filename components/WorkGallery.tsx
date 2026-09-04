import Image from "next/image";
import { TransitionLink } from "@/components/TransitionLink";
import { WORKS, type Work } from "@/lib/works";

/**
 * A `/munkak` oldal hero-ja és munkaválasztója.
 *
 * Ez a komponens a korábbi `LiveWorkBand` + `DemoPicker` párost váltja ki. Az a
 * felállás két külön szekcióban, két külön vizuális nyelven mutatta ugyanazt a
 * hét munkát — fent kettő „élesben", lent öt „mintaprojekt" —, és a látogató
 * ebből azt olvasta ki, hogy összesen két ügyfél van. A rangsor megszűnt: egy
 * lista, egyforma súlyú elemekkel; a különbséget nem címke hordozza, hanem a
 * link (saját domain vs. `/demo/...`).
 *
 * MIÉRT VÁLASZTÓS ÉS NEM RÁCS: a rács egymás alá pakolta mind a hetet, ami
 * laposan és igénytelenül hatott. Így viszont a bal oldali listában EGYSZERRE
 * látszik az összes munka — ez maga a „sokféle dolgot csináltam" bizonyíték —,
 * a színpadon pedig mindig egy áll nagyban, rendes bemutatóként.
 *
 * MINDEN ELEMSZÁM-FÜGGETLEN. A hero csíkja, a lista és a statisztikák a
 * `lib/works.ts` tömbjéből számolódnak; nincs beégetett darabszám. A választás
 * rejtett rádiógombokkal megy (nem JS), a párosítás `:nth-of-type` alapú, és a
 * CSS 16 elemig előre le van fedve. Nyolcadik munka felvétele egyetlen
 * tömbelem — sem itt, sem a CSS-ben nincs teendő.
 */

/** A linkfelirat maga hordozza, hogy futó oldalról vagy bemutatóról van szó —
 *  címke nélkül, rangsorolás nélkül. */
function linkLabel(work: Work) {
  return work.external ? work.href.replace(/^https?:\/\//, "") : "Bemutató megnyitása";
}

export function WorkHero() {
  const goals = new Set(WORKS.map((work) => work.goal)).size;

  return (
    <section className="work-hero">
      <div className="work-hero-glow" aria-hidden="true" />

      <div className="work-hero-copy">
        <p className="micro-label">Munkák</p>
        <h1>
          Minden oldal egy <em>üzleti célra</em> épült.
        </h1>
        <p>
          Hívásszerzés, időpontfoglalás, kosár, ingatlankereső, dashboard, ajánlatkérés. Nem
          sablonok különböző színekben — külön feladatra tervezett felületek, és mindegyiket meg
          tudod nyitni.
        </p>
        <dl className="work-hero-stats">
          <div>
            <dt>{WORKS.length}</dt>
            <dd>megnyitható munka</dd>
          </div>
          <div>
            <dt>{goals}</dt>
            <dd>különböző üzleti cél</dd>
          </div>
          <div>
            <dt>1</dt>
            <dd>ember, a tervtől a kódig</dd>
          </div>
        </dl>
      </div>

      <div aria-hidden="true" className="work-hero-marquee">
        <div className="work-hero-track">
          {[...WORKS, ...WORKS].map((work, index) => (
            <span className="work-hero-shot" key={`${work.id}-${index}`}>
              <Image alt="" height={work.height} sizes="340px" src={work.src} width={work.width} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WorkGallery() {
  return (
    <section className="work-picker">
      {/* A rejtett rádiógombok FIXED pozíciójúak, nem absolute-ok, és ez nem
          kozmetika: a `<label for>` fókuszálja az inputot, a böngésző pedig a
          fókuszált elemet mindig begörgeti a nézetbe — absolute mellett minden
          választás felrántaná az oldalt a szekció tetejére. */}
      {WORKS.map((work, index) => (
        <input
          className="work-picker-switch"
          defaultChecked={index === 0}
          id={`work-${work.id}`}
          key={`switch-${work.id}`}
          name="work-picker"
          type="radio"
        />
      ))}

      <div className="work-picker-body">
        {/* Csak a ≤900px-es elrendezésben látszik, ahol a lista vízszintes
            csempesorrá lapul: ott a jobb szélen elvágott csempéből nem derül
            ki, hogy oldalra még van tartalom. Ugyanaz a fogás, mint az
            `EffectsRail` sínje fölött. Asztali nézetben `display:none`, tehát
            a kétoszlopos rácsban helyet sem foglal. */}
        <p aria-hidden="true" className="work-picker-hint">
          ← Húzd oldalra a kártyákat →
        </p>

        <nav aria-label="Munka választása" className="work-picker-list">
          {WORKS.map((work, index) => (
            <label className="work-picker-tab" htmlFor={`work-${work.id}`} key={`tab-${work.id}`}>
              <span className="work-picker-num">{String(index + 1).padStart(2, "0")}</span>
              <span className="work-picker-meta">
                <b>{work.name}</b>
                <small>{work.goal}</small>
              </span>
              <span aria-hidden="true" className="work-picker-caret">
                →
              </span>
            </label>
          ))}
        </nav>

        <div className="work-picker-stage">
          {WORKS.map((work) => {
            const label = linkLabel(work);
            const shot = (
              <>
                <Image
                  alt={`${work.name} — ${work.goal}`}
                  height={work.height}
                  sizes="(max-width: 900px) calc(100vw - 40px), 60vw"
                  src={work.src}
                  width={work.width}
                />
                <span aria-hidden="true" className="work-picker-shine" />
              </>
            );

            return (
              <figure className="work-picker-panel" key={`panel-${work.id}`}>
                {work.external ? (
                  <a
                    className="work-picker-shot"
                    href={work.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {shot}
                  </a>
                ) : (
                  <TransitionLink className="work-picker-shot" href={work.href}>
                    {shot}
                  </TransitionLink>
                )}

                <figcaption>
                  <span className="work-picker-goal">{work.goal}</span>
                  <h3>{work.name}</h3>
                  <p className="work-picker-industry">{work.industry}</p>
                  <p className="work-picker-copy">{work.copy}</p>
                  {work.external ? (
                    <a className="button primary" href={work.href} rel="noreferrer" target="_blank">
                      {label} ↗
                    </a>
                  ) : (
                    <TransitionLink className="button primary" href={work.href}>
                      {label} ↗
                    </TransitionLink>
                  )}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>

      <p className="work-gallery-note">
        A saját domainen nyíló oldalak élesben futnak. A többinél a márka kitalált, a felület és
        minden interakció viszont valódi és végigjátszható.
      </p>
    </section>
  );
}
