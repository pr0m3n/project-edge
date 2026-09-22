import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPrivateAddress } from "@/lib/private-address";
import tls from "node:tls";

/**
 * AZ ÜGYFÉLWEBOLDALAK MÉRÉSE.
 *
 * Ez a modul állítja elő azokat az adatokat, amiket a havi jelentés közöl.
 * Minden itteni szám VALÓDI mérésből származik — ez a különbség a korábbi
 * állapothoz képest, ahol a jelentés beégetett értékeket küldött ki.
 *
 * A mérés szándékosan szerény: egy HTTP kérés, egy TLS kézfogás, és havonta
 * egy PageSpeed futtatás. Nem monitorozó rendszert építünk, hanem pontosan
 * annyit mérünk, amennyiről őszintén be tudunk számolni.
 */

/** Ennyi idő után feladjuk. Egy lassú oldal is legyen mérhető, de ne fagyjon be a cron. */
const REQUEST_TIMEOUT_MS = 15_000;
const TLS_TIMEOUT_MS = 8_000;
/** Ennyi átirányítást követünk (http → https → www → nyelvi aloldal bőven belefér). */
const MAX_REDIRECTS = 5;

/** Csak nyilvános interneten elérhető http(s) cél mérhető. Hibánál a hiba szövege. */
async function publicTargetError(url: string): Promise<string | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Érvénytelen cím";
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "Csak http(s) cím mérhető";
  if (parsed.username || parsed.password) return "A cím nem tartalmazhat belépési adatot";

  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    return "Belső cím nem mérhető";
  }

  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) return "Belső cím nem mérhető";
  } catch {
    return "A domain nem oldható fel";
  }
  return null;
}

export type SiteCheckResult = {
  ok: boolean;
  statusCode: number | null;
  responseMs: number | null;
  error: string | null;
};

/**
 * Elérhetőség és válaszidő.
 *
 * `GET`-et használunk, nem `HEAD`-et: sok oldal (és szinte minden CDN-mögötti
 * szerver) másképp — vagy sehogy — kezeli a HEAD kérést, és egy 405-ös válasz
 * hamisan üzemszünetnek látszana. A választ nem olvassuk végig, csak a fejlécig
 * mérünk: ez az az idő, amit a látogató először érzékel.
 *
 * A 3xx is sikernek számít: egy `http → https` vagy `example.hu → www.example.hu`
 * átirányítás nem hiba, hanem helyes működés.
 */
export async function checkSite(url: string): Promise<SiteCheckResult> {
  const startedAt = Date.now();

  try {
    // Az átirányításokat kézzel követjük, és MINDEN lépés célját ellenőrizzük:
    // egy nyilvános oldal is átirányíthat belső címre.
    const signal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    let target = url;
    let response: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const refused = await publicTargetError(target);
      if (refused) return { ok: false, statusCode: null, responseMs: null, error: refused };

      response = await fetch(target, {
        method: "GET",
        redirect: "manual",
        signal,
        cache: "no-store",
        headers: {
          // Azonosítjuk magunkat: ha valaki a naplójában látja, tudja, ki kopogtat.
          "User-Agent": "ProjectEdgeMonitor/1.0 (+https://www.projectedge.hu)",
          Accept: "text/html,application/xhtml+xml"
        }
      });
      const location = response.status >= 300 && response.status < 400 ? response.headers.get("location") : null;
      if (!location) break;
      // A törzset el kell engedni, különben a kapcsolat nyitva marad.
      void response.body?.cancel();
      target = new URL(location, target).toString();
      if (hop === MAX_REDIRECTS) {
        return { ok: false, statusCode: response.status, responseMs: null, error: "Túl sok átirányítás" };
      }
    }
    if (!response) throw new Error("Nem érkezett válasz");

    const responseMs = Date.now() - startedAt;
    // A törzset el kell engedni, különben a kapcsolat nyitva marad.
    void response.body?.cancel();

    return {
      ok: response.status >= 200 && response.status < 400,
      statusCode: response.status,
      responseMs,
      error: response.status >= 400 ? `HTTP ${response.status}` : null
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ismeretlen hiba";
    return {
      ok: false,
      statusCode: null,
      responseMs: null,
      // A `TimeoutError` név önmagában semmitmondó a naplóban.
      error: message.includes("timed out") || message.includes("aborted")
        ? `Nem válaszolt ${REQUEST_TIMEOUT_MS / 1000} másodpercen belül`
        : message.slice(0, 200)
    };
  }
}

/**
 * A TLS tanúsítvány lejárata.
 *
 * A `fetch` nem adja vissza a tanúsítványt, ezért kell a nyers TLS kapcsolat.
 * Ez az egyik legjobb adat, amit az ügyfélnek adhatunk: a lejárt tanúsítvány
 * az a hiba, ami egyik napról a másikra elérhetetlenné teszi az oldalt, és
 * amiről a tulajdonos jellemzően a vevőitől értesül.
 */
