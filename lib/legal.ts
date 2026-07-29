/**
 * A szolgáltató jogi adatai — EGY helyen.
 *
 * Az impresszum, az ÁSZF és a vállalkozási szerződés (ügyfélkapu) ugyanezt
 * használja, így amikor a tevékenységi forma változik (pl. egyéni vállalkozás
 * vagy cég bejegyzése), egyetlen fájlt kell átírni, és nem marad ellentmondás a
 * három oldal között.
 *
 * Bejegyzés után kitöltendő: `taxNumber`, `registrationNumber`, és a `legalForm`
 * / `formNote` szövegek pontosítása.
 */

export const PROVIDER = {
  /** Márkanév — marketing felületeken ez jelenik meg. */
  brand: "ProjectEdge",
  brandLong: "ProjectEdge Digital Build Studio",
  /** Jogilag azonosítható fél — szerződésben és impresszumban ez kell. */
  legalName: "Boczán Patrik",
  legalForm: "magánszemély, jelenleg nem bejegyzett egyéni tevékenység",
  address: "Budapest, 1141",
  email: "info@projectedge.hu",
  phone: "+36 20 406 4954",
  website: "projectedge.hu",
  taxNumber: null as string | null,
  registrationNumber: null as string | null,
  /** Számlázási képesség — az ÁSZF és a szerződés is ezt hivatkozza. */
  invoicing: "nyugta/elismervény (ÁFA-s számla kiállítására jelenleg nincs lehetőség)"
} as const;

/** A szerződésben szereplő fél megnevezése: márkanév + azonosítható jogi adatok. */
export function providerContractParty() {
  return `${PROVIDER.brandLong} — ${PROVIDER.legalName} (${PROVIDER.legalForm}), ${PROVIDER.address}, ${PROVIDER.email}`;
}
