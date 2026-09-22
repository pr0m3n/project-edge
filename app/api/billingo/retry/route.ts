import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { billingPartyFromStripeCustomer, createBillingoSubscriptionInvoice, missingBillingFields, type BillingParty } from "@/lib/billingo";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { billingPartyForUser } from "@/lib/subscription-invoice";
import { subscriptionPlan } from "@/lib/subscriptions";
import { billingIntervalLabel, billingUnitLabel, projectCycleMonths } from "@/lib/onboarding";

export const runtime = "nodejs";

/**
 * Sikertelen AAM-számla újrapróbálása.
 *
 * A webhook eddig szépen eltárolta a `billingo_error`-t, de senki nem
 * dolgozta fel: a befizetés megtörtént, számla viszont nem készült. Ez NAV
 * szempontból sem hagyható nyitva, ezért az adminból egy kattintással
 * újrafuttatható a számlázás.
 */
export async function POST(request: Request) {
  const rate = checkRateLimit(request, "billingo-retry", 20, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });
    if (!(await isAdminUser(request, user.id))) {
      return NextResponse.json({ error: "Nincs admin jogosultság." }, { status: 403 });
    }

    const parsed = await readJsonBody<{ paymentId?: string }>(request, 2_000);
    if (!parsed.ok) return parsed.response;
    const paymentId = parsed.data?.paymentId;
    if (!paymentId || !isUuid(paymentId)) {
      return NextResponse.json({ error: "Érvénytelen befizetés-azonosító." }, { status: 400 });
    }

    const admin = createServerSupabaseAdminClient();
    const { data: payment, error } = await admin.from("subscription_payments")
      .select("id,project_id,amount,paid_at,stripe_invoice_id,billingo_document_id,payment_reference")
      .eq("id", paymentId).maybeSingle();
    if (error) throw error;
    if (!payment) return NextResponse.json({ error: "A befizetés nem található." }, { status: 404 });
    if (payment.billingo_document_id) {
      return NextResponse.json({ error: "Ehhez a befizetéshez már készült számla." }, { status: 409 });
    }
    const { data: project } = await admin.from("client_projects")
      .select("user_id,title,subscription_plan,billing_interval,billing_period_months").eq("id", payment.project_id).maybeSingle();
    if (!project) return NextResponse.json({ error: "A befizetés projektje nem található." }, { status: 404 });

    // A vevőadat két helyről jöhet, és MINDKETTŐ kell.
    //
    // A Stripe-os befizetésnél a Checkout gyűjtötte be a számlázási címet, a
    // kézzel rögzített utalásnál viszont nincs Stripe-vevő — ott a saját
    // `client_profiles` adataink a forrás. Korábban ez a végpont kizárólag a
    // Stripe ágat ismerte, tehát pont az utalásos befizetés maradt volna
    // véglegesen számlázatlanul, holott ez a gomb pontosan ezért van.
    let party: BillingParty | null = null;
    let reference = payment.payment_reference as string;

    if (payment.stripe_invoice_id) {
      const stripe = getStripe();
      const invoice = await stripe.invoices.retrieve(payment.stripe_invoice_id);
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) return NextResponse.json({ error: "A Stripe-számlához nem tartozik vevő." }, { status: 409 });

      const customer = await stripe.customers.retrieve(customerId, { expand: ["tax_ids"] });
      if (customer.deleted) return NextResponse.json({ error: "A Stripe-vevő törölve lett." }, { status: 409 });
      party = billingPartyFromStripeCustomer(customer);
      reference = payment.stripe_invoice_id;
    } else {
      party = await billingPartyForUser(project.user_id as string);
      if (!party) return NextResponse.json({ error: "Az ügyfél számlázási adatai nem találhatók." }, { status: 409 });
    }

    const missing = missingBillingFields(party);
    if (missing.length) {
      return NextResponse.json({
        error: `Hiányzó számlázási adat: ${missing.join(", ")}. Töltsd ki az ügyfél adatlapján, aztán próbáld újra.`
      }, { status: 409 });
    }

    const plan = subscriptionPlan(project.subscription_plan);
    const cycle = projectCycleMonths(project);
    const result = await createBillingoSubscriptionInvoice({
      stripeInvoiceId: reference,
      party,
      amount: payment.amount,
      itemName: `ProjectEdge ${plan.name} menedzselt weboldal — ${billingIntervalLabel(cycle)} díj`,
      paidAt: payment.paid_at ? new Date(payment.paid_at) : new Date(),
      unit: billingUnitLabel(cycle),
      paymentMethod: payment.stripe_invoice_id ? "online_bankcard" : "wire_transfer",
      comment: payment.stripe_invoice_id
        ? undefined
        : `Banki átutalás. Hivatkozás: ${payment.payment_reference}`
    });

    if (result.skipped) {
      await admin.from("subscription_payments")
        .update({ billingo_error: result.reason, updated_at: new Date().toISOString() })
        .eq("id", payment.id);
      return NextResponse.json({ error: result.reason }, { status: 409 });
    }

    await admin.from("subscription_payments").update({
      billingo_document_id: result.id,
      billingo_invoice_number: result.invoiceNumber,
      billingo_error: null,
      updated_at: new Date().toISOString()
    }).eq("id", payment.id);

    return NextResponse.json({ success: true, invoiceNumber: result.invoiceNumber }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Billingo retry failed", error);
    const message = error instanceof Error ? error.message : "Ismeretlen hiba";
    // A Billingo hibaszövege itt szándékosan látszik: adminnak szól, és
    // enélkül nem derülne ki, melyik számlázási mező hiányos.
    return NextResponse.json({ error: `A számlázás újrapróbálása sikertelen: ${message}` }, { status: 502 });
  }
}
