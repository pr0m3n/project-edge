import {
  dayState,
  formatCount,
  formatDateHu,
  formatPercent,
  formatSeconds,
  measuredWindow,
  periodDays,
  siteHost,
  untilHu,
  type DayState,
  type ReportInputs
} from "@/lib/status-report";

/**
 * A negyedéves állapotjelentés levele.
 *
 * Szándékosan NEM a `lib/email-template.ts` arculata: az a rendszerleveleké
 * (tegező, ügyfélkapu-gombbal). Ezt olyan ügyfél kapja, akinek nincs
 * ügyfélkapuja, és akivel magázódunk — ezért magázó, gomb nélküli, és a
 * válasz egyenesen a szolgáltatóhoz megy.
 *
 * Felépítés: sötét fejléc a nagy elérhetőségi számmal és a negyedév napi
 * sávjával (mint egy status-oldal), alatta pipás lista arról, mit figyelünk.
 * Levelezőbarát: táblázatok, inline stílus, webfont nélkül; a sáv cellái
 * százalékos szélességűek, így telefonon is kifér.
 *
 * SOHA nem állít többet, mint amit a mérés mutat: mérés nélkül nincs
 * „rendben működött", és a fennakadás is benne van.
 */

export type StatusReportEmail = { subject: string; preheader: string; html: string; text: string };

export type StatusReportSender = { name: string; role: string; email: string; phone?: string | null };

const C = {
  page: "#ecebe6",
  night: "#11171c",
  nightLine: "#2a333b",
  onNight: "#ffffff",
  onNightMuted: "#97a1aa",
  card: "#ffffff",
  ink: "#151a1f",
  body: "#414a53",
  muted: "#7d8690",
  line: "#ebe9e3",
  foot: "#f7f6f2",
  ember: "#ff5722",
  ok: "#34b37a",
  okSoft: "#e6f5ed",
  okInk: "#1f7a50",
  warn: "#f0a63a",
  warnSoft: "#fdf2e0",
  warnInk: "#9a6200",
  down: "#e5534b",
  none: "#39434c"
};

const DAY_COLOR: Record<DayState, string> = { ok: C.ok, partial: C.warn, down: C.down, none: C.none };

const SANS = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";
const MONTHS = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

/** A levél mondatai — a HTML és a sima szöveges változat ugyanebből épül. */
export function statusReportSentences(input: ReportInputs) {
  const host = siteHost(input.siteUrl) ?? input.projectTitle;
  const uptime = input.uptime;
  const window = measuredWindow(input.period, input.monitoredSince, input.now);
  const checks = uptime?.checks ?? 0;
  const failures = uptime?.failures ?? 0;
  const measured = Boolean(uptime && checks > 0 && uptime.uptime_percent !== null);

  const since = window.partial ? `${formatDateHu(window.from)} óta` : "a negyedév során";
  const avg = uptime?.avg_response_ms;
  const intro = measured
    ? failures === 0
      ? `Röviden jelentkezem a weboldaluk állapotával: a ${host} ${since} minden óránkénti ellenőrzéskor elérhető volt, összesen ${formatCount(checks)} alkalommal${typeof avg === "number" ? `, átlagosan ${formatSeconds(avg)} másodperces válaszidővel` : ""}.`
      : `Röviden jelentkezem a weboldaluk állapotával: a ${host} ${since} ${formatCount(checks)} óránkénti ellenőrzésből ${formatCount(checks - failures)} alkalommal volt elérhető (${formatPercent(uptime?.uptime_percent ?? 0)}%). ${formatCount(failures)} alkalommal rövid fennakadást mértem, ezek a fenti sávon is látszanak.`
    : `Röviden jelentkezem a weboldaluk állapotával. A ${host} oldalt ${since} óránként ellenőrzöm.`;

  const closing = "Ha bármit módosítanának az oldalon, például a nyitvatartást vagy egy elérhetőséget, elég erre a levélre válaszolni, és elintézem.";

  return { host, intro, closing, measured, healthy: measured && failures === 0 };
}

type CheckRow = { label: string; value: string; state: "ok" | "warn" };

