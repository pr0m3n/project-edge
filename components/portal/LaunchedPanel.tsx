import type { Project } from "@/components/portal/types";
import { formatPrice } from "@/components/portal/format";
import { isHandoverComplete } from "@/lib/handover";

type LaunchedPanelProps = {
  project: Project;
  onPayFinal: () => void;
  onCloseProject: () => void;
};

export function LaunchedPanel({ project, onPayFinal, onCloseProject }: LaunchedPanelProps) {
  // A vezetett átadás (017) az elsődleges. A `handover_checklist` csak a régebbi
  // projektek miatt maradt itt: ott az a lista dönti el, lezárható-e a projekt.
  const legacyChecklist = project.handover_checklist ?? [];
  const guidedSteps = project.handover_steps ?? [];
  const handoverComplete = guidedSteps.length
    ? isHandoverComplete(guidedSteps)
    : legacyChecklist.length > 0 && legacyChecklist.every((item) => item.done);

  return (
    <div style={{ background: "rgba(118, 171, 174, 0.05)", border: "1px solid rgba(118, 171, 174, 0.15)", padding: "20px", borderRadius: "22px", marginTop: "8px", display: "grid", gap: "14px" }}>
      <h4 style={{ margin: 0, fontSize: "18px" }}>Projekt Élesítve!</h4>

      {!guidedSteps.length && legacyChecklist.length > 0 && (
        <details className="disclosure">
          <summary>Átadási checklist ({legacyChecklist.filter((i) => i.done).length}/{legacyChecklist.length} kész)</summary>
          <div className="disclosure-body" style={{ display: "grid", gap: "6px" }}>
            {legacyChecklist.map((item, idx) => (
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
          <div><strong>Vercel</strong><span>A saját csapatodba adjuk át a projektet, leállás nélkül. Ezután a domain és a környezeti változók is a te oldalán vannak.</span></div>
          <div><strong>Supabase</strong><span>A saját szervezetedbe kerül az adatbázis, és az átadás után lecseréljük a fejlesztés közben használt titkos kulcsokat.</span></div>
          <div><strong>Resend</strong><span>A levélküldés a te fiókodból megy. Az API kulcsot te hozod létre és te illeszted be a saját Vercel projektedbe — hozzánk nem kerül.</span></div>
          <div><strong>GitHub</strong><span>A forráskód repository-t a megadott fiókodnak adjuk át, így később más fejlesztővel is folytatható.</span></div>
          <div><strong>Jelszavak</strong><span>Egyetlen lépésnél sem kérünk jelszót, bankkártyaadatot vagy titkos kulcsot. Mindenhol meghívásos hozzáférés van.</span></div>
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
        <div className="warranty-card">
          <div className="warranty-badge">30</div>
          <div>
            <span className="micro-label">Díjmentes technikai garancia</span>
            <strong>Az átadástól számított 30 napig melletted maradunk.</strong>
            <p>Ha az általunk elkészített működésben hibát találsz, jelentsd az ügyfélkapuban, és díjmentesen kivizsgáljuk.</p>
          </div>
        </div>
        <div className="warranty-terms">
          <div><span>✓</span><p><strong>Beletartozik</strong>Az átadáskor vállalt funkciók hibás működésének javítása.</p></div>
          <div><span>→</span><p><strong>Külön munka</strong>Új funkció, új tartalom és utólagos módosítás csak külön jóváhagyással.</p></div>
        </div>
        {!project.final_payment_paid ? (
          <p className="waiting-copy">A projekt lezárása a végső fizetés jóváhagyása után válik elérhetővé.</p>
        ) : !handoverComplete ? (
          <p className="waiting-copy">
            A projekt akkor zárható le, ha a vezetett átadás minden lépése kész. A soron következő lépést fentebb, az
            „Vezetett átadás” résznél látod.
          </p>
        ) : (
          <button className="button primary" type="button" onClick={onCloseProject}>Átvettem, projekt lezárása</button>
        )}
      </div>
    </div>
  );
}
