"use client";

import Image from "next/image";
import { useId, useState } from "react";

/**
 * Húzható előtte/utána összehasonlító.
 *
 * A vezérlés egy átlátszóra állított `range` mező a képek fölött: így egérrel
 * húzható, érintéssel csúsztatható, és billentyűzetről is működik anélkül,
 * hogy külön fókuszkezelést kellene írni hozzá.
 */

type Props = {
  afterAlt: string;
  afterSrc: string;
  beforeAlt: string;
  beforeSrc: string;
};

export function BeforeAfter({ afterAlt, afterSrc, beforeAlt, beforeSrc }: Props) {
  const id = useId();
  const [split, setSplit] = useState(52);

  return (
    <figure className="fxr-ba" style={{ "--split": `${split}%` } as React.CSSProperties}>
      <div className="fxr-ba-frame">
        {/* Mindkét kép ugyanazt a teljes területet tölti ki; a felsőt clip-path
            vágja a csúszka pozíciójánál. Így a két kép mindig fedésben marad. */}
        <Image
          alt={afterAlt}
          className="fxr-ba-img"
          fill
          sizes="(max-width: 1000px) 100vw, 940px"
          src={afterSrc}
        />
        <Image
          alt={beforeAlt}
          className="fxr-ba-img is-before"
          fill
          sizes="(max-width: 1000px) 100vw, 940px"
          src={beforeSrc}
        />

        <span className="fxr-ba-tag before">Előtte</span>
        <span className="fxr-ba-tag after">Utána</span>

        <span aria-hidden="true" className="fxr-ba-handle">
          <i />
        </span>

        <label className="fxr-ba-srlabel" htmlFor={id}>
          Előtte/utána csúszka
        </label>
        <input
          className="fxr-ba-range"
          id={id}
          max={100}
          min={0}
          onChange={(event) => setSplit(Number(event.target.value))}
          type="range"
          value={split}
        />
      </div>
    </figure>
  );
}
