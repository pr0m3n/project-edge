import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createBillingoSubscriptionInvoice } from "@/lib/billingo";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getStripe, stripeAmountToHuf } from "@/lib/stripe";
import { formatHuf, subscriptionPlan } from "@/lib/subscriptions";
import { buildHandoverPlan } from "@/lib/handover";

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

/**
 * Nem találjuk a projektet (törölték, vagy hiányzik a metadata). Ilyenkor NEM
 * dobunk hibát: a Stripe különben három napig újrapróbálkozna, majd hibásra
 * állítaná a végpontot. Rögzítjük adminnak, és feldolgozottnak tekintjük.
 */
async function reportOrphanEvent(reason: string, reference: string) {
  console.error("Stripe webhook orphan event", { reason, reference });
  await createServerSupabaseAdminClient().from("notifications").insert({
    user_id: null,
    title: "Gazdátlan Stripe-esemény",
    message: `${reason} (${reference}). Ellenőrizd a Stripe felületén, hogy nem fut-e még előfizetés törölt projekthez.`,
    link: "/admin"
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = subscriptionIdFromInvoice(invoice);
  const amountHuf = stripeAmountToHuf(invoice.amount_paid, invoice.currency);
  if (!subscriptionId || amountHuf <= 0) return;
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const projectId = subscription.metadata.project_id;
  if (!projectId) {
    await reportOrphanEvent("A Stripe-előfizetésből hiányzik a project_id metadata", subscriptionId);
    return;
  }

  const admin = createServerSupabaseAdminClient();
  const { data: project, error } = await admin.from("client_projects")
    .select("id,user_id,title,contact_email,status,commercial_model,subscription_plan,subscription_status,subscription_started_at")
    .eq("id", projectId).maybeSingle();
  if (error) throw error;
  if (!project) {
    await reportOrphanEvent("A Stripe-előfizetéshez tartozó projekt nem található", `${subscriptionId} → ${projectId}`);
    return;
  }
  if (project.commercial_model === "purchase") return;

  // Egy már könyvelt számlához nem küldünk újra értesítést és emailt, még
  // akkor sem, ha a Stripe újraküldi az eseményt.
  const { data: existingPayment } = await admin.from("subscription_payments")
    .select("id,status").eq("stripe_invoice_id", invoice.id).maybeSingle();
  const alreadyNotified = existingPayment?.status === "paid";

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
    amount: amountHuf,
    currency: invoice.currency.toUpperCase(),
    status: "paid",
    payment_reference: invoice.number ?? invoice.id,
    stripe_invoice_id: invoice.id,
    paid_at: paidAt.toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: "stripe_invoice_id" }).select("id,billingo_document_id").single();
  if (paymentError) throw paymentError;

  if (!alreadyNotified) {
    await notifyPayment(project.user_id, project.contact_email, project.title, amountHuf, first);
  }

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
        amount: amountHuf,
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
  }).eq("id", projectId).neq("commercial_model", "purchase").select("user_id,title,contact_email").maybeSingle();
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
  }).eq("id", projectId).neq("commercial_model", "purchase");
}

async function handleWebsitePurchasePaid(session: Stripe.Checkout.Session) {
  const purchaseId = session.metadata?.website_purchase_id;
  if (!purchaseId || session.payment_status !== "paid") return;

  const admin = createServerSupabaseAdminClient();
  const { data: purchase, error: purchaseError } = await admin
    .from("website_purchases")
    .select("id,project_id,user_id,status,amount,payment_reference")
    .eq("id", purchaseId)
    .maybeSingle();
  if (purchaseError) throw purchaseError;
  if (!purchase || ["handover", "completed", "cancelled"].includes(purchase.status)) return;

  const { data: project, error: projectError } = await admin
    .from("client_projects")
    .select("id,title,contact_email,stripe_subscription_id")
    .eq("id", purchase.project_id)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) throw new Error("A kártyás tulajdonba vétel projektje nem található.");

  // A kártyás vételár már biztosan beérkezett. A havi Stripe-előfizetést még
  // az átadási állapot megnyitása előtt szüntetjük meg, ugyanúgy, mint az
  // admin által jóváhagyott banki átutalásnál.
  if (project.stripe_subscription_id) {
    const subscription = await getStripe().subscriptions.retrieve(project.stripe_subscription_id);
    if (subscription.status !== "canceled") await getStripe().subscriptions.cancel(subscription.id);
  }

  const { data: activated, error: activationError } = await admin.rpc("activate_website_purchase", {
    p_purchase_id: purchase.id,
    p_handover: buildHandoverPlan(["vercel", "github", "domain"])
  });
  if (activationError) throw activationError;

  await admin.from("notifications").insert({
    user_id: purchase.user_id,
    title: "A weboldal vételára beérkezett",
    message: `A(z) „${project.title}” tulajdonba vételének kártyás fizetése sikeres. A technikai átadás megnyílt az ügyfélkapuban.`,
    link: "/ugyfelkapu/dashboard"
  });
  if (project.contact_email) {
    await sendProjectEdgeEmail({
      to: project.contact_email,
      subject: "A weboldal vételára beérkezett",
      message: `A(z) „${project.title}” weboldal tulajdonba vételének fizetése sikeres. Az előfizetés lezárult, a technikai átadási lista megnyílt az ügyfélkapuban.`,
      link: "/ugyfelkapu/dashboard",
      details: [{ label: "Vételár", value: formatHuf(purchase.amount) }, { label: "Fizetési mód", value: "Bankkártya" }]
    });
  }
  return activated;
}

