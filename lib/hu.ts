/**
 * Magyar nyelvi segédfüggvények futásidőben behelyettesített szavakhoz.
 *
 * A JSX-ben leírt `a {plan.name}` mintából „a Üzleti", „a Egyedi" és
 * „a info@projectedge.hu" lett — a névelő ugyanis a MÖGÖTTE álló szó
 * kezdőhangjától függ, azt viszont csak futásidőben ismerjük.
 */

const VOWELS = "aáeéiíoóöőuúüű";

/**
 * A határozott névelő („a" vagy „az") egy szó elé.
 *
 * Csak betűvel kezdődő szavakra megbízható. Számokra szándékosan nem
 * próbálkozik: ott a névelő attól függ, hogyan olvassuk ki a teljes számot
 * („az ötezer", de „a hatezer"), amit a puszta számjegy nem árul el.
 */
export function huArticle(word: string) {
  const first = word.trim().charAt(0).toLowerCase();
  return VOWELS.includes(first) ? "az" : "a";
}

/** Névelő + szó egyben: `withArticle("Üzleti")` → „az Üzleti". */
export function withArticle(word: string) {
  return `${huArticle(word)} ${word}`;
}
