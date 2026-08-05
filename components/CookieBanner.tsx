"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type ConsentChoice,
  applyConsent,
  measurementEnabled,
  readConsent,
  storeConsent
} from "@/lib/analytics";

/**
 * Süti-hozzájárulás. Csak akkor jelenik meg, ha van bekötött mérés — ha nincs
 * GA4/Ads azonosító, nem is használunk hozzájárulás-köteles sütit, tehát
 * kérdezni sincs mit.
 */
export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!measurementEnabled) return;
    if (readConsent() === null) setVisible(true);
  }, []);

  function decide(choice: ConsentChoice) {
    storeConsent(choice);
    applyConsent(choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div aria-live="polite" className="cookie-banner" role="dialog" aria-label="Süti beállítások">
      <div className="cookie-copy">
        <strong>Sütiket használnánk a méréshez.</strong>
        <p>
          A működéshez szükséges sütik mindig aktívak. A statisztikai és hirdetési sütikhez a te
          engedélyed kell — ezekből látom, mi működik az oldalon. Bármikor meggondolhatod magad.{" "}
          <Link href="/adatkezeles">Részletek</Link>
        </p>
      </div>
      <div className="cookie-actions">
        <button className="cookie-ghost" onClick={() => decide("denied")} type="button">
          Csak a szükségesek
        </button>
        <button className="cookie-accept" onClick={() => decide("granted")} type="button">
          Rendben, elfogadom
        </button>
      </div>
    </div>
  );
}
