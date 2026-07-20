import type { Project } from "@/components/ClientPortal";
import { formatPrice, hasOffer, splitLines } from "@/components/ClientPortal";

type OfferPanelProps = {
  project: Project;
  isRequestingChange: boolean;
  modificationRequestText: string;
  onModificationRequestTextChange: (value: string) => void;
  onStartModificationRequest: () => void;
  onCancelModificationRequest: () => void;
  onSubmitModificationRequest: () => void;
  onAccept: () => void;
  onDecline: () => void;
};

export function OfferPanel({
  project,
  isRequestingChange,
  modificationRequestText,
  onModificationRequestTextChange,
  onStartModificationRequest,
  onCancelModificationRequest,
  onSubmitModificationRequest,
  onAccept,
  onDecline
}: OfferPanelProps) {
  if (!hasOffer(project)) {
    return (
      <div className="project-awaiting-offer">
        <strong>Ajánlat előkészítés alatt</strong>
        <p>Ha megvan az irány, itt fogod látni a bontást, az ütemezést és az árat.</p>
      </div>
    );
  }

  return (
    <section className="client-offer-card">
      <div className="client-offer-header">
        <div>
          <span>Részletes ajánlat</span>
          <h3>{project.offer_title || `${project.title} ajánlat`}</h3>
        </div>
        <strong>{formatPrice(project.offer_price, project.offer_currency || "Ft")}</strong>
      </div>
      {project.offer_summary ? <p>{project.offer_summary}</p> : null}

      <details className="disclosure" open={project.status === "offer_sent"}>
        <summary>Ajánlat részletei</summary>
        <div className="disclosure-body">
          <div className="client-offer-grid">
            <div>
              <span>Mit tartalmaz?</span>
              <p>{project.offer_scope || "A részletes tartalom hamarosan megjelenik itt."}</p>
            </div>
            <div>
              <span>Ütemezés</span>
              <p>{project.offer_timeline || "Az ütemezést az ajánlat véglegesítésekor pontosítjuk."}</p>
            </div>
          </div>
          {splitLines(project.offer_deliverables).length ? (
            <ul className="client-offer-list">
              {splitLines(project.offer_deliverables).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {project.offer_note ? <p className="client-offer-note">{project.offer_note}</p> : null}
        </div>
      </details>

      {project.status === "offer_sent" && (
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: "16px", marginTop: "16px", display: "grid", gap: "12px" }}>
          {isRequestingChange ? (
            <div style={{ display: "grid", gap: "8px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold" }}>Módosítás részletei:</label>
              <textarea
                required
                placeholder="Írd le, mit szeretnél módosítani..."
                value={modificationRequestText}
                onChange={(e) => onModificationRequestTextChange(e.target.value)}
              />
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button className="button secondary" type="button" onClick={onCancelModificationRequest}>Mégse</button>
                <button className="button primary" type="button" onClick={onSubmitModificationRequest}>Módosítás beküldése</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button className="button primary" type="button" onClick={onAccept}>Ajánlat elfogadása</button>
              <button className="button secondary" type="button" onClick={onStartModificationRequest}>Módosítást kérek</button>
              <button className="button secondary" style={{ borderColor: "#DC3545", color: "#DC3545" }} type="button" onClick={onDecline}>Elutasítás</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
