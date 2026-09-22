/**
 * A kézi ügyfélfelvétel számlázási dátumlogikája.
 *
 * Szándékosan függőségmentes (se `server-only`, se Supabase, se Stripe), hogy
 * `node --test` alatt közvetlenül futtatható legyen — ugyanaz az elv, mint a
 * `lib/billing-math.ts`-nél. Dátumszámítást nem szabad csak szemre írni: a
 * hónapléptetés a naptár egyetlen olyan művelete, ami látszólag triviális, és
 * mégis minden második implementációban hibás.
 */

export type BillingInterval = "month" | "year";

/**
 * Egy számlázási ciklus: a régi `"month" | "year"` név, VAGY a ciklus hossza
 * hónapban (1, 3, 6, 12, 24).
 *
 * A kettősség oka: a rendszer eredetileg csak havi és éves ciklust ismert, a
 * 044-es migráció óta viszont van féléves is (`billing_period_months = 6`).
 * A félévest a régi `billing_interval` mező „month"-nak tárolja — és minden
 * számítás, ami csak ebből dolgozott, egy hónap múlva újra esedékesnek jelölte
 * a fél évre előre fizető ügyfelet. Ezért a ciklus mostantól hónapszám.
 */
export type BillingCycle = BillingInterval | number;

const VALID_CYCLE_MONTHS = [1, 3, 6, 12, 24];

/**
 * Hány hónapot NEM számolunk fel egy ciklusban (a nyilvános futamidő-ár).
 *
 * Ugyanaz, mint a `lib/subscriptions.ts` `BILLING_TERMS` `freeMonths` mezője —
 * ez a fájl szándékosan függőségmentes, ezért itt másolat él belőle, és a
 * `tests/onboarding.test.mjs` őrzi, hogy a kettő ne tudjon elcsúszni.
 */
export const CYCLE_FREE_MONTHS: Readonly<Record<number, number>> = { 12: 2 };

/** A ciklus hossza hónapban. Ismeretlen értékre havi. */
export function cycleMonths(cycle: BillingCycle) {
  if (cycle === "year") return 12;
  if (cycle === "month") return 1;
  return VALID_CYCLE_MONTHS.includes(cycle) ? cycle : 1;
}

/**
 * Egy projekt számlázási ciklusa hónapban.
 *
 * A `billing_period_months` a mérvadó, de csak akkor, ha nem mond ellent a
 * régi `billing_interval` mezőnek: a 044 előtt felvett vagy olyan úton
 * létrehozott sornál, ami csak az intervallumot írta, a hónapszám az
 * alapértelmezett 1 maradhat egy éves ügyfélnél is.
 */
export function projectCycleMonths(project: {
  billing_period_months?: number | null;
  billing_interval?: string | null;
}) {
  const stored = typeof project.billing_period_months === "number" && VALID_CYCLE_MONTHS.includes(project.billing_period_months)
    ? project.billing_period_months
    : null;
  if (project.billing_interval === "year") return stored && stored >= 12 ? stored : 12;
  if (project.billing_interval === "month") return stored && stored < 12 ? stored : 1;
  // Az intervallum nincs a lekérdezésben — ilyenkor a hónapszám dönt.
  return stored ?? 1;
}

/** A hónap utolsó napja — a csonkolás miatt kell. */
function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Dátum léptetése hónappal vagy évvel, a hónap végére CSONKOLVA.
 *
 * A natív `setMonth` túlcsordul: január 31-hez egy hónapot adva március 3-at
 * kapunk, mert február 31-e „létezik" neki. Egy havidíjas ügyfélnél ez azt
 * jelentené, hogy a 31-én induló előfizetés fordulónapja hónapról hónapra
 * előrébb csúszik, és néhány év alatt átvándorol a hónap közepére.
 *
 * Itt a 31-i fordulónap februárban 28-ra (szökőévben 29-re) csonkul, majd
 * márciusban VISSZAÁLL 31-re, mert mindig az eredeti horgonyból számolunk,
 * nem az előző lépés eredményéből.
 */
