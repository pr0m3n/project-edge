/** A szolgáltató ellenőrzött cégadatai egyetlen központi forrásban. */

export const PROVIDER = {
  /** Márkanév — marketing felületeken ez jelenik meg. */
  brand: "ProjectEdge",
  brandLong: "ProjectEdge Digital Build Studio",
  /** Jogilag azonosítható fél — szerződésben és impresszumban ez kell. */
  legalName: '"TRADE 24" Kereskedelmi és Szolgáltató Betéti Társaság',
  shortName: '"TRADE 24" Bt.',
  legalForm: "betéti társaság",
  address: "8248 Nemesvámos, Malom utca 3.",
  contactName: "Boczán Patrik",
  email: "info@projectedge.hu",
  phone: "+36 20 406 4954",
  website: "projectedge.hu",
  taxNumber: "22303442-2-19",
  registrationNumber: "19-06-508423",
  registrationAuthority: "Veszprémi Törvényszék Cégbírósága",
  invoicing: "számla"
} as const;

/** A szerződésben szereplő fél megnevezése: márkanév + azonosítható jogi adatok. */
export function providerContractParty() {
  return `${PROVIDER.legalName} (rövid név: ${PROVIDER.shortName}; székhely: ${PROVIDER.address}; cégjegyzékszám: ${PROVIDER.registrationNumber}; adószám: ${PROVIDER.taxNumber}; kapcsolattartó: ${PROVIDER.contactName}; e-mail: ${PROVIDER.email}; telefon: ${PROVIDER.phone})`;
}
