"use client";

import { BANK_TRANSFER_DETAILS } from "@/components/portal/format";
import { AdminHandoverPanel } from "@/components/AdminHandoverPanel";
import type { ClientProject, WebsitePurchase } from "@/components/admin/types";
import { formatHuf } from "@/lib/subscriptions";
import { WEBSITE_PURCHASE_FLOW, WEBSITE_PURCHASE_STATUS_LABELS } from "@/lib/website-purchase";
import type { HandoverStepState } from "@/lib/handover";

type WebsitePurchaseAdminPanelProps = {
  project: ClientProject;
  purchase: WebsitePurchase;
  busy: boolean;
  onPrepare: () => Promise<void>;
  onActivate: () => Promise<void>;
  onCancel: () => Promise<void>;
  onHandoverChange: (steps: HandoverStepState[]) => void;
  onHandoverStepCompleted: (stepId: string, title: string) => void;
};

export function WebsitePurchaseAdminPanel({
  project,
  purchase,
  busy,
  onPrepare,
  onActivate,
  onCancel,
  onHandoverChange,
  onHandoverStepCompleted
}: WebsitePurchaseAdminPanelProps) {
  const currentStep = purchase.status === "requested"
    ? 1
    : purchase.status === "payment_pending" || purchase.status === "transfer_reported"
      ? 3
      : 4;

  return (
    <section className="website-purchase-admin-card">
      <header className="website-purchase-admin-head">
        <div><span className="micro-label">Tulajdonba vétel</span><h4>{project.title}</h4><p>{project.contact_name || project.company || "Ügyfél"} · {project.contact_email || "nincs email"}</p></div>
        <div className="website-purchase-admin-price"><span>{WEBSITE_PURCHASE_STATUS_LABELS[purchase.status]}</span><strong>{formatHuf(purchase.amount)}</strong></div>
      </header>

      <div className="purchase-flow-steps admin-purchase-flow-steps">
        {WEBSITE_PURCHASE_FLOW.map((step) => <div key={step.number} className={step.number <= currentStep ? "is-done" : step.number === currentStep + 1 ? "is-current" : ""}><b>{step.number}</b><span>{step.title}</span></div>)}
      </div>

      {purchase.status === "requested" ? (
        <div className="purchase-admin-action is-next">
          <div><strong>Teendő: készítsd elő a fizetési összefoglalót</strong><p>Az ügyfél még nem lát fizetési adatokat. A gomb kitölti a biztonságos sablont a vételárral, közleménnyel és az átadás tartalmával.</p></div>
          <button className="button primary" type="button" disabled={busy} onClick={() => void onPrepare()}>Fizetési adatok előkészítése</button>
        </div>
      ) : null}

      {purchase.status === "payment_pending" ? (
        <div className="purchase-admin-action">
          <div><strong>Az ügyfél fizetési módot választhat</strong><p>Az összefoglaló elküldve. Fizetés: {purchase.payment_method === "card" ? "bankkártya" : purchase.payment_method === "bank_transfer" ? "banki átutalás" : "még nincs kiválasztva"}.</p>{purchase.admin_note ? <pre>{purchase.admin_note}</pre> : null}</div>
          <span className="purchase-admin-waiting">Ügyfélre vár</span>
        </div>
      ) : null}

      {purchase.status === "transfer_reported" ? (
        <div className="purchase-admin-action is-next">
          <div><strong>Teendő: ellenőrizd az utalást</strong><p>A vételár {formatHuf(purchase.amount)} összegben, közlemény: <b>{purchase.payment_reference}</b>. A bankszámlán ellenőrizd a tényleges beérkezést.</p><small>{BANK_TRANSFER_DETAILS.name} · {BANK_TRANSFER_DETAILS.accountNumber}</small></div>
          <button className="button primary" type="button" disabled={busy} onClick={() => void onActivate()}>Beérkezett — átadás indítása</button>
        </div>
      ) : null}

      {purchase.status === "handover" ? (
        <div className="purchase-admin-handover">
          <div className="purchase-admin-handover-copy"><strong>Teendő: haladj a technikai átadási listán</strong><p>A fizetés rendezve, az előfizetés lezárva. Most mindig a soron következő adminlépést végezd el; az ügyfél ugyanazt a listát látja.</p></div>
          <AdminHandoverPanel
            steps={project.handover_steps}
            onChange={onHandoverChange}
            onStepCompleted={onHandoverStepCompleted}
          />
        </div>
      ) : null}

      {purchase.status !== "handover" && purchase.status !== "completed" ? <button className="text-danger-button" type="button" disabled={busy} onClick={() => void onCancel()}>Folyamat megszakítása</button> : null}
    </section>
  );
}
