import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STUDIO_NOTIFICATION_EMAIL =
  process.env.RESEND_NOTIFICATION_EMAIL || process.env.RESEND_REPLY_TO || "info@projectedge.hu";

type RegisterNotifyBody = {
  userId?: unknown;
  email?: unknown;
  name?: unknown;
};

export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(request, "register-notify", 15, 60_000);
    if (!rate.allowed) {
      return rateLimitResponse(rate.retryAfterSeconds);
    }

    const parsed = await readJsonBody<RegisterNotifyBody>(request, 2_000);
    if (!parsed.ok) return parsed.response;

    const { userId, email, name } = parsed.data ?? {};
    if (typeof userId !== "string" || !isUuid(userId) || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Érvénytelen felhasználói adatok." }, { status: 400 });
    }

    const userEmail = email.trim().toLowerCase();
    const displayName = typeof name === "string" && name.trim() ? name.trim() : userEmail;

    const admin = createServerSupabaseAdminClient();

    // Deduplikáció: ellenőrizzük, hogy ehhez a felhasználóhoz küldtünk-e már regisztrációs értesítést
    const { data: existingNotification } = await admin
      .from("notifications")
      .select("id")
      .eq("title", "Új ügyfél regisztráció")
      .ilike("message", `%${userEmail}%`)
      .maybeSingle();

    if (existingNotification) {
      return NextResponse.json({ success: true, alreadyNotified: true });
    }

    // 1. Rendszerértesítés rögzítése az admin felületre
    const notificationMessage = `Új felhasználó regisztrált az ügyfélkapun: ${displayName} (${userEmail}).`;
    await admin.from("notifications").insert({
      user_id: null,
      title: "Új ügyfél regisztráció",
      message: notificationMessage,
      link: "/admin"
    });

    // 2. Tranzakciós email küldése az adminnak Resend-en keresztül
    const emailResult = await sendProjectEdgeEmail({
      to: STUDIO_NOTIFICATION_EMAIL,
      subject: `Új ügyfél regisztráció: ${displayName} (${userEmail})`,
      eyebrow: "PROJECTEDGE · ÚJ REGISZTRÁCIÓ",
      preheader: `${displayName} új fiókot hozott létre a ProjectEdge ügyfélkapujában.`,
      message: `Új felhasználó regisztrált a ProjectEdge ügyfélkapujában.\n\nNév: ${displayName}\nEmail: ${userEmail}\nRegisztráció időpontja: ${new Date().toLocaleString("hu-HU")}\n\nAmint az ügyfél elindít egy projektet vagy kitölti a projektindító adatlapot, újabb értesítést fogsz kapni.`,
      link: "/admin",
      linkLabel: "Megnyitás az adminban",
      details: [
        { label: "Név", value: displayName },
        { label: "Email", value: userEmail },
        { label: "Időpont", value: new Date().toLocaleString("hu-HU") }
      ],
      tags: ["Regisztráció", "Ügyfélkapu", "Új fiók"]
    });

    return NextResponse.json({
      success: true,
      emailSent: emailResult.ok,
      emailError: emailResult.ok ? null : emailResult.error
    });
  } catch (error) {
    console.error("Register notification failed", error);
    return NextResponse.json({ error: "Az értesítés rögzítése most nem sikerült." }, { status: 500 });
  }
}
