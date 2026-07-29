import type { Project } from "@/components/ClientPortal";
import { BANK_TRANSFER_DETAILS, formatPrice, transferReference } from "@/components/ClientPortal";

type LaunchedPanelProps = {
  project: Project;
  onPayFinal: () => void;
  onSelectMaintenance: (choice: "requested" | "declined") => void;
  onConfirmFollowupCheck: () => void;
  onReportFollowupTransfer: () => void;
};

export function LaunchedPanel({ project, onPayFinal, onSelectMaintenance, onConfirmFollowupCheck, onReportFollowupTransfer }: LaunchedPanelProps) {
  const checklist = project.handover_checklist ?? [];
  const followupLocked = ["awaiting_transfer", "transfer_reported", "scheduled", "completed"].includes(project.followup_check_status || "");

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
        <strong>Egyszeri 30 napos utóellenőrzés</strong>
        <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "var(--muted)" }}>
          Az indulás után körülbelül egy hónappal átnézzük, hogy a weboldal a valós használat mellett is rendben működik-e.
        </p>
        <div className="maintenance-scope">
          <span>Elérhetőség, hibák és hibás hivatkozások ellenőrzése</span>
          <span>Mobilos megjelenés és fő felhasználói útvonalak próbája</span>
          <span>Űrlapok, alapvető integrációk és analitika ellenőrzése</span>
          <span>Rövid állapotjelentés a talált problémákról és a következő lépésekről</span>
        </div>
        <p className="maintenance-boundary"><strong>Fontos:</strong> ez állapotfelmérés, nem folyamatos karbantartás. A díj a projekt összetettségéhez igazodik. A feltárt nagyobb fejlesztésekre csak külön jóváhagyással készül ajánlat.</p>
        <p className="waiting-copy">Egyszeri szolgáltatás: nincs előfizetés, havidíj vagy automatikus megújulás.</p>
        {!project.final_payment_paid ? (
          <p className="waiting-copy">Az utóellenőrzésről a végső fizetés jóváhagyása után dönthetsz.</p>
        ) : project.followup_check_status === "requested" && !project.followup_check_fee ? (
          <p className="waiting-copy">Ajánlatkérés elküldve — az adminisztrátor most állítja be az egyszeri díjat.</p>
        ) : (project.followup_check_status === "offered" || followupLocked) && project.followup_check_fee ? (
          <div className="maintenance-offer">
            <div className="maintenance-total"><span>Egyszeri díj</span><strong>{formatPrice(project.followup_check_fee, project.maintenance_currency || "Ft")}</strong></div>
            {!followupLocked ? <div className="maintenance-actions">
              <button className="button primary" type="button" onClick={onConfirmFollowupCheck}>Kérem az utóellenőrzést</button>
              <button className="button secondary" type="button" onClick={() => onSelectMaintenance("declined")}>Nem kérem, lezárhatjuk</button>
            </div> : null}
            {["awaiting_transfer", "transfer_reported"].includes(project.followup_check_status || "") ? (
              <div className="maintenance-transfer">
                <span className="micro-label">30 napos utóellenőrzés</span>
                <h4>Banki átutalás</h4>
                <div><span>Kedvezményezett</span><strong>{BANK_TRANSFER_DETAILS.name}</strong></div>
                <div><span>IBAN</span><strong>{BANK_TRANSFER_DETAILS.iban}</strong></div>
                <div><span>Közlemény</span><strong>{transferReference(project)}-CHECK30</strong></div>
                <div><span>Összeg</span><strong>{formatPrice(project.followup_check_fee, project.maintenance_currency || "Ft")}</strong></div>
                {project.followup_check_status === "awaiting_transfer" ? (
                  <button className="button primary" type="button" onClick={onReportFollowupTransfer}>Elutaltam az összeget</button>
                ) : (
                  <p className="waiting-copy">Utalás jelezve — az adminisztrátor ellenőrzi és beütemezi az ellenőrzést.</p>
                )}
              </div>
            ) : null}
            {project.followup_check_status === "scheduled" ? (
              <p className="decision-copy">Az utóellenőrzést beütemeztük {project.followup_check_due_at ? new Date(project.followup_check_due_at).toLocaleDateString("hu-HU") + " napjára" : "körülbelül 30 nap múlvára"}.</p>
            ) : null}
          </div>
        ) : project.followup_check_status === "declined" ? (
          <div className="decision-copy">
            Utóellenőrzés nélkül lezárva
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
            <button className="button primary" type="button" onClick={() => onSelectMaintenance("requested")}>Kérek árat az utóellenőrzésre</button>
            <button className="button secondary" type="button" onClick={() => onSelectMaintenance("declined")}>Nem kérem, lezárhatjuk</button>
          </div>
        )}
      </div>
    </div>
  );
}
