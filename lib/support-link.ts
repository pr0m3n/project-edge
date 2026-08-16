/**
 * „Magic link" a support beszélgetéshez.
 *
 * A látogatói beszélgetés titka a `visitor_token`, amit eddig kizárólag a
 * localStorage őrzött — tehát a beszélgetés ahhoz az EGY böngészőhöz volt kötve,
 * amelyikben elindult. Aki a válaszértesítőt telefonon nyitotta meg, nem tudott
 * válaszolni, és az admin válasz-emailje ezt szó szerint be is vallotta.
 *
 * A token a link HASH részébe kerül (`#t=…`), nem a query stringbe. A hash-t a
 * böngésző nem küldi el a szervernek, tehát nem kerül bele a hozzáférési
 * naplókba és a Referer fejlécbe sem — ugyanaz a megfontolás, amiért az API a
 * tokent `x-visitor-token` fejlécben várja, nem query paraméterben.
 */

export const SUPPORT_RESUME_PATH = "/beszelgetes";

/** A hash-ben használt kulcs — egy helyen, hogy az író és az olvasó ne csússzon el. */
export const SUPPORT_TOKEN_HASH_KEY = "t";

/**
 * A folytatáshoz vezető abszolút útvonal (protokoll és domain nélkül).
 * A `sendProjectEdgeEmail` a relatív linket egészíti ki a nyilvános domainnel.
 */
export function supportResumePath(ticketId: string, visitorToken: string) {
  return `${SUPPORT_RESUME_PATH}/${ticketId}#${SUPPORT_TOKEN_HASH_KEY}=${encodeURIComponent(visitorToken)}`;
}
