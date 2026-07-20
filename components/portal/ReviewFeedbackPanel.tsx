import type { Project } from "@/components/ClientPortal";

type ReviewFeedbackPanelProps = {
  project: Project;
  feedbackRoundNote: string;
  onFeedbackRoundNoteChange: (value: string) => void;
  onSubmit: () => void;
};

export function ReviewFeedbackPanel({ project, feedbackRoundNote, onFeedbackRoundNoteChange, onSubmit }: ReviewFeedbackPanelProps) {
  return (
    <div style={{ background: "rgba(255, 87, 34, 0.04)", border: "1px solid rgba(255, 87, 34, 0.12)", padding: "20px", borderRadius: "22px", marginTop: "8px", display: "grid", gap: "12px" }}>
      <h4 style={{ margin: 0, fontSize: "18px" }}>Projekt átnézése</h4>
      <p style={{ margin: 0, fontSize: "14px" }}>A fejlesztési szakasz lezárult. Kérlek, vizsgáld felül az oldalt.</p>
      <div style={{ fontSize: "14px", background: "rgba(0,0,0,0.02)", padding: "8px 12px", borderRadius: "8px", width: "fit-content" }}>
        <strong>Visszajelzési körök: {project.feedback_round} / 2</strong>
      </div>

      {project.feedback_round < 2 ? (
        <div style={{ display: "grid", gap: "8px", marginTop: "4px" }}>
          <label style={{ fontSize: "13px", fontWeight: "bold" }}>Kért javítások, módosítások ({project.feedback_round + 1}. kör):</label>
          <textarea
            required
            placeholder="Írd le a kívánt módosításokat részletesen..."
            value={feedbackRoundNote}
            onChange={(e) => onFeedbackRoundNoteChange(e.target.value)}
          />
          <button className="button primary" style={{ width: "fit-content" }} type="button" onClick={onSubmit}>
            Visszajelzés beküldése
          </button>
        </div>
      ) : (
        <p style={{ margin: 0, color: "#FF5722", fontStyle: "italic", fontSize: "14px" }}>Minden díjmentes visszajelzési kör lefutott (2/2). Ha további módosításokra van szükséged, kérlek írj nekünk üzenetet.</p>
      )}
    </div>
  );
}
