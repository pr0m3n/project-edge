import type { Project } from "@/components/ClientPortal";
import { activeHandoverStep, handoverTurn, isHandoverComplete } from "@/lib/handover";

/**
 * A hiányzó domain önmagában is „rajtad a sor" helyzet: hiába dolgozunk az
 * oldalon, élesíteni nem tudunk, amíg a domain nincs meg. Korábban a sáv ilyenkor
 * is azt írta, hogy „nálunk a labda, nincs teendőd".
 */
function needsDomainFromClient(project: Project) {
  return project.brief_data?.domainStatus === "need" && project.brief_data?.domainPurchaseState !== "submitted";
}

type GuideWho = "client" | "studio" | "neutral";

type Guide = {
  who: GuideWho;
  headline: string;
  detail: string;
};

const tagLabel: Record<GuideWho, string> = {
  client: "Rajtad a sor",
  studio: "Nálunk a labda",
  neutral: "Szünetel"
};

function buildGuide(project: Project): Guide | null {
  switch (project.status) {
    case "request_received":
      return {
        who: "studio",
        headline: "Megkaptuk az adatlapodat",
        detail: "Hamarosan jelentkezünk a részletes ajánlattal — addig nincs teendőd."
      };
    case "planning":
      return {
        who: "studio",
        headline: "Az ajánlaton dolgozunk",
        detail: "Értesítünk, amint elkészült a részletes ajánlat."
      };
    case "offer_sent":
      return {
        who: "client",
        headline: "Nézd át az ajánlatot",
        detail: "Fogadd el, kérj rajta módosítást, vagy utasítsd el lent."
      };
    case "contract_pending":
      return {
        who: "client",
        headline: "Írd alá a szerződést",
        detail: "Ez indítja el a munkát — olvasd át és fogadd el lent."
      };
    case "deposit_pending":
      return project.deposit_transfer_reported
        ? { who: "studio", headline: "Ellenőrizzük a foglalót", detail: "Jelezted az utalást. Most nincs teendőd; értesítünk a jóváhagyás után." }
        : { who: "client", headline: "Fizesd be a foglalót", detail: "A szerződés megvan — utald el, majd lent jelezd az utalást." };
    case "in_progress":
      if (needsDomainFromClient(project)) {
        return {
          who: "client",
          headline: "Hiányzik még a domain",
          detail:
            "Az oldalon dolgozunk, de élesíteni csak a saját domaineddel tudunk. Vedd meg (az útmutató segít), majd lent küldd be az adatait."
        };
      }
      // Kivitelezés alatt is lehet ügyfél-lépés: a fiókok létrehozása és a
      // meghívások az élesítés előtt kellenek, különben az élesítés napján
      // derül ki, hogy nincs hová átadni.
      if (project.handover_steps?.length && handoverTurn(project.handover_steps) === "client") {
        const active = activeHandoverStep(project.handover_steps);
        return {
          who: "client",
          headline: active ? active.def.title : "Egy előkészítő lépés van rajtad",
          detail: "Az oldalon dolgozunk. Közben nyisd meg lent a „Vezetett átadás” részt — ott a linkek és az útmutató is megvan."
        };
      }
      return {
        who: "studio",
        headline: "Épül az oldalad",
        detail: "Ha van előnézeti link vagy mérföldkő-frissítés, itt fogod látni."
      };
    case "review":
      if (project.review_approved) {
        if (needsDomainFromClient(project)) {
          return {
            who: "client",
            headline: "Már csak a domain hiányzik az élesítéshez",
            detail: "Jóváhagytad az oldalt. Vedd meg a domaint az útmutató szerint, majd lent küldd be az adatait."
          };
        }
        return { who: "studio", headline: "Az élesítés következik", detail: "Jóváhagytad az oldalt. Most az adminisztrátor végzi az élesítést." };
      }
      return project.feedback_round >= 2
        ? {
            who: "client",
            headline: "Ha van még kérésed, írj nekünk",
            detail: "A díjmentes visszajelzési körök elfogytak."
          }
        : {
            who: "client",
            headline: "Nézd át és jelezz vissza",
            detail: "Nézd meg az elkészült verziót lent, és írd meg, mit javítsunk — vagy hagyd jóvá."
          };
    case "launched": {
      if (!project.final_payment_paid) {
        return project.final_transfer_reported
          ? { who: "studio", headline: "Ellenőrizzük a hátralékot", detail: "Jelezted az utalást. Most nincs teendőd." }
          : { who: "client", headline: "Rendezd a hátralékot", detail: "Utald el a hátralékot, majd lent jelezd az utalást." };
      }

      // Élesítés után a vezetett átadás dönti el, kinél van a labda — így nem
      // kell külön egyeztetni, ki jön a Vercel / Supabase / Resend lépésekben.
      const steps = project.handover_steps;
      if (steps?.length && !isHandoverComplete(steps)) {
        const active = activeHandoverStep(steps);
        return handoverTurn(steps) === "client"
          ? {
              who: "client",
              headline: active ? active.def.title : "Egy átadási lépés van rajtad",
              detail: "Nyisd meg lent a „Vezetett átadás” részt — ott találod a linkeket és az útmutatót is."
            }
          : {
              who: "studio",
              headline: "Az átadáson dolgozunk",
              detail: active ? `${active.def.title} — nincs teendőd, értesítést kapsz, amint továbbmegy.` : "Nincs teendőd."
            };
      }

      return {
        who: "client",
        headline: "Zárd le a kész projektet",
        detail: "A lezárással elindul a 30 napos díjmentes technikai garancia. Ezután csak akkor kell jelezned, ha valódi működési hibát találsz."
      };
    }
    case "paused":
      return {
        who: "neutral",
        headline: "A projekt jelenleg szünetel",
        detail: "Ha szeretnéd folytatni, írj nekünk üzenetet."
      };
    default:
      return null;
  }
}

// Client-facing equivalent of AdminDashboard's renderProjectGuide: one clear
// "whose turn is it / what to do" banner per status. Suppressed while a
// deletion is pending — the existing yellow delete_requested banner already
// covers that case, and stacking two status explanations would contradict
// the point of having a single focal message.

// Reused by the project switcher to pick a sensible default: prefer a
// project where the client actually has something to do over the merely
// newest one.
export function isClientTurn(project: Project): boolean {
  if (project.delete_requested) {
    return false;
  }
  return buildGuide(project)?.who === "client";
}

export function ProjectTurnGuide({ project }: { project: Project }) {
  if (project.delete_requested) {
    return null;
  }

  const guide = buildGuide(project);
  if (!guide) {
    return null;
  }

  const modifierClass =
    guide.who === "client" ? "turn-guide--action" : guide.who === "neutral" ? "turn-guide--paused" : "turn-guide--waiting";

  return (
    <div className={`turn-guide ${modifierClass}`}>
      <span className="turn-guide-tag">{tagLabel[guide.who]}</span>
      <strong className="turn-guide-headline">{guide.headline}</strong>
      <p className="turn-guide-detail">{guide.detail}</p>
    </div>
  );
}
