"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { AdminHandoverPanel } from "@/components/AdminHandoverPanel";
import { AiBuildPromptPanel } from "@/components/admin/AiBuildPromptPanel";
import { PaymentActionsPanel } from "@/components/admin/PaymentActionsPanel";
import { WebsitePurchaseAdminPanel } from "@/components/admin/WebsitePurchaseAdminPanel";
import { ChangeThread } from "@/components/portal/ChangeThread";
import { AssetImage, AssetLink } from "@/components/portal/AssetLink";
import { parseBrief } from "@/components/portal/format";
import { paletteByName } from "@/components/portal/brief-fields";
import { toAiPromptProject, useAdmin, type AdminData } from "@/components/admin/console/AdminData";
import {
  CHANGE_CATEGORY_LABEL,
  CHANGE_STATUSES,
  CLIENT_TABS,
  PAYMENT_STATUS_LABEL,
  PROJECT_FLOW,
  PROJECT_STATUSES,
  SITE_HEALTH,
  SUBSCRIPTION_STATUSES,
  clientHref,
  formatDate,
  formatDateTime,
  isLiveProject,
  relativeTime,
  shortStamp,
  type ClientTab
} from "@/components/admin/console/derive";
import { BlurField } from "@/components/admin/console/fields";
import { Badge, Card, EmptyState, HealthBadge, ProjectStatusBadge, SubscriptionBadge } from "@/components/admin/console/ui";
import { modelLabel } from "@/components/admin/console/views/ClientsView";
import type { ChangeRequest, ClientProject } from "@/components/admin/types";
import { WEBSITE_PURCHASE_STATUS_LABELS } from "@/lib/website-purchase";
import { buyoutPrice, elapsedBillingMonths, formatHuf, isWebsitePackage, isWebsitePurchaseRequest, purchaseOptionPrice, subscriptionPlan } from "@/lib/subscriptions";

/**
 * Az ügyfél-lap: egy projekt minden része, fülekre bontva.
 *
 * A régi adminban ez egyetlen ~9 700 pixel hosszú kártya volt telefonon. Itt
 * minden fülnek saját címe van (`/admin/ugyfelek/<id>/fizetes`), így a „Ma"
 * listáról egyenesen a megfelelő részre lehet ugrani.
 */

type Actions = AdminData["actions"];

