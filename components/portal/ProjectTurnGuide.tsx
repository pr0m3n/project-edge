import type { Project } from "@/components/ClientPortal";

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
        headline: "Megkaptuk a briefed",
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
      return {
        who: "client",
        headline: "Fizesd be a foglalót",
        detail: "A szerződés megvan — a foglaló indítja el a fejlesztést."
      };
    case "in_progress":
      return {
        who: "studio",
        headline: "Épül az oldalad",
        detail: "Ha van előnézeti link vagy mérföldkő-frissítés, itt fogod látni."
      };
    case "review":
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
    case "launched":
      if (!project.final_payment_paid) {
        return {
          who: "client",
          headline: "Rendezd a hátralékot",
          detail: "Az oldal élesítve — a hátralék kifizetése zárja le a projektet."
        };
      }
      if (!project.maintenance_option) {
        return {
          who: "client",
          headline: "Válaszd ki a karbantartást",
          detail: "Döntsd el lent, kéred-e a havi karbantartást, vagy lezárhatjuk a projektet."
        };
      }
      return {
        who: "studio",
        headline: "Készen vagyunk!",
        detail: "Minden lépés lezárult — köszönjük a közös munkát."
      };
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
