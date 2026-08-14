import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse } from "@/lib/api-guard";
import { authenticatedUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient, createServerSupabaseUserClient } from "@/lib/supabase/server";
import { getStripe, hufToStripeAmount, siteUrl } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "change-request-checkout", 8, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });

    const body = await request.json().catch(() => null) as { requestId?: string } | null;
    if (!body?.requestId || !isUuid(body.requestId)) {
      return NextResponse.json({ error: "Érvénytelen módosítási azonosító." }, { status: 400 });
    }

    const token = request.headers.get("authorization")?.slice("Bearer ".length).trim();
    if (!token) return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });

    const userClient = createServerSupabaseUserClient(token);
    const { data: changeRequest, error: requestError } = await userClient
      .from("change_requests")
      .select("id,project_id,user_id,status,quoted_amount,quote_accepted_at,payment_method,paid_at,transfer_reported_at,stripe_checkout_session_id")
      .eq("id", body.requestId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (requestError) throw requestError;
    if (!changeRequest) return NextResponse.json({ error: "A módosítási kérés nem található." }, { status: 404 });
    if (
      changeRequest.status !== "waiting_client" ||
      !changeRequest.quote_accepted_at ||
      !changeRequest.quoted_amount ||
      changeRequest.payment_method !== "card" ||
      changeRequest.paid_at ||
      changeRequest.transfer_reported_at
    ) {
      return NextResponse.json({ error: "Ehhez az ajánlathoz most nem indítható kártyás fizetés." }, { status: 409 });
    }

    if (changeRequest.stripe_checkout_session_id) {
      const existing = await getStripe().checkout.sessions.retrieve(changeRequest.stripe_checkout_session_id);
      if (existing.url) return NextResponse.json({ url: existing.url }, { headers: { "Cache-Control": "no-store" } });
    }

    const { data: project, error: projectError } = await userClient
      .from("client_projects")
      .select("id,title,stripe_customer_id")
      .eq("id", changeRequest.project_id)
      .maybeSingle();
    if (projectError) throw projectError;
    if (!project) return NextResponse.json({ error: "A weboldal nem található." }, { status: 404 });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      adaptive_pricing: { enabled: false },
      ...(project.stripe_customer_id ? { customer: project.stripe_customer_id } : { customer_email: user.email || undefined }),
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      customer_update: project.stripe_customer_id ? { address: "auto", name: "auto" } : undefined,
      payment_method_types: ["card"],
      locale: "hu",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "huf",
          unit_amount: hufToStripeAmount(changeRequest.quoted_amount),
          product_data: {
            name: `ProjectEdge módosítás — ${project.title}`,
            description: "Előre egyeztetett weboldal-módosítás vagy új funkció.",
            metadata: { change_request_id: changeRequest.id, project_id: project.id }
          }
        }
      }],
      payment_intent_data: {
        metadata: { change_request_id: changeRequest.id, project_id: project.id, user_id: user.id }
      },
      metadata: { change_request_id: changeRequest.id, project_id: project.id, user_id: user.id },
      client_reference_id: changeRequest.id,
      success_url: `${siteUrl()}/ugyfelkapu/dashboard?change_payment=success`,
      cancel_url: `${siteUrl()}/ugyfelkapu/dashboard?change_payment=cancelled`
    }, {
      idempotencyKey: `projectedge-change-request-v1-${changeRequest.id}-${changeRequest.quote_accepted_at}-${changeRequest.quoted_amount}`
    });

    const admin = createServerSupabaseAdminClient();
    const { error: saveError } = await admin.from("change_requests").update({
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null
    }).eq("id", changeRequest.id);
    if (saveError) throw saveError;

    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Change request checkout creation failed", error);
    return NextResponse.json({ error: "A módosítás kártyás fizetése most nem indítható el. Próbáld újra később." }, { status: 500 });
  }
}
