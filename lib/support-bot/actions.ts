import { WORKS } from "@/lib/works";

/**
 * Az AI-asszisztens gombjai.
 *
 * A bot nem kattintgat magától az oldalon: a válasza alá legfeljebb három
 * gombot tesz, és a látogató dönti el, rákattint-e. A gombokat a modell CSAK
 * ebből a listából választhatja, azonosító szerint — URL-t nem ír, tehát a
 * szövegéből sem külső cím, sem kitalált oldal nem kerülhet egy gombra. A
 * szerver az ismeretlen azonosítókat eldobja (`sanitizeBotActions`).
 *
 * Ez a fájl a kliensen és a szerveren is fut (a widget innen rajzolja ki a
 * gombot, a prompt innen sorolja fel a lehetőségeket), ezért nincs benne
 * semmi szerveroldali.
 *
 * ÚJ MUNKA: magától megjelenik — a munkák gombjai a `lib/works.ts`-ből
 * állnak elő.
 */

export type BotAction = {
  id: string;
  /** A gomb felirata. Rövid: telefonon két gomb is elfér egy sorban. */
  label: string;
  /** Hová visz, ha az aktuális oldalon nincs meg a horgony. */
  href: string;
  /**
   * Az elem azonosítója, amihez görgetni kell. Ha az aktuális oldalon is
   * megvan (pl. az árazó a landing oldalakon is ott van), nem navigálunk
   * el, hanem helyben odagörgetünk.
   */
  anchor?: string;
  /** Az árazó melyik nézetre álljon, mielőtt odagörgetünk. */
  pricingModel?: "subscription" | "purchase";
  /**
   * Új lapon nyílik: a demók (ott a chat el van rejtve) és az élő
   * ügyféloldalak (más domain). Így a beszélgetés itt megmarad.
   */
  newTab?: boolean;
  /** A modellnek: mikor való ez a gomb. A látogató nem látja. */
  hint: string;
};

const PAGE_ACTIONS: BotAction[] = [
  {
    id: "munkak",
    label: "Munkák megnézése",
    href: "/munkak",
    hint: "Az összes referencia és bemutató projekt egy oldalon. Ha általában kérdez a munkákról, referenciákról, portfólióról."
  },
  {
    id: "arak",
    label: "Csomagok és árak",
    href: "/#arak",
    anchor: "arak",
    hint: "Az árazó, a csomagokkal. Ha általában az árakról kérdez, és nem derül ki, bérelne vagy venne."
  },
  {
    id: "arak-vasarlas",
    label: "Árak vásárlással",
    href: "/#arak",
    anchor: "arak",
    pricingModel: "purchase",
    hint: "Az árazó egyszeri vásárlásra állítva. Ha meg akarja venni az oldalt, saját tulajdont szeretne, vagy az egyszeri árakra kíváncsi."
  },
  {
    id: "arak-havidij",
    label: "Havidíjas csomagok",
    href: "/#arak",
    anchor: "arak",
    pricingModel: "subscription",
    hint: "Az árazó havidíjra állítva. Ha bérelne, havidíjat, előleg nélküli indulást keres."
  },
  {
    id: "kivasarlas",
    label: "Kivásárlás bérlésből",
    href: "/#veteli-opcio",
    anchor: "veteli-opcio",
    pricingModel: "subscription",
    hint: "A vételi opció: hogyan lesz a bérelt oldalból saját, mennyi a beszámítás. Ha a bérlés utáni megvételről kérdez."
  },
  {
    id: "osszehasonlitas",
    label: "Csomagok összehasonlítása",
    href: "/szolgaltatasok",
    hint: "A /szolgaltatasok oldal: részletes csomagösszehasonlítás, mi van benne melyikben."
  },
  {
    id: "folyamat",
    label: "Így megy a közös munka",
    href: "/folyamat",
    hint: "A folyamat lépésről lépésre. Ha arról kérdez, hogyan zajlik, mi a sorrend, mikor kell fizetni."
  },
  {
    id: "projekt-inditas",
    label: "Projekt indítása",
    href: "/#projektbrief",
    anchor: "projektbrief",
    hint: "A projekt-adatlap (brief). Ha el akar indulni, megrendelne, vagy azt kérdezi, hogyan kezdhet bele."
  },
  {
    id: "audit",
    label: "Ingyenes audit kérése",
    href: "/ingyenes-weboldal-audit",
    anchor: "ingyenes-audit",
    hint: "Ingyenes elemzés a meglévő weboldalról. Ha már van oldala, és tudni szeretné, mi a baj vele, vagy érdemes-e újat csináltatni."
  },
  {
    id: "gyik",
    label: "Gyakori kérdések",
    href: "/#gyik",
    anchor: "gyik",
    hint: "A főoldali GYIK. Ritkán kell; csak ha több általános kérdése van egyszerre."
  },
  {
    id: "ugyfelkapu",
    label: "Ügyfélkapu",
    href: "/ugyfelkapu",
    hint: "Belépés meglévő ügyfeleknek. CSAK ha a látogató már ügyfél és be akar lépni, vagy kifejezetten az ügyfélkapuról kérdez — érdeklődőnek ne ajánld."
  },
  {
    id: "aszf",
    label: "ÁSZF",
    href: "/aszf",
    hint: "Az általános szerződési feltételek. Csak jogi, szerződési kérdésnél."
  },
  {
    id: "adatkezeles",
    label: "Adatkezelés",
    href: "/adatkezeles",
    hint: "Az adatkezelési tájékoztató. Csak adatvédelmi kérdésnél."
  }
];

/** Minden munka saját gombot kap: „mutass egy webshopot" → a Zamat nyílik. */
const WORK_ACTIONS: BotAction[] = WORKS.map((work) => ({
  id: `munka-${work.id}`,
  label: `${work.name} megnyitása`,
  href: work.href,
  newTab: true,
  hint: `${work.name} — ${work.goal}, ${work.industry}. ${work.external ? "Élesben futó ügyféloldal" : "Végigkattintható bemutató projekt"}: ${work.copy}`
}));

export const BOT_ACTIONS: readonly BotAction[] = [...PAGE_ACTIONS, ...WORK_ACTIONS];

/** A strukturált kimenet enumja. Legalább egy elem kell a típushoz. */
export const BOT_ACTION_IDS = BOT_ACTIONS.map((action) => action.id) as [string, ...string[]];

/** Egy válasz alatt legfeljebb ennyi gomb: több már döntésképtelenné tesz. */
export const MAX_BOT_ACTIONS = 3;

const BY_ID = new Map(BOT_ACTIONS.map((action) => [action.id, action]));

export function botActionById(id: string) {
  return BY_ID.get(id);
}

/** Csak ismert, ismétlés nélküli azonosítók, legfeljebb `MAX_BOT_ACTIONS`. */
export function sanitizeBotActions(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const result: string[] = [];
  for (const id of ids) {
    if (typeof id === "string" && BY_ID.has(id) && !result.includes(id)) result.push(id);
    if (result.length === MAX_BOT_ACTIONS) break;
  }
  return result;
}

/** A prompt gomblistája. */
export function botActionCatalog() {
  return BOT_ACTIONS.map((action) => `- ${action.id} („${action.label}"): ${action.hint}`).join("\n");
}
