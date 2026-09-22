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
 * Használható Stripe-vevő biztosítása a projekthez.
 *
 * A tárolt `stripe_customer_id` nem elég: a vevőt a Stripe felületén bármikor
 * törölhetik, és egy törölt vevőre hivatkozó Checkout azonnal hibára fut. Ezért
 * a meglévő azonosítót mindig visszaolvassuk, és csak akkor használjuk, ha él.
 *
 * A hívó dolga a visszakapott azonosító elmentése — itt szándékosan nincs
 * adatbázis-írás, hogy a függvény a Checkout és az admin fizetési link ágán is
 * ugyanaz maradjon.
 */
export async function ensureStripeCustomer(input: {
  customerId?: string | null;
  email?: string | null;
  name?: string | null;
  userId: string;
}) {
  const stripe = getStripe();

  if (input.customerId) {
    try {
      const existing = await stripe.customers.retrieve(input.customerId);
      if (!existing.deleted) return input.customerId;
    } catch {
      /* törölt vagy ismeretlen vevő — újat hozunk létre */
    }
  }

  const customer = await stripe.customers.create({
    email: input.email ?? undefined,
    name: input.name ?? undefined,
    metadata: { projectedge_user_id: input.userId }
  });
  return customer.id;
}

/**
 * Az előfizetés első (és egyetlen) tételének árcseréje.
 *
 * `proration_behavior: "none"`: a már kifizetett időszakot nem bántjuk, az új
 * ár a következő számlázási ciklustól él. Ez az elvárt viselkedés mind a
 * parkolásnál, mind a visszaállításnál.
 *
 * A ciklust a MEGLÉVŐ tételből vesszük át, nem égetjük be havira: egy éves
 * előfizetésnél a beégetett `interval: "month"` az árcserével együtt csendben
 * havi ciklusra állította volna az ügyfelet, és a következő fordulón egy
 * hónappal később terhelt volna — ez a fajta hiba csak a bankszámlán látszik.
 */
export async function swapSubscriptionPrice(
  subscription: Stripe.Subscription,
  productId: string,
  amountHuf: number
) {
  const item = subscription.items.data[0];
  if (!item) throw new Error("A Stripe-előfizetéshez nem tartozik tétel.");
  const recurring = item.price.recurring;
  // A Stripe típusa nyitott (`OtherString`) a későbbi ciklusok kedvéért, ezért
  // szűkíteni kell arra a négyre, amit a Subscriptions API tényleg elfogad.
  const known: Stripe.SubscriptionUpdateParams.Item.PriceData.Recurring.Interval[] = ["day", "week", "month", "year"];
  const interval = known.find((value) => value === recurring?.interval) ?? "month";

  return getStripe().subscriptions.update(subscription.id, {
    proration_behavior: "none",
    items: [{
      id: item.id,
      price_data: {
        currency: "huf",
        product: productId,
        unit_amount: hufToStripeAmount(amountHuf),
        recurring: {
          interval,
          ...(recurring?.interval_count ? { interval_count: recurring.interval_count } : {})
        }
      }
    }]
  });
}

/**
 * Fut-e még a tárolt Stripe-előfizetés (tehát terhelhet-e).
 *
 * Nem az adatbázis `subscription_status`-ára hagyatkozunk: egy lemondás alatt
 * álló (`cancel_requested`) vagy parkoló (`paused`) előfizetés a Stripe-ban
 * még él és terhel. Ha mellé új Checkout indul, az ügyfélnek két előfizetése
 * fut egyszerre. Csak a véglegesen megszűnt vagy soha el nem indult (lejárt,
 * befejezetlen) előfizetés mellé indítható új.
 */
export async function hasLiveStripeSubscription(subscriptionId: string | null | undefined) {
  if (!subscriptionId) return false;
  try {
    const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
    return !["canceled", "incomplete_expired", "incomplete"].includes(subscription.status);
  } catch (error) {
    // A Stripe már nem ismeri (törölték) — ez nem élő előfizetés.
    if ((error as Stripe.errors.StripeError)?.code === "resource_missing") return false;
    throw error;
  }
}

export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const end = subscription.items.data[0]?.current_period_end;
  return end ? new Date(end * 1000).toISOString() : null;
}
