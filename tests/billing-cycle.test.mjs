import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  addBillingInterval,
  agreedAmountFor,
  billingIntervalLabel,
  billingUnitLabel,
  CYCLE_FREE_MONTHS,
  cycleAmount,
  monthlyRevenue,
  projectCycleMonths
} from "../lib/onboarding.ts";
import { monthsFromStripeRecurring, stripeRecurringForMonths } from "../lib/billing-math.ts";
import { BILLING_TERMS, termTotal } from "../lib/subscriptions.ts";
import { isPrivateAddress } from "../lib/private-address.ts";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const utc = (value) => new Date(`${value}T00:00:00.000Z`);

/**
 * A FÉLÉVES CIKLUS. A `billing_interval` a félévest „month"-nak tárolja, ezért
 * minden útvonal, ami csak abból számolt, egy hónap múlva újra esedékesnek
 * jelölte a fél évre előre fizető ügyfelet, havidíjnyi összeggel.
 */
test("a projekt ciklusa a hónapszámból jön, nem az intervallumból", () => {
  assert.equal(projectCycleMonths({ billing_period_months: 6, billing_interval: "month" }), 6);
  assert.equal(projectCycleMonths({ billing_period_months: 12, billing_interval: "year" }), 12);
  assert.equal(projectCycleMonths({ billing_period_months: 1, billing_interval: "month" }), 1);
  // A 044 előtti vagy csak intervallumot író sor: éves, de a hónapszám az alapérték.
  assert.equal(projectCycleMonths({ billing_period_months: 1, billing_interval: "year" }), 12);
  assert.equal(projectCycleMonths({ billing_interval: "year" }), 12);
  assert.equal(projectCycleMonths({}), 1);
  // Ha a lekérdezés nem hozza az intervallumot, a hónapszám dönt.
  assert.equal(projectCycleMonths({ billing_period_months: 12 }), 12);
  assert.equal(projectCycleMonths({ billing_period_months: 6 }), 6);
  // Értelmetlen hónapszám nem vezethet furcsa ciklushoz.
  assert.equal(projectCycleMonths({ billing_period_months: 7, billing_interval: "month" }), 1);
});

test("féléves ciklusnál fél évvel lép a fordulónap", () => {
  assert.equal(addBillingInterval(utc("2026-09-22"), 6).toISOString().slice(0, 10), "2027-03-22");
  assert.equal(addBillingInterval(utc("2026-08-31"), 6).toISOString().slice(0, 10), "2027-02-28");
  assert.equal(billingIntervalLabel(6), "féléves");
  assert.equal(billingUnitLabel(6), "félév");
  assert.equal(billingIntervalLabel("year"), "éves");
});

test("a ciklusdíj megegyezik a Checkout futamidő-árával", () => {
  // Ugyanaz a szám kerül a Checkoutba (termTotal), az emlékeztetőbe és a
  // fizetési linkre (cycleAmount). Ha elcsúszik, az ügyfél két árat lát.
  for (const term of BILLING_TERMS) {
    assert.equal(cycleAmount({ monthlyPrice: 24900, interval: term.months }), termTotal(24900, term), term.key);
  }
});

test("az ingyenes hónapok másolata szinkronban van az árlistával", () => {
  for (const term of BILLING_TERMS) {
    assert.equal(CYCLE_FREE_MONTHS[term.months] ?? 0, term.freeMonths, term.key);
  }
});

test("az alkudott ár csak a saját ciklusára érvényes", () => {
  const yearlyDeal = { billing_amount: 149000, billing_period_months: 12, billing_interval: "year" };
  assert.equal(agreedAmountFor(yearlyDeal, 12), 149000);
  // Éves alkuval havi fizetés: nem terhelhetjük havonta az éves díjat.
  assert.equal(agreedAmountFor(yearlyDeal, 1), null);
  assert.equal(agreedAmountFor(yearlyDeal, 6), null);
  assert.equal(agreedAmountFor({ billing_amount: null, billing_period_months: 12 }, 12), null);
  assert.equal(agreedAmountFor({ billing_amount: 0, billing_period_months: 1 }, 1), null);
});

