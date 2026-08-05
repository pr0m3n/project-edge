import { NextRequest, NextResponse } from "next/server";
import { domainToASCII } from "node:url";

export const runtime = "nodejs";

const POPULAR_TLDS = ["hu", "com", "eu", "net", "org", "co", "io", "dev", "app", "online", "site", "shop", "studio", "digital", "agency", "tech", "design", "info", "me"];
let tldCache: { values: Set<string>; rdap: Set<string>; expires: number } | null = null;

async function validTlds() {
  if (tldCache && tldCache.expires > Date.now()) return tldCache;
  const [tldResponse, rdapResponse] = await Promise.all([
    fetch("https://data.iana.org/TLD/tlds-alpha-by-domain.txt", { next: { revalidate: 86400 } }),
    fetch("https://data.iana.org/rdap/dns.json", { next: { revalidate: 86400 } })
  ]);
  if (!tldResponse.ok || !rdapResponse.ok) throw new Error("IANA registry data unavailable");
  const values = new Set((await tldResponse.text()).split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => line.toLowerCase()));
  const bootstrap = await rdapResponse.json() as { services?: Array<[string[], string[]]> };
  const rdap = new Set((bootstrap.services || []).flatMap(([tlds]) => tlds.map((tld) => tld.toLowerCase())));
  tldCache = { values, rdap, expires: Date.now() + 86400000 };
  return tldCache;
}

function normalize(value: string) {
  return domainToASCII(value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, ""));
}

async function checkDomain(domain: string, hasRdap: boolean) {
  if (hasRdap) try {
    const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      headers: { accept: "application/rdap+json, application/json" },
      signal: AbortSignal.timeout(6500),
      cache: "no-store"
    });
    if (response.status === 404) return { domain, status: "available" as const, source: "RDAP" };
    if (response.ok) return { domain, status: "taken" as const, source: "RDAP" };
  } catch { /* DNS fallback below */ }

  try {
    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`, {
      headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(4500), cache: "no-store"
    });
    const data = await response.json() as { Status?: number; Answer?: unknown[]; Authority?: unknown[] };
    if (data.Status === 0 && (data.Answer?.length || data.Authority?.length)) return { domain, status: "taken" as const, source: "DNS" };
    if (data.Status === 3) return { domain, status: "available" as const, source: "DNS" };
  } catch { /* unknown is safer than a false availability claim */ }
  return { domain, status: "unknown" as const, source: "registry" };
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("name") ?? "";
  const normalized = normalize(raw);
  if (!normalized || normalized.length > 253 || normalized.includes("/") || normalized.includes(" ")) {
    return NextResponse.json({ error: "Adj meg egy érvényes domainnevet." }, { status: 400 });
  }

  try {
    const registries = await validTlds();
    const hasTld = normalized.includes(".");
    const candidates = hasTld ? [normalized] : POPULAR_TLDS.map((tld) => `${normalized}.${tld}`);
    const checked = candidates.filter((domain) => {
      const labels = domain.split(".");
      return labels.every((label) => /^(xn--)?[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) && registries.values.has(labels.at(-1)!);
    });
    if (!checked.length) return NextResponse.json({ error: "Ez a végződés nem szerepel az IANA aktív domainlistáján." }, { status: 400 });
    const results = await Promise.all(checked.map((domain) => checkDomain(domain, registries.rdap.has(domain.split(".").at(-1)!))));
    return NextResponse.json({ results, checkedAt: new Date().toISOString(), preliminary: true });
  } catch {
    return NextResponse.json({ error: "A nyilvántartói ellenőrzés most nem elérhető. Próbáld újra rövidesen." }, { status: 503 });
  }
}
