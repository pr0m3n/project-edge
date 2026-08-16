/**
 * Teljes oldalújratöltéssel járó navigáció — KIZÁRÓLAG identitásváltáskor.
 *
 * Belépés, kilépés, munkamenet elvesztése és fióktörlés után szándékosan NEM
 * `router.push()`-t használunk. A kliensoldali navigáció életben hagyná a teljes
 * React-fát: a memóriában maradna az előző felhasználó betöltött projektlistája,
 * üzenetei és a Supabase kliens gyorsítótára. A teljes újratöltés az egyetlen
 * megbízható módja annak, hogy egy identitásváltás mindent eldobjon.
 *
 * A lint szabály jogos figyelmeztetés — általános navigációra tényleg a routert
 * kell használni —, ezért itt, egy helyen kapcsoljuk ki, magyarázattal, ahelyett
 * hogy tizenegy hívási helyen szórnánk el a kivételt.
 */
export function hardNavigate(path: string) {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = path;
}
