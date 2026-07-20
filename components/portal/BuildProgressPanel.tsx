import type { Project } from "@/components/ClientPortal";

type BuildProgressPanelProps = {
  project: Project;
};

const MILESTONE_COLLAPSE_THRESHOLD = 3;

export function BuildProgressPanel({ project }: BuildProgressPanelProps) {
  const showStaging = Boolean(project.staging_url) && (project.status === "in_progress" || project.status === "review");
  const showMilestones = project.status === "in_progress";

  if (!showStaging && !showMilestones) {
    return null;
  }

  const milestones = project.milestones ?? [];
  const doneCount = milestones.filter((m) => m.done).length;
  const percent = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;
  const milestoneList = (
    <div style={{ display: "grid", gap: "10px" }}>
      {milestones.map((ms, idx) => (
        <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px" }}>
          <span style={{ display: "inline-block", width: "22px", height: "22px", borderRadius: "50%", background: ms.done ? "#76ABAE" : "rgba(0,0,0,0.1)", color: "#fff", textAlign: "center", lineHeight: "22px", fontSize: "11px", fontWeight: "bold" }}>
            {ms.done ? "✓" : idx + 1}
          </span>
          <span style={{ textDecoration: ms.done ? "line-through" : "none", color: ms.done ? "var(--muted)" : "var(--ink)" }}>
            {ms.title}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {showStaging && (
        <div style={{ background: "rgba(118, 171, 174, 0.06)", border: "1px solid rgba(118, 171, 174, 0.2)", padding: "16px 20px", borderRadius: "18px", marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "4px" }}>Előnézeti link</span>
            <span style={{ fontSize: "13px", color: "var(--ink)" }}>Az aktuális fejlesztési verzió — még nem éles.</span>
          </div>
          <a
            href={project.staging_url ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="button primary"
            style={{ fontSize: "13px", minHeight: "auto", padding: "10px 18px", whiteSpace: "nowrap" }}
          >
            Előnézet megnyitása →
          </a>
        </div>
      )}

      {showMilestones && (
        <div style={{ background: "rgba(48, 56, 65, 0.02)", border: "1px solid rgba(48, 56, 65, 0.08)", padding: "20px", borderRadius: "22px", marginTop: "8px", display: "grid", gap: "12px" }}>
          <h4 style={{ margin: 0, fontSize: "18px" }}>Kivitelezési mérföldkövek</h4>
          {milestones.length > 0 ? (
            <div style={{ display: "grid", gap: "10px" }}>
              <div style={{ background: "rgba(0,0,0,0.06)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                <div style={{ background: "#76ABAE", height: "100%", width: `${percent}%`, transition: "width 0.3s ease" }} />
              </div>
              <small style={{ color: "var(--muted)", textAlign: "right", display: "block" }}>
                {doneCount} / {milestones.length} mérföldkő kész ({percent}%)
              </small>
              {milestones.length > MILESTONE_COLLAPSE_THRESHOLD ? (
                <details className="disclosure">
                  <summary>Mérföldkövek listája</summary>
                  <div className="disclosure-body">{milestoneList}</div>
                </details>
              ) : (
                milestoneList
              )}
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--muted)", fontStyle: "italic", fontSize: "14px" }}>A kivitelezési feladatok feltöltése folyamatban van.</p>
          )}
        </div>
      )}
    </>
  );
}
