/**
 * A szolgáltató ellenőrzött egyéni vállalkozói adatai egyetlen központi
 * forrásban. A személyes azonosítókat (születési adatok, anyja neve,
 * adóazonosító jel) szándékosan nem tároljuk és nem jelenítjük meg.
 */

export const PROVIDER = {
  /** Márkanév — marketing felületeken ez jelenik meg. */
  brand: "ProjectEdge",
  brandLong: "ProjectEdge Digital Build Studio",
  /** Jogilag azonosítható fél — szerződésben és impresszumban ez kell. */
  legalName: "Boczán Patrik egyéni vállalkozó",
  shortName: "Boczán Patrik e.v.",
  legalForm: "egyéni vállalkozó",
  address: "8200 Veszprém, Kard köz 1. ép.: B",
  contactName: "Boczán Patrik",
  email: "info@projectedge.hu",
  phone: "+36 20 406 4954",
  website: "projectedge.hu",
  taxNumber: "92276084-1-39",
  registrationNumber: "62666901",
  registrationAuthority: "Nemzeti Adó- és Vámhivatal · Egyéni Vállalkozók Nyilvántartása",
  statisticalNumber: "92276084-6210-231-19",
  startedAt: "2026. augusztus 9.",
  mainActivity: "621001 – Számítógépes programozás m.n.s.",
  activities: [
    "621004 – Weblap tervezése (webdizájn)",
    "631003 – Adatfeldolgozási szolgáltatás",
    "639201 – Egyéb információs szolgáltatás",
    "741201 – Grafikai tervezés, vizuális kommunikáció",
    "855902 – Informatikai oktatás",
    "731101 – Reklámtervezés, -készítés, -elhelyezés",
    "731201 – Reklámfelület ügynöki értékesítése"
  ],
  taxStatus: "Alanyi adómentes",
  invoicing: "alanyi adómentes számla"
} as const;

/** A szerződésben szereplő fél megnevezése: márkanév + azonosítható jogi adatok. */
export function providerContractParty() {
  return `${PROVIDER.legalName} (rövid megjelölés: ${PROVIDER.shortName}; székhely: ${PROVIDER.address}; EV-nyilvántartási szám: ${PROVIDER.registrationNumber}; adószám: ${PROVIDER.taxNumber}; adózási státusz: ${PROVIDER.taxStatus}; kapcsolattartó: ${PROVIDER.contactName}; e-mail: ${PROVIDER.email}; telefon: ${PROVIDER.phone})`;
}