function checkRows(input: ReportInputs): CheckRow[] {
  const rows: CheckRow[] = [];
  const uptime = input.uptime;
  if (uptime && uptime.checks > 0 && uptime.uptime_percent !== null) {
    rows.push({
      label: "Elérhetőség",
      value: uptime.failures === 0
        ? `Mind a ${formatCount(uptime.checks)} ellenőrzéskor elérhető volt`
        : `${formatPercent(uptime.uptime_percent)}% · ${formatCount(uptime.failures)} rövid fennakadás`,
      state: uptime.failures === 0 ? "ok" : "warn"
    });
    if (uptime.avg_response_ms !== null) {
      rows.push({ label: "Válaszidő", value: `Átlagosan ${formatSeconds(uptime.avg_response_ms)} másodperc`, state: uptime.avg_response_ms <= 1500 ? "ok" : "warn" });
    }
  }
  if (input.sslExpiresAt) {
    rows.push({ label: "Biztonsági tanúsítvány (SSL)", value: `Érvényes ${untilHu(input.sslExpiresAt)}, automatikusan megújul`, state: "ok" });
  }
  if (input.domainName) {
    rows.push({
      label: "Domain",
      value: input.domainExpiresAt ? `${input.domainName} · ${untilHu(input.domainExpiresAt)} rendezett` : `${input.domainName} · aktív`,
      state: "ok"
    });
  }
  if (typeof input.psiPerformance === "number") {
    rows.push({ label: "Sebesség (Google PageSpeed)", value: `${input.psiPerformance}/100`, state: input.psiPerformance >= 70 ? "ok" : "warn" });
  }
  return rows;
}

/** A negyedév napi sávja: egy cella naponta, százalékos szélességgel. */
function stripHtml(input: ReportInputs) {
  const days = periodDays(input.period);
  const byDay = new Map(input.daily.map((entry) => [entry.day, entry]));
  const cellWidth = (100 / days.length).toFixed(3);
  const cells = days.map((day) => {
    const color = DAY_COLOR[dayState(byDay.get(day))];
    return `<td width="${cellWidth}%" style="padding:0 1px;"><div style="height:34px;background:${color};border-radius:2px;font-size:0;line-height:0;">&nbsp;</div></td>`;
  }).join("");

  // Hónapnevek a sáv alatt, a hónap napjainak arányában.
  const months: Array<{ name: string; count: number }> = [];
  for (const day of days) {
    const name = MONTHS[Number(day.slice(5, 7)) - 1];
    const last = months[months.length - 1];
    if (last && last.name === name) last.count += 1;
    else months.push({ name, count: 1 });
  }
  const monthRow = months.map((month) => `<td width="${((month.count / days.length) * 100).toFixed(2)}%" style="${SANS}padding-top:8px;font-size:11px;color:${C.onNightMuted};">${esc(month.name)}</td>`).join("");

  const legend = ([["ok", "rendben"], ["partial", "fennakadás"], ["none", "nem mért"]] as Array<[DayState, string]>)
    .map(([state, label]) => `<span style="display:inline-block;margin-right:14px;white-space:nowrap;"><span style="display:inline-block;width:9px;height:9px;border-radius:2px;background:${DAY_COLOR[state]};vertical-align:middle;"></span>&nbsp;<span style="vertical-align:middle;">${label}</span></span>`)
    .join("");

  return `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>${cells}</tr></table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><tr>${monthRow}</tr></table>
            <div style="${SANS}margin-top:12px;font-size:11px;color:${C.onNightMuted};">${legend}</div>`;
}

