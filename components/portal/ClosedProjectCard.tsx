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
          Lezárva
        </span>
      </div>

      {project.client_rating ? (
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
