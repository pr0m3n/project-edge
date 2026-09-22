import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { billingIntervalLabel, cycleAmount, paymentReference, projectCycleMonths } from "@/lib/onboarding";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { ensureStripeCustomer, getStripe, hasLiveStripeSubscription, hufToStripeAmount, siteUrl } from "@/lib/stripe";
import { stripeRecurringForMonths } from "@/lib/billing-math";
import { subscriptionPlan } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * FIZETÉSI LINK az adminnak.
 *
 * A kézzel felvett ügyfél nem az ügyfélkapun kattintotta végig a fizetést:
 * telefonon és emailben állapodtunk meg vele. Ha kártyával akar fizetni,
 * kell egy link, amit be lehet másolni a levélbe — enélkül vagy utalnia kell,
 * vagy vissza kell terelni egy folyamatba, amin sosem ment végig.
 *
 * Kétféle link készül:
 *
 *   `one_off`      — egyetlen fizetés (éves díj előre, vagy egy elmaradt
 *                    hónap). A `subscription_payments` sor ELŐBB születik meg
 *                    `pending` állapotban, és az azonosítója megy a Stripe
 *                    metadatájába. A webhook ezt a sort állítja `paid`-re,
 *                    tehát a befizetés akkor is a helyére kerül, ha közben
 *                    bezárul a böngésző.
 *
 *   `subscription` — innentől kártyával, ismétlődően fizet. A ciklust a
 *                    projekt `billing_interval` mezője adja, nem beégetett
 *                    havi érték: aki évente fizet, annak évente terhelünk.
 *
 * A link NEM tartalmaz titkot: a Checkout munkamenet URL-je önmagában is
 * hozzáférés a fizetéshez, ezért van rövid lejárata, és ezért nem jelenik meg
 * sehol máshol, csak az admin felületén.
 */

