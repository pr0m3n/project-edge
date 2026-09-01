"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Kezelésválasztó előnézettel.
 *
 * Asztali nézetben a sorok fölé érve (vagy rájuk fókuszálva) a jobb oldali nagy
 * kép átúszik az adott kezelés fotójára — a lista így nem árlista, hanem
 * végignézhető. Szűk kijelzőn nincs hover, ezért ott a kép a lista fölé kerül,
 * és koppintásra vált.
 */

export type Treatment = {
  name: string;
  time: string;
  price: string;
  copy: string;
  image: string;
  alt: string;
};

type Props = {
  onBook: (index: number) => void;
  treatments: Treatment[];
};

export function TreatmentPicker({ onBook, treatments }: Props) {
  const [active, setActive] = useState(0);

  return (
    <div className="noma-picker">
      <div className="noma-picker-stage">
        {treatments.map((item, index) => (
          <Image
            alt={item.alt}
            className={`noma-picker-shot ${index === active ? "on" : ""}`}
            fill
            key={item.name}
            sizes="(max-width: 900px) 92vw, 52vw"
            src={item.image}
          />
        ))}
      </div>

      <ul className="noma-picker-list">
        {treatments.map((item, index) => (
          <li
            className={index === active ? "on" : ""}
            key={item.name}
            onFocus={() => setActive(index)}
            onMouseEnter={() => setActive(index)}
            onPointerDown={() => setActive(index)}
          >
            <button className="noma-picker-row" onClick={() => onBook(index)} type="button">
              <span className="noma-picker-num">{`0${index + 1}`}</span>
              <span className="noma-picker-body">
                <strong>{item.name}</strong>
                <span className="noma-picker-copy">{item.copy}</span>
              </span>
              <span className="noma-picker-meta">
                <b>{item.price}</b>
                <i>{item.time}</i>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
