"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Az „Ezt kapod" szekció látványeleme: a kész oldal RÉTEGENKÉNT épül össze,
 * ahogy a látogató végiggörget a négy tételen.
 *
 * Miért nem 3D modell: a `model-viewer` könyvtár ~1 MB, és jelenleg egyszer
 * töltődik be, lent az orbit-szakasznál. Ha ide is kerülne modell, a könyvtár
 * feljebb, korábban, telefonon töltene be — pont ott rontanánk, ahol az oldal
 * amúgy is a leghosszabb. Ez itt néhány elforgatott doboz egy `perspective`
 * konténerben: nulla extra letöltés, és a kompozitor viszi.
 *
 * A négy réteg egy-egy tételhez tartozik:
 *   01 domain, tárhely, email → az alaplap, amin az egész fut
 *   02 ügyfélkapu            → a haladást mutató panel
 *   03 előnézet, jóváhagyás  → a böngészőkeret
 *   04 kivásárlás            → a kész oldal, ami átcsúszik hozzád
 *
 * A sorokat közvetlenül figyeli, nem a `MotionVars` megjelenés-rendszerén
 * keresztül: az telefonon és érintőn szándékosan ki van kapcsolva, tehát a
 * rétegek ott sosem épülnének fel.
 */

const LAYERS = [
  { key: "base", label: "alap" },
  { key: "portal", label: "ügyfélkapu" },
  { key: "frame", label: "előnézet" },
  { key: "live", label: "kész oldal" }
];

export function DeliverStack() {
  /** Hány réteg épült be eddig. A rétegek csak felfelé kapcsolnak, nem
      villognak vissza, ha a látogató visszagörget. */
  const [built, setBuilt] = useState(0);
  const highest = useRef(0);

  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timers: number[] = [];

    /* Csökkentett mozgásnál a jelenet nem épül fel: rögtön készen áll. */
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") {
      timers.push(window.setTimeout(() => setBuilt(LAYERS.length), 0));
      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }

    /* ── Telefon ──────────────────────────────────────────────────────
       Keskeny kijelzőn a bal oszlop NEM ragadós (`position: static`), tehát a
       jelenet elgörög, mire a sorokhoz érnénk — a látogató sosem látná
       felépülni. Ott ezért saját magára figyel, és lépcsőzetesen áll össze,
       amikor megjelenik. */
    if (window.matchMedia("(max-width: 900px)").matches) {
      const host = hostRef.current;
      if (!host) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting || highest.current) return;
          LAYERS.forEach((_, index) => {
            timers.push(
              window.setTimeout(() => {
                highest.current = index + 1;
                setBuilt(index + 1);
              }, 180 + index * 260)
            );
          });
          observer.disconnect();
        },
        { threshold: 0.35 }
      );
      observer.observe(host);
      return () => {
        observer.disconnect();
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    /* ── Asztali nézet ────────────────────────────────────────────────
       A cím ragadós, tehát a jelenet végig a képernyőn marad, amíg a
       látogató végigmegy a négy tételen — minden sorhoz egy réteg. */
    const rows = Array.from(document.querySelectorAll<HTMLElement>(".deliver-row"));
    if (!rows.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = rows.indexOf(entry.target as HTMLElement);
          if (index < 0) return;
          highest.current = Math.max(highest.current, index + 1);
        });
        setBuilt(highest.current);
      },
      /* Szűk sáv a képernyő közepén: így egyszerre PONTOSAN egy sor számít.
         Tágabb küszöbnél két sor is beleférne egyszerre, és a jelenet kettőt
         lépett egyszerre az elsőnél. */
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    rows.forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, []);

  return (
    <div aria-hidden="true" className="deliver-stack" ref={hostRef}>
      <span className="deliver-stack-shadow" />
      {LAYERS.map((layer, index) => (
        <span className={`deliver-layer ${layer.key}${built > index ? " is-on" : ""}`} key={layer.key}>
          <i />
          <i />
          <i />
        </span>
      ))}
    </div>
  );
}
