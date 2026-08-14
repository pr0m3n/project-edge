import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse } from "@/lib/api-guard";
import { authenticatedUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient, createServerSupabaseUserClient } from "@/lib/supabase/server";
import { getStripe, hufToStripeAmount, siteUrl } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "website-purchase-checkout", 8, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });

    const body = await request.json().catch(() => null) as { purchaseId?: string } | null;
    if (!body?.purchaseId || !isUuid(body.purchaseId)) {
      return NextResponse.json({ error: "Érvénytelen tulajdonba-vételi azonosító." }, { status: 400 });
    }

    const token = request.headers.get("authorization")?.slice("Bearer ".length).trim();
    if (!token) return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });

    const userClient = createServerSupabaseUserClient(token);
    const { data: purchase, error: purchaseError } = await userClient
      .from("website_purchases")
      .select("id,project_id,user_id,status,payment_method,payment_status,amount,payment_reference,billing_email,billing_name,stripe_checkout_session_id")
      .eq("id", body.purchaseId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (purchaseError) throw purchaseError;
    if (!purchase) return NextResponse.json({ error: "A tulajdonba-vétel nem található." }, { status: 404 });
    if (purchase.status !== "payment_pending" || purchase.payment_method !== "card" || purchase.payment_status !== "unpaid") {
      return NextResponse.json({ error: "Ehhez a tulajdonba-vételhez most nem indítható kártyás fizetés." }, { status: 409 });
    }
    if (purchase.stripe_checkout_session_id) {
      const existing = await getStripe().checkout.sessions.retrieve(purchase.stripe_checkout_session_id);
      if (existing.url) return NextResponse.json({ url: existing.url }, { headers: { "Cache-Control": "no-store" } });
    }

    const { data: project, error: projectError } = await userClient
      .from("client_projects")
      .select("id,title,company,stripe_customer_id")
      .eq("id", purchase.project_id)
      .maybeSingle();
    if (projectError) throw projectError;
    if (!project) return NextResponse.json({ error: "A weboldal nem található." }, { status: 404 });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      adaptive_pricing: { enabled: false },
      ...(project.stripe_customer_id ? { customer: project.stripe_customer_id } : { customer_email: purchase.billing_email || user.email || undefined }),
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      customer_update: project.stripe_customer_id ? { address: "auto", name: "auto" } : undefined,
      payment_method_types: ["card"],
      locale: "hu",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "huf",
          unit_amount: hufToStripeAmount(purchase.amount),
          product_data: {
            name: `ProjectEdge weboldal tulajdonba vétele — ${project.title}`,
            description: "A weboldal forráskódjának, technikai rendszerének és kapcsolódó hozzáféréseinek átadása.",
            metadata: { purchase_id: purchase.id, project_id: project.id }
          }
        }
      }],
      payment_intent_data: {
        metadata: { website_purchase_id: purchase.id, project_id: project.id, user_id: user.id }
      },
      metadata: { website_purchase_id: purchase.id, project_id: project.id, user_id: user.id },
      client_reference_id: purchase.id,
      success_url: `${siteUrl()}/ugyfelkapu/dashboard?purchase=success`,
      cancel_url: `${siteUrl()}/ugyfelkapu/dashboard?purchase=cancelled`
    }, {
      idempotencyKey: `projectedge-website-purchase-v1-${purchase.id}-${purchase.amount}`
    });

    const admin = createServerSupabaseAdminClient();
    const { error: saveError } = await admin.from("website_purchases").update({
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null
    }).eq("id", purchase.id);
    if (saveError) throw saveError;

    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Website purchase checkout creation failed", error);
    return NextResponse.json({ error: "A biztonságos kártyás fizetés most nem indítható el. Próbáld újra később." }, { status: 500 });
  }
}
