import { NextResponse } from "next/server";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { getStripe, hufToStripeAmount, siteUrl } from "@/lib/stripe";
import { checkRateLimit, rateLimitResponse } from "@/lib/api-guard";

export const runtime = "nodejs";

/**
 * Valódi Checkout-próba, de kizárólag Stripe sandboxban. Éles kulccsal a
 * végpont szándékosan leáll: a Stripe tiltja az élő mód tesztkártyás vagy
 * saját kártyás próbaterheléseit. A 200 Ft a hivatalos 175 Ft HUF-minimum
 * fölött van, miközben elég alacsony egy teljes folyamatpróbához.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(request, "stripe-smoke-test", 5, 10 * 60 * 1000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const user = await authenticatedUser(request);
  if (!user || !(await isAdminUser(request, user.id))) {
    return NextResponse.json({ error: "Nincs jogosultságod ehhez a teszthez." }, { status: 403 });
  }

  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  if (process.env.STRIPE_SMOKE_TEST_ENABLED !== "true" || !secret.startsWith("sk_test_")) {
    return NextResponse.json({
      error: "A fizetési próba csak külön engedélyezett Stripe sandbox környezetben futtatható."
    }, { status: 409 });
  }

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    locale: "hu",
    payment_method_types: ["card"],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "huf",
        unit_amount: hufToStripeAmount(200),
        product_data: { name: "ProjectEdge fizetési rendszer sandbox próba" }
      }
    }],
    metadata: { smoke_test: "true", requested_by: user.id },
    success_url: `${siteUrl()}/admin/dashboard?payment-test=success`,
    cancel_url: `${siteUrl()}/admin/dashboard?payment-test=cancelled`
  });

  return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
}
