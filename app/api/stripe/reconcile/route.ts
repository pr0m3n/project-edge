import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { subscriptionStatusFromStripe } from "@/lib/billing-math";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getStripe, subscriptionPeriodEnd } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Napi egyeztetés a Stripe és az adatbázis között.
 *
 * Miért kell: a webhook elveszhet (kiesés, deploy közbeni timeout, rossz
 * végpontkonfiguráció), és akkor az adatbázis csendben eltér a valóságtól — a
 * legrosszabb esetben egy lemondott előfizetés aktívnak látszik, vagy egy
 * törölt projekthez tartozó előfizetés tovább terhel. Ez a végpont mindkét
 * irányban ellenőriz:
 *
 *   1. minden nyilvántartott előfizetés valódi Stripe-állapota,
 *   2. a Stripe-ban élő, de nálunk gazdátlan előfizetések.
 */

function mappedStatus(subscription: Stripe.Subscription, parked: boolean) {
  return subscriptionStatusFromStripe(subscription.status, subscription.cancel_at_period_end, parked);
}

async function authorize(request: Request) {
  // A Vercel cron ezzel a fejléccel hívja a végpontot.
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return true;

  // Kézi futtatás az adminból.
  const user = await authenticatedUser(request);
  return Boolean(user && (await isAdminUser(request, user.id)));
}

async function runReconciliation(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  }

  const admin = createServerSupabaseAdminClient();
  const stripe = getStripe();
  const drift: string[] = [];

  try {
    const { data: projects, error } = await admin.from("client_projects")
      .select("id,title,subscription_status,stripe_subscription_id,stripe_parked_at")
      .not("stripe_subscription_id", "is", null);
    if (error) throw error;

    const known = new Set<string>();

    for (const project of projects ?? []) {
      known.add(project.stripe_subscription_id as string);
      let subscription: Stripe.Subscription;
      try {
        subscription = await stripe.subscriptions.retrieve(project.stripe_subscription_id as string);
      } catch {
        drift.push(`„${project.title}”: a nyilvántartott Stripe-előfizetés nem érhető el.`);
        continue;
      }

      const expected = mappedStatus(subscription, Boolean(project.stripe_parked_at));
      if (!expected) continue;

      const periodEnd = subscriptionPeriodEnd(subscription);
      const patch: Record<string, unknown> = {
        stripe_subscription_status: subscription.status,
        stripe_current_period_end: periodEnd
      };

      if (expected !== project.subscription_status) {
        drift.push(`„${project.title}”: ${project.subscription_status ?? "ismeretlen"} → ${expected}.`);
        patch.subscription_status = expected;
        if (expected === "cancelled") {
          patch.cancelled_at = new Date().toISOString();
          patch.next_billing_at = null;
        } else if (expected !== "paused") {
          patch.next_billing_at = periodEnd;
        }
      }

      await admin.from("client_projects").update(patch).eq("id", project.id);
    }

    // Gazdátlan, de élő előfizetések: ezek terhelnék az ügyfelet olyan
    // projektért, ami nálunk már nem létezik.
    for await (const subscription of stripe.subscriptions.list({ status: "active", limit: 100 })) {
      if (known.has(subscription.id)) continue;
      drift.push(`Gazdátlan aktív Stripe-előfizetés: ${subscription.id} (projekt: ${subscription.metadata.project_id ?? "nincs megadva"}).`);
    }

    if (drift.length) {
      await admin.from("notifications").insert({
        user_id: null,
        title: "Stripe-egyeztetés: eltérés",
        message: `A napi egyeztetés ${drift.length} eltérést talált:\n\n${drift.slice(0, 25).join("\n")}`,
        link: "/admin"
      });
    }

    return NextResponse.json({ checked: projects?.length ?? 0, drift: drift.length }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Stripe reconciliation failed", error);
    return NextResponse.json({ error: "Az egyeztetés most nem futtatható." }, { status: 500 });
  }
}

// A Vercel cron GET-tel hívja a végpontot; a kézi indítás az adminból POST.
export const GET = runReconciliation;
export const POST = runReconciliation;