test("az MRR a ciklus hosszával oszt", () => {
  assert.equal(monthlyRevenue({ monthlyPrice: 14900, interval: 6 }), 14900);
  assert.equal(monthlyRevenue({ monthlyPrice: 14900, interval: "year", agreed: 149000 }), 12417);
});

test("a Stripe-ismétlődés és a hónapszám oda-vissza ugyanaz", () => {
  assert.deepEqual(stripeRecurringForMonths(1), { interval: "month", interval_count: 1 });
  assert.deepEqual(stripeRecurringForMonths(6), { interval: "month", interval_count: 6 });
  assert.deepEqual(stripeRecurringForMonths(12), { interval: "year", interval_count: 1 });
  assert.deepEqual(stripeRecurringForMonths(24), { interval: "year", interval_count: 2 });
  for (const months of [1, 3, 6, 12, 24]) {
    assert.equal(monthsFromStripeRecurring(stripeRecurringForMonths(months)), months);
  }
  assert.equal(monthsFromStripeRecurring(null), 1);
});

/**
 * SZÜNETELTETÉS ÉS FOLYTATÁS. Az árcsere megtartja a Stripe-tétel ciklusát,
 * tehát az összegnek is a ciklusra kell szólnia — egy éves előfizetésnél a
 * havidíj átadása 14 900 Ft-os ÉVES díjat jelentett volna.
 */
test("a szüneteltetés és a folytatás ciklusdíjjal cserél árat", () => {
  const route = read("app/api/stripe/subscription/route.ts");
  assert.match(route, /PARKING_MONTHLY_PRICE \* months/);
  assert.match(route, /cycleAmount\(\{[\s\S]*?interval: months,[\s\S]*?agreed: agreedAmountFor\(project, months\)/);
  // Megszűnt előfizetést nem lehet „folytatni".
  assert.match(route, /CanceledSubscriptionError/);
});

test("a webhook a friss előfizetésből számol, és nem ébreszti fel a parkolót", () => {
  const webhook = read("app/api/stripe/webhook/route.ts");
  // Az állapot a közös leképezésből jön, benne a parkolás jelzőjével.
  assert.match(webhook, /subscriptionStatusFromStripe\([\s\S]*?Boolean\(project\.stripe_parked_at\)/);
  // A késve érkező esemény helyett a jelenlegi állapot.
  assert.match(webhook, /getStripe\(\)\.subscriptions\.retrieve\(eventSubscription\.id\)/);
  // Lecserélt előfizetés eseménye nem írja felül az aktuálisat.
  assert.match(webhook, /project\.stripe_subscription_id !== eventSubscription\.id/);
  // A számla kifizetése nem állít vakon aktívra.
  assert.match(webhook, /subscription_status: derivedStatus/);
});

test("mellé indított új előfizetés nem futhat a régi mellett", () => {
  const checkout = read("app/api/stripe/checkout/route.ts");
  const link = read("app/api/admin/payment-link/route.ts");
  assert.match(checkout, /hasLiveStripeSubscription\(project\.stripe_subscription_id\)/);
  assert.match(link, /hasLiveStripeSubscription\(project\.stripe_subscription_id\)/);
  // Az előre kifizetett ügyfél kártyás linkje nem terhel azonnal.
  assert.match(link, /trial_end: trialEnd/);
});

test("a belső címek felismerése (SSRF)", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPrivateAddress(address), true, address);
  }
  for (const address of ["76.76.21.21", "172.32.0.1", "8.8.8.8", "2606:4700::1111"]) {
    assert.equal(isPrivateAddress(address), false, address);
  }
  assert.equal(isPrivateAddress("nem-cim"), true);
});

test("az ügyfél nem írhatja a saját díját és ciklusát (046)", () => {
  const migration = read("supabase/migrations/046_billing_field_guard.sql");
  for (const column of ["billing_amount", "billing_period_months", "billing_interval", "prepaid_until", "live_url"]) {
    assert.match(migration, new RegExp(`new\\.${column} is distinct from old\\.${column}`), column);
  }
  assert.match(migration, /before insert or update on public\.client_projects/);
  assert.match(migration, /revoke all on function public\.prune_site_checks\(\) from public, anon, authenticated/);
  assert.match(migration, /where id = p_purchase_id\s+and user_id = auth\.uid\(\);/);
});
