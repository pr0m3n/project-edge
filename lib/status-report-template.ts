import {
  formatCount,
  formatDateHu,
  formatPercent,
  formatSeconds,
  measuredWindow,
  siteHost,
  untilHu,
  type ReportInputs
} from "@/lib/status-report";

/**
 * A negyedéves állapotjelentés levele.
 *
 * Szándékosan NEM a `lib/email-template.ts` arculata: az a rendszerleveleké
 * (tegező, ügyfélkapu-gombbal, technikai címkékkel). Ezt olyan ügyfél kapja,
 * akinek nincs ügyfélkapuja, és akivel magázódunk — ezért magázó, gomb
 * nélküli, és a válasz egyenesen a szolgáltatóhoz megy.
 *
 * Levelezőbarát felépítés: táblázatok, inline stílus, webfont nélkül.
 * Tiszta függvény, hogy az admin előnézete pontosan ezt mutassa.
 */

export type StatusReportEmail = { subject: string; preheader: string; html: string; text: string };

export type StatusReportSender = { name: string; role: string; email: string; phone?: string | null };

const C = {
  bg: "#f1f0ec",
  card: "#ffffff",
  ink: "#1b2128",
  body: "#3d4651",
  muted: "#7b8590",
  line: "#e6e4de",
  soft: "#f7f6f3",
  accent: "#2f6f73",
  ok: "#2e7d4f",
  okSoft: "#e7f3ec",
  warn: "#9a6200",
  warnSoft: "#fbf1dd"
};

