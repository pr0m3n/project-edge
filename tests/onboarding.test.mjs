import assert from "node:assert/strict";
import test from "node:test";

import {
  addBillingInterval,
  amountForInterval,
  billingPeriodFor,
  cycleAmount,
  cycleDiscount,
  daysUntil,
  nextBillingAfter,
  onboardingSchedule,
  paymentReference
} from "../lib/onboarding.ts";

const utc = (value) => new Date(`${value}T00:00:00.000Z`);

test("a hónapléptetés a hónap végére csonkol, nem csordul túl", () => {
  // A natív setMonth ezt március 3-ra vinné.
  assert.equal(addBillingInterval(utc("2026-01-31"), "month").toISOString().slice(0, 10), "2026-02-28");
  assert.equal(addBillingInterval(utc("2028-01-31"), "month").toISOString().slice(0, 10), "2028-02-29");
  assert.equal(addBillingInterval(utc("2026-03-31"), "month").toISOString().slice(0, 10), "2026-04-30");
  assert.equal(addBillingInterval(utc("2026-08-15"), "month").toISOString().slice(0, 10), "2026-09-15");
});

test("a csonkolás nem halmozódik: a 31-i fordulónap visszaáll", () => {
  const anchor = utc("2026-01-31");
  // Február 28, majd MÁRCIUS 31 — nem március 28.
  assert.equal(addBillingInterval(anchor, "month", 1).toISOString().slice(0, 10), "2026-02-28");
  assert.equal(addBillingInterval(anchor, "month", 2).toISOString().slice(0, 10), "2026-03-31");
  assert.equal(addBillingInterval(anchor, "month", 3).toISOString().slice(0, 10), "2026-04-30");
  assert.equal(addBillingInterval(anchor, "month", 4).toISOString().slice(0, 10), "2026-05-31");
});

test("az éves léptetés a szökőnapot is kezeli", () => {
  assert.equal(addBillingInterval(utc("2026-09-17"), "year").toISOString().slice(0, 10), "2027-09-17");
  assert.equal(addBillingInterval(utc("2028-02-29"), "year").toISOString().slice(0, 10), "2029-02-28");
});

test("a következő fordulónap mindig a jelen UTÁN esik", () => {
  const anchor = utc("2026-03-15");
  const now = utc("2026-09-17");
  assert.equal(nextBillingAfter(anchor, "month", now).toISOString().slice(0, 10), "2026-10-15");
  assert.equal(nextBillingAfter(anchor, "year", now).toISOString().slice(0, 10), "2027-03-15");
});

test("egy befizetés a fizetés napjától a következő fordulóig tart", () => {
  const period = billingPeriodFor(utc("2026-09-17"), "year");
  assert.equal(period.start.toISOString().slice(0, 10), "2026-09-17");
  assert.equal(period.end.toISOString().slice(0, 10), "2027-09-17");
});

test("éves előre fizetés: egy év múlva esedékes a következő", () => {
  const schedule = onboardingSchedule({
    startedAt: utc("2026-09-01"),
    lastPaymentAt: utc("2026-09-05"),
    interval: "year",
    now: utc("2026-09-17")
  });

  // A ciklus horgonya a KEZDÉS, nem a fizetés napja.
  assert.equal(schedule.billingCycleStartedAt.slice(0, 10), "2026-09-01");
  assert.equal(schedule.nextBillingAt.slice(0, 10), "2027-09-05");
  assert.equal(schedule.prepaidUntil.slice(0, 10), "2027-09-05");
  assert.equal(schedule.coveredPeriod.start.slice(0, 10), "2026-09-05");
  assert.equal(schedule.coveredPeriod.end.slice(0, 10), "2027-09-05");
});

test("régóta futó havi ügyfél: a következő esedékesség az utolsó fizetésből jön", () => {
  // Márciusban indult, szeptemberben fizetett utoljára — októberben esedékes.
  const schedule = onboardingSchedule({
    startedAt: utc("2026-03-15"),
    lastPaymentAt: utc("2026-09-15"),
    interval: "month",
    now: utc("2026-09-17")
  });

  assert.equal(schedule.billingCycleStartedAt.slice(0, 10), "2026-03-15");
  assert.equal(schedule.nextBillingAt.slice(0, 10), "2026-10-15");
});

