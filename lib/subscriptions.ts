export type CommercialModel = "subscription" | "purchase";
export type SubscriptionPlanKey = "presence" | "business" | "custom";

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
    price: 19900,
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
    price: 29900,
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
    price: 49900,
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
  { name: "Landing oldal", price: "349 000 Ft-tól" },
  { name: "Üzleti weboldal", price: "649 000 Ft-tól" },
  { name: "Egyedi weboldal", price: "990 000 Ft-tól" },
  { name: "Webapp / ügyfélkapu", price: "Egyedi ajánlat" }
];

export function subscriptionPlan(key?: string | null) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.key === key) ?? SUBSCRIPTION_PLANS[1];
}

export function formatHuf(value: number) {
  return `${new Intl.NumberFormat("hu-HU").format(value)} Ft`;
}
