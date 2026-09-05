import type { ReactNode } from "react";

/**
 * Függőlegesen pörgő szólista egy fix előtag mögött.
 *
 * A mechanika a Spell UI `TextMarquee`-jából jön (MIT), de a matematikája
 * átírva: ott minden elem KÜLÖN animációt kap eltolt, negatív késleltetéssel,
 * és a körbefordulás hossza (elemszám + 1) magasság, miközben a késleltetések
 * elemszámnyi lépésre osztják a kört — a kettő nem esik egybe, ezért a lista
 * minden fordulónál egy hajszálnyit ugrik. Itt egyetlen sáv mozog, a lista
 * megduplázva, és a `-50%` PONTOSAN egy teljes lista: varrat nélkül fordul.
 *
 * Nincs benne JavaScript. A duplikátumot a képernyőolvasó elől elrejtjük, a
 * valódi felsorolás pedig `.sr-only` mondatként megy át.
 */

type WordRollProps = {
  /** A sor eleji állandó szöveg, pl. „Ezt építem". */
  prefix: ReactNode;
  words: string[];
  /** Egy szó ennyi ideig van a nézetben. */
  secondsPerWord?: number;
};

export function WordRoll({ prefix, words, secondsPerWord = 2.2 }: WordRollProps) {
  const duration = `${(words.length * secondsPerWord).toFixed(1)}s`;

  return (
    <p className="word-roll">
      <span className="word-roll-prefix">{prefix}</span>

      <span aria-hidden="true" className="word-roll-window">
        <span className="word-roll-track" style={{ animationDuration: duration }}>
          {[...words, ...words].map((word, index) => (
            <span className="word-roll-item" key={`${word}-${index}`}>
              {word}
            </span>
          ))}
        </span>
      </span>

      <span className="sr-only">{words.join(", ")}.</span>
    </p>
  );
}
