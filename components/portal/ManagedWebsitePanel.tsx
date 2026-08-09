"use client";

import { useState } from "react";
import type { ClientChangeRequest, Project } from "@/components/ClientPortal";
import { formatHuf, isWebsitePurchaseRequest, purchaseOptionPrice, subscriptionPlan, websitePurchaseRequestText } from "@/lib/subscriptions";

type Props = {
  project: Project;
  requests: ClientChangeRequest[];
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onReportPurchaseTransfer: (requestId: string) => Promise<void>;
  onRequestChange: (category: string, description: string) => Promise<void>;
};

export function ManagedWebsitePanel({ project, requests, onPause, onResume, onCancel, onReportPurchaseTransfer, onRequestChange }: Props) {
  const plan = subscriptionPlan(project.subscription_plan);
  const [composer, setComposer] = useState(false);
  const [category, setCategory] = useState("content");
  const [description, setDescription] = useState("");
  const [purchaseSending, setPurchaseSending] = useState(false);
  const paused = project.subscription_status === "paused" || project.status === "paused";
  const cancelPending = project.subscription_status === "cancel_requested";
  const pausePending = project.subscription_status === "pause_requested";
  const resumePending = project.subscription_status === "resume_requested";
  const purchaseRequest = requests.find((request) => isWebsitePurchaseRequest(request.description));
  const purchaseRequestPending = purchaseRequest && !["completed", "declined"].includes(purchaseRequest.status);
  const purchasePrice = project.purchase_option_price ?? purchaseOptionPrice(project.subscription_plan);

  return (
    <section className="managed-hub">
      <header className="managed-hub-head">
        <div><span className={`health-dot ${project.site_health_status === "attention" ? "warn" : ""}`} /><div><small>MENEDZSELT WEBOLDAL</small><h3>{project.managed_domain_name || project.brief_data?.domainName || "A weboldalad"}</h3></div></div>
        <span className={`subscription-state ${paused ? "paused" : ""}`}>{paused ? "Szüneteltetve" : "● Aktív és felügyelt"}</span>
      </header>

      <div className="managed-metrics">
        <article><span>Csomag</span><strong>{plan.name}</strong><small>{formatHuf(project.monthly_price ?? plan.price)} / hó</small></article>
        <article><span>Következő időszak</span><strong>{project.next_billing_at ? new Date(project.next_billing_at).toLocaleDateString("hu-HU") : "Beállítás alatt"}</strong><small>Előre fizetett havidíj</small></article>
        <article><span>Módosítási keret</span><strong>{plan.changes}</strong><small>{plan.response}</small></article>
        <article><span>Utolsó ellenőrzés</span><strong>{project.last_health_check_at ? new Date(project.last_health_check_at).toLocaleDateString("hu-HU") : "Induláskor"}</strong><small>Domain · SSL · űrlapok</small></article>
      </div>

      <div className="managed-command-grid">
        <article className="managed-command primary-command"><span>01 / MÓDOSÍTÁS</span><h4>Változott valami a vállalkozásodban?</h4><p>Kérj szöveg-, kép-, ár- vagy kisebb designmódosítást közvetlenül innen.</p><button className="button primary" type="button" onClick={() => setComposer(!composer)}>Új módosítás kérése</button></article>
        <article className="managed-command"><span>02 / TECHNIKA</span><h4>A háttér a mi feladatunk.</h4><ul><li>Domain és SSL felügyelet</li><li>Hosting és hibajavítás</li><li>Űrlapok ellenőrzése</li><li>Rendszeres technikai frissítés</li></ul></article>
      </div>

      {composer ? <form className="change-composer" onSubmit={async (event) => { event.preventDefault(); if (!description.trim()) return; await onRequestChange(category, description); setDescription(""); setComposer(false); }}><div><label htmlFor={`change-category-${project.id}`}>Milyen kérés?</label><select id={`change-category-${project.id}`} value={category} onChange={(event) => setCategory(event.target.value)}><option value="content">Szöveg, kép vagy adat</option><option value="design">Kisebb designmódosítás</option><option value="technical">Technikai hiba</option><option value="new_feature">Új funkció</option></select></div><div><label htmlFor={`change-description-${project.id}`}>Írd le röviden</label><textarea id={`change-description-${project.id}`} required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mit módosítsunk, és mi legyen helyette?" /></div><button className="button primary" type="submit">Kérés elküldése</button></form> : null}

      {requests.length ? <div className="client-request-timeline"><div><strong>Kérések és vásárlási ügyek</strong><span>{requests.filter((request) => !["completed", "declined"].includes(request.status)).length} folyamatban</span></div>{requests.map((request) => <article key={request.id}><span className={`request-status status-${request.status}`}>{request.status === "new" ? "Beérkezett" : request.status === "planned" ? "Tervezve" : request.status === "in_progress" ? request.transfer_reported_at ? "Utalás ellenőrzése" : "Folyamatban" : request.status === "waiting_client" ? "Fizetésre vár" : request.status === "completed" ? "Lezárva" : "Külön egyeztetés"}</span><p>{isWebsitePurchaseRequest(request.description) ? request.description.replace(/^\[WEBOLDAL_MEGVASARLAS\]\s*/, "Weboldal megvásárlása: ") : request.description}</p><small>{isWebsitePurchaseRequest(request.description) ? `${request.quoted_amount ? formatHuf(request.quoted_amount) : "Vételár egyeztetés alatt"}${request.payment_reference ? ` · Közlemény: ${request.payment_reference}` : ""}` : request.included_in_plan === true ? "A csomag része" : request.included_in_plan === false ? "Külön ajánlat szükséges" : "A keretet még ellenőrizzük"} · {new Date(request.requested_at).toLocaleDateString("hu-HU")}</small>{request.admin_note ? <em>{request.admin_note}</em> : null}{isWebsitePurchaseRequest(request.description) && request.status === "waiting_client" && !request.transfer_reported_at ? <button className="button primary" type="button" onClick={() => onReportPurchaseTransfer(request.id)}>Elutaltam a vételárat</button> : null}</article>)}</div> : null}

      <details className="subscription-manage">
        <summary>Előfizetés kezelése</summary>
        <div><div><strong>Szüneteltetés</strong><p>Az oldal parkolóállapotba kerül, a domain és a rendszer megmarad. Parkolási díj: 2 900 Ft/hó.</p>{pausePending || resumePending ? <div className="purchase-request-state"><strong>Kérelem elküldve</strong><span>Az adminisztrátor feldolgozza, az eredményről itt és emailben is értesítést kapsz.</span></div> : paused ? <button className="button secondary" onClick={onResume} type="button">Újraaktiválás kérése</button> : <button className="button secondary" onClick={onPause} type="button">Szüneteltetés kérése</button>}</div><div className="purchase-option-card"><strong>Weboldal megvásárlása</strong><p>Egyszeri {formatHuf(purchasePrice)} összegért a forráskód és a technikai rendszer a tiéd lesz. A kérés után elkészítjük az átadási összefoglalót és a fizetési adatokat; fizetés után átadjuk a forráskódot és a hozzáféréseket, a havi előfizetés pedig lezárul.</p><ol><li>Vásárlási igény elküldése</li><li>Átadási összefoglaló és fizetési adatok</li><li>Fizetés ellenőrzése</li><li>Forráskód és hozzáférések átadása</li></ol>{purchaseRequestPending || purchaseSending ? <div className="purchase-request-state"><strong>{purchaseSending ? "Igény küldése…" : "Igény elküldve"}</strong><span>{purchaseRequest?.status === "waiting_client" ? "A következő lépés nálad van — nézd meg a fenti kérések között az admin üzenetét." : "Dolgozunk az átadási összefoglalón. Itt és emailben is értesítünk."}</span></div> : <button className="button secondary" type="button" disabled={cancelPending} onClick={async () => { setPurchaseSending(true); await onRequestChange("new_feature", websitePurchaseRequestText(purchasePrice)); setPurchaseSending(false); }}>{purchaseRequest?.status === "declined" ? "Új vásárlási igény küldése" : "Megvásárlási folyamat indítása"}</button>}</div><div className="danger-zone"><strong>Lemondás</strong><p>A weboldal a kifizetett időszak végén leáll. Ez nem projektátadás és nem jár forráskóddal vagy 30 napos garanciával. Ha szeretnéd megtartani az oldalt, előbb a megvásárlási folyamatot indítsd el.</p>{cancelPending ? <div className="purchase-request-state"><strong>Lemondási kérelem elküldve</strong><span>A szolgáltatás a kifizetett időszak végén zárul le. Az időpontról értesítést kapsz.</span></div> : <button className="button secondary" onClick={onCancel} type="button">Előfizetés lemondása</button>}</div></div>
      </details>
    </section>
  );
}
