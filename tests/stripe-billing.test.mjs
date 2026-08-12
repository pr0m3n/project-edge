import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("subscription checkout is server-priced and webhook verified", () => {
  const checkout = read("app/api/stripe/checkout/route.ts");
  const webhook = read("app/api/stripe/webhook/route.ts");
  assert.match(checkout, /subscriptionPlan\(project\.subscription_plan\)/);
  assert.match(checkout, /unit_amount: monthlyPrice/);
  assert.doesNotMatch(checkout, /body\.(amount|price)/);
  assert.match(webhook, /constructEvent\(await request\.text\(\), signature, secret\)/);
  assert.match(webhook, /stripe_webhook_events/);
  assert.match(webhook, /invoice\.paid/);
  assert.match(webhook, /invoice\.payment_failed/);
});

test("one-off transfers use the new dedicated HUF account", () => {
  const portal = read("components/ClientPortal.tsx");
  assert.match(portal, /30200014-19613410-97673621/);
  assert.match(portal, /HU51 3020 0014 1961 3410 9767 3621/);
  assert.doesNotMatch(portal, /HU66 3020 0014 1991 3410 3979 7092/);
});

test("Billingo invoices are AAM and tied to the Stripe invoice", () => {
  const billingo = read("lib/billingo.ts");
  assert.match(billingo, /vendor_id: `stripe-\$\{input\.stripeInvoiceId\}`/);
  assert.match(billingo, /vat: "AAM"/);
  assert.match(billingo, /entitlement: "AAM"/);
});
