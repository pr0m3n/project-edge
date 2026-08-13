/**
 * Megjelenítési segédfüggvények és állandók az ügyfélkapuhoz.
 *
 * Nincs React-függősége, így a panelek és az admin oldal is használhatja
 * anélkül, hogy a teljes `ClientPortal` komponenst behúzná.
 */

import type { Project } from "@/components/portal/types";

export const statusLabels: Record<string, string> = {
  request_received: "Igény beérkezett",
  planning: "Tervezés",
  offer_sent: "Ajánlat elküldve",
  deposit_pending: "Foglaló fizetésre vár",
  contract_pending: "Szerződés aláírásra vár",
  in_progress: "Kivitelezés",
  review: "Visszajelzés és jóváhagyás",
  launched: "Élesítve",
  paused: "Szünetel",
  closed: "Lezárva",
  deletion_pending: "Törlés jóváhagyásra vár",
  open: "Nyitott",
  answered: "Megválaszolva"
};

export const projectFlow = [
  ["request_received", "Adatlap"],
  ["planning", "Tervezés"],
  ["offer_sent", "Ajánlat"],
  ["contract_pending", "Szerződés"],
  ["deposit_pending", "Foglaló"],
  ["in_progress", "Építés"],
  ["review", "Jóváhagyás"],
  ["launched", "Élesítés"]
];

export function escHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function splitLines(value: string | null) {
  return (value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * A `fallback` azért paraméter, mert a két felület mást mond ugyanarra:
 * az ügyfél „Egyeztetés alapján" szöveget lát, az admin „Nincs ár megadva"-t.
 */
export function formatPrice(value: number | null, currency = "Ft", fallback = "Egyeztetés alapján") {
  if (!value) {
    return fallback;
  }

  return `${new Intl.NumberFormat("hu-HU").format(value)} ${currency}`;
}

export const BANK_TRANSFER_DETAILS = {
  name: "Patrik Boczán",
  accountNumber: "30200014-19613410-97673621",
  iban: "HU51 3020 0014 1961 3410 9767 3621",
  bic: "REVOHUHB"
};

export function transferReference(project: Project) {
  return `PE-${project.id.slice(0, 8).toUpperCase()}`;
}

export function hasOffer(project: Project) {
  return project.offer_status === "sent" || Boolean(project.offer_title || project.offer_price || project.offer_summary);
}

export function parseBrief(value: string | null) {
  const pairs = splitLines(value).map((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      return ["Megjegyzés", line] as const;
    }

    return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()] as const;
  });

  return Object.fromEntries(pairs) as Record<string, string>;
}