export async function tlsExpiry(url: string): Promise<Date | null> {
  let hostname: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    hostname = parsed.hostname;
  } catch {
    return null;
  }
  if (await publicTargetError(url)) return null;

  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, timeout: TLS_TIMEOUT_MS },
      () => {
        const certificate = socket.getPeerCertificate();
        socket.end();
        const validTo = certificate?.valid_to ? new Date(certificate.valid_to) : null;
        resolve(validTo && !Number.isNaN(validTo.getTime()) ? validTo : null);
      }
    );

    // Minden hibaágon lezárjuk a socketet: egy nyitva felejtett kapcsolat a
    // szerverless futásidőt is életben tartaná.
    const fail = () => {
      socket.destroy();
      resolve(null);
    };
    socket.on("error", fail);
    socket.on("timeout", fail);
  });
}

export type PageSpeedScores = {
  performance: number | null;
  accessibility: number | null;
  seo: number | null;
};

/**
 * PageSpeed Insights pontszámok.
 *
 * Ez az a szám, ami az ügyfélnek tényleg mond valamit, és ami jól is néz ki:
 * egy gondosan épített oldal 90 fölött teljesít, miközben a mezőny jellemzően
 * 50 körül van. A méréshez nem kell forgalom — ezért működik az első naptól,
 * szemben bármilyen látogatottsági adattal.
 *
 * Kulcs nélkül is fut (alacsony napi kvótával), `PAGESPEED_API_KEY`-jel
 * megbízhatóbban. A hiba SOHA nem száll tovább: egy PSI-kimaradás nem
 * akadályozhatja meg a havi jelentés kiküldését.
 */
export async function pageSpeedScores(url: string): Promise<PageSpeedScores> {
  const empty: PageSpeedScores = { performance: null, accessibility: null, seo: null };

  try {
    const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
    endpoint.searchParams.set("url", url);
    endpoint.searchParams.set("strategy", "mobile");
    for (const category of ["performance", "accessibility", "seo"]) {
      endpoint.searchParams.append("category", category);
    }
    const apiKey = process.env.PAGESPEED_API_KEY?.trim();
    if (apiKey) endpoint.searchParams.set("key", apiKey);

    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(55_000),
      cache: "no-store"
    });
    if (!response.ok) return empty;

    const data = await response.json() as {
      lighthouseResult?: { categories?: Record<string, { score?: number | null }> };
    };
    const categories = data.lighthouseResult?.categories ?? {};

    // A Lighthouse 0–1 közötti törtet ad; az ügyfél 0–100-at ért.
    const toScore = (value?: number | null) =>
      typeof value === "number" ? Math.round(value * 100) : null;

    return {
      performance: toScore(categories.performance?.score),
      accessibility: toScore(categories.accessibility?.score),
      seo: toScore(categories.seo?.score)
    };
  } catch {
    return empty;
  }
}

/**
 * A domain lejárata RDAP-ból.
 *
 * Ugyanaz a forrás, amit a `/api/domains/check` is használ. A domain lejárata
 * a másik olyan dátum, ami egyik napról a másikra leviheti az oldalt, és
 * amiről az ügyfél jellemzően nem tud.
 */
export async function domainExpiry(domain: string): Promise<Date | null> {
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  if (!clean || !clean.includes(".")) return null;

  try {
    const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(clean)}`, {
      headers: { accept: "application/rdap+json, application/json" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store"
    });
    if (!response.ok) return null;

    const data = await response.json() as {
      events?: Array<{ eventAction?: string; eventDate?: string }>;
    };
    const expiry = data.events?.find((event) => event.eventAction === "expiration")?.eventDate;
    if (!expiry) return null;

    const parsed = new Date(expiry);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * A mért állapot lefordítása a projekten tárolt egészség-jelzésre.
 *
 * Három fokozat, mert több nem segítene a döntésben: rendben van, ránézek,
 * vagy most kell intézkedni.
 */
export function healthFromChecks(input: {
  ok: boolean;
  sslExpiresAt: Date | null;
  domainExpiresAt: Date | null;
  now?: Date;
}): "healthy" | "attention" | "offline" {
  if (!input.ok) return "offline";

  const now = input.now ?? new Date();
  const days = (target: Date | null) =>
    target ? (target.getTime() - now.getTime()) / 86_400_000 : Number.POSITIVE_INFINITY;

  // 14 nap: ennyi idő alatt egy megújítás kényelmesen elintézhető, és még nem
  // riasztunk feleslegesen egy automatikusan megújuló tanúsítvány miatt.
  if (days(input.sslExpiresAt) < 14 || days(input.domainExpiresAt) < 30) return "attention";

  return "healthy";
}
