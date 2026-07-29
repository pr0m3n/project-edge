import type { Project } from "@/components/ClientPortal";
import { formatPrice } from "@/components/ClientPortal";

type LaunchedPanelProps = {
  project: Project;
  onPayFinal: () => void;
  onSelectMaintenance: (choice: "requested" | "accepted" | "declined") => void;
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

      <details className="disclosure handover-guide">
        <summary>Technikai átadás: kinél mi marad?</summary>
        <div className="disclosure-body handover-ownership">
          <div><strong>Domain</strong><span>A te vagy a céged tulajdona. A megújítás és számlázás nálad marad.</span></div>
          <div><strong>Vercel</strong><span>Meghívásos hozzáféréssel vagy projektátadással kerül hozzád; a production domain és a környezeti változók ellenőrzőlistán mennek végig.</span></div>
          <div><strong>Supabase</strong><span>Szervezeti meghívással vagy projektátadással kapod meg. Jelszót és titkos kulcsot nem küldünk üzenetben.</span></div>
          <div><strong>GitHub</strong><span>A forráskód repository-hozzáférését külön jogosultsággal adjuk át, így később más fejlesztővel is folytatható.</span></div>
        </div>
      </details>

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: "700", display: "block", marginBottom: "4px" }}>Végső fizetés (a fennmaradó összeg)</span>
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
        {!project.final_payment_paid && !project.final_transfer_reported && (
          <button
            className="button primary"
            type="button"
            style={{ minHeight: "auto", padding: "10px 18px", fontSize: "13px", whiteSpace: "nowrap" }}
            onClick={onPayFinal}
          >
            Hátralék kifizetése ({formatPrice((project.offer_price ?? 0) - (project.deposit_amount ?? 0), project.offer_currency || "Ft")})
          </button>
        )}
        {!project.final_payment_paid && project.final_transfer_reported && (
          <strong className="waiting-copy">Utalás jelezve — az adminisztrátor ellenőrzi. Most nincs teendőd.</strong>
        )}
      </div>

      <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "12px", display: "grid", gap: "8px" }}>
        <strong>Karbantartási és támogatási ajánlat:</strong>
        <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.4", color: "var(--muted)" }}>Havonta figyeljük az oldal sebességét, kezeljük a frissítéseket, mentéseket, és 1 óra fejlesztési keretet biztosítunk.</p>
        {!project.final_payment_paid ? (
          <p className="waiting-copy">A karbantartásról a végső fizetés jóváhagyása után dönthetsz.</p>
        ) : project.maintenance_option === "requested" && !project.maintenance_monthly_fee ? (
          <p className="waiting-copy">Ajánlatkérés elküldve — az adminisztrátor most állítja össze a havidíjat.</p>
        ) : project.maintenance_option === "offered" && project.maintenance_monthly_fee ? (
          <div className="maintenance-offer">
            <strong>{formatPrice(project.maintenance_monthly_fee, project.maintenance_currency || "Ft")} / hó</strong>
            <p>Ez ismétlődő havi díj. Elfogadás után a karbantartás aktív, a projekt pedig lezárul.</p>
            <div className="maintenance-actions">
              <button className="button primary" type="button" onClick={() => onSelectMaintenance("accepted")}>Elfogadom a havidíjat</button>
              <button className="button secondary" type="button" onClick={() => onSelectMaintenance("declined")}>Nem kérem, lezárhatjuk</button>
            </div>
          </div>
        ) : project.maintenance_option === "accepted" || project.maintenance_option === "declined" ? (
          <div className="decision-copy">
            Választásod: {project.maintenance_option === "accepted" ? "Karbantartás elfogadva" : "Karbantartás elutasítva"}
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
            <button className="button primary" type="button" onClick={() => onSelectMaintenance("requested")}>Kérek havidíjas ajánlatot</button>
            <button className="button secondary" type="button" onClick={() => onSelectMaintenance("declined")}>Nem kérem, lezárhatjuk</button>
          </div>
        )}
      </div>
    </div>
  );
}
