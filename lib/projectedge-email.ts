import "server-only";

type EmailDetail = {
  label: string;
  value: string;
};

export type ProjectEdgeEmailInput = {
  to: string;
  subject: string;
  eyebrow?: string;
  preheader?: string;
  message: string;
  link?: string | null;
  linkLabel?: string;
  details?: EmailDetail[];
  terminalLabel?: string;
  tags?: string[];
};

export type ProjectEdgeEmailResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function messageHtml(message: string) {
  return escapeHtml(message)
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 14px 0;">${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function terminalSummary(message: string) {
  const firstLine = message.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || "Értesítés rögzítve.";
  return escapeHtml(firstLine.slice(0, 180));
}

function detailsHtml(details: EmailDetail[] = []) {
  const visibleDetails = details.filter((detail) => detail.value.trim());
  if (!visibleDetails.length) return "";

  return `
    <tr><td style="padding:0 32px 26px 32px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#24262b;border-radius:12px;border-collapse:separate;overflow:hidden;">
        <tr><td style="padding:22px 24px 12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:1.5px;color:#ff8f5f;text-transform:uppercase;">Részletek</td></tr>
        <tr><td style="padding:0 24px 22px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            ${visibleDetails.map((detail) => `
              <tr>
                <td width="24" valign="top" style="padding:0 0 10px 0;"><div style="width:16px;height:16px;border-radius:50%;background:#ff5a1f;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:bold;color:#24262b;line-height:16px;">✓</div></td>
                <td valign="top" style="padding:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.45;color:#e6e6e4;"><span style="color:#9a9a96;">${escapeHtml(detail.label)}:</span> <strong style="color:#fff;">${escapeHtml(detail.value)}</strong></td>
              </tr>`).join("")}
          </table>
        </td></tr>
      </table>
    </td></tr>`;
}

function tagsHtml(tags: string[] = []) {
  const visibleTags = tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 6);
  if (!visibleTags.length) return "";

  return `
    <tr><td style="padding:0 32px 26px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        ${visibleTags.map((tag, index) => `
          <td style="padding:7px 14px;border:1px solid #24262b;border-radius:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;color:#24262b;${index ? "padding-left:14px;" : ""}">${escapeHtml(tag)}</td>
          ${index < visibleTags.length - 1 ? '<td style="width:8px;">&nbsp;</td>' : ''}
        `).join("")}
      </tr></table>
    </td></tr>`;
}

/**
 * Sends a ProjectEdge-branded transactional email through Resend.
 * The endpoint intentionally fails loudly when the provider is not configured;
 * silently simulating delivery was the reason the old flow looked successful.
 */
