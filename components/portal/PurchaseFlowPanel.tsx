"use client";

import { useState } from "react";
import { BANK_TRANSFER_DETAILS } from "@/components/portal/format";
import type { Project, WebsitePurchase } from "@/components/portal/types";
import { formatHuf } from "@/lib/subscriptions";
import {
  WEBSITE_PURCHASE_FLOW,
  websitePurchaseProgress,
  type WebsitePurchasePaymentMethod
} from "@/lib/website-purchase";

export type PurchaseBillingState = {
  name: string;
  email: string;
  country: string;
  postalCode: string;
  city: string;
  address: string;
  taxNumber: string;
};

type PurchaseFlowPanelProps = {
  project: Project;
  purchase: WebsitePurchase | null;
  busy: boolean;
  onStart: () => Promise<void>;
  onSelectPayment: (method: WebsitePurchasePaymentMethod) => Promise<boolean>;
  onSaveBilling: (billing: PurchaseBillingState) => Promise<boolean>;
  onStartCardPayment: () => Promise<void>;
  onReportTransfer: () => Promise<void>;
};

function billingFromPurchase(purchase: WebsitePurchase | null, project: Project): PurchaseBillingState {
  return {
    name: purchase?.billing_name ?? project.contact_name ?? "",
    email: purchase?.billing_email ?? project.contact_email ?? "",
    country: purchase?.billing_country ?? "HU",
    postalCode: purchase?.billing_postal_code ?? "",
    city: purchase?.billing_city ?? "",
    address: purchase?.billing_address ?? "",
    taxNumber: purchase?.billing_tax_number ?? ""
  };
}

