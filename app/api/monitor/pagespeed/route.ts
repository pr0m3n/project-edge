import { NextResponse } from "next/server";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { domainExpiry, pageSpeedScores } from "@/lib/site-monitor";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * HETI SEBESSÉGMÉRÉS ÉS DOMAIN-LEJÁRAT.
 *
 * Külön fut az óránkénti elérhetőség-ellenőrzéstől, mert lassú: egy PageSpeed
 * futtatás fél percig is eltarthat. Ha ez az óránkénti körben lenne, vagy
 * időtúllépésre futna a cron, vagy az elérhetőség-mérés csúszna el miatta.
 *
 * Amit ad: a sebességpontszám az egyetlen olyan szám, ami az ügyfélnek
 * érthető, nekünk hízelgő, és nem függ a forgalomtól. A domain lejárata pedig
 * az a dátum, amiről a tulajdonos jellemzően csak akkor értesül, amikor az
 * oldal már nem él.
 *
 * A hibák itt szándékosan csendesek: egy PSI-kimaradás nem hiba, amit jelenteni
 * kell, csak egy hét, amikor nincs friss pontszám.
 */

async function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return true;

  const user = await authenticatedUser(request);
  return Boolean(user && (await isAdminUser(request, user.id)));
}

async function runPageSpeed(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  }

  const admin = createServerSupabaseAdminClient();

  const { data: projects, error } = await admin
    .from("client_projects")
    .select("id,title,live_url,managed_domain_name")
    .eq("commercial_model", "subscription")
    .eq("subscription_status", "active");

  if (error) {
    console.error("PageSpeed project lookup failed", error);
    return NextResponse.json({ error: "A projektek nem tölthetők be." }, { status: 500 });
  }

  const measured: Array<{ title: string; performance: number | null }> = [];
  const expiringDomains: string[] = [];

  for (const project of projects ?? []) {
    const url = (project.live_url as string | null)
      ?? (project.managed_domain_name ? `https://${project.managed_domain_name}` : null);
    if (!url) continue;

    const scores = await pageSpeedScores(url);
    const expiry = project.managed_domain_name
      ? await domainExpiry(project.managed_domain_name as string)
      : null;

    const patch: Record<string, unknown> = {};
    if (scores.performance !== null) {
      patch.psi_performance = scores.performance;
      patch.psi_accessibility = scores.accessibility;
      patch.psi_seo = scores.seo;
      patch.psi_checked_at = new Date().toISOString();
    }
    if (expiry) patch.domain_expires_at = expiry.toISOString();

    if (Object.keys(patch).length) {
      await admin.from("client_projects").update(patch).eq("id", project.id);
    }

    // 30 napon belüli domain-lejárat: ennyi idő alatt a megújítás még
    // kényelmesen elintézhető, és a `.hu` regisztrátorok is ekkortájt szólnak.
    if (expiry && expiry.getTime() - Date.now() < 30 * 86_400_000) {
      expiringDomains.push(`${project.title} (${project.managed_domain_name}, ${expiry.toLocaleDateString("hu-HU")})`);
      await admin.from("notifications").insert({
        user_id: null,
        title: `Lejáró domain: ${project.managed_domain_name}`,
        message: `A(z) „${project.title}” domainje ${expiry.toLocaleDateString("hu-HU")}-n lejár. Intézd a megújítást.`,
        link: "/admin/dashboard"
      });
    }

    measured.push({ title: project.title as string, performance: scores.performance });
  }

  return NextResponse.json({
    measured,
    expiringDomains
  }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = runPageSpeed;
export const POST = runPageSpeed;
