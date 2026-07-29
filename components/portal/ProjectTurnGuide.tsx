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
      return {
        who: "studio",
        headline: "Épül az oldalad",
        detail: "Ha van előnézeti link vagy mérföldkő-frissítés, itt fogod látni."
      };
    case "review":
      if (project.review_approved) {
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
    case "launched":
      if (!project.final_payment_paid) {
        return project.final_transfer_reported
          ? { who: "studio", headline: "Ellenőrizzük a hátralékot", detail: "Jelezted az utalást. Most nincs teendőd." }
          : { who: "client", headline: "Rendezd a hátralékot", detail: "Utald el a hátralékot, majd lent jelezd az utalást." };
      }
      if (!project.maintenance_option) {
        return {
          who: "client",
          headline: "Dönts a 30 napos utóellenőrzésről",
          detail: "Kérj egyszeri árat az indulás utáni ellenőrzésre, vagy zárd le nélküle a projektet."
        };
      }
      if (project.followup_check_status === "requested" && !project.followup_check_fee) {
        return { who: "studio", headline: "Elkészítjük az utóellenőrzés árát", detail: "Megkaptuk a kérésedet. Most nincs teendőd." };
      }
      if (project.maintenance_option === "offered" || project.maintenance_option === "accepted") {
        if (project.followup_check_status === "transfer_reported") {
          return { who: "studio", headline: "Ellenőrizzük az utóellenőrzés utalását", detail: "Jelezted az utalást. Most nincs teendőd." };
        }
        if (project.followup_check_status === "awaiting_transfer") {
          return { who: "client", headline: "Utald el az utóellenőrzés díját", detail: "Az egyszeri ajánlatot elfogadtad. Az utalási adatok lent láthatók." };
        }
        return { who: "client", headline: "Dönts az utóellenőrzésről", detail: "A pontos egyszeri díj lent látható. Fogadd el, vagy zárd le nélküle a projektet." };
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
