import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";

/** A stúdió értesítési címe — ügyfél-jelzések ide futnak be. */
const STUDIO_NOTIFICATION_EMAIL = process.env.RESEND_REPLY_TO || "info@projectedge.hu";

// Csak belső, relatív útvonalat engedünk a levél gombjában (nyílt átirányítás ellen).
function safeInternalLink(link: unknown) {
  if (typeof link !== "string") return null;
  if (!link.startsWith("/") || link.startsWith("//")) return null;
  return link;
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
    }

    // 1. Hitelesítés: csak bejelentkezett felhasználó (ügyfél vagy admin) küldhet
    //    értesítést. Enélkül a végpont nyílt email-relay lenne.
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length);

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, title, message, link } = body ?? {};
    // A body `email` mezőjét szándékosan NEM használjuk: korábban a címzett
    // onnan jött, tehát bármelyik bejelentkezett ügyfél küldhetett levelet
    // bármilyen címre a projectedge.hu-ról (hitelesített email-relay). A címzettet
    // innentől a szerver határozza meg a hívó jogosultsága alapján.

    // Egyszerű méret-korlátok, hogy ne lehessen a végponton keresztül óriási
    // tartalmat küldeni.
    const safeTitle = String(title ?? "").slice(0, 200);
    const safeMessage = String(message ?? "").slice(0, 4000);
    const safeLink = safeInternalLink(link);
    const isWarrantyNotice = /projekt sikeresen lezárva|projekt lezárva|technikai garancia/i.test(safeTitle);

    if (!safeTitle) {
      return NextResponse.json({ error: "Missing title" }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey || supabaseAnonKey, {
      auth: { persistSession: false }
    });

    // 2. Címzett meghatározása kizárólag szerver oldalon.
    //
    //    * userId nélkül → a stúdió saját címe (ügyfél jelzései érkeznek ide),
    //    * saját magának bárki küldhet (a token e-mail címére),
    //    * MÁS felhasználónak csak admin küldhet, és a címet ilyenkor is az
    //      adatbázisból olvassuk ki, nem a kérésből.
    //    Az admin-ellenőrzés a hívó saját tokenjével fut, hogy service role
    //    kulcs nélkül is helyes eredményt adjon (az admin_users olvasását az
    //    is_admin() policy engedi a saját sorra).
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: adminRow } = await callerClient
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const isAdmin = Boolean(adminRow);

    const targetUserId: string | null = typeof userId === "string" && userId ? userId : null;
    let targetEmail: string | null = null;

    if (!targetUserId) {
      targetEmail = STUDIO_NOTIFICATION_EMAIL;
    } else if (targetUserId === user.id) {
      targetEmail = user.email ?? null;
    } else if (isAdmin) {
      // Adminként a saját tokenünkkel is olvasható a profil (is_admin policy),
      // így ez a lekérdezés service role kulcs nélkül is működik.
      const { data: profile } = await callerClient
        .from("client_profiles")
        .select("email")
        .eq("id", targetUserId)
        .maybeSingle();
      targetEmail = profile?.email ?? null;
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Insert notification into public.notifications
    const { error: dbError } = await supabase.from("notifications").insert({
      user_id: targetUserId,
      title: safeTitle,
      message: safeMessage,
      link: safeLink
    });

    if (dbError) {
      console.error("Failed to insert notification into DB:", dbError);
    }

    let emailSent = false;
    let emailError: string | null = null;

    if (targetEmail) {
      const result = await sendProjectEdgeEmail({
        to: targetEmail,
        subject: safeTitle,
        message: safeMessage,
        link: safeLink,
        eyebrow: isWarrantyNotice
          ? "PROJECTEDGE · 30 NAPOS GARANCIA"
          : userId ? "PROJECTEDGE · ÜGYFÉLKAPU" : "PROJECTEDGE · ÚJ ÉRTESÍTÉS",
        preheader: isWarrantyNotice
          ? `Díjmentes technikai garancia · ${safeTitle}`
          : safeTitle,
        linkLabel: isWarrantyNotice ? "Projekt megnyitása" : "Megnyitás az ügyfélkapun",
        terminalLabel: isWarrantyNotice ? "projectedge.warranty30" : "projectedge.notify",
        tags: isWarrantyNotice
          ? ["30 napos garancia", "Projekt lezárva", "Ügyfélkapu"]
          : undefined,
        details: [
          { label: "Címzett", value: targetEmail },
          { label: "Szolgáltatás", value: isWarrantyNotice ? "30 napos díjmentes technikai garancia" : "ProjectEdge ügyfélkapu" },
          { label: "Állapot", value: "Értesítés rögzítve" }
        ]
      });
      emailSent = result.ok;
      emailError = result.ok ? null : result.error;
    }

    // A DB értesítés ettől még megmarad, de a választásból egyértelműen látszik,
    // ha a levélküldő nincs beállítva vagy a szolgáltató elutasította a levelet.
    return NextResponse.json({ success: !dbError, emailSent, emailError });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