export function addBillingInterval(anchor: Date, interval: BillingCycle, steps = 1) {
  const months = cycleMonths(interval) * steps;
  const year = anchor.getUTCFullYear();
  const monthIndex = anchor.getUTCMonth() + months;
  const targetYear = year + Math.floor(monthIndex / 12);
  const targetMonth = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(anchor.getUTCDate(), daysInMonth(targetYear, targetMonth));

  return new Date(Date.UTC(
    targetYear,
    targetMonth,
    day,
    anchor.getUTCHours(),
    anchor.getUTCMinutes(),
    anchor.getUTCSeconds(),
    anchor.getUTCMilliseconds()
  ));
}

/**
 * Az első olyan fordulónap, ami a megadott pillanat UTÁN esedékes.
 *
 * Akkor kell, ha az ügyfél már hónapok óta fizet offline: az admin a
 * szolgáltatás kezdetét adja meg, a rendszernek viszont a KÖVETKEZŐ
 * esedékességet kell tudnia, nem a másodikat a sorban.
 *
 * A léptetés mindig az eredeti horgonyból indul (`steps`-szel), nem az előző
 * eredményből — így a hónapvégi csonkolás nem halmozódik.
 */
export function nextBillingAfter(anchor: Date, interval: BillingCycle, now = new Date()) {
  if (Number.isNaN(anchor.getTime())) throw new RangeError("Érvénytelen horgonydátum.");

  // Felső korlát: 200 év. Végtelen ciklus nem fordulhat elő akkor sem, ha
  // valaki 1900-as dátumot ír be.
  const maxSteps = Math.ceil(2400 / cycleMonths(interval));
  for (let steps = 1; steps <= maxSteps; steps += 1) {
    const candidate = addBillingInterval(anchor, interval, steps);
    if (candidate.getTime() > now.getTime()) return candidate;
  }
  throw new RangeError("A horgonydátum túl régi a fordulónap kiszámításához.");
}

/**
 * Egy befizetés által lefedett időszak.
 *
 * A `periods` azért kell, mert az ügyfél nem csak egyetlen ciklust fizethet
 * előre: van, aki két évet utal át egyben, és van, aki három hónapot. Korábban
 * ez a függvény fixen EGY ciklust feltételezett, tehát egy kétéves befizetés
 * után a rendszer egy év múlva esedékesnek jelölte volna a következő fizetést,
 * és fizetési emlékeztetőt küldött volna egy olyan ügyfélnek, aki már ki van
 * fizetve. Pont az a hiba, ami a bizalmat viszi el.
 */
export function billingPeriodFor(paidAt: Date, interval: BillingCycle, periods = 1) {
  const steps = Math.max(1, Math.floor(periods));
  return { start: paidAt, end: addBillingInterval(paidAt, interval, steps) };
}

export type OnboardingScheduleInput = {
  /** Mikor indult a szolgáltatás. Ez lesz a fordulónap horgonya. */
  startedAt: Date;
  /** Mikor fizetett utoljára. Ha nincs, a `startedAt` a horgony. */
  lastPaymentAt?: Date | null;
  interval: BillingCycle;
  /**
   * Hány ciklust fizetett ki ezzel az egy befizetéssel. Alapértelmezésben 1.
   * Havi ciklusnál a 3 = három hónap előre, évesnél a 2 = két év előre.
   */
  periods?: number;
  now?: Date;
};

export type OnboardingSchedule = {
  /** A számlázási ciklus horgonya — ehhez igazodik a módosítási keret is. */
  billingCycleStartedAt: string;
  /** A következő esedékesség. */
  nextBillingAt: string;
  /** Meddig van kifizetve a szolgáltatás. Éves előre fizetésnél ez a döntő. */
  prepaidUntil: string;
  /** Az utolsó befizetés által lefedett időszak — ez kerül a payments sorba. */
  coveredPeriod: { start: string; end: string };
  /** Hány ciklust fedez ez a befizetés. Az összeg ennyiszerese a ciklusdíjnak. */
  periods: number;
};

/**
 * A kézzel felvett ügyfél teljes számlázási menetrendje egy befizetésből.
 *
 * A `lastPaymentAt` azért külön a `startedAt`-tól, mert a kettő tipikusan NEM
 * egyezik: az ügyfél márciusban indult, de szeptemberben fizetett utoljára.
 * A fordulónap a kezdésből jön (az az „évfordulója"), az esedékesség viszont
 * az utolsó befizetésből — ez a kettő keverése volt az a hiba, amit itt el
 * akarunk kerülni.
 */
