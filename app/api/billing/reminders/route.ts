import { NextResponse } from "next/server";
import { BANK_TRANSFER_DETAILS } from "@/components/portal/format";
import { daysUntil, addBillingInterval } from "@/lib/onboarding";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { formatHuf } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * FIZETÉSI EMLÉKEZTETŐK — naponta egyszer.
 *
 * A kártyás ügyfelet a Stripe megkeresi, ha nem sikerül a terhelés. Az
 * utalásosnál viszont semmi nem történt: eljött a fordulónap, és ha az ügyfél
 * elfelejtette, arról senki nem szerzett tudomást — sem ő, sem én. A rendszer
 * azt sem tudta volna megmondani, ki van késésben.
 *
 * Három fokozat, és mindegyik MÁS hangnemben:
 *
 *   1. hét nappal előtte  — előrejelzés, nem sürgetés. Ez a leghasznosabb
 *                           levél: időben szól, és emiatt a másik kettőre a
 *                           legtöbb esetben soha nem kerül sor.
 *   2. az esedékesség napján — „ma esedékes", a banki adatokkal együtt.
 *   3. öt nappal utána    — késés. Itt kap jelzést az admin is, mert innentől
 *                           ez már nem emlékeztető kérdése, hanem beszélgetésé.
 *
 * Az idempotenciát a `reminder_stage` adja, nem a dátumszámítás: egy kétszer
 * lefutó vagy elakadt cron így sem küldhet kétszer ugyanolyan levelet.
 *
 * A KÁRTYÁS ügyfeleket kihagyjuk. Nekik a Stripe kezeli a fizetést és a
 * sikertelen terhelést is; egy párhuzamos emlékeztető tőlünk zavaró lenne, és
 * ellentmondhatna annak, amit a Stripe ír.
 */

const STAGE = { NONE: 0, UPCOMING: 1, DUE: 2, OVERDUE: 3 } as const;

/** Hány nappal előre szólunk, és hány nap türelem után jelezzük a késést. */
const NOTICE_DAYS = 7;
const OVERDUE_GRACE_DAYS = 5;

async function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return true;

  const user = await authenticatedUser(request);
  return Boolean(user && (await isAdminUser(request, user.id)));
}

type PendingPayment = {
  id: string;
  project_id: string;
  amount: number;
  due_date: string | null;
  payment_reference: string | null;
  reminder_stage: number;
  payment_method: string | null;
};

type AnniversaryProject = {
  id: string;
  title: string;
  user_id: string;
  contact_email: string | null;
  subscription_started_at: string | null;
  subscription_plan: string | null;
  anniversary_email_sent_at: string | null;
};

/**
 * Évfordulós összefoglaló az egy éve (vagy két, három éve) futó ügyfeleknek.
 *
 * Az idempotenciát az `anniversary_email_sent_at` adja: egy évfordulóhoz egy
 * levél, akkor is, ha a cron aznap kétszer fut. A dátumfeltétel önmagában erre
 * nem lenne elég.
 *
 * A levél CSAK mért adatot közöl — ugyanaz a szabály, mint a havi jelentésnél.
 * Amiről nincs adat, az kimarad, nem tölti ki egy jól hangzó mondat.
 */
