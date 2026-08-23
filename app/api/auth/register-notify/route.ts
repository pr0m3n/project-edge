import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { authenticatedUser } from "@/lib/server-auth";
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

    // A végpont levelet küld, ezért nem maradhat nyitva: hitelesítés nélkül
    // bárki generálhatott volna vele „Új ügyfél regisztráció" leveleket a
    // stúdió postafiókjába. Csak a SAJÁT regisztrációját jelentheti be valaki.
    const user = await authenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Érvénytelen vagy lejárt munkamenet." }, { status: 401 });
    }

    const parsed = await readJsonBody<RegisterNotifyBody>(request, 2_000);
    if (!parsed.ok) return parsed.response;

    const { userId, email, name } = parsed.data ?? {};
    if (typeof userId !== "string" || !isUuid(userId) || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Érvénytelen felhasználói adatok." }, { status: 400 });
    }
    if (userId !== user.id) {
      return NextResponse.json({ error: "Csak a saját regisztráció jelenthető be." }, { status: 403 });
    }

    const userEmail = email.trim().toLowerCase();
    const displayName = typeof name === "string" && name.trim() ? name.trim() : userEmail;

    const admin = createServerSupabaseAdminClient();

    // Deduplikáció.
    //
    // A `maybeSingle()` itt korábban ELRONTOTTA a védelmet: amint két sor is
    // megvolt ugyanahhoz az e-mail címhez, hibát adott vissza `data: null`-lal,
    // amit a kód „még nem küldtünk"-nek olvasott — így minden újabb hívás újabb
    // levelet szült. A `limit(1)` tömböt ad, ami akárhány meglévő sorral is
    // helyes választ jelent.
    const { data: existingNotifications } = await admin
      .from("notifications")
      .select("id")
      .eq("title", "Új ügyfél regisztráció")
      .ilike("message", `%${userEmail}%`)
      .limit(1);

    if (existingNotifications?.length) {
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
