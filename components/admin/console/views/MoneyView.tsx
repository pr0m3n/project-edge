"use client";

import Link from "next/link";
import { useMemo } from "react";
import { WebsitePurchaseAdminPanel } from "@/components/admin/WebsitePurchaseAdminPanel";
import { useAdmin } from "@/components/admin/console/AdminData";
import {
  LEAD_STATUSES,
  clientHref,
  formatDate,
  isLiveProject,
  leadPipeline,
  revenueSummary,
  upcomingPayments
} from "@/components/admin/console/derive";
import { IconMoney } from "@/components/admin/console/icons";
import { Badge, Card, EmptyState, ListSkeleton, PageHead, Stat, SubscriptionBadge } from "@/components/admin/console/ui";
import { daysUntil } from "@/lib/onboarding";
import { formatHuf, subscriptionPlan } from "@/lib/subscriptions";
import { WEBSITE_PURCHASE_STATUS_LABELS } from "@/lib/website-purchase";

/**
 * Pénz — bevétel, esedékességek, számlázási hibák, előfizetések és
 * tulajdonba vételek egy helyen. A régi „Bevétel" és „Menedzselt oldalak"
 * fül összevonása.
 */

const LEAD_STATUS_LABEL = Object.fromEntries(LEAD_STATUSES);

