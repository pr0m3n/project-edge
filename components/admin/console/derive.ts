/**
 * Az admin konzol tiszta logikája: címkék, beszélgetés-összesítés, teendőlista
 * és számlálók.
 *
 * Szándékosan React és Supabase nélkül, csak bemenet → kimenet: így
 * `node --test` alatt közvetlenül tesztelhető (`tests/admin-console.test.mjs`).
 * A régi adminban ugyanez a logika három komponensben élt szétszórva (a „Ma",
 * a „Teendők & Inbox" és a fejléc számlálói), egymástól eltérő szabályokkal —
 * például a lezárt projekt „nem elérhető" riasztása, vagy az AI-beszélgetések,
 * amiket egyetlen számláló sem számolt. Itt egy helyen dől el minden.
 */

import { addBillingInterval, daysUntil, monthlyRevenue, projectCycleMonths } from "@/lib/onboarding";
import { formatHuf, isWebsitePurchaseRequest } from "@/lib/subscriptions";
import type {
  BillingoIssue,
  ChangeRequest,
  ClientProject,
  ClientTicket,
  Lead,
  Ticket,
  TicketMessage,
  WebsitePurchase
} from "@/components/admin/types";

/* ── Címkék ─────────────────────────────────────────────────────────────── */

export const PROJECT_STATUSES: Array<[string, string]> = [
  ["request_received", "Igény beérkezett"],
  ["planning", "Tervezés"],
  ["offer_sent", "Ajánlat elküldve"],
  ["deposit_pending", "Fizetésre vár (élesítés előtt)"],
  ["contract_pending", "Szerződés aláírásra vár"],
  ["in_progress", "Kivitelezés"],
  ["review", "Ügyfél-visszajelzés"],
  ["launched", "Élesítve"],
  ["paused", "Szünetel"],
  ["closed", "Lezárva"],
  ["deletion_pending", "Törlés jóváhagyásra vár"]
];

export const PROJECT_STATUS_LABEL: Record<string, string> = Object.fromEntries(PROJECT_STATUSES);

/** Az ügyfélkapuval AZONOS sorrend — a fizetés a jóváhagyás után van. */
export const PROJECT_FLOW: Array<[string, string]> = [
  ["request_received", "Igény"],
  ["planning", "Tervezés"],
  ["offer_sent", "Ajánlat"],
  ["contract_pending", "Szerződés"],
  ["in_progress", "Építés"],
  ["review", "Jóváhagyás"],
  ["deposit_pending", "Fizetés"],
  ["launched", "Éles"]
];

export const LEAD_STATUSES: Array<[string, string]> = [
  ["new", "Új"],
  ["contacted", "Megkeresve"],
  ["proposal_sent", "Ajánlat elküldve"],
  ["won", "Nyert"],
  ["lost", "Elveszett"],
  ["archived", "Archivált"]
];

/** A látogatói (widget/AI) beszélgetés állapotai. Az ügyfélkapus ticketnek nincs `bot` állapota. */
export const PUBLIC_TICKET_STATUSES: Array<[string, string]> = [
  ["bot", "AI kezeli"],
  ["open", "Válaszra vár"],
  ["answered", "Megválaszolva"],
  ["closed", "Lezárva"]
];

export const PORTAL_TICKET_STATUSES: Array<[string, string]> = PUBLIC_TICKET_STATUSES.filter(([value]) => value !== "bot");

export const CHANGE_STATUSES: Array<[ChangeRequest["status"], string]> = [
  ["new", "Új"],
  ["in_progress", "Folyamatban"],
  ["waiting_client", "Ügyfélre vár"],
  ["planned", "Tervezve"],
  ["completed", "Elkészült"],
  ["declined", "Elutasítva"]
];

export const CHANGE_CATEGORY_LABEL: Record<string, string> = {
  content: "Tartalom",
  design: "Design",
  technical: "Technikai hiba",
  new_feature: "Új funkció"
};

export const SUBSCRIPTION_STATUSES: Array<[string, string]> = [
  ["inactive", "Inaktív"],
  ["active", "Aktív"],
  ["pause_requested", "Szüneteltetést kért"],
  ["paused", "Szüneteltetve"],
  ["resume_requested", "Újraindítást kért"],
  ["cancel_requested", "Lemondást kért"],
  ["cancelled", "Lemondva"]
];

export const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = Object.fromEntries(SUBSCRIPTION_STATUSES);

