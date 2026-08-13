export type CommercialModel = "subscription" | "purchase";
export type SubscriptionPlanKey = "presence" | "business" | "custom";

export const PURCHASE_REQUEST_PREFIX = "[WEBOLDAL_MEGVASARLAS]";

export const PURCHASE_OPTION_PRICES: Record<SubscriptionPlanKey, number> = {
  presence: 179000,
  business: 329000,
  custom: 599000
};

export const PRICE_TAX_NOTE = "Alanyi adómentes szolgáltatás: áfa nem kerül felszámításra. A feltüntetett összeg a fizetendő végösszeg.";

/**
 * Szüneteltetéskor a weboldal parkolóállapotba kerül: a domain, a tárhely és a
 * technikai fiókok megmaradnak, de a csomag szolgáltatásai szünetelnek. Ezt az
 * összeget ígérjük az ügyfélkapuban, tehát a Stripe-előfizetés tételét is erre
 * kell átállítani — különben a teljes havidíj terhelődne tovább.
 */
export const PARKING_MONTHLY_PRICE = 2900;

/**
 * Determinisztikus Stripe-termékazonosítók. A Checkout `product_data`-val
 * implicit terméket hoz létre véletlen azonosítóval; a későbbi ár-cserékhez
 * (parkolás / visszaállítás) viszont konkrét `product` ID kell, mert a
 * subscription item `price_data` nem fogad `product_data`-t.
 */
export const PARKING_PRODUCT_ID = "projectedge-parkolas";

export function subscriptionProductId(key: SubscriptionPlanKey) {
  return `projectedge-elofizetes-${key}`;
}

export function isWebsitePurchaseRequest(description?: string | null) {
  return Boolean(description?.startsWith(PURCHASE_REQUEST_PREFIX));
}

export function websitePurchaseRequestText(price: number) {
  return `${PURCHASE_REQUEST_PREFIX} Szeretném megvásárolni a weboldalt a jelzett ${formatHuf(price)} vételi opción.`;
}

