"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  useToasts,
  ToastStack,
  useConfirm,
  Skeleton,
  useOnline,
  OfflineBanner,
  type ToastKind
} from "@/components/ui/feedback";
import { AdminHandoverPanel } from "@/components/AdminHandoverPanel";
import { BillingoIssuesCard } from "@/components/admin/BillingoIssuesCard";
import { AiBuildPromptPanel } from "@/components/admin/AiBuildPromptPanel";
import type { AiPromptProject } from "@/lib/ai-build-prompt";
import { AdminInbox } from "@/components/admin/AdminInbox";
import { WebsitePurchaseAdminPanel } from "@/components/admin/WebsitePurchaseAdminPanel";
import { ChangeThread } from "@/components/portal/ChangeThread";
import { AssetLink, AssetImage } from "@/components/portal/AssetLink";
import { DEFAULT_HANDOVER_SERVICES, buildHandoverPlan } from "@/lib/handover";
import { PARKING_MONTHLY_PRICE, formatHuf, isWebsitePurchaseRequest, purchaseOptionPrice, subscriptionPlan } from "@/lib/subscriptions";
// Ugyanaz a formázás, mint az ügyfélkapun — korábban mindkét komponens
// saját másolatot tartott ezekből, és külön-külön csúszhattak el.
import { BANK_TRANSFER_DETAILS, parseBrief } from "@/components/portal/format";
import { briefSteps, paletteByName } from "@/components/portal/brief-fields";
import { briefDraftProgress, type BriefDraftRow } from "@/lib/brief-draft";
import type {
  AdminUserActivity,
  BillingoIssue,
  ChangeRequest,
  ClientProject,
  ClientTicket,
  Lead,
  Ticket,
  TicketMessage,
  WebsitePurchase,
  AppNotification
} from "@/components/admin/types";
import { hardNavigate } from "@/lib/auth-navigation";

/** A választott admin téma tárolókulcsa — egy helyen, hogy ne csússzon el. */
const ADMIN_THEME_KEY = "projectedge-admin-theme";

let optimisticCounter = 0;

/**
 * Ideiglenes azonosító az optimista üzenetekhez.
 *
 * Modulszinten él, nem a komponensben: így a React purity-szabálya sem jelzi,
 * és a növekvő számláló miatt két, ugyanabban az ezredmásodpercben elküldött
 * válasz sem kaphat azonos azonosítót.
 */
function optimisticId() {
  optimisticCounter += 1;
  return `optimistic-${Date.now()}-${optimisticCounter}`;
}

/**
 * Supabase realtime esemény törzse. INSERT/UPDATE-nél a `new` a teljes sor,
 * DELETE-nél viszont csak a kulcsokat tartalmazza — ezért `Partial`.
 */
type RealtimePayload<Row> = {
  eventType: string;
  new: Row;
  old: Partial<Row>;
};

function messageKind(text: string): ToastKind {
  if (/nem sikerült|hiba|sikertelen|nem lehet/i.test(text)) {
    return "error";
  }
  if (/mentve|elküldve|törölve|jóváhagyva|elutasítva|kész|rögzítve/i.test(text)) {
    return "success";
  }
  return "info";
}

const statuses = [
  ["new", "Új"],
  ["contacted", "Megkeresve"],
  ["proposal_sent", "Ajánlat elküldve"],
  ["won", "Nyert"],
  ["lost", "Elveszett"],
  ["archived", "Archivált"]
];

const ticketStatuses = [
  ["open", "Nyitott"],
  ["answered", "Megválaszolva"],
  ["closed", "Lezárva"]
];

const projectStatuses = [
  ["request_received", "Igény beérkezett"],
  ["planning", "Tervezés"],
  ["offer_sent", "Ajánlat elküldve"],
  ["deposit_pending", "Foglaló fizetésre vár"],
  ["contract_pending", "Szerződés aláírásra vár"],
  ["in_progress", "Kivitelezés"],
  ["review", "Ügyfél-visszajelzés"],
  ["launched", "Élesítve"],
  ["paused", "Szünetel"],
  ["closed", "Lezárva"],
  ["deletion_pending", "Törlés jóváhagyásra vár"]
];

const projectStatusLabel = Object.fromEntries(projectStatuses);

const projectFlow = [
  ["request_received", "Igény"],
  ["planning", "Tervezés"],
  ["offer_sent", "Ajánlat"],
  ["contract_pending", "Szerződés"],
  ["deposit_pending", "Foglaló"],
  ["in_progress", "Építés"],
  ["review", "Jóváhagyás"],
  ["launched", "Éles"]
];

const defaultOfferDeliverables = [
  "Átgondolt oldalstruktúra és tartalmi felépítés",
  "Egyedi, minden eszközön jól mutató design",
  "Kész, működő weboldal alap animációkkal",
  "Saját admin felület, amiből te magad frissítheted az oldalt",
  "Az oldal élesítése a saját domainoden, teljes beállítással"
].join("\n");

