"use client";

import type { Project, WebsitePurchase } from "@/components/portal/types";
import { HandoverPanel } from "@/components/portal/HandoverPanel";
import { isHandoverComplete } from "@/lib/handover";
import { WEBSITE_PURCHASE_FLOW, websitePurchaseProgress } from "@/lib/website-purchase";

type PurchaseHandoverPanelProps = {
  project: Project;
  purchase: WebsitePurchase;
  busy: boolean;
  onCompleteStep: (stepId: string, value: string) => void;
  onClose: () => void;
};

export function PurchaseHandoverPanel({ project, purchase, busy, onCompleteStep, onClose }: PurchaseHandoverPanelProps) {
  const progress = websitePurchaseProgress(purchase);
  const complete = isHandoverComplete(project.handover_steps);

  return (
    <section className="purchase-handover-workspace">
      <header className="purchase-flow-head">
        <div>
          <span className="micro-label">04 / Technikai átadás</span>
          <h3>Most kerül minden a saját kezedbe</h3>
          <p>Nem jelszavakat adunk át. Saját fiókokat hozol létre, mi pedig meghívással és projektátadással kötjük össze őket.</p>
        </div>
        <strong className="purchase-handover-badge">{progress.index}/{progress.total} folyamatlépés</strong>
      </header>

      <div className="purchase-flow-steps" aria-label="Tulajdonba-vételi folyamat">
        {WEBSITE_PURCHASE_FLOW.map((step) => <div key={step.number} className={step.number <= 4 ? "is-done" : step.number === 5 ? "is-current" : ""}><b>{step.number}</b><span>{step.title}</span></div>)}
      </div>

      <div className="purchase-handover-explainer">
        <strong>Hogyan működik?</strong>
        <span>Mindig egyetlen lépés aktív. Ha egy szolgáltatás nem része az oldaladnak, nem fog megjelenni. Jelszót és titkos kulcsot sehol nem kérünk.</span>
      </div>

      <HandoverPanel project={project} busy={busy} onCompleteStep={onCompleteStep} />

      {complete ? (
        <div className="purchase-close-card">
          <div><strong>Minden hozzáférés a helyére került</strong><p>Ellenőrizted a domaint, a weboldalt és a szükséges technikai fiókokat. Most lezárhatod a tulajdonba-vételt.</p></div>
          <button className="button primary" type="button" onClick={onClose}>Átvétel megerősítése és lezárás</button>
        </div>
      ) : null}
    </section>
  );
}
