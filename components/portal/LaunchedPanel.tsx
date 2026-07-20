import type { Project } from "@/components/ClientPortal";
import { formatPrice } from "@/components/ClientPortal";

type LaunchedPanelProps = {
  project: Project;
  onPayFinal: () => void;
  onSelectMaintenance: (choice: "accepted" | "declined") => void;
};

export function LaunchedPanel({ project, onPayFinal, onSelectMaintenance }: LaunchedPanelProps) {
  const checklist = project.handover_checklist ?? [];

  return (
    <div style={{ background: "rgba(118, 171, 174, 0.05)", border: "1px solid rgba(118, 171, 174, 0.15)", padding: "20px", borderRadius: "22px", marginTop: "8px", display: "grid", gap: "14px" }}>
      <h4 style={{ margin: 0, fontSize: "18px" }}>Projekt Élesítve!</h4>

      {checklist.length > 0 && (
        <details className="disclosure">
          <summary>Átadási checklist ({checklist.filter((i) => i.done).length}/{checklist.length} kész)</summary>
          <div className="disclosure-body" style={{ display: "grid", gap: "6px" }}>
            {checklist.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                <span style={{ color: item.done ? "#76ABAE" : "#FF5722", fontWeight: "bold" }}>{item.done ? "✓" : "○"}</span>
                <span style={{ textDecoration: item.done ? "line-through" : "none", color: item.done ? "var(--muted)" : "var(--ink)" }}>{item.title}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "4px" }}>Végső fizetés (70%)</span>
          {project.final_payment_paid ? (
            <span style={{ fontWeight: "700", color: "#76ABAE", fontSize: "14px" }}>
              Befizetve — köszönjük!
              {project.final_payment_paid_at && (
                <span style={{ fontWeight: "400", color: "var(--muted)", marginLeft: "8px", fontSize: "12px" }}>
                  {new Date(project.final_payment_paid_at).toLocaleDateString("hu-HU")}
                </span>
              )}
            </span>
          ) : (
            <span style={{ fontWeight: "700", color: "#FF9800", fontSize: "14px" }}>Függőben</span>
          )}
        </div>
        {!project.final_payment_paid && (
          <button
            className="button primary"
            type="button"
            style={{ minHeight: "auto", padding: "10px 18px", fontSize: "13px", whiteSpace: "nowrap" }}
            onClick={onPayFinal}
          >
            Hátralék kifizetése ({formatPrice((project.offer_price ?? 0) - (project.deposit_amount ?? 0), project.offer_currency || "Ft")})
          </button>
        )}
      </div>

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "12px", display: "grid", gap: "8px" }}>
        <strong>Karbantartási és támogatási ajánlat:</strong>
        <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.4", color: "var(--muted)" }}>Havonta figyeljük az oldal sebességét, kezeljük a frissítéseket, mentéseket, és 1 óra fejlesztési keretet biztosítunk.</p>
        {project.maintenance_option ? (
          <div style={{ fontWeight: "bold", fontSize: "14px", color: project.maintenance_option === "accepted" ? "#76ABAE" : "#FF5722" }}>
            Választásod: {project.maintenance_option === "accepted" ? "Karbantartás elfogadva" : "Karbantartás elutasítva"}
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
            <button className="button primary" type="button" onClick={() => onSelectMaintenance("accepted")}>Kérem a karbantartást</button>
            <button className="button secondary" type="button" onClick={() => onSelectMaintenance("declined")}>Nem kérem, lezárhatjuk</button>
          </div>
        )}
      </div>
    </div>
  );
}
