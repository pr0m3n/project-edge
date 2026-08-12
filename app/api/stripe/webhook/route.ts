import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createBillingoSubscriptionInvoice } from "@/lib/billingo";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { formatHuf, subscriptionPlan } from "@/lib/subscriptions";

export const runtime = "nodejs";

function iso(unixSeconds?: number | null) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

function subscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  return { start: iso(item?.current_period_start), end: iso(item?.current_period_end) };
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const subscription = invoice.parent?.subscription_details?.subscription;
  if (subscription) return typeof subscription === "string" ? subscription : subscription.id;
  // Older Stripe API versions exposed the subscription directly on the invoice.
  const legacySubscription = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }).subscription;
  return typeof legacySubscription === "string" ? legacySubscription : legacySubscription?.id ?? null;
}

async function notifyPayment(userId: string, email: string | null, projectTitle: string, amount: number, first: boolean) {
  const admin = createServerSupabaseAdminClient();
  await admin.from("notifications").insert({
    user_id: userId,
    title: first ? "Előfizetés elindult" : "Havidíj sikeresen rendezve",
    message: first
      ? `A(z) „${projectTitle}” első havidíja beérkezett, a projekt kivitelezése elindult.`
      : `A(z) „${projectTitle}” következő havi díja (${formatHuf(amount)}) sikeresen beérkezett.`,
    link: "/ugyfelkapu/dashboard"
  });
  if (email) await sendProjectEdgeEmail({
    to: email,
    subject: first ? "Előfizetésed aktív" : "Sikeres havi fizetés",
    message: first
      ? `A(z) „${projectTitle}” első havidíja sikeresen beérkezett. A weboldal elkészítése most elindul.`
      : `A(z) „${projectTitle}” előfizetés ${formatHuf(amount)} összegű havidíja sikeresen beérkezett.`,
    link: "/ugyfelkapu/dashboard",
    details: [{ label: "Összeg", value: formatHuf(amount) }]
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = subscriptionIdFromInvoice(invoice);
  if (!subscriptionId || invoice.amount_paid <= 0) return;
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const projectId = subscription.metadata.project_id;
  if (!projectId) throw new Error("A Stripe-előfizetésből hiányzik a project_id metadata.");

  const admin = createServerSupabaseAdminClient();
  const { data: project, error } = await admin.from("client_projects")
    .select("id,user_id,title,contact_email,status,subscription_plan,subscription_status,subscription_started_at")
    .eq("id", projectId).single();
  if (error || !project) throw new Error("A Stripe-előfizetéshez tartozó projekt nem található.");

  const line = invoice.lines.data.find((item) => item.subscription) ?? invoice.lines.data[0];
  const periodStart = iso(line?.period.start) ?? new Date().toISOString();
  const periodEnd = iso(line?.period.end) ?? new Date().toISOString();
  const paidAt = new Date((invoice.status_transitions.paid_at ?? Math.floor(Date.now() / 1000)) * 1000);
  const first = !project.subscription_started_at;
  const period = subscriptionPeriod(subscription);

  const { error: projectError } = await admin.from("client_projects").update({
    stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_current_period_end: period.end,
    subscription_status: "active",
    payment_status: "deposit_paid",
    status: project.status === "deposit_pending" ? "in_progress" : project.status,
    next_step: project.status === "deposit_pending" ? "A kivitelezés elindult. A következő állapotfrissítést itt látod." : undefined,
    subscription_started_at: first ? paidAt.toISOString() : undefined,
    billing_cycle_started_at: period.start,
    next_billing_at: period.end
  }).eq("id", project.id);
  if (projectError) throw projectError;

  const { data: payment, error: paymentError } = await admin.from("subscription_payments").upsert({
    project_id: project.id,
    billing_period_start: periodStart,
    billing_period_end: periodEnd,
    amount: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    status: "paid",
    payment_reference: invoice.number ?? invoice.id,
    stripe_invoice_id: invoice.id,
    paid_at: paidAt.toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: "stripe_invoice_id" }).select("id,billingo_document_id").single();
  if (paymentError) throw paymentError;

  await notifyPayment(project.user_id, project.contact_email, project.title, invoice.amount_paid, first);

  if (!payment.billingo_document_id) {
    try {
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) throw new Error("A Stripe-számlához nem tartozik vevő.");
      const customer = await stripe.customers.retrieve(customerId, { expand: ["tax_ids"] });
      if (customer.deleted) throw new Error("A Stripe-vevő törölve lett.");
      const plan = subscriptionPlan(project.subscription_plan);
      const result = await createBillingoSubscriptionInvoice({
        stripeInvoiceId: invoice.id,
        customer,
        amount: invoice.amount_paid,
        itemName: `ProjectEdge ${plan.name} menedzselt weboldal — havi díj`,
        paidAt
      });
      await admin.from("subscription_payments").update(result.skipped
        ? { billingo_error: result.reason, updated_at: new Date().toISOString() }
        : { billingo_document_id: result.id, billingo_invoice_number: result.invoiceNumber, billingo_error: null, updated_at: new Date().toISOString() }
      ).eq("id", payment.id);
    } catch (billingoError) {
      const message = billingoError instanceof Error ? billingoError.message : "Ismeretlen Billingo-hiba";
      await admin.from("subscription_payments").update({ billingo_error: message, updated_at: new Date().toISOString() }).eq("id", payment.id);
      await admin.from("notifications").insert({ user_id: null, title: "Billingo számlázási hiba", message: `${project.title}: ${message}`, link: "/admin" });
    }
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice) {
  const subscriptionId = subscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return;
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  const projectId = subscription.metadata.project_id;
  if (!projectId) return;
  const admin = createServerSupabaseAdminClient();
  const { data: project } = await admin.from("client_projects").update({
    subscription_status: "past_due",
    stripe_subscription_status: subscription.status,
    next_step: "A havidíj terhelése sikertelen. Frissítsd a fizetési módot a számlázási felületen."
  }).eq("id", projectId).select("user_id,title,contact_email").maybeSingle();
  if (invoice.id) await admin.from("subscription_payments").update({ status: "failed", updated_at: new Date().toISOString() }).eq("stripe_invoice_id", invoice.id);
  if (project) await admin.from("notifications").insert({ user_id: project.user_id, title: "Sikertelen előfizetési terhelés", message: `A(z) „${project.title}” havidíját nem sikerült levonni. Nyisd meg a számlázási felületet és ellenőrizd a kártyát.`, link: "/ugyfelkapu/dashboard" });
}

async function handleSubscription(subscription: Stripe.Subscription, deleted = false) {
  const projectId = subscription.metadata.project_id;
  if (!projectId) return;
  const period = subscriptionPeriod(subscription);
  const active = ["active", "trialing"].includes(subscription.status);
  const cancelled = deleted || subscription.status === "canceled";
  await createServerSupabaseAdminClient().from("client_projects").update({
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_current_period_end: period.end,
    next_billing_at: period.end,
    subscription_status: cancelled ? "cancelled" : subscription.cancel_at_period_end ? "cancel_requested" : active ? "active" : "past_due",
    cancel_effective_at: subscription.cancel_at_period_end ? period.end : null,
    cancelled_at: cancelled ? new Date().toISOString() : null,
    site_health_status: cancelled ? "offline" : undefined,
    next_step: cancelled ? "Az előfizetés megszűnt. Ez nem projektátadás és nem indít technikai garanciát." : undefined
  }).eq("id", projectId);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Hiányzó Stripe webhook aláírás vagy konfiguráció." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    console.error("Invalid Stripe webhook signature", error);
    return NextResponse.json({ error: "Érvénytelen webhook aláírás." }, { status: 400 });
  }

  const admin = createServerSupabaseAdminClient();
  const { data: processed } = await admin.from("stripe_webhook_events").select("event_id").eq("event_id", event.id).maybeSingle();
  if (processed) return NextResponse.json({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "invoice.paid": await handleInvoicePaid(event.data.object); break;
      case "invoice.payment_failed": await handleInvoiceFailed(event.data.object); break;
      case "customer.subscription.updated": await handleSubscription(event.data.object); break;
      case "customer.subscription.deleted": await handleSubscription(event.data.object, true); break;
      case "checkout.session.completed": {
        const session = event.data.object;
        const projectId = session.metadata?.project_id;
        if (projectId) await admin.from("client_projects").update({
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          stripe_checkout_session_id: session.id
        }).eq("id", projectId);
        break;
      }
    }
    const { error } = await admin.from("stripe_webhook_events").insert({ event_id: event.id, event_type: event.type });
    if (error && error.code !== "23505") throw error;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook ${event.id} failed`, error);
    return NextResponse.json({ error: "A webhook feldolgozása sikertelen." }, { status: 500 });
  }
}
