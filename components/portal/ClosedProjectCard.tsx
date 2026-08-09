import { FormEvent } from "react";
import type { Project } from "@/components/ClientPortal";

type ReviewFormValues = {
  rating: number;
  review: string;
  reference: boolean;
};

type ClosedProjectCardProps = {
  project: Project;
  reviewForm: ReviewFormValues;
  onReviewFormChange: (value: ReviewFormValues) => void;
  onSubmitReview: () => void;
};

export function ClosedProjectCard({ project, reviewForm, onReviewFormChange, onSubmitReview }: ClosedProjectCardProps) {
  const cancelledSubscription = project.commercial_model === "subscription" && project.subscription_status === "cancelled";
  const completedPurchase = project.commercial_model === "purchase" && Boolean(project.warranty_started_at || project.final_payment_paid_at || project.final_payment_paid);
  const closedWithoutDelivery = !cancelledSubscription && !completedPurchase;
  const warrantyUntil = project.warranty_expires_at
    ? new Date(project.warranty_expires_at)
    : project.final_payment_paid_at
      ? new Date(new Date(project.final_payment_paid_at).getTime() + 30 * 24 * 60 * 60 * 1000)
      : null;
  return (
    <article
      className="project-status-card detailed compact-closed"
      key={project.id}
      style={{
        background: "rgba(48, 56, 65, 0.02)",
        border: "1px solid rgba(48, 56, 65, 0.08)",
        padding: "16px 20px",
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}
    >
      {completedPurchase && !project.client_rating ? (
        <div className="completion-celebration" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => <i key={index} />)}
          <span>🎉</span>
          <strong>Köszönjük a közös munkát!</strong>
          <small>Elkészültünk. Nagyon örülünk, hogy velünk építetted fel az oldaladat.</small>
        </div>
      ) : null}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <strong style={{ fontSize: "16px", color: "var(--ink)" }}>{project.title}</strong>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
            {project.project_type} · {project.company || "Cégnév nélkül"}
          </div>
        </div>
        <span
          style={{
            background: "rgba(118, 171, 174, 0.15)",
            color: "#76ABAE",
            padding: "4px 10px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "bold"
          }}
        >
          {cancelledSubscription ? "Előfizetés lezárva" : completedPurchase ? "Projekt lezárva" : project.offer_status === "declined" ? "Ajánlat elutasítva" : "Projekt megszakítva"}
        </span>
      </div>

      {cancelledSubscription ? (
        <div className="subscription-card cancellation-summary">
          <div>
            <span className="micro-label">Menedzselt szolgáltatás lezárva</span>
            <strong>{project.cancel_effective_at ? `${new Date(project.cancel_effective_at).toLocaleDateString("hu-HU")}-i hatállyal` : "A lemondás feldolgozva"}</strong>
            <small>A weboldal leállt, és a havi üzemeltetés megszűnt. Ez nem projektátadás, ezért nem jár hozzá forráskód vagy 30 napos technikai garancia.</small>
          </div>
        </div>
      ) : closedWithoutDelivery ? (
        <div className="subscription-card cancellation-summary">
          <div>
            <span className="micro-label">Lezárt ügy</span>
            <strong>{project.offer_status === "declined" ? "Az ajánlatot elutasítottad" : "A projekt teljesítés nélkül lezárult"}</strong>
            <small>Nem történt kész weboldal-átadás, ezért ehhez a lezáráshoz nem tartozik technikai garancia vagy projektértékelés.</small>
          </div>
        </div>
      ) : <div className="subscription-card warranty-summary">
        <div className="warranty-summary-icon">30</div>
        <div>
          <span className="micro-label">Díjmentes technikai garancia</span>
          <strong>{warrantyUntil ? `${warrantyUntil.toLocaleDateString("hu-HU")}-ig` : "30 napig az átadástól"}</strong>
          <small>Az általunk elkészített működés hibáját az ügyfélkapuban jelentheted. Új funkció és utólagos módosítás nem garanciális javítás.</small>
        </div>
      </div>}

      {!completedPurchase ? null : project.client_rating ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid rgba(48, 56, 65, 0.08)", paddingTop: "10px" }}>
          <span style={{ fontSize: "13px", color: "var(--muted)" }}>Értékelésed:</span>
          <div style={{ color: "#FF9800", fontSize: "16px", letterSpacing: "2px" }}>{"★".repeat(project.client_rating)}</div>
          {project.client_review && (
            <span style={{ fontSize: "13px", color: "var(--ink)", opacity: 0.8, fontStyle: "italic" }}>
              - "{project.client_review}"
            </span>
          )}
        </div>
      ) : (
        <div style={{ borderTop: "1px solid rgba(48, 56, 65, 0.08)", paddingTop: "10px" }}>
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              onSubmitReview();
            }}
            style={{ display: "grid", gap: "10px" }}
          >
            <span style={{ fontSize: "13px", color: "var(--muted)" }}>Kérlek értékeld a közös munkát:</span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  type="button"
                  key={val}
                  style={{ fontSize: "20px", background: "none", border: "none", cursor: "pointer", color: reviewForm.rating >= val ? "#FF9800" : "#ccc", padding: 0 }}
                  onClick={() => onReviewFormChange({ ...reviewForm, rating: val })}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="field" style={{ margin: 0 }}>
              <textarea
                id={`review-comment-${project.id}`}
                required
                style={{ fontSize: "13px", padding: "8px 12px", borderRadius: "10px", minHeight: "60px" }}
                placeholder="Írd le tapasztalataidat..."
                value={reviewForm.review}
                onChange={(e) => onReviewFormChange({ ...reviewForm, review: e.target.value })}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
              <label style={{ display: "flex", gap: "6px", alignItems: "center", cursor: "pointer", fontSize: "12px", color: "var(--muted)" }}>
                <input type="checkbox" checked={reviewForm.reference} onChange={(e) => onReviewFormChange({ ...reviewForm, reference: e.target.checked })} />
                <span>Engedélyezem referenciaként</span>
              </label>
              <button className="button primary" type="submit" style={{ fontSize: "12px", padding: "6px 12px", minHeight: "auto", borderRadius: "8px" }}>Értékelés</button>
            </div>
          </form>
        </div>
      )}
    </article>
  );
}
