import { NextResponse } from "next/server";
import { checkDurableRateLimit, isUuid, rateLimitResponse } from "@/lib/api-guard";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * LEIRATKOZÁS A HÍRLEVÉLRŐL.
 *
 * Két úton érkezhet ide kérés, és mindkettőt ki kell szolgálni:
 *
 *  · POST — a Gmail és az Outlook saját „Leiratkozás" gombja
 *    (`List-Unsubscribe-Post: List-Unsubscribe=One-Click`). Ez gép, nem ember:
 *    nem néz weboldalt, nem kattint megerősítést, csak egy 2xx választ vár.
 *    Ha ezt nem szolgáljuk ki, a levelezőrendszerek a küldő domaint kezdik
 *    gyanúsnak látni — pont azt a domaint, amiről a hideg email kampány megy.
 *
 *  · GET — az ember, aki a levél láblécében lévő linkre kattintott. Őt a
 *    `/leiratkozas` oldalra irányítjuk, ami visszaigazolja a leiratkozást.
 *
 * A token az AZONOSÍTÓ: bejelentkezés nélkül működik, mert egy levelezőprogram
 * nem tud belépni sehova, és egy leiratkozás, ami előbb regisztrációt kér, nem
 * leiratkozás.
 *
 * FONTOS, mit NEM csinál: a tranzakciós leveleket (számla, fizetési
 * emlékeztető, havi jelentés, ügyfélkapus értesítés) nem kapcsolja ki. Azok a
 * szolgáltatás részei; a leiratkozás a hírlevélre vonatkozik. A két dolgot
 * összekeverve az ügyfél a saját fizetéséről szóló értesítéseket veszítené el.
 */

async function unsubscribe(token: string) {
  // A token UUID, és ezt ELŐRE ellenőrizni kell, nem az adatbázisra bízni: egy
  // nem UUID alakú érték a Postgresben típuskonverziós hibát dob (22P02), nem
  // üres találatot. Emiatt egy elgépelt vagy levágott link „átmeneti hiba"
  // üzenetet kapott volna a helyes „ez a link már nem érvényes" helyett — és
  // minden ilyen kattintás hibát írt volna a naplóba.
  if (!isUuid(token)) return { ok: false as const, reason: "notfound" as const };

  const admin = createServerSupabaseAdminClient();
  const { data, error } = await admin
    .from("client_profiles")
    .update({
      marketing_opt_in: false,
      marketing_opt_out_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("unsubscribe_token", token)
    .select("id,email")
    .maybeSingle();

  if (error) {
    console.error("Unsubscribe failed", error);
    return { ok: false as const, reason: "error" as const };
  }
  // Ismeretlen tokenre is sikert jelentünk kifelé (lásd a hívóknál): a
  // találat/nem találat különbsége önmagában információ arról, hogy egy adott
  // token létezik-e.
  if (!data) return { ok: false as const, reason: "notfound" as const };

  await admin.from("notifications").insert({
    user_id: null,
    title: "Leiratkozás a hírlevélről",
    message: `${data.email} leiratkozott. A szolgáltatáshoz tartozó leveleket (számla, fizetési emlékeztető, havi jelentés) továbbra is megkapja.`,
    link: "/admin/dashboard"
  });

  return { ok: true as const };
}

/** A levelezőrendszerek egykattintásos leiratkozása. */
export async function POST(request: Request) {
  const rate = await checkDurableRateLimit(request, "unsubscribe", 60, 10 * 60);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const token = new URL(request.url).searchParams.get("token") ?? "";
  await unsubscribe(token);

  // A szabvány szerint mindig sikert jelzünk: a levelezőrendszer nem tud mit
  // kezdeni egy hibával, és egy 4xx itt a küldő hírnevét rontaná.
  return new NextResponse(null, { status: 204 });
}

/** Az ember, aki a lábléc linkjére kattintott. */
export async function GET(request: Request) {
  const rate = await checkDurableRateLimit(request, "unsubscribe", 60, 10 * 60);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const result = await unsubscribe(token);

  const target = new URL("/leiratkozas", url.origin);
  target.searchParams.set("allapot", result.ok ? "ok" : result.reason === "notfound" ? "ismeretlen" : "hiba");
  return NextResponse.redirect(target, 303);
}
