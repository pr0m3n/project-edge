"use client";

import { useEffect, useRef, useState } from "react";
import { BANK_TRANSFER_DETAILS } from "@/components/portal/format";
import type { Project, WebsitePurchase } from "@/components/portal/types";
import { buyoutPrice, elapsedBillingMonths, formatHuf } from "@/lib/subscriptions";
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
  const [billingError, setBillingError] = useState("");
  const billingFormRef = useRef<HTMLDivElement>(null);

  const billingComplete = Boolean(
    billing.name.trim() &&
    billing.email.trim() &&
    billing.postalCode.trim() &&
    billing.city.trim() &&
    billing.address.trim()
  );

  const [billingOpen, setBillingOpen] = useState(!billingComplete);

  useEffect(() => {
    if (!billingComplete) {
      setBillingOpen(true);
    }
  }, [billingComplete]);

  const progress = websitePurchaseProgress(purchase);
  const activeMethod = purchase?.payment_method ?? methodChoice;

  async function selectMethod(method: WebsitePurchasePaymentMethod) {
    if (await onSelectPayment(method)) setMethodChoice(method);
  }

  async function saveBilling() {
    if (!billingComplete) {
      setBillingError("Kérjük, töltsd ki az összes kötelező mezőt (Név, Email, Irányítószám, Város, Cím)!");
      return;
    }
    setBillingError("");
    if (!(await onSaveBilling(billing))) {
      setBillingError("Nem sikerült elmenteni a számlázási adatokat. Kérjük, próbáld újra.");
      return;
    }
    setBillingOpen(false);
  }

  async function startCard() {
    if (!billingComplete) {
      setBillingOpen(true);
      setBillingError("⚠️ Először töltsd ki a számlázási adatokat (Név, Email, Irányítószám, Város, Cím) a fizetéshez!");
      billingFormRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setBillingError("");
    if (!(await onSaveBilling(billing))) return;
    if (activeMethod !== "card" && !(await onSelectPayment("card"))) return;
    await onStartCardPayment();
  }

  async function reportTransfer() {
    if (!billingComplete) {
      setBillingOpen(true);
      setBillingError("⚠️ Először töltsd ki a számlázási adatokat (Név, Email, Irányítószám, Város, Cím) az utalás rögzítéséhez!");
      billingFormRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setBillingError("");
    if (!(await onSaveBilling(billing))) return;
    if (activeMethod !== "bank_transfer" && !(await onSelectPayment("bank_transfer"))) return;
    await onReportTransfer();
  }

  // A tárolt `purchase_option_price` a LISTAÁR pillanatfelvétele. A ténylegesen
  // fizetendő ennél kevesebb: a befizetett havidíjak fele beszámít. Ugyanazt a
  // számítást futtatjuk, amit az admin is rögzít a folyamat indításakor.
  const billingAnchor = project.billing_cycle_started_at ?? project.created_at;
  const buyout = buyoutPrice(project.subscription_plan, elapsedBillingMonths(billingAnchor));
  const listPrice = project.purchase_option_price ?? buyout.list;
  const payable = purchase?.amount ?? Math.max(0, listPrice - buyout.credit);

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
          <strong>{formatHuf(payable)}</strong>
          {buyout.credit > 0 ? (
            <em className="purchase-price-credit">
              {formatHuf(listPrice)} helyett — {buyout.months} befizetett hónap beszámítása −{formatHuf(buyout.credit)}
            </em>
          ) : null}
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

          <div className="purchase-billing-block" ref={billingFormRef}>
            <div className="purchase-section-title">
              <div>
                <span className="micro-label">1. Lépés: Számlázási adatok</span>
                <strong>Hová készüljön a bizonylat / számla?</strong>
              </div>
              <button type="button" onClick={() => setBillingOpen((value) => !value)}>
                {billingOpen ? "Összecsukás" : "Megadás / módosítás"}
              </button>
            </div>

            {billingError && (
              <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "10px", padding: "10px 14px", color: "#DC2626", fontSize: "13px", fontWeight: 600, margin: "10px 0" }}>
                {billingError}
              </div>
            )}

            {!billingComplete && !billingError && (
              <div style={{ background: "rgba(255, 167, 38, 0.12)", border: "1px solid rgba(255, 167, 38, 0.4)", borderRadius: "10px", padding: "10px 14px", color: "#D97706", fontSize: "13px", fontWeight: 600, margin: "10px 0" }}>
                ⚠️ A fizetés indítása előtt kérjük, add meg a számlázási adataidat!
              </div>
            )}

            {!billingOpen && billingComplete ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#059669", fontSize: "13px", marginTop: "6px" }}>
                <span>✓</span>
                <span>Rögzítve: <strong>{billing.name}</strong> ({billing.postalCode} {billing.city}, {billing.address}) · {billing.email}</span>
              </div>
            ) : (
              <div className="purchase-billing-form" style={{ marginTop: "12px" }}>
                <label>
                  <span>Név / Cégnév *</span>
                  <input
                    required
                    value={billing.name}
                    onChange={(event) => setBilling((current) => ({ ...current, name: event.target.value }))}
                    placeholder="pl. Kisbirtok Kft. vagy Kovács Péter"
                  />
                </label>
                <label>
                  <span>Email a számlához *</span>
                  <input
                    required
                    type="email"
                    value={billing.email}
                    onChange={(event) => setBilling((current) => ({ ...current, email: event.target.value }))}
                    placeholder="szamla@vallalkozasod.hu"
                  />
                </label>
                <label>
                  <span>Adószám (cégek esetén)</span>
                  <input
                    value={billing.taxNumber}
                    onChange={(event) => setBilling((current) => ({ ...current, taxNumber: event.target.value }))}
                    placeholder="pl. 12345678-1-42"
                  />
                </label>
                <label>
                  <span>Ország</span>
                  <input
                    value={billing.country}
                    onChange={(event) => setBilling((current) => ({ ...current, country: event.target.value.toUpperCase() }))}
                  />
                </label>
                <label>
                  <span>Irányítószám *</span>
                  <input
                    required
                    value={billing.postalCode}
                    onChange={(event) => setBilling((current) => ({ ...current, postalCode: event.target.value }))}
                    placeholder="pl. 1011"
                  />
                </label>
                <label>
                  <span>Város *</span>
                  <input
                    required
                    value={billing.city}
                    onChange={(event) => setBilling((current) => ({ ...current, city: event.target.value }))}
                    placeholder="pl. Budapest"
                  />
                </label>
                <label className="is-wide">
                  <span>Cím (utca, házszám) *</span>
                  <input
                    required
                    value={billing.address}
                    onChange={(event) => setBilling((current) => ({ ...current, address: event.target.value }))}
                    placeholder="pl. Fő utca 12. 3/4."
                  />
                </label>
                <button
                  className="button secondary"
                  type="button"
                  disabled={busy || !billingComplete}
                  onClick={saveBilling}
                  style={{ gridColumn: "1 / -1", width: "fit-content" }}
                >
                  {billingComplete ? "✓ Számlázási adatok mentése" : "Kérjük töltsd ki az adatokat"}
                </button>
              </div>
            )}
          </div>

          <div className="purchase-section-title" style={{ marginTop: "16px" }}>
            <div>
              <span className="micro-label">2. Lépés: Fizetési mód</span>
              <strong>Válassz, hogyan rendezed a vételárat</strong>
            </div>
          </div>
          <div className="purchase-method-grid">
            <button
              type="button"
              className={`purchase-method-card ${activeMethod === "card" ? "is-selected" : ""}`}
              onClick={() => void selectMethod("card")}
              disabled={busy}
            >
              <strong>Bankkártya</strong>
              <span>Azonnali, biztonságos fizetés Stripe-on keresztül.</span>
              <b>{activeMethod === "card" ? "Kiválasztva" : "Kiválasztom"}</b>
            </button>
            <button
              type="button"
              className={`purchase-method-card ${activeMethod === "bank_transfer" ? "is-selected" : ""}`}
              onClick={() => void selectMethod("bank_transfer")}
              disabled={busy}
            >
              <strong>Banki átutalás</strong>
              <span>A számlázási adatok alatt megjelenő közleménnyel.</span>
              <b>{activeMethod === "bank_transfer" ? "Kiválasztva" : "Kiválasztom"}</b>
            </button>
          </div>

          {activeMethod === "card" ? (
            <div className="purchase-selected-payment">
              <p>A Stripe biztonságos fizetési oldalán adod meg a bankkártyádat. A sikeres fizetés után automatikusan megnyílik az átadási lista.</p>
              {!billingComplete && (
                <small style={{ color: "#D97706", display: "block", marginBottom: "8px", fontWeight: 700 }}>
                  ⚠️ A bankkártyás fizetés előtt add meg a fenti számlázási adatokat!
                </small>
              )}
              <button
                className="button primary"
                type="button"
                disabled={busy}
                onClick={() => void startCard()}
              >
                Fizetés bankkártyával →
              </button>
            </div>
          ) : activeMethod === "bank_transfer" ? (
            <div className="purchase-transfer-box">
              <div><span>Kedvezményezett</span><strong>{BANK_TRANSFER_DETAILS.name}</strong></div>
              <div><span>Belföldi számlaszám</span><strong>{BANK_TRANSFER_DETAILS.accountNumber}</strong></div>
              <div><span>IBAN</span><strong>{BANK_TRANSFER_DETAILS.iban}</strong></div>
              <div><span>Közlemény — pontosan ezt írd be</span><strong>{purchase.payment_reference}</strong></div>
              <small>Alanyi adómentes szolgáltatás. A feltüntetett összeg a fizetendő végösszeg.</small>
              {!billingComplete && (
                <small style={{ color: "#D97706", display: "block", marginTop: "8px", fontWeight: 700 }}>
                  ⚠️ Az utalás bejelentése előtt kérjük, töltsd ki a fenti számlázási adatokat!
                </small>
              )}
              <button
                className="button primary"
                type="button"
                disabled={busy}
                onClick={() => void reportTransfer()}
              >
                Elutaltam a vételárat
              </button>
            </div>
          ) : (
            <p className="purchase-empty-action">A folytatáshoz válassz egy fizetési módot a fenti opciók közül.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