export function buildStatusReportEmail(input: ReportInputs, sender: StatusReportSender): StatusReportEmail {
  const s = statusReportSentences(input);
  const uptime = input.uptime;
  const subject = `A weboldal állapota · ${input.period.label} · ${input.projectTitle}`;
  const preheader = s.measured
    ? `${s.host}: ${formatPercent(uptime?.uptime_percent ?? 0)}% elérhetőség, ${formatCount(uptime?.checks ?? 0)} ellenőrzés.`
    : `${s.host} negyedéves állapotjelentése.`;
  const rows = checkRows(input);

  const status = !s.measured
    ? { text: "Az első mérések folyamatban", color: C.onNightMuted }
    : s.healthy
      ? { text: "Minden ellenőrzéskor elérhető volt", color: C.ok }
      : { text: `${formatCount(uptime?.failures ?? 0)} rövid fennakadás az időszakban`, color: C.warn };

  const bigNumber = s.measured ? `${formatPercent(uptime?.uptime_percent ?? 0)}%` : "—";
  const bigCaption = s.measured
    ? `elérhetőség<br>${formatCount(uptime?.checks ?? 0)} óránkénti ellenőrzésből`
    : "elérhetőség<br>még nincs elég mérés";

  const rowsHtml = rows.map((row, index) => {
    const ok = row.state === "ok";
    const border = index ? `border-top:1px solid ${C.line};` : "";
    return `<tr>
              <td width="36" style="padding:14px 0;${border}vertical-align:top;">
                <div style="width:24px;height:24px;border-radius:12px;background:${ok ? C.okSoft : C.warnSoft};color:${ok ? C.okInk : C.warnInk};${SANS}font-size:13px;font-weight:700;line-height:24px;text-align:center;">${ok ? "&#10003;" : "!"}</div>
              </td>
              <td style="${SANS}padding:14px 0;${border}vertical-align:top;">
                <div style="font-size:14px;font-weight:600;color:${C.ink};">${esc(row.label)}</div>
                <div style="font-size:14px;color:${C.body};margin-top:2px;">${esc(row.value)}</div>
              </td>
            </tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html lang="hu">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <title>${esc(subject)}</title>
    <style>
      @media (max-width: 480px) {
        .pe-pad { padding-left: 22px !important; padding-right: 22px !important; }
        .pe-big { font-size: 44px !important; }
        .pe-host { font-size: 22px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${C.page};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
      <tr><td align="center" style="padding:28px 12px 36px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">

          <tr><td class="pe-pad" style="background:${C.night};border-radius:16px 16px 0 0;padding:26px 36px 30px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="${SANS}font-size:15px;font-weight:800;letter-spacing:.01em;color:${C.onNight};">Project<span style="color:${C.ember};">Edge</span></td>
              <td align="right" style="${SANS}"><span style="display:inline-block;font-size:10.5px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${C.onNightMuted};border:1px solid ${C.nightLine};border-radius:999px;padding:5px 10px;">Negyedéves jelentés</span></td>
            </tr></table>

            <div style="${SANS}font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:${C.onNightMuted};margin-top:34px;">${esc(input.period.label)}</div>
            <div class="pe-host" style="${SANS}font-size:26px;font-weight:700;color:${C.onNight};margin-top:6px;word-break:break-word;overflow-wrap:anywhere;">${esc(s.host)}</div>

            <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr>
              <td class="pe-big" style="${SANS}font-size:56px;font-weight:800;line-height:1;letter-spacing:-.02em;color:${C.onNight};vertical-align:bottom;padding-right:14px;white-space:nowrap;">${bigNumber}</td>
              <td style="${SANS}font-size:13px;line-height:1.45;color:${C.onNightMuted};vertical-align:bottom;padding-bottom:4px;">${bigCaption}</td>
            </tr></table>

            <div style="${SANS}font-size:13px;font-weight:600;color:${status.color};margin:14px 0 22px 0;">&#9679;&nbsp; ${esc(status.text)}</div>
${stripHtml(input)}
          </td></tr>

          <tr><td class="pe-pad" style="background:${C.card};padding:32px 36px 8px 36px;${SANS}font-size:15px;line-height:1.65;color:${C.body};">
            <p style="margin:0 0 14px 0;color:${C.ink};font-weight:600;">${esc(input.salutation)}</p>
            <p style="margin:0;">${esc(s.intro)}</p>
          </td></tr>
${rows.length ? `
          <tr><td class="pe-pad" style="background:${C.card};padding:26px 36px 6px 36px;">
            <div style="${SANS}font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${C.muted};margin-bottom:4px;">Amit figyelek</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
          </td></tr>` : ""}

          <tr><td class="pe-pad" style="background:${C.card};padding:22px 36px 30px 36px;${SANS}font-size:15px;line-height:1.65;color:${C.body};">
            <p style="margin:0 0 22px 0;">${esc(s.closing)}</p>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:middle;padding-right:14px;">
                <div style="width:44px;height:44px;border-radius:22px;background:${C.night};color:${C.onNight};${SANS}font-size:15px;font-weight:700;line-height:44px;text-align:center;">${esc(initials(sender.name))}</div>
              </td>
              <td style="${SANS}vertical-align:middle;">
                <div style="font-size:15px;font-weight:700;color:${C.ink};">${esc(sender.name)}</div>
                <div style="font-size:13px;color:${C.muted};margin-top:1px;">${esc(sender.role)}</div>
                <div style="font-size:13px;margin-top:3px;"><a href="mailto:${esc(sender.email)}" style="color:${C.ember};text-decoration:none;">${esc(sender.email)}</a>${sender.phone ? `<span style="color:${C.muted};"> · </span><span style="color:${C.muted};white-space:nowrap;">${esc(sender.phone)}</span>` : ""}</div>
              </td>
            </tr></table>
          </td></tr>

          <tr><td class="pe-pad" style="background:${C.foot};border-top:1px solid ${C.line};border-radius:0 0 16px 16px;padding:20px 36px 24px 36px;${SANS}font-size:11.5px;line-height:1.6;color:${C.muted};">
            A számok az oldal óránkénti, automatikus ellenőrzéséből származnak. Ezt a jelentést negyedévente küldöm a weboldal üzemeltetésének részeként; ha nem szeretnének ilyen levelet kapni, elég egy rövid válasz.
          </td></tr>

        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    input.salutation,
    "",
    s.intro,
    "",
    ...rows.map((row) => `${row.state === "ok" ? "✓" : "!"} ${row.label}: ${row.value}`),
    "",
    s.closing,
    "",
    "Üdvözlettel,",
    sender.name,
    sender.role,
    [sender.email, sender.phone].filter(Boolean).join(" · ")
  ].join("\n");

  return { subject, preheader, html, text };
}
