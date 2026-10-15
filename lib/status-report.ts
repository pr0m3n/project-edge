/**
 * NEGYEDÉVES ÁLLAPOTJELENTÉS — a tiszta logika (időszak, ellenőrzés).
 *
 * Adatbázis és hálózat nélkül, hogy tesztelhető legyen: amit itt eldöntünk,
 * az dönti el, kimehet-e egy levél valódi ügyfélnek a nevünkben.
 *
 * Az alapelv ugyanaz, mint a havi jelentésnél: csak mért adat kerül a
 * levélbe. Ami ennél is fontosabb: a mérés maga is elromolhat (a monitor
 * napokig nem fut, a cron elhasal, egy hálózati hiba hamis leállást ír be).
 * Ezért a levél előtt a mérést is ellenőrizzük, és ha bármi gyanús, a levél
 * NEM megy ki magától, hanem az admin elé kerül.
 */

export type ReportPeriod = {
  /** Pl. „2026-Q4". Ezzel biztosítjuk, hogy egy időszakról egy jelentés menjen. */
  key: string;
  start: Date;
  end: Date;
  /** Pl. „2026. október–december". */
  label: string;
};

export type UptimeSummary = {
  checks: number;
  failures: number;
  uptime_percent: number | null;
  avg_response_ms: number | null;
  last_failure_at: string | null;
};

export type LiveCheck = { ok: boolean; responseMs: number | null; error: string | null };

export type ReportInputs = {
  projectTitle: string;
  siteUrl: string | null;
  salutation: string;
  toEmail: string | null;
  period: ReportPeriod;
  /** Mióta méri a monitor az oldalt (a felvétel napja). */
  monitoredSince: Date | null;
  uptime: UptimeSummary | null;
  lastCheckAt: Date | null;
  liveCheck: LiveCheck | null;
  sslExpiresAt: Date | null;
  domainName: string | null;
  domainExpiresAt: Date | null;
  psiPerformance: number | null;
  now: Date;
  isFirstReport: boolean;
};

export type ReportWarning = { level: "block" | "warn"; message: string };

const MONTHS = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];
const HOUR = 3_600_000;
const DAY = 86_400_000;

/** A monitor óránként mér (`/api/monitor/check`, `0 * * * *`). */
export const CHECKS_PER_HOUR = 1;
/** Ennyi hiányzó mérés még belefér (deploy, egy-egy kimaradt cron). */
export const MIN_COVERAGE = 0.9;
/** Ennél régebbi utolsó mérés azt jelenti, hogy a monitor most nem fut. */
export const MAX_CHECK_AGE_HOURS = 3;

/** A dátumot tartalmazó naptári negyedév (UTC határokkal). */
export function quarterPeriod(date: Date): ReportPeriod {
  const year = date.getUTCFullYear();
  const quarter = Math.floor(date.getUTCMonth() / 3);
  const start = new Date(Date.UTC(year, quarter * 3, 1));
  const end = new Date(Date.UTC(year, quarter * 3 + 3, 1));
  return {
    key: `${year}-Q${quarter + 1}`,
    start,
    end,
    label: `${year}. ${MONTHS[quarter * 3]}–${MONTHS[quarter * 3 + 2]}`
  };
}

/** Az előző, már lezárt negyedév — a cron ezt jelenti le. */
export function previousQuarter(now: Date): ReportPeriod {
  const current = quarterPeriod(now);
  return quarterPeriod(new Date(current.start.getTime() - DAY));
}

/** A mért szakasz: a negyedév és a „mióta mérünk" metszete, legfeljebb mostanáig. */
export function measuredWindow(period: ReportPeriod, monitoredSince: Date | null, now: Date) {
  const from = monitoredSince && monitoredSince > period.start ? monitoredSince : period.start;
  const to = now < period.end ? now : period.end;
  return { from, to, partial: from > period.start };
}

/** Hány mérésnek kellett volna lennie a mért szakaszban. */
export function expectedChecks(period: ReportPeriod, monitoredSince: Date | null, now: Date) {
  const { from, to } = measuredWindow(period, monitoredSince, now);
  return Math.max(0, Math.floor(((to.getTime() - from.getTime()) / HOUR) * CHECKS_PER_HOUR));
}

