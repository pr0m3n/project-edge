/**
 * Függőségmentes számlázási logika.
 *
 * Szándékosan nem importál semmit (sem `server-only`-t, sem a Stripe SDK-t),
 * hogy `node --test` alatt közvetlenül futtatható legyen. A korábbi tesztek
 * csak a forrásszöveget grepelték, ezért nem fogták meg a HUF-szorzó hibát —
 * ez a modul az, amit tényleg ki lehet számolni.
 */

/**
 * A Stripe a HUF összegeket is a pénznem legkisebb egységében várja, tehát a
 * forint értéket százzal kell szorozni. (A dashboard ezt utána forintként
 * jeleníti meg.) Az alkalmazás mindenhol egész forintban számol, a váltás
 * kizárólag a Stripe határán történik.
 */
export function hufToStripeAmount(amountHuf: number) {
  return amountHuf * 100;
}

/** A Stripe felől érkező összeg visszaváltása egész forintra. */
export function stripeAmountToHuf(amount: number, currency?: string | null) {
  return currency?.toLowerCase() === "huf" ? Math.round(amount / 100) : amount;
}

export type SubscriptionStatus =
  | "active"
  | "past_due"
  | "paused"
  | "cancel_requested"
  | "cancelled";

/**
 * Stripe-előfizetési státusz leképezése a saját állapotainkra.
 *
 * A `parked` külön paraméter: a szüneteltetést árcserével valósítjuk meg, a
 * Stripe státusza közben `active` marad. Enélkül a napi egyeztetés minden
 * parkoló előfizetést visszaaktiválna.
 */
export function subscriptionStatusFromStripe(
  stripeStatus: string,
  cancelAtPeriodEnd: boolean,
  parked: boolean
): SubscriptionStatus | null {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      if (parked) return "paused";
      return cancelAtPeriodEnd ? "cancel_requested" : "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    default:
      return null;
  }
}

/**
 * A szerződésben rögzített havidíj józansági ellenőrzése a Checkouthoz.
 * Nem a kód aktuális csomagárához hasonlít: egy későbbi ármódosítás nem
 * teheti fizetésképtelenné a már aláírt projekteket.
 */
export function isAcceptableMonthlyPrice(value: number) {
  return Number.isSafeInteger(value) && value >= 1_000 && value <= 1_000_000;
}