export const SITE_HEALTH: Array<[string, string]> = [
  ["healthy", "Rendben"],
  ["issue_detected", "Figyelmet igényel"],
  ["offline", "Leállt"]
];

export const SITE_HEALTH_LABEL: Record<string, string> = Object.fromEntries(SITE_HEALTH);

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: "Még nem fizetett",
  deposit_paid: "Első díj / foglaló beérkezett",
  fully_paid: "Teljesen kifizetve"
};

/* ── Dátum és szöveg ─────────────────────────────────────────────────────── */

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("hu-HU", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

/** „3 napja", „2 órája" — egy pillantásra mutatja, ki aktív és ki hűlt ki. */
export function relativeTime(value: string | null | undefined, nowMs: number) {
  if (!value) return "soha";
  const diffMs = nowMs - new Date(value).getTime();
  if (Number.isNaN(diffMs)) return "—";
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "épp most";
  if (minutes < 60) return `${minutes} perce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} órája`;
  const days = Math.round(hours / 24);
  if (days < 31) return `${days} napja`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} hónapja`;
  return `${Math.round(months / 12)} éve`;
}

/** Rövid lista-dátum: ma óra:perc, egyébként „okt. 3.". */
export function shortStamp(value: string | null | undefined, nowMs: number) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date(nowMs);
  const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  return sameDay
    ? date.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("hu-HU", { month: "short", day: "numeric" });
}

function clip(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/* ── Projekt ────────────────────────────────────────────────────────────── */

/** Élő (nem lezárt) projekt. A lezárt projekt CSAK az archívumban jelenik meg. */
export function isLiveProject(project: Pick<ClientProject, "status">) {
  return project.status !== "closed";
}

/** A projekt a te lépésedre vár (a régi „Rajtad a sor" szabály változatlanul). */
export function isAdminTurn(project: ClientProject) {
  return ["request_received", "planning", "in_progress"].includes(project.status)
    || (project.status === "deposit_pending" && project.deposit_transfer_reported)
    || (project.status === "review" && project.review_approved)
    || (project.status === "launched" && project.final_transfer_reported && !project.final_payment_paid);
}

export function clientName(project: Pick<ClientProject, "company" | "contact_name" | "title">) {
  return project.company || project.contact_name || project.title || "Ismeretlen ügyfél";
}

/* ── Beszélgetések ──────────────────────────────────────────────────────── */

export type ConversationKind = "public" | "portal";

export type Conversation = {
  id: string;
  kind: ConversationKind;
  title: string;
  subtitle: string;
  email: string | null;
  status: string;
  /** Honnan jött: AI-chat, gyors sáv, widget vagy ügyfélkapu. */
  source: "ai" | "gyorssav" | "widget" | "portal";
  viaBot: boolean;
  handoffReason: string | null;
  /** Válaszra vár (nyitott). Ez számít a „megválaszolatlan" számlálóba. */
  needsReply: boolean;
  lastActivity: string;
  snippet: string;
  messageCount: number;
  projectId: string | null;
  userId: string | null;
  rating: number | null;
  ratingComment: string | null;
};

export const SOURCE_LABEL: Record<Conversation["source"], string> = {
  ai: "AI-chat",
  gyorssav: "Gyors sáv",
  widget: "Widget",
  portal: "Ügyfélkapu"
};

/**
 * A két ticket-tábla egy listában. Az AI-beszélgetés címe az első kérdése —
 * a régi „Névtelen látogató · …" cím miatt nem lehetett megkülönböztetni őket.
 */
export function buildConversations(input: {
  tickets: Ticket[];
  ticketMessages: Record<string, TicketMessage[]>;
  clientTickets: ClientTicket[];
  clientTicketMessages: Record<string, TicketMessage[]>;
}): Conversation[] {
  const publicRows: Conversation[] = input.tickets.map((ticket) => {
    const messages = input.ticketMessages[ticket.id] ?? [];
    const viaBot = ticket.status === "bot" || Boolean(ticket.handoff_reason) || messages.some((m) => m.sender === "bot");
    const firstQuestion = messages.find((m) => m.sender === "customer")?.body || ticket.message || "";
    const last = messages[messages.length - 1];
    const source: Conversation["source"] = ticket.source === "gyorssav" ? "gyorssav" : viaBot ? "ai" : "widget";
    return {
      id: ticket.id,
      kind: "public",
      title: ticket.name || (firstQuestion ? `„${clip(firstQuestion, 70)}”` : "Névtelen látogató"),
      subtitle: ticket.email
        ? ticket.email
        : ticket.status === "bot"
          ? "AI-beszélgetés · nem adott meg elérhetőséget"
          : "Látogató a weboldalról",
      email: ticket.email,
      status: ticket.status,
      source,
      viaBot,
      handoffReason: ticket.handoff_reason ?? null,
      needsReply: ticket.status === "open",
      lastActivity: last?.created_at || ticket.last_message_at || ticket.created_at,
      snippet: clip(last?.body ?? ticket.message ?? "", 140),
      messageCount: messages.length,
      projectId: null,
      userId: null,
      rating: ticket.rating,
      ratingComment: ticket.rating_comment
    };
  });

  const portalRows: Conversation[] = input.clientTickets.map((ticket) => {
    const messages = input.clientTicketMessages[ticket.id] ?? [];
    const last = messages[messages.length - 1];
    return {
      id: ticket.id,
      kind: "portal",
      title: ticket.contact_name || ticket.contact_email || "Ügyfél",
      subtitle: ticket.subject,
      email: ticket.contact_email,
      status: ticket.status,
      source: "portal",
      viaBot: false,
      handoffReason: null,
      needsReply: ticket.status === "open",
      lastActivity: last?.created_at || ticket.last_message_at,
      snippet: clip(last?.body ?? ticket.subject ?? "", 140),
      messageCount: messages.length,
      projectId: ticket.project_id,
      userId: ticket.user_id,
      rating: ticket.rating,
      ratingComment: ticket.rating_comment
    };
  });

  return [...publicRows, ...portalRows].sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );
}

export type ConversationFilter = "all" | "reply" | "ai" | "web" | "portal" | "answered" | "closed";

export function filterConversations(list: Conversation[], filter: ConversationFilter, query: string) {
  const needle = query.trim().toLowerCase();
  return list.filter((item) => {
    if (filter === "reply" && !item.needsReply) return false;
    if (filter === "ai" && item.source !== "ai") return false;
    if (filter === "web" && item.kind !== "public") return false;
    if (filter === "portal" && item.kind !== "portal") return false;
    if (filter === "answered" && item.status !== "answered") return false;
    if (filter === "closed" && item.status !== "closed") return false;
    if (filter !== "closed" && filter !== "all" && item.status === "closed") return false;
    if (!needle) return true;
    return [item.title, item.subtitle, item.email, item.snippet]
      .filter(Boolean)
      .some((field) => (field as string).toLowerCase().includes(needle));
  });
}

/* ── Teendőlista ────────────────────────────────────────────────────────── */

/** Az ügyfél-lap fülei — az URL-ben is ezek a nevek szerepelnek. */
export type ClientTab = "attekintes" | "brief" | "epites" | "ajanlat" | "fizetes" | "ai";

export const CLIENT_TABS: Array<[ClientTab, string]> = [
  ["attekintes", "Áttekintés"],
  ["brief", "Brief"],
  ["epites", "Építés"],
  ["ajanlat", "Ajánlat és kérések"],
  ["fizetes", "Fizetés"],
  ["ai", "AI-prompt"]
];

export type TodayTarget =
  | { kind: "project"; projectId: string; tab?: ClientTab }
  | { kind: "conversation"; conversationId: string }
  | { kind: "href"; href: string };

export type TodayAction =
  | { kind: "billingo-retry"; paymentId: string }
  | { kind: "resolve-change"; requestId: string };

export type TodayItem = {
  id: string;
  /** 1 = sürgős (pénz vagy kiesés), 2 = rád vár, 3 = lehetőség, 4 = jó tudni. */
  priority: 1 | 2 | 3 | 4;
  category: string;
  title: string;
  detail: string;
  since: string | null;
  target: TodayTarget;
  targetLabel: string;
  action?: TodayAction;
  /**
   * Származtatott tétel (egy állapot következménye): csak ezen a gépen
   * rejthető el. A `resolve-change` tétel viszont az adatbázisban zárható.
   */
  dismissible: boolean;
};

export const PRIORITY_LABEL: Record<TodayItem["priority"], string> = {
  1: "Sürgős",
  2: "Rád vár",
  3: "Lehetőség",
  4: "Jó tudni"
};

export type PendingPaymentLike = {
  id: string;
  project_id: string;
  amount: number;
  due_date: string | null;
  payment_reference?: string | null;
  status?: string;
  transfer_reported_at?: string | null;
};

export type TodayInput = {
  projects: ClientProject[];
  conversations: Conversation[];
  leads: Lead[];
  changeRequests: ChangeRequest[];
  websitePurchases: WebsitePurchase[];
  billingoIssues: BillingoIssue[];
  pendingPayments: PendingPaymentLike[];
  briefDraftCount: number;
  nowMs: number;
};

function projectTurnHeadline(project: ClientProject) {
  if (project.status === "review" && project.review_approved) return ["Élesítésre vár", "Az ügyfél jóváhagyta az előnézetet — élesíthető."];
  if (project.status === "deposit_pending" && project.deposit_transfer_reported) {
    return ["Utalás ellenőrzése", project.commercial_model === "subscription" ? "Az ügyfél jelezte az első díj utalását." : "Az ügyfél jelezte a foglaló utalását."];
  }
  if (project.status === "launched" && project.final_transfer_reported && !project.final_payment_paid) {
    return ["Végszámla ellenőrzése", "Az ügyfél jelezte a hátralék utalását — csak a bankszámla ellenőrzése után jelöld beérkezettnek."];
  }
  if (project.status === "request_received") return ["Új igény", "Új projektigény érkezett — készítsd elő az ajánlatot."];
  if (project.status === "planning") return ["Ajánlat készül", "Állítsd össze és küldd el az ajánlatot."];
  return ["Rajtad a sor", project.next_step || "A projekt a te lépésedre vár."];
}

/**
 * A „Ma" lista: minden, ami rád vár, egy helyen, fontosság szerint.
 *
 * A régi „Ma" és „Teendők & Inbox" fül szabályainak uniója, átfedés nélkül.
 * Két javítás a régihez képest:
 *  - Lezárt (és szüneteltetett) projekt nem riaszt „nem elérhető" állapottal:
 *    a monitor ezeket már nem ellenőrzi, tehát az utolsó mérés örökre rajtuk
 *    ragadt volna.
 *  - Az AI-beszélgetések is megjelennek (átadást kértek, vagy friss).
 */
export function buildTodayItems(input: TodayInput): TodayItem[] {
  const now = new Date(input.nowMs);
  const list: TodayItem[] = [];
  const byId = new Map(input.projects.map((project) => [project.id, project]));
  const live = input.projects.filter(isLiveProject);
  const projectTitle = (projectId: string | null | undefined) => {
    const project = projectId ? byId.get(projectId) : undefined;
    return project ? project.title : "Ismeretlen projekt";
  };

  // 1. Nem elérhető weboldal — csak élő, nem szüneteltetett projektnél.
  for (const project of live) {
    if (project.site_health_status !== "offline" || project.status === "paused") continue;
    list.push({
      id: `offline-${project.id}`,
      priority: 1,
      category: "Oldal leállt",
      title: `Nem elérhető: ${project.title}`,
      detail: "Az óránkénti ellenőrzés szerint az oldal nem válaszol. Ez a legdrágább hiba, amit egy havidíjas ügyfél észrevehet.",
      since: project.last_health_check_at,
      target: { kind: "project", projectId: project.id, tab: "attekintes" },
      targetLabel: "Projekt megnyitása",
      dismissible: true
    });
  }

  // 2. Bejelentett utalás (havidíj): az ügyfél elküldte a pénzt, csak még nincs rögzítve.
  for (const payment of input.pendingPayments) {
    if (payment.status !== "reported") continue;
    const project = byId.get(payment.project_id);
    if (!project) continue;
    list.push({
      id: `reported-${payment.id}`,
      priority: 1,
      category: "Utalás ellenőrzése",
      title: `Bejelentett utalás: ${project.title}`,
      detail: `${formatHuf(payment.amount)}${payment.payment_reference ? ` · közlemény: ${payment.payment_reference}` : ""} — nézd meg a bankszámlán, és rögzítsd. Amíg nem teszed, az ügyfél fizetetlennek látszik.`,
      since: payment.transfer_reported_at ?? null,
      target: { kind: "project", projectId: project.id, tab: "fizetes" },
      targetLabel: "Befizetés rögzítése",
      dismissible: true
    });
  }

  // 3. Elmaradt vagy ma esedékes befizetés.
  for (const payment of input.pendingPayments) {
    if (payment.status === "reported" || !payment.due_date) continue;
    const days = daysUntil(new Date(payment.due_date), now);
    if (days > 0) continue;
    const project = byId.get(payment.project_id);
    if (!project) continue;
    list.push({
      id: `payment-${payment.id}`,
      priority: days < -5 ? 1 : 2,
      category: "Befizetés",
      title: days === 0 ? `Ma esedékes: ${project.title}` : `${Math.abs(days)} napja esedékes: ${project.title}`,
      detail: `${formatHuf(payment.amount)} — ha megérkezett, rögzítsd, különben az ügyfél további emlékeztetőket kap.`,
      since: payment.due_date,
      target: { kind: "project", projectId: project.id, tab: "fizetes" },
      targetLabel: "Befizetés rögzítése",
      dismissible: true
    });
  }

  // 4. Kiszámlázatlan befizetés — tételenként, újrapróbálással.
  for (const issue of input.billingoIssues) {
    list.push({
      id: `billingo-${issue.id}`,
      priority: 1,
      category: "Számlázás",
      title: `Nem készült számla: ${projectTitle(issue.project_id)}`,
      detail: `${formatHuf(issue.amount)} beérkezett, a számla viszont nem állt ki${issue.billingo_error ? ` — ${clip(issue.billingo_error, 120)}` : ""}. NAV szempontból sem hagyható nyitva.`,
      since: issue.paid_at,
      target: { kind: "href", href: "/admin/penz" },
      targetLabel: "Pénzügyek",
      action: { kind: "billingo-retry", paymentId: issue.id },
      dismissible: true
    });
  }

  // 5. Tulajdonba vétel (kivásárlás) folyamatban.
  for (const purchase of input.websitePurchases) {
    if (!["requested", "payment_pending", "transfer_reported"].includes(purchase.status)) continue;
    const reported = purchase.status === "transfer_reported";
    list.push({
      id: `purchase-${purchase.id}`,
      priority: reported ? 1 : 2,
      category: reported ? "Utalás ellenőrzése" : "Kivásárlás",
      title: `${reported ? "Vételár-utalás" : "Tulajdonba vétel"}: ${projectTitle(purchase.project_id)}`,
      detail: `Weboldal tulajdonba vétele · ${formatHuf(purchase.amount)}${reported ? " · az ügyfél jelezte az utalást, ellenőrizd" : " · a legnagyobb egyszeri bevétel egy ügyféltől"}`,
      since: reported ? purchase.transfer_reported_at : purchase.created_at,
      target: { kind: "project", projectId: purchase.project_id, tab: "fizetes" },
      targetLabel: "Kivásárlás kezelése",
      dismissible: true
    });
  }

  // 6. Megválaszolatlan beszélgetés — egyenként, hogy rögtön látszódjon, ki az.
  for (const conversation of input.conversations) {
    if (!conversation.needsReply) continue;
    list.push({
      id: `conv-${conversation.id}`,
      priority: 2,
      category: conversation.kind === "portal" ? "Ügyfélüzenet" : conversation.source === "ai" ? "Átadott AI-chat" : "Üzenet",
      title: conversation.title,
      detail: conversation.snippet || conversation.subtitle,
      since: conversation.lastActivity,
      target: { kind: "conversation", conversationId: conversation.id },
      targetLabel: "Válasz",
      dismissible: true
    });
  }

  // 7. AI-chat, ami átadást kért, de nem hagyott elérhetőséget.
  for (const conversation of input.conversations) {
    if (conversation.status !== "bot" || !conversation.handoffReason) continue;
    list.push({
      id: `handoff-${conversation.id}`,
      priority: 3,
      category: "AI-chat",
      title: conversation.title,
      detail: `Az AI átadást javasolt: ${conversation.handoffReason} — elérhetőséget nem adott meg, csak akkor éred el, ha a chat még nyitva van nála.`,
      since: conversation.lastActivity,
      target: { kind: "conversation", conversationId: conversation.id },
      targetLabel: "Beszélgetés",
      dismissible: true
    });
  }

  // 8. Friss AI-beszélgetések (24 óra) — egy összesítő sor.
  const freshBot = input.conversations.filter((conversation) =>
    conversation.status === "bot"
    && !conversation.handoffReason
    && input.nowMs - new Date(conversation.lastActivity).getTime() < 24 * 3_600_000
  );
  if (freshBot.length) {
    list.push({
      id: "ai-fresh",
      priority: 4,
      category: "AI-chat",
      title: `${freshBot.length} új AI-beszélgetés az elmúlt 24 órában`,
      detail: "Az asszisztens válaszolt, átadást nem kértek. Érdemes átfutni, mit kérdeznek a látogatók.",
      since: freshBot[0].lastActivity,
      target: { kind: "href", href: "/admin/beszelgetesek?szuro=ai" },
      targetLabel: "Megnézem",
      dismissible: true
    });
  }

  // 9. A projekt a te lépésedre vár (élő projektek).
  for (const project of live) {
    if (!isAdminTurn(project)) continue;
    const [category, detail] = projectTurnHeadline(project);
    list.push({
      id: `turn-${project.id}`,
      priority: category === "Utalás ellenőrzése" || category === "Végszámla ellenőrzése" ? 1 : 2,
      category,
      title: project.title,
      detail,
      since: project.last_modified_at ?? project.created_at,
      target: { kind: "project", projectId: project.id, tab: "attekintes" },
      targetLabel: "Projekt megnyitása",
      dismissible: true
    });
  }

  // 10. Nyitott módosítási (és kivásárlási) kérések — az adatbázisban lezárhatók.
  for (const request of input.changeRequests) {
    if (["completed", "declined"].includes(request.status)) continue;
    const project = byId.get(request.project_id);
    if (project && !isLiveProject(project)) continue;
    const buyout = isWebsitePurchaseRequest(request.description);
    const bug = request.category === "technical";
    list.push({
      id: `change-${request.id}`,
      priority: buyout || bug ? 2 : request.status === "new" ? 2 : 3,
      category: buyout ? "Kivásárlási kérés" : bug ? "Technikai hiba" : request.status === "new" ? "Új módosítási kérés" : "Módosítási kérés",
      title: projectTitle(request.project_id),
      detail: clip(request.description, 160),
      since: request.requested_at,
      target: { kind: "project", projectId: request.project_id, tab: buyout ? "fizetes" : "ajanlat" },
      targetLabel: "Megnyitás",
      action: { kind: "resolve-change", requestId: request.id },
      dismissible: false
    });
  }

  // 11. Előfizetés-kérelmek.
  for (const project of live) {
    const status = project.subscription_status ?? "";
    if (!["pause_requested", "resume_requested", "cancel_requested"].includes(status)) continue;
    list.push({
      id: `sub-${project.id}`,
      priority: 2,
      category: "Előfizetés",
      title: `${status === "cancel_requested" ? "Lemondást kért" : status === "pause_requested" ? "Szüneteltetést kért" : "Újraindítást kért"}: ${project.title}`,
      detail: status === "cancel_requested"
        ? "Érdemes felhívni, mielőtt jóváhagyod."
        : "A Fizetés fülön egy gombbal jóváhagyhatod — a Stripe-ot is módosítja.",
      since: project.pause_requested_at ?? project.resume_requested_at ?? project.subscription_cancel_requested_at ?? null,
      target: { kind: "project", projectId: project.id, tab: "fizetes" },
      targetLabel: "Kérelem kezelése",
      dismissible: true
    });
  }

  // 12. Törlési kérelem.
  for (const project of input.projects) {
    if (!project.delete_requested) continue;
    list.push({
      id: `delete-${project.id}`,
      priority: 2,
      category: "Törlési kérelem",
      title: project.title,
      detail: "Az ügyfél a projekt törlését kérte. Ez nem visszavonható.",
      since: project.delete_requested_at,
      target: { kind: "project", projectId: project.id, tab: "attekintes" },
      targetLabel: "Elbírálás",
      dismissible: true
    });
  }

  // 13. Elakadt onboarding (szerződésnél vagy első fizetésnél, 1+ napja).
  for (const project of live) {
    if (project.delete_requested) continue;
    const stalledContract = project.status === "contract_pending";
    const stalledPayment = project.status === "deposit_pending" && !project.deposit_transfer_reported && project.payment_status !== "deposit_paid";
    if (!stalledContract && !stalledPayment) continue;
    const age = Math.floor((input.nowMs - new Date(project.last_modified_at ?? project.created_at).getTime()) / 86_400_000);
    if (age < 1) continue;
    list.push({
      id: `followup-${project.id}`,
      priority: 3,
      category: "Elakadt onboarding",
      title: project.title,
      detail: `${stalledContract ? "Szerződéskötésnél" : "Fizetésnél"} áll ${age} napja. Egy emlékeztető email sokat segít.`,
      since: project.last_modified_at ?? project.created_at,
      target: { kind: "project", projectId: project.id, tab: "attekintes" },
      targetLabel: "Projekt megnyitása",
      dismissible: true
    });
  }

  // 14. Lejáró domain (élő projekteknél).
  for (const project of live) {
    const expiry = project.domain_expires_at ?? project.domain_renewal_at;
    if (!expiry) continue;
    const days = daysUntil(new Date(expiry), now);
    if (days > 30) continue;
    list.push({
      id: `domain-${project.id}`,
      priority: days <= 7 ? 1 : 4,
      category: "Domain",
      title: `Lejáró domain: ${project.managed_domain_name ?? project.title}`,
      detail: days < 0
        ? `${Math.abs(days)} napja lejárt! Azonnal újítsd meg.`
        : `${days} nap múlva jár le. A megújítás elmulasztása egyik napról a másikra leviszi az oldalt.`,
      since: null,
      target: { kind: "project", projectId: project.id, tab: "attekintes" },
      targetLabel: "Projekt megnyitása",
      dismissible: true
    });
  }

  // 15. Új érdeklődők és félbehagyott adatlapok.
  const freshLeads = input.leads.filter((lead) => lead.status === "new").length;
  if (freshLeads) {
    list.push({
      id: "leads",
      priority: 3,
      category: "Érdeklődők",
      title: `${freshLeads} új érdeklődő`,
      detail: "Még senki nem vette fel velük a kapcsolatot.",
      since: null,
      target: { kind: "href", href: "/admin/erdeklodok" },
      targetLabel: "Érdeklődők",
      dismissible: true
    });
  }
  if (input.briefDraftCount) {
    list.push({
      id: "drafts",
      priority: 4,
      category: "Adatlapok",
      title: `${input.briefDraftCount} félbehagyott adatlap`,
      detail: "Elkezdték kitölteni, de nem küldték be. Egy emailre sokan visszatérnek.",
      since: null,
      target: { kind: "href", href: "/admin/erdeklodok/felbehagyott" },
      targetLabel: "Adatlapok",
      dismissible: true
    });
  }

  const sinceMs = (item: TodayItem) => (item.since ? new Date(item.since).getTime() : Number.POSITIVE_INFINITY);
  return list.sort((a, b) => a.priority - b.priority || sinceMs(a) - sinceMs(b));
}

/* ── Számok ─────────────────────────────────────────────────────────────── */

export function activeSubscriptions(projects: ClientProject[]) {
  return projects.filter((p) => p.commercial_model === "subscription" && p.subscription_status === "active");
}

/** Havi bevétel a valódi (alkudott) ciklusdíjból, nem a listaárból. */
export function monthlyRecurringRevenue(projects: ClientProject[]) {
  return activeSubscriptions(projects).reduce((sum, project) => sum + monthlyRevenue({
    monthlyPrice: Number(project.monthly_price ?? 0),
    interval: projectCycleMonths(project),
    agreed: project.billing_amount ?? null
  }), 0);
}

export type ConsoleCounts = {
  todayUrgent: number;
  todayAction: number;
  needsReply: number;
  aiConversations: number;
  adminTurn: number;
  liveProjects: number;
  archivedProjects: number;
  moneyAttention: number;
  freshLeads: number;
};

export function buildCounts(input: {
  today: TodayItem[];
  conversations: Conversation[];
  projects: ClientProject[];
  billingoIssues: BillingoIssue[];
  pendingPayments: PendingPaymentLike[];
  leads: Lead[];
  nowMs: number;
}): ConsoleCounts {
  const now = new Date(input.nowMs);
  const overdue = input.pendingPayments.filter((payment) =>
    payment.status !== "reported" && payment.due_date && daysUntil(new Date(payment.due_date), now) <= 0
  ).length;
  const reported = input.pendingPayments.filter((payment) => payment.status === "reported").length;
  const live = input.projects.filter(isLiveProject);
  return {
    todayUrgent: input.today.filter((item) => item.priority === 1).length,
    todayAction: input.today.filter((item) => item.priority <= 2).length,
    needsReply: input.conversations.filter((item) => item.needsReply).length,
    aiConversations: input.conversations.filter((item) => item.status === "bot").length,
    adminTurn: live.filter(isAdminTurn).length,
    liveProjects: live.length,
    archivedProjects: input.projects.length - live.length,
    moneyAttention: overdue + reported + input.billingoIssues.length,
    freshLeads: input.leads.filter((lead) => lead.status === "new").length
  };
}

/**
 * Egy értesítés linkje az új konzolban. A régi levelek és értesítések a
 * `/admin/dashboard`-ra mutatnak — ezek a „Ma" oldalra kerülnek.
 */
export function consoleHref(link: string | null | undefined) {
  if (!link) return "/admin/ma";
  if (link === "/admin" || link.startsWith("/admin/dashboard") || link.startsWith("/admin?")) return "/admin/ma";
  if (link.startsWith("/admin/")) return link;
  return "/admin/ma";
}

/** Egy ügyfél-lap (és opcionálisan egy fülének) címe. */
export function clientHref(projectId: string, tab?: ClientTab) {
  return `/admin/ugyfelek/${projectId}${tab && tab !== "attekintes" ? `/${tab}` : ""}`;
}

/** Egy teendő célpontjának címe. */
export function targetHref(target: TodayTarget) {
  if (target.kind === "project") return clientHref(target.projectId, target.tab);
  if (target.kind === "conversation") return `/admin/beszelgetesek/${target.conversationId}`;
  return target.href;
}

/* ── Bevétel ─────────────────────────────────────────────────────────────
   A régi `RevenuePanel` számításai, tiszta függvényként. */

export function revenueSummary(projects: ClientProject[]) {
  const active = activeSubscriptions(projects);
  const mrr = monthlyRecurringRevenue(projects);
  const listMrr = active.reduce((sum, p) => sum + Number(p.monthly_price ?? 0), 0);
  return {
    active,
    mrr,
    arr: mrr * 12,
    /** Előre (féléves/éves) fizetők. */
    prepaid: active.filter((p) => projectCycleMonths(p) > 1),
    /** Náluk kézzel kell rögzíteni a befizetést. */
    byTransfer: active.filter((p) => p.payment_method !== "stripe"),
    /** Ennyivel kevesebb a havi bevétel a listaárnál — az adott kedvezmény. */
    discountPerMonth: Math.max(0, listMrr - mrr)
  };
}

export type UpcomingPayment = { key: string; projectId: string; title: string; amount: number; due: string; projected: boolean; status?: string };

/**
 * A következő 90 nap esedékességei. A rögzített (következő) tételből indul, és
 * onnan a ciklus szerint vetít előre — projektenként ugyanis mindig csak EGY
 * rögzített tétel van, a negyedév többi bevétele a fordulónapból számolható.
 */
export function upcomingPayments(projects: ClientProject[], pending: PendingPaymentLike[], nowMs: number): UpcomingPayment[] {
  const horizon = nowMs + 90 * 86_400_000;
  const rows: UpcomingPayment[] = [];
  for (const payment of pending) {
    if (!payment.due_date) continue;
    const project = projects.find((p) => p.id === payment.project_id);
    if (!project || project.subscription_status !== "active") continue;
    const interval = projectCycleMonths(project);
    let due = new Date(payment.due_date);
    for (let step = 0; step < 6 && due.getTime() <= horizon; step += 1) {
      rows.push({
        key: `${payment.id}-${step}`,
        projectId: project.id,
        title: project.title,
        amount: payment.amount,
        due: due.toISOString(),
        projected: step > 0,
        status: step === 0 ? payment.status : undefined
      });
      due = addBillingInterval(due, interval, 1);
    }
  }
  return rows.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
}

export const LEAD_SOURCE_LABEL: Record<string, string> = {
  cold_email: "Hideg email",
  "projectedge.hu": "Weboldal",
  gyorssav: "Gyors sáv"
};

/** Honnan jönnek az érdeklődők, és melyik forrásból lesz ügyfél. */
export function leadPipeline(leads: Lead[]) {
  const bySource = new Map<string, Map<string, number>>();
  for (const lead of leads) {
    if (lead.status === "archived") continue;
    const source = LEAD_SOURCE_LABEL[lead.source ?? ""] ?? lead.source ?? "Ismeretlen";
    const bucket = bySource.get(source) ?? new Map<string, number>();
    bucket.set(lead.status, (bucket.get(lead.status) ?? 0) + 1);
    bySource.set(source, bucket);
  }
  return Array.from(bySource.entries()).map(([source, statuses]) => ({
    source,
    total: Array.from(statuses.values()).reduce((a, b) => a + b, 0),
    won: statuses.get("won") ?? 0,
    statuses: Array.from(statuses.entries()).sort((a, b) => b[1] - a[1])
  })).sort((a, b) => b.total - a.total);
}
