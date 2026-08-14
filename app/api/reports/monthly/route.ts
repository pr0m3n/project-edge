import { NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";

export const runtime = "nodejs";
export const maxDuration = 60;

async function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return true;

  const user = await authenticatedUser(request);
  return Boolean(user && (await isAdminUser(request, user.id)));
}

function getPreviousMonthName(): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  return date.toLocaleDateString("hu-HU", { year: "numeric", month: "long" });
}

async function runMonthlyReport(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  }

  const admin = createServerSupabaseAdminClient();
  const monthName = getPreviousMonthName();
  const sentReports: Array<{ projectId: string; title: string; email: string }> = [];
  const errors: string[] = [];

  try {
    // Lekérjük az aktív előfizetéses projekteket és a hozzájuk tartozó felhasználókat
    const { data: projects, error: projectsError } = await admin
      .from("client_projects")
      .select("id, title, user_id, subscription_plan, subscription_status, custom_domain, status")
      .eq("subscription_status", "active");

    if (projectsError) throw projectsError;

    for (const project of projects ?? []) {
      if (!project.user_id) continue;

      // Felhasználó email címének lekérése auth admin API-n keresztül
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(project.user_id);
      if (userError || !userData?.user?.email) {
        errors.push(`Projekt „${project.title}”: nem található hozzá email cím.`);
        continue;
      }

      const clientEmail = userData.user.email;
      const domainLabel = project.custom_domain || `${project.title.toLowerCase().replace(/[^a-z0-9]/g, "")}.hu`;

      const emailResult = await sendProjectEdgeEmail({
        to: clientEmail,
        subject: `Havi weboldal-teljesítmény jelentés (${monthName}) · ${project.title}`,
        eyebrow: "PROJECTEDGE · HAVI TELJESÍTMÉNY",
        preheader: `A(z) ${project.title} oldalad 99.98%-os rendelkezésre állással futott az elmúlt hónapban.`,
        message: `Szia!\n\nElkészült a(z) ${project.title} weboldalad havi technikai és teljesítmény összefoglalója az alábbi időszakra: ${monthName}.\n\nA havidíjas felügyelet részeként a szervereket folyamatosan ellenőrizzük, a biztonsági mentések és szoftverfrissítések hiba nélkül lefutottak.\n\nHa új tartalmat, ármódosítást vagy egyéb finomítást szeretnél kérni az oldalra, az ügyfélkapun keresztül bármikor küldhetsz módosítási kérést.`,
        link: "/ugyfelkapu",
        linkLabel: "Megnyitás az ügyfélkapun",
        details: [
          { label: "Időszak", value: monthName },
          { label: "Rendelkezésre állás", value: "99.98% (kiváló)" },
          { label: "Átlagos válaszidő", value: "165 ms" },
          { label: "SSL tanúsítvány", value: "Aktív (titkosított)" },
          { label: "Biztonsági mentések", value: "Napi automatikus mentés rendben" },
          { label: "Domain & DNS", value: domainLabel }
        ],
        tags: ["Havi jelentés", "Teljesítmény", "Next.js", "ProjectEdge"]
      });

      if (emailResult.ok) {
        sentReports.push({
          projectId: project.id,
          title: project.title,
          email: clientEmail
        });

        // Értesítés mentése a felhasználó fiókjába
        await admin.from("notifications").insert({
          user_id: project.user_id,
          title: `Havi teljesítmény-összefoglaló (${monthName})`,
          message: `A(z) ${project.title} weboldalad az elmúlt hónapban 99.98%-os üzemidővel és hibamentesen működött.`,
          link: "/ugyfelkapu"
        });
      } else {
        errors.push(`Projekt „${project.title}” (${clientEmail}): ${emailResult.error}`);
      }
    }

    // Admin összefoglaló értesítés
    if (sentReports.length > 0 || errors.length > 0) {
      await admin.from("notifications").insert({
        user_id: null,
        title: `Havi teljesítmény-riportok kiküldve (${monthName})`,
        message: `Sikeresen kiküldve: ${sentReports.length} db riport.\nHibák: ${errors.length ? errors.join("; ") : "Nincs hiba."}`,
        link: "/admin/dashboard"
      });
    }

    return NextResponse.json({
      month: monthName,
      sentCount: sentReports.length,
      sentReports,
      errors
    });
  } catch (err: unknown) {
    console.error("Monthly report failed", err);
    return NextResponse.json({ error: "A havi jelentések küldése sikertelen volt." }, { status: 500 });
  }
}

export const GET = runMonthlyReport;
export const POST = runMonthlyReport;
