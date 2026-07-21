import type { Project } from "@/components/ClientPortal";
import { formatPrice } from "@/components/ClientPortal";

type DepositPaymentPanelProps = {
  project: Project;
  onStartPayment: () => void;
};

export function DepositPaymentPanel({ project, onStartPayment }: DepositPaymentPanelProps) {
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