export function ClientDetailView() {
  const admin = useAdmin();
  const params = useParams<{ id: string; lap?: string[] }>();
  const id = params?.id;
  const tabParam = Array.isArray(params?.lap) ? params.lap[0] : undefined;
  const tab: ClientTab = CLIENT_TABS.some(([value]) => value === tabParam) ? tabParam as ClientTab : "attekintes";
  const project = admin.clientProjects.find((item) => item.id === id) ?? null;

  if (!project) {
    return (
      <>
        <Link className="pa-back" href="/admin/ugyfelek">← Ügyfelek</Link>
        <div className="pa-card">
          {admin.loading ? (
            <div className="pa-card-body pa-stack">
              <span className="pa-skel" style={{ height: 28, width: "45%" }} />
              <span className="pa-skel" style={{ height: 14, width: "70%" }} />
              <span className="pa-skel" style={{ height: 120, width: "100%" }} />
            </div>
          ) : (
            <EmptyState title="Ez a projekt nem található">
              Lehet, hogy törölték. <Link className="pa-link" href="/admin/ugyfelek">Vissza az ügyfelekhez</Link>
            </EmptyState>
          )}
        </div>
      </>
    );
  }

  const changeCount = admin.changeRequests.filter((request) => request.project_id === project.id && !["completed", "declined"].includes(request.status)).length;
  const activePurchase = admin.websitePurchases.find((purchase) => purchase.project_id === project.id && !["completed", "declined", "cancelled"].includes(purchase.status));

  return (
    <>
      <Link className="pa-back" href="/admin/ugyfelek">← Ügyfelek</Link>

      <header className="pa-client-head">
        <div style={{ minWidth: 0 }}>
          <h1>{project.title}</h1>
          <div className="pa-row-top">
            <ProjectStatusBadge project={project} />
            <Badge>{project.commercial_model === "subscription" ? "Havidíjas" : "Egyszeri"}</Badge>
            {project.commercial_model === "subscription" && project.status === "launched" ? <HealthBadge status={project.site_health_status} /> : null}
          </div>
          <div className="pa-client-meta">
            <span>{project.contact_name || "Ügyfél"}</span>
            {project.contact_email ? <a href={`mailto:${project.contact_email}`}>{project.contact_email}</a> : null}
            {project.company ? <span>{project.company}</span> : null}
            {project.live_url || project.website ? <a href={project.live_url || project.website || "#"} rel="noreferrer" target="_blank">{(project.live_url || project.website || "").replace(/^https?:\/\//, "")} ↗</a> : null}
            <span>{modelLabel(project)}</span>
          </div>
        </div>
      </header>

      {project.delete_requested ? (
        <div className="pa-banner is-danger" role="alert">
          <div>
            <strong>Az ügyfél a projekt törlését kérte</strong>
            <p>Kérés ideje: {project.delete_requested_at ? formatDateTime(project.delete_requested_at) : "nem ismert"}. A törlés végleges, minden adat elvész.</p>
          </div>
          <div className="pa-inline">
            <button className="pa-btn is-danger" onClick={() => void admin.actions.approveDeletion(project)} type="button">Törlés jóváhagyása</button>
            <button className="pa-btn" onClick={() => void admin.actions.rejectDeletion(project)} type="button">Elutasítás</button>
          </div>
        </div>
      ) : null}

      {activePurchase && tab !== "fizetes" ? (
        <div className="pa-banner is-ai">
          <div>
            <strong>Az ügyfél tulajdonba venné a weboldalt</strong>
            <p>Vételár: {formatHuf(activePurchase.amount)} · {WEBSITE_PURCHASE_STATUS_LABELS[activePurchase.status] ?? activePurchase.status}</p>
          </div>
          <Link className="pa-btn is-primary is-sm" href={clientHref(project.id, "fizetes")}>Kivásárlás kezelése</Link>
        </div>
      ) : null}

      <nav aria-label="Projekt részei" className="pa-tabs">
        {CLIENT_TABS.map(([value, label]) => (
          <Link aria-current={tab === value ? "page" : undefined} href={clientHref(project.id, value)} key={value} scroll={false}>
            {label}
            {value === "ajanlat" && changeCount ? <span className="pa-count is-hot">{changeCount}</span> : null}
          </Link>
        ))}
      </nav>

      {tab === "attekintes" ? <OverviewTab project={project} /> : null}
      {tab === "brief" ? <BriefTab project={project} /> : null}
      {tab === "epites" ? <BuildTab project={project} /> : null}
      {tab === "ajanlat" ? <OfferTab project={project} /> : null}
      {tab === "fizetes" ? <PaymentTab project={project} /> : null}
      {tab === "ai" ? (
        <div className="pa-embed">
          <AiBuildPromptPanel onNotify={(text) => admin.actions.notify(text)} project={toAiPromptProject(project)} />
        </div>
      ) : null}
    </>
  );
}

/* ── Következő lépés ───────────────────────────────────────────────────── */

type GuideAction = { label: string; run: () => unknown; variant?: "primary" | "secondary" };
type Guide = { who: "admin" | "client"; step?: string; headline: string; detail: string; actions?: GuideAction[] };

/** A régi „Rajtad a sor" vezérlő szabályai fázisonként, változatlanul. */
function guideFor(project: ClientProject, actions: Actions): Guide | null {
  const managed = project.commercial_model === "subscription";
  const followup: GuideAction = { label: "Onboarding emlékeztető email", run: () => actions.sendFollowupReminder(project), variant: "secondary" };
  switch (project.status) {
    case "request_received":
      return { who: "admin", step: "1. lépés", headline: "Ajánlat előkészítése", detail: "Új igény érkezett. Olvasd át a briefet, majd egy kattintással készítsd elő az ajánlat vázát — utána az Ajánlat fülön tudod kitölteni.", actions: [{ label: "Ajánlat vázának előkészítése", run: () => actions.primeOffer(project) }] };
    case "planning":
      return { who: "admin", step: "2. lépés", headline: "Ajánlat összeállítása és küldése", detail: "Töltsd ki az Ajánlat fülön a címet, az ütemezést, a tételeket és az árat, majd küldd el. Elküldés után az ügyfélé a döntés.", actions: [{ label: "Ajánlat elküldése az ügyfélnek", run: () => actions.sendProjectOffer(project) }] };
    case "offer_sent":
      return { who: "client", headline: "Ajánlat elfogadására vár", detail: "Elküldted az ajánlatot. Az ügyfél most dönt: elfogadja, módosítást kér, vagy elutasítja. Jelez a rendszer, ha lépett." };
    case "contract_pending":
      return { who: "client", headline: "Szerződés aláírására vár", detail: managed ? "A választott havi csomag rögzítve van. A szerződés elfogadása indítja az építést; a díj a kész oldal jóváhagyása után esedékes." : "Az ügyfél elfogadta az ajánlatot. A szerződés aláírására vársz — utána a foglaló következik.", actions: [followup] };
    case "deposit_pending":
      if (managed) {
        if (project.payment_status === "deposit_paid") {
          return { who: "admin", headline: "Kifizetve — élesítsd az oldalt", detail: "Az ügyfél jóváhagyta a kész oldalt, és az első díj beérkezett. Állítsd be a domaint és a DNS-t, majd élesíts.", actions: [{ label: "Oldal élesítése", run: () => actions.launchManagedProject(project) }] };
        }
        return project.deposit_transfer_reported
          ? { who: "admin", headline: "Ellenőrizd az első díj beérkezését", detail: "Az ügyfél jelezte az utalást. Ha megérkezett, rögzítsd a befizetést a Fizetés fülön — utána élesíthetsz." }
          : { who: "client", headline: "Jóváhagyva — fizetésre vár", detail: "Az ügyfél jóváhagyta a kész oldalt. Most fizet: kártyánál a Stripe-terhelés, utalásnál a befizetés rögzítése után élesíthetsz.", actions: [followup] };
      }
      return project.deposit_transfer_reported
        ? { who: "admin", headline: "Ellenőrizd a foglaló beérkezését", detail: "Az ügyfél jelezte az utalást. Ellenőrizd a bankszámlát, és csak akkor indítsd a fejlesztést, ha az összeg megérkezett.", actions: [{ label: "Foglaló megérkezett — fejlesztés indítása", run: () => actions.advanceProject(project) }] }
        : { who: "client", headline: "Foglaló utalására vár", detail: "Az ügyfélnek kell elutalnia és jeleznie a foglalót. Addig nincs teendőd.", actions: [followup] };
    case "in_progress":
      return { who: "admin", step: "3. lépés", headline: "Fejlesztés", detail: "Folyik a munka. Frissítsd a mérföldköveket, add meg az előnézeti linket és a tervezett átadást. Ha kész a bemutatható verzió, küldd el jóváhagyásra.", actions: [{ label: "Előnézet küldése az ügyfélnek", run: () => actions.sendPreview(project) }] };
    case "review":
      return project.review_approved
        ? { who: "admin", headline: "Az ügyfél jóváhagyta — élesítsd az oldalt", detail: "A tartalom és a megjelenés jóváhagyva. Ellenőrizd az átadási pontokat, majd élesíts.", actions: [{ label: "Oldal élesítése", run: () => actions.advanceProject(project) }] }
        : { who: "client", headline: "Ügyfél-visszajelzésre vár", detail: "Az ügyfél most vagy módosítást kér, vagy jóváhagyja az oldalt. Addig ne léptesd tovább." };
    case "launched":
      if (managed) return { who: "admin", step: "4. lépés", headline: "Aktív menedzselt weboldal", detail: "Felügyelet alatt: figyeld a következő számlázást, az oldal állapotát és az ügyfél módosítási kéréseit." };
      if (project.final_transfer_reported && !project.final_payment_paid) return { who: "admin", headline: "Ellenőrizd a végső fizetést", detail: "Az ügyfél jelezte a hátralék utalását. Csak a bankszámla ellenőrzése után jelöld beérkezettnek." };
      if (project.final_payment_paid) return { who: "client", headline: "Az ügyfél lezárhatja a projektet", detail: "Nincs további teendőd. A lezárás után 30 napos díjmentes technikai garancia indul." };
      return { who: "client", headline: "Ügyfél lépésére vár", detail: "Az ügyfél rendezi a végső fizetést. Addig nincs teendőd." };
    case "paused":
      return { who: "admin", headline: "A projekt szünetel", detail: "Az Építés fülön a fázist visszaállíthatod, ha folytatódik a munka; a menedzselt előfizetést a Fizetés fülön indíthatod újra." };
    case "deletion_pending":
      return { who: "admin", headline: "Törlési kérelem elbírálása", detail: "Az ügyfél törlést kért. A fenti sávban jóváhagyhatod (végleges törlés) vagy elutasíthatod (visszaáll az előző fázisba)." };
    default:
      return null;
  }
}

const NEXT_LABEL: Record<string, string> = {
  request_received: "Ajánlat előkészítése",
  planning: "Ajánlat elküldése",
  in_progress: "Előnézet küldése",
  review: "Élesítés"
};

function nextLabel(project: ClientProject) {
  if (project.status === "deposit_pending") return project.commercial_model === "subscription" ? "Élesítés" : "Foglaló beérkezett";
  return NEXT_LABEL[project.status];
}

function OverviewTab({ project }: { project: ClientProject }) {
  const admin = useAdmin();
  const [busy, setBusy] = useState(false);

  if (!isLiveProject(project)) return <ClosedSummary project={project} />;

  const guide = guideFor(project, admin.actions);
  const flowIndex = PROJECT_FLOW.findIndex(([value]) => value === project.status);
  const adminMayAdvance = project.status === "request_received" || project.status === "planning" || project.status === "in_progress"
    || (project.status === "deposit_pending" && (project.deposit_transfer_reported || (project.commercial_model === "subscription" && project.payment_status === "deposit_paid")))
    || (project.status === "review" && project.review_approved);
  const conversations = admin.conversations.filter((item) => item.kind === "portal" && (item.projectId === project.id || (!item.projectId && item.userId === project.user_id)));
  const openChanges = admin.changeRequests.filter((request) => request.project_id === project.id && !["completed", "declined"].includes(request.status));
  const nextDue = admin.pendingPayments.find((payment) => payment.project_id === project.id) ?? null;
  const goal = parseBrief(project.goals)["Cél"] || (project.goals && !project.goals.includes(":") ? project.goals : "");

  async function run(action: () => unknown) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pa-split">
      <div className="pa-stack">
        {guide ? (
          <section className={`pa-next${guide.who === "admin" ? "" : " is-waiting"}`}>
            <div className="pa-row-top">
              <Badge tone={guide.who === "admin" ? "accent" : "neutral"}>{guide.who === "admin" ? (guide.step ? `${guide.step} · Rajtad a sor` : "Rajtad a sor") : "Ügyfélre vár"}</Badge>
            </div>
            <h2>{guide.headline}</h2>
            <p>{guide.detail}</p>
            {guide.actions?.length ? (
              <div className="pa-next-actions">
                {guide.actions.map((action) => (
                  <button className={`pa-btn${action.variant === "secondary" ? "" : " is-primary"}`} disabled={busy} key={action.label} onClick={() => void run(action.run)} type="button">
                    {action.label}
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {flowIndex >= 0 ? (
          <Card
            actions={adminMayAdvance && nextLabel(project) ? (
              <button className="pa-btn is-sm is-primary" disabled={busy} onClick={() => void run(() => admin.actions.advanceProject(project))} type="button">
                {nextLabel(project)} →
              </button>
            ) : <span className="pa-faint">A következő lépést most a másik fél végzi.</span>}
            title={`Folyamat · ${flowIndex + 1}/${PROJECT_FLOW.length} ${PROJECT_FLOW[flowIndex][1]}`}
          >
            <div className="pa-flow">
              {PROJECT_FLOW.map(([value, label], index) => (
                <div className={index < flowIndex ? "is-done" : index === flowIndex ? "is-now" : ""} key={value}>
                  <i />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Card title="Adatok">
          {goal ? <p className="pa-muted" style={{ marginBottom: 6 }}><b style={{ color: "var(--pa-text)" }}>Cél:</b> {goal}</p> : null}
          <div className="pa-kv">
            <div><span>Csomag</span><strong>{modelLabel(project)}</strong></div>
            <div><span>Fázis</span><strong>{PROJECT_STATUSES.find(([value]) => value === project.status)?.[1] ?? project.status}</strong></div>
            <div><span>Létrehozva</span><strong>{formatDate(project.created_at)}</strong></div>
            {project.estimated_deadline ? <div><span>Becsült átadás</span><strong>{project.estimated_deadline}</strong></div> : null}
            <div><span>Előnézet / staging</span><strong>{project.staging_url ? <a className="pa-link" href={project.staging_url} rel="noreferrer" target="_blank">{project.staging_url.replace(/^https?:\/\//, "")} ↗</a> : "Még nincs"}</strong></div>
            {project.commercial_model === "subscription" ? (
              <>
                <div><span>Előfizetés</span><strong><SubscriptionBadge status={project.subscription_status} /></strong></div>
                <div><span>Következő esedékesség</span><strong>{nextDue?.due_date ? `${formatDate(nextDue.due_date)} · ${formatHuf(nextDue.amount)}` : project.next_billing_at ? formatDate(project.next_billing_at) : "—"}</strong></div>
                {project.managed_domain_name ? <div><span>Domain</span><strong>{project.managed_domain_name}</strong></div> : null}
              </>
            ) : (
              <div><span>Fizetés</span><strong>{PAYMENT_STATUS_LABEL[project.payment_status] ?? project.payment_status}</strong></div>
            )}
            {project.last_modified_at ? <div><span>Utoljára módosította</span><strong>{project.last_modified_by_name || "Felhasználó"} · {relativeTime(project.last_modified_at, admin.nowMs)}</strong></div> : null}
          </div>
          {project.next_step ? (
            <div className="pa-banner" style={{ marginBottom: 0, marginTop: 14 }}>
              <div>
                <span className="pa-faint">Az ügyfél ezt látja következő lépésként</span>
                <p style={{ color: "var(--pa-text)" }}>{project.next_step}</p>
              </div>
              <Link className="pa-btn is-sm" href={clientHref(project.id, "epites")}>Módosítás</Link>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="pa-stack">
        {project.commercial_model === "subscription" && ["launched", "paused"].includes(project.status) ? (
          <Card title="Oldal állapota">
            <div className="pa-kv">
              <div><span>Állapot</span><strong><HealthBadge status={project.site_health_status} /></strong></div>
              <div><span>Utolsó ellenőrzés</span><strong>{project.last_health_check_at ? relativeTime(project.last_health_check_at, admin.nowMs) : "—"}</strong></div>
              {project.ssl_expires_at ? <div><span>SSL lejár</span><strong>{formatDate(project.ssl_expires_at)}</strong></div> : null}
              {project.domain_expires_at ? <div><span>Domain lejár</span><strong>{formatDate(project.domain_expires_at)}</strong></div> : null}
              {typeof project.psi_performance === "number" ? <div><span>PageSpeed (teljesítmény / SEO)</span><strong>{project.psi_performance} / {project.psi_seo ?? "—"}</strong></div> : null}
            </div>
          </Card>
        ) : null}

        <Card subtitle={openChanges.length ? `${openChanges.length} nyitott` : undefined} title="Kérések">
          {openChanges.length === 0 ? (
            <p className="pa-faint">Nincs nyitott módosítási kérés.</p>
          ) : (
            <div className="pa-stack is-tight">
              {openChanges.slice(0, 4).map((request) => (
                <Link className="pa-link" href={clientHref(project.id, isWebsitePurchaseRequest(request.description) ? "fizetes" : "ajanlat")} key={request.id}>
                  {CHANGE_CATEGORY_LABEL[request.category] ?? request.category}: {request.description.length > 70 ? `${request.description.slice(0, 69)}…` : request.description}
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Üzenetek">
          {conversations.length === 0 ? (
            <p className="pa-faint">Még nem írt az ügyfélkapuban.</p>
          ) : (
            <div className="pa-stack is-tight">
              {conversations.slice(0, 5).map((item) => (
                <Link className="pa-link" href={`/admin/beszelgetesek/${item.id}`} key={item.id}>
                  {item.needsReply ? "● " : ""}{item.subtitle} · {shortStamp(item.lastActivity, admin.nowMs)}
                </Link>
              ))}
            </div>
          )}
        </Card>

        <DangerZone project={project} />
      </div>
    </div>
  );
}

function DangerZone({ project }: { project: ClientProject }) {
  const admin = useAdmin();
  const router = useRouter();
  return (
    <details className="pa-card pa-card-pad pa-details">
      <summary>Veszélyes műveletek</summary>
      <div className="pa-stack is-tight" style={{ marginTop: 10 }}>
        <p className="pa-faint">A projekt és minden adata véglegesen törlődik. Ha él Stripe-előfizetés, előbb azt szünteti meg.</p>
        <button
          className="pa-btn is-danger"
          onClick={async () => {
            if (await admin.actions.approveDeletion(project)) router.push("/admin/ugyfelek");
          }}
          type="button"
        >
          Projekt végleges törlése
        </button>
      </div>
    </details>
  );
}

/** Lezárt projekt — a régi archív kártya három változata. */
function ClosedSummary({ project }: { project: ClientProject }) {
  const admin = useAdmin();
  const warrantyUntil = project.warranty_expires_at ? new Date(project.warranty_expires_at) : null;
  const warrantyActive = warrantyUntil ? warrantyUntil.getTime() > admin.nowMs : false;
  const cancelledSubscription = project.commercial_model === "subscription" && project.subscription_status === "cancelled";
  const completedPurchase = project.commercial_model === "purchase" && Boolean(project.warranty_started_at || project.final_payment_paid_at || project.final_payment_paid);

  return (
    <div className="pa-split">
      <div className="pa-stack">
        <Card title="Lezárt projekt">
          {cancelledSubscription ? (
            <div className="pa-stack is-tight">
              <p className="pa-muted">Ez lemondott menedzselt szolgáltatás, nem elkészült és átadott projekt. Nem tartozik hozzá projektlezárási értékelés vagy 30 napos technikai garancia.</p>
              <p className="pa-faint">Leállítás dátuma: {project.cancel_effective_at ? formatDate(project.cancel_effective_at) : "nincs rögzítve"}</p>
            </div>
          ) : !completedPurchase ? (
            <p className="pa-muted">{project.offer_status === "declined" ? "Az ügyfél elutasította az ajánlatot." : "Teljesítés nélkül lezárva."} Nem történt kész weboldal-átadás, ezért nem tartozik hozzá értékelés vagy 30 napos technikai garancia.</p>
          ) : (
            <div className="pa-stack">
              <div className="pa-kv">
                <div><span>Ügyfél értékelése</span><strong>{project.client_rating ? <span className="pa-stars">{"★".repeat(project.client_rating)}</span> : "Még nem értékelt"}</strong></div>
                {project.client_review ? <div><span>Vélemény</span><strong>„{project.client_review}”</strong></div> : null}
                <div><span>30 napos technikai garancia</span><strong>{warrantyUntil ? `${warrantyActive ? "Aktív" : "Lejárt"} · ${formatDate(warrantyUntil.toISOString())}-ig` : "Nincs rögzített kezdődátum"}</strong></div>
              </div>
              <p className="pa-faint">Nem automatikus karbantartás: csak az átadott működés igazolt hibáit javítjuk. Új tartalom és új funkció külön kérés. A garanciális hibát az ügyfél ticketben jelzi.</p>
            </div>
          )}
        </Card>
      </div>
      <div className="pa-stack">
        <DangerZone project={project} />
      </div>
    </div>
  );
}

/* ── Brief ─────────────────────────────────────────────────────────────── */

function BriefTab({ project }: { project: ClientProject }) {
  const brief = useMemo(() => parseBrief(project.goals), [project.goals]);
  const palette: string[] = project.brief_data?.palette === "custom"
    ? [project.brief_data.customBg, project.brief_data.customAccent, project.brief_data.customText, project.brief_data.customCta].filter(Boolean)
    : paletteByName(brief["Színirány"]);
  const briefFields = ([
    ["Cél", brief["Cél"]],
    ["Célközönség", brief["Célközönség / vásárlók"]],
    ["Elsődleges művelet", brief["Elsődleges látogatói művelet"]],
    ["Oldalak", brief["Fontos oldalak"]],
    ["Funkciók", brief["Kért funkciók"]],
    ["Stílus", brief["Stílus / hangulat"]],
    ["Karakter", brief["Vizuális karakter"]],
    ["Prioritás", brief["Prioritás"]]
  ] as Array<[string, string | undefined]>).filter(([, value]) => Boolean(value));
  const assetFields = ([
    ["Domain", brief["Domain"]],
    ["Vágyott domainek", brief["Vágyott domainek"]],
    ["Jelenlegi rendszer", brief["Jelenlegi rendszer"]],
    ["Logó", brief["Logó"]],
    ["Logó típusa", brief["Logó típusa"]],
    ["Logó színei", brief["Logó színei"]],
    ["Logó leírás", brief["Logó leírás"]],
    ["Márkaszín", brief["Márkaszín"]],
    ["Betűtípus", brief["Betűtípus"]],
    ["Szövegek", brief["Szövegek"]],
    ["Képek", brief["Képek"]],
    ["Kapcsolati email", brief["Kapcsolati email"]],
    ["Telefon", brief["Telefon"]],
    ["Közösségi linkek", brief["Közösségi linkek"]],
    ["Facebook", project.brief_data?.facebookUrl || brief["Facebook"]],
    ["Instagram", project.brief_data?.instagramUrl || brief["Instagram"]],
    ["LinkedIn", project.brief_data?.linkedinUrl || brief["LinkedIn"]],
    ["TikTok", project.brief_data?.tiktokUrl || brief["TikTok"]],
    ["YouTube", project.brief_data?.youtubeUrl || brief["YouTube"]],
    ["Egyéb linkek", project.brief_data?.otherSocialLinks || brief["Egyéb linkek"]],
    ["Analytics", brief["Analytics"]],
    ["Számlázási adatok", brief["Számlázási adatok"]]
  ] as Array<[string, string | undefined]>).filter(([, value]) => Boolean(value));
  const photos: string[] = project.brief_data?.photoUrls ?? [];
  const files: string[] = project.brief_data?.contentFileUrls ?? [];

  if (!briefFields.length && !assetFields.length && !photos.length && !files.length && !project.logo_url) {
    return (
      <div className="pa-card">
        <EmptyState title="Nincs kitöltött brief">
          {project.goals ? project.goals : "Ehhez a projekthez még nem érkezett adatlap."}
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="pa-stack">
      <Card title="Stílusirány és színvilág">
        <div className="pa-stack is-tight">
          <p className="pa-muted">{brief["Stílus / hangulat"] || "Nincs külön stílus megjegyzés megadva."}</p>
          {palette.length ? (
            <div className="pa-palette">
              {palette.map((color) => <span key={color} style={{ background: color }} title={color} />)}
            </div>
          ) : null}
        </div>
      </Card>

      {briefFields.length ? (
        <Card subtitle={`${briefFields.length} válasz`} title="Kérdőív és célok">
          <div className="pa-kv is-wide">
            {briefFields.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
        </Card>
      ) : null}

      {assetFields.length ? (
        <Card subtitle={`${assetFields.length} tétel`} title="Anyagok és hozzáférések">
          <div className="pa-kv is-wide">
            {assetFields.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
        </Card>
      ) : null}

      {project.logo_url ? (
        <Card title="Feltöltött logó">
          <div className="asset-preview-grid logo-asset-preview" style={{ maxWidth: 220 }}>
            <AssetImage alt={`${project.company || project.title} logó`} value={project.logo_url} />
          </div>
        </Card>
      ) : null}

      {photos.length ? (
        <Card subtitle={`${photos.length} kép`} title="Feltöltött képek">
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
            {photos.map((url, index) => <AssetImage alt={`Kép ${index + 1}`} key={url} value={url} />)}
          </div>
        </Card>
      ) : null}

      {files.length ? (
        <Card subtitle={`${files.length} fájl`} title="Dokumentumok és szövegek">
          <div className="pa-stack is-tight">
            {files.map((url, index) => <AssetLink key={url} label={`Fájl ${index + 1}`} value={url} />)}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/* ── Építés ────────────────────────────────────────────────────────────── */

function BuildTab({ project }: { project: ClientProject }) {
  const admin = useAdmin();
  const [newMilestone, setNewMilestone] = useState("");
  const milestones = project.milestones ?? [];
  const showHandover = project.commercial_model !== "subscription"
    && !admin.websitePurchases.some((purchase) => purchase.project_id === project.id && purchase.status !== "cancelled")
    && project.status !== "closed"
    && project.status !== "deletion_pending";

  async function addMilestone(event: FormEvent) {
    event.preventDefault();
    const title = newMilestone.trim();
    if (!title) return;
    if (await admin.actions.setMilestones(project, [...milestones, { title, done: false }])) setNewMilestone("");
  }

  return (
    <div className="pa-stack">
      <Card subtitle="A fázis és a következő lépés változásáról az ügyfél értesítést kap." title="Fázis és felügyelet">
        <div className="pa-form-grid">
          <label className="pa-field">
            <span>Fázis</span>
            <select
              className="pa-select"
              onChange={(event) => void admin.actions.updateClientProject(project.id, { status: event.target.value })}
              value={project.status}
            >
              {PROJECT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <BlurField label="Becsült átadási határidő" onSave={(next) => admin.actions.updateClientProject(project.id, { estimated_deadline: next.trim() || null })} placeholder="pl. 2026. november 15." value={project.estimated_deadline} />
          <BlurField label="Előnézeti (staging) link" onSave={(next) => admin.actions.updateClientProject(project.id, { staging_url: next.trim() || null })} placeholder="https://preview.projectedge.hu" type="url" value={project.staging_url} wide />
          <BlurField hint="Az ügyfél ezt látja a dashboardján." label="Következő lépés" multiline onSave={(next) => admin.actions.updateClientProject(project.id, { next_step: next.trim() || null })} placeholder="Mit lát az ügyfél a dashboardban…" rows={3} value={project.next_step} wide />
        </div>
      </Card>

      <Card subtitle={milestones.length ? `${milestones.filter((m) => m.done).length}/${milestones.length} kész` : "Az ügyfél is látja a haladást."} title="Mérföldkövek">
        <div className="pa-stack is-tight">
          {milestones.length === 0 ? <p className="pa-faint">Még nincs mérföldkő.</p> : milestones.map((milestone, index) => (
            <label className={`pa-check${milestone.done ? " is-done" : ""}`} key={`${milestone.title}-${index}`}>
              <input
                checked={milestone.done}
                onChange={(event) => void admin.actions.setMilestones(project, milestones.map((item, i) => (i === index ? { ...item, done: event.target.checked } : item)))}
                type="checkbox"
              />
              <span>{milestone.title}</span>
            </label>
          ))}
          <form className="pa-inline" onSubmit={addMilestone} style={{ flexWrap: "nowrap" }}>
            <input className="pa-input" onChange={(event) => setNewMilestone(event.target.value)} placeholder="Új mérföldkő…" value={newMilestone} />
            <button className="pa-btn" disabled={!newMilestone.trim()} type="submit">Hozzáadás</button>
          </form>
        </div>
      </Card>

      {showHandover ? (
        <div className="pa-embed">
          <AdminHandoverPanel
            onChange={(steps) => void admin.actions.setHandoverSteps(project, steps)}
            onStepCompleted={(_stepId, title) => void admin.actions.notifyHandoverStep(project, title)}
            steps={project.handover_steps}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ── Ajánlat és kérések ────────────────────────────────────────────────── */

function OfferTab({ project }: { project: ClientProject }) {
  const admin = useAdmin();
  const requests = admin.changeRequests.filter((request) => request.project_id === project.id);
  const open = requests.filter((request) => !["completed", "declined"].includes(request.status));
  const done = requests.filter((request) => ["completed", "declined"].includes(request.status));

  return (
    <div className="pa-stack">
      <Card
        subtitle={project.commercial_model === "subscription" ? "Havi keretfogyasztás a csomag szerint." : undefined}
        title={`Módosítási kérések${open.length ? ` · ${open.length} nyitott` : ""}`}
      >
        {open.length === 0 ? <p className="pa-faint">Nincs nyitott módosítási kérés.</p> : (
          <div className="pa-stack">
            {open.map((request) => <ChangeRequestCard key={request.id} project={project} request={request} />)}
          </div>
        )}
        {done.length ? (
          <details className="pa-details" style={{ marginTop: 14 }}>
            <summary>Lezárt kérések ({done.length})</summary>
            <div className="pa-stack" style={{ marginTop: 10 }}>
              {done.map((request) => <ChangeRequestCard key={request.id} project={project} request={request} />)}
            </div>
          </details>
        ) : null}
      </Card>

      <Card subtitle={`Állapot: ${project.offer_status === "sent" ? "elküldve" : project.offer_status === "accepted" ? "elfogadva" : project.offer_status === "declined" ? "elutasítva" : "piszkozat"}${project.offer_sent_at ? ` · ${formatDate(project.offer_sent_at)}` : ""}`} title="Árajánlat">
        <div className="pa-form-grid">
          <BlurField label="Ajánlat címe" onSave={(next) => admin.actions.updateClientProject(project.id, { offer_title: next })} placeholder="pl. Budai Otthonok — exkluzív weboldal" value={project.offer_title} wide />
          <BlurField label="Ár (Ft)" onSave={(next) => admin.actions.updateClientProject(project.id, { offer_price: next.trim() ? Number(next) : null })} placeholder="pl. 240000" type="number" value={project.offer_price} />
          <BlurField label="Ütemezés" onSave={(next) => admin.actions.updateClientProject(project.id, { offer_timeline: next })} placeholder="pl. 2 hét tervezés + 3 hét fejlesztés" value={project.offer_timeline} />
          <BlurField label="Összefoglaló" multiline onSave={(next) => admin.actions.updateClientProject(project.id, { offer_summary: next })} placeholder="Rövid, meggyőző indoklás…" rows={3} value={project.offer_summary} wide />
          <BlurField hint="Soronként egy tétel." label="Szállítandó tételek" multiline onSave={(next) => admin.actions.updateClientProject(project.id, { offer_deliverables: next })} placeholder={"Egyedi design\nReszponzív felépítés\nSEO optimalizálás"} rows={5} value={project.offer_deliverables} wide />
        </div>
        <div className="pa-inline" style={{ justifyContent: "flex-end", marginTop: 14 }}>
          <button className="pa-btn is-primary" onClick={() => void admin.actions.sendProjectOffer(project)} type="button">Ajánlat elküldése az ügyfélnek</button>
        </div>
      </Card>
    </div>
  );
}

function ChangeRequestCard({ request, project }: { request: ChangeRequest; project: ClientProject }) {
  const admin = useAdmin();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const isPurchase = isWebsitePurchaseRequest(request.description);
  const needsQuote = !isPurchase && request.included_in_plan === false && !request.paid_at;

  return (
    <article className="pa-card pa-card-pad" style={{ boxShadow: "none" }}>
      <div className="pa-stack is-tight">
        <div className="pa-inline" style={{ justifyContent: "space-between" }}>
          <div className="pa-row-top">
            <Badge tone={request.category === "technical" ? "danger" : "ai"}>{isPurchase ? "Kivásárlás" : CHANGE_CATEGORY_LABEL[request.category] ?? request.category}</Badge>
            {request.included_in_plan === true ? <Badge tone="success">Keretben</Badge> : request.included_in_plan === false ? <Badge tone="warn">Kereten felül</Badge> : null}
            <span className="pa-faint">{formatDateTime(request.requested_at)}</span>
          </div>
          <select
            aria-label="Kérés állapota"
            className="pa-select"
            onChange={(event) => void admin.actions.setChangeRequestStatus(request, project, event.target.value as ChangeRequest["status"])}
            style={{ maxWidth: 190, minHeight: 34 }}
            value={request.status}
          >
            {CHANGE_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <p style={{ whiteSpace: "pre-wrap" }}>{request.description}</p>

        {request.transfer_reported_at && request.status !== "completed" && !request.paid_at ? (
          <div className="pa-banner is-accent" style={{ marginBottom: 0 }}>
            <div>
              <strong>Az ügyfél jelezte az utalást</strong>
              <p>Összeg: {formatHuf(request.quoted_amount ?? 0)} · Közlemény: {request.payment_reference ?? "—"}</p>
            </div>
            <button className="pa-btn is-primary is-sm" onClick={() => void admin.actions.confirmChangePayment(request, project)} type="button">Beérkezett — munka indítása</button>
          </div>
        ) : null}

        {needsQuote && !(request.transfer_reported_at && request.status !== "completed") ? (
          request.quoted_amount ? (
            <div className="pa-banner" style={{ marginBottom: 0 }}>
              <div>
                <strong>{formatHuf(request.quoted_amount)}</strong>
                <p>
                  {request.transfer_reported_at ? "Az ügyfél jelezte az utalást — ellenőrizd a számlát." : request.quote_accepted_at ? "Az ügyfél elfogadta, utalásra vár." : "Elküldve, az ügyfél döntésére vár."}
                  {request.payment_reference ? ` · Közlemény: ${request.payment_reference}` : ""}
                </p>
              </div>
            </div>
          ) : (
            <form
              className="pa-form-grid"
              onSubmit={async (event) => {
                event.preventDefault();
                setSending(true);
                const ok = await admin.actions.sendChangeQuote(request, project, Number(amount), note);
                setSending(false);
                if (ok) {
                  setAmount("");
                  setNote("");
                }
              }}
            >
              <label className="pa-field">
                <span>Ajánlati ár (Ft)</span>
                <input className="pa-input" inputMode="numeric" min={1000} onChange={(event) => setAmount(event.target.value)} placeholder="pl. 45000" required step={100} type="number" value={amount} />
              </label>
              <label className="pa-field">
                <span>Mit tartalmaz?</span>
                <input className="pa-input" onChange={(event) => setNote(event.target.value)} placeholder="pl. Egyedi naptár modul, 3 munkanap" required value={note} />
              </label>
              <div className="is-wide pa-inline" style={{ justifyContent: "flex-end" }}>
                <button className="pa-btn is-primary" disabled={sending} type="submit">{sending ? "Küldés…" : "Ajánlat küldése"}</button>
              </div>
            </form>
          )
        ) : null}

        <ChangeThread onSent={() => admin.actions.notifyChangeThreadReply(project)} requestId={request.id} role="admin" />
      </div>
    </article>
  );
}

/* ── Fizetés ───────────────────────────────────────────────────────────── */

function PaymentTab({ project }: { project: ClientProject }) {
  const admin = useAdmin();
  const [busy, setBusy] = useState(false);
  const managed = project.commercial_model === "subscription";
  const purchases = admin.websitePurchases.filter((purchase) => purchase.project_id === project.id);
  const nextDue = admin.pendingPayments.find((payment) => payment.project_id === project.id) ?? null;
  const status = project.subscription_status ?? "inactive";
  const plan = subscriptionPlan(project.subscription_plan);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const anchor = project.billing_cycle_started_at ?? project.subscription_started_at ?? project.created_at;
  const buyout = managed ? buyoutPrice(project.subscription_plan, elapsedBillingMonths(anchor)) : null;
  const purchasePlan = !managed && project.brief_data && isWebsitePackage(project.brief_data) ? subscriptionPlan(project.brief_data.subscriptionPlan) : null;

  return (
    <div className="pa-stack">
      {managed ? (
        <>
          {status.endsWith("_requested") ? (
            <div className="pa-banner is-accent">
              <div>
                <strong>{status === "pause_requested" ? "Szüneteltetést kért" : status === "resume_requested" ? "Újraindítást kért" : "Lemondást kért"}</strong>
                <p>A jóváhagyás a Stripe-ban is elvégzi a módosítást{status === "cancel_requested" ? " — érdemes előtte felhívni az ügyfelet." : "."}</p>
              </div>
              <div className="pa-inline">
                {status === "pause_requested" ? <button className="pa-btn is-primary" disabled={busy} onClick={() => void run(() => admin.actions.approveSubscriptionPause(project))} type="button">Szüneteltetés jóváhagyása</button> : null}
                {status === "resume_requested" ? <button className="pa-btn is-primary" disabled={busy} onClick={() => void run(() => admin.actions.approveSubscriptionResume(project))} type="button">Újraindítás</button> : null}
                {status === "cancel_requested" ? <button className="pa-btn is-danger" disabled={busy} onClick={() => void run(() => admin.actions.finishSubscriptionCancellation(project))} type="button">Lemondás lezárása</button> : null}
                <button className="pa-btn" disabled={busy} onClick={() => void run(() => admin.actions.declineSubscriptionRequest(project))} type="button">Elutasítás</button>
              </div>
            </div>
          ) : null}

          <Card title="Előfizetés">
            <div className="pa-kv">
              <div><span>Csomag</span><strong>{plan.name} · {formatHuf(project.monthly_price ?? plan.price)}/hó</strong></div>
              <div><span>Állapot</span><strong><SubscriptionBadge status={project.subscription_status} /></strong></div>
              {project.billing_amount ? <div><span>Alkudott ciklusdíj</span><strong>{formatHuf(project.billing_amount)}</strong></div> : null}
              <div><span>Fizetési mód</span><strong>{project.payment_method === "bank_transfer" ? "Banki átutalás" : project.payment_method === "stripe" ? "Bankkártya (Stripe)" : "—"}</strong></div>
              <div><span>Következő esedékesség</span><strong>{nextDue?.due_date ? `${formatDate(nextDue.due_date)} · ${formatHuf(nextDue.amount)}${nextDue.status === "reported" ? " · utalást jelzett" : ""}` : project.next_billing_at ? formatDate(project.next_billing_at) : "—"}</strong></div>
              {project.prepaid_until ? <div><span>Előre fizetve</span><strong>{formatDate(project.prepaid_until)}-ig</strong></div> : null}
              <div><span>Stripe ügyfél</span><strong className="pa-mono">{project.stripe_customer_id || "nincs összekapcsolva"}</strong></div>
              <div><span>Stripe előfizetés</span><strong className="pa-mono">{project.stripe_subscription_id || "nincs összekapcsolva"}</strong></div>
            </div>
            {status === "active" ? (
              <div className="pa-inline" style={{ marginTop: 14 }}>
                <button className="pa-btn" disabled={busy} onClick={() => void run(() => admin.actions.approveSubscriptionPause(project))} type="button">Szüneteltetés</button>
                <button className="pa-btn is-danger" disabled={busy} onClick={() => void run(() => admin.actions.finishSubscriptionCancellation(project))} type="button">Előfizetés megszüntetése</button>
              </div>
            ) : status === "paused" ? (
              <div className="pa-inline" style={{ marginTop: 14 }}>
                <button className="pa-btn is-primary" disabled={busy} onClick={() => void run(() => admin.actions.approveSubscriptionResume(project))} type="button">Újraindítás</button>
              </div>
            ) : null}
          </Card>

          <div className="pa-embed">
            <PaymentActionsPanel nextDue={nextDue} onDone={() => admin.actions.reload(true)} onNotice={(text) => admin.actions.notify(text)} project={project} />
          </div>
        </>
      ) : (
        <Card title="Fizetés">
          <div className="pa-kv">
            <div><span>Konstrukció</span><strong>{modelLabel(project)}</strong></div>
            <div><span>Állapot</span><strong>{PAYMENT_STATUS_LABEL[project.payment_status] ?? project.payment_status}</strong></div>
            {project.offer_price ? <div><span>Vételár</span><strong>{formatHuf(project.offer_price)}</strong></div> : purchasePlan ? <div><span>Listaár</span><strong>{formatHuf(purchaseOptionPrice(purchasePlan.key))}</strong></div> : null}
            {project.deposit_amount ? <div><span>Foglaló</span><strong>{formatHuf(project.deposit_amount)}{project.deposit_transfer_reported ? " · utalást jelzett" : ""}</strong></div> : null}
            <div><span>Végső fizetés</span><strong>{project.final_payment_paid ? `Beérkezett${project.final_payment_paid_at ? ` · ${formatDate(project.final_payment_paid_at)}` : ""}` : project.final_transfer_reported ? "Utalást jelzett — ellenőrizd" : "Még nem"}</strong></div>
            <div><span>Szerződés</span><strong>{project.contract_accepted ? `Elfogadva${project.contract_accepted_at ? ` · ${formatDate(project.contract_accepted_at)}` : ""}` : "Még nincs"}</strong></div>
          </div>
        </Card>
      )}

      {purchases.length ? purchases.map((purchase) => (
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
      )) : managed && buyout ? (
        <Card title="Tulajdonba vétel (kivásárlás)">
          <div className="pa-stack is-tight">
            <p className="pa-muted">
              Listaár: <strong>{formatHuf(buyout.list)}</strong> · {buyout.months} befizetett hónap beszámítása: <strong>−{formatHuf(buyout.credit)}</strong> · fizetendő: <strong>{formatHuf(buyout.payable)}</strong>.
            </p>
            <p className="pa-faint">A folyamat indításakor az ügyfél fizetési összefoglalót kap; a fizetés után leáll az előfizetés, és elindul a technikai átadás.</p>
            <div>
              <button className="pa-btn" onClick={() => void admin.actions.startProjectWebsitePurchase(project)} type="button">Kivásárlási folyamat indítása</button>
            </div>
          </div>
        </Card>
      ) : null}

      {managed ? (
        <details className="pa-card pa-card-pad pa-details">
          <summary>Kézi felülírás (haladó)</summary>
          <div className="pa-stack is-tight" style={{ marginTop: 10 }}>
            <p className="pa-faint">Ezek csak az adatbázist írják, a Stripe-hoz NEM nyúlnak. Előfizetés-változáshoz a fenti gombokat használd; ez csak javításra való (pl. elcsúszott állapot).</p>
            <div className="pa-form-grid">
              <label className="pa-field">
                <span>Előfizetés állapota</span>
                <select className="pa-select" onChange={(event) => void admin.actions.updateClientProject(project.id, { subscription_status: event.target.value })} value={status}>
                  {SUBSCRIPTION_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="pa-field">
                <span>Oldal állapota</span>
                <select className="pa-select" onChange={(event) => void admin.actions.updateClientProject(project.id, { site_health_status: event.target.value, last_health_check_at: new Date().toISOString() })} value={project.site_health_status ?? "healthy"}>
                  {SITE_HEALTH.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}