async function sendAnniversaryEmails(
  admin: ReturnType<typeof createServerSupabaseAdminClient>,
  now: Date
) {
  const done: string[] = [];

  const { data: projects } = await admin
    .from("client_projects")
    .select("id,title,user_id,contact_email,subscription_started_at,subscription_plan,anniversary_email_sent_at")
    .eq("commercial_model", "subscription")
    .eq("subscription_status", "active")
    .not("subscription_started_at", "is", null)
    .returns<AnniversaryProject[]>();

  for (const project of projects ?? []) {
    const started = new Date(project.subscription_started_at as string);
    if (Number.isNaN(started.getTime())) continue;

    // Hány teljes év telt el, és mikor van a LEGKÖZELEBBI már elmúlt évforduló.
    let years = 0;
    let anniversary = started;
    while (true) {
      const next = addBillingInterval(started, "year", years + 1);
      if (next.getTime() > now.getTime()) break;
      years += 1;
      anniversary = next;
      if (years > 30) break;
    }
    if (years < 1) continue;

    // Az évforduló napján (vagy az azt követő három napon belül) küldünk.
    const sinceAnniversary = -daysUntil(anniversary, now);
    if (sinceAnniversary < 0 || sinceAnniversary > 3) continue;

    // Ment-e már levél ERRE az évfordulóra.
    if (project.anniversary_email_sent_at) {
      const lastSent = new Date(project.anniversary_email_sent_at);
      if (lastSent.getTime() >= anniversary.getTime()) continue;
    }

    const periodStart = addBillingInterval(started, "year", years - 1);

    const [{ data: uptime }, { count: changeCount }, { data: payments }] = await Promise.all([
      admin.rpc("site_uptime_summary", {
        target_project: project.id,
        period_start: periodStart.toISOString(),
        period_end: anniversary.toISOString()
      }).single<{ checks: number; uptime_percent: number | null }>(),
      admin.from("change_requests")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .gte("requested_at", periodStart.toISOString())
        .lt("requested_at", anniversary.toISOString()),
      admin.from("subscription_payments")
        .select("amount")
        .eq("project_id", project.id)
        .eq("status", "paid")
        .gte("paid_at", periodStart.toISOString())
        .lt("paid_at", anniversary.toISOString())
    ]);

    const details: Array<{ label: string; value: string }> = [
      { label: "Együtt", value: `${years} éve` }
    ];
    if (uptime && uptime.checks > 0 && uptime.uptime_percent !== null) {
      details.push({ label: "Rendelkezésre állás", value: `${uptime.uptime_percent}% (${uptime.checks} mérésből)` });
    }
    if (changeCount) details.push({ label: "Elvégzett módosítás", value: `${changeCount} db` });
    if (payments?.length) {
      details.push({
        label: "Befizetés az évben",
        value: formatHuf(payments.reduce((sum, row) => sum + Number(row.amount ?? 0), 0))
      });
    }

    if (project.contact_email) {
      await sendProjectEdgeEmail({
        to: project.contact_email,
        subject: `${years} éve dolgozunk együtt · ${project.title}`,
        eyebrow: "PROJECTEDGE · ÉVFORDULÓ",
        message: `Szia!\n\nMa ${years} éve, hogy a(z) „${project.title}" weboldalad nálam van. Gondoltam, elszámolok róla, mi történt ebben az évben — nem kérek semmit, csak jó, ha látod.\n\nHa bármi változott a vállalkozásodban, és emiatt az oldalon is változtatnál, írj vissza erre a levélre.`,
        link: "/ugyfelkapu/dashboard",
        linkLabel: "Ügyfélkapu megnyitása",
        details,
        tags: ["Évforduló", "Menedzselt weboldal"]
      });
    }

    await admin.from("client_projects")
      .update({ anniversary_email_sent_at: now.toISOString() })
      .eq("id", project.id);

    done.push(`${project.title} (${years} év)`);
  }

  return done;
}

