import Image from "next/image";

/**
 * Az élesben futó munkák szekciója a `/munkak` oldalon.
 *
 * Korábban EGY projekt (Checky.hu) állt itt, egy egész képernyőnyi, csak rá
 * szabott `case-*` blokkban. Az a formátum nem ismételhető: a második
 * referenciánál már aránytalan, az ötödiknél használhatatlan. Ez a szekció
 * ehelyett választós — és a MAGASSÁGA NEM FÜGG AZ ELEMSZÁMTÓL: a csempesor
 * vízszintesen görgethető, a színpad pedig mindig egy elemet mutat.
 *
 * Szándékosan más a vizuális nyelve, mint az alatta lévő mintaprojekt-
 * választóé (`DemoPicker`): sötét sáv világos lap közepén, képes csempékkel
 * választ szöveges lista helyett, és a screenshot böngészőkeretben ül. Ez a
 * két szekció két külön állítás — „valódi, futó oldal" és „bemutató" —, ezt a
 * látogatónak látnia kell anélkül, hogy elolvasná a címeket.
 *
 * A váltás rejtett rádiógombokkal megy, nem JavaScripttel. A hozzá tartozó CSS
 * ELEMSZÁM-FÜGGETLEN (`:nth-of-type` párosítás, nem beégetett ID-k), tehát új
 * referencia felvétele ebben a tömbben egyetlen sor, CSS nélkül.
 */

type LiveWork = {
  id: string;
  name: string;
  /** A böngészőkeret URL-pirulájában és a linkben is ez jelenik meg. */
  domain: string;
  /** `client` = fizető ügyfélnek épült, `own` = saját termék. A kettő nem
   *  ugyanazt bizonyítja, ezért a csempén és a panelen is jelölve van. */
  kind: "client" | "own";
  kindLabel: string;
  industry: string;
  lede: string;
  facts: string[];
  src: string;
  width: number;
  height: number;
};

const WORKS: LiveWork[] = [
  {
    id: "autoaesthetik",
    name: "Auto Aesthetik",
    domain: "autoaesthetik.hu",
    kind: "client",
    kindLabel: "Ügyfélmunka",
    industry: "Autóápolás · Sopron",
    lede:
      "Kézi autómosó és autókozmetika a Sopron Pláza mélygarázsában. Az oldal egyetlen dolgot csinál: " +
      "telefonhívássá alakítja azt, aki a keresőből érkezik.",
    facts: [
      "Kétnyelvű oldal: magyarul és németül",
      "Hívásra tervezve — a telefonszám végig kéznél van",
      "2010 óta működő vállalkozás, 41 Google értékeléssel"
    ],
    src: "/work/refs/autoaesthetik.webp",
    width: 1440,
    height: 900
  },
  {
    id: "checky",
    name: "Checky.hu",
    domain: "checky.hu",
    kind: "own",
    kindLabel: "Saját termék",
    industry: "Full-stack rendszer",
    lede:
      "Nem látványterv, hanem naponta használt rendszer. Felület, adatkezelés és háttérfolyamatok — " +
      "mind egy kézben épült, és élesben fut.",
    facts: [
      "Felület, adat és háttérfolyamat együtt",
      "Éles, valós felhasználóknak készült",
      "Tervezéstől az éles indulásig"
    ],
    src: "/work/refs/checky.webp",
    width: 1440,
    height: 814
  }
];

export function LiveWorkBand() {
  return (
    <section className="live-work">
      <div className="live-work-glow" aria-hidden="true" />

      {/* A rejtett rádiógombok FIXED pozíciójúak, nem absolute-ok — ugyanaz a
          csapda, mint a `DemoPicker`-nél: a `<label for>` fókuszálja az inputot,
          a böngésző pedig a fókuszált elemet mindig begörgeti a nézetbe, ezért
          absolute mellett minden csempekattintás felrántaná az oldalt a szekció
          tetejére. A `name` szándékosan más, mint a mintaprojekt-választóé, hogy
          a két rádiócsoport ne üsse egymást ugyanazon az oldalon. */}
      {WORKS.map((work, index) => (
        <input
          className="live-work-switch"
          defaultChecked={index === 0}
          id={`live-work-${work.id}`}
          key={`switch-${work.id}`}
          name="live-work"
          type="radio"
        />
      ))}

      <div className="live-work-head">
        <p className="micro-label">Élesben</p>
        <h2>Ami épp most is fut.</h2>
        <p>
          Ezek nem mintaprojektek: élő oldalak, valódi látogatókkal. Nyisd meg bármelyiket.
        </p>
      </div>

      <div className="live-work-body">
        <nav aria-label="Referencia választása" className="live-work-tiles">
          {WORKS.map((work) => (
            <label className="live-work-tile" htmlFor={`live-work-${work.id}`} key={`tile-${work.id}`}>
              <span className="live-work-thumb">
                <Image
                  alt=""
                  height={work.height}
                  sizes="220px"
                  src={work.src}
                  width={work.width}
                />
              </span>
              <span className="live-work-tile-meta">
                <b>{work.name}</b>
                <small>{work.kindLabel}</small>
              </span>
            </label>
          ))}
        </nav>

        <div className="live-work-stage">
          {WORKS.map((work) => (
            <figure className="live-work-panel" key={`panel-${work.id}`}>
              <a
                className="live-work-frame"
                href={`https://${work.domain}`}
                rel="noreferrer"
                target="_blank"
              >
                {/* Böngészőkeret: ez a jelzés különbözteti meg egy pillantásra a
                    futó oldalt az alatta lévő bemutatóktól. */}
                <span aria-hidden="true" className="live-work-chrome">
                  <span className="live-work-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="live-work-url">{work.domain}</span>
                </span>
                <Image
                  alt={`${work.name} — ${work.industry}`}
                  height={work.height}
                  sizes="(max-width: 900px) calc(100vw - 40px), 58vw"
                  src={work.src}
                  width={work.width}
                />
              </a>

              <figcaption>
                <span className={`live-work-badge ${work.kind}`}>{work.kindLabel}</span>
                <h3>{work.name}</h3>
                <p className="live-work-industry">{work.industry}</p>
                <p className="live-work-lede">{work.lede}</p>
                <ul className="live-work-facts">
                  {work.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
                <a
                  className="button primary"
                  href={`https://${work.domain}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Élő oldal megnyitása ↗
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