export type SubscriptionPlan = {
  key: SubscriptionPlanKey;
  name: string;
  price: number;
  short: string;
  pages: string;
  changes: string;
  response: string;
  featured?: boolean;
  features: string[];
  idealFor: string;
  buildTime: string;
  pageOptions: string[];
  featureOptions: string[];
  pageQuestion: string;
  featureQuestion: string;
  detailGroups: Array<{ title: string; items: string[] }>;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    key: "presence",
    name: "Jelenlét",
    price: 14900,
    short: "Egy tiszta, gyors oldal az induláshoz.",
    pages: "1 oldal",
    changes: "Évente 3 kisebb módosítás",
    response: "5 munkanapos ügyintézés",
    features: ["Egyoldalas weboldal", "Saját domain használata", "Hosting és SSL", "Kapcsolati űrlap", "Alap SEO", "Folyamatos technikai felügyelet"],
    idealFor: "Induló vállalkozásnak vagy egyetlen szolgáltatás világos bemutatásához.",
    buildTime: "Jellemzően 7–10 munkanap",
    pageOptions: ["Nyitó blokk", "Bemutatkozás", "Szolgáltatás", "Előnyök", "Referenciák", "Gyakori kérdések", "Kapcsolat"],
    featureOptions: ["Email küldő kapcsolatfelvétel", "Telefonhívás gomb", "Google Térkép", "Közösségi linkek", "Egyszerű ajánlatkérés"],
    pageQuestion: "Milyen blokkok legyenek az egyoldalas weboldalon?",
    featureQuestion: "Mi legyen az oldal elsődleges kapcsolatfelvételi módja?",
    detailGroups: [
      { title: "Elkészítés", items: ["Egyedi, mobilbarát egyoldalas design", "Legfeljebb 7 tartalmi blokk", "Kapcsolati űrlap és köszönőüzenet", "Alap szöveggondozás"] },
      { title: "Üzemeltetés", items: ["Domain regisztráció és megújítás", "Hosting, SSL és technikai frissítések", "Űrlap és elérhetőség felügyelete", "Évente 3 kisebb tartalmi módosítás"] }
    ]
  },
  {
    key: "business",
    name: "Üzleti",
    price: 24900,
    short: "Többoldalas rendszer, ami ajánlatkérést hoz.",
    pages: "Legfeljebb 5 aloldal",
    changes: "Havi 1 kisebb módosítás",
    response: "3 munkanapos ügyintézés",
    featured: true,
    features: ["Egyedibb oldalstruktúra", "Szövegek finomítása", "Ajánlatkérő folyamat", "Analitika és konverziómérés", "Éves vizuális frissítés", "Domain, hosting és felügyelet"],
    idealFor: "Szolgáltató vállalkozásnak, amely rendszeresen szeretne érdeklődőket szerezni.",
    buildTime: "Jellemzően 2–3 hét",
    pageOptions: ["Főoldal", "Szolgáltatások", "Rólunk", "Referenciák", "Árak", "Gyakori kérdések", "Kapcsolat", "Adatkezelés"],
    featureOptions: ["Részletes ajánlatkérő", "Időpontkérő űrlap", "Google Térkép", "Értékelések", "Analitika és konverziómérés", "Közösségi linkek"],
    pageQuestion: "Melyik legfeljebb 5 tartalmi oldalra van szükséged?",
    featureQuestion: "Hogyan érkezzenek az érdeklődők?",
    detailGroups: [
      { title: "Elkészítés", items: ["Legfeljebb 5 egyedi tartalmi oldal", "Konverzióra tervezett főoldal", "Részletes ajánlatkérő folyamat", "Szövegek szerkesztése és finomítása"] },
      { title: "Növekedés", items: ["Analitika és konverziómérés", "Alap keresőoptimalizálás", "Éves vizuális frissítés", "Havi 1 kisebb tartalmi vagy designmódosítás"] },
      { title: "Üzemeltetés", items: ["Domain, hosting és SSL", "Űrlapok és mérés felügyelete", "Technikai frissítések és hibajavítás", "3 munkanapos ügyintézés"] }
    ]
  },
  {
    key: "custom",
    name: "Egyedi",
    price: 39900,
    short: "Karakteresebb design és összetettebb működés.",
    pages: "Legfeljebb 8–10 aloldal",
    changes: "Havi 2 kisebb módosítás",
    response: "Prioritásos ügyintézés",
    features: ["Teljesen egyedi megjelenés", "Összetett ajánlatkérés", "Foglalás vagy hírlevél", "Részletes mérés", "Folyamatos optimalizálás", "Prioritásos segítség"],
    idealFor: "Összetettebb szolgáltatáshoz, több célcsoporthoz vagy speciális ügyfélszerző folyamathoz.",
    buildTime: "Jellemzően 3–5 hét",
    pageOptions: ["Főoldal", "Szolgáltatások", "Szolgáltatás-aloldalak", "Rólunk", "Esettanulmányok", "Referenciák", "Árak", "Blog", "Gyakori kérdések", "Kapcsolat"],
    featureOptions: ["Többlépcsős ajánlatkérés", "Időpontfoglalás", "Hírlevél-feliratkozás", "Külső rendszer integráció", "Egyedi kalkulátor", "Részletes analitika", "Többnyelvűség"],
    pageQuestion: "Mely tartalmi egységek építsék fel a 8–10 oldalas rendszert?",
    featureQuestion: "Milyen összetettebb folyamatot kell megvalósítanunk?",
    detailGroups: [
      { title: "Elkészítés", items: ["Legfeljebb 8–10 egyedi oldal", "Teljesen egyedi vizuális rendszer", "Összetett ajánlatkérő vagy foglalási folyamat", "Részletes szöveg- és tartalmi struktúra"] },
      { title: "Integráció", items: ["Foglalás, hírlevél vagy külső rendszer", "Részletes esemény- és konverziómérés", "Egyedi automatizmusok egyeztetett keretben", "Technikai SEO alapok"] },
      { title: "Üzemeltetés", items: ["Domain, hosting, SSL és felügyelet", "Folyamatos optimalizálás", "Havi 2 kisebb módosítás", "Prioritásos ügyintézés"] }
    ]
  }
];

export const PURCHASE_PRICES = [
  { name: "Landing oldal", price: "179 000 Ft-tól" },
  { name: "Üzleti weboldal", price: "329 000 Ft-tól" },
  { name: "Egyedi weboldal", price: "599 000 Ft-tól" },
  { name: "Webapp / ügyfélkapu", price: "Egyedi ajánlat" }
];

export function subscriptionPlan(key?: string | null) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.key === key) ?? SUBSCRIPTION_PLANS[1];
}

export function purchaseOptionPrice(key?: string | null) {
  const plan = subscriptionPlan(key);
  return PURCHASE_OPTION_PRICES[plan.key];
}

export function formatHuf(value: number) {
  return `${new Intl.NumberFormat("hu-HU").format(value)} Ft`;
}
