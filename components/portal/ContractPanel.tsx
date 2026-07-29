import type { Project } from "@/components/ClientPortal";
import { escHtml, formatPrice } from "@/components/ClientPortal";
import { PROVIDER, providerContractParty } from "@/lib/legal";

type ContractPanelProps = {
  project: Project;
  contractChecked: boolean;
  onContractCheckedChange: (checked: boolean) => void;
  /** A 14 napon belüli teljesítéskezdés kifejezett kérése (45/2014. Korm. r.). */
  performanceConsent: boolean;
  onPerformanceConsentChange: (checked: boolean) => void;
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
    `<p><strong>Vállalkozó:</strong> ${escHtml(providerContractParty())}</p>` +
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
    `<h3>7. Üzemeltetés és átadás</h3><p>A weboldal harmadik felek szolgáltatásain fut (domain regisztrátor, Vercel, szükség szerint Supabase és Resend). Ezek a Megrendelő saját fiókjába kerülnek, díjaikat — a domain éves megújítását is — a Megrendelő fizeti. Az átadás az Ügyfélkapu vezetett átadási folyamatában, meghívásos hozzáférésekkel történik; jelszót és titkos kulcsot egyik fél sem küld a másiknak. A hozzáférések teljes átadása a teljes vállalási díj megfizetése után történik. Részletek az ÁSZF 7. pontjában.</p>` +
    `<h3>8. Technikai garancia</h3><p>A projekt lezárásától számított 30 napig a Vállalkozó díjmentesen javítja az átadáskor vállalt működés igazolt hibáit. Új funkció, új tartalom és utólagos módosítás nem tartozik ide.</p>` +
    `<div class="signature"><div>Vállalkozó: ${escHtml(PROVIDER.legalName)}</div><div>Megrendelő: Digitálisan elfogadva</div></div>` +
    `<script>window.print();<\/script></body></html>`
  );
  win.document.close();
}

export function ContractPanel({
  project,
  contractChecked,
  onContractCheckedChange,
  performanceConsent,
  onPerformanceConsentChange,
  onAccept
}: ContractPanelProps) {
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
            <p>
              Mely létrejött egyrészről a <strong>{PROVIDER.brandLong}</strong> — {PROVIDER.legalName} (
              {PROVIDER.legalForm}), {PROVIDER.address} (Vállalkozó), másrészről a{" "}
              <strong>{project.company || "Megrendelő"}</strong> (Megrendelő) között az alábbi projekt megvalósítására:
            </p>
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

      <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", cursor: "pointer", fontSize: "13px" }}>
        <input type="checkbox" checked={contractChecked} onChange={(e) => onContractCheckedChange(e.target.checked)} />
        <span>Elfogadom a vállalkozási szerződésben és az ÁSZF-ben foglalt feltételeket.</span>
      </label>

      {/* Az ÁSZF elállási pontja arra épül, hogy a Megrendelő kifejezetten kéri a
          teljesítés 14 napon belüli megkezdését — ezt a nyilatkozatot külön, saját
          szövegével kell bekérni, nem elég az általános feltétel-elfogadás. */}
      <label style={{ display: "flex", gap: "8px", alignItems: "flex-start", cursor: "pointer", fontSize: "13px" }}>
        <input type="checkbox" checked={performanceConsent} onChange={(e) => onPerformanceConsentChange(e.target.checked)} />
        <span>
          Kifejezetten kérem, hogy a munka a 14 napos elállási határidő lejárta előtt induljon el. Tudomásul veszem,
          hogy a teljesítés megkezdése után az elállási jogom a már teljesített, arányos rész tekintetében megszűnik.
        </span>
      </label>

      <button className="button primary" disabled={!contractChecked || !performanceConsent} type="button" onClick={onAccept}>
        Szerződés aláírása & tovább a foglalóhoz
      </button>
    </div>
  );
}