function formatDate(value: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

/** Dátum + óra:perc — a felhasználói listán a nap önmagában kevés. */
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

/**
 * „3 napja", „2 órája" — a felhasználói listán ez mondja meg egy pillantásra,
 * ki aktív és ki hűlt ki. A pontos időpont a cím-tooltipben marad.
 */
function relativeTime(value: string | null) {
  if (!value) return "soha";
  const diffMs = Date.now() - new Date(value).getTime();
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

function websitePurchasePreparationNote(project: ClientProject, purchase: WebsitePurchase) {
  return [
    "A weboldal tulajdonba vétele elindult.",
    "",
    `Vételár: ${formatHuf(purchase.amount)}`,
    `Közlemény: ${purchase.payment_reference}`,
    "",
    "Fizetési lehetőségek:",
    "• bankkártyás fizetés Stripe-on keresztül az ügyfélkapuban;",
    `• banki átutalás: ${BANK_TRANSFER_DETAILS.name}, ${BANK_TRANSFER_DETAILS.accountNumber}.`,
    "",
    "A fizetés után együtt adjuk át:",
    "• a GitHub forráskódot és a Vercel projektet;",
    "• a domaint és a szükséges DNS-beállításokat;",
    "• a használt Supabase / Resend fiókokat, ha az oldal használja őket;",
    "• az éles működéshez szükséges dokumentációt és ellenőrzést.",
    "",
    `Projekt: ${project.title}`,
    "A fizetés tényleges beérkezése után az előfizetés megszűnik, és megnyílik a vezetett technikai átadás."
  ].join("\n");
}

export function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketMessages, setTicketMessages] = useState<Record<string, TicketMessage[]>>({});
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [clientProjects, setClientProjects] = useState<ClientProject[]>([]);
  const [clientTickets, setClientTickets] = useState<ClientTicket[]>([]);
  const [clientTicketMessages, setClientTicketMessages] = useState<Record<string, TicketMessage[]>>({});
  const [clientTicketReplies, setClientTicketReplies] = useState<Record<string, string>>({});
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [websitePurchases, setWebsitePurchases] = useState<WebsitePurchase[]>([]);
  const [websitePurchaseBusyId, setWebsitePurchaseBusyId] = useState<string | null>(null);
  const [billingoIssues, setBillingoIssues] = useState<BillingoIssue[]>([]);
  const [billingoRetryId, setBillingoRetryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [paymentTestLoading, setPaymentTestLoading] = useState(false);

  // Upgraded flow states
  const [newMilestoneTitle, setNewMilestoneTitle] = useState<Record<string, string>>({});
  const [projectSubTab, setProjectSubTab] = useState<Record<string, "prompt" | "brief" | "build" | "changes" | "subscription">>({});

  // Phase 2 state variables
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  /**
   * Referencia-idő a lejáratok kiértékeléséhez (pl. garancia aktív-e).
   * Effektből jön, nem renderből: így ugyanaz a render kétszer lefuttatva
   * ugyanazt adja, és percenként frissül anélkül, hogy bárhol újratöltés kéne.
   */
  const [nowMs, setNowMs] = useState(0);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [wizardProjectId, setWizardProjectId] = useState<string | null>(null);

  /** Félbehagyott projektindító adatlapok — beküldetlen `brief_drafts` sorok. */
  const [briefDrafts, setBriefDrafts] = useState<BriefDraftRow[]>([]);
  /** Regisztrált felhasználók és aktivitásuk — a `/api/admin/users` végpontról. */
  const [adminUsers, setAdminUsers] = useState<AdminUserActivity[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  /**
   * Admin téma. Az alapértelmezés a sötét — a világos mód tisztán felülírás,
   * `.admin-page[data-admin-theme="light"]` alá zárva (lásd `globals.css`).
   * Azért az `.admin-page` elemre kerül és nem a `<html>`-re, hogy az
   * ügyfélkapuval közös osztályok (`.handover-*`, `.status-pill`) csak itt
   * öltözzenek át.
   */
  const [adminTheme, setAdminTheme] = useState<"dark" | "light">("dark");

  // Navigation & Master-Detail state
  const [activeTab, setActiveTab] = useState<"inbox" | "projects" | "tickets" | "managed" | "drafts" | "users" | "leads">("inbox");
  const [ticketScope, setTicketScope] = useState<"all" | "public" | "portal">("all");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [, setSelectedTicketType] = useState<"public" | "portal">("public");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<"all" | "open" | "answered" | "closed">("all");

  const { toasts, pushToast, dismissToast } = useToasts();
  const { confirm, confirmModal } = useConfirm();
  const online = useOnline();

  async function startPaymentSmokeTest() {
    setPaymentTestLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMessage("A munkamenet lejárt. Jelentkezz be újra.");
      setPaymentTestLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/stripe/smoke-test", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const result = await response.json() as { error?: string; url?: string };
      if (!response.ok || !result.url) {
        setMessage(result.error || "A sandbox fizetési teszt nem indítható.");
        return;
      }
      window.location.assign(result.url);
    } catch {
      setMessage("A sandbox fizetési teszt nem indítható.");
    } finally {
      setPaymentTestLoading(false);
    }
  }

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!message || message.endsWith("...")) return;
    pushToast(message, messageKind(message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  const uniqueClients = useMemo(() => {
    const clientsMap = new Map<string, { name: string; email: string }>();
    clientProjects.forEach((p) => {
      if (p.user_id) {
        clientsMap.set(p.user_id, {
          name: p.contact_name || p.contact_email || "Névtelen Ügyfél",
          email: p.contact_email || ""
        });
      }
    });
    clientTickets.forEach((t) => {
      if (t.user_id) {
        if (!clientsMap.has(t.user_id)) {
          clientsMap.set(t.user_id, {
            name: t.contact_name || t.contact_email || "Névtelen Ügyfél",
            email: t.contact_email || ""
          });
        }
      }
    });
    return Array.from(clientsMap.entries()).map(([userId, info]) => ({
      userId,
      ...info
    }));
  }, [clientProjects, clientTickets]);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return clientProjects.filter((p) => {
      if (selectedClientFilter !== "all" && p.user_id !== selectedClientFilter) return false;
      if (!query) return true;
      return [p.title, p.contact_name, p.contact_email, p.company, p.project_type, p.goals]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(query));
    });
  }, [clientProjects, selectedClientFilter, searchQuery]);

  const activeProjects = useMemo(
    () => filteredProjects.filter((p) => p.status !== "closed"),
    [filteredProjects]
  );

  const archivedProjects = useMemo(
    () => filteredProjects.filter((p) => p.status === "closed"),
    [filteredProjects]
  );

  const wizardProject =
    activeProjects.find((p) => p.id === wizardProjectId) ?? activeProjects[0] ?? null;

  /**
   * A `targetEmail` szándékosan NEM megy át a szerverre: a címzettet a
   * `/api/notify` a hívó jogosultsága alapján, az adatbázisból állapítja meg.
   */
  async function triggerNotification(
    targetUserId: string | null,
    _targetEmail: string | null,
    title: string,
    message: string,
    link: string
  ) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ userId: targetUserId, title, message, link })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false || result.emailSent === false) {
        const reason = typeof result.emailError === "string" ? ` (${result.emailError})` : "";
        console.error("A rendszerértesítés egyik kézbesítési csatornája hibázott.", result);
        setMessage(result.success === false && result.emailSent
          ? "Az email kiment, de az ügyfélkapus értesítést nem sikerült rögzíteni."
          : `Az ügyfélkapus értesítés rögzülhetett, de az email nem ment ki${reason}`);
      }
    } catch (err) {
      console.error("Nem sikerült elküldeni a rendszer értesítést:", err);
      setMessage("Értesítés rögzítve, de az email szolgáltató nem volt elérhető.");
    }
  }

  /**
   * Ajánlat küldése egy kereten felüli módosításra.
   *
   * A `payment_reference`-t az adatbázis triggere generálja (032), ezért itt
   * csak az összeget, az indoklást és az állapotot írjuk. Az ügyfél ettől
   * kezdve tud dönteni és utalni.
   */
  async function sendChangeQuote(request: ChangeRequest, project: ClientProject, amount: number, note: string) {
    if (!Number.isFinite(amount) || amount < 1000) {
      setMessage("Az ajánlati ár legalább 1 000 Ft legyen.");
      return;
    }
    const { error } = await supabase.from("change_requests").update({
      quoted_amount: Math.round(amount),
      quote_note: note.trim() || null,
      quote_accepted_at: null,
      payment_method: null,
      transfer_reported_at: null,
      stripe_checkout_session_id: null,
      stripe_payment_intent_id: null,
      status: "waiting_client"
    }).eq("id", request.id);
    if (error) {
      setMessage(`Az ajánlatot nem sikerült elküldeni: ${error.message}`);
      return;
    }
    await triggerNotification(
      project.user_id,
      project.contact_email,
      "Ajánlat érkezett a módosításodra",
      `A(z) „${project.title}" projektnél kért módosításra ${formatHuf(Math.round(amount))} összegű ajánlatot küldtünk. Az ügyfélkapun elfogadhatod vagy elutasíthatod.`,
      "/ugyfelkapu/dashboard"
    );
    setMessage("Ajánlat elküldve az ügyfélnek.");
    await loadLeads(true);
  }

  /** Az utalás beérkezésének jóváhagyása egy árazott módosításnál. */
  async function confirmChangePayment(request: ChangeRequest, project: ClientProject) {
    const ok = await confirm({
      title: "Utalás jóváhagyása",
      message: "Csak akkor hagyd jóvá, ha az összeg ténylegesen megérkezett a bankszámlára. Ezzel a módosítás munkába kerül.",
      confirmLabel: "Beérkezett",
      cancelLabel: "Mégse"
    });
    if (!ok) return;
    const { error } = await supabase.rpc("confirm_change_payment", { request_id: request.id });
    if (error) {
      setMessage(`A jóváhagyás nem sikerült: ${error.message}`);
      return;
    }
    await triggerNotification(
      project.user_id,
      project.contact_email,
      "Megérkezett a fizetés — indul a módosítás",
      `A(z) „${project.title}" projektnél kért módosítás díja beérkezett. A munka elindul.`,
      "/ugyfelkapu/dashboard"
    );
    setMessage("Fizetés jóváhagyva, a módosítás munkába került.");
    await loadLeads(true);
  }

  function toAiPromptProject(project: ClientProject): AiPromptProject {
    return {
      title: project.title,
      company: project.company,
      website: project.website,
      commercialModel: project.commercial_model,
      subscriptionPlanKey: project.subscription_plan,
      monthlyPrice: project.monthly_price,
      managedDomain: project.managed_domain_name,
      logoUrl: project.brief_data?.logoUrl || null,
      adminNotes: project.admin_notes || null,
      contactName: project.contact_name,
      contactEmail: project.contact_email,
      brief: project.brief_data || null,
      parsed: parseBrief(project.goals)
    };
  }

  async function notifyHandoverStep(project: ClientProject, title: string) {
    await triggerNotification(
      project.user_id,
      project.contact_email,
      "Új átadási lépés érkezett",
      `A(z) "${project.title}" weboldalad átadásában most a te lépésed következik: "${title}". Nyisd meg az ügyfélkaput!`,
      "/ugyfelkapu/dashboard"
    );
  }

  const stats = useMemo(() => {
    return {
      total: leads.length,
      fresh: leads.filter((lead) => lead.status === "new").length,
      won: leads.filter((lead) => lead.status === "won").length,
      tickets: tickets.filter((ticket) => ticket.status === "open").length + clientTickets.filter((ticket) => ticket.status === "open").length
    };
  }, [leads, tickets, clientTickets]);

  const openPublicTicketsCount = useMemo(() => tickets.filter((t) => t.status === "open").length, [tickets]);
  const openClientTicketsCount = useMemo(() => clientTickets.filter((t) => t.status === "open").length, [clientTickets]);
  const totalOpenTickets = openPublicTicketsCount + openClientTicketsCount;

  const pendingTransfers = useMemo(() => {
    const depositTransfers = clientProjects.filter((p) => p.status === "deposit_pending" && p.deposit_transfer_reported);
    const finalTransfers = clientProjects.filter((p) => p.status === "launched" && p.final_transfer_reported && !p.final_payment_paid);
    const changeTransfers = changeRequests.filter((r) => r.transfer_reported_at && r.status !== "completed");
    return depositTransfers.length + finalTransfers.length + changeTransfers.length;
  }, [clientProjects, changeRequests]);

  const pendingReviews = useMemo(() => clientProjects.filter((p) => p.status === "review" && p.review_approved).length, [clientProjects]);
  const pendingSubActions = useMemo(() => clientProjects.filter((p) => ["pause_requested", "resume_requested", "cancel_requested"].includes(p.subscription_status ?? "")).length, [clientProjects]);
  const pendingDeletions = useMemo(() => clientProjects.filter((p) => p.delete_requested).length, [clientProjects]);
  const pendingBuyouts = useMemo(() => websitePurchases.filter((w) => w.status === "requested" || w.status === "payment_pending" || w.status === "transfer_reported").length, [websitePurchases]);
  const freshLeadsCount = useMemo(() => leads.filter((l) => l.status === "new").length, [leads]);

  const totalUrgentCount = totalOpenTickets + billingoIssues.length + pendingTransfers + pendingReviews + pendingSubActions + pendingDeletions + pendingBuyouts;

  const managedProjects = useMemo(() => clientProjects.filter((p) => p.commercial_model === "subscription" && p.subscription_status !== "cancelled"), [clientProjects]);
  const activeSubscribersCount = useMemo(() => clientProjects.filter((p) => p.commercial_model === "subscription" && p.subscription_status === "active").length, [clientProjects]);
  const activeMonthlyRevenue = useMemo(() => clientProjects.filter((p) => p.commercial_model === "subscription" && p.subscription_status === "active").reduce((sum, p) => sum + (p.monthly_price ?? 0), 0), [clientProjects]);

  const adminTurnProjectsCount = useMemo(() => clientProjects.filter((p) => ["request_received", "planning", "in_progress"].includes(p.status) || (p.status === "deposit_pending" && p.deposit_transfer_reported) || (p.status === "review" && p.review_approved) || (p.status === "launched" && p.final_transfer_reported && !p.final_payment_paid)).length, [clientProjects]);

  const unreadNotificationsCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  type UnifiedTicket = {
    id: string;
    type: "public" | "portal";
    title: string;
    subtitle: string;
    email: string | null;
    status: string;
    rating?: number | null;
    ratingComment?: string | null;
    lastActivity: string;
    snippet: string;
    user_id?: string | null;
  };

  const unifiedTickets = useMemo(() => {
    const pub: UnifiedTicket[] = tickets.map((t) => {
      const msgs = ticketMessages[t.id] ?? [];
      const lastMsg = msgs[msgs.length - 1]?.body ?? "Weboldal widget kérdés";
      return {
        id: t.id,
        type: "public",
        title: t.name,
        subtitle: t.email || "Látogatói widget",
        email: t.email,
        status: t.status,
        rating: t.rating,
        ratingComment: t.rating_comment,
        lastActivity: t.created_at || t.id,
        snippet: lastMsg,
        user_id: null
      };
    });

    const port: UnifiedTicket[] = clientTickets.map((t) => {
      const msgs = clientTicketMessages[t.id] ?? [];
      const lastMsg = msgs[msgs.length - 1]?.body ?? t.subject;
      return {
        id: t.id,
        type: "portal",
        title: t.contact_name || t.contact_email || "Ügyfél",
        subtitle: t.subject,
        email: t.contact_email,
        status: t.status,
        rating: t.rating,
        ratingComment: t.rating_comment,
        lastActivity: t.last_message_at || t.id,
        snippet: lastMsg,
        user_id: t.user_id
      };
    });

    const all = [...pub, ...port];
    const query = searchQuery.trim().toLowerCase();

    return all.filter((item) => {
      if (ticketScope === "public" && item.type !== "public") return false;
      if (ticketScope === "portal" && item.type !== "portal") return false;
      if (ticketStatusFilter !== "all" && item.status !== ticketStatusFilter) return false;
      if (selectedClientFilter !== "all" && item.user_id && item.user_id !== selectedClientFilter) return false;
      if (!query) return true;
      return [item.title, item.subtitle, item.email, item.snippet]
        .filter(Boolean)
        .some((f) => (f as string).toLowerCase().includes(query));
    }).sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }, [tickets, clientTickets, ticketMessages, clientTicketMessages, ticketScope, ticketStatusFilter, selectedClientFilter, searchQuery]);

  function addTicketMessage(message: TicketMessage) {
    setTicketMessages((current) => {
      const messages = current[message.ticket_id] ?? [];
      if (messages.some((item) => item.id === message.id)) {
        return current;
      }

      return {
        ...current,
        [message.ticket_id]: [...messages, message]
      };
    });
  }

  function mergeClientProject(payload: RealtimePayload<ClientProject>) {
    if (payload.eventType === "DELETE") {
      const removedId = payload.old?.id;
      if (removedId) {
        setClientProjects((current) => current.filter((p) => p.id !== removedId));
      }
      return;
    }
    const row = payload.new as ClientProject;
    if (!row?.id) return;
    setClientProjects((current) =>
      current.some((p) => p.id === row.id)
        ? current.map((p) => (p.id === row.id ? { ...p, ...row } : p))
        : [row, ...current]
    );
  }

  function mergeClientTicket(payload: RealtimePayload<ClientTicket>) {
    if (payload.eventType === "DELETE") {
      const removedId = payload.old?.id;
      if (removedId) {
        setClientTickets((current) => current.filter((t) => t.id !== removedId));
      }
      return;
    }
    const row = payload.new as ClientTicket;
    if (!row?.id) return;
    setClientTickets((current) =>
      current.some((t) => t.id === row.id)
        ? current.map((t) => (t.id === row.id ? { ...t, ...row } : t))
        : [row, ...current]
    );
  }

  function mergeNotification(payload: RealtimePayload<AppNotification>) {
    if (payload.eventType === "DELETE") {
      const removedId = payload.old?.id;
      if (removedId) {
        setNotifications((current) => current.filter((n) => n.id !== removedId));
      }
      return;
    }
    const row = payload.new;
    if (!row?.id) return;
    setNotifications((current) =>
      current.some((n) => n.id === row.id)
        ? current.map((n) => (n.id === row.id ? { ...n, ...row } : n))
        : [row, ...current]
    );
  }

  function addClientTicketMessage(message: TicketMessage) {
    setClientTicketMessages((current) => {
      const messages = current[message.ticket_id] ?? [];
      if (messages.some((item) => item.id === message.id)) {
        return current;
      }

      return {
        ...current,
        [message.ticket_id]: [...messages, message]
      };
    });
  }

  async function loadLeads(silent = false) {
    if (!silent) {
      setLoading(true);
    }
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      hardNavigate("/admin");
      return;
    }

    const { data: adminCheck, error: adminCheckError } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", sessionData.session.user.id)
      .maybeSingle();

    if (adminCheckError || !adminCheck) {
      await supabase.auth.signOut();
      hardNavigate("/admin?error=unauthorized");
      return;
    }

    const { data, error } = await supabase
      .from("quote_requests")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: ticketData, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .order("last_message_at", { ascending: false });

    const { data: clientProjectData, error: clientProjectError } = await supabase
      .from("client_projects")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: clientTicketData, error: clientTicketError } = await supabase
      .from("client_tickets")
      .select("*")
      .order("last_message_at", { ascending: false });

    const { data: notificationData } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: changeRequestData } = await supabase
      .from("change_requests")
      .select("*")
      .order("requested_at", { ascending: false });

    const { data: websitePurchaseData } = await supabase
      .from("website_purchases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || ticketError) {
      setMessage("Nem sikerült betölteni a leadeket. Ellenőrizd az admin jogosultságot és az RLS szabályokat.");
      setLoading(false);
      return;
    }

    if (clientProjectError || clientTicketError) {
      setMessage("Az ügyfélkapu táblái még nem elérhetők. Futtasd le a 003_client_portal.sql migrációt.");
    }

    const ticketIds = (ticketData ?? []).map((ticket) => ticket.id);
    const { data: messagesData, error: messagesError } = ticketIds.length
      ? await supabase
          .from("support_ticket_messages")
          .select("*")
          .in("ticket_id", ticketIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

    if (messagesError) {
      setMessage("A ticket üzeneteket nem sikerült betölteni.");
      setLoading(false);
      return;
    }

    const groupedMessages = (messagesData ?? []).reduce<Record<string, TicketMessage[]>>((groups, item) => {
      groups[item.ticket_id] = [...(groups[item.ticket_id] ?? []), item];
      return groups;
    }, {});

    const clientTicketIds = clientTicketError ? [] : (clientTicketData ?? []).map((ticket) => ticket.id);
    const { data: clientMessagesData, error: clientMessagesError } = clientTicketIds.length
      ? await supabase
          .from("client_ticket_messages")
          .select("*")
          .in("ticket_id", clientTicketIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };

    if (clientMessagesError) {
      setMessage("Az ügyfélkapus ticket üzeneteket nem sikerült betölteni.");
      setLoading(false);
      return;
    }

    const groupedClientMessages = (clientMessagesData ?? []).reduce<Record<string, TicketMessage[]>>((groups, item) => {
      groups[item.ticket_id] = [...(groups[item.ticket_id] ?? []), item];
      return groups;
    }, {});

    setLeads(data ?? []);
    setTickets(ticketData ?? []);
    setTicketMessages(groupedMessages);
    setClientProjects(clientProjectError ? [] : clientProjectData ?? []);
    setClientTickets(clientTicketError ? [] : clientTicketData ?? []);
    setClientTicketMessages(groupedClientMessages);
    setNotifications(notificationData ?? []);
    setChangeRequests(changeRequestData ?? []);
    setWebsitePurchases((websitePurchaseData ?? []) as WebsitePurchase[]);

    // Kiszámlázatlan befizetések: a pénz beérkezett, a Billingo-számla viszont
    // nem készült el. Ezek eddig csendben ültek az adatbázisban.
    const { data: billingoData } = await supabase
      .from("subscription_payments")
      .select("id,project_id,amount,paid_at,stripe_invoice_id,billingo_error")
      .is("billingo_document_id", null)
      .eq("status", "paid")
      .order("paid_at", { ascending: false });
    setBillingoIssues((billingoData ?? []) as BillingoIssue[]);

    // Félbehagyott projektindító adatlapok (035-ös migráció). Szándékosan KÜLÖN
    // listában, nem a projektek között: ezek még nem megbízások, csak nyomok
    // arról, hol állt meg valaki — ha a projektek közé keverednének, elvinnék a
    // figyelmet a valódi teendőkről.
    const { data: briefDraftData, error: briefDraftError } = await supabase
      .from("brief_drafts")
      .select("*")
      .is("submitted_at", null)
      .order("updated_at", { ascending: false })
      .returns<BriefDraftRow[]>();
    // A tábla hiánya nem hiba: a migráció kézzel fut, addig a fül csak üres.
    setBriefDrafts(briefDraftError ? [] : briefDraftData ?? []);

    setLoading(false);
  }

  // A mentett témaválasztás visszaállítása. Csak a böngészőben létező érték,
  // ezért effektben — renderben olvasva hidratációs eltérést adna.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ADMIN_THEME_KEY);
      if (stored === "light" || stored === "dark") setAdminTheme(stored);
    } catch {
      /* privát böngészés — marad az alapértelmezett sötét */
    }
  }, []);

  // A választás kiírása a wrapper elemre és a tárolóba.
  useEffect(() => {
    document.querySelector(".admin-page")?.setAttribute("data-admin-theme", adminTheme);
    try {
      window.localStorage.setItem(ADMIN_THEME_KEY, adminTheme);
    } catch {
      /* privát böngészés — a téma csak erre a munkamenetre marad meg */
    }
  }, [adminTheme]);

  /**
   * A felhasználói lista betöltése.
   *
   * Külön kérés, nem a `loadDashboard` része: az `auth.users` adatai (utolsó
   * belépés, e-mail megerősítés) csak service role kulccsal olvashatók, tehát
   * mindenképp szerveren keresztül jönnek. Csak akkor kérjük le, amikor az
   * admin tényleg megnyitja a fület.
   */
  async function loadAdminUsers() {
    setUsersLoading(true);
    setUsersError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("A munkamenet lejárt. Jelentkezz be újra.");
      const response = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });
      const result = await response.json().catch(() => ({})) as { users?: AdminUserActivity[]; error?: string };
      if (!response.ok) throw new Error(result.error || "A felhasználói lista nem tölthető be.");
      setAdminUsers(result.users ?? []);
    } catch (error) {
      setUsersError(error instanceof Error ? error.message : "A felhasználói lista nem tölthető be.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function retryBillingoInvoice(paymentId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMessage("A munkamenet lejárt. Jelentkezz be újra.");
      return;
    }
    setBillingoRetryId(paymentId);
    try {
      const response = await fetch("/api/billingo/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ paymentId })
      });
      const result = await response.json().catch(() => ({})) as { error?: string; invoiceNumber?: string };
      if (!response.ok) {
        setMessage(result.error || "A számlázás újrapróbálása nem sikerült.");
        return;
      }
      setBillingoIssues((current) => current.filter((issue) => issue.id !== paymentId));
      setMessage(`Számla elkészült${result.invoiceNumber ? `: ${result.invoiceNumber}` : ""}.`);
    } catch {
      setMessage("A számlázó szolgáltatás nem elérhető.");
    } finally {
      setBillingoRetryId(null);
    }
  }

  /* eslint-disable @typescript-eslint/no-unused-vars --
     Az alábbi négy művelet működik és tesztelt, de jelenleg NINCS hozzájuk gomb
     az admin felületen — a hiányzó UI a teendő, nem a kód törlése. Ha bekerül a
     gomb, ez a kikapcsolás törölhető. */
  async function updateChangeRequest(id: string, patch: Partial<ChangeRequest>) {
    const { error } = await supabase.from("change_requests").update(patch).eq("id", id);
    if (error) {
      setMessage("Nem sikerült frissíteni a módosítási kérést.");
      return;
    }
    const request = changeRequests.find((item) => item.id === id);
    const project = request ? clientProjects.find((item) => item.id === request.project_id) : null;
    setChangeRequests((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
    if (request && project && (patch.status || patch.admin_note !== undefined)) {
      const purchase = isWebsitePurchaseRequest(request.description);
      const statusLabel = patch.status === "waiting_client"
        ? "A következő lépés rád vár"
        : patch.status === "completed"
          ? "Lezárva"
          : patch.status === "declined"
            ? "Nem folytatható"
            : patch.status === "in_progress"
              ? "Folyamatban"
              : patch.status === "planned"
                ? "Előkészítés alatt"
                : "Frissítve";
      await triggerNotification(
        project.user_id,
        project.contact_email,
        purchase ? "Frissítés a weboldal megvásárlásáról" : "Módosítási kérés frissült",
        `${statusLabel} a(z) "${project.title}" ${purchase ? "megvásárlási folyamatában" : "módosítási kérésében"}.${patch.admin_note ? `\n\nÜzenet: ${patch.admin_note}` : ""}`,
        "/ugyfelkapu/dashboard#statuses"
      );
    }
    setMessage("Módosítási kérés frissítve, az ügyfél értesítést kapott.");
  }

  /**
   * Előfizetés-módosítás MINDIG a szerveren keresztül.
   *
   * Korábban ezek a gombok csak az adatbázist írták át, a Stripe pedig
   * vidáman terhelte tovább az ügyfelet lemondás, szüneteltetés, kivásárlás és
   * projekttörlés után is. A `/api/stripe/subscription` végzi el a Stripe
   * oldali műveletet, és csak siker esetén írja a billing mezőket.
   */
  async function stripeSubscriptionAction(
    project: ClientProject,
    action: "cancel_now" | "pause" | "resume"
  ) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMessage("A munkamenet lejárt. Jelentkezz be újra.");
      return false;
    }
    try {
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ projectId: project.id, action })
      });
      const result = await response.json().catch(() => ({})) as { error?: string; stripeUpdated?: boolean };
      if (!response.ok) {
        setMessage(result.error || "Az előfizetés Stripe-oldali módosítása nem sikerült.");
        return false;
      }
      if (project.stripe_subscription_id && !result.stripeUpdated) {
        setMessage("Figyelem: a Stripe nem erősítette meg a módosítást. Ellenőrizd a Stripe felületén.");
      }
      return true;
    } catch {
      setMessage("A Stripe nem elérhető. Az előfizetés nem módosult — próbáld újra.");
      return false;
    }
  }

  async function approveSubscriptionPause(project: ClientProject) {
    if (!(await stripeSubscriptionAction(project, "pause"))) return;
    await updateClientProject(project.id, {
      status: "paused",
      site_health_status: "offline",
      next_step: `A menedzselt weboldal parkolóállapotba került. A következő számlázási időszaktól ${formatHuf(PARKING_MONTHLY_PRICE)}/hó parkolási díj él. Bármikor kérheted az újraaktiválást.`
    });
    await loadLeads(true);
  }

  async function approveSubscriptionResume(project: ClientProject) {
    if (!(await stripeSubscriptionAction(project, "resume"))) return;
    await updateClientProject(project.id, {
      status: "launched",
      site_health_status: "healthy",
      last_health_check_at: new Date().toISOString(),
      next_step: "A weboldal újra aktív és felügyelet alatt áll. A következő számlázástól ismét a csomag havidíja él."
    });
    await loadLeads(true);
  }

  async function finishSubscriptionCancellation(project: ClientProject) {
    const ok = await confirm({
      title: "Lemondás lezárása",
      message: "Az előfizetés azonnali hatállyal megszűnik a Stripe-ban is, tehát több terhelés nem történik. Ez nem projektátadás.",
      confirmLabel: "Előfizetés megszüntetése",
      cancelLabel: "Mégse",
      danger: true
    });
    if (!ok) return;
    if (!(await stripeSubscriptionAction(project, "cancel_now"))) return;
    await updateClientProject(project.id, {
      status: "closed",
      site_health_status: "offline",
      warranty_started_at: null,
      warranty_expires_at: null,
      next_step: "A menedzselt szolgáltatás lezárult. A weboldal leállt; forráskód-átadás és projektgarancia nem tartozik a lemondáshoz."
    });
    await loadLeads(true);
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */

  async function sendFollowupReminder(project: ClientProject) {
    const ok = await confirm({
      title: "Onboarding emlékeztető küldése",
      message: `Szeretnél egy közvetlen, segítőkész follow-up emailt küldeni az ügyfélnek a(z) „${project.title}” projekt elindításával kapcsolatban?`,
      confirmLabel: "Email elküldése",
      cancelLabel: "Mégse"
    });
    if (!ok) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;
      const response = await fetch("/api/admin/followup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionData.session.access_token}`
        },
        body: JSON.stringify({ projectId: project.id })
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(result.error || "Nem sikerült elküldeni az emlékeztetőt.");
        return;
      }
      setMessage("Follow-up emlékeztető email sikeresen elküldve!");
    } catch {
      setMessage("Hálózati hiba az emlékeztető küldésekor.");
    }
  }

  async function prepareWebsitePurchase(purchase: WebsitePurchase, project: ClientProject) {
    setWebsitePurchaseBusyId(purchase.id);
    const { data, error } = await supabase.rpc("prepare_website_purchase", {
      p_purchase_id: purchase.id,
      p_admin_note: websitePurchasePreparationNote(project, purchase)
    });
    setWebsitePurchaseBusyId(null);
    if (error) { setMessage(`A fizetési összefoglalót nem sikerült előkészíteni: ${error.message}`); return; }
    if (data) setWebsitePurchases((current) => current.map((item) => item.id === purchase.id ? data as WebsitePurchase : item));
    await triggerNotification(project.user_id, project.contact_email, "Fizetési adatok érkeztek a weboldaladhoz", `Elkészítettük a(z) „${project.title}” tulajdonba-vételének fizetési összefoglalóját. Nyisd meg az ügyfélkaput a fizetési mód kiválasztásához.`, "/ugyfelkapu/dashboard");
    setMessage("A fizetési összefoglaló elkészült, az ügyfél értesítést kapott.");
    await loadLeads(true);
  }

  async function activateWebsitePurchase(purchase: WebsitePurchase, project: ClientProject) {
    if (purchase.status !== "transfer_reported") {
      setMessage("A bankkártyás fizetés automatikusan aktiválódik; ezt a gombot banki átutalásnál használd.");
      return;
    }
    const ok = await confirm({
      title: "Vételár jóváhagyása",
      message: `Csak akkor hagyd jóvá, ha a ${formatHuf(purchase.amount)} vételár ténylegesen megérkezett a bankszámlára. Ezzel megszűnik az előfizetés és megnyílik a technikai átadás.`,
      confirmLabel: "Beérkezett, átadás indítása",
      cancelLabel: "Mégse"
    });
    if (!ok) return;
    setWebsitePurchaseBusyId(purchase.id);
    if (!(await stripeSubscriptionAction(project, "cancel_now"))) {
      setMessage("A Stripe-előfizetést nem sikerült megszüntetni, ezért a vásárlást nem zártam le. Próbáld újra.");
      setWebsitePurchaseBusyId(null);
      return;
    }
    const { data, error } = await supabase.rpc("activate_website_purchase", {
      p_purchase_id: purchase.id,
      p_handover: buildHandoverPlan(["vercel", "github", "domain"])
    });
    setWebsitePurchaseBusyId(null);
    if (error) { setMessage(`A technikai átadás indítása nem sikerült: ${error.message}`); return; }
    if (data) setWebsitePurchases((current) => current.map((item) => item.id === purchase.id ? data as WebsitePurchase : item));
    await triggerNotification(project.user_id, project.contact_email, "A vételár beérkezett — indul az átadás", `A(z) „${project.title}” tulajdonba vétele fizetve. Az előfizetés megszűnt, a vezetett technikai átadás megnyílt az ügyfélkapuban.`, "/ugyfelkapu/dashboard");
    setMessage("Vételár jóváhagyva, a vezetett technikai átadás elindult.");
    await loadLeads(true);
  }

  async function cancelWebsitePurchase(purchase: WebsitePurchase) {
    const ok = await confirm({
      title: "Tulajdonba-vétel megszakítása",
      message: "A folyamat megszakad, az ügyfél új tulajdonba-vételi folyamatot indíthat később. Az előfizetés ettől nem változik.",
      confirmLabel: "Megszakítás",
      cancelLabel: "Mégse",
      danger: true
    });
    if (!ok) return;
    setWebsitePurchaseBusyId(purchase.id);
    const { data, error } = await supabase.rpc("cancel_website_purchase", { p_purchase_id: purchase.id, p_note: "Az adminisztrátor megszakította a folyamatot." });
    setWebsitePurchaseBusyId(null);
    if (error) { setMessage(`A folyamatot nem sikerült megszakítani: ${error.message}`); return; }
    if (data) setWebsitePurchases((current) => current.map((item) => item.id === purchase.id ? data as WebsitePurchase : item));
    setMessage("A tulajdonba-vételi folyamat megszakadt.");
    await loadLeads(true);
  }

  async function startProjectWebsitePurchase(project: ClientProject) {
    const price = purchaseOptionPrice(project.subscription_plan);
    const { data, error } = await supabase
      .from("website_purchases")
      .insert({
        project_id: project.id,
        user_id: project.user_id,
        amount: price,
        status: "requested"
      })
      .select("*")
      .single();

    if (error || !data) {
      setMessage("Nem sikerült elindítani a kivásárlási folyamatot: " + (error?.message || ""));
      return;
    }

    setWebsitePurchases((prev) => [data as WebsitePurchase, ...prev]);
    setMessage("A weboldal kivásárlási folyamat elindult! Készítsd elő a fizetési adatokat.");
    await loadLeads(true);
  }

  async function updateLead(id: string, patch: Partial<Pick<Lead, "status" | "notes">>) {
    const { error } = await supabase.from("quote_requests").update(patch).eq("id", id);

    if (error) {
      setMessage("Nem sikerült menteni a módosítást.");
      return;
    }

    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
    setMessage("Módosítás mentve.");
  }

  async function updateTicket(id: string, patch: Partial<Pick<Ticket, "status" | "admin_reply">>) {
    const { error } = await supabase.from("support_tickets").update(patch).eq("id", id);

    if (error) {
      setMessage("Nem sikerült menteni a ticket módosítást.");
      return;
    }

    setTickets((current) => current.map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket)));
    setMessage("Ticket mentve.");
  }

  async function updateClientProject(
    id: string,
    patch: Partial<ClientProject>
  ) {
    const { error } = await supabase.from("client_projects").update(patch).eq("id", id);

    if (error) {
      setMessage("Nem sikerült menteni az ügyfélprojektet.");
      return;
    }

    const project = clientProjects.find((p) => p.id === id);
    if (project) {
      if (patch.status && patch.status !== project.status) {
        await triggerNotification(
          project.user_id,
          project.contact_email,
          "Frissítés érkezett a projektedhez",
          `A(z) "${project.title}" projekt új szakaszba lépett: ${projectStatusLabel[patch.status] || patch.status}.${patch.next_step ? `\n\nTeendő / következő lépés: ${patch.next_step}` : ""}`,
          "/ugyfelkapu/dashboard#statuses"
        );
      } else if (patch.next_step && patch.next_step !== project.next_step) {
        await triggerNotification(
          project.user_id,
          project.contact_email,
          "Következő lépés módosult",
          `Új feladat/következő lépés lett kijelölve a(z) "${project.title}" projektben: ${patch.next_step}`,
          "/ugyfelkapu/dashboard#statuses"
        );
      }
    }

    setClientProjects((current) => current.map((project) => (project.id === id ? { ...project, ...patch } : project)));
    setMessage("Ügyfélprojekt mentve.");
  }

  async function approveDeletion(project: ClientProject) {
    const ok = await confirm({
      title: "Projekt végleges törlése",
      message: `A(z) "${project.title}" projekt és minden adata véglegesen törlődik. Ez a művelet nem visszavonható.`,
      confirmLabel: "Végleges törlés",
      cancelLabel: "Mégse",
      danger: true
    });
    if (!ok) return;
    // A projektsor törlésével elveszne a Stripe-előfizetés nyoma, a Stripe
    // viszont tovább terhelne — és a webhook onnantól nem találná a projektet.
    if (project.stripe_subscription_id && !(await stripeSubscriptionAction(project, "cancel_now"))) {
      setMessage("A Stripe-előfizetést nem sikerült megszüntetni, ezért a projektet nem töröltem. Próbáld újra.");
      return;
    }
    const { error } = await supabase.from("client_projects").delete().eq("id", project.id);
    if (error) {
      setMessage("Nem sikerült jóváhagyni a törlést.");
    } else {
      await triggerNotification(
        project.user_id,
        project.contact_email,
        "Projekt törölve",
        `A(z) "${project.title}" projektet az adminisztrátor véglegesen törölte.`,
        "/ugyfelkapu/dashboard#projects"
      );
      setClientProjects((current) => current.filter((p) => p.id !== project.id));
      setMessage("Projekt véglegesen törölve.");
    }
  }

  async function rejectDeletion(project: ClientProject) {
    const prevStatus = project.status_before_delete_request || "planning";
    const { error } = await supabase.from("client_projects").update({
      status: prevStatus,
      delete_requested: false,
      next_step: `Törlési kérelem elutasítva. Projekt visszaállítva a(z) "${projectStatusLabel[prevStatus] || prevStatus}" fázisba.`
    }).eq("id", project.id);

    if (error) {
      setMessage("Nem sikerült elutasítani a törlést.");
    } else {
      await triggerNotification(
        project.user_id,
        project.contact_email,
        "Projekt törlése elutasítva",
        `A(z) "${project.title}" projekt törlési kérelmét az adminisztrátor elutasította. A projekt visszaállt "${projectStatusLabel[prevStatus] || prevStatus}" státuszba.`,
        "/ugyfelkapu/dashboard#statuses"
      );
      setClientProjects((current) =>
        current.map((p) =>
          p.id === project.id
            ? { ...p, status: prevStatus, delete_requested: false, next_step: `Törlési kérelem elutasítva. Projekt visszaállítva a(z) "${projectStatusLabel[prevStatus] || prevStatus}" fázisba.` }
            : p
        )
      );
      setMessage("Törlési kérelem elutasítva.");
    }
  }

  function primeOffer(project: ClientProject) {
    updateClientProject(project.id, {
      offer_currency: project.offer_currency || "Ft",
      offer_deliverables: project.offer_deliverables || defaultOfferDeliverables,
      offer_status: project.offer_status || "draft",
      offer_summary:
        project.offer_summary ||
        "Egy átgondolt, konverzióra és későbbi bővíthetőségre épített webes rendszer, nem csak egy új design.",
      offer_title: project.offer_title || `${project.title} - részletes ajánlat`,
      offer_timeline: project.offer_timeline || "Első ütem: tervezés és design. Második ütem: fejlesztés, tesztelés és élesítés.",
      status: "planning",
      next_step: project.next_step || "Átnézem az adatlapot és összerakom a részletes ajánlatot a dashboardodban."
    });
  }

  function sendProjectOffer(project: ClientProject) {
    updateClientProject(project.id, {
      offer_status: "sent",
      offer_sent_at: new Date().toISOString(),
      status: "offer_sent",
      next_step: "Elkészült a részletes ajánlat. Nézd át a projektednél a tételeket, az ütemezést és az árat."
    });
  }

  async function updateClientTicket(id: string, patch: Partial<Pick<ClientTicket, "status">>) {
    const { error } = await supabase.from("client_tickets").update(patch).eq("id", id);

    if (error) {
      setMessage("Nem sikerült menteni az ügyfél ticketet.");
      return;
    }

    setClientTickets((current) => current.map((ticket) => (ticket.id === id ? { ...ticket, ...patch } : ticket)));
    setMessage("Ügyfél ticket mentve.");
  }

  async function sendTicketReply(ticketId: string) {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket?.status === "closed") {
      setMessage("Lezárt ticketre nem lehet választ küldeni.");
      return;
    }

    const body = ticketReplies[ticketId]?.trim();
    if (!body) {
      return;
    }

    const tempId = optimisticId();
    const optimisticMessage: TicketMessage = {
      id: tempId,
      ticket_id: ticketId,
      body,
      created_at: new Date().toISOString(),
      sender: "admin"
    };

    // Instant optimistic UI update
    addTicketMessage(optimisticMessage);
    setTicketReplies((current) => ({ ...current, [ticketId]: "" }));
    setTickets((current) =>
      current.map((t) => (t.id === ticketId ? { ...t, status: "answered" } : t))
    );

    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`/api/tickets/${ticketId}/admin-reply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
      },
      body: JSON.stringify({ body })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.message) {
      setMessage("Nem sikerült elküldeni a választ.");
      return;
    }

    // Replace optimistic message with server message
    setTicketMessages((current) => {
      const msgs = current[ticketId] ?? [];
      return {
        ...current,
        [ticketId]: msgs.map((m) => (m.id === tempId ? result.message : m))
      };
    });

    setMessage(result.emailSent ? "Válasz elküldve és emailben is kézbesítve." : `Válasz mentve, de az email nem ment ki: ${result.emailError ?? "ismeretlen hiba"}`);
  }

  async function sendClientTicketReply(ticketId: string) {
    const ticket = clientTickets.find((t) => t.id === ticketId);
    if (ticket?.status === "closed") {
      setMessage("Lezárt ticketre nem lehet választ küldeni.");
      return;
    }

    const body = clientTicketReplies[ticketId]?.trim();
    if (!body) {
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const adminUserId = sessionData?.session?.user?.id;
    const tempId = optimisticId();

    const optimisticMessage: TicketMessage = {
      id: tempId,
      ticket_id: ticketId,
      body,
      created_at: new Date().toISOString(),
      sender: "admin",
      user_id: adminUserId
    };

    // Instant optimistic update
    addClientTicketMessage(optimisticMessage);
    setClientTicketReplies((current) => ({ ...current, [ticketId]: "" }));
    setClientTickets((current) =>
      current.map((t) => (t.id === ticketId ? { ...t, status: "answered" } : t))
    );

    const { data, error } = await supabase
      .from("client_ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender: "admin",
        body,
        user_id: adminUserId
      })
      .select("*")
      .single();

    if (error || !data) {
      console.error("Hiba az ügyfélkapus válasz küldésekor:", error);
      setMessage("Nem sikerült elküldeni az ügyfélkapus választ.");
      return;
    }

    // Replace optimistic with real row
    setClientTicketMessages((current) => {
      const msgs = current[ticketId] ?? [];
      return {
        ...current,
        [ticketId]: msgs.map((m) => (m.id === tempId ? data : m))
      };
    });

    if (ticket) {
      await triggerNotification(
        ticket.user_id,
        ticket.contact_email,
        "Új üzeneted érkezett",
        `ProjectEdge válaszolt a(z) "${ticket.subject}" beszélgetésben:\n\n${body.slice(0, 500)}`,
        `/ugyfelkapu/dashboard#support:${ticketId}`
      );
    }
    setMessage("Ügyfélkapus válasz elküldve.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    hardNavigate("/admin");
  }

  useEffect(() => {
    loadLeads();

    const channel = supabase
      .channel("projectedge-admin-support")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_tickets"
        },
        (payload) => {
          const nextTicket = payload.new as Ticket;
          setTickets((current) =>
            current.some((ticket) => ticket.id === nextTicket.id) ? current : [nextTicket, ...current]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets"
        },
        (payload) => {
          const nextTicket = payload.new as Ticket;
          setTickets((current) =>
            current.map((ticket) => (ticket.id === nextTicket.id ? { ...ticket, ...nextTicket } : ticket))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_ticket_messages"
        },
        (payload) => {
          addTicketMessage(payload.new as TicketMessage);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_projects"
        },
        (payload) => mergeClientProject(payload as unknown as RealtimePayload<ClientProject>)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_tickets"
        },
        (payload) => mergeClientTicket(payload as unknown as RealtimePayload<ClientTicket>)
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_ticket_messages"
        },
        (payload) => {
          addClientTicketMessage(payload.new as TicketMessage);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications"
        },
        (payload) => mergeNotification(payload as unknown as RealtimePayload<AppNotification>)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "change_requests"
        },
        (payload) => {
          const row = payload.new as ChangeRequest;
          if (!row?.id) return;
          setChangeRequests((current) => current.some((request) => request.id === row.id)
            ? current.map((request) => request.id === row.id ? { ...request, ...row } : request)
            : [row, ...current]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function renderClosedProjectCard(project: ClientProject) {
    const rating = project.client_rating;
    const review = project.client_review;
    const warrantyUntil = project.warranty_expires_at ? new Date(project.warranty_expires_at) : null;
    const warrantyActive = warrantyUntil ? warrantyUntil.getTime() > nowMs : false;
    if (project.commercial_model === "subscription" && project.subscription_status === "cancelled") {
      return (
        <article className="admin-project-card compact-closed" key={project.id} style={{ background: "var(--adm-ink-02)", border: "1px solid var(--adm-ink-06)", padding: "16px 20px", borderRadius: "20px", display: "grid", gap: "10px" }}>
          <div><strong style={{ color: "var(--adm-text)" }}>{project.title}</strong><span style={{ marginLeft: 10, color: "var(--adm-danger-text)" }}>Előfizetés lezárva</span></div>
          <p style={{ color: "var(--adm-ink-58)", margin: 0 }}>Ez lemondott menedzselt szolgáltatás, nem elkészült és átadott projekt. Nem tartozik hozzá projektlezárási értékelés vagy 30 napos technikai garancia.</p>
          <small style={{ color: "var(--adm-ink-40)" }}>Leállítás dátuma: {project.cancel_effective_at ? new Date(project.cancel_effective_at).toLocaleDateString("hu-HU") : "nincs rögzítve"}</small>
        </article>
      );
    }
    const completedPurchase = project.commercial_model === "purchase" && Boolean(project.warranty_started_at || project.final_payment_paid_at || project.final_payment_paid);
    if (!completedPurchase) {
      return (
        <article className="admin-project-card compact-closed" key={project.id} style={{ background: "var(--adm-ink-02)", border: "1px solid var(--adm-ink-06)", padding: "16px 20px", borderRadius: "20px", display: "grid", gap: "10px" }}>
          <div><strong style={{ color: "var(--adm-text)" }}>{project.title}</strong><span style={{ marginLeft: 10, color: "var(--adm-ink-50)" }}>{project.offer_status === "declined" ? "Ajánlat elutasítva" : "Teljesítés nélkül lezárva"}</span></div>
          <p style={{ color: "var(--adm-ink-58)", margin: 0 }}>Nem történt kész weboldal-átadás, ezért ehhez az ügyhöz nem tartozik projektértékelés vagy 30 napos technikai garancia.</p>
          <button className="admin-delete-project" type="button" onClick={() => approveDeletion(project)}>Projekt végleges törlése</button>
        </article>
      );
    }
    return (
      <article className="admin-project-card compact-closed" key={project.id} style={{
        background: "var(--adm-ink-02)",
        border: "1px solid var(--adm-ink-06)",
        padding: "16px 20px",
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <strong style={{ fontSize: "16px", color: "var(--adm-text)" }}>{project.title}</strong>
              <span style={{
                background: "rgba(118, 171, 174, 0.15)",
                color: "var(--adm-accent-text)",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "bold"
              }}>
                Lezárva
              </span>
            </div>
            <div style={{ fontSize: "13px", color: "var(--adm-ink-40)", marginTop: "4px" }}>
              Típus: <strong>{project.project_type}</strong> · Cégnév: <strong>{project.company || "Nincs cégnév"}</strong>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: "13px" }}>
            <strong>{project.contact_name || "Ügyfél"}</strong>
            {project.contact_email ? <a href={`mailto:${project.contact_email}`} style={{ color: "var(--adm-accent-text)", fontSize: "12px" }}>{project.contact_email}</a> : null}
            <button className="admin-delete-project" type="button" onClick={() => approveDeletion(project)}>
              Projekt végleges törlése
            </button>
          </div>
        </div>

        {rating ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid var(--adm-ink-04)", paddingTop: "10px" }}>
            <span style={{ fontSize: "13px", color: "var(--adm-ink-60)" }}>Ügyfél értékelése:</span>
            <div style={{ color: "var(--adm-warn-text)", fontSize: "16px", letterSpacing: "2px" }}>{"★".repeat(rating)}</div>
            {review && (
              <span style={{ fontSize: "13px", color: "var(--adm-ink-50)", fontStyle: "italic" }}>
                - "{review}"
              </span>
            )}
          </div>
        ) : (
          <div style={{ borderTop: "1px solid var(--adm-ink-04)", paddingTop: "10px", fontSize: "13px", color: "var(--adm-ink-40)", fontStyle: "italic" }}>
            Még nem érkezett értékelés az ügyféltől.
          </div>
        )}

        <section className="admin-warranty-card">
          <div>
            <span className="micro-label">30 napos technikai garancia</span>
            <strong>
              {warrantyUntil
                ? `${warrantyActive ? "Aktív" : "Lejárt"} · ${warrantyUntil.toLocaleDateString("hu-HU")}-ig`
                : "Nincs rögzített kezdődátum"}
            </strong>
            <small>Nem automatikus karbantartás: csak az átadott működés igazolt hibáit javítjuk. Új tartalom és új funkció külön kérés.</small>
          </div>
          <ul>
            <li>Átadási hozzáférések és tulajdonosok rögzítve</li>
            <li>Éles domain és HTTPS ellenőrizve</li>
            <li>Űrlapok / fő funkciók átadáskor tesztelve</li>
            <li>Garanciális hibát az ügyfél ticketben jelez</li>
          </ul>
        </section>

      </article>
    );
  }

  // Forward step labels + the proper side-effecting transition per phase.
  const wizardNextLabel: Record<string, string> = {
    request_received: "Ajánlat előkészítése",
    planning: "Ajánlat elküldése",
    in_progress: "Előnézet küldése az ügyfélnek",
    review: "Élesítés"
  };

  function wizardNext(project: ClientProject) {
    switch (project.status) {
      case "request_received":
        primeOffer(project);
        break;
      case "planning":
        sendProjectOffer(project);
        break;
      case "deposit_pending":
        // Menedzselt előfizetésnél az első havidíj a Stripe-on érkezik, és a
        // webhook írja az előfizetési mezőket — kézzel nem szabad "aktívra"
        // állítani, mert az valós terhelés nélkül indítaná el a szolgáltatást.
        if (project.commercial_model === "subscription") {
          setMessage("A menedzselt előfizetés az első Stripe-terhelés beérkezésekor indul el automatikusan.");
          break;
        }
        if (project.deposit_transfer_reported) {
          updateClientProject(project.id, {
            payment_status: "deposit_paid",
            status: "in_progress",
            next_step: "A foglaló beérkezett. Elindult a kivitelezés; most az adminisztrátor dolgozik."
          });
        }
        break;
      case "in_progress":
        updateClientProject(project.id, { status: "review", next_step: "Elkészült az előnézeti verzió. Nyisd meg, majd kérj módosítást vagy hagyd jóvá az élesítéshez." });
        break;
      case "review":
        if (project.review_approved) {
          // Élesítéskor összeáll a vezetett átadás terve. Alapból minden
          // szolgáltatás benne van; a fölösleges csoportokat (pl. nincs
          // adatbázis vagy levélküldés) az átadás-panelen egy kattintással
          // ki lehet venni.
          const managed = project.commercial_model === "subscription";
          updateClientProject(project.id, {
            status: "launched",
            next_step: managed ? "Az oldal éles és felügyelet alatt van. A módosításokat és az előfizetést innen kezelheted." : "Az oldal éles. Kérlek, rendezd a hátralékot, majd jelezd az utalást.",
            site_health_status: managed ? "healthy" : project.site_health_status,
            last_health_check_at: managed ? new Date().toISOString() : project.last_health_check_at,
            handover_steps: managed ? [] : project.handover_steps?.length
              ? project.handover_steps
              : buildHandoverPlan(DEFAULT_HANDOVER_SERVICES)
          });
        }
        break;
      default:
        break;
    }
  }

  function renderProjectGuide(project: ClientProject) {
    type GuideAction = { label: string; onClick: () => void; variant?: "primary" | "secondary" };
    type Guide = { who: "admin" | "client"; step?: string; headline: string; detail: string; actions?: GuideAction[] };

    const managed = project.commercial_model === "subscription";
    const guides: Record<string, Guide> = {
      request_received: {
        who: "admin",
        step: "1. lépés",
        headline: "Ajánlat előkészítése",
        detail: "Új igény érkezett. Olvasd át az adatlapot lent, majd egy kattintással készítsd elő az ajánlat vázát — ezután az Ajánlatépítőben tudod kitölteni.",
        actions: [{ label: "Ajánlat vázának előkészítése", onClick: () => primeOffer(project) }]
      },
      planning: {
        who: "admin",
        step: "2. lépés",
        headline: "Ajánlat összeállítása és küldése",
        detail: "Töltsd ki jobb oldalt az Ajánlatépítőt (cím, ütemezés, scope, tételek, ár), majd küldd el az ügyfélnek. Elküldés után az ügyfélé a döntés.",
        actions: [{ label: "Ajánlat elküldése az ügyfélnek", onClick: () => sendProjectOffer(project) }]
      },
      offer_sent: {
        who: "client",
        headline: "Ajánlat elfogadására vár",
        detail: "Elküldted az ajánlatot. Az ügyfél most dönt: elfogadja, módosítást kér, vagy elutasítja. Neked most nincs teendőd — jelezni fog a rendszer, ha lépett."
      },
      contract_pending: {
        who: "client",
        headline: "Szerződés aláírására vár",
        detail: managed ? "A választott havi csomag rögzítve van. A szolgáltatási szerződés elfogadása után az első havidíj következik." : "Az ügyfél elfogadta az ajánlatot. A szerződés aláírására vársz — amint aláírta, a foglaló (előleg) befizetése következik.",
        actions: [{ label: "📧 Onboarding emlékeztető email küldése", onClick: () => sendFollowupReminder(project), variant: "secondary" }]
      },
      deposit_pending: {
        who: project.deposit_transfer_reported ? "admin" : "client",
        headline: project.deposit_transfer_reported ? `Ellenőrizd ${managed ? "az első havidíj" : "a foglaló"} beérkezését` : `${managed ? "Első havidíj" : "Foglaló"} utalására vár`,
        detail: project.deposit_transfer_reported
          ? "Az ügyfél jelezte az utalást. Ellenőrizd a bankszámlát, és csak akkor indítsd a fejlesztést, ha az összeg megérkezett."
          : `Az ügyfélnek kell elutalnia és jeleznie ${managed ? "az első havidíjat" : "a foglalót"}. Addig nincs teendőd.`,
        actions: project.deposit_transfer_reported
          ? [{ label: `${managed ? "Első havidíj" : "Foglaló"} megérkezett — fejlesztés indítása`, onClick: () => wizardNext(project) }]
          : [{ label: "📧 Onboarding emlékeztető email küldése", onClick: () => sendFollowupReminder(project), variant: "secondary" }]
      },
      in_progress: {
        who: "admin",
        step: "3. lépés",
        headline: "Fejlesztés",
        detail: "Folyik a munka. Frissítsd a mérföldköveket, oszd meg az előnézeti linket és a tervezett átadás dátumát. Ha kész a bemutatható verzió, küldd el ügyfél-visszajelzésre.",
        actions: [{ label: "Előnézet küldése az ügyfélnek", onClick: () => updateClientProject(project.id, { status: "review", next_step: "Elkészült az előnézeti verzió. Nyisd meg, majd kérj módosítást vagy hagyd jóvá az élesítéshez." }) }]
      },
      review: {
        who: project.review_approved ? "admin" : "client",
        headline: project.review_approved ? "Az ügyfél jóváhagyta — élesítsd az oldalt" : "Ügyfél-visszajelzésre vár",
        detail: project.review_approved
          ? "A tartalom és a megjelenés jóváhagyva. Ellenőrizd az átadási pontokat, majd élesíts."
          : "Az ügyfél most vagy módosítást kér, vagy jóváhagyja az oldalt. Addig ne léptesd tovább.",
        actions: project.review_approved ? [{ label: "Oldal élesítése", onClick: () => wizardNext(project) }] : undefined
      },
      launched: {
        who: managed ? "admin" : project.final_transfer_reported && !project.final_payment_paid
          ? "admin"
            : "client",
        step: "4. lépés",
        headline: managed ? "Aktív menedzselt weboldal" : project.final_transfer_reported && !project.final_payment_paid
          ? "Ellenőrizd a végső fizetést"
          : project.final_payment_paid
            ? "Az ügyfél lezárhatja a projektet"
            : "Ügyfél lépésére vár",
        detail: managed ? "Felügyelet alatt: ellenőrizd a következő számlázást, az oldal állapotát és az ügyfél módosítási kéréseit." : project.final_transfer_reported && !project.final_payment_paid
          ? "Az ügyfél jelezte a hátralék utalását. Csak a bankszámla ellenőrzése után jelöld beérkezettnek."
          : project.final_payment_paid
            ? "Neked nincs további teendőd. A lezárás után 30 napos díjmentes technikai garancia indul; csak bejelentett hiba esetén kell reagálnod."
            : "Az ügyfél rendezi a végső fizetést. Addig nincs teendőd."
      },
      paused: {
        who: "admin",
        headline: "A projekt szünetel",
        detail: "A fenti státusz-választóval tudod újraindítani (Kivitelezés vagy Ügyfél-visszajelzés), ha folytatódik a munka."
      },
      deletion_pending: {
        who: "admin",
        headline: "Törlési kérelem elbírálása",
        detail: "Az ügyfél törlést kért. A fenti piros sávban tudod jóváhagyni (végleges törlés) vagy elutasítani (visszaáll az előző fázisba)."
      }
    };

    const guide = guides[project.status];
    if (!guide) return null;
    const isAdmin = guide.who === "admin";

    return (
      <div
        key={`guide-${project.id}-${project.status}`}
        className="admin-guide chapter-in"
        style={{
          borderRadius: "18px",
          padding: "18px 22px",
          margin: "0 0 8px",
          background: isAdmin ? "linear-gradient(135deg, rgba(118, 171, 174, 0.16) 0%, rgba(20, 24, 34, 0.95) 100%)" : "var(--adm-ink-03)",
          border: isAdmin ? "1px solid rgba(118, 171, 174, 0.45)" : "1px solid var(--adm-ink-08)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px" }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <span style={{
              display: "inline-block",
              fontSize: "11px",
              fontWeight: 850,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "4px 10px",
              borderRadius: "999px",
              marginBottom: "8px",
              background: isAdmin ? "var(--adm-accent-text)" : "var(--adm-ink-12)",
              color: isAdmin ? "var(--adm-inset)" : "var(--adm-text-muted)"
            }}>
              {isAdmin ? (guide.step ? `${guide.step} · Rajtad a sor` : "Rajtad a sor") : "⏳ Ügyfélre vár"}
            </span>
            <strong style={{ display: "block", fontSize: "18px", fontWeight: "900", color: "var(--adm-text)", marginBottom: "4px" }}>{guide.headline}</strong>
            <p style={{ margin: 0, fontSize: "13.5px", color: "var(--adm-ink-80)", lineHeight: 1.5 }}>{guide.detail}</p>
          </div>
          {isAdmin && guide.actions?.length ? (
            <div className="admin-guide-actions" style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              {guide.actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  className={action.variant === "secondary" ? "admin-btn-secondary" : "admin-btn-primary"}
                  onClick={action.onClick}
                >
                  {action.label} →
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* ── Top Command Bar ── */}
      <div className="admin-command-bar">
        <div className="admin-brand-row">
          <div className="admin-brand-left">
            <div className="admin-logo-badge">PE</div>
            <div className="admin-brand-titles">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h1>Admin Központ</h1>
                <span style={{
                  background: "rgba(118, 171, 174, 0.15)",
                  color: "var(--adm-accent-text)",
                  fontSize: "11px",
                  fontWeight: "800",
                  padding: "2px 8px",
                  borderRadius: "6px"
                }}>
                  ÉLES VEZÉRLŐ
                </span>
              </div>
              <p>ProjectEdge CRM & Management Command Center</p>
            </div>
          </div>

          <div className="admin-header-actions">
            <button
              aria-pressed={adminTheme === "light"}
              className="admin-theme-toggle"
              onClick={() => setAdminTheme(adminTheme === "light" ? "dark" : "light")}
              title={adminTheme === "light" ? "Váltás sötét módra" : "Váltás világos módra"}
              type="button"
            >
              {adminTheme === "light" ? "🌙 Sötét mód" : "☀️ Világos mód"}
            </button>

            <button
              className="button ghost admin-sandbox-btn"
              disabled={paymentTestLoading}
              onClick={startPaymentSmokeTest}
              title="Csak Stripe sandbox környezetben érhető el"
              type="button"
            >
              {paymentTestLoading ? "Indítás…" : "⚡ 200 Ft sandbox teszt"}
            </button>

            <div style={{ position: "relative" }}>
              <button
                className="admin-notif-btn"
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                type="button"
                aria-label="Értesítések"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadNotificationsCount > 0 && (
                  <span className="admin-notif-badge">{unreadNotificationsCount}</span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div style={{
                  position: "absolute",
                  top: "48px",
                  right: 0,
                  width: "360px",
                  background: "#161A22",
                  border: "1px solid var(--adm-ink-12)",
                  borderRadius: "18px",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                  zIndex: 1000,
                  padding: "16px",
                  display: "grid",
                  gap: "12px",
                  maxHeight: "420px",
                  overflowY: "auto"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--adm-ink-06)", paddingBottom: "8px" }}>
                    <strong style={{ color: "var(--adm-text)", fontSize: "14px" }}>Értesítések ({unreadNotificationsCount})</strong>
                    {notifications.some((n) => !n.read) && (
                      <button
                        onClick={async () => {
                          await supabase.from("notifications").update({ read: true }).is("user_id", null);
                          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                        }}
                        style={{ background: "none", border: "none", color: "var(--adm-accent-text)", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}
                        type="button"
                      >
                        Mind olvasott
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--adm-ink-40)", textAlign: "center", padding: "20px 0" }}>Nincsenek értesítések.</p>
                  ) : (
                    <div style={{ display: "grid", gap: "8px" }}>
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={async () => {
                            await supabase.from("notifications").update({ read: true }).eq("id", n.id);
                            setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
                          }}
                          style={{
                            background: n.read ? "transparent" : "rgba(118, 171, 174, 0.08)",
                            border: n.read ? "1px solid transparent" : "1px solid rgba(118, 171, 174, 0.2)",
                            padding: "10px",
                            borderRadius: "10px",
                            cursor: "pointer",
                            fontSize: "13px",
                            display: "grid",
                            gap: "2px"
                          }}
                        >
                          <span style={{ color: n.read ? "var(--adm-text)" : "var(--adm-accent-text)", fontWeight: "bold" }}>{n.title}</span>
                          <p style={{ margin: 0, color: "var(--adm-ink-70)", fontSize: "12px" }}>{n.message}</p>
                          <small style={{ color: "var(--adm-ink-30)", fontSize: "10px", marginTop: "4px" }}>{new Date(n.created_at).toLocaleString("hu-HU")}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button className="admin-logout-btn" onClick={signOut} type="button">
              Kilépés
            </button>
          </div>
        </div>

        {/* ── KPI Metrikák sáv ── */}
        <div className="admin-kpi-grid">
          <div
            className={`admin-kpi-card ${totalUrgentCount > 0 ? "urgent" : ""} ${activeTab === "inbox" ? "active-tab-kpi" : ""}`}
            onClick={() => setActiveTab("inbox")}
          >
            <span className="admin-kpi-label">SÜRGŐS TEENDŐ</span>
            <strong className="admin-kpi-val" style={{ color: totalUrgentCount > 0 ? "#FF8A65" : "var(--adm-text)" }}>{totalUrgentCount} db</strong>
            <span className="admin-kpi-sub">{totalUrgentCount === 0 ? "Minden naprakész" : "Beavatkozást igényel"}</span>
          </div>

          <div
            className={`admin-kpi-card ${activeTab === "projects" ? "active-tab-kpi" : ""}`}
            onClick={() => setActiveTab("projects")}
          >
            <span className="admin-kpi-label">AKTÍV PROJEKT</span>
            <strong className="admin-kpi-val">{activeProjects.length} db</strong>
            <span className="admin-kpi-sub">{adminTurnProjectsCount} nálad vár lépésre</span>
          </div>

          <div
            className={`admin-kpi-card ${totalOpenTickets > 0 ? "urgent" : ""} ${activeTab === "tickets" ? "active-tab-kpi" : ""}`}
            onClick={() => setActiveTab("tickets")}
          >
            <span className="admin-kpi-label">NYITOTT TICKET</span>
            <strong className="admin-kpi-val" style={{ color: totalOpenTickets > 0 ? "var(--adm-accent-text)" : "var(--adm-text)" }}>{totalOpenTickets} db</strong>
            <span className="admin-kpi-sub">{openPublicTicketsCount} widget + {openClientTicketsCount} ügyfélkapu</span>
          </div>

          <div
            className={`admin-kpi-card ${activeTab === "managed" ? "active-tab-kpi" : ""}`}
            onClick={() => setActiveTab("managed")}
          >
            <span className="admin-kpi-label">HAVI ELŐFIZETÉSEK</span>
            <strong className="admin-kpi-val">{formatHuf(activeMonthlyRevenue)}</strong>
            <span className="admin-kpi-sub">{activeSubscribersCount} aktív menedzselt oldal</span>
          </div>
        </div>

        {/* ── Fő Menü Navigációs Sáv ── */}
        <nav className="admin-main-nav">
          <button
            className={`admin-nav-item ${activeTab === "inbox" ? "active" : ""}`}
            onClick={() => setActiveTab("inbox")}
            type="button"
          >
            <span className="admin-nav-icon">⚡</span>
            <span>Teendők & Inbox</span>
            {totalUrgentCount > 0 && <span className="admin-nav-badge urgent">{totalUrgentCount}</span>}
          </button>

          <button
            className={`admin-nav-item ${activeTab === "projects" ? "active" : ""}`}
            onClick={() => setActiveTab("projects")}
            type="button"
          >
            <span className="admin-nav-icon">🚀</span>
            <span>Projektek</span>
            <span className="admin-nav-badge">{activeProjects.length}</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "tickets" ? "active" : ""}`}
            onClick={() => setActiveTab("tickets")}
            type="button"
          >
            <span className="admin-nav-icon">💬</span>
            <span>Üzenetek & Ticketek</span>
            {totalOpenTickets > 0 && <span className="admin-nav-badge highlight">{totalOpenTickets}</span>}
          </button>

          <button
            className={`admin-nav-item ${activeTab === "managed" ? "active" : ""}`}
            onClick={() => setActiveTab("managed")}
            type="button"
          >
            <span className="admin-nav-icon">🌐</span>
            <span>Menedzselt Oldalak</span>
            <span className="admin-nav-badge">{managedProjects.length}</span>
          </button>

          {/* Külön fül, szándékosan a projektek UTÁN: ezek még nem megbízások,
              csak jelzés arról, hol állt meg valaki a kitöltésben. */}
          <button
            className={`admin-nav-item ${activeTab === "drafts" ? "active" : ""}`}
            onClick={() => setActiveTab("drafts")}
            type="button"
          >
            <span className="admin-nav-icon">📝</span>
            <span>Félbehagyott adatlapok</span>
            <span className="admin-nav-badge">{briefDrafts.length}</span>
          </button>

          <button
            className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("users");
              // Csak a fül megnyitásakor kérjük le — az `auth.users` lekérdezése
              // service role kulccsal fut, nincs értelme minden betöltésnél.
              if (!adminUsers.length && !usersLoading) void loadAdminUsers();
            }}
            type="button"
          >
            <span className="admin-nav-icon">👥</span>
            <span>Felhasználók</span>
            {adminUsers.length > 0 ? <span className="admin-nav-badge">{adminUsers.length}</span> : null}
          </button>

          <button
            className={`admin-nav-item ${activeTab === "leads" ? "active" : ""}`}
            onClick={() => setActiveTab("leads")}
            type="button"
          >
            <span className="admin-nav-icon">📇</span>
            <span>Érdeklődők (Leadek)</span>
            {freshLeadsCount > 0 ? (
              <span className="admin-nav-badge fresh">{freshLeadsCount} új</span>
            ) : (
              <span className="admin-nav-badge">{leads.length}</span>
            )}
          </button>
        </nav>
      </div>

      <OfflineBanner online={online} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {confirmModal}

      {/* ════════════════════════════════════════════════════════════════════════
          FÜL 1: TEENDŐK & INBOX
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "inbox" && (
        <div className="admin-tab-pane">
          <AdminInbox
            projects={clientProjects}
            changeRequests={changeRequests}
            websitePurchases={websitePurchases}
            billingoIssues={billingoIssues}
            tickets={clientTickets}
            billingoRetryId={billingoRetryId}
            onRetryBillingo={retryBillingoInvoice}
            onOpenProject={(projectId, subTab) => {
              setWizardProjectId(projectId);
              if (subTab) {
                setProjectSubTab((prev) => ({ ...prev, [projectId]: subTab }));
              }
              setSelectedClientFilter("all");
              setShowArchive(false);
              setActiveTab("projects");
            }}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          FÜL 2: PROJEKTEK & MUNKAASZTAL
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "projects" && (
        <div className="admin-tab-pane">
          <div className="admin-filter-bar">
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", flex: 1 }}>
              <div className="admin-search-wrap">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Keresés projekt címre, névre, emailre…"
                  className="admin-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Keresés törlése"
                    style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--adm-ink-50)", cursor: "pointer", fontSize: "16px" }}
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                value={selectedClientFilter}
                onChange={(e) => setSelectedClientFilter(e.target.value)}
                className="admin-select-dark"
              >
                <option value="all">Minden ügyfél ({uniqueClients.length})</option>
                {uniqueClients.map((c) => (
                  <option key={c.userId} value={c.userId}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>

            {archivedProjects.length > 0 && (
              <button
                type="button"
                className="button ghost"
                onClick={() => setShowArchive((v) => !v)}
                style={{ color: "var(--adm-text)", borderColor: "var(--adm-ink-24)", minHeight: "auto", padding: "8px 14px", fontSize: "12.5px" }}
              >
                {showArchive ? "Archív elrejtése" : `Archív (${archivedProjects.length})`}
              </button>
            )}
          </div>

          {!loading && activeProjects.length > 0 && (
            <div className="admin-project-switcher">
              {activeProjects.map((project) => {
                const isActive = wizardProject?.id === project.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    className={`admin-project-tab ${isActive ? "active" : ""}`}
                    onClick={() => setWizardProjectId(project.id)}
                  >
                    <span className="admin-project-tab-title">{project.title}</span>
                    <span className="admin-project-tab-phase">
                      {project.commercial_model === "subscription" ? `${subscriptionPlan(project.subscription_plan).name} · ` : ""}
                      {projectStatusLabel[project.status] ?? project.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="admin-project-board">
            {loading ? (
              <>
                {[0, 1].map((i) => (
                  <div key={i} className="admin-project-card" style={{ display: "grid", gap: "16px" }}>
                    <Skeleton height={14} width="30%" />
                    <Skeleton height={28} width="60%" />
                    <Skeleton height={56} radius={16} />
                    <div style={{ display: "flex", gap: "10px" }}>
                      <Skeleton height={40} width={160} radius={14} />
                      <Skeleton height={40} width={120} radius={14} />
                    </div>
                  </div>
                ))}
              </>
            ) : activeProjects.length === 0 ? (
              <div className="admin-card-dark" style={{ textAlign: "center", padding: "40px" }}>
                <strong style={{ fontSize: "18px" }}>{searchQuery ? "Nincs találat a keresésre." : "Nincs aktív ügyfélkapus projekt."}</strong>
                <p style={{ color: "var(--adm-ink-50)", margin: "8px 0 0" }}>
                  {searchQuery ? "Próbálj más kulcsszót, vagy töröld a keresést." : "A regisztrált ügyfelek projektindításai itt jelennek meg."}
                </p>
              </div>
            ) : (
              (wizardProject ? [wizardProject] : []).map((project) => {
                if (project.status === "closed") {
                  return renderClosedProjectCard(project);
                }

                const brief = parseBrief(project.goals);
                const palette =
                  project.brief_data?.palette === "custom"
                    ? [
                        project.brief_data.customBg,
                        project.brief_data.customAccent,
                        project.brief_data.customText,
                        project.brief_data.customCta
                      ].filter(Boolean)
                    : paletteByName(brief["Színirány"]);
                const briefFields = [
                  ["Cél", brief["Cél"]],
                  ["Célközönség", brief["Célközönség / vásárlók"]],
                  ["Elsődleges művelet", brief["Elsődleges látogatói művelet"]],
                  ["Oldalak", brief["Fontos oldalak"]],
                  ["Funkciók", brief["Kért funkciók"]],
                  ["Stílus", brief["Stílus / hangulat"]],
                  ["Karakter", brief["Vizuális karakter"]],
                  ["Prioritás", brief["Prioritás"]]
                ].filter(([, value]) => Boolean(value));

                const assetFields = [
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
                ].filter(([, value]) => Boolean(value));

                const s = project.status;
                const showHandover = project.commercial_model !== "subscription" && project.commercial_model !== "purchase" && s !== "closed" && s !== "deletion_pending";

                return (
                <article className="admin-project-card" key={project.id} style={{ border: project.delete_requested ? '2px solid #DC3545' : '1px solid var(--adm-ink-08)', position: 'relative' }}>
                  {project.delete_requested && (
                    <div style={{ background: '#721C24', border: '1px solid #F5C6CB', color: '#F8D7DA', padding: '16px', borderRadius: '18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '15px' }}>ÜGYFÉL TÖRLÉSI KÉRELMET NYÚJTOTT BE!</strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--adm-ink-80)' }}>Kérés ideje: {project.delete_requested_at ? new Date(project.delete_requested_at).toLocaleString('hu-HU') : 'nem ismert'}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="button primary" style={{ background: '#DC3545', borderColor: '#DC3545', minHeight: 'auto', padding: '8px 14px' }} onClick={() => approveDeletion(project)}>Törlés jóváhagyása</button>
                        <button className="button secondary" style={{ color: 'var(--adm-text)', borderColor: 'var(--adm-ink-30)', minHeight: 'auto', padding: '8px 14px' }} onClick={() => rejectDeletion(project)}>Elutasítás</button>
                      </div>
                    </div>
                  )}

                  <header className="admin-project-top">
                    <div>
                      <span className="status-pill">{projectStatusLabel[project.status] ?? project.status}</span>
                      <h3>{project.title}</h3>
                      <p>{brief["Cél"] || project.goals}</p>
                      {project.last_modified_at && (
                        <small style={{ color: 'var(--adm-ink-50)', display: 'block', marginTop: '6px', fontStyle: 'italic' }}>
                          Utoljára módosítva: {new Date(project.last_modified_at).toLocaleString('hu-HU')} ({project.last_modified_by_name || 'Felhasználó'})
                        </small>
                      )}
                    </div>
                    <div className="admin-project-contact">
                      <strong>{project.contact_name || "Ügyfél"}</strong>
                      {project.contact_email ? <a href={`mailto:${project.contact_email}`}>{project.contact_email}</a> : null}
                      <span>{project.company || "Nincs cégnév"}</span>
                      <button className="admin-delete-project" type="button" onClick={() => approveDeletion(project)}>
                        Projekt végleges törlése
                      </button>
                    </div>
                  </header>

                  {/* ── 1. Aktuális Lépés & Teendő Vezérlő ── */}
                  {renderProjectGuide(project)}

                  {/* ── 2. Kompakt Telemetria & Információs Sáv ── */}
                  <div className="admin-project-facts-strip">
                    <div className="admin-fact-pill">
                      <span className="admin-fact-label">Csomag / Modell</span>
                      <strong className="admin-fact-value">
                        {project.commercial_model === "subscription"
                          ? `${subscriptionPlan(project.subscription_plan).name} (${formatHuf(project.monthly_price ?? subscriptionPlan(project.subscription_plan).price)}/hó) · Havidíjas`
                          : `${project.budget || "Egyedi büdzsé"} · Egyszeri megvásárlás`}
                      </strong>
                    </div>
                    <div className="admin-fact-pill">
                      <span className="admin-fact-label">Weboldal / Staging</span>
                      <strong className="admin-fact-value">{project.website || project.staging_url || "Még nincs beállítva"}</strong>
                    </div>
                    <div className="admin-fact-pill">
                      <span className="admin-fact-label">Létrehozva</span>
                      <strong className="admin-fact-value">{formatDate(project.created_at)}</strong>
                    </div>
                    {project.commercial_model === "subscription" ? (
                      <>
                        <div className="admin-fact-pill">
                          <span className="admin-fact-label">Előfizetés</span>
                          <strong className="admin-fact-value" style={{ color: project.subscription_status === "active" ? "var(--adm-accent-text)" : "#FFA726" }}>
                            {project.subscription_status ?? "inactive"}
                            {project.next_billing_at ? ` (Köv: ${new Date(project.next_billing_at).toLocaleDateString("hu-HU")})` : ""}
                          </strong>
                        </div>
                        <div className="admin-fact-pill">
                          <span className="admin-fact-label">Oldal állapota</span>
                          <strong className="admin-fact-value" style={{ color: project.site_health_status === "healthy" ? "var(--adm-accent-text)" : "#EF4444" }}>
                            {project.site_health_status === "healthy" ? "🟢 Rendszer rendben" : "🔴 Figyelmet igényel"}
                          </strong>
                        </div>
                      </>
                    ) : (
                      <div className="admin-fact-pill">
                        <span className="admin-fact-label">Fizetés</span>
                        <strong className="admin-fact-value">{project.payment_status}</strong>
                      </div>
                    )}
                  </div>

                  {/* ── 2.5 Kivásárlási Figyelmeztetés Banner (ha van aktív folyamat) ── */}
                  {(() => {
                    const activePurchase = websitePurchases.find(
                      (w) => w.project_id === project.id && !["completed", "declined", "cancelled"].includes(w.status)
                    );
                    if (!activePurchase) return null;
                    return (
                      <div style={{
                        background: "rgba(118, 171, 174, 0.15)",
                        border: "1px solid var(--adm-accent-text)",
                        borderRadius: "14px",
                        padding: "14px 18px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginTop: "10px"
                      }}>
                        <div>
                          <span style={{ fontSize: "11px", fontWeight: "900", textTransform: "uppercase", color: "var(--adm-accent-text)", letterSpacing: "0.05em" }}>💎 FONTOS TEENDŐ</span>
                          <strong style={{ display: "block", color: "var(--adm-text)", fontSize: "15px", marginTop: "2px" }}>
                            Az ügyfél kérte a weboldal tulajdonba vételét / végleges megvásárlását!
                          </strong>
                          <small style={{ color: "var(--adm-ink-75)", fontSize: "12.5px" }}>
                            Vételár: <strong>{formatHuf(activePurchase.amount)}</strong> · Állapot: <strong>{activePurchase.status}</strong>
                          </small>
                        </div>
                        <button
                          type="button"
                          className="admin-btn-primary"
                          style={{ minHeight: "auto", padding: "8px 16px", fontSize: "12.5px" }}
                          onClick={() => setProjectSubTab((prev) => ({ ...prev, [project.id]: "subscription" }))}
                        >
                          💎 Kivásárlás kezelése itt →
                        </button>
                      </div>
                    );
                  })()}

                  {/* ── 3. Munkafolyamat Stúdió Fülek (Tab Navigation) ── */}
                  {(() => {
                    const activeSub = projectSubTab[project.id] ?? "prompt";
                    const reqs = changeRequests.filter((r) => r.project_id === project.id);
                    const isManaged = project.commercial_model === "subscription";
                    const projectPurchases = websitePurchases.filter((w) => w.project_id === project.id);
                    const hasPurchases = projectPurchases.length > 0;

                    return (
                      <div style={{ display: "grid", gap: "14px", marginTop: "6px" }}>
                        <div className="admin-studio-subnav">
                          <button
                            type="button"
                            className={`admin-studio-tab ${activeSub === "prompt" ? "active" : ""}`}
                            onClick={() => setProjectSubTab((prev) => ({ ...prev, [project.id]: "prompt" }))}
                          >
                            <span>⚡</span> AI Prompt Stúdió
                          </button>
                          <button
                            type="button"
                            className={`admin-studio-tab ${activeSub === "brief" ? "active" : ""}`}
                            onClick={() => setProjectSubTab((prev) => ({ ...prev, [project.id]: "brief" }))}
                          >
                            <span>📋</span> Brief & Anyagok {briefFields.length > 0 && `(${briefFields.length})`}
                          </button>
                          <button
                            type="button"
                            className={`admin-studio-tab ${activeSub === "build" ? "active" : ""}`}
                            onClick={() => setProjectSubTab((prev) => ({ ...prev, [project.id]: "build" }))}
                          >
                            <span>🛠️</span> Kivitelezés & Fázis
                          </button>
                          <button
                            type="button"
                            className={`admin-studio-tab ${activeSub === "changes" ? "active" : ""}`}
                            onClick={() => setProjectSubTab((prev) => ({ ...prev, [project.id]: "changes" }))}
                          >
                            <span>💬</span> Módosítások & Ajánlat {reqs.length > 0 ? `(${reqs.length})` : ""}
                          </button>
                          {(isManaged || hasPurchases) && (
                            <button
                              type="button"
                              className={`admin-studio-tab ${activeSub === "subscription" ? "active" : ""}`}
                              onClick={() => setProjectSubTab((prev) => ({ ...prev, [project.id]: "subscription" }))}
                            >
                              <span>{hasPurchases ? "💎" : "⚙️"}</span> {hasPurchases ? "Kivásárlás & Átadás" : "Előfizetés Vezérlés"}
                            </button>
                          )}
                        </div>

                        {/* ── FÜL 1: AI PROMPT STÚDIÓ ── */}
                        {activeSub === "prompt" && (
                          <div className="tab-pane-fade">
                            <AiBuildPromptPanel project={toAiPromptProject(project)} onNotify={setMessage} />
                          </div>
                        )}

                        {/* ── FÜL 2: BRIEF ÉS ÜGYFÉL ANYAGOK ── */}
                        {activeSub === "brief" && (
                          <div className="tab-pane-fade" style={{ display: "grid", gap: "16px" }}>
                            <section className="admin-brief-visual">
                              <strong>Kiválasztott stílusirány & Színvilág</strong>
                              <p>{brief["Stílus / hangulat"] || "Nincs külön stílus megjegyzés megadva."}</p>
                              {palette.length ? (
                                <div className="admin-palette-strip" style={{ marginTop: "4px" }}>
                                  {palette.map((color) => (
                                    <span key={color} style={{ background: color }} title={color} />
                                  ))}
                                </div>
                              ) : null}
                            </section>

                            {briefFields.length ? (
                              <section className="admin-assets-block">
                                <strong>Kérdőív / Célok ({briefFields.length})</strong>
                                <div className="admin-brief-grid">
                                  {briefFields.map(([label, value]) => (
                                    <div key={label}>
                                      <span>{label}</span>
                                      <p>{value}</p>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            ) : null}

                            {assetFields.length ? (
                              <section className="admin-assets-block">
                                <strong>Anyagok és hozzáférések ({assetFields.length})</strong>
                                <div className="admin-brief-grid">
                                  {assetFields.map(([label, value]) => (
                                    <div key={label}>
                                      <span>{label}</span>
                                      <p>{value}</p>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            ) : null}

                            {project.brief_data?.photoUrls?.length ? (
                              <section className="admin-assets-block">
                                <strong>Feltöltött képek ({project.brief_data.photoUrls.length})</strong>
                                <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
                                  {project.brief_data.photoUrls.map((url: string, idx: number) => (
                                    <AssetImage key={url} value={url} alt={`Kép ${idx + 1}`} />
                                  ))}
                                </div>
                              </section>
                            ) : null}

                            {project.brief_data?.contentFileUrls?.length ? (
                              <section className="admin-assets-block">
                                <strong>Dokumentumok és szövegek ({project.brief_data.contentFileUrls.length})</strong>
                                <div style={{ display: "grid", gap: "6px" }}>
                                  {project.brief_data.contentFileUrls.map((url: string, idx: number) => (
                                    <AssetLink key={url} value={url} label={`Fájl ${idx + 1}`} />
                                  ))}
                                </div>
                              </section>
                            ) : null}

                            {project.logo_url ? (
                              <section className="admin-assets-block">
                                <strong>Feltöltött logó</strong>
                                <div className="asset-preview-grid logo-asset-preview" style={{ maxWidth: 220 }}>
                                  <AssetImage value={project.logo_url} alt={`${project.company || project.title} logó`} />
                                </div>
                              </section>
                            ) : null}
                          </div>
                        )}

                        {/* ── FÜL 3: KIVITELEZÉS & FÁZISVEZÉRLŐ ── */}
                        {activeSub === "build" && (
                          <div className="tab-pane-fade" style={{ display: "grid", gap: "16px" }}>
                            <section className="admin-control-panel">
                              <strong>Fázis és felügyelet</strong>
                              <div className="admin-control-grid">
                                <div>
                                  <span>Fázis</span>
                                  <select
                                    value={project.status}
                                    onChange={(event) => updateClientProject(project.id, { status: event.target.value })}
                                  >
                                    {projectStatuses.map(([value, label]) => (
                                      <option key={value} value={value}>{label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <span>Staging / Előnézeti link</span>
                                  <input
                                    defaultValue={project.staging_url ?? ""}
                                    onBlur={(event) => updateClientProject(project.id, { staging_url: event.target.value.trim() || null })}
                                    placeholder="https://preview.projectedge.hu"
                                  />
                                </div>
                                <div>
                                  <span>Becsült átadási határidő</span>
                                  <input
                                    defaultValue={project.estimated_deadline ?? ""}
                                    onBlur={(event) => updateClientProject(project.id, { estimated_deadline: event.target.value.trim() || null })}
                                    placeholder="pl. 2026. március 15."
                                  />
                                </div>
                                <div>
                                  <span>Következő lépés (ügyfél látja)</span>
                                  <input
                                    defaultValue={project.next_step ?? ""}
                                    onBlur={(event) => updateClientProject(project.id, { next_step: event.target.value.trim() || null })}
                                    placeholder="Mit lát az ügyfél a dashboardban..."
                                  />
                                </div>
                              </div>

                              {/* ── Mérföldkövek ── */}
                              <div style={{ borderTop: "1px solid var(--adm-ink-06)", paddingTop: "14px", marginTop: "10px" }}>
                                <strong style={{ fontSize: "14px", color: "var(--adm-text)" }}>Mérföldkövek</strong>
                                <div style={{ display: "grid", gap: "6px", marginTop: "8px" }}>
                                  {(project.milestones ?? []).map((m, idx) => (
                                    <label key={idx} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer", color: m.done ? "var(--adm-ink-50)" : "var(--adm-text)" }}>
                                      <input
                                        type="checkbox"
                                        checked={m.done}
                                        onChange={async (e) => {
                                          const next = (project.milestones ?? []).map((item, i) => (i === idx ? { ...item, done: e.target.checked } : item));
                                          await updateClientProject(project.id, { milestones: next });
                                        }}
                                        style={{ accentColor: "var(--adm-accent-text)" }}
                                      />
                                      <span style={{ textDecoration: m.done ? "line-through" : "none" }}>{m.title}</span>
                                    </label>
                                  ))}
                                </div>
                                <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                  <input
                                    value={newMilestoneTitle[project.id] ?? ""}
                                    onChange={(e) => setNewMilestoneTitle((prev) => ({ ...prev, [project.id]: e.target.value }))}
                                    placeholder="Új mérföldkő címe…"
                                    style={{ background: "var(--adm-inset)", border: "1px solid var(--adm-ink-12)", borderRadius: "8px", padding: "6px 10px", color: "var(--adm-text)", fontSize: "12px", flex: 1 }}
                                  />
                                  <button
                                    type="button"
                                    className="admin-btn-secondary"
                                    style={{ minHeight: "auto", padding: "6px 14px", fontSize: "12px", height: "36px" }}
                                    onClick={async () => {
                                      const title = newMilestoneTitle[project.id]?.trim();
                                      if (!title) return;
                                      const next = [...(project.milestones ?? []), { title, done: false }];
                                      await updateClientProject(project.id, { milestones: next });
                                      setNewMilestoneTitle((prev) => ({ ...prev, [project.id]: "" }));
                                    }}
                                  >
                                    + Hozzáadás
                                  </button>
                                </div>
                              </div>
                            </section>

                            {showHandover && (
                              <AdminHandoverPanel
                                steps={project.handover_steps}
                                onChange={(steps) => {
                                  void updateClientProject(project.id, { handover_steps: steps });
                                }}
                                onStepCompleted={(stepId, title) => {
                                  void notifyHandoverStep(project, title);
                                }}
                              />
                            )}
                          </div>
                        )}

                        {/* ── FÜL 4: MÓDOSÍTÁSI KÉRÉSEK ÉS ÁRAJÁNLATOK ── */}
                        {activeSub === "changes" && (
                          <div className="tab-pane-fade" style={{ display: "grid", gap: "16px" }}>
                            {reqs.length > 0 ? (
                              <div className="change-requests-admin" style={{ background: "var(--adm-panel)", border: "1px solid var(--adm-ink-08)", borderRadius: "20px", padding: "20px", display: "grid", gap: "14px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                  <div>
                                    <strong style={{ color: "var(--adm-text)", fontSize: "16px" }}>Ügyfél módosítási kérések ({reqs.length})</strong>
                                    {isManaged && (
                                      <small style={{ display: "block", color: "var(--adm-accent-text)", marginTop: "2px" }}>
                                        Havi keretfogyasztás ellenőrizve a csomag szerint.
                                      </small>
                                    )}
                                  </div>
                                </div>
                                <div style={{ display: "grid", gap: "12px" }}>
                                  {reqs.map((req) => (
                                    <div key={req.id} style={{ background: "var(--adm-inset)", border: "1px solid var(--adm-ink-08)", borderRadius: "14px", padding: "14px", display: "grid", gap: "10px" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", flexWrap: "wrap" }}>
                                        <div>
                                          <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--adm-accent-text)" }}>{req.category}</span>
                                          <small style={{ color: "var(--adm-ink-50)", marginLeft: "8px" }}>{new Date(req.requested_at).toLocaleString("hu-HU")}</small>
                                        </div>
                                        <select
                                          value={req.status}
                                          onChange={async (e) => {
                                            const nextStatus = e.target.value as ChangeRequest["status"];
                                            await supabase.from("change_requests").update({ status: nextStatus }).eq("id", req.id);
                                            setChangeRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status: nextStatus } : r)));
                                            await triggerNotification(
                                              project.user_id,
                                              project.contact_email,
                                              "Módosítási kérés állapota frissült",
                                              `A(z) "${project.title}" projektednél benyújtott módosítás állapota: ${nextStatus}.`,
                                              "/ugyfelkapu/dashboard"
                                            );
                                          }}
                                          style={{ background: "var(--adm-panel)", border: "1px solid var(--adm-ink-15)", color: "var(--adm-text)", borderRadius: "8px", padding: "4px 8px", fontSize: "12px" }}
                                        >
                                          <option value="new">Új</option>
                                          <option value="in_progress">Folyamatban</option>
                                          <option value="waiting_client">Ügyfélre vár</option>
                                          <option value="planned">Tervezve</option>
                                          <option value="completed">Elkészült</option>
                                          <option value="declined">Elutasítva</option>
                                        </select>
                                      </div>
                                      <p style={{ margin: 0, color: "var(--adm-ink-90)", fontSize: "13.5px", lineHeight: 1.45 }}>{req.description}</p>

                                      {req.transfer_reported_at && req.status !== "completed" && (
                                        <div style={{ background: "rgba(118, 171, 174, 0.12)", border: "1px solid rgba(118, 171, 174, 0.4)", borderRadius: "10px", padding: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                          <div>
                                            <strong style={{ color: "var(--adm-accent-text)", fontSize: "13px" }}>Az ügyfél jelezte az utalást!</strong>
                                            <small style={{ display: "block", color: "var(--adm-ink-70)" }}>Összeg: {formatHuf(req.quoted_amount ?? 0)} · Közlemény: {req.payment_reference}</small>
                                          </div>
                                          <button
                                            className="admin-btn-primary"
                                            onClick={() => confirmChangePayment(req, project)}
                                            style={{ minHeight: "auto", padding: "6px 12px", fontSize: "12px" }}
                                            type="button"
                                          >
                                            Utalás beérkezett
                                          </button>
                                        </div>
                                      )}

                                      {!isWebsitePurchaseRequest(req.description) && req.included_in_plan === false && !req.paid_at ? (
                                        <div className="change-quote-box">
                                          {req.quoted_amount ? (
                                            <div className="change-quote-state">
                                              <div style={{ display: "grid", gap: "2px" }}>
                                                <strong style={{ fontSize: "15px", color: "var(--adm-accent-text)" }}>{formatHuf(req.quoted_amount)}</strong>
                                                <small style={{ color: "var(--adm-ink-50)", fontSize: "11px" }}>Közlemény: {req.payment_reference ?? "generálás alatt"}</small>
                                              </div>
                                              <span style={{ fontSize: "12px", color: "var(--adm-ink-70)" }}>
                                                {req.transfer_reported_at
                                                  ? "Az ügyfél jelezte az utalást — ellenőrizd a számlát."
                                                  : req.quote_accepted_at
                                                    ? "Az ügyfél elfogadta, utalásra vár."
                                                    : "Elküldve, az ügyfél döntésére vár."}
                                              </span>
                                              {req.transfer_reported_at && !req.paid_at ? (
                                                <button className="admin-btn-primary" type="button" onClick={() => confirmChangePayment(req, project)} style={{ minHeight: "auto", padding: "6px 12px", fontSize: "12px" }}>
                                                  Beérkezett — munka indítása
                                                </button>
                                              ) : null}
                                            </div>
                                          ) : (
                                            <form
                                              className="change-quote-form"
                                              onSubmit={(event) => {
                                                event.preventDefault();
                                                const form = event.currentTarget;
                                                const amount = Number((form.elements.namedItem("amount") as HTMLInputElement).value);
                                                const note = (form.elements.namedItem("note") as HTMLInputElement).value;
                                                sendChangeQuote(req, project, amount, note);
                                              }}
                                            >
                                              <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "140px 1fr auto", alignItems: "flex-end" }}>
                                                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                  <span style={{ fontSize: "11px", color: "var(--adm-accent-text)", fontWeight: "bold" }}>Ajánlati ár (Ft)</span>
                                                  <input name="amount" type="number" min={1000} step={100} required placeholder="pl. 45000" style={{ width: "100%" }} />
                                                </label>
                                                <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                  <span style={{ fontSize: "11px", color: "var(--adm-accent-text)", fontWeight: "bold" }}>Mit tartalmaz?</span>
                                                  <input name="note" required placeholder="pl. Egyedi naptár modul, 3 munkanap." style={{ width: "100%" }} />
                                                </label>
                                                <button className="admin-btn-primary" type="submit" style={{ minHeight: "auto", height: "38px", fontSize: "12px", padding: "0 14px" }}>
                                                  Ajánlat küldése
                                                </button>
                                              </div>
                                            </form>
                                          )}
                                        </div>
                                      ) : null}

                                      <ChangeThread
                                        requestId={req.id}
                                        role="admin"
                                        onSent={() => triggerNotification(
                                          project.user_id,
                                          project.contact_email,
                                          "Új üzenet a kérésedhez",
                                          `Válasz érkezett a(z) „${project.title}" projekt egyik kérésére. Nyisd meg az ügyfélkaput a részletekért.`,
                                          "/ugyfelkapu/dashboard"
                                        )}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p style={{ color: "var(--adm-ink-60)", fontSize: "13.5px", margin: 0, padding: "16px 0" }}>Jelenleg nincs aktív módosítási kérés ehhez a projekthez.</p>
                            )}

                            {/* ── Egyedi Árajánlat Készítő ── */}
                            <section className="admin-offer-builder">
                              <div className="admin-offer-head">
                                <span className="micro-label">Egyedi weboldal árajánlat készítő</span>
                                <strong>{project.offer_title || "Egyedi weboldal árajánlat"}</strong>
                                <small>Állapot: {project.offer_status ?? "draft"}</small>
                              </div>
                              <div className="admin-offer-grid">
                                <div>
                                  <span>Ajánlat címe</span>
                                  <input
                                    defaultValue={project.offer_title ?? ""}
                                    onBlur={(event) => updateClientProject(project.id, { offer_title: event.target.value })}
                                    placeholder="pl. Budai Otthonok - Exkluzív Weboldal"
                                  />
                                </div>
                                <div>
                                  <span>Ár (Ft)</span>
                                  <input
                                    defaultValue={project.offer_price ?? ""}
                                    onBlur={(event) => updateClientProject(project.id, { offer_price: event.target.value ? Number(event.target.value) : null })}
                                    placeholder="pl. 240000"
                                    type="number"
                                  />
                                </div>
                                <div>
                                  <span>Ütemezés</span>
                                  <input
                                    defaultValue={project.offer_timeline ?? ""}
                                    onBlur={(event) => updateClientProject(project.id, { offer_timeline: event.target.value })}
                                    placeholder="pl. 2 hét tervezés + 3 hét fejlesztés"
                                  />
                                </div>
                                <div>
                                  <span>Összefoglaló</span>
                                  <textarea
                                    defaultValue={project.offer_summary ?? ""}
                                    onBlur={(event) => updateClientProject(project.id, { offer_summary: event.target.value })}
                                    placeholder="Rövid, meggyőző indoklás..."
                                  />
                                </div>
                                <div>
                                  <span>Szállítandó tételek (soronként)</span>
                                  <textarea
                                    defaultValue={project.offer_deliverables ?? ""}
                                    onBlur={(event) => updateClientProject(project.id, { offer_deliverables: event.target.value })}
                                    placeholder="Egyedi design&#10;Reszponzív felépítés&#10;SEO optimalizálás..."
                                    style={{ minHeight: "100px" }}
                                  />
                                </div>
                              </div>
                              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                                <button className="admin-btn-primary" onClick={() => sendProjectOffer(project)} type="button">
                                  Ajánlat elküldése az ügyfélnek
                                </button>
                              </div>
                            </section>
                          </div>
                        )}

                        {/* ── FÜL 5: MENEDZSELT ELŐFIZETÉS FELÜGYELET & KIVÁSÁRLÁS ── */}
                        {activeSub === "subscription" && (isManaged || hasPurchases) && (
                          <div className="tab-pane-fade" style={{ display: "grid", gap: "16px" }}>
                            {isManaged && (
                              <section className="managed-admin-card">
                                <div className="managed-admin-head">
                                  <div>
                                    <span className="micro-label">Menedzselt előfizetés vezérlés</span>
                                    <strong style={{ fontSize: "16px", color: "var(--adm-text)" }}>{subscriptionPlan(project.subscription_plan).name} csomag</strong>
                                    <small style={{ color: "var(--adm-ink-60)" }}>Stripe ügyfél: {project.stripe_customer_id || "Nincs összekapcsolva"} · Előfizetés: {project.stripe_subscription_id || "Nincs összekapcsolva"}</small>
                                  </div>
                                  <div className="managed-admin-actions">
                                    <select
                                      value={project.subscription_status ?? "inactive"}
                                      onChange={(event) => updateClientProject(project.id, { subscription_status: event.target.value })}
                                    >
                                      <option value="inactive">Inaktív</option>
                                      <option value="active">Aktív</option>
                                      <option value="pause_requested">Szüneteltetés kérelem</option>
                                      <option value="paused">Szüneteltetve</option>
                                      <option value="resume_requested">Újraindítás kérelem</option>
                                      <option value="cancel_requested">Lemondás kérelem</option>
                                      <option value="cancelled">Lemondva</option>
                                    </select>
                                    <select
                                      value={project.site_health_status ?? "healthy"}
                                      onChange={(event) => updateClientProject(project.id, { site_health_status: event.target.value, last_health_check_at: new Date().toISOString() })}
                                    >
                                      <option value="healthy">🟢 Rendszer rendben</option>
                                      <option value="issue_detected">🟡 Figyelmet igényel</option>
                                      <option value="offline">🔴 Oldal leállt</option>
                                    </select>
                                  </div>
                                </div>
                              </section>
                            )}

                            {/* ── Weboldal Tulajdonba vétel (Kivásárlás) Kezelő ── */}
                            {projectPurchases.length > 0 ? (
                              projectPurchases.map((purchase) => (
                                <WebsitePurchaseAdminPanel
                                  key={purchase.id}
                                  project={project}
                                  purchase={purchase}
                                  busy={websitePurchaseBusyId === purchase.id}
                                  onPrepare={async () => { await prepareWebsitePurchase(purchase, project); }}
                                  onActivate={async () => { await activateWebsitePurchase(purchase, project); }}
                                  onCancel={async () => { await cancelWebsitePurchase(purchase); }}
                                  onHandoverChange={(steps) => { void updateClientProject(project.id, { handover_steps: steps }); }}
                                  onHandoverStepCompleted={(stepId, title) => { void notifyHandoverStep(project, title); }}
                                />
                              ))
                            ) : isManaged ? (
                              <section style={{
                                background: "var(--adm-inset)",
                                border: "1px solid rgba(118, 171, 174, 0.3)",
                                borderRadius: "16px",
                                padding: "16px 20px",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "14px"
                              }}>
                                <div>
                                  <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "var(--adm-accent-text)" }}>💎 Végleges Megvásárlás (Kivásárlás)</span>
                                  <strong style={{ display: "block", color: "var(--adm-text)", fontSize: "15px", marginTop: "2px" }}>
                                    Weboldal tulajdonba vételi opció
                                  </strong>
                                  <p style={{ margin: "4px 0 0", color: "var(--adm-ink-70)", fontSize: "12.5px" }}>
                                    Vételár erre a csomagra: <strong>{formatHuf(purchaseOptionPrice(project.subscription_plan))}</strong>. A folyamat indításakor az ügyfél fizetési összefoglalót kap, a fizetés után pedig leáll az előfizetés és elindul a technikai átadás.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  className="admin-btn-primary"
                                  style={{ minHeight: "auto", padding: "8px 16px", fontSize: "12px", whiteSpace: "nowrap" }}
                                  onClick={() => void startProjectWebsitePurchase(project)}
                                >
                                  + Kivásárlási folyamat indítása
                                </button>
                              </section>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {(() => {
                    const idx = projectFlow.findIndex(([v]) => v === project.status);
                    if (idx === -1) return null;
                    const nextLabel = wizardNextLabel[project.status];
                    const adminMayAdvance =
                      project.status === "request_received" ||
                      project.status === "planning" ||
                      project.status === "in_progress" ||
                      (project.status === "deposit_pending" && project.deposit_transfer_reported) ||
                      (project.status === "review" && project.review_approved);
                    return (
                      <div className="admin-wizard-nav">
                        <span className="admin-wizard-step">
                          {idx + 1} / {projectFlow.length} · {projectFlow[idx][1]}
                        </span>
                        {adminMayAdvance && nextLabel ? (
                          <button
                            type="button"
                            className="button primary"
                            style={{ minHeight: "auto", padding: "10px 18px", fontSize: "13px" }}
                            onClick={() => wizardNext(project)}
                          >
                            {nextLabel} →
                          </button>
                        ) : <span className="waiting-copy">A következő lépést most a másik fél végzi.</span>}
                      </div>
                    );
                  })()}
                </article>
                );
              })
            )}
          </div>

          {showArchive && archivedProjects.length > 0 && (
            <div style={{ display: "grid", gap: "16px", marginTop: "24px" }}>
              <h3 style={{ color: "var(--adm-ink-70)", margin: 0, fontSize: "16px" }}>Lezárt projektek archívuma ({archivedProjects.length})</h3>
              <div className="admin-project-board">
                {archivedProjects.map((project) => renderClosedProjectCard(project))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          FÜL 3: ÜZENETEK & TICKETEK (2 OSZLOPOS MASTER-DETAIL INBOX)
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "tickets" && (
        <div className="admin-tab-pane">
          <div className="admin-ticket-split">
            {/* Bal oldali lista */}
            <div className="admin-ticket-sidebar">
              <div className="admin-ticket-sidebar-head">
                <div className="admin-ticket-tabs">
                  <button
                    className={`admin-ticket-tab-btn ${ticketScope === "all" ? "active" : ""}`}
                    onClick={() => setTicketScope("all")}
                    type="button"
                  >
                    Összes ({unifiedTickets.length})
                  </button>
                  <button
                    className={`admin-ticket-tab-btn ${ticketScope === "public" ? "active" : ""}`}
                    onClick={() => setTicketScope("public")}
                    type="button"
                  >
                    Widget ({tickets.length})
                  </button>
                  <button
                    className={`admin-ticket-tab-btn ${ticketScope === "portal" ? "active" : ""}`}
                    onClick={() => setTicketScope("portal")}
                    type="button"
                  >
                    Ügyfélkapu ({clientTickets.length})
                  </button>
                </div>

                <div style={{ display: "flex", gap: "6px" }}>
                  {(["all", "open", "answered", "closed"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTicketStatusFilter(st)}
                      style={{
                        background: ticketStatusFilter === st ? "rgba(118, 171, 174, 0.2)" : "transparent",
                        border: ticketStatusFilter === st ? "1px solid var(--adm-accent-text)" : "1px solid var(--adm-ink-08)",
                        color: ticketStatusFilter === st ? "var(--adm-accent-text)" : "var(--adm-ink-60)",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: "750",
                        padding: "3px 8px",
                        cursor: "pointer"
                      }}
                    >
                      {st === "all" ? "Mind" : st === "open" ? "Nyitott" : st === "answered" ? "Válaszolt" : "Lezárt"}
                    </button>
                  ))}
                </div>

                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Keresés beszélgetésekben…"
                  style={{
                    background: "#181D24",
                    border: "1px solid var(--adm-ink-10)",
                    borderRadius: "10px",
                    color: "var(--adm-text)",
                    fontSize: "12.5px",
                    padding: "7px 12px",
                    outline: "none",
                    width: "100%"
                  }}
                />
              </div>

              <div className="admin-ticket-list">
                {unifiedTickets.length === 0 ? (
                  <div style={{ padding: "30px 14px", textAlign: "center", color: "var(--adm-ink-40)", fontSize: "13px" }}>
                    Nincs a szűrésnek megfelelő beszélgetés.
                  </div>
                ) : (
                  unifiedTickets.map((t) => {
                    const isSelected = selectedTicketId ? selectedTicketId === t.id : unifiedTickets[0]?.id === t.id;
                    const isOpen = t.status === "open";
                    return (
                      <div
                        key={t.id}
                        className={`admin-ticket-item ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedTicketId(t.id);
                          setSelectedTicketType(t.type);
                        }}
                      >
                        <div className="admin-ticket-item-top">
                          <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {isOpen && <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#FF5722" }} />}
                            {t.title}
                          </strong>
                          <span>{t.type === "public" ? "Widget" : "Kapu"}</span>
                        </div>
                        <p className="admin-ticket-item-snippet">{t.snippet || t.subtitle}</p>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                          <span style={{
                            fontSize: "10px",
                            fontWeight: "800",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            background: t.status === "open" ? "rgba(255, 87, 34, 0.15)" : t.status === "answered" ? "rgba(118, 171, 174, 0.15)" : "var(--adm-ink-06)",
                            color: t.status === "open" ? "#FF8A65" : t.status === "answered" ? "var(--adm-accent-text)" : "var(--adm-ink-40)"
                          }}>
                            {t.status === "open" ? "Nyitott" : t.status === "answered" ? "Megválaszolva" : "Lezárva"}
                          </span>
                          <span style={{ fontSize: "10.5px", color: "var(--adm-ink-30)" }}>
                            {t.lastActivity ? new Date(t.lastActivity).toLocaleDateString("hu-HU", { month: "short", day: "numeric" }) : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Jobb oldali csevegő részlet */}
            {(() => {
              const activeT = unifiedTickets.find((t) => (selectedTicketId ? t.id === selectedTicketId : true)) ?? unifiedTickets[0] ?? null;
              if (!activeT) {
                return (
                  <div className="admin-ticket-detail" style={{ alignItems: "center", justifyContent: "center", padding: "40px", color: "var(--adm-ink-40)" }}>
                    Válassz ki egy beszélgetést a bal oldali listából.
                  </div>
                );
              }

              const msgs = activeT.type === "public" ? (ticketMessages[activeT.id] ?? []) : (clientTicketMessages[activeT.id] ?? []);
              const currentReply = activeT.type === "public" ? (ticketReplies[activeT.id] ?? "") : (clientTicketReplies[activeT.id] ?? "");

              return (
                <div className="admin-ticket-detail">
                  <div className="admin-ticket-detail-head">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "16px", color: "var(--adm-text)" }}>{activeT.title}</strong>
                        <span style={{ fontSize: "12px", color: "var(--adm-ink-40)" }}>({activeT.type === "public" ? "Weboldal látogató" : "Ügyfélkapu"})</span>
                      </div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", marginTop: "4px", fontSize: "12.5px" }}>
                        {activeT.email && <a href={`mailto:${activeT.email}`} style={{ color: "var(--adm-accent-text)" }}>{activeT.email}</a>}
                        <span style={{ color: "var(--adm-ink-40)" }}>{activeT.subtitle}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <select
                        value={activeT.status}
                        onChange={(e) => {
                          if (activeT.type === "public") {
                            updateTicket(activeT.id, { status: e.target.value });
                          } else {
                            updateClientTicket(activeT.id, { status: e.target.value });
                          }
                        }}
                        className="admin-select-dark"
                        style={{ height: "36px", fontSize: "12px" }}
                      >
                        {ticketStatuses.map(([val, lbl]) => (
                          <option key={val} value={val}>{lbl}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="admin-ticket-detail-messages">
                    {msgs.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px", color: "var(--adm-ink-40)", fontSize: "13px" }}>
                        Még nincsenek üzenetek ebben a beszélgetésben.
                      </div>
                    ) : (
                      msgs.map((item) => (
                        <div
                          key={item.id}
                          className={`admin-chat-message ${item.sender}`}
                          style={{
                            maxWidth: "80%",
                            background: item.sender === "admin" ? "rgba(118, 171, 174, 0.15)" : "var(--adm-ink-05)",
                            border: item.sender === "admin" ? "1px solid rgba(118, 171, 174, 0.25)" : "1px solid var(--adm-ink-08)",
                            borderRadius: "16px",
                            padding: "12px 16px",
                            justifySelf: item.sender === "admin" ? "end" : "start",
                            color: "var(--adm-text)"
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", fontSize: "11px", marginBottom: "4px" }}>
                            <span style={{ color: item.sender === "admin" ? "var(--adm-accent-text)" : "var(--adm-ink-60)", fontWeight: "bold" }}>
                              {item.sender === "admin" ? "Te (Admin)" : activeT.title}
                            </span>
                            <small style={{ color: "var(--adm-ink-30)" }}>
                              {item.created_at ? new Date(item.created_at).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" }) : ""}
                            </small>
                          </div>
                          <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{item.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="admin-ticket-detail-composer">
                    <textarea
                      value={currentReply}
                      onChange={(e) => {
                        if (activeT.type === "public") {
                          setTicketReplies((curr) => ({ ...curr, [activeT.id]: e.target.value }));
                        } else {
                          setClientTicketReplies((curr) => ({ ...curr, [activeT.id]: e.target.value }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (activeT.type === "public") {
                            void sendTicketReply(activeT.id);
                          } else {
                            void sendClientTicketReply(activeT.id);
                          }
                        }
                      }}
                      placeholder="Írd ide a válaszod… (Enter = küldés, Shift+Enter = új sor)"
                      rows={2}
                    />
                    <button
                      className="button primary"
                      style={{ height: "44px", padding: "0 18px", fontSize: "13px" }}
                      disabled={!currentReply.trim()}
                      onClick={() => {
                        if (activeT.type === "public") {
                          void sendTicketReply(activeT.id);
                        } else {
                          void sendClientTicketReply(activeT.id);
                        }
                      }}
                      type="button"
                    >
                      Küldés
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          FÜL 4: MENEDZSELT OLDALAK & ELŐFIZETÉSEK
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "managed" && (
        <div className="admin-tab-pane">
          <section className="managed-admin-summary">
            <div>
              <span>MENEDZSELT OLDALAK</span>
              <strong>{managedProjects.length}</strong>
              <small>aktív vagy készülő szolgáltatás</small>
            </div>
            <div>
              <span>HAVI ÁLLOMÁNY</span>
              <strong>{formatHuf(activeMonthlyRevenue)}</strong>
              <small>jelenlegi aktív havidíj</small>
            </div>
            <div>
              <span>TEENDŐ</span>
              <strong>{pendingSubActions}</strong>
              <small>előfizetési kérelem</small>
            </div>
          </section>

          {billingoIssues.length > 0 && (
            <BillingoIssuesCard
              issues={billingoIssues}
              projects={clientProjects}
              retryingId={billingoRetryId}
              onRetry={retryBillingoInvoice}
            />
          )}

          {websitePurchases.map((purchase) => {
            const proj = clientProjects.find((p) => p.id === purchase.project_id);
            if (!proj) return null;
            return (
              <WebsitePurchaseAdminPanel
                key={purchase.id}
                project={proj}
                purchase={purchase}
                busy={websitePurchaseBusyId === purchase.id}
                onPrepare={async () => { await prepareWebsitePurchase(purchase, proj); }}
                onActivate={async () => { await activateWebsitePurchase(purchase, proj); }}
                onCancel={async () => { await cancelWebsitePurchase(purchase); }}
                onHandoverChange={(steps) => { void updateClientProject(proj.id, { handover_steps: steps }); }}
                onHandoverStepCompleted={(stepId, title) => { void notifyHandoverStep(proj, title); }}
              />
            );
          })}

          <div className="admin-card-dark">
            <div className="admin-card-dark-header">
              <strong>Menedzselt előfizetéses projektek ({managedProjects.length})</strong>
            </div>
            <div style={{ display: "grid", gap: "12px" }}>
              {managedProjects.length === 0 ? (
                <p style={{ margin: 0, color: "var(--adm-ink-40)", fontSize: "13px" }}>Még nincs menedzselt előfizetéses projekt.</p>
              ) : (
                managedProjects.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: "var(--adm-ink-02)",
                      border: "1px solid var(--adm-ink-06)",
                      borderRadius: "14px",
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px"
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "15px", color: "var(--adm-text)" }}>{p.title}</strong>
                      <div style={{ fontSize: "12.5px", color: "var(--adm-ink-50)", marginTop: "3px" }}>
                        {p.contact_name || "Ügyfél"} · {p.contact_email} · {subscriptionPlan(p.subscription_plan).name} ({formatHuf(p.monthly_price ?? 0)}/hó)
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                      <span style={{
                        fontSize: "11px",
                        fontWeight: "800",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        background: p.subscription_status === "active" ? "rgba(118, 171, 174, 0.15)" : "var(--adm-ink-06)",
                        color: p.subscription_status === "active" ? "var(--adm-accent-text)" : "var(--adm-ink-50)"
                      }}>
                        {p.subscription_status ?? "inactive"}
                      </span>
                      <button
                        className="button ghost"
                        style={{ minHeight: "auto", padding: "6px 12px", fontSize: "12px", color: "var(--adm-text)", borderColor: "var(--adm-ink-20)" }}
                        onClick={() => {
                          setWizardProjectId(p.id);
                          setActiveTab("projects");
                        }}
                        type="button"
                      >
                        Projekt megnyitása →
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          FÜL 5: ÉRDEKLŐDŐK (LEADEK CRM)
      ════════════════════════════════════════════════════════════════════════ */}
      {/* ════════════════════════════════════════════════════════════════════════
          FÜL 5: FÉLBEHAGYOTT ADATLAPOK
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "drafts" && (
        <div className="admin-tab-pane">
          <div className="admin-card-dark">
            <div className="admin-card-dark-header">
              <div>
                <strong>Félbehagyott projektindító adatlapok</strong>
                <span className="admin-card-dark-sub">
                  {briefDrafts.length} megkezdett, de be nem küldött adatlap. A beküldés után a sor eltűnik innen, és
                  projektként jelenik meg. 24 óra tétlenség után automatikusan megy egy — és csak egy — emlékeztető levél.
                </span>
              </div>
            </div>

            {loading ? (
              <div className="admin-empty-note"><strong>Betöltés...</strong></div>
            ) : briefDrafts.length === 0 ? (
              <div className="admin-empty-note">
                Jelenleg nincs félbehagyott adatlap. (Ha a lista mindig üres, ellenőrizd, hogy lefutott-e a
                035_brief_drafts.sql migráció.)
              </div>
            ) : (
              <div className="lead-table">
                <div className="lead-row header">
                  <span>Ki</span>
                  <span>Hol állt meg</span>
                  <span>Amit eddig kitöltött</span>
                  <span>Utolsó mentés</span>
                  <span>Emlékeztető</span>
                </div>
                {briefDrafts.map((draft) => {
                  const stepCount = draft.step_count || briefSteps.length;
                  const percent = briefDraftProgress(draft.step, stepCount);
                  const stepLabel = briefSteps[Math.min(Math.max(draft.step, 0), briefSteps.length - 1)] ?? "Alapok";
                  const answers = draft.data ?? {};
                  const filled: Array<[string, string]> = [
                    ["Cél", answers.goals ?? ""],
                    ["Célközönség", answers.audience ?? ""],
                    ["Oldalak", answers.pages ?? ""],
                    ["Funkciók", answers.features ?? ""],
                    ["Bemutatkozás", answers.contentBrief ?? ""]
                  ].filter((pair): pair is [string, string] => Boolean(pair[1]?.trim()));

                  return (
                    <article className="lead-row" key={draft.user_id}>
                      <div>
                        <strong className="admin-user-name">{draft.full_name || "Névtelen"}</strong>
                        <p className="admin-user-email">
                          <a href={`mailto:${draft.email}`}>{draft.email}</a>
                        </p>
                        <p className="admin-user-meta">
                          {draft.company || "Nincs megadva márkanév"}
                        </p>
                      </div>
                      <div>
                        <strong className="admin-user-strong">{stepLabel}</strong>
                        <p className="admin-user-meta">
                          {draft.step + 1}. lépés a(z) {stepCount}-ből · {percent}%
                        </p>
                        <p className="admin-user-meta">
                          {draft.commercial_model === "subscription"
                            ? `Bérlés · ${subscriptionPlan(draft.subscription_plan).name}`
                            : "Egyedi projekt"}
                        </p>
                      </div>
                      <div>
                        {filled.length === 0 ? (
                          <span className="admin-user-meta">Még csak az alapoknál járt.</span>
                        ) : (
                          filled.map(([label, value]) => (
                            <p className="admin-user-meta" key={label}>
                              <b>{label}:</b> {value.length > 120 ? `${value.slice(0, 120)}…` : value}
                            </p>
                          ))
                        )}
                      </div>
                      <div>
                        <span className="status-pill">{formatDate(draft.updated_at)}</span>
                      </div>
                      <div>
                        {draft.reminder_sent_at ? (
                          <span className="admin-user-meta">Kiment: {formatDate(draft.reminder_sent_at)}</span>
                        ) : (
                          <span className="admin-user-meta">Még nem ment ki</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          FÜL 6: FELHASZNÁLÓK
      ════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "users" && (
        <div className="admin-tab-pane">
          <div className="admin-card-dark">
            <div className="admin-card-dark-header">
              <div>
                <strong>Regisztrált felhasználók</strong>
                <span className="admin-card-dark-sub">
                  {adminUsers.length} fiók. A legutóbb mozgó felhasználó van elöl — aki régen járt itt, alulra kerül.
                </span>
              </div>
              <button className="admin-btn-secondary" onClick={() => void loadAdminUsers()} type="button" disabled={usersLoading}>
                {usersLoading ? "Frissítés..." : "Frissítés"}
              </button>
            </div>

            <div className="admin-users-toolbar">
              <input
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Keresés név vagy email szerint…"
                type="search"
                value={userSearch}
              />
            </div>

            {usersError ? (
              <p className="admin-inline-error" role="alert">{usersError}</p>
            ) : null}

            {usersLoading && adminUsers.length === 0 ? (
              <div className="admin-empty-note"><strong>Betöltés...</strong></div>
            ) : adminUsers.length === 0 ? (
              <div className="admin-empty-note">Nincs megjeleníthető felhasználó.</div>
            ) : (
              <div className="lead-table">
                <div className="lead-row header">
                  <span>Felhasználó</span>
                  <span>Utoljára fent</span>
                  <span>Mit csinált</span>
                  <span>Aktivitás</span>
                  <span>Állapot</span>
                </div>
                {adminUsers
                  .filter((account) => {
                    const needle = userSearch.trim().toLowerCase();
                    if (!needle) return true;
                    return `${account.fullName ?? ""} ${account.email}`.toLowerCase().includes(needle);
                  })
                  .map((account) => (
                    <article className="lead-row" key={account.id}>
                      <div>
                        <strong className="admin-user-name">{account.fullName || "Névtelen"}</strong>
                        <p className="admin-user-email">
                          <a href={`mailto:${account.email}`}>{account.email}</a>
                        </p>
                        <p className="admin-user-meta">
                          Regisztrált: {formatDate(account.registeredAt)}
                          {account.providers.includes("google") ? " · Google-belépés" : ""}
                        </p>
                      </div>
                      <div>
                        <strong
                          className="admin-user-strong"
                          title={account.lastSignInAt ? formatDateTime(account.lastSignInAt) : "Még sosem lépett be"}
                        >
                          {relativeTime(account.lastSignInAt)}
                        </strong>
                        <p className="admin-user-meta">
                          {account.lastSignInAt ? formatDateTime(account.lastSignInAt) : "Nincs belépés"}
                        </p>
                      </div>
                      <div>
                        <strong className="admin-user-strong">{account.lastActivityLabel ?? "Még semmit"}</strong>
                        <p className="admin-user-meta">
                          {account.lastActivityAt ? relativeTime(account.lastActivityAt) : "—"}
                        </p>
                        {account.draft ? (
                          <p className="admin-user-meta warn">
                            Félbehagyott adatlap: {briefDraftProgress(account.draft.step, account.draft.stepCount)}%
                            {account.draft.reminderSentAt ? " · emlékeztetve" : " · nincs emlékeztetve"}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <p className="admin-user-meta">
                          {account.projectCount} projekt{account.activeProjectCount ? ` (${account.activeProjectCount} aktív)` : ""}
                        </p>
                        <p className="admin-user-meta">
                          {account.ticketCount} ticket{account.openTicketCount ? ` (${account.openTicketCount} nyitott)` : ""}
                        </p>
                        <p className="admin-user-meta">{account.changeRequestCount} módosítási kérés</p>
                      </div>
                      <div>
                        {account.monthlyRevenue > 0 ? (
                          <span className="status-pill live">{formatHuf(account.monthlyRevenue)} / hó</span>
                        ) : account.projectCount > 0 ? (
                          <span className="status-pill">Nincs aktív előfizetés</span>
                        ) : (
                          <span className="status-pill">Csak fiók</span>
                        )}
                        {!account.emailConfirmedAt ? (
                          <p className="admin-user-meta warn">Email nincs megerősítve</p>
                        ) : null}
                      </div>
                    </article>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "leads" && (
        <div className="admin-tab-pane">
          <div className="admin-card-dark">
            <div className="admin-card-dark-header">
              <div>
                <strong>Korábbi érdeklődések (CRM Leadek)</strong>
                <span style={{ display: "block", color: "var(--adm-ink-50)", fontSize: "12.5px", marginTop: "2px" }}>
                  {stats.total} lead összesen, ebből {stats.fresh} új és {stats.won} nyert.
                </span>
              </div>
            </div>

            <div className="lead-table">
              <div className="lead-row header">
                <span>Érdeklődő</span>
                <span>Projekt</span>
                <span>Büdzsé</span>
                <span>Státusz</span>
                <span>Jegyzet</span>
              </div>
              {loading ? (
                <div style={{ padding: "30px", textAlign: "center" }}>
                  <strong>Betöltés...</strong>
                </div>
              ) : leads.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--adm-ink-40)" }}>
                  Nincs korábbi érdeklődés rögzítve.
                </div>
              ) : (
                leads.map((lead) => (
                  <article className="lead-row" key={lead.id}>
                    <div>
                      <strong style={{ fontSize: "14px", color: "var(--adm-text)" }}>{lead.name}</strong>
                      <p style={{ margin: "2px 0 0", color: "var(--adm-accent-text)", fontSize: "12.5px" }}>{lead.email}</p>
                      <p style={{ margin: "2px 0 0", color: "var(--adm-ink-40)", fontSize: "12px" }}>{lead.phone || lead.company || "Nincs extra adat"}</p>
                    </div>
                    <div>
                      <strong style={{ fontSize: "13.5px", color: "var(--adm-text)" }}>{lead.project_type}</strong>
                      <p style={{ margin: "2px 0 0", color: "var(--adm-ink-60)", fontSize: "12px", lineHeight: 1.35 }}>{lead.goals}</p>
                    </div>
                    <div>
                      <span className="status-pill">{lead.budget || "nincs megadva"}</span>
                    </div>
                    <div>
                      <select
                        value={lead.status}
                        onChange={(event) => updateLead(lead.id, { status: event.target.value })}
                        style={{ width: "100%" }}
                      >
                        {statuses.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <textarea
                        defaultValue={lead.notes ?? ""}
                        onBlur={(event) => updateLead(lead.id, { notes: event.target.value })}
                        placeholder="Következő lépés, hívás dátuma..."
                        style={{ minHeight: "60px", width: "100%" }}
                      />
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
