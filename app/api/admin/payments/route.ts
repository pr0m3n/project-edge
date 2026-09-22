import { NextResponse } from "next/server";
import { checkRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { cleanText, parseDate, parsePrice } from "@/lib/admin-clients";
import { missingBillingFields } from "@/lib/billingo";
import { addBillingInterval, billingIntervalLabel, cycleAmount, paymentReference, projectCycleMonths } from "@/lib/onboarding";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { billingPartyForUser, issueSubscriptionInvoice } from "@/lib/subscription-invoice";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { formatHuf, subscriptionPlan } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * UTALÁSOS BEFIZETÉS RÖGZÍTÉSE.
 *
 * A kártyás fizetést a Stripe webhookja könyveli le magától. Az utalásnál
 * viszont nincs, ami szóljon: a pénz megérkezik a bankszámlára, és onnantól
 * kizárólag az admin tudja, hogy megjött. Enélkül a rendszerben az ügyfél
 * örökre fizetetlen maradna, a fizetési emlékeztető pedig újra és újra
 * kiment volna neki — annak ellenére, hogy rendezte.
 *
 * Amit egyetlen hívásban elintéz:
 *
 *   1. a várt (`pending`) befizetés sorát `paid`-re állítja — vagy újat hoz
 *      létre, ha nincs ilyen (pl. előre fizetett egy extra hónapot),
 *   2. a projekten előrébb viszi a `prepaid_until` és `next_billing_at`
 *      dátumot a ciklusnak megfelelően,
 *   3. létrehozza a KÖVETKEZŐ várt befizetést, hogy az emlékeztetőnek legyen
 *      mire épülnie,
 *   4. kiállítja az AAM-számlát a Billingóban, és elküldi az ügyfélnek,
 *   5. értesíti az ügyfelet az ügyfélkapun és emailben.
 *
 * A számlázás hibája NEM bukja meg a rögzítést: a pénz akkor is beérkezett.
 * A hiba a sorba kerül, és az admin felületén a „Kiszámlázatlan befizetések"
 * kártyán jelenik meg, ahonnan egy gombbal újrapróbálható.
 */

type Payload = {
  projectId?: unknown;
  /** Melyik várt befizetéshez tartozik. Hiányában a legközelebbi esedékes. */
  paymentId?: unknown;
  amount?: unknown;
  periods?: unknown;
  paidAt?: unknown;
  reference?: unknown;
  note?: unknown;
  /** Alapértelmezésben igen. Akkor kapcsold ki, ha kézzel számláztál. */
  issueInvoice?: unknown;
  /** Alapértelmezésben igen: az ügyfél kapjon értesítést és emailt. */
  notifyClient?: unknown;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "admin-record-payment", 30, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const admin = await authenticatedUser(request);
  if (!admin) return bad("Érvénytelen vagy lejárt munkamenet.", 401);
  if (!(await isAdminUser(request, admin.id))) return bad("Nincs admin jogosultság.", 403);

  const parsed = await readJsonBody<Payload>(request, 8_000);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!isUuid(projectId)) return bad("Érvénytelen projektazonosító.");

  const paidAt = parseDate(body.paidAt) ?? new Date();
  if (paidAt.getTime() > Date.now() + 86_400_000) return bad("A fizetés dátuma nem lehet a jövőben.");

  const issueInvoice = body.issueInvoice !== false;
  const notifyClient = body.notifyClient !== false;

  const db = createServerSupabaseAdminClient();

  try {
    const { data: project, error: projectError } = await db.from("client_projects")
      .select("id,user_id,title,contact_email,commercial_model,subscription_plan,monthly_price,billing_amount,billing_interval,billing_period_months,next_billing_at,prepaid_until")
      .eq("id", projectId).maybeSingle();
    if (projectError) throw projectError;
    if (!project) return bad("A projekt nem található.", 404);
    if (project.commercial_model !== "subscription") {
      return bad("Befizetés csak menedzselt előfizetéshez rögzíthető.", 409);
    }

    // A ciklus hónapban: a féléves ügyfél `billing_interval`-ja „month", tehát
    // abból egy hónap múlva újra esedékes lenne.
    const interval = projectCycleMonths(project);
    const plan = subscriptionPlan(project.subscription_plan);
    // Hány ciklust fedez ez a befizetés. Egy utalás nem feltétlenül egy hónap:
    // az ügyfél fizethet fél évet vagy két évet is egyben.
    const rawPeriods = Number(body.periods);
    const periods = Number.isSafeInteger(rawPeriods) && rawPeriods >= 1 && rawPeriods <= 120 ? rawPeriods : 1;

    const priced = {
      monthlyPrice: Number(project.monthly_price ?? plan.price),
      interval,
      agreed: project.billing_amount as number | null
    };
    const nextCycleAmount = cycleAmount(priced);
    const defaultAmount = cycleAmount({ ...priced, periods });
    const amount = parsePrice(body.amount) ?? defaultAmount;

    // ── A befizetés sora ─────────────────────────────────────────────────
    let paymentId = typeof body.paymentId === "string" && isUuid(body.paymentId) ? body.paymentId : null;
    let dueDate: Date;

    if (paymentId) {
      const { data: row, error } = await db.from("subscription_payments")
        .select("id,project_id,status,due_date").eq("id", paymentId).maybeSingle();
      if (error) throw error;
      if (!row || row.project_id !== project.id) return bad("A megadott befizetés nem ehhez a projekthez tartozik.", 404);
      if (row.status === "paid") return bad("Ez a befizetés már rendezve van.", 409);
      dueDate = row.due_date ? new Date(row.due_date as string) : paidAt;
    } else {
      const { data: pending } = await db.from("subscription_payments")
        .select("id,due_date").eq("project_id", project.id).eq("status", "pending")
        .order("due_date", { ascending: true }).limit(1).maybeSingle();

      if (pending) {
        paymentId = pending.id as string;
        dueDate = pending.due_date ? new Date(pending.due_date as string) : paidAt;
      } else {
        // Nincs nyitott várt befizetés — az esedékesség a projekt fordulónapja,
        // vagy ha az sincs, maga a fizetés napja.
        dueDate = project.next_billing_at ? new Date(project.next_billing_at as string) : paidAt;
        const { data: created, error } = await db.from("subscription_payments").insert({
          project_id: project.id,
          billing_period_start: dueDate.toISOString(),
          billing_period_end: addBillingInterval(dueDate, interval, 1).toISOString(),
          amount,
          currency: "HUF",
          status: "pending",
          payment_method: "bank_transfer",
          payment_reference: paymentReference(project.id, dueDate),
          due_date: dueDate.toISOString(),
          recorded_by: admin.id
        }).select("id").single();
        if (error) throw error;
        paymentId = created.id as string;
      }
    }

    // Az időszak az ESEDÉKESSÉGTŐL számít, nem a beérkezés napjától: a pár
    // napos utalási csúszás nem tolhatja el a fordulónapot hónapról hónapra.
    const periodEnd = addBillingInterval(dueDate, interval, periods);

    const { error: updateError } = await db.from("subscription_payments").update({
      status: "paid",
      amount,
      payment_method: "bank_transfer",
      paid_at: paidAt.toISOString(),
      billing_period_start: dueDate.toISOString(),
      billing_period_end: periodEnd.toISOString(),
      payment_reference: cleanText(body.reference, 80) ?? paymentReference(project.id, dueDate),
      note: cleanText(body.note, 500) ?? "Kézzel rögzített banki átutalás.",
      recorded_by: admin.id,
      updated_at: new Date().toISOString()
    }).eq("id", paymentId).neq("status", "paid");
    if (updateError) throw updateError;

    // ── A projekt előreléptetése ─────────────────────────────────────────
    await db.from("client_projects").update({
      subscription_status: "active",
      payment_status: "deposit_paid",
      prepaid_until: periodEnd.toISOString(),
      next_billing_at: periodEnd.toISOString(),
      payment_method: "bank_transfer"
    }).eq("id", project.id);

    // ── A következő várt befizetés ───────────────────────────────────────
    //
    // A `pending` sor nem könyvelési tétel: ez az, amiből a fizetési
    // emlékeztető dolgozik. Ha nem születne meg, az ügyfél a következő
    // fordulónál semmilyen jelzést nem kapna.
    const { data: nextPending } = await db.from("subscription_payments")
      .select("id").eq("project_id", project.id).eq("status", "pending").limit(1).maybeSingle();

    if (!nextPending) {
      await db.from("subscription_payments").insert({
        project_id: project.id,
        billing_period_start: periodEnd.toISOString(),
        billing_period_end: addBillingInterval(periodEnd, interval, 1).toISOString(),
        amount: nextCycleAmount,
        currency: "HUF",
        status: "pending",
        payment_method: "bank_transfer",
        payment_reference: paymentReference(project.id, periodEnd),
        due_date: periodEnd.toISOString(),
        note: "Várt befizetés — a fizetési emlékeztető ebből dolgozik.",
        recorded_by: admin.id
      });
    }

    // ── Számla ───────────────────────────────────────────────────────────
    let invoice: { ok: boolean; message: string } = { ok: false, message: "Számlázás kihagyva." };

    if (issueInvoice) {
      const party = await billingPartyForUser(project.user_id as string);
      const missing = party ? missingBillingFields(party) : ["minden"];

      if (!party || missing.length) {
        invoice = {
          ok: false,
          message: `A számla nem készült el — hiányzó számlázási adat: ${missing.join(", ")}. Töltsd ki az ügyfél adatlapján, aztán a „Kiszámlázatlan befizetések" kártyáról újrapróbálható.`
        };
        await db.from("subscription_payments")
          .update({ billingo_error: invoice.message, updated_at: new Date().toISOString() })
          .eq("id", paymentId);
      } else {
        const result = await issueSubscriptionInvoice({
          paymentId,
          projectTitle: project.title,
          planName: plan.name,
          amount,
          paidAt,
          party,
          reference: `transfer-${paymentId}`,
          interval,
          paymentMethod: "wire_transfer",
          comment: `Banki átutalás. Hivatkozás: ${cleanText(body.reference, 80) ?? paymentReference(project.id, dueDate)}`
        });
        invoice = result.skipped
          ? { ok: false, message: result.reason }
          : { ok: true, message: `Számla kiállítva: ${result.invoiceNumber ?? result.id}` };
      }
    }

    // ── Értesítés ────────────────────────────────────────────────────────
    if (notifyClient) {
      await db.from("notifications").insert({
        user_id: project.user_id,
        title: "Megérkezett a befizetésed",
        message: `A(z) „${project.title}” ${billingIntervalLabel(interval)} díja (${formatHuf(amount)}) beérkezett. A következő esedékesség: ${periodEnd.toLocaleDateString("hu-HU")}.`,
        link: "/ugyfelkapu/dashboard"
      });

      if (project.contact_email) {
        await sendProjectEdgeEmail({
          to: project.contact_email,
          subject: "Megérkezett a befizetésed",
          eyebrow: "PROJECTEDGE · BEFIZETÉS",
          message: `Az utalásod megérkezett, a(z) „${project.title}” weboldalad szolgáltatási díja rendezve. Köszönöm!`,
          link: "/ugyfelkapu/dashboard",
          linkLabel: "Fizetési előzmény megnyitása",
          details: [
            { label: "Összeg", value: formatHuf(amount) },
            { label: "Fizetési mód", value: "Banki átutalás" },
            { label: "Következő esedékesség", value: periodEnd.toLocaleDateString("hu-HU") }
          ],
          tags: ["Befizetés", "Menedzselt weboldal"]
        });
      }
    }

    return NextResponse.json({
      ok: true,
      paymentId,
      amount,
      nextBillingAt: periodEnd.toISOString(),
      invoice
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin payment recording failed", error);
    return bad(error instanceof Error ? error.message : "A befizetés rögzítése nem sikerült.", 500);
  }
}
