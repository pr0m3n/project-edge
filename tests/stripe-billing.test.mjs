import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("subscription checkout is server-priced and webhook verified", () => {
  const checkout = read("app/api/stripe/checkout/route.ts");
  const webhook = read("app/api/stripe/webhook/route.ts");
  assert.match(checkout, /subscriptionPlan\(project\.subscription_plan\)/);
  assert.match(checkout, /unit_amount: hufToStripeAmount\(monthlyPrice\)/);
  assert.match(checkout, /adaptive_pricing: \{ enabled: false \}/);
  assert.match(checkout, /projectedge-subscription-v3-/);
  assert.doesNotMatch(checkout, /body\.(amount|price)/);
  assert.match(checkout, /createServerSupabaseUserClient\(accessToken\)/);
  assert.match(checkout, /Stripe checkout admin connection failed/);
  assert.doesNotMatch(checkout, /if \(error \|\| !project\).*A projekt nem található/);
  assert.match(webhook, /constructEvent\(await request\.text\(\), signature, secret\)/);
  assert.match(webhook, /stripe_webhook_events/);
  assert.match(webhook, /invoice\.paid/);
  assert.match(webhook, /invoice\.payment_failed/);
  assert.match(webhook, /stripeAmountToHuf\(invoice\.amount_paid, invoice\.currency\)/);
});

test("public brief supports a saved custom palette", () => {
  const brief = read("components/PublicBriefWizard.tsx");
  assert.match(brief, /palette: "custom"/);
  assert.match(brief, /form\.customBg/);
  assert.match(brief, /form\.customAccent/);
  assert.match(brief, /form\.customText/);
  assert.match(brief, /form\.customCta/);
  assert.match(brief, /public-preview-hero/);
});

test("one-off transfers use the new dedicated HUF account", () => {
  // A banki adatok a ClientPortal szétbontásakor a format modulba kerültek.
  const format = read("components/portal/format.ts");
  assert.match(format, /30200014-19613410-97673621/);
  assert.match(format, /HU51 3020 0014 1961 3410 9767 3621/);
  assert.doesNotMatch(format, /HU66 3020 0014 1991 3410 3979 7092/);
  // A régi számla sehol máshol se maradhasson bent.
  assert.doesNotMatch(read("components/ClientPortal.tsx"), /HU66 3020 0014 1991 3410 3979 7092/);
});

test("Billingo invoices are AAM and tied to the Stripe invoice", () => {
  const billingo = read("lib/billingo.ts");
  assert.match(billingo, /vendor_id: `stripe-\$\{input\.stripeInvoiceId\}`/);
  assert.match(billingo, /vat: "AAM"/);
  assert.match(billingo, /entitlement: "AAM"/);
});