type Payload = {
  projectId?: unknown;
  kind?: unknown;
  /** Csak `one_off`-nál: felülírja a ciklusból számolt összeget. */
  amount?: unknown;
  /** Csak `one_off`-nál: melyik már meglévő várt befizetéshez tartozik. */
  paymentId?: unknown;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "admin-payment-link", 20, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const admin = await authenticatedUser(request);
  if (!admin) return bad("Érvénytelen vagy lejárt munkamenet.", 401);
  if (!(await isAdminUser(request, admin.id))) return bad("Nincs admin jogosultság.", 403);

  const parsed = await readJsonBody<Payload>(request, 4_000);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!isUuid(projectId)) return bad("Érvénytelen projektazonosító.");

  const kind = body.kind === "subscription" ? "subscription" : "one_off";

  const db = createServerSupabaseAdminClient();

  try {
    const { data: project, error: projectError } = await db.from("client_projects")
      .select("id,user_id,title,company,contact_email,commercial_model,subscription_plan,monthly_price,billing_amount,billing_interval,billing_period_months,stripe_customer_id,stripe_subscription_id,subscription_status,prepaid_until")
      .eq("id", projectId).maybeSingle();
    if (projectError) throw projectError;
    if (!project) return bad("A projekt nem található.", 404);
    if (project.commercial_model !== "subscription") {
      return bad("Fizetési link csak menedzselt előfizetéshez készíthető.", 409);
    }

    const plan = subscriptionPlan(project.subscription_plan);
    const interval = projectCycleMonths(project);
    const monthlyPrice = Number(project.monthly_price ?? plan.price);
    // Az alkudott ciklusdíj. Ez kerül a Stripe-ra és az idempotencia-kulcsba is:
    // ha az ár változik, ÚJ munkamenet kell, különben a Stripe a korábbi,
    // más összegű sessiont adná vissza.
    const chargeAmount = cycleAmount({
      monthlyPrice,
      interval,
      agreed: project.billing_amount as number | null
    });

    const { data: profile } = await db.from("client_profiles")
      .select("email,full_name,billing_name").eq("id", project.user_id).maybeSingle();
    const email = (profile?.email as string | undefined) ?? project.contact_email ?? undefined;

    const customerId = await ensureStripeCustomer({
      customerId: project.stripe_customer_id,
      email,
      name: (profile?.billing_name as string | undefined) || project.company || (profile?.full_name as string | undefined),
      userId: project.user_id
    });

    const stripe = getStripe();

    // ── Ismétlődő kártyás fizetés ────────────────────────────────────────
    if (kind === "subscription") {
      if (await hasLiveStripeSubscription(project.stripe_subscription_id)) {
        return bad("Ehhez a projekthez már fut Stripe-előfizetés (lemondás alatt vagy szüneteltetve is terhel). Előbb azt kell lezárni.", 409);
      }

      // Aki előre ki van fizetve (pl. átutalással egy évre), annak az
      // ismétlődő kártyás fizetés NEM terhelhet azonnal: a próbaidőszak a
      // kifizetett időszak végéig tart, az első terhelés akkor jön. Korábban
      // itt csak egy figyelmeztetés volt, és a link azonnal a teljes
      // ciklusdíjat vonta le — dupla fizetés egy már kifizetett évre.
      // A Stripe legalább 48 órás próbaidőt fogad el; ennél közelebbi
      // lejáratnál nincs mit kitolni, a terhelés normál rendben indul.
      // A felső korlát 730 nap: ennél távolabbi első terhelést a Stripe nem fogad.
      const prepaidUntilMs = project.prepaid_until ? new Date(project.prepaid_until).getTime() : 0;
      if (prepaidUntilMs > Date.now() + 729 * 86_400_000) {
        return bad("Az ügyfél több mint két évre előre ki van fizetve — ilyen messzire a Stripe nem tudja kitolni az első terhelést. Közelebb a lejárathoz készíts linket.", 409);
      }
      const trialEnd = prepaidUntilMs > Date.now() + 48 * 3_600_000 ? Math.floor(prepaidUntilMs / 1000) : null;

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        adaptive_pricing: { enabled: false },
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
            // Az ismétlődő terhelés is az alkudott ciklusdíj: éves ciklusnál
            // ez a kedvezményes éves ár, nem a havidíj tizenkétszerese.
            unit_amount: hufToStripeAmount(chargeAmount),
            recurring: stripeRecurringForMonths(interval),
            product_data: {
              name: `ProjectEdge ${plan.name} előfizetés`,
              description: "Menedzselt weboldal, tárhely, technikai felügyelet és a csomag szerinti módosítások.",
              metadata: { project_id: project.id, subscription_plan: plan.key }
            }
          }
        }],
        subscription_data: {
          description: `${project.title} · ProjectEdge ${plan.name}`,
          metadata: { project_id: project.id, user_id: project.user_id, subscription_plan: plan.key },
          ...(trialEnd ? { trial_end: trialEnd } : {})
        },
        metadata: { project_id: project.id, user_id: project.user_id, subscription_plan: plan.key },
        success_url: `${siteUrl()}/ugyfelkapu/dashboard?payment=success`,
        cancel_url: `${siteUrl()}/ugyfelkapu/dashboard?payment=cancelled`
      }, {
        idempotencyKey: `projectedge-admin-subscription-${project.id}-${chargeAmount}-${interval}-${trialEnd ?? "now"}`
      });

      await db.from("client_projects").update({
        stripe_customer_id: customerId,
        stripe_checkout_session_id: session.id,
        payment_method: "stripe"
      }).eq("id", project.id);

      return NextResponse.json({
        ok: true,
        url: session.url,
        kind,
        expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null,
        warning: trialEnd
          ? `Az ügyfél ${new Date(trialEnd * 1000).toLocaleDateString("hu-HU")}-ig ki van fizetve: a kártyát most csak rögzíti, az első terhelés ezen a napon lesz.`
          : null
      }, { headers: { "Cache-Control": "no-store" } });
    }

    // ── Egyszeri fizetés ─────────────────────────────────────────────────
    //
    // A várt befizetés sora ELŐBB készül el, mint a Stripe munkamenet. Ez a
    // sorrend a lényeg: a webhook egy létező sort állít fizetettre, tehát a
    // pénz és a nyilvántartás akkor sem csúszik szét, ha a böngésző a sikeres
    // fizetés után bezárul, vagy a visszairányítás elveszik.
    // Az alkudott ciklusdíj a mérvadó: a linken pontosan annyit fizet, amiben
    // megállapodtatok — nem a listaárat.
    const defaultAmount = chargeAmount;
    const requested = typeof body.amount === "number" ? body.amount : Number(body.amount);
    const amount = Number.isSafeInteger(requested) && requested >= 1_000 && requested <= 10_000_000
      ? requested
      : defaultAmount;

    let paymentId = typeof body.paymentId === "string" && isUuid(body.paymentId) ? body.paymentId : null;

    if (paymentId) {
      const { data: existing, error } = await db.from("subscription_payments")
        .select("id,project_id,status").eq("id", paymentId).maybeSingle();
      if (error) throw error;
      if (!existing || existing.project_id !== project.id) return bad("A megadott befizetés nem ehhez a projekthez tartozik.", 404);
      if (existing.status === "paid") return bad("Ez a befizetés már rendezve van.", 409);
    } else {
      // Ha van nyitott várt befizetés, azt használjuk — ne szülessen minden
      // linkgenerálásnál újabb sor ugyanarra az esedékességre.
      const { data: pending } = await db.from("subscription_payments")
        .select("id").eq("project_id", project.id).eq("status", "pending")
        .order("due_date", { ascending: true }).limit(1).maybeSingle();

      if (pending) {
        paymentId = pending.id as string;
      } else {
        const now = new Date();
        const { data: created, error } = await db.from("subscription_payments").insert({
          project_id: project.id,
          billing_period_start: now.toISOString(),
          billing_period_end: now.toISOString(),
          amount,
          currency: "HUF",
          status: "pending",
          payment_method: "stripe",
          payment_reference: paymentReference(project.id, now),
          due_date: now.toISOString(),
          note: "Admin által generált egyszeri kártyás fizetés.",
          recorded_by: admin.id
        }).select("id").single();
        if (error) throw error;
        paymentId = created.id as string;
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      adaptive_pricing: { enabled: false },
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
          unit_amount: hufToStripeAmount(amount),
          product_data: {
            name: `ProjectEdge ${plan.name} · ${billingIntervalLabel(interval)} díj`,
            description: `${project.title} — menedzselt weboldal szolgáltatási díj.`,
            metadata: { project_id: project.id }
          }
        }
      }],
      payment_intent_data: {
        description: `${project.title} · ProjectEdge ${plan.name}`,
        metadata: { project_id: project.id, subscription_payment_id: paymentId }
      },
      metadata: { project_id: project.id, subscription_payment_id: paymentId },
      success_url: `${siteUrl()}/ugyfelkapu/dashboard?payment=success`,
      cancel_url: `${siteUrl()}/ugyfelkapu/dashboard?payment=cancelled`
    }, {
      idempotencyKey: `projectedge-admin-oneoff-${paymentId}-${amount}`
    });

    await db.from("subscription_payments").update({
      amount,
      payment_method: "stripe",
      stripe_checkout_session_id: session.id,
      updated_at: new Date().toISOString()
    }).eq("id", paymentId);

    await db.from("client_projects").update({ stripe_customer_id: customerId }).eq("id", project.id);

    return NextResponse.json({
      ok: true,
      url: session.url,
      kind,
      amount,
      paymentId,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin payment link creation failed", error);
    return bad(error instanceof Error ? error.message : "A fizetési link nem hozható létre.", 500);
  }
}