test("lejárt befizetésnél a következő JÖVŐBELI forduló jön, nem a múltbeli", () => {
  // Az ügyfél júniusban fizetett utoljára havi díjat, most szeptember van:
  // a júliusi forduló már elmúlt, a válasz nem lehet múltbeli dátum.
  const schedule = onboardingSchedule({
    startedAt: utc("2026-01-15"),
    lastPaymentAt: utc("2026-06-15"),
    interval: "month",
    now: utc("2026-09-17")
  });

  assert.equal(schedule.nextBillingAt.slice(0, 10), "2026-10-15");
  // A fedezett időszak viszont a valóságot mutatja: júliusban lejárt.
  assert.equal(schedule.prepaidUntil.slice(0, 10), "2026-07-15");
});

test("fizetési dátum nélkül a kezdés a horgony", () => {
  const schedule = onboardingSchedule({
    startedAt: utc("2026-09-10"),
    interval: "month",
    now: utc("2026-09-17")
  });
  assert.equal(schedule.nextBillingAt.slice(0, 10), "2026-10-10");
});

test("az éves összeg a havidíjból származik", () => {
  assert.equal(amountForInterval(14900, "month"), 14900);
  assert.equal(amountForInterval(14900, "year"), 178800);
});

test("a hátralévő napok naptári napban számolnak", () => {
  assert.equal(daysUntil(utc("2026-09-24"), utc("2026-09-17")), 7);
  assert.equal(daysUntil(utc("2026-09-17"), utc("2026-09-17")), 0);
  assert.equal(daysUntil(utc("2026-09-10"), utc("2026-09-17")), -7);
});

test("a fizetési hivatkozás felismerhető és determinisztikus", () => {
  const reference = paymentReference("3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607", utc("2026-09-17"));
  assert.equal(reference, "PE-DIJ-3F1A2B-20260917");
  assert.equal(paymentReference("3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607", utc("2026-09-17")), reference);
});

test("érvénytelen dátumra hibát dob, nem NaN-t ad tovább", () => {
  assert.throws(
    () => onboardingSchedule({ startedAt: new Date("nem dátum"), interval: "month" }),
    RangeError
  );
});

// ── Több időszak előre fizetése ───────────────────────────────────────────
//
// Ez volt a rendszer legveszélyesebb vakfoltja: bármit fizetett az ügyfél,
// a rendszer EGY ciklusnak vette. Aki két évet utalt át, annál a következő
// esedékesség egy év múlva lett volna, és a fizetési emlékeztető kiment volna
// egy olyan ügyfélnek, aki már ki van fizetve — miközben a bankszámlán ott a
// pénze. Ez a fajta hiba nem egy hibaüzenet, hanem egy elvesztett ügyfél.

test("két év előre: a következő esedékesség két év múlva van", () => {
  const schedule = onboardingSchedule({
    startedAt: utc("2026-09-01"),
    lastPaymentAt: utc("2026-09-05"),
    interval: "year",
    periods: 2,
    now: utc("2026-09-17")
  });

  assert.equal(schedule.prepaidUntil.slice(0, 10), "2028-09-05");
  assert.equal(schedule.nextBillingAt.slice(0, 10), "2028-09-05");
  assert.equal(schedule.periods, 2);
});

test("három hónap előre havi ciklusnál", () => {
  const schedule = onboardingSchedule({
    startedAt: utc("2026-09-01"),
    lastPaymentAt: utc("2026-09-01"),
    interval: "month",
    periods: 3,
    now: utc("2026-09-17")
  });

  assert.equal(schedule.prepaidUntil.slice(0, 10), "2026-12-01");
  assert.equal(schedule.nextBillingAt.slice(0, 10), "2026-12-01");
});

test("a többidőszakos összeg a ciklusdíj többszöröse", () => {
  assert.equal(amountForInterval(14900, "month", 3), 44700);
  assert.equal(amountForInterval(14900, "year", 2), 357600);
  // Hiányzó vagy értelmetlen ciklusszám sosem csökkentheti az összeget.
  assert.equal(amountForInterval(14900, "month", 0), 14900);
  assert.equal(amountForInterval(14900, "month"), 14900);
});

