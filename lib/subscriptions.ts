export type CommercialModel = "subscription" | "purchase";
export type SubscriptionPlanKey = "presence" | "business" | "custom";

export const PURCHASE_REQUEST_PREFIX = "[WEBOLDAL_MEGVASARLAS]";

export const PURCHASE_OPTION_PRICES: Record<SubscriptionPlanKey, number> = {
  presence: 179000,
  business: 329000,
  custom: 599000
};

/**
 * Logótervezés felár — EGY helyen, mert három felületen jelenik meg
 * (szolgáltatások, projektbrief, ajánlat). Ha változik az ár, csak ezt írd át.
 */
export const LOGO_DESIGN_PRICE = 29000;

export const PRICE_TAX_NOTE ="Alanyi adómentes szolgáltatás: áfa nem kerül felszámításra. A feltüntetett összeg a fizetendő végösszeg.";

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
  if (!description) return false;
  return (
    description.startsWith(PURCHASE_REQUEST_PREFIX) ||
    description.toLowerCase().includes("megvásárolni a weboldalt") ||
    description.toLowerCase().includes("vételi opció") ||
    description.toLowerCase().includes("tulajdonba vétel")
  );
}

export function websitePurchaseRequestText(price: number) {
  return `${PURCHASE_REQUEST_PREFIX} Szeretném megvásárolni a weboldalt a jelzett ${formatHuf(price)} vételi opción.`;
}

/**
 * A csomagban foglalt módosítási keret — SZÁM, nem mondat.
 *
 * Korábban csak a `changes` szöveg létezett („Havi 1 kisebb módosítás"), amit
 * sem az ügyfélkapu, sem az admin nem tudott mérni: senki nem látta, hány
 * módosítás fogyott el az adott időszakban. A `changes` mostantól ebből a
 * struktúrából származik, tehát a kettő nem tud elcsúszni egymástól.
 */
export type PlanChangeQuota = { count: number; period: "month" | "year" };

export type SubscriptionPlan = {
  key: SubscriptionPlanKey;
  name: string;
  price: number;
  short: string;
  pages: string;
  changes: string;
  changeQuota: PlanChangeQuota;
  /**
   * Hány munkanap alatt KÉSZÜL EL egy kért módosítás.
   *
   * Korábban ez egy `response: "5 munkanapos ügyintézés"` szöveg volt, amit a
   * látogató válaszidőnek olvasott („egy hétig nem hallok felőle"). A
   * visszaigazolás és a hibára reagálás ettől külön, minden csomagra azonos
   * vállalás — lásd `SUBSCRIPTION_SHARED_INCLUDED`.
   */
  changeLeadDays: number;
  featured?: boolean;
  features: string[];
  idealFor: string;
  buildTime: string;
  /** Az összehasonlító táblázat közös tengelyei — minden csomagnál ugyanaz a kérdés. */
  designLevel: string;
  leadFlow: string;
  measurement: string;
  pageOptions: string[];
  featureOptions: string[];
  pageQuestion: string;
  featureQuestion: string;
  detailGroups: Array<{ title: string; items: string[] }>;
};

export function changeLeadLabel(days: number) {
  return `A kért módosítás ${days} munkanapon belül elkészül`;
}

/**
 * Minden csomagra azonos, ezért nem az összehasonlító táblázatban van a helye.
 * A visszaigazolás azért külön vállalás, mert a vásárló félelme nem az, hogy
 * lassan készül el valami, hanem hogy nem tudja, megkaptad-e egyáltalán.
 */
export const ACK_PROMISE = "Írásos kérésre 1 munkanapon belül visszaigazolok";
export const FAULT_RESPONSE_PROMISE = "Technikai hibára 1 munkanapon belül reagálok";
export const CHANGE_LEAD_REALITY = "Ez a garantált határidő — a gyakorlatban jellemzően 1–2 nap.";

export function changeQuotaLabel(quota: PlanChangeQuota) {
  const unit = quota.period === "month" ? "Havi" : "Évente";
  return `${unit} ${quota.count} kisebb módosítás`;
}

