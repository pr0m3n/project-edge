import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse } from "@/lib/api-guard";
import { authenticatedUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "stripe-subscription", 8, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });
    const body = await request.json().catch(() => null) as { projectId?: string; action?: string } | null;
    if (!body?.projectId || !isUuid(body.projectId) || !["cancel", "undo_cancel"].includes(body.action ?? "")) {
      return NextResponse.json({ error: "Érvénytelen előfizetési művelet." }, { status: 400 });
    }

    const admin = createServerSupabaseAdminClient();
    const { data: project } = await admin.from("client_projects")
      .select("id,stripe_subscription_id").eq("id", body.projectId).eq("user_id", user.id).maybeSingle();
    if (!project?.stripe_subscription_id) return NextResponse.json({ error: "Ehhez a projekthez nincs aktív Stripe-előfizetés." }, { status: 409 });

    const subscription = await getStripe().subscriptions.update(project.stripe_subscription_id, {
      cancel_at_period_end: body.action === "cancel"
    });
    const periodEnd = subscription.items.data[0]?.current_period_end;
    const effectiveAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
    const { error } = await admin.from("client_projects").update({
      subscription_status: body.action === "cancel" ? "cancel_requested" : "active",
      subscription_cancel_requested_at: body.action === "cancel" ? new Date().toISOString() : null,
      cancel_effective_at: body.action === "cancel" ? effectiveAt : null,
      stripe_subscription_status: subscription.status,
      stripe_current_period_end: effectiveAt
    }).eq("id", project.id);
    if (error) throw error;
    return NextResponse.json({ success: true, effectiveAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Stripe subscription update failed", error);
    return NextResponse.json({ error: "Az előfizetés módosítása most nem sikerült." }, { status: 500 });
  }
}