async function runReminders(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  }

  const admin = createServerSupabaseAdminClient();
  const now = new Date();
  const sent: Array<{ project: string; stage: string }> = [];
  const overdue: string[] = [];
  const errors: string[] = [];

  try {
    // Csak a belátható jövő és a közelmúlt érdekel: ami két hónapnál régebben
    // esedékes és még mindig nyitott, az nem emlékeztető kérdése.
    const horizon = new Date(now.getTime() + NOTICE_DAYS * 86_400_000);
    const floor = new Date(now.getTime() - 60 * 86_400_000);

    const { data: payments, error } = await admin
      .from("subscription_payments")
      .select("id,project_id,amount,due_date,payment_reference,reminder_stage,payment_method")
      .eq("status", "pending")
      .gte("due_date", floor.toISOString())
      .lte("due_date", horizon.toISOString())
      .order("due_date", { ascending: true })
      .returns<PendingPayment[]>();
    if (error) throw error;

    for (const payment of payments ?? []) {
      if (!payment.due_date) continue;
      // A Stripe-os ügyfelek dunningját a Stripe végzi.
      if (payment.payment_method === "stripe") continue;

      const due = new Date(payment.due_date);
      const days = daysUntil(due, now);

      // Melyik fokozat esedékes MOST. A `reminder_stage` miatt egy fokozat
      // csak egyszer futhat le, és visszafelé soha nem lépünk.
      let stage: number = STAGE.NONE;
      if (days <= -OVERDUE_GRACE_DAYS) stage = STAGE.OVERDUE;
      else if (days <= 0) stage = STAGE.DUE;
      else if (days <= NOTICE_DAYS) stage = STAGE.UPCOMING;

      if (stage === STAGE.NONE || stage <= payment.reminder_stage) continue;

      const { data: project } = await admin
        .from("client_projects")
        .select("id,title,user_id,contact_email,subscription_status,billing_interval")
        .eq("id", payment.project_id)
        .maybeSingle();
      if (!project) continue;

      const email = project.contact_email as string | null;
      const reference = payment.payment_reference ?? `PE-${String(project.id).slice(0, 8).toUpperCase()}`;
      const amount = formatHuf(Number(payment.amount ?? 0));
      const dueLabel = due.toLocaleDateString("hu-HU");

      const copy = stage === STAGE.UPCOMING
        ? {
            subject: `Esedékes fizetés ${dueLabel}-n · ${project.title}`,
            title: "Közeledik a fordulónapod",
            message: `Szia!\n\nA(z) „${project.title}" weboldalad következő szolgáltatási díja ${dueLabel}-n esedékes. Csak hogy időben tudj róla — nincs teendőd, amíg az esedékesség el nem jön.\n\nAz utaláshoz szükséges adatokat alább találod. A közlemény pontos megadása azért fontos, hogy a befizetésed azonnal a te előfizetésedhez kerüljön.`
          }
        : stage === STAGE.DUE
          ? {
              subject: `Ma esedékes a díj · ${project.title}`,
              title: "Ma esedékes",
              message: `Szia!\n\nA(z) „${project.title}" weboldalad szolgáltatási díja ma esedékes. Ha már elutaltad, ezt a levelet hagyd figyelmen kívül — a beérkezés után automatikusan küldöm a számlát.`
            }
          : {
              subject: `Elmaradt befizetés · ${project.title}`,
              title: "Nem érkezett meg a befizetés",
              message: `Szia!\n\nA(z) „${project.title}" weboldalad ${dueLabel}-n esedékes díja még nem érkezett meg. A weboldalad természetesen működik — ez csak egy jelzés, hátha elkerülte a figyelmedet.\n\nHa bármi közbejött, vagy máskor lenne kényelmesebb fizetned, írj vissza erre a levélre, és megbeszéljük.`
            };

      if (email) {
        const result = await sendProjectEdgeEmail({
          to: email,
          subject: copy.subject,
          eyebrow: "PROJECTEDGE · FIZETÉS",
          message: copy.message,
          link: "/ugyfelkapu/dashboard",
          linkLabel: "Fizetési adatok az ügyfélkapun",
          details: [
            { label: "Összeg", value: amount },
            { label: "Esedékesség", value: dueLabel },
            { label: "Kedvezményezett", value: BANK_TRANSFER_DETAILS.name },
            { label: "Számlaszám", value: BANK_TRANSFER_DETAILS.accountNumber },
            { label: "Közlemény", value: reference }
          ],
          tags: ["Fizetés", "Menedzselt weboldal"]
        });
        if (!result.ok) errors.push(`${project.title}: ${result.error}`);
      } else {
        errors.push(`${project.title}: nincs email cím, csak értesítés ment.`);
      }

      await admin.from("notifications").insert({
        user_id: project.user_id,
        title: copy.title,
        message: `${amount} · esedékesség: ${dueLabel} · közlemény: ${reference}`,
        link: "/ugyfelkapu/dashboard"
      });

      await admin.from("subscription_payments").update({
        reminder_stage: stage,
        reminder_sent_at: now.toISOString(),
        updated_at: now.toISOString()
      }).eq("id", payment.id);

      // ── Késés: az adminnak is szólni kell ───────────────────────────────
      //
      // A `past_due` állapot NEM kapcsolja le a szolgáltatást. Csak jelzés az
      // admin felületén, hogy ez az ügyfél beszélgetést kíván — a weboldal
      // lekapcsolása mindig emberi döntés marad.
      if (stage === STAGE.OVERDUE) {
        overdue.push(project.title as string);
        await admin.from("notifications").insert({
          user_id: null,
          title: `Elmaradt befizetés: ${project.title}`,
          message: `${amount} nem érkezett meg (esedékesség: ${dueLabel}, közlemény: ${reference}). Az ügyfél megkapta a jelzést. Érdemes felhívni.`,
          link: "/admin/dashboard"
        });

        if (project.subscription_status === "active") {
          await admin.from("client_projects")
            .update({ subscription_status: "past_due" })
            .eq("id", project.id);
        }
      }

      sent.push({
        project: project.title as string,
        stage: stage === STAGE.UPCOMING ? "előzetes" : stage === STAGE.DUE ? "esedékes" : "késés"
      });
    }

    // ── Évfordulós levél ────────────────────────────────────────────────
    //
    // Egy havidíjas szolgáltatásnál az egyéves pont az, ahol az ügyfél fejben
    // újraértékeli, hogy megéri-e. Ha ekkor kap egy összefoglalót arról, mi
    // történt az évben, akkor tényekből dönt — nem abból az érzésből, hogy
    // „megy magától, minek fizetek". Ez a levél nem kér semmit; csak elszámol.
    const anniversaries = await sendAnniversaryEmails(admin, now);

    return NextResponse.json({
      sentCount: sent.length,
      sent,
      overdue,
      anniversaries,
      errors
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Payment reminders failed", error);
    return NextResponse.json({ error: "A fizetési emlékeztetők futtatása sikertelen." }, { status: 500 });
  }
}

export const GET = runReminders;
export const POST = runReminders;
