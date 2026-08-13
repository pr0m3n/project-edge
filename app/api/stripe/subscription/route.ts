import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { checkRateLimit, isUuid, rateLimitResponse } from "@/lib/api-guard";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ensureStripeProduct,
  getStripe,
  subscriptionPeriodEnd,
  swapSubscriptionPrice
} from "@/lib/stripe";
import {
  PARKING_MONTHLY_PRICE,
  PARKING_PRODUCT_ID,
  subscriptionPlan,
  subscriptionProductId
} from "@/lib/subscriptions";

export const runtime = "nodejs";

/** Az ügyfél a saját projektjén ezeket végezheti el. */
const CLIENT_ACTIONS = ["cancel", "undo_cancel"] as const;
/** Ezek kizárólag adminnak: azonnali hatályú vagy díjat érintő beavatkozások. */
const ADMIN_ACTIONS = ["cancel_now", "pause", "resume"] as const;

type Action = (typeof CLIENT_ACTIONS)[number] | (typeof ADMIN_ACTIONS)[number];

type ProjectRow = {
  id: string;
  user_id: string;
  subscription_plan: string | null;
  monthly_price: number | null;
  stripe_subscription_id: string | null;
  stripe_parked_at: string | null;
};

/**
 * Az előfizetés Stripe-oldali módosítása. MINDEN állapotváltás ide fut be,
 * mert korábban az admin felület csak az adatbázist írta át — a Stripe pedig
 * vidáman terhelt tovább lemondás, szüneteltetés és kivásárlás után is.
 */
async function applyToStripe(action: Action, project: ProjectRow) {
  if (!project.stripe_subscription_id) return null;
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(project.stripe_subscription_id);

  // Egy már megszűnt előfizetést nem lehet és nem is kell módosítani.
  if (subscription.status === "canceled") return subscription;

  switch (action) {
    case "cancel":
      return stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
    case "undo_cancel":
      return stripe.subscriptions.update(subscription.id, { cancel_at_period_end: false });
    case "cancel_now":
      return stripe.subscriptions.cancel(subscription.id);
    case "pause": {
      if (project.stripe_parked_at) return subscription;
      const productId = await ensureStripeProduct(
        PARKING_PRODUCT_ID,
        "ProjectEdge weboldal-parkolás",
        "Parkolóállapot: a domain, a tárhely és a technikai fiókok fenntartása szüneteltetés alatt."
      );
      return swapSubscriptionPrice(subscription, productId, PARKING_MONTHLY_PRICE);
    }
    case "resume": {
      const plan = subscriptionPlan(project.subscription_plan);
      const amount = Number(project.monthly_price ?? plan.price);
      const productId = await ensureStripeProduct(
        subscriptionProductId(plan.key),
        `ProjectEdge ${plan.name} előfizetés`,
        "Menedzselt weboldal, tárhely, technikai felügyelet és a csomag szerinti módosítások."
      );
      return swapSubscriptionPrice(subscription, productId, amount);
    }
  }
}

type ProjectPatch = {
  stripe_subscription_status?: string;
  stripe_current_period_end?: string | null;
  subscription_status: string;
  subscription_cancel_requested_at?: string | null;
  cancel_effective_at?: string | null;
  cancelled_at?: string | null;
  paused_at?: string | null;
  pause_requested_at?: string | null;
  resume_requested_at?: string | null;
  stripe_parked_at?: string | null;
  next_billing_at?: string | null;
};

function projectPatch(action: Action, subscription: Stripe.Subscription | null): ProjectPatch {
  const now = new Date().toISOString();
  const periodEnd = subscription ? subscriptionPeriodEnd(subscription) : null;
  const shared = subscription
    ? { stripe_subscription_status: subscription.status, stripe_current_period_end: periodEnd }
    : {};

  switch (action) {
    case "cancel":
      return {
        ...shared,
        subscription_status: "cancel_requested",
        subscription_cancel_requested_at: now,
        cancel_effective_at: periodEnd
      };
    case "undo_cancel":
      return {
        ...shared,
        subscription_status: "active",
        subscription_cancel_requested_at: null,
        cancel_effective_at: null
      };
    case "cancel_now":
      return {
        ...shared,
        subscription_status: "cancelled",
        cancelled_at: now,
        cancel_effective_at: now,
        stripe_parked_at: null,
        next_billing_at: null
      };
    case "pause":
      return {
        ...shared,
        subscription_status: "paused",
        paused_at: now,
        pause_requested_at: null,
        stripe_parked_at: now,
        next_billing_at: periodEnd
      };
    case "resume":
      return {
        ...shared,
        subscription_status: "active",
        paused_at: null,
        resume_requested_at: null,
        stripe_parked_at: null,
        next_billing_at: periodEnd
      };
  }
}

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "stripe-subscription", 20, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });

    const body = await request.json().catch(() => null) as { projectId?: string; action?: string } | null;
    const action = body?.action as Action | undefined;
    const known = [...CLIENT_ACTIONS, ...ADMIN_ACTIONS] as readonly string[];
    if (!body?.projectId || !isUuid(body.projectId) || !action || !known.includes(action)) {
      return NextResponse.json({ error: "Érvénytelen előfizetési művelet." }, { status: 400 });
    }

    const admin = createServerSupabaseAdminClient();
    const isAdmin = await isAdminUser(request, user.id);

    if ((ADMIN_ACTIONS as readonly string[]).includes(action) && !isAdmin) {
      return NextResponse.json({ error: "Ehhez a művelethez admin jogosultság kell." }, { status: 403 });
    }

    let query = admin.from("client_projects")
      .select("id,user_id,subscription_plan,monthly_price,stripe_subscription_id,stripe_parked_at")
      .eq("id", body.projectId);
    // Az ügyfél kizárólag a saját projektjét módosíthatja; az admin bármelyiket.
    if (!isAdmin) query = query.eq("user_id", user.id);

    const { data: project, error: projectError } = await query.maybeSingle<ProjectRow>();
    if (projectError) throw projectError;
    if (!project) return NextResponse.json({ error: "A projekt nem található, vagy nincs hozzáférésed." }, { status: 404 });

    if (!project.stripe_subscription_id && !isAdmin) {
      return NextResponse.json({ error: "Ehhez a projekthez nincs aktív Stripe-előfizetés." }, { status: 409 });
    }

    const subscription = await applyToStripe(action, project);
    const patch = projectPatch(action, subscription);

    const { error } = await admin.from("client_projects").update(patch).eq("id", project.id);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      stripeUpdated: Boolean(subscription),
      effectiveAt: patch.cancel_effective_at ?? patch.next_billing_at ?? null
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Stripe subscription update failed", error);
    return NextResponse.json({ error: "Az előfizetés módosítása most nem sikerült." }, { status: 500 });
  }
}
