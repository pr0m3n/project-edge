import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY nincs beállítva.");
  stripeClient ??= new Stripe(secretKey, { appInfo: { name: "ProjectEdge", version: "1.0.0" } });
  return stripeClient;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.projectedge.hu").replace(/\/$/, "");
}