/**
 * A mérés és a levél ellenőrzése.
 *
 *  · `block` — a levél így nem mehet ki (nincs címzett, nincs mérés).
 *  · `warn`  — kimehet, de egy embernek előbb rá kell néznie.
 *
 * Bármelyik figyelmeztetés elég ahhoz, hogy a levél jóváhagyásra várjon.
 */
export function evaluateReport(input: ReportInputs): ReportWarning[] {
  const warnings: ReportWarning[] = [];
  const block = (message: string) => warnings.push({ level: "block", message });
  const warn = (message: string) => warnings.push({ level: "warn", message });

  if (!input.toEmail) block("Nincs címzett e-mail cím.");
  if (!input.siteUrl) block("Nincs megadva az éles weboldal címe, nincs mit jelenteni.");

  const uptime = input.uptime;
  if (!uptime || uptime.checks === 0 || uptime.uptime_percent === null) {
    block("Erre az időszakra nincs egyetlen mérés sem — a monitor nem futott, vagy az oldal nincs felvéve.");
  } else {
    const expected = expectedChecks(input.period, input.monitoredSince, input.now);
    if (expected > 0 && uptime.checks < expected * MIN_COVERAGE) {
      warn(`Kevesebb mérés van a vártnál: ${uptime.checks} a várt kb. ${expected} helyett. A számok lehet, hogy nem a teljes időszakot fedik.`);
    }
    if (uptime.uptime_percent < 99.5) {
      warn(`Alacsony elérhetőség: ${formatPercent(uptime.uptime_percent)}%. Nézd meg, valódi leállás volt-e, vagy mérési hiba.`);
    }
    if (uptime.avg_response_ms !== null && uptime.avg_response_ms > 2_000) {
      warn(`Szokatlanul lassú átlagos válaszidő: ${uptime.avg_response_ms} ms.`);
    }
  }

  if (!input.lastCheckAt) {
    warn("Nem található utolsó mérés.");
  } else if (input.now.getTime() - input.lastCheckAt.getTime() > MAX_CHECK_AGE_HOURS * HOUR) {
    warn(`A monitor utoljára ${Math.round((input.now.getTime() - input.lastCheckAt.getTime()) / HOUR)} órája mért — lehet, hogy most nem fut.`);
  }

  if (input.liveCheck && !input.liveCheck.ok) {
    warn(`Az oldal a levél összeállításakor NEM válaszolt (${input.liveCheck.error ?? "ismeretlen hiba"}). „Rendben működik" levél most nem mehet ki ellenőrzés nélkül.`);
  }

  if (!input.sslExpiresAt) {
    warn("Nincs adat a biztonsági tanúsítvány (SSL) lejáratáról — a levélből kimarad.");
  } else if (input.sslExpiresAt.getTime() - input.now.getTime() < 14 * DAY) {
    warn(`Az SSL-tanúsítvány 14 napon belül lejár (${formatDateHu(input.sslExpiresAt)}).`);
  }

  if (input.domainExpiresAt && input.domainExpiresAt.getTime() - input.now.getTime() < 30 * DAY) {
    warn(`A domain 30 napon belül lejár (${formatDateHu(input.domainExpiresAt)}).`);
  }

  if (input.isFirstReport) {
    warn("Ez az ügyfél első jelentése — az elsőt mindig ember hagyja jóvá.");
  }

  return warnings;
}

/** Kimehet-e magától: csak ha be van kapcsolva, és SEMMI nem gyanús. */
export function canAutoSend(warnings: ReportWarning[], autosend: boolean) {
  return autosend && warnings.length === 0;
}

export function formatPercent(value: number) {
  const fixed = value >= 99.995 ? "100" : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return fixed.replace(".", ",");
}

export function formatDateHu(date: Date) {
  return date.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", timeZone: "Europe/Budapest" });
}

/** „2027. január 12-ig" — a rag előtt nincs pont. */
export function untilHu(date: Date) {
  return `${formatDateHu(date).replace(/\.$/, "")}-ig`;
}

export function formatSeconds(ms: number) {
  return (ms / 1000).toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCount(value: number) {
  return value.toLocaleString("hu-HU");
}

export function defaultSalutation(contactName: string | null | undefined) {
  const name = contactName?.trim();
  return name ? `Tisztelt ${name}!` : "Tisztelt Ügyfelünk!";
}

export function siteHost(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  }
}
