import Image from "next/image";
import { ShaderBackdrop } from "@/components/ShaderBackdrop";
import { WorkCarousel } from "@/components/WorkCarousel";
import { WORKS } from "@/lib/works";

/**
 * A `/munkak` oldal hero-ja és munkaválasztója.
 *
 * Ez a komponens a korábbi `LiveWorkBand` + `DemoPicker` párost váltja ki. Az a
 * felállás két külön szekcióban, két külön vizuális nyelven mutatta ugyanazokat
 * a munkákat — fent az éles oldalakat, lent a mintaprojekteket —, és a látogató
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
export function WorkHero() {
  return (
    <section className="work-hero">
      <ShaderBackdrop variant="waves" />
      <div className="work-hero-scrim" aria-hidden="true" />
      <div className="work-hero-glow" aria-hidden="true" />

      <div className="work-hero-copy">
        <p className="micro-label">Munkák</p>
        <h1>
          Minden oldal egy <em>üzleti célra</em> épült.
        </h1>
        <p>
          Hívásszerzés, időpontfoglalás, kosár, ingatlankereső és dashboard. Nem
          sablonok különböző színekben — külön feladatra tervezett felületek, és mindegyiket meg
          tudod nyitni.
        </p>
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
    <section aria-labelledby="work-carousel-title" className="work-showcase">
      <header className="work-showcase-head">
        <div>
          <p className="micro-label dark">Referenciák</p>
          <h2 id="work-carousel-title">Néhány munka <em>közelebbről.</em></h2>
        </div>
        <p>Ez csak egy válogatás. Mindegyik más feladatra készült — nézd meg azt, amelyik érdekel.</p>
      </header>

      <WorkCarousel works={WORKS} />

      <p className="work-gallery-note">
        A saját domainen nyíló oldalak élesben futnak. A többinél a márka kitalált, a felület és
        minden interakció viszont valódi és végigjátszható.
      </p>
    </section>
  );
}