export function onboardingSchedule(input: OnboardingScheduleInput): OnboardingSchedule {
  const now = input.now ?? new Date();
  const paidAt = input.lastPaymentAt ?? input.startedAt;

  if (Number.isNaN(input.startedAt.getTime())) throw new RangeError("Érvénytelen kezdődátum.");
  if (Number.isNaN(paidAt.getTime())) throw new RangeError("Érvénytelen fizetési dátum.");

  const periods = Math.max(1, Math.floor(input.periods ?? 1));
  const covered = billingPeriodFor(paidAt, input.interval, periods);

  // A következő esedékesség az utolsó befizetés által lefedett időszak vége —
  // de ha az már a múltban van (az ügyfél késésben van, vagy régi befizetést
  // rögzítünk), akkor a következő jövőbeli forduló.
  const nextBilling = covered.end.getTime() > now.getTime()
    ? covered.end
    : nextBillingAfter(paidAt, input.interval, now);

  return {
    billingCycleStartedAt: input.startedAt.toISOString(),
    nextBillingAt: nextBilling.toISOString(),
    prepaidUntil: covered.end.toISOString(),
    coveredPeriod: { start: covered.start.toISOString(), end: covered.end.toISOString() },
    periods
  };
}

/**
 * Hátralévő napok egy esedékességig. Negatív, ha már lejárt.
 * Naptári napban számol, nem 24 órás blokkokban — az ügyfélnek az számít.
 */
export function daysUntil(target: Date, now = new Date()) {
  const startOfDay = (value: Date) => Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  return Math.round((startOfDay(target) - startOfDay(now)) / 86_400_000);
}

/** A ciklus emberi neve — a felületen és a levelekben is ez szerepel. */
export function billingIntervalLabel(interval: BillingCycle) {
  switch (cycleMonths(interval)) {
    case 24: return "kétéves";
    case 12: return "éves";
    case 6: return "féléves";
    case 3: return "negyedéves";
    default: return "havi";
  }
}

/** A számlatétel mennyiségi egysége egy ciklusra (a Billingo-számlán). */
export function billingUnitLabel(interval: BillingCycle) {
  switch (cycleMonths(interval)) {
    case 24: return "2 év";
    case 12: return "év";
    case 6: return "félév";
    case 3: return "negyedév";
    default: return "hó";
  }
}

/**
 * Az alkudott ciklusdíj, ha ARRA a ciklusra szól, amit most fizet.
 *
 * A `billing_amount` egy konkrét ciklusra (tipikusan az évesre) alkudott ár.
 * Ha az ügyfél más futamidőt választ — pl. az éves alkudott ár mellett
 * havonta fizetne —, az alkudott összeg nem érvényes, különben havonta az
 * éves díjat terhelnénk. Ilyenkor a nyilvános futamidő-ár a mérvadó.
 */
export function agreedAmountFor(
  project: { billing_amount?: number | null; billing_period_months?: number | null; billing_interval?: string | null },
  chosenMonths: number
) {
  const agreed = project.billing_amount;
  if (typeof agreed !== "number" || !Number.isFinite(agreed) || agreed <= 0) return null;
  return projectCycleMonths(project) === cycleMonths(chosenMonths) ? agreed : null;
}

/**
 * Az időszakra vetített TELJES listaár, kedvezmény nélkül.
 *
 * A `monthly_price` MINDIG a havidíj marad az adatbázisban, akkor is, ha az
 * ügyfél évente fizet — különben minden meglévő számítás (kivásárlási
 * beszámítás, MRR, keretszámítás) elromlana rajta. Az éves összeg ebből
 * származik, nem fordítva. Ehhez mérjük a kedvezményt (`cycleDiscount`).
 */
export function amountForInterval(monthlyPrice: number, interval: BillingCycle, periods = 1) {
  const steps = Math.max(1, Math.floor(periods));
  return monthlyPrice * cycleMonths(interval) * steps;
}

/**
 * A ciklus NYILVÁNOS ára: a teljes listaár, mínusz az ingyenes hónapok.
 *
 * Évesen 10 havidíj, nem 12 — pontosan az, amit az árlista és a Checkout
 * mond. Korábban alkudott ár nélkül a 12-szeres összeg ment ki a megújítási
 * emlékeztetőbe, tehát aki 149 000-ért fizetett elő, egy évvel később
 * 178 800-as felszólítást kapott volna.
 */
