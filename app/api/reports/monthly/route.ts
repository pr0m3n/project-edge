import { NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { formatHuf, subscriptionPlan } from "@/lib/subscriptions";
import { daysUntil } from "@/lib/onboarding";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * HAVI JELENTÉS AZ ÜGYFÉLNEK — VALÓDI ADATOKKAL.
 *
 * MI VOLT ITT KORÁBBAN, és miért kellett átírni: ez a végpont beégetett
 * számokat küldött ki minden aktív előfizetőnek — „99.98% rendelkezésre
 * állás", „165 ms átlagos válaszidő", „napi automatikus mentés rendben".
 * Egyik mögött sem állt mérés; a szövegben szerepeltek, string konstansként.
 * Ráadásul a lekérdezés egy nem létező `custom_domain` oszlopot kért, tehát a
 * cron minden hónapban csendben hibára futott, és valójában egyetlen levél
 * sem ment ki. A hibás működés fedte el a tartalmi problémát.
 *
 * Az új felállás alapszabálya: CSAK azt írjuk le, amit megmértünk. Amiről
 * nincs adat, az kimarad a levélből — nem tölti ki egy jól hangzó becslés.
 *
 * Amit közlünk, és honnan jön:
 *   · rendelkezésre állás, válaszidő → `site_checks`, óránkénti valódi mérés
 *   · sebességpontszám              → PageSpeed Insights, heti mérés
 *   · SSL és domain lejárat         → TLS kézfogás és RDAP
 *   · elvégzett munka               → `project_change_logs`
 *   · fizetési helyzet              → `subscription_payments`
 *
 * Látogatószámot SZÁNDÉKOSAN nem közlünk. Egy induló oldalnál az alacsony
 * lesz, és havonta kiküldve a szolgáltatás ellen dolgozna — miközben a fenti
 * adatok az első hónaptól jól néznek ki, mert a szolgáltatás minőségéről
 * szólnak, nem a marketing eredményéről.
 */

async function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return true;

  const user = await authenticatedUser(request);
  return Boolean(user && (await isAdminUser(request, user.id)));
}

/** Az előző naptári hónap határai UTC-ben, és a magyar neve. */
function previousMonth(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return {
    start,
    end,
    label: start.toLocaleDateString("hu-HU", { year: "numeric", month: "long", timeZone: "UTC" })
  };
}

type UptimeSummary = {
  checks: number;
  failures: number;
  uptime_percent: number | null;
  avg_response_ms: number | null;
  worst_response_ms: number | null;
  last_failure_at: string | null;
};

/**
 * A mezőnévből emberi mondat.
 *
 * A `project_change_logs` eddig HOLT ADAT volt: az ügyfélkapu írta, de soha
 * senki nem olvasta vissza. Pedig pont ez az, ami igazolja a havidíjat —
 * „ezt csináltam veled a hónapban". A nyers mezőnév viszont semmit nem mond
 * az ügyfélnek, ezért kell a fordítás.
 */
const CHANGE_LABELS: Record<string, string> = {
  status: "A projekt állapota változott",
  next_step: "Új soron következő lépés",
  staging_url: "Új előnézeti verzió készült",
  milestones: "Mérföldkövek frissültek",
  brief_data: "A projekt adatlapja frissült",
  logo_url: "Logó frissítve",
  managed_domain_name: "Domain beállítás változott",
  monthly_price: "Díjszabás módosult",
  subscription_status: "Előfizetés állapota változott"
};

