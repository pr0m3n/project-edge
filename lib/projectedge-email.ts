import "server-only";

import { buildProjectEdgeEmailHtml, type EmailDetail, type ProjectEdgeEmailContent } from "@/lib/email-template";

export type { EmailDetail };

export type ProjectEdgeEmailInput = ProjectEdgeEmailContent & {
  to: string;
  /**
   * Felülírja a `Reply-To` fejlécet. Az ÉRTESÍTŐ leveleknél (amiket a stúdió
   * kap) ide az érdeklődő címe kerül, hogy a levelezőben a „Válasz" gomb neki
   * menjen, ne magunknak. A látogatónak küldött levelekben nem használjuk:
   * ott a stúdió címe a helyes válaszcím.
   */
  replyTo?: string;
};

export type ProjectEdgeEmailResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * ProjectEdge-arculatú tranzakciós levél küldése Resenden át.
 *
 * A végpont szándékosan hangosan hibázik, ha a szolgáltató nincs beállítva:
 * a csendben sikeresnek látszó, valójában el nem küldött levél volt a régi
 * folyamat legnagyobb hibája.
 *
 * A MEGJELENÉS a `lib/email-template.ts`-ben él. Az elválasztás nem esztétikai:
 * amíg a sablon ebben a `server-only` fájlban volt, addig egy levelet csak úgy
 * lehetett megnézni, hogy tényleg kiküldtük valakinek.
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

  const from = process.env.RESEND_FROM_EMAIL || "ProjectEdge Studio <info@projectedge.hu>";
  const defaultReplyTo = process.env.RESEND_REPLY_TO || "info@projectedge.hu";
  /* Csak érvényes címet engedünk a fejlécbe: a hívó által adott érték
     végső soron látogatói adat, egy törött cím pedig a Resend hívást bukná. */
  const overrideReplyTo = input.replyTo?.trim().toLowerCase();
  const replyTo = overrideReplyTo && isValidEmail(overrideReplyTo) ? overrideReplyTo : defaultReplyTo;

  const { html, text, unsubscribeUrl } = buildProjectEdgeEmailHtml(input, {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.projectedge.hu",
    replyTo: defaultReplyTo
  });

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
        // A `List-Unsubscribe-Post` nélkül a Gmail nem jeleníti meg a saját
        // leiratkozó gombját — a két fejléc csak együtt ér valamit.
        ...(unsubscribeUrl ? {
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
          }
        } : {}),
        text
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
