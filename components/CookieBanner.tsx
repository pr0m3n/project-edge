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
    const openSettings = () => setVisible(true);
    window.addEventListener("projectedge:open-cookie-settings", openSettings);

    // Az első döntés kérése csak GÖRGETÉS UTÁN jelenik meg. Az első
    // képernyőn a banner pont a hero gombját és árát takarta — telefonon
    // teljesen. Aki görget, az már látta, mit kínálunk; döntés nélkül pedig
    // a mérés alapból ki van kapcsolva, tehát a késleltetés nem jogi kérdés.
    let removeScroll: (() => void) | null = null;
    if (readConsent() === null) {
      const threshold = () => window.innerHeight * 0.35;
      const onScroll = () => {
        if (window.scrollY < threshold()) return;
        setVisible(true);
        removeScroll?.();
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      removeScroll = () => {
        window.removeEventListener("scroll", onScroll);
        removeScroll = null;
      };
      // Horgonnyal (pl. /#arak) érkezve már görgetett állapotban vagyunk.
      onScroll();
    }

    return () => {
      window.removeEventListener("projectedge:open-cookie-settings", openSettings);
      removeScroll?.();
    };
  }, []);

  function decide(choice: ConsentChoice) {
    storeConsent(choice);
    applyConsent(choice);
    window.dispatchEvent(new Event("projectedge:consent-changed"));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div aria-live="polite" className="cookie-banner" role="dialog" aria-label="Süti beállítások">
      {/* Rövid szöveg: minden fölösleges sor a tartalmat takarja. A részletek
          egy kattintásra vannak, és a döntés bármikor módosítható a láblécből. */}
      <div className="cookie-copy">
        <strong>Sütik a méréshez</strong>
        <p>
          A működéshez szükségesek mindig aktívak. A statisztikai és hirdetési sütikhez a te
          engedélyed kell. <Link href="/adatkezeles">Részletek</Link>
        </p>
      </div>
      <div className="cookie-actions">
        <button className="cookie-ghost" onClick={() => decide("denied")} type="button">
          Csak a szükséges
        </button>
        <button className="cookie-accept" onClick={() => decide("granted")} type="button">
          Elfogadom
        </button>
      </div>
    </div>
  );
}
