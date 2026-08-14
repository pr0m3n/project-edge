import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse } from "@/lib/api-guard";
import { isAcceptableMonthlyPrice } from "@/lib/billing-math";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient, createServerSupabaseUserClient } from "@/lib/supabase/server";
import { getStripe, hufToStripeAmount, siteUrl } from "@/lib/stripe";
import { subscriptionPlan } from "@/lib/subscriptions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "stripe-checkout", 12, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });

    const body = await request.json().catch(() => null) as { projectId?: string } | null;
    if (!body?.projectId || !isUuid(body.projectId)) {
      return NextResponse.json({ error: "Érvénytelen projektazonosító." }, { status: 400 });
    }

    const accessToken = request.headers.get("authorization")?.slice("Bearer ".length).trim();
    if (!accessToken) return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });

    // A projektet a felhasználó saját RLS-jogosultságával olvassuk. Így egy
    // hibás deployment service-role kulcs nem látszik többé hamisan 404-nek.
    const userClient = createServerSupabaseUserClient(accessToken);
    const { data: project, error: projectError } = await userClient.from("client_projects")
      .select("id,user_id,title,company,commercial_model,subscription_plan,monthly_price,contract_accepted,contract_accepted_at,subscription_status,stripe_customer_id,stripe_subscription_id")
      .eq("id", body.projectId).maybeSingle();
    if (projectError) {
      console.error("Stripe checkout project lookup failed", { code: projectError.code, message: projectError.message });
      return NextResponse.json({ error: "A projekt fizetési adatai most nem tölthetők be. Próbáld újra rövidesen." }, { status: 500 });
    }
    if (!project) return NextResponse.json({ error: "A projekt nem található, vagy nincs hozzáférésed." }, { status: 404 });

    const admin = createServerSupabaseAdminClient();
    const { data: adminProject, error: adminCheckError } = await admin.from("client_projects").select("id").eq("id", project.id).maybeSingle();
    if (adminCheckError || !adminProject) {
      console.error("Stripe checkout admin connection failed", {
        code: adminCheckError?.code ?? "project_not_visible",
        message: adminCheckError?.message ?? "Project is not visible to the configured admin client."
      });
      return NextResponse.json({ error: "A fizetési kapcsolat szerverbeállítása hibás. Kérj segítséget az ügyfélkapuban." }, { status: 503 });
    }
    if (project.commercial_model !== "subscription" || !project.contract_accepted) {
      return NextResponse.json({ error: "Ehhez a projekthez még nincs elfogadott előfizetési szerződés." }, { status: 409 });
    }
    if (project.stripe_subscription_id && ["active", "trialing"].includes(project.subscription_status ?? "")) {
      return NextResponse.json({ error: "Ehhez a projekthez már aktív előfizetés tartozik." }, { status: 409 });
    }

    const stripe = getStripe();
    const plan = subscriptionPlan(project.subscription_plan);
    // A SZERZŐDÉSBEN rögzített havidíj a mérvadó, nem a kód aktuális ára.
    //
    // Korábban `monthlyPrice !== plan.price` volt a feltétel: ettől a
    // `lib/subscriptions.ts` bármely ármódosítása azonnal fizetésképtelenné
    // tette az összes már aláírt, de még nem fizetett projektet. A tárolt
    // `monthly_price`-t a 021/025/027 adatbázis-trigger amúgy is a hivatalos
    // csomagárra korlátozza a projekt indításakor, tehát nem az ügyfél írja.
    // Itt csak józansági határokat ellenőrzünk.
    const monthlyPrice = Number(project.monthly_price ?? plan.price);
    if (!isAcceptableMonthlyPrice(monthlyPrice)) {
      return NextResponse.json({ error: "A projekt előfizetési díja érvénytelen. Kérj segítséget az ügyfélkapuban." }, { status: 409 });
    }
    if (monthlyPrice !== plan.price) {
      console.warn("Stripe checkout uses the contracted price", { projectId: project.id, monthlyPrice, planPrice: plan.price });
    }

    /**
     * Éles rendszerpróba kedvezménnyel.
     *
     * A Stripe tiltja az élő mód tesztkártyás terheléseit, a `smoke-test`
     * végpont ezért csak sandboxban fut. Ha viszont az éles láncot (kártya →
     * webhook → Billingo) kell igazolni, arra ez a kedvezmény való: valódi
     * tranzakció, néhány száz forintos összeggel.
     *
     * KETTŐS KAPU, szándékosan:
     *  1. a `STRIPE_TEST_COUPON` env változónak léteznie kell, és
     *  2. a hívó felhasználónak adminnak kell lennie.
     * Így egy ügyfél akkor sem kaphatja meg, ha a változó véletlenül bent
     * marad — a teszt után viszont töröld, ez nem üzemszerű beállítás.
     *
     * A Stripe `allow_promotion_codes` szándékosan NINCS bekapcsolva: az
     * minden vásárlónak megjelenítene egy kuponmezőt a Checkoutban, ami
     * rontja a konverziót.
     */
    const testCoupon = process.env.STRIPE_TEST_COUPON?.trim() || "";
    const applyTestCoupon = Boolean(testCoupon) && await isAdminUser(request, user.id);
    if (applyTestCoupon) {
      console.warn("Stripe checkout runs with the admin test coupon", { projectId: project.id, coupon: testCoupon });
    }

    let customerId = project.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: project.company || user.user_metadata?.full_name || undefined,
        metadata: { projectedge_user_id: user.id }
      });
      customerId = customer.id;
    } else {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) customerId = null;
      } catch {
        customerId = null;
      }
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: project.company || user.user_metadata?.full_name || undefined,
          metadata: { projectedge_user_id: user.id }
        });
        customerId = customer.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      // The plans are fixed Hungarian-forint prices. Do not let Stripe's
      // Adaptive Pricing replace them with a customer-local EUR amount.
      adaptive_pricing: { enabled: false },
      customer: customerId,
      ...(applyTestCoupon ? { discounts: [{ coupon: testCoupon }] } : {}),
      client_reference_id: project.id,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      customer_update: { address: "auto", name: "auto" },
      payment_method_types: ["card"],
      locale: "hu",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "huf",
          unit_amount: hufToStripeAmount(monthlyPrice),
          recurring: { interval: "month" },
          product_data: {
            name: `ProjectEdge ${plan.name} előfizetés`,
            description: "Menedzselt weboldal, tárhely, technikai felügyelet és a csomag szerinti módosítások.",
            metadata: { project_id: project.id, subscription_plan: plan.key }
          }
        }
      }],
      subscription_data: {
        description: `${project.title} · ProjectEdge ${plan.name}`,
        metadata: { project_id: project.id, user_id: user.id, subscription_plan: plan.key }
      },
      metadata: { project_id: project.id, user_id: user.id, subscription_plan: plan.key },
      success_url: `${siteUrl()}/ugyfelkapu/dashboard?payment=success`,
      cancel_url: `${siteUrl()}/ugyfelkapu/dashboard?payment=cancelled`
    }, {
      // A dupla kattintás és a hálózati újraküldés nem hozhat létre két előfizetést.
      // v2 also invalidates sessions created before the HUF minor-unit fix.
      // Az ár is része a kulcsnak: egy utólagos díjkorrekció után új munkamenet
      // kell, különben a Stripe a régi összegű sessiont adná vissza.
      // A kedvezmény része a kulcsnak: enélkül a Stripe a korábban létrehozott,
      // teljes árú munkamenetet adná vissza, és a próba a teljes havidíjjal
      // futna le.
      idempotencyKey: `projectedge-subscription-v3-${project.id}-${monthlyPrice}-${applyTestCoupon ? testCoupon : "full"}-${project.contract_accepted_at ?? "accepted"}`
    });

    const { error: updateError } = await admin.from("client_projects").update({
      stripe_customer_id: customerId,
      stripe_checkout_session_id: session.id
    }).eq("id", project.id).eq("user_id", user.id);
    if (updateError) throw new Error("A Stripe munkamenet mentése nem sikerült.");

    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Stripe checkout creation failed", error);
    return NextResponse.json({ error: "A biztonságos fizetési oldal most nem indítható el. Próbáld újra később." }, { status: 500 });
  }
}
