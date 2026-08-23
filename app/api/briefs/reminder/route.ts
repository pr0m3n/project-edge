import { NextResponse } from "next/server";
import { briefDraftProgress, type BriefDraftRow } from "@/lib/brief-draft";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { authenticatedUser, isAdminUser } from "@/lib/server-auth";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { briefSteps } from "@/components/portal/brief-fields";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Emlékeztető a félbehagyott projektindító adatlapokra.
 *
 * A tipikus lemorzsolódás nem döntés, hanem félbeszakadás: valaki kitölti a
 * nyilvános briefet, regisztrál, aztán jön egy telefon — és soha nem tudja meg,
 * hogy a beküldéshez vissza kellett volna lépnie. Eddig erről a rendszer nem is
 * tudott, mert a piszkozat csak a böngészőjében élt (lásd 035-ös migráció).
 *
 * Egy piszkozathoz LEGFELJEBB EGY levél megy (`reminder_sent_at`). Nem
 * hírlevél: aki nem reagál rá, nem kap többet.
 */

/** Ennyi tétlenség után számít félbehagyottnak egy adatlap. */
const IDLE_HOURS = 24;
/** Ennél régebbi piszkozatot már nem melegítünk fel — ott a levél tolakodó lenne. */
const MAX_AGE_DAYS = 30;
/** Egy futásban ennyi levelet küldünk, hogy a szerverless időkorlát ne vágja el. */
const BATCH_LIMIT = 40;

async function authorize(request: Request) {
  // A Vercel cron ezzel a fejléccel hívja a végpontot.
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (secret && header === `Bearer ${secret}`) return true;

  // Kézi futtatás az adminból.
  const user = await authenticatedUser(request);
  return Boolean(user && (await isAdminUser(request, user.id)));
}

function firstName(draft: BriefDraftRow) {
  const name = draft.full_name?.trim();
  if (!name || name.includes("@")) return "Szia";
  return `Szia ${name.split(/\s+/).at(-1) ?? name}`;
}

async function runBriefReminders(request: Request) {
  if (!(await authorize(request))) {
    return NextResponse.json({ error: "Nincs jogosultság." }, { status: 401 });
  }

  const admin = createServerSupabaseAdminClient();
  const now = Date.now();
  const idleBefore = new Date(now - IDLE_HOURS * 60 * 60 * 1000).toISOString();
  const oldestAllowed = new Date(now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data: drafts, error } = await admin
      .from("brief_drafts")
      .select("*")
      .is("submitted_at", null)
      .is("reminder_sent_at", null)
      .lt("updated_at", idleBefore)
      .gt("updated_at", oldestAllowed)
      .order("updated_at", { ascending: true })
      .limit(BATCH_LIMIT)
      .returns<BriefDraftRow[]>();
    if (error) throw error;

    const sent: string[] = [];
    const failed: string[] = [];

    for (const draft of drafts ?? []) {
      // Közben indíthatott projektet másik piszkozatból vagy a régi,
      // localStorage-alapú úton. Ilyenkor nincs mire emlékeztetni.
      const { count: projectCount } = await admin
        .from("client_projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", draft.user_id);
      if (projectCount) {
        await admin.from("brief_drafts")
          .update({ submitted_at: new Date().toISOString() })
          .eq("user_id", draft.user_id);
        continue;
      }

      const stepCount = draft.step_count || briefSteps.length;
      const percent = briefDraftProgress(draft.step, stepCount);
      const stepLabel = briefSteps[Math.min(Math.max(draft.step, 0), briefSteps.length - 1)] ?? "Alapok";
      const brand = draft.company?.trim();

      const result = await sendProjectEdgeEmail({
        to: draft.email,
        subject: brand
          ? `Félbemaradt a(z) „${brand}” adatlapja — folytatod?`
          : "Félbemaradt a projektindító adatlapod — folytatod?",
        eyebrow: "PROJECTEDGE · FÉLBEMARADT ADATLAP",
        preheader: `A válaszaid megvannak, ${percent}%-nál tartasz. Egy kattintás, és ott folytatod, ahol abbahagytad.`,
        message: `${firstName(draft)}!\n\nElkezdted a projektindító adatlapot${brand ? ` a(z) „${brand}” weboldalához` : ""}, de nem érkezett meg beküldve. Semmi nem veszett el: minden válaszod ott vár az ügyfélkapudban, pontosan ott, ahol abbahagytad.\n\nAz adatlap beküldése külön lépés — a végén, az összegzésnél kell jóváhagynod. Sokan itt akadnak el, mert nem egyértelmű, hogy még hátravan ez a kattintás.\n\nHa elakadtál valamelyik kérdésnél, vagy nem tudod, mit írj valahova, válaszolj erre a levélre és segítek. Ha időközben meggondoltad magad, nyugodtan hagyd figyelmen kívül — ez az egyetlen emlékeztető, amit erről küldök.`,
        link: "/ugyfelkapu/dashboard",
        linkLabel: "Adatlap folytatása",
        details: [
          ...(brand ? [{ label: "Márka", value: brand }] : []),
          { label: "Ahol abbahagytad", value: `${stepLabel} (${percent}%)` },
          { label: "Válaszaid", value: "Mentve, az ügyfélkapudban várnak" }
        ],
        tags: ["Projektbrief", "Emlékeztető", "Ügyfélkapu"]
      });

      if (!result.ok) {
        failed.push(`${draft.email}: ${result.error}`);
        continue;
      }

      // Csak sikeres kézbesítés után jelöljük elküldöttnek, hogy egy átmeneti
      // Resend-hiba ne nyelje el véglegesen az emlékeztetőt.
      await admin.from("brief_drafts")
        .update({ reminder_sent_at: new Date().toISOString() })
        .eq("user_id", draft.user_id);
      sent.push(draft.email);
    }

    if (sent.length || failed.length) {
      await admin.from("notifications").insert({
        user_id: null,
        title: "Félbehagyott adatlapok — emlékeztetők",
        message: `${sent.length} emlékeztető kiment.${failed.length ? `\n\nSikertelen: ${failed.join("; ")}` : ""}`,
        link: "/admin/dashboard"
      });
    }

    return NextResponse.json({ checked: drafts?.length ?? 0, sent: sent.length, failed }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Brief reminder run failed", error);
    return NextResponse.json({ error: "Az emlékeztetők küldése most nem futtatható." }, { status: 500 });
  }
}

// A Vercel cron GET-tel hívja a végpontot; a kézi indítás az adminból POST.
export const GET = runBriefReminders;
export const POST = runBriefReminders;
