"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Izometrikus blokk-torony a /szolgaltatasok heróhoz.
 *
 * A címsor állítása („Annyit építek, amennyi kell") kap vizuális bizonyítékot:
 * a torony a látogató választása szerint nő. Szándékosan NEM 3D modell —
 * hat darab CSS-transzformált doboz ~2 KB, egy .glb 1-2 MB lenne, és ez az
 * oldal fizetett forgalmat is fogad.
 *
 * A `level` a hirdetéscsoport-választáshoz kötött: 1 = alap jelenlét,
 * 2 = többoldalas céges oldal, 3 = egyedi rendszer kikötésekkel.
 */

const BLOCKS = [
  { label: "Domain + tárhely", minLevel: 1 },
  { label: "Egyedi design", minLevel: 1 },
  { label: "Tartalom, szövegek", minLevel: 1 },
  { label: "Aloldalak, struktúra", minLevel: 2 },
  { label: "Ajánlatkérő folyamat", minLevel: 2 },
  { label: "Adatbázis, belépés", minLevel: 3 }
];

export function BuildTower({ level = 1 }: { level?: 1 | 2 | 3 }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    // Csak akkor épül fel, amikor tényleg látszik — különben a látogató
    // lemarad az egyetlen dologról, ami az egészet elmagyarázza.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const active = BLOCKS.filter((block) => block.minLevel <= level).length;

  return (
    <div className={`build-tower${visible ? " is-live" : ""}`} ref={ref} aria-hidden="true">
      <div className="tower-stage">
        <span className="tower-ground" />
        {BLOCKS.map((block, index) => (
          <span
            // A legfelső aktív blokk viszi a márkaszínt: az a „kész, látszik
            // az interneten" réteg, alatta a technikai alapok sorakoznak.
            className={`tower-block${index < active ? " on" : ""}${index === active - 1 ? " crown" : ""}`}
            key={block.label}
            style={{ "--i": index } as React.CSSProperties}
          >
            <b className="tower-face top" />
            <b className="tower-face left" />
            <b className="tower-face right" />
          </span>
        ))}
        <span className={`tower-beacon${level >= 3 ? " strong" : ""}`} />
        <span className={`tower-wire one${level >= 3 ? " on" : ""}`} />
        <span className={`tower-wire two${level >= 3 ? " on" : ""}`} />
      </div>
      <ul className="tower-legend">
        {BLOCKS.slice(0, active).map((block) => (
          <li key={block.label}>{block.label}</li>
        ))}
      </ul>
    </div>
  );
}
