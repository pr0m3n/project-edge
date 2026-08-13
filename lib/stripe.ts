import "server-only";

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

// A pénzügyi átváltás a `lib/billing-math.ts`-ben él, mert az függőségmentes
// és így valódi unit-teszttel fedhető (tests/billing-math.test.mjs).
export { hufToStripeAmount, stripeAmountToHuf } from "@/lib/billing-math";
import { hufToStripeAmount } from "@/lib/billing-math";

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY nincs beállítva.");
  stripeClient ??= new Stripe(secretKey, { appInfo: { name: "ProjectEdge", version: "1.0.0" } });
  return stripeClient;
}

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.projectedge.hu").replace(/\/$/, "");
}

/**
 * Determinisztikus azonosítójú termék létrehozása vagy újrahasználata.
 * A Stripe engedi a saját `id`-t terméklétrehozáskor, így nem kell külön
 * nyilvántartani, melyik termék mihez tartozik.
 */
export async function ensureStripeProduct(id: string, name: string, description: string) {
  const stripe = getStripe();
  try {
    const product = await stripe.products.retrieve(id);
    if (!product.deleted) return id;
  } catch {
    /* nincs még ilyen termék — létrehozzuk */
  }
  try {
    await stripe.products.create({ id, name, description });
  } catch (error) {
    // Párhuzamos kérés már létrehozta — ez nem hiba.
    if ((error as Stripe.errors.StripeError)?.code !== "resource_already_exists") throw error;
  }
  return id;
}

/**
 * Az előfizetés első (és egyetlen) tételének árcseréje.
 *
 * `proration_behavior: "none"`: a már kifizetett időszakot nem bántjuk, az új
 * ár a következő számlázási ciklustól él. Ez az elvárt viselkedés mind a
 * parkolásnál, mind a visszaállításnál.
 */
export async function swapSubscriptionPrice(
  subscription: Stripe.Subscription,
  productId: string,
  amountHuf: number
) {
  const item = subscription.items.data[0];
  if (!item) throw new Error("A Stripe-előfizetéshez nem tartozik tétel.");
  return getStripe().subscriptions.update(subscription.id, {
    proration_behavior: "none",
    items: [{
      id: item.id,
      price_data: {
        currency: "huf",
        product: productId,
        unit_amount: hufToStripeAmount(amountHuf),
        recurring: { interval: "month" }
      }
    }]
  });
}

export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const end = subscription.items.data[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}
