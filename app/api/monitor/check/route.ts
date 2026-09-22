import { NextResponse } from "next/server";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { checkSite, healthFromChecks, tlsExpiry } from "@/lib/site-monitor";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * ÓRÁNKÉNTI ELÉRHETŐSÉG-ELLENŐRZÉS.
 *
 * Ez a végpont termeli azt az adatot, amiből a havi jelentés rendelkezésre
 * állása számolódik. A „99.9%" nem marketingszöveg, hanem osztás eredménye —
 * és a levél mindig kiírja, HÁNY mérésből, hogy a szám súlya is látszódjon.
 *
 * GYAKORISÁG: óránként fut, tehát havonta ~720 mérés áll a szám mögött. Ez
 * Pro csomagot igényel; a Hobby csak napi cront enged, és ott a beütemezett
 * futás ±59 percet is csúszhat. Ha a projekt valaha visszakerülne Hobbyra, a
 * `vercel.json`-ben a `0 * * * *` kifejezéstől a deploy AZONNAL hibára fut —
 * nem csendben romlik el, ami itt szerencse.
 *
 * A `site_uptime_summary` a tényleges mérésszámmal oszt, tehát a gyakoriság
 * változása nem torzítja a százalékot, csak a felbontását.
 *
 * Két dolgot csinál minden aktív, menedzselt weboldalnál:
 *   1. lemér egy HTTP kérést (él-e, milyen gyorsan válaszol),
 *   2. megnézi a TLS tanúsítvány lejáratát.
 *
 * Ha egy oldal leesik, az admin értesítést kap — ez eddig egyáltalán nem
 * létezett: egy ügyfél weboldalának kiesését a rendszer nem vette észre,
 * jellemzően maga az ügyfél szólt. Az értesítés csak az ÁLLAPOTVÁLTÁSKOR megy
 * ki: egy tartós kiesés ne küldjön minden futásnál újabb jelzést.
 */

async function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return true;

  const user = await authenticatedUser(request);
  return Boolean(user && (await isAdminUser(request, user.id)));
}

async function runChecks(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  }

  const admin = createServerSupabaseAdminClient();

  const { data: projects, error } = await admin
    .from("client_projects")
    .select("id,title,user_id,live_url,managed_domain_name,site_health_status,contact_email")
    .eq("commercial_model", "subscription")
    .eq("subscription_status", "active");

  if (error) {
    console.error("Monitor project lookup failed", error);
    return NextResponse.json({ error: "A projektek nem tölthetők be." }, { status: 500 });
  }

  const results: Array<{ projectId: string; ok: boolean; responseMs: number | null }> = [];
  const wentDown: string[] = [];
  const cameBack: string[] = [];

  // Sorosan, nem párhuzamosan: néhány ügyfélnél ez pár másodperc, viszont nem
  // terheljük egyszerre az összes célt, és a naplóban is követhető marad.
  for (const project of projects ?? []) {
    const url = (project.live_url as string | null)
      ?? (project.managed_domain_name ? `https://${project.managed_domain_name}` : null);
    if (!url) continue;

    const check = await checkSite(url);
    const sslExpiresAt = check.ok ? await tlsExpiry(url) : null;

    await admin.from("site_checks").insert({
      project_id: project.id,
      ok: check.ok,
      status_code: check.statusCode,
      response_ms: check.responseMs,
      error: check.error
    });

    const health = healthFromChecks({
      ok: check.ok,
      sslExpiresAt,
      domainExpiresAt: null,
      now: new Date()
    });

    await admin.from("client_projects").update({
      site_health_status: health,
      last_health_check_at: new Date().toISOString(),
      ...(sslExpiresAt ? { ssl_expires_at: sslExpiresAt.toISOString() } : {})
    }).eq("id", project.id);

    // ── Értesítés CSAK állapotváltáskor ────────────────────────────────
    const wasOffline = project.site_health_status === "offline";
    if (!check.ok && !wasOffline) {
      wentDown.push(project.title as string);
      await admin.from("notifications").insert({
        user_id: null,
        title: `Nem elérhető: ${project.title}`,
        message: `A(z) „${project.title}” weboldala nem válaszol (${check.error ?? "ismeretlen hiba"}). Cím: ${url}`,
        link: "/admin/dashboard"
      });
    } else if (check.ok && wasOffline) {
      cameBack.push(project.title as string);
      await admin.from("notifications").insert({
        user_id: null,
        title: `Újra elérhető: ${project.title}`,
        message: `A(z) „${project.title}” weboldala ismét válaszol (${check.responseMs} ms).`,
        link: "/admin/dashboard"
      });
    }

    results.push({ projectId: project.id as string, ok: check.ok, responseMs: check.responseMs });
  }

  return NextResponse.json({
    checked: results.length,
    down: wentDown,
    recovered: cameBack,
    results
  }, { headers: { "Cache-Control": "no-store" } });
}

export const GET = runChecks;
export const POST = runChecks;