export function PurchaseFlowPanel({
  project,
  purchase,
  busy,
  onStart,
  onSelectPayment,
  onSaveBilling,
  onStartCardPayment,
  onReportTransfer
}: PurchaseFlowPanelProps) {
  const [methodChoice, setMethodChoice] = useState<WebsitePurchasePaymentMethod | null>(purchase?.payment_method ?? null);
  const [billing, setBilling] = useState<PurchaseBillingState>(() => billingFromPurchase(purchase, project));
  const [billingOpen, setBillingOpen] = useState(false);

  const progress = websitePurchaseProgress(purchase);
  const activeMethod = purchase?.payment_method ?? methodChoice;
  const billingComplete = Boolean(
    billing.name.trim() && billing.email.trim() && billing.postalCode.trim() && billing.city.trim() && billing.address.trim()
  );

  async function selectMethod(method: WebsitePurchasePaymentMethod) {
    if (await onSelectPayment(method)) setMethodChoice(method);
  }

  async function saveBilling() {
    if (!billingComplete) return;
    if (!(await onSaveBilling(billing))) return;
    setBillingOpen(false);
  }

  async function startCard() {
    if (!billingComplete) {
      setBillingOpen(true);
      return;
    }
    if (!(await onSaveBilling(billing))) return;
    if (activeMethod !== "card" && !(await onSelectPayment("card"))) return;
    await onStartCardPayment();
  }

  async function reportTransfer() {
    if (!billingComplete) {
      setBillingOpen(true);
      return;
    }
    if (!(await onSaveBilling(billing))) return;
    if (activeMethod !== "bank_transfer" && !(await onSelectPayment("bank_transfer"))) return;
    await onReportTransfer();
  }

  return (
    <section className="purchase-flow-panel">
      <header className="purchase-flow-head">
        <div>
          <span className="micro-label">Weboldal tulajdonba vétele</span>
          <h3>{purchase ? "Egyértelműen vezetett átadás" : "A bérelt weboldal a tiéd lehet"}</h3>
          <p>
            {purchase
              ? "Minden lépést itt látod. Mindig csak az aktuális teendőddel kell foglalkoznod."
              : "Egyszeri vételárral megkapod a forráskódot, a technikai rendszert és a hozzáféréseket."
            }
          </p>
        </div>
        <div className="purchase-price-lockup">
          <span>Egyszeri vételár</span>
          <strong>{formatHuf(project.purchase_option_price ?? 0)}</strong>
        </div>
      </header>

      <div className="purchase-flow-steps" aria-label="Tulajdonba-vételi folyamat">
        {WEBSITE_PURCHASE_FLOW.map((step) => (
          <div key={step.number} className={step.number <= progress.index ? "is-done" : step.number === progress.index + 1 ? "is-current" : ""}>
            <b>{step.number}</b>
            <span>{step.title}</span>
          </div>
        ))}
      </div>

      {!purchase ? (
        <div className="purchase-flow-intro">
          <div className="purchase-benefit-grid">
            <div><strong>Te birtoklod</strong><span>Forráskód, domain és a kapcsolódó technikai fiókok a te neveden.</span></div>
            <div><strong>Te döntesz</strong><span>A későbbi fejlesztést bármelyik fejlesztővel folytathatod.</span></div>
            <div><strong>Végig segítünk</strong><span>A fizetés után közös átadási listán haladunk végig.</span></div>
          </div>
          <button className="button primary" type="button" disabled={busy} onClick={onStart}>
            {busy ? "Folyamat indítása…" : "Tulajdonba-vételi folyamat indítása"}
          </button>
          <small>A folyamat elindítása még nem jelent fizetési kötelezettséget.</small>
        </div>
      ) : purchase.status === "requested" ? (
        <div className="purchase-state-card is-waiting">
          <span className="purchase-state-icon">01</span>
          <div><strong>Az igényt rögzítettük</strong><p>Összeállítjuk az átadási összefoglalót és a fizetési adatokat. Amint elkészültünk, itt választhatod ki a fizetési módot.</p></div>
        </div>
      ) : purchase.status === "transfer_reported" ? (
        <div className="purchase-state-card is-waiting">
          <span className="purchase-state-icon">03</span>
          <div><strong>Az utalást jelezted</strong><p>Most ellenőrizzük a bankszámlán a {formatHuf(purchase.amount)} vételár beérkezését. Addig nincs további teendőd.</p><small>Közlemény: {purchase.payment_reference}</small></div>
        </div>
      ) : purchase.status === "payment_pending" ? (
        <div className="purchase-payment-area">
          <div className="purchase-payment-summary">
            <div><span>Fizetendő vételár</span><strong>{formatHuf(purchase.amount)}</strong></div>
            <div><span>Azonosító közlemény</span><b>{purchase.payment_reference}</b></div>
          </div>

          <div className="purchase-billing-block">
            <div className="purchase-section-title"><div><span className="micro-label">Számlázási adatok</span><strong>Hová készüljön a bizonylat?</strong></div><button type="button" onClick={() => setBillingOpen((value) => !value)}>{billingOpen ? "Bezárás" : "Megadás / módosítás"}</button></div>
            {!billingOpen ? <p>{billing.name || "Még nincs megadva"} · {billing.email || "email hiányzik"}{billing.city ? ` · ${billing.city}` : ""}</p> : (
              <div className="purchase-billing-form">
                <label><span>Név / cégnév</span><input value={billing.name} onChange={(event) => setBilling((current) => ({ ...current, name: event.target.value }))} /></label>
                <label><span>Email</span><input type="email" value={billing.email} onChange={(event) => setBilling((current) => ({ ...current, email: event.target.value }))} /></label>
                <label><span>Adószám (ha van)</span><input value={billing.taxNumber} onChange={(event) => setBilling((current) => ({ ...current, taxNumber: event.target.value }))} placeholder="pl. 12345678-1-42" /></label>
                <label><span>Ország</span><input value={billing.country} onChange={(event) => setBilling((current) => ({ ...current, country: event.target.value.toUpperCase() }))} /></label>
                <label><span>Irányítószám</span><input value={billing.postalCode} onChange={(event) => setBilling((current) => ({ ...current, postalCode: event.target.value }))} /></label>
                <label><span>Város</span><input value={billing.city} onChange={(event) => setBilling((current) => ({ ...current, city: event.target.value }))} /></label>
                <label className="is-wide"><span>Cím</span><input value={billing.address} onChange={(event) => setBilling((current) => ({ ...current, address: event.target.value }))} placeholder="Közterület, házszám" /></label>
                <button className="button secondary" type="button" disabled={busy || !billingComplete} onClick={saveBilling}>Számlázási adatok mentése</button>
              </div>
            )}
          </div>

          <div className="purchase-section-title"><div><span className="micro-label">Fizetési mód</span><strong>Válassz, hogyan rendezed a vételárat</strong></div></div>
          <div className="purchase-method-grid">
            <button type="button" className={`purchase-method-card ${activeMethod === "card" ? "is-selected" : ""}`} onClick={() => void selectMethod("card")} disabled={busy}>
              <strong>Bankkártya</strong><span>Azonnali, biztonságos fizetés Stripe-on keresztül.</span><b>{activeMethod === "card" ? "Kiválasztva" : "Kiválasztom"}</b>
            </button>
            <button type="button" className={`purchase-method-card ${activeMethod === "bank_transfer" ? "is-selected" : ""}`} onClick={() => void selectMethod("bank_transfer")} disabled={busy}>
              <strong>Banki átutalás</strong><span>A számlázási adatok alatt megjelenő közleménnyel.</span><b>{activeMethod === "bank_transfer" ? "Kiválasztva" : "Kiválasztom"}</b>
            </button>
          </div>

          {activeMethod === "card" ? (
            <div className="purchase-selected-payment"><p>A Stripe biztonságos fizetési oldalán adod meg a bankkártyádat. A sikeres fizetés után automatikusan megnyílik az átadási lista.</p><button className="button primary" type="button" disabled={busy} onClick={() => void startCard()}>Fizetés bankkártyával</button></div>
          ) : activeMethod === "bank_transfer" ? (
            <div className="purchase-transfer-box">
              <div><span>Kedvezményezett</span><strong>{BANK_TRANSFER_DETAILS.name}</strong></div>
              <div><span>Belföldi számlaszám</span><strong>{BANK_TRANSFER_DETAILS.accountNumber}</strong></div>
              <div><span>IBAN</span><strong>{BANK_TRANSFER_DETAILS.iban}</strong></div>
              <div><span>Közlemény — pontosan ezt írd be</span><strong>{purchase.payment_reference}</strong></div>
              <small>Alanyi adómentes szolgáltatás. A feltüntetett összeg a fizetendő végösszeg.</small>
              <button className="button primary" type="button" disabled={busy} onClick={() => void reportTransfer()}>Elutaltam a vételárat</button>
            </div>
          ) : <p className="purchase-empty-action">A folytatáshoz válassz egy fizetési módot.</p>}
        </div>
      ) : null}
    </section>
  );
}