/**
 * Minden csomagban benne van — ezt külön mutatjuk meg.
 *
 * Ha ezek a csomagonkénti listákban ülnek, más-más megfogalmazásban, akkor a
 * látogató különbséget lát ott, ahol nincs (pl. „Saját domain használata" vs.
 * „Domain, hosting és felügyelet" ugyanazt jelentette).
 */
export const SUBSCRIPTION_SHARED_INCLUDED = [
  "Egyedi, mobilra tervezett megjelenés — nem sablon",
  "Domain regisztráció, megújítás és díj",
  "Tárhely, SSL és technikai frissítések",
  "Díjmentes email továbbítás a saját postafiókodba",
  "Kötelező jogi oldalak (ÁSZF, Adatkezelés) díjmentesen, oldalkeret-levonás nélkül",
  "Folyamatos működésfelügyelet",
  "Írásos kérésre 1 munkanapon belül visszaigazolok",
  "Technikai hibára 1 munkanapon belül reagálok — és nem fogyasztja a keretet",
  "Nincs induló díj és nincs hűségidő"
];

/** Mi számít bele a módosítási keretbe — a vita elkerülése a lényeg. */
export const CHANGE_QUOTA_INCLUDED = [
  "Szöveg átírása, csere, bővítés",
  "Ár, nyitvatartás, elérhetőség frissítése",
  "Kép cseréje vagy hozzáadása meglévő helyre",
  "Meglévő oldalon kisebb elrendezés- vagy színmódosítás"
];

export const CHANGE_QUOTA_EXCLUDED = [
  "Új aloldal a csomag keretén felül",
  "Új funkció (foglalás, webshop, integráció)",
  "Teljes arculat- vagy struktúraváltás",
  "Szöveg- vagy fotóprodukció"
];

