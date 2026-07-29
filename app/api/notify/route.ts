import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";

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
    const { userId, email, title, message, link } = body ?? {};

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

    // Insert notification into public.notifications
    const { error: dbError } = await supabase.from("notifications").insert({
      user_id: userId || null,
      title: safeTitle,
      message: safeMessage,
      link: safeLink
    });

    if (dbError) {
      console.error("Failed to insert notification into DB:", dbError);
    }

    let emailSent = false;
    let emailError: string | null = null;

    // Determine recipient
    const targetEmail = email || (userId ? null : "admin@projectedge.hu");

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
