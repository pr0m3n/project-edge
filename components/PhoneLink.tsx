"use client";

import type { ReactNode } from "react";
import { trackLeadConversion } from "@/lib/analytics";
import { STUDIO_PHONE_LABEL, STUDIO_PHONE_TEL } from "@/lib/contact";

/**
 * Telefonszám-link, ami konverziót is jelent.
 *
 * A szám öt helyen jelenik meg (navigáció asztali és mobil nézetben, gyors
 * sáv, „nem kötelező telefonálnod" szakasz, lábléc). Ha az `onClick` mind az
 * ötben kézzel lenne odaírva, a hatodik megjelenésnél némán kimaradna — ezért
 * a `tel:` link mostantól CSAK ezen a komponensen keresztül készül.
 *
 * Egy koppintás nem bizonyítja, hogy a hívás létre is jött, ezért kap külön
 * `phone` konverziótípust: az Adsben így külön művelet, külön leolvasható
 * teljesítménnyel. Ha zajosnak bizonyul, egyetlen kapcsolóval kivehető a
 * licitálásból anélkül, hogy a chat vagy a brief jele sérülne.
 *
 * A link asztali gépen is működőképes marad, de ott NEM számít konverziónak:
 * a `tel:` ott jellemzően nem csinál semmit, tehát a kattintás nem érdeklődés.
 * Ugyanígy nem számít az ismételt koppintás (a szám négy helyen látszik) és az
 * admin/ügyfélkapu alatti kattintás sem. A szűrést a `trackLeadConversion`
 * végzi központilag, hogy egyetlen hívóhely se maradhasson ki belőle.
 */
export function PhoneLink({
  ariaLabel,
  children,
  className,
  onClick
}: {
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      aria-label={ariaLabel}
      className={className}
      href={`tel:${STUDIO_PHONE_TEL}`}
      onClick={() => {
        trackLeadConversion("phone");
        onClick?.();
      }}
    >
      {children ?? STUDIO_PHONE_LABEL}
    </a>
  );
}
