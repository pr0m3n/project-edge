import type { Project } from "@/components/ClientPortal";
import { escHtml, formatPrice } from "@/components/ClientPortal";

type ContractPanelProps = {
  project: Project;
  contractChecked: boolean;
  onContractCheckedChange: (checked: boolean) => void;
  onAccept: () => void;
};

function printContract(project: Project) {
  const win = window.open("", "_blank");
  if (!win) return;
  const scopeHtml = escHtml(project.offer_scope || "Egyedi weboldal").replace(/\n/g, "<br/>");
  win.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Szerződés – ${escHtml(project.title)}</title>` +
    `<style>body{font-family:sans-serif;padding:40px;color:#333;line-height:1.6}h1,h2,h3{color:#111}.signature{margin-top:50px;display:flex;justify-content:space-between}</style></head>` +
    `<body>` +
    `<h2 style="text-align:center">VÁLLALKOZÁSI SZERZŐDÉS</h2>` +
    `<p>Kelt: ${new Date().toLocaleDateString("hu-HU")}</p>` +
    `<p><strong>Vállalkozó:</strong> ProjectEdge Digital Build Studio</p>` +
    `<p><strong>Megrendelő:</strong> ${escHtml(project.company || "Megrendelő")} (${escHtml(project.contact_name)}, ${escHtml(project.contact_email)})</p>` +
    `<hr/>` +
    `<h3>1. A szerződés tárgya</h3>` +
    `<p>Megrendelő megrendeli a Vállalkozótól a &ldquo;${escHtml(project.title)}&rdquo; elnevezésű weboldalt / digitális rendszert.</p>` +
    `<h3>2. Tartalom és funkciók</h3><p>${scopeHtml}</p>` +
    `<h3>3. Határidő és ütemezés</h3><p>${escHtml(project.offer_timeline || "Megállapodás szerint.")}</p>` +
    `<h3>4. Vállalkozói díj</h3>` +
    `<p>Összesen: ${escHtml(formatPrice(project.offer_price, project.offer_currency || "Ft"))}</p>` +
    `<p>Fizetendő foglaló (a munka megkezdésének feltétele): ${escHtml(formatPrice(project.deposit_amount, project.offer_currency || "Ft"))}</p>` +
    `<p>Hátralék (átadáskor esedékes): ${escHtml(formatPrice((project.offer_price ?? 0) - (project.deposit_amount ?? 0), project.offer_currency || "Ft"))}</p>` +
    `<h3>5. Szerzői jog</h3><p>A teljes vállalási díj megfizetése után a Megrendelő korlátlan felhasználási jogot kap az elkészült egyedi munkára. A díj teljes megfizetéséig a szerzői jogok a Vállalkozót illetik.</p>` +
    `<h3>6. Elállás</h3><p>Fogyasztó Megrendelő a szerződéskötéstől számított 14 napon belül elállhat. A teljesítés kifejezett kérésre történő megkezdése után az elállási jog a már teljesített, arányos rész erejéig megszűnik.</p>` +
    `<div class="signature"><div>Vállalkozó: ProjectEdge</div><div>Megrendelő: Digitálisan elfogadva</div></div>` +
    `<script>window.print();<\/script></body></html>`
  );
  win.document.close();
}

export function ContractPanel({ project, contractChecked, onContractCheckedChange, onAccept }: ContractPanelProps) {
  return (
    <div style={{ background: "rgba(48, 56, 65, 0.02)", border: "1px solid rgba(48, 56, 65, 0.08)", padding: "20px", borderRadius: "22px", marginTop: "8px", display: "grid", gap: "14px" }}>
      <h4 style={{ margin: 0, fontSize: "18px" }}>Vállalkozási Szerződés</h4>

      <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>
        Vállalási díj: bruttó {formatPrice(project.offer_price, project.offer_currency || "Ft")}. A munka megkezdésének
        feltétele {formatPrice(project.deposit_amount, project.offer_currency || "Ft")} foglaló megfizetése; a
        fennmaradó összeg az átadáskor esedékes.
      </p>

      <details className="disclosure">
        <summary>Szerződés szövegének elolvasása</summary>
        <div className="disclosure-body">
          <div id="contract-view" style={{ maxHeight: "200px", overflowY: "auto", background: "#fff", border: "1px solid rgba(0,0,0,0.1)", padding: "16px", borderRadius: "12px", fontSize: "13px", lineHeight: "1.5", color: "#333" }}>
            <h4 style={{ textAlign: "center", marginTop: 0 }}>EGYEDI VÁLLALKOZÁSI SZERZŐDÉS</h4>
            <p>Mely létrejött egyrészről a <strong>ProjectEdge Digital Build Studio</strong> (Vállalkozó), másrészről a <strong>{project.company || "Megrendelő"}</strong> (Megrendelő) között az alábbi projekt megvalósítására:</p>
            <p><strong>Projekt címe:</strong> {project.offer_title || project.title}</p>
            <p><strong>Vállalási díj:</strong> bruttó {formatPrice(project.offer_price, project.offer_currency || "Ft")}. A munka megkezdésének feltétele {formatPrice(project.deposit_amount, project.offer_currency || "Ft")} foglaló megfizetése; a fennmaradó összeg az átadáskor esedékes.</p>
            <p><strong>Mit tartalmaz:</strong> {project.offer_scope || "A részletezett ajánlat szerint."}</p>
            <p><strong>Határidő/Ütemezés:</strong> {project.offer_timeline || "Megállapodás szerint."}</p>
            <p><strong>Szerzői jog:</strong> a teljes vállalási díj megfizetése után a Megrendelő korlátlan felhasználási jogot kap az elkészült egyedi munkára.</p>
            <p><strong>Elállás:</strong> fogyasztó Megrendelő a szerződéskötéstől 14 napon belül elállhat; a teljesítés kifejezett kérésre történő megkezdése után az elállási jog a már teljesített, arányos rész erejéig megszűnik.</p>
            <p style={{ fontSize: "12px", color: "#666" }}>A részletes feltételeket az <a href="/aszf" target="_blank">ÁSZF</a> tartalmazza. Megrendelő a lenti elfogadással elektronikus jognyilatkozatot tesz a szerződés elfogadásáról, amelyet a rendszer időbélyeggel rögzít.</p>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
            <button className="button secondary" type="button" onClick={() => printContract(project)}>Szerződés nyomtatása</button>
          </div>
        </div>
      </details>

      <label style={{ display: "flex", gap: "8px", alignItems: "center", cursor: "pointer", fontSize: "13px" }}>
        <input type="checkbox" checked={contractChecked} onChange={(e) => onContractCheckedChange(e.target.checked)} />
        <span>Elfogadom a vállalkozási szerződésben és az ÁSZF-ben foglalt feltételeket.</span>
      </label>

      <button className="button primary" disabled={!contractChecked} type="button" onClick={onAccept}>
        Szerződés aláírása & tovább a foglalóhoz
      </button>
    </div>
  );
}
