import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import {
  cleanText,
  findAuthUserByEmail,
  isValidEmail,
  normalizeEmail,
  normalizeUrl,
  parseDate,
  parsePrice
} from "@/lib/admin-clients";
import { cycleAmount, onboardingSchedule, paymentReference, type BillingInterval } from "@/lib/onboarding";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { formatHuf, purchaseOptionPrice, subscriptionPlan } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * KÉZI ÜGYFÉLFELVÉTEL.
 *
 * Miért kell egyáltalán: a rendszerbe eddig egyetlen úton lehetett bekerülni —
 * a látogató regisztrált az ügyfélkapun, kitöltötte a projektindító adatlapot,
 * és abból született a `client_projects` sora. Ez pontosan azt az ügyfelet
 * zárta ki, aki ténylegesen fizet: aki hideg emailre válaszolt, telefonon
 * egyeztetett, és utalt. A megállapodás offline született, a rendszer viszont
 * csak a saját űrlapján keresztül tudott ügyfelet felvenni.
 *
 * Ez a végpont NÉGY dolgot csinál egyetlen hívásban, mert külön-külön
 * elvégezve mindig marad félkész állapot (fiók projekt nélkül, projekt
 * befizetés nélkül):
 *
 *   1. `auth.users` — meghívó vagy meglévő fiók megkeresése,
 *   2. `client_profiles` — név, telefon, számlázási adat, marketing döntés,
 *   3. `client_projects` — aktív, menedzselt előfizetés `launched` státuszban,
 *   4. `subscription_payments` — a már megtörtént befizetés és a következő
 *      esedékesség.
 *
 * A `launched` státusz nem önkényes: az ügyfélkapu ettől (és a `subscription`
 * kereskedelmi modelltől) teszi ki a `ManagedWebsitePanel`-t, vagyis ettől
 * látja az ügyfél a csomagját, a következő fizetését és a módosítási keretét.
 * Aki kézzel kerül be, annak a weboldala már él — nincs mit végigkattintania
 * a projektindító folyamaton.
 *
 * SZOLGÁLTATÓI KULCCSAL fut, mert `auth.users`-t ír. A jogosultságot a hívó
 * saját tokenje dönti el (`isAdminUser`), nem a service role megléte.
 */

type Payload = {
  email?: unknown;
  fullName?: unknown;
  company?: unknown;
  phone?: unknown;
  projectTitle?: unknown;
  subscriptionPlan?: unknown;
  monthlyPrice?: unknown;
  billingInterval?: unknown;
  billingAmount?: unknown;
  paymentMethod?: unknown;
  origin?: unknown;
  startedAt?: unknown;
  lastPaymentAt?: unknown;
  recordPayment?: unknown;
  prepaidPeriods?: unknown;
  paymentReference?: unknown;
  domain?: unknown;
  liveUrl?: unknown;
  adminNotes?: unknown;
  marketingOptIn?: unknown;
  sendInvite?: unknown;
  billing?: {
    name?: unknown;
    taxNumber?: unknown;
    country?: unknown;
    postalCode?: unknown;
    city?: unknown;
    address?: unknown;
  };
};

