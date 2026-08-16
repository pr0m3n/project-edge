import { NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { checkDurableRateLimit, rateLimitResponse, readJsonBody } from "@/lib/api-guard";
import { sendProjectEdgeEmail } from "@/lib/projectedge-email";
import { supportResumePath } from "@/lib/support-link";

type AuditPayload = {
  name?: string;
  email?: string;
  websiteUrl?: string;
  challenge?: string;
  startedAt?: number;
  honeypot?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUrl(url: string) {
  let cleaned = url.trim();
  if (!cleaned) return "";
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  return cleaned;
}

export async function POST(request: Request) {
  const rate = await checkDurableRateLimit(request, "audit-request", 5, 10 * 60);
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSeconds);
  }

  const parsed = await readJsonBody<AuditPayload>(request, 8_000);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  const name = clean(payload.name);
  const email = clean(payload.email).toLowerCase();
  const rawUrl = clean(payload.websiteUrl);
  const challenge = clean(payload.challenge);
  const honeypot = clean(payload.honeypot);
  const startedAt = Number(payload.startedAt);

  if (
    honeypot ||
    !Number.isFinite(startedAt) ||
    Date.now() - startedAt < 1_200 ||
    Date.now() - startedAt > 2 * 60 * 60 * 1_000
  ) {
    return NextResponse.json({ error: "Érvénytelen beküldés." }, { status: 400 });
  }

  if (!name || !email || !rawUrl) {
    return NextResponse.json({ error: "Kérlek add meg a neved, az email címed és a weboldalad URL-jét." }, { status: 400 });
  }

  if (name.length > 120 || rawUrl.length > 300 || challenge.length > 2_000) {
    return NextResponse.json({ error: "Túl hosszú mezőérték." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return NextResponse.json({ error: "Érvénytelen email cím." }, { status: 400 });
  }

  const websiteUrl = normalizeUrl(rawUrl);
  const visitorToken = crypto.randomUUID();
  const supabase = createServerSupabaseAdminClient();

  const ticketMessage = `Ingyenes weboldal-gyorselemzés kérés\n\nWeboldal: ${websiteUrl}\nFő kihívás / cél: ${challenge || "Nem adott meg külön leírást."}`;

  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      name,
      email,
      message: ticketMessage,
      status: "open",
      source: "weboldal_audit",
      visitor_token: visitorToken
    })
    .select("id, name, email, status, visitor_token")
    .single();

  if (ticketError || !ticket) {
    console.error("Audit ticket insert failed", ticketError);
    return NextResponse.json({ error: "Nem sikerült elmenteni az igénylést." }, { status: 500 });
  }

  await supabase.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    sender: "customer",
    body: ticketMessage
  });

  // Értesítés a stúdiónak
  const adminEmail = process.env.RESEND_NOTIFICATION_EMAIL || process.env.RESEND_REPLY_TO || "info@projectedge.hu";
  await sendProjectEdgeEmail({
    to: adminEmail,
    subject: `Új weboldal-audit kérés: ${websiteUrl} (${name})`,
    eyebrow: "PROJECTEDGE · AUDIT IGÉNYLÉS",
    preheader: `${name} ingyenes weboldal elemzést kért a(z) ${websiteUrl} oldalhoz.`,
    message: `${name} lead-mágnes auditot kért a weboldalára.\n\nWeboldal: ${websiteUrl}\nFő kihívás: ${challenge || "Nincs megadva."}`,
    link: "/admin/dashboard",
    linkLabel: "Megnyitás az adminban",
    details: [
      { label: "Név", value: name },
      { label: "Email", value: email },
      { label: "Weboldal", value: websiteUrl },
      { label: "Kihívás", value: challenge || "Nincs megadva" }
    ],
    tags: ["Audit", "Lead", "Weboldal"]
  });

  // Visszaigazolás az érdeklődőnek
  await sendProjectEdgeEmail({
    to: email,
    subject: `Megkaptam a weboldal-elemzési kérésedet: ${websiteUrl}`,
    eyebrow: "PROJECTEDGE · INGYENES GYORSELEMZÉS",
    preheader: `Szia ${name}! Átnézem a(z) ${websiteUrl} oldalt és 24 órán belül küldöm az észrevételeimet.`,
    message: `Szia ${name}!\n\nKöszönöm az igénylést! Megkaptam a weboldalad címét (${websiteUrl}).\n\n24 órán belül (munkanapokon) átnézem a felületet az alábbi 3 fő szempont szerint:\n\n1. Betöltési sebesség és technikai alapok (mobil és asztali nézetben)\n2. Konverziós struktúra (érthető-e az ajánlat, könnyű-e kapcsolatba lépni veled)\n3. Vizuális hierarchia és használhatóság (mi az, ami elriaszthatja a látogatókat)\n\nAz összefoglalót közvetlenül erre az email címre küldöm el neked. Ha közben kérdésed van, a lenti gombbal bármelyik eszközön írhatsz.`,
    link: supportResumePath(ticket.id, visitorToken),
    linkLabel: "Beszélgetés megnyitása",
    details: [
      { label: "Elemzett oldal", value: websiteUrl },
      { label: "Várható válaszidő", value: "24 órán belül" }
    ],
    tags: ["Audit", "ProjectEdge", "Next.js"]
  });

  return NextResponse.json({
    ok: true,
    message: "Az igénylést sikeresen rögzítettük. 24 órán belül elküldöm az elemzést!"
  });
}
