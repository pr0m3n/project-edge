import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/**
 * Stripe represents HUF charges in the currency's smallest charge unit. The
 * dashboard then displays the resulting amount in HUF/EUR. Keep the app's
 * prices in whole forints and convert only at the Stripe boundary.
 */
export function hufToStripeAmount(amountHuf: number) {
  return amountHuf * 100;
}

export function stripeAmountToHuf(amount: number, currency?: string | null) {
  return currency?.toLowerCase() === "huf" ? Math.round(amount / 100) : amount;
}

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY nincs beállítva.");
  stripeClient ??= new Stripe(secretKey, { appInfo: { name: "ProjectEdge", version: "1.0.0" } });
  return stripeClient;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.projectedge.hu").replace(/\/$/, "");
}