export function publicCycleAmount(monthlyPrice: number, interval: BillingCycle, periods = 1) {
  const months = cycleMonths(interval);
  const steps = Math.max(1, Math.floor(periods));
  return monthlyPrice * (months - (CYCLE_FREE_MONTHS[months] ?? 0)) * steps;
}

/**
 * Amit az ügyfél egy ciklusban ténylegesen fizet.
 *
 * Ez a rendszer EGYETLEN helye, ahol eldől, mekkora összeg kerül a számlára,
 * a fizetési emlékeztetőbe és a Stripe-fizetési linkre. Ha valaha külön
 * számolná bármelyik, azonnal elcsúsznának egymástól — és pont az a szám
 * csúszna el, amit az ügyfél a bankszámláján lát.
 *
 * Az `agreed` az ügyfelenként alkudott ciklusdíj (`billing_amount`). Ha nincs,
 * a nyilvános futamidő-ár érvényes (`publicCycleAmount`, évesen 10 havidíj).
 * A ciklusszám az alkudott árat is szorozza: aki két évet fizet előre
 * 149 000-es éves áron, az 298 000-et utal.
 */
export function cycleAmount(input: {
  monthlyPrice: number;
  interval: BillingCycle;
  periods?: number;
  /** Az alkudott ciklusdíj. `null`/`undefined` esetén a listaár számít. */
  agreed?: number | null;
}) {
  const periods = Math.max(1, Math.floor(input.periods ?? 1));
  const agreed = input.agreed;
  if (typeof agreed === "number" && Number.isFinite(agreed) && agreed > 0) {
    return Math.round(agreed) * periods;
  }
  return publicCycleAmount(input.monthlyPrice, input.interval, periods);
}

/**
 * A kedvezmény, amit az éves előre fizetéssel kap — forintban és hónapban.
 *
 * A hónapra váltás azért van, mert ez az a forma, amiben ki lehet mondani:
 * „éves fizetéssel két hónapot megspórolsz". Egy forintösszeg ennél sokkal
 * kevesebbet mond, és a listaárat sem teszi láthatóvá mellé.
 */
export function cycleDiscount(input: {
  monthlyPrice: number;
  interval: BillingCycle;
  periods?: number;
  agreed?: number | null;
}) {
  const list = amountForInterval(input.monthlyPrice, input.interval, input.periods ?? 1);
  const actual = cycleAmount(input);
  const saved = list - actual;
  if (saved <= 0 || input.monthlyPrice <= 0) return null;

  return {
    list,
    actual,
    saved,
    /** Hány havidíjnak felel meg a kedvezmény. Egy tizedesig, mert a 1,5 hónap is valódi. */
    months: Math.round((saved / input.monthlyPrice) * 10) / 10
  };
}

/**
 * Az ügyfél havi vetített bevétele — az MRR-hez.
 *
 * Nem ugyanaz, mint a `monthly_price`: aki éves díjat fizet kedvezménnyel, az
 * havi szinten kevesebbet hoz, mint a listaára. Ha az MRR a listaárból
 * számolna, minden kedvezményes ügyfélnél felfelé tévedne — és pont a
 * bevételi kimutatás lenne az, amiben nem lehet megbízni.
 */
export function monthlyRevenue(input: {
  monthlyPrice: number;
  interval: BillingCycle;
  agreed?: number | null;
}) {
  const perCycle = cycleAmount({ monthlyPrice: input.monthlyPrice, interval: input.interval, agreed: input.agreed });
  return Math.round(perCycle / cycleMonths(input.interval));
}

/**
 * Az utalásos befizetés hivatkozási azonosítója.
 *
 * Ugyanaz a forma, amit a `website_purchases` használ (`PE-VAS-…`), hogy a
 * bankkivonaton ránézésre eldönthető legyen, mihez tartozik egy tétel.
 */
export function paymentReference(projectId: string, paidAt: Date) {
  const compact = projectId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const day = paidAt.toISOString().slice(0, 10).replace(/-/g, "");
  return `PE-DIJ-${compact}-${day}`;
}
