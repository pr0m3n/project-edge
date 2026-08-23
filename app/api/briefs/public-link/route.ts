import { NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { checkDurableRateLimit, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { initialBriefForm, type BriefFormValues } from "@/lib/brief-draft";
import {
  SERVICE_COUNT_OPTIONS,
  VISITOR_TASK_OPTIONS,
  formatHuf,
  subscriptionPlan
} from "@/lib/subscriptions";

/**
 * Fiók nélküli brief-mentés: a látogató megadja az email címét, kap egy
 * folytatás-linket, a stúdió pedig megkapja a félbehagyott adatlapot.
 *
 * Miért van rá szükség: a záró képernyőn eddig egyetlen kimenet volt, a
 * regisztráció. Aki eddig eljutott és nem hozott létre fiókot, arról a rendszer
 * SEMMIT nem tudott meg — a kitöltött brief a böngészőjében maradt.
 *
 * A védelem az `/api/audit` útvonaléval azonos: rate limit, honeypot mező és
 * kitöltési idő ellenőrzés. Írni csak ez az útvonal ír a táblába (service role).
 */

type LinkPayload = {
  email?: string;
  form?: Partial<BriefFormValues>;
  step?: number;
  startedAt?: number;
  honeypot?: string;
};

const STEP_COUNT = 5;
const MAX_TEXT = 4_000;

function clean(value: unknown, limit = 400) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function optionLabel(options: ReadonlyArray<readonly [string, string]>, value: string) {
  return options.find(([key]) => key === value)?.[1] || "";
}

/** Ugyanaz a szöveg megy a ticketbe és az értesítő levélbe — egy helyen készül. */
function summarize(form: BriefFormValues) {
  const plan = subscriptionPlan(form.subscriptionPlan);
  const rows: Array<[string, string]> = [
    ["Vállalkozás", form.company || "—"],
    ["Projekt", form.websiteStatus === "yes" ? "Meglévő oldal felújítása" : "Új weboldal"],
    ["Jelenlegi oldal", form.website || "—"],
    ["Ajánlott csomag", `${plan.name} · ${formatHuf(plan.price)}/hó`],
    ["Szolgáltatások száma", optionLabel(SERVICE_COUNT_OPTIONS, form.serviceCount) || "—"],
    ["Látogatói művelet", optionLabel(VISITOR_TASK_OPTIONS, form.visitorTask) || "—"],
    ["Elsődleges cél", form.primaryAction || "—"],
    ["Mit szeretne elérni", form.goals || "—"],
    ["Kiknek készül", form.audience || "—"],
    ["Oldalak / blokkok", form.pages || "—"],
    ["Funkciók", form.features || "—"],
    ["A vállalkozásról", form.contentBrief || "—"]
  ];
  return rows.map(([label, value]) => `${label}: ${value}`).join("\n");
}

export async function POST(request: Request) {
  const rate = await checkDurableRateLimit(request, "public-brief-link", 5, 10 * 60);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const parsed = await readJsonBody<LinkPayload>(request, 32_000);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const email = clean(payload.email, 160).toLowerCase();
  const honeypot = clean(payload.honeypot);
  const startedAt = Number(payload.startedAt);

  // Bot-szűrés: rejtett mező kitöltve, vagy gyanúsan gyors / régi beküldés.
  if (
    honeypot ||
    !Number.isFinite(startedAt) ||
    Date.now() - startedAt < 1_200 ||
    Date.now() - startedAt > 6 * 60 * 60 * 1_000
  ) {
    return NextResponse.json({ error: "Érvénytelen beküldés." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Érvénytelen email cím." }, { status: 400 });
  }

  if (!payload.form || typeof payload.form !== "object") {
    return NextResponse.json({ error: "Hiányzó adatlap." }, { status: 400 });
  }

  // Csak ismert mezőket veszünk át, és minden szöveget vágunk — a kliens
  // küldheti bármit, a tárolt szerkezetet mi határozzuk meg.
  const form: BriefFormValues = { ...initialBriefForm };
  for (const key of Object.keys(initialBriefForm) as Array<keyof BriefFormValues>) {
    const incoming = (payload.form as Record<string, unknown>)[key];
    if (typeof incoming === "string") {
      (form as Record<string, unknown>)[key] = incoming.slice(0, MAX_TEXT);
    } else if (Array.isArray(incoming)) {
      (form as Record<string, unknown>)[key] = incoming.filter((item) => typeof item === "string").slice(0, 40);
    }
  }

  const step = Math.max(0, Math.min(STEP_COUNT - 1, Number(payload.step) || 0));
  const name = form.company || email.split("@")[0];
  const summary = summarize(form);
  const resumeToken = crypto.randomUUID();
  const supabase = createServerSupabaseAdminClient();

  const ticketMessage = `Félbehagyott projektindító adatlap (${step + 1}/${STEP_COUNT}. lépés)\n\n${summary}`;

  // A lead megy először: ha ez elhasal (pl. a 036-os migráció még nem futott
  // le), ne maradjon utána árva support ticket a listában.
  const { data: lead, error: leadError } = await supabase
    .from("public_brief_leads")
    .insert({
      resume_token: resumeToken,
      email,
      company: form.company || null,
      subscription_plan: form.subscriptionPlan || null,
      step,
      step_count: STEP_COUNT,
      data: form
    })
    .select("id")
    .single();

  if (leadError || !lead) {
    console.error("Public brief lead insert failed", leadError);
    return NextResponse.json({ error: "Nem sikerült elmenteni az adatlapot." }, { status: 500 });
  }

  // A ticket már csak kényelmi funkció: ezen keresztül tud válaszolni a
  // stúdiónak. Ha nem jön létre, a lead és a levél attól még megvan.
  const { data: ticket } = await supabase
    .from("support_tickets")
    .insert({
      name,
      email,
      message: ticketMessage,
      status: "open",
      source: "projektbrief_piszkozat",
      visitor_token: crypto.randomUUID()
    })
    .select("id")
    .single();

  if (ticket?.id) {
    await supabase.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      sender: "customer",
      body: ticketMessage
    });
    await supabase.from("public_brief_leads").update({ ticket_id: ticket.id }).eq("id", lead.id);
  }

  const resumePath = `/?brief=${lead.id}~${resumeToken}#projektbrief`;
  const plan = subscriptionPlan(form.subscriptionPlan);

  await sendProjectEdgeEmail({
    to: email,
    subject: "Itt a projekted linkje — bármikor folytathatod",
    eyebrow: "PROJECTEDGE · MENTETT ADATLAP",
    preheader: "A megkezdett projektindító adatlapod bármelyik gépen folytatható ezzel a linkkel.",
    message: `Szia!\n\nElmentettem a megkezdett adatlapodat. A lenti gombbal bármikor és bármelyik gépen ott folytathatod, ahol abbahagytad — nem kell újrakezdened, és fiókot sem kell létrehoznod hozzá.\n\nAmit eddig megadtál:\n\n${summary}\n\nHa közben kérdésed van, elég válaszolnod erre a levélre.`,
    link: resumePath,
    linkLabel: "Adatlap folytatása",
    details: [
      { label: "Ajánlott csomag", value: `${plan.name} · ${formatHuf(plan.price)}/hó` },
      { label: "Hol tartasz", value: `${step + 1}. lépés az ${STEP_COUNT}-ből` }
    ],
    tags: ["Projektbrief", "ProjectEdge"]
  });

  const adminEmail = process.env.RESEND_NOTIFICATION_EMAIL || process.env.RESEND_REPLY_TO || "info@projectedge.hu";
  await sendProjectEdgeEmail({
    to: adminEmail,
    subject: `Félbehagyott brief: ${form.company || email} (${step + 1}/${STEP_COUNT})`,
    eyebrow: "PROJECTEDGE · ÚJ ÉRDEKLŐDŐ",
    preheader: `${form.company || email} elmentette a projektindító adatlapját, de még nem regisztrált.`,
    message: `Valaki kitöltötte a nyilvános adatlapot és emailben kérte a folytatás linkjét — fiókot még nem hozott létre.\n\n${summary}`,
    link: "/admin/dashboard",
    linkLabel: "Megnyitás az adminban",
    details: [
      { label: "Email", value: email },
      { label: "Csomag", value: `${plan.name} · ${formatHuf(plan.price)}/hó` },
      { label: "Hol állt meg", value: `${step + 1}. lépés az ${STEP_COUNT}-ből` }
    ],
    tags: ["Lead", "Projektbrief"]
  });

  return NextResponse.json({ ok: true });
}

/** A folytatás-link visszaolvasása: `?id=<uuid>&token=<uuid>`. */
export async function GET(request: Request) {
  const rate = await checkDurableRateLimit(request, "public-brief-resume", 30, 10 * 60);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSeconds);

  const url = new URL(request.url);
  const id = clean(url.searchParams.get("id"), 64);
  const token = clean(url.searchParams.get("token"), 64);
  if (!id || !token) {
    return NextResponse.json({ error: "Hiányzó azonosító." }, { status: 400 });
  }

  const supabase = createServerSupabaseAdminClient();
  const { data, error } = await supabase
    .from("public_brief_leads")
    .select("data, step")
    .eq("id", id)
    .eq("resume_token", token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "A link érvénytelen vagy lejárt." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, form: data.data, step: data.step });
}
