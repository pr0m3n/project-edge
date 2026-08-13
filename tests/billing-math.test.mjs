import assert from "node:assert/strict";
import test from "node:test";

import {
  hufToStripeAmount,
  isAcceptableMonthlyPrice,
  stripeAmountToHuf,
  subscriptionStatusFromStripe
} from "../lib/billing-math.ts";

test("HUF amounts round-trip through the Stripe minor unit", () => {
  // Ez a hiba került élesbe egyszer: a 24 900 Ft 249 Ft-ként ment a Stripe-ba.
  assert.equal(hufToStripeAmount(14900), 1_490_000);
  assert.equal(hufToStripeAmount(24900), 2_490_000);
  assert.equal(hufToStripeAmount(39900), 3_990_000);

  for (const price of [14900, 24900, 39900, 2900]) {
    assert.equal(stripeAmountToHuf(hufToStripeAmount(price), "huf"), price);
    assert.equal(stripeAmountToHuf(hufToStripeAmount(price), "HUF"), price);
  }
});

test("non-HUF amounts are left untouched", () => {
  assert.equal(stripeAmountToHuf(4999, "eur"), 4999);
  assert.equal(stripeAmountToHuf(4999, null), 4999);
  assert.equal(stripeAmountToHuf(4999, undefined), 4999);
});

test("parked subscriptions are never read as reactivated", () => {
  // A parkolás árcserével történik, a Stripe státusza közben 'active' marad.
  assert.equal(subscriptionStatusFromStripe("active", false, true), "paused");
  assert.equal(subscriptionStatusFromStripe("trialing", false, true), "paused");
  assert.equal(subscriptionStatusFromStripe("active", false, false), "active");
});

test("subscription status mapping covers the billing states", () => {
  assert.equal(subscriptionStatusFromStripe("active", true, false), "cancel_requested");
  assert.equal(subscriptionStatusFromStripe("past_due", false, false), "past_due");
  assert.equal(subscriptionStatusFromStripe("unpaid", false, false), "past_due");
  assert.equal(subscriptionStatusFromStripe("incomplete", false, false), "past_due");
  assert.equal(subscriptionStatusFromStripe("canceled", false, false), "cancelled");
  assert.equal(subscriptionStatusFromStripe("incomplete_expired", false, false), "cancelled");
  assert.equal(subscriptionStatusFromStripe("paused", false, false), "paused");
  // Ismeretlen állapotnál inkább nem írunk semmit, mint hogy rosszat írjunk.
  assert.equal(subscriptionStatusFromStripe("something_new", false, false), null);
});

test("a cancelled subscription stays cancelled even while parked", () => {
  assert.equal(subscriptionStatusFromStripe("canceled", false, true), "cancelled");
});

test("contracted monthly prices are accepted, absurd ones are not", () => {
  // A régi szabály a kód aktuális árához hasonlított, ezért egy ármódosítás
  // minden aláírt, még nem fizetett projektet fizetésképtelenné tett.
  for (const price of [14900, 24900, 39900, 12900, 49900]) {
    assert.equal(isAcceptableMonthlyPrice(price), true, `${price} legyen elfogadható`);
  }
  for (const price of [0, -1, 999, 1_000_001, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 2]) {
    assert.equal(isAcceptableMonthlyPrice(price), false, `${price} ne legyen elfogadható`);
  }
});
