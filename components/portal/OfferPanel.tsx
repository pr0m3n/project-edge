"use client";

import { useState } from "react";
import type { Project } from "@/components/portal/types";
import { formatPrice, hasOffer, splitLines } from "@/components/portal/format";

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
  couponPending: boolean;
  couponMessage: string;
  onApplyCoupon: (code: string) => void | Promise<void>;
  onRemoveCoupon: () => void | Promise<void>;
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
  onDecline,
  couponPending,
  couponMessage,
  onApplyCoupon,
  onRemoveCoupon
}: OfferPanelProps) {
  const [couponInput, setCouponInput] = useState("");
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
        <div className="client-offer-price">
          {project.coupon_code && project.base_offer_price ? (
            <del>{formatPrice(project.base_offer_price, project.offer_currency || "Ft")}</del>
          ) : null}
          <strong>{formatPrice(project.offer_price, project.offer_currency || "Ft")}</strong>
          {project.coupon_code ? <span>−{formatPrice(project.coupon_discount_amount, project.offer_currency || "Ft")}</span> : null}
        </div>
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
        <div className="client-offer-decision">
          <div className="coupon-entry">
            <div>
              <span>KUPONKÓD</span>
              <strong>{project.coupon_code ? "Kedvezmény alkalmazva" : "Van kuponkódod?"}</strong>
            </div>
            {project.coupon_code ? (
              <div className="coupon-applied">
                <span><b>✓</b> {project.coupon_code}</span>
                <button disabled={couponPending} onClick={onRemoveCoupon} type="button">Eltávolítás</button>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void onApplyCoupon(couponInput);
                }}
              >
                <label className="sr-only" htmlFor={`coupon-${project.id}`}>Kuponkód</label>
                <input
                  autoCapitalize="characters"
                  id={`coupon-${project.id}`}
                  maxLength={32}
                  onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                  placeholder="Például: INDULAS15"
                  value={couponInput}
                />
                <button className="button secondary" disabled={couponPending || couponInput.trim().length < 4} type="submit">
                  {couponPending ? "Ellenőrzés…" : "Alkalmazás"}
                </button>
              </form>
            )}
            {couponMessage ? <p className="coupon-message" role="status">{couponMessage}</p> : null}
          </div>
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