export const CHANGE_QUOTA_FREE = [
  "Technikai hiba, hibás űrlap, leállás",
  "Domain, SSL és tárhely ügyintézés",
  "Biztonsági és rendszerfrissítés"
];

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    key: "presence",
    name: "Jelenlét",
    price: 14900,
    short: "Egy tiszta, gyors oldal az induláshoz.",
    pages: "1 oldal, legfeljebb 7 blokk",
    changes: "Évente 3 kisebb módosítás",
    changeQuota: { count: 3, period: "year" },
    changeLeadDays: 5,
    features: [
      "1 oldal, legfeljebb 7 tartalmi blokk",
      "Egyedi, letisztult egyoldalas design",
      "Kapcsolati űrlap és hívásgomb",
      "Alap keresőoptimalizálás",
      "Évente 3 kisebb módosítás",
      "A kért módosítás 5 munkanapon belül elkészül"
    ],
    idealFor: "Induló vállalkozásnak vagy egyetlen szolgáltatás világos bemutatásához.",
    buildTime: "Jellemzően 2–4 munkanap",
    designLevel: "Egyedi, letisztult egyoldalas design",
    leadFlow: "Kapcsolati űrlap és hívásgomb",
    measurement: "Alap keresőoptimalizálás",
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
    changeQuota: { count: 1, period: "month" },
    changeLeadDays: 3,
    featured: true,
    features: [
      "Legfeljebb 5 aloldal",
      "Egyedi többoldalas struktúra és szövegezés",
      "Részletes ajánlatkérő folyamat",
      "Analitika és konverziómérés",
      "Havi 1 kisebb módosítás",
      "A kért módosítás 3 munkanapon belül elkészül"
    ],
    idealFor: "Szolgáltató vállalkozásnak, amely rendszeresen szeretne érdeklődőket szerezni.",
    buildTime: "Jellemzően 3–6 munkanap",
    designLevel: "Egyedi többoldalas struktúra és szövegezés",
    leadFlow: "Részletes ajánlatkérő folyamat",
    measurement: "Analitika és konverziómérés",
    pageOptions: ["Főoldal", "Szolgáltatások", "Rólunk", "Referenciák", "Árak", "Gyakori kérdések", "Kapcsolat", "Adatkezelés"],
    featureOptions: ["Részletes ajánlatkérő", "Időpontkérő űrlap", "Google Térkép", "Értékelések", "Analitika és konverziómérés", "Közösségi linkek"],
    pageQuestion: "Melyik legfeljebb 5 tartalmi oldalra van szükséged?",
    featureQuestion: "Hogyan érkezzenek az érdeklődők?",
    detailGroups: [
      { title: "Elkészítés", items: ["Legfeljebb 5 egyedi tartalmi oldal", "Konverzióra tervezett főoldal", "Részletes ajánlatkérő folyamat", "Szövegek szerkesztése és finomítása"] },
      { title: "Növekedés", items: ["Analitika és konverziómérés", "Alap keresőoptimalizálás", "Éves vizuális frissítés", "Havi 1 kisebb tartalmi vagy designmódosítás"] },
      { title: "Üzemeltetés", items: ["Domain, hosting és SSL", "Űrlapok és mérés felügyelete", "Technikai frissítések és hibajavítás", "A kért módosítás 3 munkanapon belül elkészül"] }
    ]
  },
  {
    key: "custom",
    name: "Egyedi",
    price: 39900,
    short: "Karakteresebb design és összetettebb működés.",
    pages: "Legfeljebb 8–10 aloldal",
    changes: "Havi 2 kisebb módosítás",
    changeQuota: { count: 2, period: "month" },
    changeLeadDays: 2,
    features: [
      "Legfeljebb 8–10 aloldal",
      "Teljesen egyedi vizuális rendszer",
      "Többlépcsős ajánlatkérés vagy foglalás",
      "Részletes mérés és optimalizálás",
      "Havi 2 kisebb módosítás",
      "A kért módosítás 2 munkanapon belül elkészül"
    ],
    idealFor: "Összetettebb szolgáltatáshoz, több célcsoporthoz vagy speciális ügyfélszerző folyamathoz.",
    buildTime: "Jellemzően 5–14 munkanap",
    designLevel: "Teljesen egyedi vizuális rendszer",
    leadFlow: "Többlépcsős ajánlatkérés vagy foglalás",
    measurement: "Részletes mérés és optimalizálás",
    pageOptions: ["Főoldal", "Szolgáltatások", "Szolgáltatás-aloldalak", "Rólunk", "Projektbemutatók", "Referenciák", "Árak", "Blog", "Gyakori kérdések", "Kapcsolat"],
    featureOptions: ["Többlépcsős ajánlatkérés", "Időpontfoglalás", "Hírlevél-feliratkozás", "Külső rendszer integráció", "Egyedi kalkulátor", "Részletes analitika", "Többnyelvűség"],
    pageQuestion: "Mely tartalmi egységek építsék fel a 8–10 oldalas rendszert?",
    featureQuestion: "Milyen összetettebb folyamatot kell megvalósítanunk?",
    detailGroups: [
      { title: "Elkészítés", items: ["Legfeljebb 8–10 egyedi oldal", "Teljesen egyedi vizuális rendszer", "Összetett ajánlatkérő vagy foglalási folyamat", "Részletes szöveg- és tartalmi struktúra"] },
      { title: "Integráció", items: ["Foglalás, hírlevél vagy külső rendszer", "Részletes esemény- és konverziómérés", "Egyedi automatizmusok egyeztetett keretben", "Technikai SEO alapok"] },
      { title: "Üzemeltetés", items: ["Domain, hosting, SSL és felügyelet", "Folyamatos optimalizálás", "Havi 2 kisebb módosítás", "A kért módosítás 2 munkanapon belül elkészül"] }
    ]
  }
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

/**
 * Az összehasonlító táblázat sorai — MINDEN csomagnál ugyanaz a kérdés.
 *
 * Ez a lényeg: korábban három különálló, egymással össze nem vethető
 * jellemzőlista volt, amiből a látogató nem tudta kiolvasni, mi a különbség.
 */
