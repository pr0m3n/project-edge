import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse } from "@/lib/api-guard";
import { authenticatedUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { getStripe, siteUrl } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "stripe-portal", 10, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });
    const body = await request.json().catch(() => null) as { projectId?: string } | null;
    if (!body?.projectId || !isUuid(body.projectId)) return NextResponse.json({ error: "Érvénytelen projektazonosító." }, { status: 400 });

    const { data: project } = await createServerSupabaseAdminClient().from("client_projects")
      .select("stripe_customer_id").eq("id", body.projectId).eq("user_id", user.id).maybeSingle();
    if (!project?.stripe_customer_id) return NextResponse.json({ error: "Ehhez a projekthez még nincs Stripe-előfizetés." }, { status: 409 });

    const session = await getStripe().billingPortal.sessions.create({
      customer: project.stripe_customer_id,
      return_url: `${siteUrl()}/ugyfelkapu/dashboard`
    });
    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Stripe portal creation failed", error);
    return NextResponse.json({ error: "A számlázási felület most nem nyitható meg." }, { status: 500 });
  }
}