async function handleChangeRequestPaid(session: Stripe.Checkout.Session) {
  const requestId = session.metadata?.change_request_id;
  if (!requestId || session.payment_status !== "paid") return;

  const admin = createServerSupabaseAdminClient();
  const { data: changeRequest, error: requestError } = await admin
    .from("change_requests")
    .select("id,project_id,user_id,quoted_amount,status,paid_at,payment_method")
    .eq("id", requestId)
    .maybeSingle();
  if (requestError) throw requestError;
  if (!changeRequest || changeRequest.paid_at || changeRequest.status === "in_progress" || changeRequest.status === "completed") return;

  const { data: project, error: projectError } = await admin
    .from("client_projects")
    .select("id,title,contact_email")
    .eq("id", changeRequest.project_id)
    .maybeSingle();
  if (projectError) throw projectError;
  if (!project) throw new Error("A kártyás módosítás projektje nem található.");

  const { data: updated, error: updateError } = await admin.from("change_requests").update({
    paid_at: new Date().toISOString(),
    status: "in_progress",
    payment_method: "card",
    stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null
  }).eq("id", requestId).eq("payment_method", "card").is("paid_at", null).eq("status", "waiting_client").select("id").maybeSingle();
  if (updateError) throw updateError;
  if (!updated) return;

  const amount = formatHuf(changeRequest.quoted_amount ?? 0);
  await admin.from("notifications").insert({
    user_id: changeRequest.user_id,
    title: "Megérkezett a módosítás fizetése",
    message: `A(z) „${project.title}” projektnél kért módosítás ${amount} összegű kártyás fizetése sikeres. A munka elindult.`,
    link: "/ugyfelkapu/dashboard"
  });
  if (project.contact_email) {
    await sendProjectEdgeEmail({
      to: project.contact_email,
      subject: "Megérkezett a módosítás fizetése",
      message: `A(z) „${project.title}” projektnél kért módosítás kártyás fizetése sikeres. A munka elindult.`,
      link: "/ugyfelkapu/dashboard",
      details: [{ label: "Összeg", value: amount }, { label: "Fizetési mód", value: "Bankkártya" }]
    });
  }
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

  // Idempotencia FOGLALÁSSAL, nem utólagos rögzítéssel.
  //
  // Korábban a `stripe_webhook_events` sor a feldolgozás UTÁN íródott, tehát
  // két párhuzamos kézbesítés (vagy egy sikeres feldolgozás után elveszett
  // válasz) kétszer futtatta le a teljes ágat: dupla értesítés, dupla email,
  // újabb Billingo-kísérlet. Az egyedi kulcsra épülő insert atomi módon dönti
  // el, melyik példány dolgozhat. Hiba esetén a foglalást felszabadítjuk, hogy
  // a Stripe újrapróbálkozása tényleg le tudjon futni.
  const { error: claimError } = await admin.from("stripe_webhook_events")
    .insert({ event_id: event.id, event_type: event.type });
  if (claimError) {
    if (claimError.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    console.error(`Stripe webhook ${event.id} claim failed`, claimError);
    return NextResponse.json({ error: "A webhook feldolgozása sikertelen." }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "invoice.paid": await handleInvoicePaid(event.data.object); break;
      case "invoice.payment_failed": await handleInvoiceFailed(event.data.object); break;
      case "customer.subscription.updated": await handleSubscription(event.data.object); break;
      case "customer.subscription.deleted": await handleSubscription(event.data.object, true); break;
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "payment" && session.metadata?.website_purchase_id) {
          await handleWebsitePurchasePaid(session);
          break;
        }
        if (session.mode === "payment" && session.metadata?.change_request_id) {
          await handleChangeRequestPaid(session);
          break;
        }
        const projectId = session.metadata?.project_id;
        if (projectId) await admin.from("client_projects").update({
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          stripe_checkout_session_id: session.id
        }).eq("id", projectId);
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook ${event.id} failed`, error);
    // A foglalás felszabadítása, különben a Stripe újraküldése duplikátumnak
    // látszana, és az esemény véglegesen feldolgozatlan maradna.
    await admin.from("stripe_webhook_events").delete().eq("event_id", event.id);
    return NextResponse.json({ error: "A webhook feldolgozása sikertelen." }, { status: 500 });
  }
}
