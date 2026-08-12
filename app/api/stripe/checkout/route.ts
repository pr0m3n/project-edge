import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse } from "@/lib/api-guard";
import { authenticatedUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";
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

    const admin = createServerSupabaseAdminClient();
    const { data: project, error } = await admin.from("client_projects")
      .select("id,user_id,title,company,commercial_model,subscription_plan,monthly_price,contract_accepted,contract_accepted_at,subscription_status,stripe_customer_id,stripe_subscription_id")
      .eq("id", body.projectId).eq("user_id", user.id).maybeSingle();
    if (error || !project) return NextResponse.json({ error: "A projekt nem található." }, { status: 404 });
    if (project.commercial_model !== "subscription" || !project.contract_accepted) {
      return NextResponse.json({ error: "Ehhez a projekthez még nincs elfogadott előfizetési szerződés." }, { status: 409 });
    }
    if (project.stripe_subscription_id && ["active", "trialing"].includes(project.subscription_status ?? "")) {
      return NextResponse.json({ error: "Ehhez a projekthez már aktív előfizetés tartozik." }, { status: 409 });
    }

    const stripe = getStripe();
    const plan = subscriptionPlan(project.subscription_plan);
    const monthlyPrice = Number(project.monthly_price ?? plan.price);
    if (!Number.isSafeInteger(monthlyPrice) || monthlyPrice <= 0 || monthlyPrice !== plan.price) {
      return NextResponse.json({ error: "A projekt előfizetési díja nem egyezik az aktuális csomaggal." }, { status: 409 });
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
      customer: customerId,
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
          unit_amount: monthlyPrice,
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
      idempotencyKey: `projectedge-subscription-${project.id}-${project.contract_accepted_at ?? "accepted"}`
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
