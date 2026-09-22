import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { billingPartyFromStripeCustomer } from "@/lib/billingo";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getStripe, stripeAmountToHuf } from "@/lib/stripe";
import { monthsFromStripeRecurring, subscriptionStatusFromStripe } from "@/lib/billing-math";
import { formatHuf, subscriptionPlan } from "@/lib/subscriptions";
import { issueSubscriptionInvoice } from "@/lib/subscription-invoice";
import { addBillingInterval, billingIntervalLabel, cycleAmount, paymentReference, projectCycleMonths } from "@/lib/onboarding";
import { buildHandoverPlan } from "@/lib/handover";

export const runtime = "nodejs";

/** Ennyi idő után egy befejezetlen foglalást elhaltnak tekintünk (a függvény időkorlátja fölött). */
const STALE_CLAIM_MS = 10 * 60 * 1000;

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
    title: first ? "Előfizetés elindult" : "Díj sikeresen rendezve",
    // Az első díj a folyamat VÉGÉN jön: a kész, jóváhagyott oldalért fizet,
    // és utána élesítünk. A régi szöveg („a kivitelezés elindult") a korábbi,
    // előre fizetős sorrendből maradt itt.
    message: first
      ? `A(z) „${projectTitle}” első díja beérkezett. Most élesítem a weboldalt a saját domainjén.`
      : `A(z) „${projectTitle}” következő díja (${formatHuf(amount)}) sikeresen beérkezett.`,
    link: "/ugyfelkapu/dashboard"
  });
  if (email) await sendProjectEdgeEmail({
    to: email,
    subject: first ? "Előfizetésed aktív" : "Sikeres fizetés",
    message: first
      ? `A(z) „${projectTitle}” első díja sikeresen beérkezett. Most élesítem a weboldalt — amint él a saját domainjén, jelzem.`
      : `A(z) „${projectTitle}” előfizetés ${formatHuf(amount)} összegű díja sikeresen beérkezett.`,
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
    .select("id,user_id,title,contact_email,status,commercial_model,subscription_plan,subscription_status,subscription_started_at,stripe_subscription_id,stripe_parked_at")
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

  // Egy RÉGI (már lecserélt) előfizetés számlája. A pénz beérkezett, tehát a
  // befizetést és a számlát rögzíteni kell — de a projekt állapotát nem ez az
  // előfizetés vezeti, azt nem írhatja felül.
  const foreignSubscription = Boolean(project.stripe_subscription_id && project.stripe_subscription_id !== subscription.id);
  if (foreignSubscription) {
    await admin.from("notifications").insert({
      user_id: null,
      title: "Befizetés egy lecserélt Stripe-előfizetésre",
      message: `${project.title}: a ${subscription.id} előfizetés számlája (${formatHuf(amountHuf)}) fizetve lett, pedig a projekt már a ${project.stripe_subscription_id} előfizetéshez tartozik. Ellenőrizd, nem fut-e két előfizetés.`,
      link: "/admin"
    });
  }

  // Az állapot a FRISS Stripe-előfizetésből, nem vakon „aktív": egy késve
  // érkező számla különben visszaaktiválná a lemondott, lemondás alatt álló
  // vagy parkoló (szüneteltetett) előfizetést.
  const derivedStatus = subscriptionStatusFromStripe(
    subscription.status,
    subscription.cancel_at_period_end,
    Boolean(project.stripe_parked_at)
  ) ?? "active";

  const { error: projectError } = foreignSubscription ? { error: null } : await admin.from("client_projects").update({
    stripe_customer_id: typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id,
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_current_period_end: period.end,
    subscription_status: derivedStatus,
    payment_status: "deposit_paid",
    // A fizetés a folyamat VÉGÉN van: a kész, jóváhagyott oldalért fizet,
    // közvetlenül az élesítés előtt. A státuszt ezért NEM mozdítjuk — az
    // élesítést az admin végzi el (domain, DNS), és ő állítja `launched`-re.
    // A korábbi kód itt `in_progress`-be tette vissza, ami a régi sorrendben
    // volt helyes; most visszavinné a projektet az építés fázisába.
    next_step: project.status === "deposit_pending"
      ? "Köszönöm, a fizetés megérkezett. Most élesítem az oldalt — hamarosan élő lesz a saját domainjén."
      : undefined,
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
      await issueSubscriptionInvoice({
        paymentId: payment.id,
        projectTitle: project.title,
        planName: subscriptionPlan(project.subscription_plan).name,
        amount: amountHuf,
        paidAt,
        party: billingPartyFromStripeCustomer(customer),
        reference: invoice.id ?? subscription.id,
        interval: monthsFromStripeRecurring(subscription.items.data[0]?.price.recurring),
        paymentMethod: "online_bankcard"
      });
    } catch (billingoError) {
      // Ide már csak a Stripe-vevő lekérésének hibája jut el: a számlázás saját
      // hibakezelése a közös helyen fut, és nem dob tovább.
      const message = billingoError instanceof Error ? billingoError.message : "Ismeretlen Billingo-hiba";
      await admin.from("subscription_payments").update({ billingo_error: message, updated_at: new Date().toISOString() }).eq("id", payment.id);
      await admin.from("notifications").insert({ user_id: null, title: "Billingo számlázási hiba", message: `${project.title}: ${message}`, link: "/admin/dashboard" });
    }
  }
}

/**
 * Az admin által generált EGYSZERI kártyás fizetés beérkezése.
 *
 * Ez az a fizetés, amit nem a Stripe előfizetés-motorja hajt: az ügyfél kapott
 * egy linket emailben (éves díj előre, vagy egy elmaradt hónap), és azon
 * fizetett. A `subscription_payments` sor már létezett `pending` állapotban,
 * az azonosítója a munkamenet metadatájában utazott — itt csak be kell zárni
 * a kört.
 *
 * Miért nem elég a `success_url`: a sikeres fizetés utáni visszairányítás
 * elveszhet (bezárt fül, megszakadt hálózat), a webhook viszont megérkezik.
 * A pénz és a nyilvántartás így nem tud szétcsúszni.
 */
async function handleManualPaymentPaid(session: Stripe.Checkout.Session) {
  const paymentId = session.metadata?.subscription_payment_id;
  if (!paymentId || session.payment_status !== "paid") return;

  const admin = createServerSupabaseAdminClient();
  const { data: payment, error: paymentError } = await admin.from("subscription_payments")
    .select("id,project_id,amount,status,due_date,billingo_document_id,payment_reference")
    .eq("id", paymentId).maybeSingle();
  if (paymentError) throw paymentError;
  if (!payment) {
    await reportOrphanEvent("Az egyszeri fizetéshez tartozó befizetés-sor nem található", paymentId);
    return;
  }
  if (payment.status === "paid") return;

  const { data: project, error: projectError } = await admin.from("client_projects")
    .select("id,user_id,title,contact_email,commercial_model,subscription_status,subscription_plan,billing_interval,billing_period_months,monthly_price,billing_amount,stripe_customer_id")
    .eq("id", payment.project_id).maybeSingle();
  if (projectError) throw projectError;
  if (!project) {
    await reportOrphanEvent("Az egyszeri fizetés projektje nem található", payment.project_id as string);
    return;
  }

  const interval = projectCycleMonths(project);
  const amountHuf = stripeAmountToHuf(session.amount_total ?? 0, session.currency) || Number(payment.amount ?? 0);
  const paidAt = new Date();

  // Egy régi, még érvényes linken történt fizetés egy azóta lemondott vagy
  // kivásárolt projektre. A pénz megjött, tehát rögzítjük — de a projektet
  // NEM aktiváljuk újra, és új várt befizetést sem nyitunk: ez kézi döntés
  // (visszatérítés vagy újraindítás).
  const reactivationBlocked = project.commercial_model !== "subscription" || project.subscription_status === "cancelled";
  if (reactivationBlocked) {
    await admin.from("subscription_payments").update({
      status: "paid",
      amount: amountHuf,
      payment_method: "stripe",
      paid_at: paidAt.toISOString(),
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      note: "Fizetés egy lezárt előfizetésre — kézi ellenőrzés kell (visszatérítés vagy újraindítás).",
      updated_at: paidAt.toISOString()
    }).eq("id", payment.id).neq("status", "paid");
    await admin.from("notifications").insert({
      user_id: null,
      title: "Fizetés egy lezárt előfizetésre",
      message: `${project.title}: ${formatHuf(amountHuf)} érkezett egy régi fizetési linken, de az előfizetés már lezárult. Döntsd el: visszatérítés vagy újraindítás.`,
      link: "/admin"
    });
    return;
  }
  // Az időszak kezdete az ESEDÉKESSÉG, nem a fizetés napja: aki három nap
  // csúszással utal, annak sem tolódik el a fordulónapja.
  const periodStart = payment.due_date ? new Date(payment.due_date as string) : paidAt;
  const periodEnd = addBillingInterval(periodStart, interval, 1);

  const { error: updateError } = await admin.from("subscription_payments").update({
    status: "paid",
    amount: amountHuf,
    payment_method: "stripe",
    paid_at: paidAt.toISOString(),
    billing_period_start: periodStart.toISOString(),
    billing_period_end: periodEnd.toISOString(),
    stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
    updated_at: paidAt.toISOString()
  }).eq("id", payment.id).neq("status", "paid");
  if (updateError) throw updateError;

  await admin.from("client_projects").update({
    subscription_status: "active",
    payment_status: "deposit_paid",
    prepaid_until: periodEnd.toISOString(),
    next_billing_at: periodEnd.toISOString(),
    stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id
  }).eq("id", project.id);

  // A következő várt befizetés — ebből dolgozik a fizetési emlékeztető.
  await admin.from("subscription_payments").insert({
    project_id: project.id,
    billing_period_start: periodEnd.toISOString(),
    billing_period_end: addBillingInterval(periodEnd, interval, 1).toISOString(),
    amount: cycleAmount({
      monthlyPrice: Number(project.monthly_price ?? 0),
      interval,
      agreed: project.billing_amount as number | null
    }),
    currency: "HUF",
    status: "pending",
    payment_method: "stripe",
    payment_reference: paymentReference(project.id, periodEnd),
    due_date: periodEnd.toISOString(),
    note: "Várt befizetés — a fizetési emlékeztető ebből dolgozik."
  });

  const plan = subscriptionPlan(project.subscription_plan);
  await admin.from("notifications").insert({
    user_id: project.user_id,
    title: "Megérkezett a fizetésed",
    message: `A(z) „${project.title}” ${billingIntervalLabel(interval)} díja (${formatHuf(amountHuf)}) beérkezett. A következő esedékesség: ${periodEnd.toLocaleDateString("hu-HU")}.`,
    link: "/ugyfelkapu/dashboard"
  });

  if (project.contact_email) {
    await sendProjectEdgeEmail({
      to: project.contact_email,
      subject: "Megérkezett a fizetésed",
      message: `A(z) „${project.title}” weboldalad ${billingIntervalLabel(interval)} szolgáltatási díja beérkezett. Köszönöm!`,
      link: "/ugyfelkapu/dashboard",
      details: [
        { label: "Összeg", value: formatHuf(amountHuf) },
        { label: "Fizetési mód", value: "Bankkártya" },
        { label: "Következő esedékesség", value: periodEnd.toLocaleDateString("hu-HU") }
      ]
    });
  }

  if (!payment.billingo_document_id) {
    try {
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (!customerId) throw new Error("Az egyszeri fizetéshez nem tartozik Stripe-vevő.");
      const customer = await getStripe().customers.retrieve(customerId, { expand: ["tax_ids"] });
      if (customer.deleted) throw new Error("A Stripe-vevő törölve lett.");
      await issueSubscriptionInvoice({
        paymentId: payment.id,
        projectTitle: project.title,
        planName: plan.name,
        amount: amountHuf,
        paidAt,
        party: billingPartyFromStripeCustomer(customer),
        reference: typeof session.payment_intent === "string" ? session.payment_intent : session.id,
        interval,
        paymentMethod: "online_bankcard"
      });
    } catch (billingoError) {
      const message = billingoError instanceof Error ? billingoError.message : "Ismeretlen Billingo-hiba";
      await admin.from("subscription_payments").update({ billingo_error: message, updated_at: new Date().toISOString() }).eq("id", payment.id);
      await admin.from("notifications").insert({ user_id: null, title: "Billingo számlázási hiba", message: `${project.title}: ${message}`, link: "/admin/dashboard" });
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

async function handleSubscription(eventSubscription: Stripe.Subscription, deleted = false) {
  const projectId = eventSubscription.metadata.project_id;
  if (!projectId) return;

  const admin = createServerSupabaseAdminClient();
  const { data: project, error } = await admin.from("client_projects")
    .select("id,stripe_subscription_id,stripe_parked_at")
    .eq("id", projectId).maybeSingle();
  if (error) throw error;
  if (!project) return;

  // Egy lecserélt, régi előfizetés eseménye nem írhatja felül az aktuálisat.
  if (project.stripe_subscription_id && project.stripe_subscription_id !== eventSubscription.id) {
    console.warn("Stripe webhook: event for a replaced subscription ignored", {
      projectId, eventSubscription: eventSubscription.id, current: project.stripe_subscription_id
    });
    return;
  }

  // Az esemény pillanatképe helyett a JELENLEGI állapot. A Stripe nem
  // garantálja a kézbesítési sorrendet: egy késve érkező régi `updated`
  // esemény különben visszaírná a már lemondott előfizetést aktívra.
  const subscription = deleted
    ? eventSubscription
    : await getStripe().subscriptions.retrieve(eventSubscription.id);

  const period = subscriptionPeriod(subscription);
  const cancelled = deleted || subscription.status === "canceled";
  // A parkolás (szüneteltetés) árcsere, a Stripe szerint közben „active".
  // A korábbi leképezés a szüneteltetés SAJÁT `updated` eseményére azonnal
  // visszaírta az állapotot aktívra — a szüneteltetés így el sem indult.
  const status = cancelled
    ? "cancelled"
    : subscriptionStatusFromStripe(subscription.status, subscription.cancel_at_period_end, Boolean(project.stripe_parked_at)) ?? "past_due";
  await admin.from("client_projects").update({
    stripe_subscription_id: subscription.id,
    stripe_subscription_status: subscription.status,
    stripe_current_period_end: period.end,
    next_billing_at: period.end,
    subscription_status: status,
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
  //
  // A foglalás és a BEFEJEZÉS külön állapot (`processed_at` = foglalás ideje,
  // `completed_at` = sikeres feldolgozás). Duplikátumra csak akkor adunk
  // 2xx-et, ha az első példány már végzett: amíg fut, 409-cel kérjük a
  // Stripe-ot, hogy próbálja újra később. Korábban a párhuzamos másodpéldány
  // azonnal „kész"-t kapott, és ha az első utána elhasalt, az esemény
  // véglegesen feldolgozatlan maradt. A beragadt (időtúllépéssel elhalt)
  // foglalást STALE_CLAIM_MS után egy újabb kézbesítés átveheti.
  // A `completed_at` alapértéke `now()` (a régi kód soraiért, lásd 046) —
  // a foglalás ezért kifejezetten `null`-t ír bele: még nincs kész.
  const { error: claimError } = await admin.from("stripe_webhook_events")
    .insert({ event_id: event.id, event_type: event.type, completed_at: null });
  if (claimError) {
    if (claimError.code !== "23505") {
      console.error(`Stripe webhook ${event.id} claim failed`, claimError);
      return NextResponse.json({ error: "A webhook feldolgozása sikertelen." }, { status: 500 });
    }
    const { data: claim } = await admin.from("stripe_webhook_events")
      .select("processed_at,completed_at").eq("event_id", event.id).maybeSingle();
    // A sor közben eltűnhetett: az első példány elhasalt és felszabadította a
    // foglalást. Ez NEM „kész" — 409, és a Stripe újraküldése tisztán foglal.
    if (!claim) return NextResponse.json({ error: "Az esemény újrapróbálható." }, { status: 409 });
    if (claim.completed_at) return NextResponse.json({ received: true, duplicate: true });

    const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
    const { data: takenOver } = await admin.from("stripe_webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("event_id", event.id)
      .is("completed_at", null)
      .lt("processed_at", staleBefore)
      .select("event_id").maybeSingle();
    if (!takenOver) {
      return NextResponse.json({ error: "Az esemény feldolgozása folyamatban van." }, { status: 409 });
    }
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
        if (session.mode === "payment" && session.metadata?.subscription_payment_id) {
          await handleManualPaymentPaid(session);
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
    await admin.from("stripe_webhook_events")
      .update({ completed_at: new Date().toISOString() })
      .eq("event_id", event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Stripe webhook ${event.id} failed`, error);
    // A foglalás felszabadítása, különben a Stripe újraküldése duplikátumnak
    // látszana, és az esemény véglegesen feldolgozatlan maradna.
    await admin.from("stripe_webhook_events").delete().eq("event_id", event.id);
    return NextResponse.json({ error: "A webhook feldolgozása sikertelen." }, { status: 500 });
  }
}