const PLAN_KEYS = ["presence", "business", "custom"] as const;
const ORIGINS = ["manual", "cold_email"] as const;

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const rate = checkRateLimit(request, "admin-create-client", 20, 60_000);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const admin = await authenticatedUser(request);
  if (!admin) return bad("Érvénytelen vagy lejárt munkamenet.", 401);
  if (!(await isAdminUser(request, admin.id))) return bad("Nincs admin jogosultság.", 403);

  const parsed = await readJsonBody<Payload>(request, 32_000);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  // ── Bemenet ellenőrzése ────────────────────────────────────────────────
  const email = normalizeEmail(body.email);
  if (!isValidEmail(email)) return bad("Érvénytelen email cím.");

  const fullName = cleanText(body.fullName, 120);
  if (!fullName) return bad("A kapcsolattartó neve kötelező.");

  const projectTitle = cleanText(body.projectTitle, 120);
  if (!projectTitle) return bad("A projekt megnevezése kötelező.");

  const planKey = typeof body.subscriptionPlan === "string" && (PLAN_KEYS as readonly string[]).includes(body.subscriptionPlan)
    ? body.subscriptionPlan as (typeof PLAN_KEYS)[number]
    : null;
  if (!planKey) return bad("Érvénytelen csomag.");

  const monthlyPrice = parsePrice(body.monthlyPrice);
  if (monthlyPrice === null) return bad("A havidíjnak 1 000 és 10 000 000 Ft között kell lennie.");

  const billingInterval: BillingInterval = body.billingInterval === "year" ? "year" : "month";
  // Az ügyfelenként alkudott ciklusdíj. Ha nincs megadva, a listaár érvényes.
  const billingAmount = parsePrice(body.billingAmount);
  const paymentMethod = body.paymentMethod === "stripe" ? "stripe" : "bank_transfer";
  const origin = typeof body.origin === "string" && (ORIGINS as readonly string[]).includes(body.origin)
    ? body.origin as (typeof ORIGINS)[number]
    : "manual";

  const startedAt = parseDate(body.startedAt);
  if (!startedAt) return bad("A szolgáltatás kezdetének dátuma kötelező.");
  if (startedAt.getTime() > Date.now() + 86_400_000) return bad("A kezdés dátuma nem lehet a jövőben.");

  const lastPaymentAt = parseDate(body.lastPaymentAt);
  const recordPayment = body.recordPayment !== false;
  const liveUrl = normalizeUrl(body.liveUrl);
  const domain = cleanText(body.domain, 253);
  const marketingOptIn = body.marketingOptIn === true;
  const sendInvite = body.sendInvite !== false;

  // Hány ciklust fizetett ki egyben. Van, aki két évet utal át, és van, aki
  // három hónapot — a rendszer korábban mindkettőt egyetlen ciklusnak vette,
  // tehát a következő esedékességet jóval korábbra tette, és fizetési
  // emlékeztetőt küldött volna egy már kifizetett ügyfélnek.
  const rawPeriods = Number(body.prepaidPeriods);
  const prepaidPeriods = Number.isSafeInteger(rawPeriods) && rawPeriods >= 1 && rawPeriods <= 120
    ? rawPeriods
    : 1;

  let schedule;
  try {
    schedule = onboardingSchedule({ startedAt, lastPaymentAt, interval: billingInterval, periods: prepaidPeriods });
  } catch {
    return bad("A megadott dátumokból nem számolható ki a fordulónap.");
  }

  const db = createServerSupabaseAdminClient();

  try {
    // ── 1. Fiók: meglévő megkeresése, vagy meghívó ───────────────────────
    //
    // A meghívó a Supabase saját (magyar nyelvű) sablonjával megy ki, és a
    // címzett ezzel állít magának jelszót. Ha az admin most nem akar levelet
    // küldeni (mert pl. előbb telefonál), a fiók megerősítve jön létre, és a
    // meghívó később külön küldhető.
    let account = await findAuthUserByEmail(db, email);
    let invited = false;

    if (!account) {
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.projectedge.hu").replace(/\/$/, "");

      if (sendInvite) {
        const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo: `${siteUrl}/ugyfelkapu`
        });
        if (error) throw new Error(`A meghívó kiküldése nem sikerült: ${error.message}`);
        account = data.user;
        invited = true;
      } else {
        const { data, error } = await db.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { full_name: fullName }
        });
        if (error) throw new Error(`A fiók létrehozása nem sikerült: ${error.message}`);
        account = data.user;
      }
    }

    if (!account) return bad("A fiók nem hozható létre.", 500);

    // ── 2. Dupla felvétel elleni védelem ─────────────────────────────────
    //
    // Nem néma összevonás és nem is vak beszúrás: ha ennek az ügyfélnek már
    // fut előfizetése, azt meg kell nyitni, nem újat nyitni mellé. A csendes
    // duplikátum pont az a hiba, amit egy ügyfélnyilvántartásban a legnehezebb
    // észrevenni, és hónapokkal később derül ki — két számlázási fordulónappal.
    const { data: ownProjects, error: existingError } = await db
      .from("client_projects")
      .select("id,title,subscription_status")
      .eq("user_id", account.id)
      .eq("commercial_model", "subscription");
    if (existingError) throw existingError;

    // A szűrés szándékosan itt fut, nem a lekérdezésben: SQL-ben a
    // `subscription_status not in ('cancelled')` a NULL értékű sorokat is
    // kidobná (NULL NOT IN (…) → NULL), tehát pont a félkész előfizetéseket
    // nem venné észre — azokat, amik miatt a védelem egyáltalán kell.
    const existing = (ownProjects ?? []).find((row) => row.subscription_status !== "cancelled");

    if (existing) {
      return NextResponse.json({
        error: `Ehhez az ügyfélhez már tartozik előfizetés: „${existing.title}". Azt nyisd meg új felvétel helyett.`,
        existingProjectId: existing.id
      }, { status: 409, headers: { "Cache-Control": "no-store" } });
    }

    // ── 3. Profil ────────────────────────────────────────────────────────
    const { error: profileError } = await db.from("client_profiles").upsert({
      id: account.id,
      email,
      full_name: fullName,
      phone: cleanText(body.phone, 40),
      billing_name: cleanText(body.billing?.name, 160) ?? cleanText(body.company, 160) ?? fullName,
      billing_tax_number: cleanText(body.billing?.taxNumber, 40),
      billing_country: cleanText(body.billing?.country, 2) ?? "HU",
      billing_postal_code: cleanText(body.billing?.postalCode, 16),
      billing_city: cleanText(body.billing?.city, 80),
      billing_address: cleanText(body.billing?.address, 200),
      marketing_opt_in: marketingOptIn,
      marketing_opt_in_at: marketingOptIn ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }, { onConflict: "id" });
    if (profileError) throw profileError;

    // ── 4. Projekt ───────────────────────────────────────────────────────
    //
    // A `contract_accepted` azért igaz, mert a megállapodás megszületett —
    // csak nem ezen a felületen. A dátuma a szolgáltatás kezdete, hogy a
    // rendszerben is visszakereshető legyen, mikortól áll fenn.
    const plan = subscriptionPlan(planKey);
    const { data: project, error: projectError } = await db.from("client_projects").insert({
      user_id: account.id,
      contact_name: fullName,
      contact_email: email,
      title: projectTitle,
      company: cleanText(body.company, 160),
      website: liveUrl,
      live_url: liveUrl,
      project_type: "Menedzselt weboldal",
      goals: cleanText(body.adminNotes, 2_000)
        ?? "Kézzel felvett ügyfél: a megállapodás emailben és telefonon született.",
      status: "launched",
      commercial_model: "subscription",
      subscription_plan: planKey,
      subscription_status: "active",
      monthly_price: monthlyPrice,
      billing_amount: billingAmount,
      billing_interval: billingInterval,
      // A ciklus hónapban is: minden fizetési útvonal ebből számol, a
      // `billing_interval` csak a régi kód kedvéért marad kitöltve.
      billing_period_months: billingInterval === "year" ? 12 : 1,
      payment_method: paymentMethod,
      origin,
      onboarded_at: new Date().toISOString(),
      onboarded_by: admin.id,
      contract_accepted: true,
      contract_accepted_at: startedAt.toISOString(),
      payment_status: recordPayment ? "deposit_paid" : "unpaid",
      subscription_started_at: startedAt.toISOString(),
      billing_cycle_started_at: schedule.billingCycleStartedAt,
      next_billing_at: schedule.nextBillingAt,
      prepaid_until: recordPayment ? schedule.prepaidUntil : null,
      managed_domain_name: domain,
      domain_status: domain ? "active" : null,
      // A kivásárlási listaár a csomagból jön, hogy a beszámítás (a befizetett
      // havidíjak fele) ennél az ügyfélnél is működjön az első naptól.
      purchase_option_price: purchaseOptionPrice(planKey),
      admin_notes: cleanText(body.adminNotes, 2_000),
      next_step: "A weboldal él és felügyelet alatt van."
    }).select("*").single();
    if (projectError) throw projectError;

    // ── 5. Befizetések ───────────────────────────────────────────────────
    //
    // Két sor születik: a MEGTÖRTÉNT befizetés (paid) és a KÖVETKEZŐ
    // esedékesség (pending). A pending sor nem könyvelési tétel, hanem az,
    // amiből a fizetési emlékeztető dolgozik — enélkül semmi nem szólna,
    // hogy egy utalás esedékessé vált.
    // A rögzített befizetés a TELJES kifizetett összeg (ciklusdíj × ciklusszám),
    // a következő várt befizetés viszont már csak egy ciklusra szól.
    const paidAmount = cycleAmount({ monthlyPrice, interval: billingInterval, periods: prepaidPeriods, agreed: billingAmount });
    const nextCycleAmount = cycleAmount({ monthlyPrice, interval: billingInterval, agreed: billingAmount });
    const payments: Array<Record<string, unknown>> = [];

    if (recordPayment) {
      payments.push({
        project_id: project.id,
        billing_period_start: schedule.coveredPeriod.start,
        billing_period_end: schedule.coveredPeriod.end,
        amount: paidAmount,
        currency: "HUF",
        status: "paid",
        payment_method: paymentMethod,
        payment_reference: cleanText(body.paymentReference, 80)
          ?? paymentReference(project.id, lastPaymentAt ?? startedAt),
        paid_at: (lastPaymentAt ?? startedAt).toISOString(),
        due_date: schedule.coveredPeriod.start,
        note: prepaidPeriods > 1
          ? `Kézzel rögzített befizetés az ügyfélfelvételkor — ${prepaidPeriods} ${billingInterval === "year" ? "év" : "hónap"} előre.`
          : "Kézzel rögzített befizetés az ügyfélfelvételkor.",
        recorded_by: admin.id
      });
    }

    payments.push({
      project_id: project.id,
      billing_period_start: schedule.nextBillingAt,
      billing_period_end: schedule.nextBillingAt,
      amount: nextCycleAmount,
      currency: "HUF",
      status: "pending",
      payment_method: paymentMethod,
      payment_reference: paymentReference(project.id, new Date(schedule.nextBillingAt)),
      due_date: schedule.nextBillingAt,
      note: "Várt befizetés — a fizetési emlékeztető ebből dolgozik.",
      recorded_by: admin.id
    });

    const { error: paymentsError } = await db.from("subscription_payments").insert(payments);
    if (paymentsError) throw paymentsError;

    // ── 6. Értesítés az ügyfélnek ────────────────────────────────────────
    await db.from("notifications").insert({
      user_id: account.id,
      title: "Az ügyfélkapud elkészült",
      message: `A(z) „${projectTitle}" weboldalad adatai, a fizetési előzményed és a módosítási kereted innentől itt érhető el.`,
      link: "/ugyfelkapu/dashboard"
    });

    // Az értesítő levél AKKOR IS kimegy, ha a fiók már létezett.
    //
    // Korábban csak az újonnan meghívott ügyfél kapott levelet. Aki viszont
    // már regisztrált egyszer az ügyfélkapun (és pont ezért nem kellett új
    // fiók), az SEMMIT nem kapott — csak egy értesítés jelent meg a portálon,
    // ahová nem volt oka belépni. Vagyis pont az az ügyfél nem tudta meg, hogy
    // elkészült a felülete, aki a legkönnyebben be tudott volna lépni.
    if (sendInvite) {
      const loginHint = invited
        ? `A belépéshez kaptál egy külön levelet „Meghívó" tárggyal — abban tudsz jelszót állítani magadnak. Ha nem találod, szólj, és újraküldöm.`
        : `Belépni a korábban ehhez az email címhez beállított jelszavaddal tudsz. Ha nem emlékszel rá, az ügyfélkapun az „Elfelejtett jelszó" gombbal tudsz újat kérni.`;

      await sendProjectEdgeEmail({
        to: email,
        subject: "Megnyílt az ügyfélkapud a ProjectEdge-nél",
        eyebrow: "PROJECTEDGE · ÜGYFÉLKAPU",
        message: `Szia!\n\nMostantól saját felületed van a(z) „${projectTitle}" weboldalhoz. Itt bármikor megnézheted, mikor esedékes a következő fizetésed, milyen módosítások futottak az oldaladon, és innen tudsz újat kérni is.\n\n${loginHint}`,
        link: "/ugyfelkapu",
        linkLabel: "Ügyfélkapu megnyitása",
        details: [
          { label: "Csomag", value: `${plan.name} · ${formatHuf(monthlyPrice)} / hó` },
          {
            label: "Fizetés",
            value: billingInterval === "year"
              ? `Éves, előre · ${formatHuf(nextCycleAmount)} / év`
              : "Havi"
          },
          ...(recordPayment ? [{
            label: "Kifizetve eddig",
            value: new Date(schedule.prepaidUntil).toLocaleDateString("hu-HU")
          }] : []),
          { label: "Következő esedékesség", value: new Date(schedule.nextBillingAt).toLocaleDateString("hu-HU") }
        ],
        tags: ["Ügyfélkapu", "Menedzselt weboldal"]
      });
    }

    return NextResponse.json({
      ok: true,
      project,
      userId: account.id,
      invited,
      schedule
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin client onboarding failed", error);
    return bad(
      error instanceof Error ? error.message : "Az ügyfél felvétele nem sikerült.",
      500
    );
  }
}