export const PLAN_COMPARISON_ROWS: Array<{ label: string; value: (plan: SubscriptionPlan) => string }> = [
  { label: "Havidíj", value: (plan) => `${formatHuf(plan.price)} / hó` },
  { label: "Oldalak", value: (plan) => plan.pages },
  { label: "Elkészül", value: (plan) => plan.buildTime.replace("Jellemzően ", "") },
  { label: "Megjelenés", value: (plan) => plan.designLevel },
  { label: "Kapcsolatfelvétel", value: (plan) => plan.leadFlow },
  { label: "Mérés és SEO", value: (plan) => plan.measurement },
  { label: "Módosítási keret", value: (plan) => changeQuotaLabel(plan.changeQuota) },
  { label: "Módosítás átfutása", value: (plan) => `${plan.changeLeadDays} munkanap` }
];

/** Egymondatos döntési szabály — a „melyiket válasszam?" kérdésre. */
export const PLAN_DECISION_RULE: Record<SubscriptionPlanKey, string> = {
  presence: "Válaszd ezt, ha egy szolgáltatásod van, és elég egy meggyőző oldal.",
  business: "Válaszd ezt, ha több szolgáltatásod van, és rendszeresen szeretnél ajánlatkérést.",
  custom: "Válaszd ezt, ha több célcsoportot szolgálsz ki, vagy foglalás és összetettebb folyamat kell."
};

/**
 * A módosítási keret aktuális időszakának azonosítója.
 *
 * A számlázási évfordulóhoz igazodik, nem a naptári hónaphoz: aki 17-én
 * fizetett először, annak 17-én újul a kerete. Ugyanezt a szabályt írja le a
 * `031_change_request_quota.sql` adatbázis-triggere is — a kettőnek egyeznie
 * kell, különben az ügyfél mást lát, mint amit a rendszer számol.
 */
export function quotaPeriodKey(anchorIso: string | null | undefined, quota: PlanChangeQuota, now = new Date()) {
  const anchor = anchorIso ? new Date(anchorIso) : null;
  if (!anchor || Number.isNaN(anchor.getTime())) return quota.period === "year" ? "Y0" : "M0";

  // 31-i fordulónapnál a rövidebb hónapokban az utolsó nap a forduló, különben
  // a keret sosem újulna meg februárban.
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const anchorDay = Math.min(anchor.getDate(), daysInMonth);
  let elapsed: number;

  if (quota.period === "year") {
    elapsed = now.getFullYear() - anchor.getFullYear();
    if (now.getMonth() < anchor.getMonth() || (now.getMonth() === anchor.getMonth() && now.getDate() < anchorDay)) {
      elapsed -= 1;
    }
  } else {
    elapsed = (now.getFullYear() - anchor.getFullYear()) * 12 + (now.getMonth() - anchor.getMonth());
    if (now.getDate() < anchorDay) elapsed -= 1;
  }

  return `${quota.period === "year" ? "Y" : "M"}${Math.max(0, elapsed)}`;
}

/** Mikor újul meg a keret — az ügyfélnek ezt a dátumot mutatjuk. */
export function quotaRenewsAt(anchorIso: string | null | undefined, quota: PlanChangeQuota, now = new Date()) {
  const anchor = anchorIso ? new Date(anchorIso) : null;
  if (!anchor || Number.isNaN(anchor.getTime())) return null;

  const next = new Date(anchor);
  if (quota.period === "year") {
    next.setFullYear(anchor.getFullYear() + 1);
    while (next <= now) next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(anchor.getMonth() + 1);
    while (next <= now) next.setMonth(next.getMonth() + 1);
  }
  return next;
}

/**
 * Fogyaszt-e keretet egy kérés.
 *
 * A technikai hiba SOHA nem fogyaszt: az a szolgáltatás része, nem az ügyfél
 * kérése. A külön ajánlatot kapó (`included_in_plan === false`), az elutasított
 * és a weboldal-megvásárlási kérés sem számít bele.
 */
export function consumesChangeQuota(request: {
  category: string;
  status: string;
  included_in_plan: boolean | null;
  description: string;
}) {
  if (request.category === "technical") return false;
  if (request.status === "declined") return false;
  if (request.included_in_plan === false) return false;
  if (isWebsitePurchaseRequest(request.description)) return false;
  return true;
}