export function MoneyView() {
  const admin = useAdmin();
  const summary = useMemo(() => revenueSummary(admin.clientProjects), [admin.clientProjects]);
  const upcoming = useMemo(
    () => (admin.nowMs ? upcomingPayments(admin.clientProjects, admin.pendingPayments, admin.nowMs) : []),
    [admin.clientProjects, admin.pendingPayments, admin.nowMs]
  );
  const pipeline = useMemo(() => leadPipeline(admin.leads), [admin.leads]);
  const quarterTotal = upcoming.reduce((sum, row) => sum + row.amount, 0);
  const now = new Date(admin.nowMs);

  const reported = admin.pendingPayments.filter((payment) => payment.status === "reported");
  // Az óra a hidratálás után indul; addig nem számolunk késést.
  const overdue = admin.nowMs ? admin.pendingPayments.filter((payment) => payment.status !== "reported" && payment.due_date && daysUntil(new Date(payment.due_date), now) <= 0) : [];
  // A lezárt projekt is itt marad, ha az előfizetése nincs lemondva: ott a
  // Stripe még terhelhet — ezt látni kell, nem elrejteni.
  const managed = admin.clientProjects.filter((p) => p.commercial_model === "subscription" && p.subscription_status !== "cancelled");
  const activePurchases = admin.websitePurchases.filter((purchase) => !["completed", "declined", "cancelled"].includes(purchase.status));
  const pastPurchases = admin.websitePurchases.filter((purchase) => ["completed", "declined", "cancelled"].includes(purchase.status));
  const projectById = new Map(admin.clientProjects.map((project) => [project.id, project]));
  const attention = reported.length + overdue.length + admin.billingoIssues.length;

  return (
    <>
      <PageHead compact subtitle={`${formatHuf(summary.mrr)} havi · ${formatHuf(summary.arr)} éves vetület`} title="Pénz" />

      <div className="pa-stats">
        <Stat hint={`${summary.active.length} aktív előfizető`} label="Havi bevétel" value={formatHuf(summary.mrr)} />
        <Stat hint={`${upcoming.length} esedékesség`} label="Következő 90 nap" value={formatHuf(quarterTotal)} />
        <Stat hint="kézzel rögzítendő befizetés" label="Utalásos ügyfél" value={summary.byTransfer.length} />
        <Stat
          hint={summary.discountPerMonth > 0 ? "havi, a listaárhoz képest" : "aktív előfizetőnként"}
          label={summary.discountPerMonth > 0 ? "Adott kedvezmény" : "Átlagos havidíj"}
          value={summary.discountPerMonth > 0 ? formatHuf(summary.discountPerMonth) : summary.active.length ? formatHuf(Math.round(summary.mrr / summary.active.length)) : "—"}
        />
      </div>

      {admin.loading ? <ListSkeleton rows={4} /> : (
        <div className="pa-stack">
          <Card subtitle={attention ? "Pénz vagy NAV-kötelezettség — ezek nem várhatnak." : "Minden befizetés és számla rendben."} title={`Figyelmet igényel${attention ? ` · ${attention}` : ""}`} pad={!attention}>
            {attention === 0 ? <p className="pa-faint">Nincs bejelentett, elmaradt vagy kiszámlázatlan befizetés.</p> : (
              <div>
                {reported.map((payment) => {
                  const project = projectById.get(payment.project_id);
                  return (
                    <div className="pa-task p1" key={`r-${payment.id}`}>
                      <div className="pa-task-body">
                        <div className="pa-row-top"><Badge tone="danger">Bejelentett utalás</Badge></div>
                        <strong>{project?.title ?? "Ismeretlen projekt"} · {formatHuf(payment.amount)}</strong>
                        <p>{payment.payment_reference ? `Közlemény: ${payment.payment_reference}. ` : ""}Nézd meg a bankszámlán, és rögzítsd a befizetést.</p>
                      </div>
                      {project ? <div className="pa-task-actions"><Link className="pa-btn is-sm is-primary" href={clientHref(project.id, "fizetes")}>Befizetés rögzítése</Link></div> : null}
                    </div>
                  );
                })}
                {overdue.map((payment) => {
                  const project = projectById.get(payment.project_id);
                  const days = payment.due_date ? daysUntil(new Date(payment.due_date), now) : 0;
                  return (
                    <div className={`pa-task ${days < -5 ? "p1" : "p2"}`} key={`o-${payment.id}`}>
                      <div className="pa-task-body">
                        <div className="pa-row-top"><Badge tone={days < -5 ? "danger" : "accent"}>{days === 0 ? "Ma esedékes" : `${Math.abs(days)} napja esedékes`}</Badge></div>
                        <strong>{project?.title ?? "Ismeretlen projekt"} · {formatHuf(payment.amount)}</strong>
                        <p>Ha megérkezett, rögzítsd — különben az ügyfél további emlékeztetőket kap.</p>
                      </div>
                      {project ? <div className="pa-task-actions"><Link className="pa-btn is-sm is-primary" href={clientHref(project.id, "fizetes")}>Befizetés rögzítése</Link></div> : null}
                    </div>
                  );
                })}
                {admin.billingoIssues.map((issue) => {
                  const project = projectById.get(issue.project_id);
                  const busy = admin.billingoRetryId === issue.id;
                  return (
                    <div className="pa-task p1" key={`b-${issue.id}`}>
                      <div className="pa-task-body">
                        <div className="pa-row-top"><Badge tone="danger">Nem készült számla</Badge></div>
                        <strong>{project?.title ?? "Ismeretlen projekt"} · {formatHuf(issue.amount)}</strong>
                        <p>
                          {issue.paid_at ? `Fizetve: ${formatDate(issue.paid_at)}` : "Ismeretlen időpont"}
                          {issue.stripe_invoice_id ? ` · ${issue.stripe_invoice_id}` : ""}
                          {issue.billingo_error ? ` · ${issue.billingo_error}` : ""}
                        </p>
                      </div>
                      <div className="pa-task-actions">
                        <button className="pa-btn is-sm is-primary" disabled={busy} onClick={() => void admin.actions.retryBillingoInvoice(issue.id)} type="button">
                          {busy ? "Számlázás…" : "Számla újrapróbálása"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="pa-grid-2">
            <Card pad={!upcoming.length} subtitle="következő 90 nap" title="Mikor jön be a pénz">
              {upcoming.length === 0 ? <p className="pa-faint">Nincs rögzített esedékesség. Vegyél fel ügyfelet, vagy rögzítsd egy meglévő befizetését.</p> : (
                <div>
                  {upcoming.map((row) => {
                    const days = daysUntil(new Date(row.due), now);
                    return (
                      <Link className="pa-row" href={clientHref(row.projectId, "fizetes")} key={row.key}>
                        <div className="pa-row-main">
                          <span className="pa-row-title">{row.title}</span>
                          <span className="pa-row-meta">
                            {formatDate(row.due)}
                            {row.projected ? " · előrevetítve" : row.status === "reported" ? " · utalást jelzett" : days < 0 ? ` · ${Math.abs(days)} napja esedékes` : ` · ${days} nap múlva`}
                          </span>
                        </div>
                        <div className="pa-row-side">
                          <strong style={{ color: days < 0 && !row.projected ? "var(--pa-danger-text)" : undefined, fontVariantNumeric: "tabular-nums" }}>{formatHuf(row.amount)}</strong>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card pad={!pipeline.length} subtitle={`${admin.leads.length} érdeklődő összesen`} title="Honnan jönnek az érdeklődők">
              {pipeline.length === 0 ? <p className="pa-faint">Még nincs érdeklődő a rendszerben.</p> : (
                <div>
                  {pipeline.map((entry) => (
                    <div className="pa-row" key={entry.source}>
                      <div className="pa-row-main">
                        <span className="pa-row-title">{entry.source}</span>
                        <span className="pa-row-meta">{entry.statuses.map(([status, count]) => `${LEAD_STATUS_LABEL[status] ?? status}: ${count}`).join(" · ")}</span>
                      </div>
                      <div className="pa-row-side">
                        {entry.won > 0 ? <Badge tone="success">{entry.won} nyert · {Math.round((entry.won / entry.total) * 100)}%</Badge> : <Badge>{entry.total} db</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card pad={!managed.length} subtitle="A befizetés rögzítése és a fizetési link az ügyfél Fizetés fülén van." title={`Előfizetések · ${managed.length}`}>
            {managed.length === 0 ? <EmptyState icon={<IconMoney />} title="Még nincs menedzselt előfizetés" /> : (
              <div>
                {managed.map((project) => {
                  const plan = subscriptionPlan(project.subscription_plan);
                  const due = admin.pendingPayments.find((payment) => payment.project_id === project.id);
                  return (
                    <Link className="pa-row" href={clientHref(project.id, "fizetes")} key={project.id}>
                      <div className="pa-row-main">
                        <div className="pa-row-top">
                          <span className="pa-row-title">{project.title}</span>
                          <SubscriptionBadge status={project.subscription_status} />
                          {due?.status === "reported" ? <Badge tone="danger">Utalást jelzett</Badge> : null}
                          {!isLiveProject(project) ? <Badge tone="warn">Lezárt projekt — ellenőrizd az előfizetést</Badge> : null}
                        </div>
                        <span className="pa-row-sub">{[project.contact_name, project.contact_email].filter(Boolean).join(" · ")}</span>
                        <span className="pa-row-meta">
                          {plan.name} · {formatHuf(project.monthly_price ?? plan.price)}/hó
                          {project.payment_method === "bank_transfer" ? " · utalással" : project.payment_method === "stripe" ? " · kártyával" : ""}
                          {due?.due_date ? ` · következő: ${formatDate(due.due_date)}` : ""}
                        </span>
                      </div>
                      <div className="pa-row-side"><span className="pa-link">Fizetés →</span></div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>

          {activePurchases.length ? (
            <>
              <div className="pa-section-title"><h2>Folyamatban lévő tulajdonba vételek</h2></div>
              {activePurchases.map((purchase) => {
                const project = projectById.get(purchase.project_id);
                if (!project) return null;
                return (
                  <div className="pa-embed" key={purchase.id}>
                    <WebsitePurchaseAdminPanel
                      busy={admin.websitePurchaseBusyId === purchase.id}
                      onActivate={async () => { await admin.actions.activateWebsitePurchase(purchase, project); }}
                      onCancel={async () => { await admin.actions.cancelWebsitePurchase(purchase); }}
                      onHandoverChange={(steps) => { void admin.actions.setHandoverSteps(project, steps); }}
                      onHandoverStepCompleted={(_stepId, title) => { void admin.actions.notifyHandoverStep(project, title); }}
                      onPrepare={async () => { await admin.actions.prepareWebsitePurchase(purchase, project); }}
                      project={project}
                      purchase={purchase}
                    />
                  </div>
                );
              })}
            </>
          ) : null}

          {pastPurchases.length ? (
            <details className="pa-card pa-card-pad pa-details">
              <summary>Lezárt tulajdonba vételek ({pastPurchases.length})</summary>
              <div style={{ marginTop: 10 }}>
                {pastPurchases.map((purchase) => {
                  const project = projectById.get(purchase.project_id);
                  return (
                    <Link className="pa-row" href={project ? clientHref(project.id, "fizetes") : "/admin/ugyfelek"} key={purchase.id}>
                      <div className="pa-row-main">
                        <span className="pa-row-title">{project?.title ?? "Törölt projekt"}</span>
                        <span className="pa-row-meta">{formatHuf(purchase.amount)} · {formatDate(purchase.created_at)}</span>
                      </div>
                      <div className="pa-row-side"><Badge tone={purchase.status === "completed" ? "success" : "neutral"}>{WEBSITE_PURCHASE_STATUS_LABELS[purchase.status] ?? purchase.status}</Badge></div>
                    </Link>
                  );
                })}
              </div>
            </details>
          ) : null}
        </div>
      )}
    </>
  );
}