async function runMonthlyReport(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  }

  const admin = createServerSupabaseAdminClient();
  const period = previousMonth();
  const sent: Array<{ projectId: string; title: string; email: string }> = [];
  const errors: string[] = [];

  try {
    const { data: projects, error: projectsError } = await admin
      .from("client_projects")
      .select("id,title,user_id,contact_email,subscription_plan,subscription_status,monthly_price,managed_domain_name,live_url,ssl_expires_at,domain_expires_at,psi_performance,psi_accessibility,psi_seo,psi_checked_at,next_billing_at,billing_interval,payment_method,subscription_started_at,prepaid_until")
      .eq("commercial_model", "subscription")
      .eq("subscription_status", "active");

    if (projectsError) throw projectsError;

    for (const project of projects ?? []) {
      if (!project.user_id) continue;

      // Aki a hónap utolsó két hetében került be, annak NEM küldünk jelentést
      // erről a hónapról.
      //
      // Az ilyen levél formálisan igaz lenne, tartalmilag viszont üres: egy
      // szeptember 25-én felvett ügyfél „szeptemberi jelentése" öt napról
      // szólna, néhány méréssel, és arról a hónapról, amiben még nem is volt
      // ügyfél. Az első jelentés akkor ér valamit, ha van mögötte hónap — ő a
      // következő fordulón kapja az elsőt.
      const startedAt = project.subscription_started_at
        ? new Date(project.subscription_started_at as string)
        : null;
      if (startedAt && startedAt.getTime() > period.end.getTime() - 14 * 86_400_000) {
        continue;
      }

      const email = (project.contact_email as string | null)
        ?? (await admin.auth.admin.getUserById(project.user_id as string)).data?.user?.email
        ?? null;

      if (!email) {
        errors.push(`Projekt „${project.title}”: nem található hozzá email cím.`);
        continue;
      }

      // ── A hónap valódi mérései ────────────────────────────────────────
      // A függvény `returns table (…)`, tehát sorhalmazt ad — egyetlen sorral.
      // A `.single()` a PostgREST szintjén oldja meg, hogy egy objektumot
      // kapjunk; a tömbindexelés típusban itt nem járható út.
      const { data: uptime } = await admin.rpc("site_uptime_summary", {
        target_project: project.id,
        period_start: period.start.toISOString(),
        period_end: period.end.toISOString()
      }).single<UptimeSummary>();

      const { data: changes } = await admin
        .from("project_change_logs")
        .select("field_name,changed_at")
        .eq("project_id", project.id)
        .gte("changed_at", period.start.toISOString())
        .lt("changed_at", period.end.toISOString())
        .order("changed_at", { ascending: true });

      const { data: payments } = await admin
        .from("subscription_payments")
        .select("amount,paid_at,billingo_invoice_number")
        .eq("project_id", project.id)
        .eq("status", "paid")
        .gte("paid_at", period.start.toISOString())
        .lt("paid_at", period.end.toISOString());

      // ── A levél tételei: CSAK amiről van adat ─────────────────────────
      const details: Array<{ label: string; value: string }> = [
        { label: "Időszak", value: period.label }
      ];

      if (uptime && uptime.checks > 0 && uptime.uptime_percent !== null) {
        details.push({
          label: "Rendelkezésre állás",
          value: `${uptime.uptime_percent}% (${uptime.checks} mérésből)`
        });
        if (uptime.avg_response_ms !== null) {
          details.push({ label: "Átlagos válaszidő", value: `${uptime.avg_response_ms} ms` });
        }
        if (uptime.failures > 0) {
          details.push({
            label: "Fennakadás",
            value: `${uptime.failures} alkalom${uptime.last_failure_at ? `, utoljára ${new Date(uptime.last_failure_at).toLocaleDateString("hu-HU")}` : ""}`
          });
        }
      }

      if (typeof project.psi_performance === "number") {
        details.push({
          label: "Sebességpontszám",
          value: `${project.psi_performance}/100${typeof project.psi_seo === "number" ? ` · SEO ${project.psi_seo}/100` : ""}`
        });
      }

      if (project.ssl_expires_at) {
        const days = daysUntil(new Date(project.ssl_expires_at as string));
        details.push({
          label: "SSL tanúsítvány",
          value: days > 0 ? `Érvényes, még ${days} nap` : "Lejárt — intézkedem"
        });
      }

      if (project.domain_expires_at) {
        details.push({
          label: "Domain",
          value: `${project.managed_domain_name ?? "—"} · megújítás ${new Date(project.domain_expires_at as string).toLocaleDateString("hu-HU")}`
        });
      } else if (project.managed_domain_name) {
        details.push({ label: "Domain", value: project.managed_domain_name as string });
      }

      if (payments?.length) {
        const total = payments.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
        const invoice = payments.find((row) => row.billingo_invoice_number)?.billingo_invoice_number;
        details.push({
          label: "Befizetés",
          value: `${formatHuf(total)} rendezve${invoice ? ` · számla: ${invoice}` : ""}`
        });
      }

      // Az előre fizető ügyfélnek a „meddig van kifizetve" a fontosabb adat:
      // a következő esedékesség önmagában riasztóan hangozhat, ha közben
      // hónapokra előre rendezte a díjat.
      if (project.prepaid_until) {
        details.push({
          label: "Kifizetve eddig",
          value: new Date(project.prepaid_until as string).toLocaleDateString("hu-HU")
        });
      }

      if (project.next_billing_at) {
        details.push({
          label: "Következő esedékesség",
          value: new Date(project.next_billing_at as string).toLocaleDateString("hu-HU")
        });
      }

      // ── Az elvégzett munka ────────────────────────────────────────────
      const workDone = Array.from(new Set(
        (changes ?? []).map((row) => CHANGE_LABELS[row.field_name as string]).filter(Boolean) as string[]
      ));

      const plan = subscriptionPlan(project.subscription_plan);
      const uptimeSentence = uptime && uptime.checks > 0 && uptime.uptime_percent !== null
        ? uptime.failures === 0
          ? `Az oldalad a hónap során ${uptime.checks} ellenőrzésből mindegyiken elérhető volt.`
          : `Az oldalad ${uptime.uptime_percent}%-ban volt elérhető; ${uptime.failures} alkalommal tapasztaltam fennakadást, ezeket kezeltem.`
        : "Az elérhetőség-ellenőrzés most indult el az oldaladon, a következő jelentésben már teljes hónapnyi mérés lesz benne.";

      const workSentence = workDone.length
        ? `\n\nAmi a hónapban történt az oldaladon:\n${workDone.map((item) => `· ${item}`).join("\n")}`
        : "";

      const result = await sendProjectEdgeEmail({
        to: email,
        subject: `Havi jelentés (${period.label}) · ${project.title}`,
        eyebrow: "PROJECTEDGE · HAVI JELENTÉS",
        preheader: uptime?.uptime_percent !== null && uptime?.uptime_percent !== undefined
          ? `${project.title}: ${uptime.uptime_percent}% rendelkezésre állás ${period.label} hónapban.`
          : `${project.title} havi összefoglalója.`,
        message: `Szia!\n\nItt a(z) „${project.title}" weboldalad ${period.label} havi összefoglalója.\n\n${uptimeSentence}${workSentence}\n\nHa változtatnál valamit az oldalon, az ügyfélkapun bármikor küldhetsz módosítási kérést — a ${plan.name} csomagodban ez benne van.`,
        link: "/ugyfelkapu/dashboard",
        linkLabel: "Megnyitás az ügyfélkapun",
        details,
        tags: ["Havi jelentés", "Menedzselt weboldal", "ProjectEdge"]
      });

      if (result.ok) {
        sent.push({ projectId: project.id as string, title: project.title as string, email });
        await admin.from("notifications").insert({
          user_id: project.user_id,
          title: `Havi jelentés (${period.label})`,
          message: uptime && uptime.uptime_percent !== null
            ? `A(z) „${project.title}" oldalad ${uptime.uptime_percent}%-os rendelkezésre állással működött.`
            : `Elkészült a(z) „${project.title}" havi összefoglalója.`,
          link: "/ugyfelkapu/dashboard"
        });
      } else {
        errors.push(`Projekt „${project.title}” (${email}): ${result.error}`);
      }
    }

    if (sent.length > 0 || errors.length > 0) {
      await admin.from("notifications").insert({
        user_id: null,
        title: `Havi jelentések kiküldve (${period.label})`,
        message: `Sikeres: ${sent.length} db.\nHibák: ${errors.length ? errors.join("; ") : "nincs"}.`,
        link: "/admin/dashboard"
      });
    }

    return NextResponse.json({
      month: period.label,
      sentCount: sent.length,
      sent,
      errors
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Monthly report failed", error);
    return NextResponse.json({ error: "A havi jelentések küldése sikertelen volt." }, { status: 500 });
  }
}

export const GET = runMonthlyReport;
export const POST = runMonthlyReport;
