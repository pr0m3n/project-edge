import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { authenticatedUser } from "@/lib/server-auth";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type FollowupBody = {
  projectId?: unknown;
};

export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(request, "admin-followup", 30, 60_000);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

    const user = await authenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: "Bejelentkezés szükséges." }, { status: 401 });
    }

    const admin = createServerSupabaseAdminClient();

    // Csak admin jogosultsággal hívható
    const { data: isAdmin } = await admin.rpc("is_admin", { user_id: user.id });
    if (!isAdmin) {
      return NextResponse.json({ error: "Nincs adminisztrátori jogosultságod." }, { status: 403 });
    }

    const parsed = await readJsonBody<FollowupBody>(request, 2_000);
    if (!parsed.ok) return parsed.response;

    const { projectId } = parsed.data ?? {};
    if (typeof projectId !== "string" || !isUuid(projectId)) {
      return NextResponse.json({ error: "Érvénytelen projektazonosító." }, { status: 400 });
    }

    const { data: project, error: projectError } = await admin
      .from("client_projects")
      .select("id, title, user_id, status, client_decision_note, created_at")
      .eq("id", projectId)
      .single();

    if (projectError || !project || !project.user_id) {
      return NextResponse.json({ error: "A projekt nem található vagy nem tartozik felhasználóhoz." }, { status: 404 });
    }

    // Ügyfél profil lekérdezése
    const { data: profile } = await admin
      .from("client_profiles")
      .select("email, full_name")
      .eq("id", project.user_id)
      .maybeSingle();

    const clientEmail = profile?.email;
    const clientName = profile?.full_name?.split(" ")[0] || "Kedves Ügyfelünk";

    if (!clientEmail) {
      return NextResponse.json({ error: "Az ügyfél email címe nem található." }, { status: 400 });
    }

    const projectTitle = project.title || "weboldal";

    // Személyes, közvetlen segítségnyújtó email
    const emailResult = await sendProjectEdgeEmail({
      to: clientEmail,
      subject: `Segíthetek a(z) „${projectTitle}” weboldal elindításában?`,
      eyebrow: "PROJECTEDGE · PROJEKTINDÍTÁS",
      preheader: `Láttam, hogy elindítottad a briefet a(z) ${projectTitle} projekthez.`,
      message: `Szia ${clientName}!\n\nLáttam, hogy elindítottad a projektet a ProjectEdge ügyfélkapujában a(z) „${projectTitle}” weboldalhoz.\n\nSzeretném megkérdezni, hogy elakadtál-e valamelyik lépésnél (pl. szerződés elfogadása, indulás), vagy van-e bármilyen kérdésed a weboldallal, határidőkkel vagy a tartalommal kapcsolatban, amiben segíthetek?\n\nHa válaszolsz erre az emailre, közvetlenül nekem írsz.\n\nÜdvözlettel,\nBóczán Patrik\nProjectEdge Studio`,
      link: "/ugyfelkapu/dashboard",
      linkLabel: "Ügyfélkapu megnyitása",
      details: [
        { label: "Projekt", value: projectTitle },
        { label: "Státusz", value: "Előkészítés alatt" }
      ],
      tags: ["Onboarding", "Follow-up", "Projektindítás"]
    });

    if (!emailResult.ok) {
      return NextResponse.json({ error: emailResult.error || "Nem sikerült elküldeni az emailt." }, { status: 500 });
    }

    // Rögzítjük a megkeresést az ügyfélnél is az értesítések között
    await admin.from("notifications").insert({
      user_id: project.user_id,
      title: "Segítség a projektindításban",
      message: `Bóczán Patrik emailt küldött neked a(z) „${projectTitle}” projekt elindításával kapcsolatban.`,
      link: "/ugyfelkapu/dashboard"
    });

    return NextResponse.json({ success: true, emailSent: true });
  } catch (error) {
    console.error("Admin follow-up error", error);
    return NextResponse.json({ error: "Hiba történt az emlékeztető küldésekor." }, { status: 500 });
  }
}