test("a hónapvégi csonkolás többidőszakos fizetésnél sem halmozódik", () => {
  // Január 31-től három hónap: NEM április 28, hanem április 30.
  const schedule = onboardingSchedule({
    startedAt: utc("2026-01-31"),
    lastPaymentAt: utc("2026-01-31"),
    interval: "month",
    periods: 3,
    now: utc("2026-02-10")
  });
  assert.equal(schedule.prepaidUntil.slice(0, 10), "2026-04-30");
});

test("a lefedett időszak a befizetés napjától a végéig tart", () => {
  const period = billingPeriodFor(utc("2026-09-17"), "month", 6);
  assert.equal(period.start.toISOString().slice(0, 10), "2026-09-17");
  assert.equal(period.end.toISOString().slice(0, 10), "2027-03-17");
});

// ── Ügyfelenként alkudott éves ár ─────────────────────────────────────────
//
// Az éves előre fizetésnél ügyfelenként más kedvezmény születik. Ha ezt a
// havidíj átírásával oldanánk meg, tört forintösszeg kerülne a számlára, és
// eltűnne, hogy mennyi kedvezményt kapott. A `billing_amount` külön él, és
// MINDEN összeg innen származik — a számla, az emlékeztető és a fizetési link
// is. Ha bármelyik külön számolná, az ügyfél bankszámláján látszana a hiba.

test("az alkudott éves ár felülírja a listaárat", () => {
  // 14 900 × 12 = 178 800 lenne a listaár.
  assert.equal(cycleAmount({ monthlyPrice: 14900, interval: "year", agreed: 149000 }), 149000);
  assert.equal(cycleAmount({ monthlyPrice: 14900, interval: "year", agreed: 165000 }), 165000);
});

test("alkudott ár nélkül a NYILVÁNOS futamidő-ár érvényes (évesen 10 havidíj)", () => {
  // Nem 178 800: az árlista és a Checkout évesen két hónapot nem számol fel.
  // Korábban itt a 12-szeres összeg ment ki a megújítási emlékeztetőbe.
  assert.equal(cycleAmount({ monthlyPrice: 14900, interval: "year" }), 149000);
  assert.equal(cycleAmount({ monthlyPrice: 14900, interval: "year", agreed: null }), 149000);
  assert.equal(cycleAmount({ monthlyPrice: 14900, interval: "month" }), 14900);
  // A féléves ciklus teljes áron megy, kedvezmény nélkül.
  assert.equal(cycleAmount({ monthlyPrice: 14900, interval: 6 }), 89400);
});

test("a ciklusszám az alkudott árat is szorozza", () => {
  // Két év, egyenként 149 000-es alkudott áron.
  assert.equal(cycleAmount({ monthlyPrice: 14900, interval: "year", periods: 2, agreed: 149000 }), 298000);
});

test("értelmetlen alkudott ár sosem vezet nullás számlához", () => {
  for (const bad of [0, -1000, Number.NaN, undefined, null]) {
    assert.equal(cycleAmount({ monthlyPrice: 14900, interval: "year", agreed: bad }), 149000);
  }
});

test("a kedvezmény hónapban is kifejezhető", () => {
  const a = cycleDiscount({ monthlyPrice: 14900, interval: "year", agreed: 149000 });
  assert.equal(a.list, 178800);
  assert.equal(a.actual, 149000);
  assert.equal(a.saved, 29800);
  assert.equal(a.months, 2);           // pontosan két havidíj

  const b = cycleDiscount({ monthlyPrice: 14900, interval: "year", agreed: 165000 });
  assert.equal(b.saved, 13800);
  assert.equal(b.months, 0.9);         // nem egész — a tizedes valódi információ
});

test("kedvezmény nélkül nincs mit mutatni", () => {
  assert.equal(cycleDiscount({ monthlyPrice: 14900, interval: "month" }), null);
  assert.equal(cycleDiscount({ monthlyPrice: 14900, interval: 6 }), null);
  // Alkudott ár nélkül az éves ciklus a nyilvános két hónapos kedvezményt kapja.
  assert.equal(cycleDiscount({ monthlyPrice: 14900, interval: "year" }).months, 2);
  // A listaárnál DRÁGÁBB alkudott ár sem „negatív kedvezmény".
  assert.equal(cycleDiscount({ monthlyPrice: 14900, interval: "year", agreed: 200000 }), null);
});
