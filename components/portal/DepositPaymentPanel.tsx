import type { Project } from "@/components/ClientPortal";
import { formatPrice } from "@/components/ClientPortal";
import { PRICE_TAX_NOTE, formatHuf, subscriptionPlan } from "@/lib/subscriptions";

type DepositPaymentPanelProps = {
  project: Project;
  onStartPayment: () => void;
  paymentStarting?: boolean;
};

export function DepositPaymentPanel({ project, onStartPayment, paymentStarting = false }: DepositPaymentPanelProps) {
  if (project.commercial_model === "subscription") {
    const plan = subscriptionPlan(project.subscription_plan);
    return (
      <div className="first-payment-card">
        <div className="first-payment-copy">
          <span>ELSŐ SZÁMLÁZÁSI IDŐSZAK</span>
          <h4>Indítsd el a {plan.name} előfizetést.</h4>
          <p>Az első havi díj indítja el a weboldal elkészítését. Külön induló díj nincs.</p>
        </div>
        <div className="first-payment-price">
          <span>Most fizetendő</span>
          <strong>{formatHuf(project.monthly_price ?? plan.price)}</strong>
          <small>{PRICE_TAX_NOTE}</small>
        </div>
        <div className="first-payment-assurances" aria-label="Fizetési információk">
          <span><b>✓</b> Biztonságos Stripe Checkout</span>
          <span><b>✓</b> Automatikus havi megújulás</span>
          <span><b>✓</b> A kártyaadatokat nem tároljuk</span>
        </div>
        <div className="first-payment-action">
          <button className="button primary" type="button" disabled={paymentStarting} onClick={onStartPayment}>
            {paymentStarting ? "Stripe megnyitása…" : "Előfizetés indítása bankkártyával →"}
          </button>
          <small>A további havidíjakat a Stripe automatikusan terheli. Az előfizetést az ügyfélkapuban kezelheted.</small>
        </div>
      </div>
    );
  }
  return (
    <div style={{ background: "rgba(118, 171, 174, 0.08)", border: "1px solid rgba(118, 171, 174, 0.15)", padding: "20px", borderRadius: "22px", marginTop: "8px", display: "grid", gap: "12px" }}>
      <h4 style={{ margin: 0, fontSize: "18px" }}>Fizetési részletek (Foglaló)</h4>
      <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
        A foglaló egy alacsony, fix összegű helyfoglalási díj — ez indítja a munkát. A teljes díjat csak
        a kész oldal átadásakor kérjük, így nincs kockázatod. A foglaló azért kell, hogy csak azoknak a
        projekteknek dolgozzunk neki, akik ténylegesen komolyan gondolják. A fizetés banki átutalással
        történik — a következő lépésben megkapod az adatokat.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
        <div>
          <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Teljes ajánlati ár</span>
          <strong>{formatPrice(project.offer_price, project.offer_currency || "Ft")}</strong>
        </div>
        <div>
          <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Foglaló (helyfoglalási díj)</span>
          <strong style={{ color: "#FF5722" }}>{formatPrice(project.deposit_amount, project.offer_currency || "Ft")}</strong>
          <small>{PRICE_TAX_NOTE}</small>
        </div>
        <div>
          <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Fennmaradó, átadáskor esedékes</span>
          <strong>{formatPrice((project.offer_price ?? 0) - (project.deposit_amount ?? 0), project.offer_currency || "Ft")}</strong>
        </div>
        <div>
          <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>Fizetési státusz</span>
          <strong style={{ color: "#FF5722" }}>Foglalóra vár</strong>
        </div>
      </div>
      <button className="button primary" style={{ width: "fit-content", marginTop: "8px" }} type="button" onClick={onStartPayment}>
        Utalási adatok megnyitása
      </button>
    </div>
  );
}