function esc(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** A levél mondatai — a HTML és a sima szöveges változat ugyanebből épül. */
export function statusReportSentences(input: ReportInputs) {
  const host = siteHost(input.siteUrl) ?? input.projectTitle;
  const uptime = input.uptime;
  const window = measuredWindow(input.period, input.monitoredSince, input.now);
  const failures = uptime?.failures ?? 0;
  const checks = uptime?.checks ?? 0;

  const intro = window.partial
    ? `Röviden jelentkezem a weboldaluk állapotával. A ${host} oldalt ${formatDateHu(window.from)} óta óránként ellenőrzöm.`
    : `Röviden jelentkezem a weboldaluk állapotával. A ${host} oldalt a negyedév során óránként ellenőriztem.`;

  const result = !uptime || checks === 0
    ? ""
    : failures === 0
      ? `${formatCount(checks)} ellenőrzésből mindegyik alkalommal elérhető volt${uptime.avg_response_ms !== null ? `, és átlagosan ${formatSeconds(uptime.avg_response_ms)} másodperc alatt válaszolt` : ""}.`
      : `${formatCount(checks)} ellenőrzésből ${formatCount(checks - failures)} alkalommal volt elérhető (${formatPercent(uptime.uptime_percent ?? 0)}%); ${formatCount(failures)} alkalommal rövid fennakadást mértem.`;

  const closing = "Ha bármit módosítanának az oldalon, például a nyitvatartást vagy egy elérhetőséget, elég erre a levélre válaszolni.";

  return { host, intro, result, closing, healthy: failures === 0 };
}

function detailRows(input: ReportInputs) {
  const rows: Array<{ label: string; value: string }> = [];
  if (input.sslExpiresAt) {
    rows.push({ label: "Biztonsági tanúsítvány (SSL)", value: `Érvényes ${untilHu(input.sslExpiresAt)}, automatikusan megújul` });
  }
  if (input.domainName) {
    rows.push({
      label: "Domain",
      value: input.domainExpiresAt ? `${input.domainName} · ${untilHu(input.domainExpiresAt)} rendezett` : input.domainName
    });
  }
  if (typeof input.psiPerformance === "number") {
    rows.push({ label: "Sebesség (Google PageSpeed)", value: `${input.psiPerformance}/100` });
  }
  return rows;
}

export function buildStatusReportEmail(input: ReportInputs, sender: StatusReportSender): StatusReportEmail {
  const s = statusReportSentences(input);
  const uptime = input.uptime;
  const subject = `A weboldal állapota · ${input.period.label} · ${input.projectTitle}`;
  const preheader = s.result ? `${s.host}: ${s.result}` : `${s.host} negyedéves állapotjelentése.`;
  const rows = detailRows(input);

  const kpis = uptime && uptime.checks > 0 ? [
    { label: "Elérhetőség", value: `${formatPercent(uptime.uptime_percent ?? 0)}%` },
    { label: "Válaszidő", value: uptime.avg_response_ms !== null ? `${formatSeconds(uptime.avg_response_ms)} mp` : "—" },
    { label: "Ellenőrzés", value: formatCount(uptime.checks) }
  ] : [];

  const pill = s.healthy
    ? { text: "Kifogástalanul működött", fg: C.ok, bg: C.okSoft }
    : { text: `Működik · ${formatCount(uptime?.failures ?? 0)} rövid fennakadással`, fg: C.warn, bg: C.warnSoft };

  const font = "font-family:Georgia,'Times New Roman',serif;";
  const sans = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;";

  const kpiHtml = kpis.length ? `
          <tr><td style="padding:4px 28px 8px 28px;">
            <table class="pe-kpi" role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:0;">
              <tr>
                ${kpis.map((kpi, index) => `<td width="33%" style="${sans}padding:14px 10px;background:${C.soft};border:1px solid ${C.line};${index === 0 ? "border-radius:10px 0 0 10px;" : index === kpis.length - 1 ? "border-radius:0 10px 10px 0;border-left:0;" : "border-left:0;"}vertical-align:top;">
                  <div style="font-size:10.5px;letter-spacing:.04em;text-transform:uppercase;color:${C.muted};">${esc(kpi.label)}</div>
                  <div style="${font}font-size:20px;line-height:1.2;color:${C.ink};margin-top:6px;">${esc(kpi.value)}</div>
                </td>`).join("")}
              </tr>
            </table>
          </td></tr>` : "";

  const rowsHtml = rows.length ? `
          <tr><td class="pe-pad" style="padding:18px 36px 4px 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${rows.map((row) => `<tr>
                <td style="${sans}padding:11px 0;border-top:1px solid ${C.line};font-size:13px;color:${C.muted};vertical-align:top;width:44%;">${esc(row.label)}</td>
                <td style="${sans}padding:11px 0;border-top:1px solid ${C.line};font-size:14px;color:${C.ink};vertical-align:top;">${esc(row.value)}</td>
              </tr>`).join("")}
            </table>
          </td></tr>` : "";

  const html = `<!DOCTYPE html>
<html lang="hu">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <style>
      @media (max-width: 420px) {
        .pe-kpi td { display: block !important; width: auto !important; border-radius: 0 !important; border-left: 1px solid ${C.line} !important; border-top: 0 !important; }
        .pe-kpi td:first-child { border-top: 1px solid ${C.line} !important; border-radius: 10px 10px 0 0 !important; }
        .pe-kpi td:last-child { border-radius: 0 0 10px 10px !important; }
        .pe-pad { padding-left: 20px !important; padding-right: 20px !important; }
      }
    </style>
    <title>${esc(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${C.bg};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
      <tr><td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.card};border-radius:14px;border:1px solid ${C.line};">
          <tr><td style="height:4px;background:${C.accent};border-radius:14px 14px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
          <tr><td class="pe-pad" style="padding:22px 36px 0 36px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td style="${sans}font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${C.ink};">ProjectEdge</td>
              <td align="right" style="${sans}font-size:12px;color:${C.muted};">Weboldal-állapot · ${esc(input.period.label)}</td>
            </tr></table>
          </td></tr>
          <tr><td class="pe-pad" style="padding:30px 36px 6px 36px;">
            <div style="${font}font-size:28px;line-height:1.2;color:${C.ink};word-break:break-word;overflow-wrap:anywhere;">${esc(s.host)}</div>
            <div style="margin-top:12px;"><span style="${sans}display:inline-block;font-size:13px;font-weight:600;color:${pill.fg};background:${pill.bg};border-radius:999px;padding:6px 12px;">&#9679;&nbsp; ${esc(pill.text)}</span></div>
          </td></tr>
          <tr><td class="pe-pad" style="${sans}padding:22px 36px 14px 36px;font-size:15px;line-height:1.65;color:${C.body};">
            <p style="margin:0 0 14px 0;color:${C.ink};">${esc(input.salutation)}</p>
            <p style="margin:0 0 14px 0;">${esc(s.intro)}${s.result ? ` ${esc(s.result)}` : ""}</p>
          </td></tr>
          ${kpiHtml}
          ${rowsHtml}
          <tr><td class="pe-pad" style="${sans}padding:22px 36px 6px 36px;font-size:15px;line-height:1.65;color:${C.body};">
            <p style="margin:0 0 18px 0;">${esc(s.closing)}</p>
            <p style="margin:0;color:${C.ink};">Üdvözlettel,</p>
            <p style="margin:6px 0 0 0;color:${C.ink};"><strong>${esc(sender.name)}</strong><br><span style="color:${C.muted};font-size:13px;">${esc(sender.role)}</span></p>
            <p style="margin:8px 0 0 0;font-size:13px;color:${C.muted};"><a href="mailto:${esc(sender.email)}" style="color:${C.accent};text-decoration:none;">${esc(sender.email)}</a>${sender.phone ? ` · ${esc(sender.phone)}` : ""}</p>
          </td></tr>
          <tr><td class="pe-pad" style="${sans}padding:24px 36px 28px 36px;font-size:11.5px;line-height:1.6;color:${C.muted};border-top:1px solid ${C.line};">
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
    `${s.intro}${s.result ? ` ${s.result}` : ""}`,
    "",
    ...kpis.map((kpi) => `${kpi.label}: ${kpi.value}`),
    ...rows.map((row) => `${row.label}: ${row.value}`),
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
