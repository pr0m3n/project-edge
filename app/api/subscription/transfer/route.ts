import { NextResponse } from "next/server";
import { BANK_TRANSFER_DETAILS } from "@/components/portal/format";
import { checkRateLimit, isUuid, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { addBillingInterval, agreedAmountFor, paymentReference } from "@/lib/onboarding";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { authenticatedUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient, createServerSupabaseUserClient } from "@/lib/supabase/server";
import { billingTerm, formatHuf, subscriptionPlan, termTotal } from "@/lib/subscriptions";

export const runtime = "nodejs";

/**
 * ELŐFIZETÉS INDÍTÁSA ÉS RENDEZÉSE BANKI ÁTUTALÁSSAL.
 *
 * Eddig a weboldalon keresztül érkező ügyfélnek egyetlen útja volt: Stripe,
 * bankkártya, havi automatikus terhelés. Aki utalni akart — és sok
 * kisvállalkozás pont így szeret fizetni —, annak nem volt hova kattintania.
 *
 * Miért csak egy hónapnál hosszabb futamidőnél: a havi utalás évente tizenkét
 * kézi egyeztetést jelentene a bankszámlán, és minden egyes alkalom egy
 * lehetőség arra, hogy valami elcsússzon. Fél- vagy egyéves ciklusnál ez egy-két
 * alkalom, ami kezelhető.
 *
 * Két művelet:
 *
 *   `start`    — létrehozza a várt befizetést a választott futamidőre, és
 *                visszaadja az utalási adatokat a közleménnyel együtt.
 *   `reported` — az ügyfél jelzi, hogy elutalta. Ettől kerül a sor `reported`
 *                állapotba, és ettől jelenik meg az adminnál teendőként.
 *
 * A bejelentés NEM fizetettre állítja: a beérkezést továbbra is az admin
 * igazolja a bankszámlán. Az ügyfél állítása nem bizonyíték, és nem is
 * kérjük tőle, hogy az legyen — csak jelzés, hogy érdemes megnézni.
 */

type Payload = {
  projectId?: unknown;
  action?: unknown;
  /** `start`-nál: melyik futamidőt választotta. */
  term?: unknown;
  /** `reported`-nél: melyik várt befizetést utalta el. */
  paymentId?: unknown;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "subscription-transfer", 20, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const user = await authenticatedUser(request);
  if (!user) return bad("Érvénytelen vagy lejárt munkamenet.", 401);

  const accessToken = request.headers.get("authorization")?.slice("Bearer ".length).trim();
  if (!accessToken) return bad("Érvénytelen vagy lejárt munkamenet.", 401);

  const parsed = await readJsonBody<Payload>(request, 4_000);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!isUuid(projectId)) return bad("Érvénytelen projektazonosító.");

  // A projektet a felhasználó SAJÁT jogosultságával olvassuk: az RLS dönti el,
  // hogy hozzáférhet-e, nem a route kódja.
  const userClient = createServerSupabaseUserClient(accessToken);
  const { data: project, error: projectError } = await userClient
    .from("client_projects")
    .select("id,user_id,title,contact_email,commercial_model,subscription_plan,monthly_price,billing_amount,billing_period_months,billing_interval,subscription_status,contract_accepted,next_billing_at")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    console.error("Transfer project lookup failed", { code: projectError.code });
    return bad("A projekt adatai most nem tölthetők be.", 500);
  }
  if (!project) return bad("A projekt nem található, vagy nincs hozzáférésed.", 404);
  if (project.user_id !== user.id) return bad("Ehhez a projekthez nincs hozzáférésed.", 403);
  if (project.commercial_model !== "subscription") {
    return bad("Ez a művelet csak menedzselt előfizetéshez érhető el.", 409);
  }

  const db = createServerSupabaseAdminClient();
  const plan = subscriptionPlan(project.subscription_plan);
  const monthlyPrice = Number(project.monthly_price ?? plan.price);

  try {
    // ── Az utalás bejelentése ────────────────────────────────────────────
    if (body.action === "reported") {
      const paymentId = typeof body.paymentId === "string" ? body.paymentId : "";
      if (!isUuid(paymentId)) return bad("Érvénytelen befizetés-azonosító.");

      const { data: payment, error } = await db.from("subscription_payments")
        .update({ status: "reported", transfer_reported_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", paymentId)
        .eq("project_id", project.id)
        .eq("status", "pending")
        .select("id,amount,payment_reference")
        .maybeSingle();
      if (error) throw error;
      if (!payment) return bad("Ez a befizetés már nincs nyitott állapotban.", 409);

      await db.from("notifications").insert({
        user_id: null,
        title: `Bejelentett utalás: ${project.title}`,
        message: `${formatHuf(Number(payment.amount))} · közlemény: ${payment.payment_reference}. Ellenőrizd a bankszámlán, és rögzítsd a befizetést.`,
        link: "/admin/dashboard"
      });

      // Az adminnak emailben is szólunk: a portál értesítése csak akkor
      // látszik, ha épp be van jelentkezve, a beérkező utalás viszont nem vár.
      const notifyAddress = process.env.RESEND_NOTIFICATION_EMAIL || process.env.RESEND_REPLY_TO;
      if (notifyAddress) {
        await sendProjectEdgeEmail({
          to: notifyAddress,
          subject: `Bejelentett utalás · ${project.title}`,
          eyebrow: "PROJECTEDGE · TEENDŐ",
          message: `${project.contact_email ?? "Az ügyfél"} jelezte, hogy elutalta a szolgáltatási díjat.\n\nEllenőrizd a bankszámlán, és ha megérkezett, rögzítsd az adminban — onnan megy a számla és az ügyfél visszaigazolása.`,
          link: "/admin/dashboard",
          linkLabel: "Admin megnyitása",
          details: [
            { label: "Projekt", value: project.title as string },
            { label: "Összeg", value: formatHuf(Number(payment.amount)) },
            { label: "Közlemény", value: payment.payment_reference as string }
          ],
          replyTo: (project.contact_email as string | null) ?? undefined,
          tags: ["Utalás", "Teendő"]
        });
      }

      return NextResponse.json({ ok: true, status: "reported" }, { headers: { "Cache-Control": "no-store" } });
    }

    // ── Indítás: a várt befizetés létrehozása ────────────────────────────
    if (!project.contract_accepted) {
      return bad("Előbb fogadd el a szolgáltatási megállapodást.", 409);
    }

    const term = billingTerm(typeof body.term === "string" ? body.term : null);
    if (!term.allowsTransfer) {
      return bad("Banki átutalás féléves vagy éves fizetésnél választható. Havi díjnál a bankkártyás fizetés az elérhető mód.", 409);
    }

    // Az alkudott ciklusdíj felülírja a nyilvános ajánlatot; ha nincs, a
    // futamidő szerinti ár érvényes (az éves ennyivel kedvezményes).
    const amount = agreedAmountFor(project, term.months) ?? termTotal(monthlyPrice, term);

    const now = new Date();
    const dueDate = project.next_billing_at ? new Date(project.next_billing_at as string) : now;
    const periodStart = dueDate.getTime() > now.getTime() ? dueDate : now;
    const reference = paymentReference(project.id, periodStart);

    // Ha már van nyitott várt befizetés, azt használjuk — ne szülessen minden
    // kattintásra újabb sor ugyanarra az időszakra.
    const { data: existing } = await db.from("subscription_payments")
      .select("id,status,amount,payment_reference")
      .eq("project_id", project.id)
      .in("status", ["pending", "reported"])
      .order("due_date", { ascending: true })
      .limit(1)
      .maybeSingle();

    let paymentId = existing?.id as string | undefined;

    if (existing) {
      await db.from("subscription_payments").update({
        amount,
        payment_method: "bank_transfer",
        billing_period_start: periodStart.toISOString(),
        billing_period_end: addBillingInterval(periodStart, "month", term.months).toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", existing.id);
    } else {
      const { data: created, error } = await db.from("subscription_payments").insert({
        project_id: project.id,
        billing_period_start: periodStart.toISOString(),
        billing_period_end: addBillingInterval(periodStart, "month", term.months).toISOString(),
        amount,
        currency: "HUF",
        status: "pending",
        payment_method: "bank_transfer",
        payment_reference: reference,
        due_date: periodStart.toISOString(),
        note: `${term.label} fizetés, banki átutalással.`
      }).select("id").single();
      if (error) throw error;
      paymentId = created.id as string;
    }

    // A projekt megjegyzi a választott futamidőt és fizetési módot, hogy a
    // megújulás, az emlékeztető és a számla is ehhez igazodjon.
    await db.from("client_projects").update({
      billing_period_months: term.months,
      billing_interval: term.months >= 12 ? "year" : "month",
      payment_method: "bank_transfer",
      subscription_status: project.subscription_status === "active" ? "active" : "first_payment_pending"
    }).eq("id", project.id);

    return NextResponse.json({
      ok: true,
      paymentId,
      amount,
      term: term.key,
      months: term.months,
      reference: (existing?.payment_reference as string | undefined) ?? reference,
      bank: {
        name: BANK_TRANSFER_DETAILS.name,
        accountNumber: BANK_TRANSFER_DETAILS.accountNumber,
        iban: BANK_TRANSFER_DETAILS.iban
      }
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Subscription transfer failed", error);
    return bad("A művelet most nem hajtható végre. Próbáld újra rövidesen.", 500);
  }
}
