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
 * Az Ads-műveletnél a számlálás „Egy" legyen, ne „Minden": ugyanaz a látogató
 * a fejlécben és a láblécben is rákoppinthat, az viszont egy érdeklődő.
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