export async function sendProjectEdgeEmail(input: ProjectEdgeEmailInput): Promise<ProjectEdgeEmailResult> {
  const to = input.to.trim().toLowerCase();
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY nincs beállítva a Vercel éles környezetében." };
  }
  if (!isValidEmail(to)) {
    return { ok: false, error: "Érvénytelen címzett email cím." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.projectedge.hu";
  const from = process.env.RESEND_FROM_EMAIL || "ProjectEdge Studio <info@projectedge.hu>";
  const replyTo = process.env.RESEND_REPLY_TO || "info@projectedge.hu";
  const safeLink = input.link && input.link.startsWith("/") && !input.link.startsWith("//")
    ? `${siteUrl}${input.link}`
    : null;
  const title = escapeHtml(input.subject.slice(0, 200));
  const eyebrow = escapeHtml(input.eyebrow || "PROJECTEDGE · ÜGYFÉLKAPU");
  const preheader = escapeHtml(input.preheader || input.subject);
  const terminalLabel = escapeHtml(input.terminalLabel || "projectedge.notify");
  const terminalMessage = terminalSummary(input.message);
  const tags = input.tags?.length ? input.tags : ["Ügyfélkapu", "Next.js", "Supabase", "Resend"];

  const html = `<!doctype html>
<html lang="hu">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#eeede8;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eeede8;border-collapse:collapse;">
      <tr><td style="padding:0 0 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:#eeede8;border-collapse:collapse;">
          <tr><td style="background:#24262b;padding:20px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td valign="middle" width="70"><img src="${siteUrl}/logo/pe-mark-ink.png" width="52" alt="ProjectEdge" style="display:block;width:52px;height:auto;border:0;filter:brightness(0) invert(1);"></td>
              <td valign="middle" align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;color:#9a9a96;text-transform:uppercase;">Digital Build Studio</td>
            </tr></table>
          </td></tr>
          <tr><td style="background:#ff5a1f;padding:10px 32px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#fff4ee;">${eyebrow}</td></tr>
          <tr><td style="padding:36px 32px 6px 32px;font-family:'Courier New',Courier,monospace;font-size:12px;color:#8a8a84;">// projectedge.hu</td></tr>
          <tr><td style="padding:6px 32px 22px 32px;font-family:Arial,Helvetica,sans-serif;font-size:34px;line-height:1.12;font-weight:900;letter-spacing:-0.5px;color:#1c1d20;">${title}</td></tr>
          <tr><td style="padding:0 32px 24px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#24262b;border-radius:10px;border-collapse:separate;overflow:hidden;">
              <tr><td style="padding:14px 20px;border-bottom:1px solid #34363c;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td style="padding-right:6px;"><span style="display:block;width:9px;height:9px;border-radius:50%;background:#ff5a1f;font-size:0;line-height:0;">&nbsp;</span></td>
                  <td style="padding-right:6px;"><span style="display:block;width:9px;height:9px;border-radius:50%;background:#4a4c52;font-size:0;line-height:0;">&nbsp;</span></td>
                  <td style="padding-right:10px;"><span style="display:block;width:9px;height:9px;border-radius:50%;background:#4a4c52;font-size:0;line-height:0;">&nbsp;</span></td>
                  <td style="font-family:'Courier New',Courier,monospace;font-size:11px;color:#8f9096;">${terminalLabel}</td>
                </tr></table>
              </td></tr>
              <tr><td style="padding:16px 20px;font-family:'Courier New',Courier,monospace;font-size:13px;line-height:1.9;color:#c7c8cc;"><span style="color:#ff5a1f;">$</span> projectedge.notify --status sent<br><span style="color:#ff5a1f;">→</span> ${terminalMessage}</td></tr>
            </table>
          </td></tr>
          <tr><td style="padding:0 32px 26px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#3a3b3f;">${messageHtml(input.message)}</td></tr>
          ${detailsHtml(input.details)}
          ${tagsHtml(tags)}
          ${safeLink ? `<tr><td style="padding:0 32px 28px 32px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#ff5a1f" style="border-radius:30px;"><a href="${escapeHtml(safeLink)}" style="display:block;padding:15px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#fff4ee;text-decoration:none;border-radius:30px;">${escapeHtml(input.linkLabel || "Megnyitás az ügyfélkapun")} →</a></td></tr></table></td></tr>` : ""}
          <tr><td style="padding:0 32px 36px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#3a3b3f;">Üdvözlettel,<br><strong style="color:#1c1d20;">Patrik</strong><br><span style="color:#7a7b76;">alapító · fejlesztő · ProjectEdge</span></td></tr>
          <tr><td style="padding:20px 32px 32px 32px;border-top:1px solid #dedcd4;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#8f8f88;">ProjectEdge — egyedi weboldalak, ügyfélkapuk és üzleti rendszerek.<br><a href="${siteUrl}" style="color:#24262b;text-decoration:underline;">projectedge.hu</a> · <a href="mailto:${replyTo}" style="color:#24262b;text-decoration:underline;">${escapeHtml(replyTo)}</a><br><br>Ez egy automatikus értesítés a ProjectEdge ügyfélkapujából.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: replyTo,
        subject: input.subject.slice(0, 200),
        html,
        text: `${input.subject}\n\n${input.message}${safeLink ? `\n\n${input.linkLabel || "Megnyitás az ügyfélkapun"}: ${safeLink}` : ""}`
      })
    });

    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Resend API hiba:", responseBody);
      return { ok: false, error: `Resend API hiba (${response.status}).` };
    }

    return { ok: true, id: typeof responseBody?.id === "string" ? responseBody.id : undefined };
  } catch (error) {
    console.error("Emailküldési hálózati hiba:", error);
    return { ok: false, error: "Az email szolgáltató nem volt elérhető." };
  }
}
