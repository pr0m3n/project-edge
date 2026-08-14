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
import { AssetLink, AssetImage } from "@/components/portal/AssetLink";
import { DEFAULT_HANDOVER_SERVICES, buildHandoverPlan } from "@/lib/handover";
import { PARKING_MONTHLY_PRICE, consumesChangeQuota, formatHuf, isWebsitePurchaseRequest, quotaPeriodKey, subscriptionPlan } from "@/lib/subscriptions";
// Ugyanaz a formázás, mint az ügyfélkapun — korábban mindkét komponens
// saját másolatot tartott ezekből, és külön-külön csúszhattak el.
import { parseBrief, splitLines, transferReference, formatPrice as formatPriceWithFallback } from "@/components/portal/format";
import { paletteByName } from "@/components/portal/brief-fields";
import type {
  BillingoIssue,
  ChangeRequest,
  ClientProject,
  ClientTicket,
  Lead,
  Ticket,
  TicketMessage
} from "@/components/admin/types";

function formatPrice(value: number | null, currency = "Ft") {
  return formatPriceWithFallback(value, currency, "Nincs ár megadva");
}

function messageKind(text: string): ToastKind {
  if (/nem sikerült|hiba|sikertelen|nem lehet/i.test(text)) {
    return "error";
  }
  if (/mentve|elküldve|törölve|jóváhagyva|elutasítva|kész|rögzítve/i.test(text)) {
    return "success";
  }
  return "info";
}

const TICKET_STALE_MS = 48 * 60 * 60 * 1000;


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
  const [billingoIssues, setBillingoIssues] = useState<BillingoIssue[]>([]);
  const [billingoRetryId, setBillingoRetryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [paymentTestLoading, setPaymentTestLoading] = useState(false);

  // Upgraded flow states
  const [changeLogs, setChangeLogs] = useState<Record<string, any[]>>({});
  const [newMilestoneTitle, setNewMilestoneTitle] = useState<Record<string, string>>({});

  // Phase 2 state variables
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchive, setShowArchive] = useState(false);
  const [wizardProjectId, setWizardProjectId] = useState<string | null>(null);
  const [showClosedTickets, setShowClosedTickets] = useState(false);

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

  const filteredTickets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return clientTickets.filter((t) => {
      if (selectedClientFilter !== "all" && t.user_id !== selectedClientFilter) return false;
      if (!query) return true;
      return [t.subject, t.contact_name, t.contact_email]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(query));
    });
  }, [clientTickets, selectedClientFilter, searchQuery]);

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

  const stats = useMemo(() => {
    return {
      total: leads.length,
      fresh: leads.filter((lead) => lead.status === "new").length,
      won: leads.filter((lead) => lead.status === "won").length,
      tickets: tickets.filter((ticket) => ticket.status === "open").length + clientTickets.filter((ticket) => ticket.status === "open").length
    };
  }, [leads, tickets, clientTickets]);

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

  function mergeClientProject(payload: { eventType: string; new: any; old: any }) {
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

  function mergeClientTicket(payload: { eventType: string; new: any; old: any }) {
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

  function mergeNotification(payload: { eventType: string; new: any; old: any }) {
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
      window.location.href = "/admin";
      return;
    }

    const { data: adminCheck, error: adminCheckError } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", sessionData.session.user.id)
      .maybeSingle();

    if (adminCheckError || !adminCheck) {
      await supabase.auth.signOut();
      window.location.href = "/admin?error=unauthorized";
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

    const { data: logsData } = await supabase
      .from("project_change_logs")
      .select("*")
      .order("changed_at", { ascending: false });

    const groupedLogs = (logsData ?? []).reduce<Record<string, any[]>>((groups, item) => {
      groups[item.project_id] = [...(groups[item.project_id] ?? []), item];
      return groups;
    }, {});

    setLeads(data ?? []);
    setTickets(ticketData ?? []);
    setTicketMessages(groupedMessages);
    setClientProjects(clientProjectError ? [] : clientProjectData ?? []);
    setClientTickets(clientTicketError ? [] : clientTicketData ?? []);
    setClientTicketMessages(groupedClientMessages);
    setChangeLogs(groupedLogs);
    setNotifications(notificationData ?? []);
    setChangeRequests(changeRequestData ?? []);

    // Kiszámlázatlan befizetések: a pénz beérkezett, a Billingo-számla viszont
    // nem készült el. Ezek eddig csendben ültek az adatbázisban.
    const { data: billingoData } = await supabase
      .from("subscription_payments")
      .select("id,project_id,amount,paid_at,stripe_invoice_id,billingo_error")
      .is("billingo_document_id", null)
      .eq("status", "paid")
      .order("paid_at", { ascending: false });
    setBillingoIssues((billingoData ?? []) as BillingoIssue[]);

    setLoading(false);
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

  async function completeWebsitePurchase(request: ChangeRequest, project: ClientProject) {
    if (!request.transfer_reported_at) {
      setMessage("Az ügyfél még nem jelezte az átutalást.");
      return;
    }
    const ok = await confirm({
      title: "Vételár jóváhagyása",
      message: "Csak akkor hagyd jóvá, ha a vételár ténylegesen megérkezett a bankszámlára. Ezzel megszűnik az előfizetés és elindul a technikai átadás.",
      confirmLabel: "Beérkezett, átadás indítása",
      cancelLabel: "Mégse"
    });
    if (!ok) return;

    // ELŐBB a Stripe: az ügyfél kifizette a teljes vételárat, onnantól egyetlen
    // további havidíj sem terhelhető rá. Ha ez nem megy át, a vásárlást sem
    // zárjuk le — inkább maradjon nyitva, mint hogy tovább fizessen.
    if (!(await stripeSubscriptionAction(project, "cancel_now"))) {
      setMessage("A Stripe-előfizetést nem sikerült megszüntetni, ezért a vásárlást nem zártam le. Próbáld újra.");
      return;
    }

    const handover = buildHandoverPlan(["vercel", "github", "dns"]);
    const { error } = await supabase.rpc("complete_website_purchase", {
      request_id: request.id,
      handover
    });
    if (error) {
      setMessage(`A vásárlás lezárása nem sikerült: ${error.message}`);
      return;
    }
    await triggerNotification(
      project.user_id,
      project.contact_email,
      "A weboldal vételára beérkezett",
      `A(z) "${project.title}" weboldal vételárát jóváhagytuk. Az előfizetés lezárult, a technikai átadási lista megnyílt az ügyfélkapuban.`,
      "/ugyfelkapu/dashboard#statuses"
    );
    setMessage("Vételár jóváhagyva, a technikai átadás elindult.");
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

    addTicketMessage(result.message);
    setTicketReplies((current) => ({ ...current, [ticketId]: "" }));
    setTickets((current) =>
      current.map((ticket) => (ticket.id === ticketId ? { ...ticket, status: "answered" } : ticket))
    );
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

    if (ticket) {
      await triggerNotification(
        ticket.user_id,
        ticket.contact_email,
        "Új üzeneted érkezett",
        `ProjectEdge válaszolt a(z) "${ticket.subject}" beszélgetésben:\n\n${body.slice(0, 500)}`,
        `/ugyfelkapu/dashboard#support:${ticketId}`
      );
    }

    addClientTicketMessage(data);
    setClientTicketReplies((current) => ({ ...current, [ticketId]: "" }));
    setClientTickets((current) =>
      current.map((ticket) => (ticket.id === ticketId ? { ...ticket, status: "answered" } : ticket))
    );
    setMessage("Ügyfélkapus válasz elküldve.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/admin";
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
        (payload) => mergeClientProject(payload as any)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_tickets"
        },
        (payload) => mergeClientTicket(payload as any)
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
        (payload) => mergeNotification(payload as any)
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
    const warrantyActive = warrantyUntil ? warrantyUntil.getTime() > Date.now() : false;
    if (project.commercial_model === "subscription" && project.subscription_status === "cancelled") {
      return (
        <article className="admin-project-card compact-closed" key={project.id} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", padding: "16px 20px", borderRadius: "20px", display: "grid", gap: "10px" }}>
          <div><strong style={{ color: "#fff" }}>{project.title}</strong><span style={{ marginLeft: 10, color: "#ff9d9d" }}>Előfizetés lezárva</span></div>
          <p style={{ color: "rgba(255,255,255,.58)", margin: 0 }}>Ez lemondott menedzselt szolgáltatás, nem elkészült és átadott projekt. Nem tartozik hozzá projektlezárási értékelés vagy 30 napos technikai garancia.</p>
          <small style={{ color: "rgba(255,255,255,.4)" }}>Leállítás dátuma: {project.cancel_effective_at ? new Date(project.cancel_effective_at).toLocaleDateString("hu-HU") : "nincs rögzítve"}</small>
        </article>
      );
    }
    const completedPurchase = project.commercial_model === "purchase" && Boolean(project.warranty_started_at || project.final_payment_paid_at || project.final_payment_paid);
    if (!completedPurchase) {
      return (
        <article className="admin-project-card compact-closed" key={project.id} style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.06)", padding: "16px 20px", borderRadius: "20px", display: "grid", gap: "10px" }}>
          <div><strong style={{ color: "#fff" }}>{project.title}</strong><span style={{ marginLeft: 10, color: "rgba(255,255,255,.5)" }}>{project.offer_status === "declined" ? "Ajánlat elutasítva" : "Teljesítés nélkül lezárva"}</span></div>
          <p style={{ color: "rgba(255,255,255,.58)", margin: 0 }}>Nem történt kész weboldal-átadás, ezért ehhez az ügyhöz nem tartozik projektértékelés vagy 30 napos technikai garancia.</p>
          <button className="admin-delete-project" type="button" onClick={() => approveDeletion(project)}>Projekt végleges törlése</button>
        </article>
      );
    }
    return (
      <article className="admin-project-card compact-closed" key={project.id} style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        padding: "16px 20px",
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <strong style={{ fontSize: "16px", color: "#fff" }}>{project.title}</strong>
              <span style={{
                background: "rgba(118, 171, 174, 0.15)",
                color: "#76ABAE",
                padding: "2px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "bold"
              }}>
                Lezárva
              </span>
            </div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
              Típus: <strong>{project.project_type}</strong> · Cégnév: <strong>{project.company || "Nincs cégnév"}</strong>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", fontSize: "13px" }}>
            <strong>{project.contact_name || "Ügyfél"}</strong>
            {project.contact_email ? <a href={`mailto:${project.contact_email}`} style={{ color: "#76ABAE", fontSize: "12px" }}>{project.contact_email}</a> : null}
            <button className="admin-delete-project" type="button" onClick={() => approveDeletion(project)}>
              Projekt végleges törlése
            </button>
          </div>
        </div>

        {rating ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "10px" }}>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)" }}>Ügyfél értékelése:</span>
            <div style={{ color: "#FF9800", fontSize: "16px", letterSpacing: "2px" }}>{"★".repeat(rating)}</div>
            {review && (
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>
                - "{review}"
              </span>
            )}
          </div>
        ) : (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "10px", fontSize: "13px", color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
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
        detail: managed ? "A választott havi csomag rögzítve van. A szolgáltatási szerződés elfogadása után az első havidíj következik." : "Az ügyfél elfogadta az ajánlatot. A szerződés aláírására vársz — amint aláírta, a foglaló (előleg) befizetése következik."
      },
      deposit_pending: {
        who: project.deposit_transfer_reported ? "admin" : "client",
        headline: project.deposit_transfer_reported ? `Ellenőrizd ${managed ? "az első havidíj" : "a foglaló"} beérkezését` : `${managed ? "Első havidíj" : "Foglaló"} utalására vár`,
        detail: project.deposit_transfer_reported
          ? "Az ügyfél jelezte az utalást. Ellenőrizd a bankszámlát, és csak akkor indítsd a fejlesztést, ha az összeg megérkezett."
          : `Az ügyfélnek kell elutalnia és jeleznie ${managed ? "az első havidíjat" : "a foglalót"}. Addig nincs teendőd.`,
        actions: project.deposit_transfer_reported ? [{ label: `${managed ? "Első havidíj" : "Foglaló"} megérkezett — fejlesztés indítása`, onClick: () => wizardNext(project) }] : undefined
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
          padding: "18px 20px",
          margin: "0 0 4px",
          background: isAdmin ? "rgba(118,171,174,0.16)" : "rgba(48,56,65,0.05)",
          border: isAdmin ? "1px solid rgba(118,171,174,0.5)" : "1px solid var(--line)"
        }}
      >
        <span style={{
          display: "inline-block",
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          padding: "3px 10px",
          borderRadius: "999px",
          marginBottom: "8px",
          background: isAdmin ? "#76ABAE" : "rgba(48,56,65,0.1)",
          color: isAdmin ? "#0E1116" : "var(--muted)"
        }}>
          {isAdmin ? (guide.step ? `${guide.step} · Rajtad a sor` : "Rajtad a sor") : "⏳ Ügyfélre vár"}
        </span>
        <strong style={{ display: "block", fontSize: "17px", color: "var(--ink)", marginBottom: "4px" }}>{guide.headline}</strong>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>{guide.detail}</p>
        {isAdmin && guide.actions?.length ? (
          <div className="admin-guide-actions">
            {guide.actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={`button ${action.variant === "secondary" ? "secondary" : "primary"}`}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <p className="section-kicker">ProjectEdge CRM</p>
          <h1 style={{ fontSize: 56, lineHeight: 1 }}>Admin központ</h1>
          <p className="section-copy" style={{ color: "rgba(245,245,245,.72)" }}>
            {stats.total} lead összesen, {stats.fresh} új, {stats.won} nyert, {stats.tickets} nyitott ticket.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            className="button ghost"
            disabled={paymentTestLoading}
            onClick={startPaymentSmokeTest}
            style={{ color: "#f5f5f5", borderColor: "rgba(245,245,245,.24)" }}
            title="Csak Stripe sandbox környezetben érhető el"
            type="button"
          >
            {paymentTestLoading ? "Indítás…" : "200 Ft sandbox teszt"}
          </button>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "50%",
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
                transition: "all 0.2s ease",
                color: "#fff"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              type="button"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {notifications.filter((n) => !n.read).length > 0 && (
                <span style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-2px",
                  backgroundColor: "#76ABAE",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%"
                }} />
              )}
            </button>
            
            {showNotificationsDropdown && (
              <div style={{
                position: "absolute",
                top: "52px",
                right: 0,
                width: "360px",
                background: "#1C1E22",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "16px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                zIndex: 1000,
                padding: "16px",
                display: "grid",
                gap: "12px",
                maxHeight: "400px",
                overflowY: "auto"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "8px" }}>
                  <strong style={{ color: "#fff", fontSize: "15px" }}>Értesítések ({notifications.filter((n) => !n.read).length})</strong>
                  {notifications.some((n) => !n.read) && (
                    <button
                      onClick={async () => {
                        await supabase.from("notifications").update({ read: true }).is("user_id", null);
                        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                      }}
                      style={{ background: "none", border: "none", color: "#76ABAE", fontSize: "12px", cursor: "pointer", fontWeight: "bold" }}
                      type="button"
                    >
                      Mind olvasott
                    </button>
                  )}
                </div>
                
                {notifications.length === 0 ? (
                  <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "20px 0" }}>Nincsenek értesítések.</p>
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
                          background: n.read ? "transparent" : "rgba(118, 171, 174, 0.05)",
                          border: n.read ? "1px solid transparent" : "1px solid rgba(118, 171, 174, 0.15)",
                          padding: "10px",
                          borderRadius: "10px",
                          cursor: "pointer",
                          fontSize: "13px",
                          display: "grid",
                          gap: "2px"
                        }}
                      >
                        <span style={{ color: n.read ? "#fff" : "#76ABAE", fontWeight: "bold" }}>{n.title}</span>
                        <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", fontSize: "12px" }}>{n.message}</p>
                        <small style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px", marginTop: "4px" }}>{new Date(n.created_at).toLocaleString("hu-HU")}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button className="button ghost" onClick={signOut} style={{ color: "#f5f5f5", borderColor: "rgba(245,245,245,.24)" }}>
            Kilépés
          </button>
        </div>
      </header>

      <OfflineBanner online={online} />
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {confirmModal}

      <h2 className="admin-section-title">Korábbi érdeklődések</h2>
      <div className="lead-table">
        <div className="lead-row header">
          <span>Érdeklődő</span>
          <span>Projekt</span>
          <span>Büdzsé</span>
          <span>Státusz</span>
          <span>Jegyzet</span>
        </div>
        {loading ? (
          <div className="lead-row">
            <strong>Betöltés...</strong>
          </div>
        ) : leads.length === 0 ? (
          <div className="lead-row">
            <strong>Nincs korábbi érdeklődés.</strong>
            <span>Az új projektek már az ügyfélkapun keresztül érkeznek.</span>
          </div>
        ) : (
          leads.map((lead) => (
            <article className="lead-row" key={lead.id}>
              <div>
                <strong>{lead.name}</strong>
                <p>{lead.email}</p>
                <p>{lead.phone || lead.company || "Nincs extra adat"}</p>
              </div>
              <div>
                <strong>{lead.project_type}</strong>
                <p>{lead.goals}</p>
              </div>
              <div>
                <span className="status-pill">{lead.budget || "nincs megadva"}</span>
              </div>
              <div>
                <select
                  value={lead.status}
                  onChange={(event) => updateLead(lead.id, { status: event.target.value })}
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
                  placeholder="Következő lépés, ajánlat, hívás dátuma..."
                  style={{ minHeight: 92 }}
                />
              </div>
            </article>
          ))
        )}
      </div>

      <h2 className="admin-section-title">Ügyfélszolgálati ticketek</h2>
      <div className="ticket-inbox">
        {loading ? (
          <div className="ticket-card">
            <strong>Betöltés...</strong>
          </div>
        ) : tickets.length === 0 ? (
          <div className="ticket-card">
            <strong>Még nincs ticket.</strong>
            <span>Az alsó jobb oldali widgetből érkező kérdések itt jelennek meg.</span>
          </div>
        ) : (
          tickets.map((ticket) => (
            <article className="ticket-card" key={ticket.id}>
              <div className="ticket-person">
                <span className="status-pill">{ticket.status}</span>
                <strong>{ticket.name}</strong>
                <a href={`mailto:${ticket.email}`}>{ticket.email}</a>
                {ticket.rating ? (
                  <div className="ticket-rating">
                    <span>{"★".repeat(ticket.rating)}</span>
                    {ticket.rating_comment ? <p>{ticket.rating_comment}</p> : null}
                  </div>
                ) : null}
              </div>
              <div className="ticket-conversation">
                <div className="admin-chat-thread">
                  {(ticketMessages[ticket.id] ?? []).map((item) => (
                    <div className={`admin-chat-message ${item.sender}`} key={item.id}>
                      <span>{item.sender === "admin" ? "Te" : ticket.name}</span>
                      <p>{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ticket-actions">
                <select
                  value={ticket.status}
                  onChange={(event) => updateTicket(ticket.id, { status: event.target.value })}
                >
                  {ticketStatuses.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <textarea
                  value={ticketReplies[ticket.id] ?? ""}
                  onChange={(event) =>
                    setTicketReplies((current) => ({ ...current, [ticket.id]: event.target.value }))
                  }
                  disabled={ticket.status === "closed"}
                  placeholder={ticket.status === "closed" ? "Ez a ticket lezárva." : "Írd ide a válaszod, majd küldd el..."}
                  style={{ minHeight: 110 }}
                />
                <button
                  className="button primary admin-reply-button"
                  onClick={() => sendTicketReply(ticket.id)}
                  type="button"
                  disabled={ticket.status === "closed" || !ticketReplies[ticket.id]?.trim()}
                >
                  Válasz küldése
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.05)",
        borderRadius: "20px",
        padding: "20px",
        margin: "24px 0",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "16px"
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "18px", color: "#fff" }}>Keresés és szűrés</h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Keress projekt címre, névre, emailre, vagy szűrj egy adott ügyfélre.</p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Keresés…"
              style={{
                minWidth: "240px",
                padding: "10px 36px 10px 14px",
                borderRadius: "12px",
                background: "#25282F",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                fontSize: "14px",
                outline: "none"
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Keresés törlése"
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "16px" }}
              >
                ×
              </button>
            )}
          </div>
          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
            style={{
              minWidth: "220px",
              padding: "10px 14px",
              borderRadius: "12px",
              background: "#25282F",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "bold",
              outline: "none"
            }}
          >
            <option value="all">Minden ügyfél ({uniqueClients.length})</option>
            {uniqueClients.map((c) => (
              <option key={c.userId} value={c.userId}>{c.name} ({c.email})</option>
            ))}
          </select>
        </div>
      </div>

      <section className="managed-admin-summary">
        <div><span>MENEDZSELT OLDALAK</span><strong>{clientProjects.filter((project) => project.commercial_model === "subscription" && project.subscription_status !== "cancelled").length}</strong><small>aktív vagy készülő szolgáltatás</small></div>
        <div><span>HAVI ÁLLOMÁNY</span><strong>{formatHuf(clientProjects.filter((project) => project.commercial_model === "subscription" && project.subscription_status === "active").reduce((sum, project) => sum + (project.monthly_price ?? 0), 0))}</strong><small>jelenlegi aktív havidíj</small></div>
        <div><span>TEENDŐ</span><strong>{clientProjects.filter((project) => ["pause_requested", "resume_requested", "cancel_requested"].includes(project.subscription_status ?? "")).length}</strong><small>előfizetési kérelem</small></div>
      </section>

      <BillingoIssuesCard
        issues={billingoIssues}
        projects={clientProjects}
        retryingId={billingoRetryId}
        onRetry={retryBillingoInvoice}
      />

      <h2 className="admin-section-title">Ügyfélkapus projektek</h2>

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
                <span className="admin-project-tab-phase">{project.commercial_model === "subscription" ? `${subscriptionPlan(project.subscription_plan).name} · ` : ""}{projectStatusLabel[project.status] ?? project.status}</span>
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
          <div className="ticket-card">
            <strong>{searchQuery ? "Nincs találat a keresésre." : "Nincs aktív ügyfélkapus projekt."}</strong>
            <span>{searchQuery ? "Próbálj más kulcsszót, vagy töröld a keresést." : "A regisztrált ügyfelek projektindításai itt jelennek meg. A lezárt projektek az Archív szekcióban vannak."}</span>
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

            // Anyagok és hozzáférések — az 5. brief lépésből
            const assetFields = [
              ["Domain", brief["Domain"]],
              ["Vágyott domainek", brief["Vágyott domainek"]],
              ["Jelenlegi rendszer", brief["Jelenlegi rendszer"]],
              ["Logó", brief["Logó"]],
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
            const showPrepare = s === "request_received" || s === "planning";
            const showOffer = s === "request_received" || s === "planning";
            const showBuild = s === "in_progress" || (s === "review" && project.review_approved);
            // Az összetevők kijelölése már a brief átolvasása után elérhető: ez
            // dönti el, milyen útmutatókat és átadási lépéseket kap az ügyfél.
            // Lezárt / törlésre váró projektnél már nincs értelme.
            const showHandover = project.commercial_model !== "subscription" && s !== "closed" && s !== "deletion_pending";

            return (
            <article className="admin-project-card" key={project.id} style={{ border: project.delete_requested ? '2px solid #DC3545' : '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
              {project.delete_requested && (
                <div style={{ background: '#721C24', border: '1px solid #F5C6CB', color: '#F8D7DA', padding: '16px', borderRadius: '18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <strong style={{ display: 'block', fontSize: '15px' }}>ÜGYFÉL TÖRLÉSI KÉRELMET NYÚJTOTT BE!</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>Kérés ideje: {project.delete_requested_at ? new Date(project.delete_requested_at).toLocaleString('hu-HU') : 'nem ismert'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="button primary" style={{ background: '#DC3545', borderColor: '#DC3545', minHeight: 'auto', padding: '8px 14px' }} onClick={() => approveDeletion(project)}>Törlés jóváhagyása</button>
                    <button className="button secondary" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', minHeight: 'auto', padding: '8px 14px' }} onClick={() => rejectDeletion(project)}>Elutasítás</button>
                  </div>
                </div>
              )}

              <header className="admin-project-top">
                <div>
                  <span className="status-pill">{projectStatusLabel[project.status] ?? project.status}</span>
                  <h3>{project.title}</h3>
                  <p>{brief["Cél"] || project.goals}</p>
                  {project.last_modified_at && (
                    <small style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginTop: '6px', fontStyle: 'italic' }}>
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

              {renderProjectGuide(project)}

              {project.commercial_model === "subscription" ? (
                <section className="managed-admin-card">
                  <header><div><span>MENEDZSELT SZOLGÁLTATÁS</span><h4>{subscriptionPlan(project.subscription_plan).name} · {project.stripe_parked_at ? `${formatHuf(PARKING_MONTHLY_PRICE)}/hó (parkolás)` : `${formatHuf(project.monthly_price ?? subscriptionPlan(project.subscription_plan).price)}/hó`}</h4>{project.stripe_subscription_id ? <a className="stripe-deep-link" href={`https://dashboard.stripe.com/subscriptions/${project.stripe_subscription_id}`} target="_blank" rel="noreferrer">Megnyitás a Stripe-ban ↗</a> : <small>Nincs Stripe-előfizetés</small>}</div><b className={`subscription-state ${project.subscription_status === "paused" ? "paused" : ""}`}>{project.subscription_status === "active" ? "● Aktív" : project.subscription_status ?? "Előkészítés"}</b></header>
                  <div className="managed-admin-fields">
                    <label><span>Kezelt domain</span><input defaultValue={project.managed_domain_name ?? ""} onBlur={(event) => updateClientProject(project.id, { managed_domain_name: event.target.value || null, domain_status: event.target.value ? "active" : "searching" })} placeholder="pelda.hu" /></label>
                    <label><span>Következő havidíj</span><input type="date" defaultValue={project.next_billing_at?.slice(0, 10) ?? ""} onBlur={(event) => updateClientProject(project.id, { next_billing_at: event.target.value ? new Date(`${event.target.value}T12:00:00`).toISOString() : null })} /></label>
                    <label><span>Domain megújítás</span><input type="date" defaultValue={project.domain_renewal_at?.slice(0, 10) ?? ""} onBlur={(event) => updateClientProject(project.id, { domain_renewal_at: event.target.value ? new Date(`${event.target.value}T12:00:00`).toISOString() : null })} /></label>
                    <label><span>Oldal állapota</span><select value={project.site_health_status ?? "unknown"} onChange={(event) => updateClientProject(project.id, { site_health_status: event.target.value, last_health_check_at: new Date().toISOString() })}><option value="unknown">Még nincs ellenőrizve</option><option value="healthy">Rendben</option><option value="attention">Figyelmet kér</option><option value="offline">Leállítva</option></select></label>
                  </div>
                  {["pause_requested", "resume_requested", "cancel_requested"].includes(project.subscription_status ?? "") ? <div className="managed-admin-request"><div><strong>Ügyfélkérelem: {project.subscription_status === "pause_requested" ? "szüneteltetés" : project.subscription_status === "resume_requested" ? "újraaktiválás" : "lemondás"}</strong><p>A kérelmet az ügyfélkapuból küldték. Az állapot módosítása után az ügyfél azonnal az új státuszt látja.</p></div><div>{project.subscription_status === "pause_requested" ? <button className="button secondary" type="button" onClick={() => approveSubscriptionPause(project)}>Szüneteltetés jóváhagyása</button> : null}{project.subscription_status === "resume_requested" ? <button className="button primary" type="button" onClick={() => approveSubscriptionResume(project)}>Újraaktiválás</button> : null}{project.subscription_status === "cancel_requested" ? <button className="button secondary" type="button" onClick={() => finishSubscriptionCancellation(project)}>Lemondás lezárása</button> : null}</div></div> : null}
                  {changeRequests.some((request) => request.project_id === project.id) ? (
                    <div className="managed-request-list">
                      <div className="managed-request-list-head">
                        <strong>Módosítások és vásárlási ügyek</strong>
                        {(() => {
                          // A keret az ügyfélnél is ugyanígy számolódik — itt azért
                          // látszik, hogy a „benne van a csomagban?" döntés előtt
                          // tudd, hol tart az adott időszak.
                          const plan = subscriptionPlan(project.subscription_plan);
                          const period = quotaPeriodKey(project.billing_cycle_started_at ?? project.created_at, plan.changeQuota);
                          const used = changeRequests.filter((request) =>
                            request.project_id === project.id
                            && (request.period_key ?? period) === period
                            && consumesChangeQuota(request)
                          ).length;
                          return (
                            <span className={used > plan.changeQuota.count ? "quota-badge over" : "quota-badge"}>
                              Keret: {used}/{plan.changeQuota.count} · {changeRequests.filter((request) => request.project_id === project.id && !["completed", "declined"].includes(request.status)).length} nyitott
                            </span>
                          );
                        })()}
                      </div>
                      {changeRequests.filter((request) => request.project_id === project.id).map((request) => {
                        const purchase = isWebsitePurchaseRequest(request.description);
                        return (
                          <article className={purchase ? "purchase-admin-request" : ""} key={request.id}>
                            <div>
                              <span>{purchase ? "WEBOLDAL MEGVÁSÁRLÁSA" : request.category === "content" ? "Tartalom" : request.category === "design" ? "Design" : request.category === "technical" ? "Technikai" : "Új funkció"} · {new Date(request.requested_at).toLocaleDateString("hu-HU")}</span>
                              <p>{purchase ? request.description.replace(/^\[WEBOLDAL_MEGVASARLAS\]\s*/, "") : request.description}</p>
                              {purchase ? <small>Folyamat: átadási összefoglaló → fizetési adatok → fizetés ellenőrzése → forráskód és hozzáférések átadása → előfizetés lezárása.</small> : null}
                            </div>
                            <div>
                              {!purchase && request.category !== "technical" ? <select value={request.included_in_plan === null ? "unknown" : request.included_in_plan ? "included" : "extra"} onChange={(event) => updateChangeRequest(request.id, { included_in_plan: event.target.value === "unknown" ? null : event.target.value === "included" })}><option value="unknown">Keret eldöntése</option><option value="included">Csomagban benne van</option><option value="extra">Külön ajánlat</option></select> : null}
                              {request.category === "technical" ? <small className="request-free-note">Technikai hiba — nem fogyaszt keretet, javítás a szolgáltatás része.</small> : null}
                              <select value={request.status} onChange={(event) => updateChangeRequest(request.id, { status: event.target.value as ChangeRequest["status"] })}><option value="new">Igény beérkezett</option><option value="planned">Átadás előkészítése</option><option value="in_progress">Folyamatban</option><option value="waiting_client">Ügyfél fizetésére / válaszára vár</option><option value="completed" disabled={purchase}>Lezárva{purchase ? " — csak fizetésigazolással" : ""}</option><option value="declined">Nem folytatható</option></select>
                              <textarea defaultValue={request.admin_note ?? ""} onBlur={(event) => { if (event.target.value !== (request.admin_note ?? "")) updateChangeRequest(request.id, { admin_note: event.target.value || null }); }} placeholder={purchase ? "Ügyfélnek látható átadási vagy fizetési információ…" : "Ügyfélnek látható megjegyzés…"} />
                              {purchase && request.quoted_amount ? <small>Vételár: {formatHuf(request.quoted_amount)} · Közlemény: {request.payment_reference ?? "nincs"}</small> : null}
                              {purchase && request.transfer_reported_at && request.status === "in_progress" && !request.paid_at ? <button className="button primary" type="button" onClick={() => completeWebsitePurchase(request, project)}>Beérkezett — átadás indítása</button> : null}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <details className="admin-collapse">
                <summary>Adatlap és részletek megtekintése</summary>
                <div style={{ display: "grid", gap: "16px" }}>
              <div className="admin-project-facts">
                <div>
                  <span>{project.commercial_model === "subscription" ? "Csomag" : "Típus"}</span>
                  <strong>{project.commercial_model === "subscription" ? subscriptionPlan(project.subscription_plan).name : project.project_type}</strong>
                </div>
                <div>
                  <span>{project.commercial_model === "subscription" ? "Havidíj" : "Büdzsé"}</span>
                  <strong>{project.commercial_model === "subscription" ? `${formatHuf(project.monthly_price ?? subscriptionPlan(project.subscription_plan).price)}/hó` : project.budget || "Nincs megadva"}</strong>
                </div>
                <div>
                  <span>{project.commercial_model === "subscription" ? "Új weboldal" : "Weboldal"}</span>
                  {project.commercial_model === "subscription" ? <strong>{project.managed_domain_name || brief["Vágyott domainek"] || "Domain keresés alatt"}</strong> : project.website ? <a href={project.website}>{project.website}</a> : <strong>Nincs</strong>}
                </div>
                <div>
                  <span>Beküldve</span>
                  <strong>{formatDate(project.created_at)}</strong>
                </div>
              </div>

              <section className="admin-brief-visual">
                <div className="admin-brief-highlight">
                  <span>Vizuális irány</span>
                  <strong>{brief["Vizuális karakter"] || "Nincs megadva"}</strong>
                  <p>{brief["Stílus / hangulat"] || "Az ügyfél nem adott külön stílus megjegyzést."}</p>
                </div>
                <div className="admin-brief-palette">
                  <span>{brief["Színirány"] || "Színpaletta"}</span>
                  <div>
                    {palette.map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </div>
                </div>
                <div className="admin-brief-grid">
                  {briefFields.map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              {assetFields.length > 0 ? (
                <section className="admin-assets-block">
                  <span className="admin-assets-title">Anyagok és hozzáférések</span>
                  <div className="admin-brief-grid">
                    {assetFields.map(([label, value]) => (
                      <div key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <AiBuildPromptPanel
                onNotify={setMessage}
                project={{
                  title: project.title,
                  company: project.company,
                  website: project.website,
                  commercialModel: project.commercial_model,
                  subscriptionPlanKey: project.subscription_plan,
                  monthlyPrice: project.monthly_price,
                  managedDomain: project.managed_domain_name,
                  logoUrl: project.logo_url,
                  adminNotes: project.admin_notes,
                  contactName: project.contact_name,
                  contactEmail: project.contact_email,
                  brief: project.brief_data ?? null,
                  parsed: brief
                }}
              />

              {project.logo_url ? (
                <section className="admin-assets-block">
                  <span className="admin-assets-title">Feltöltött logó</span>
                  <div className="asset-preview-grid logo-asset-preview">
                    <AssetImage value={project.logo_url} alt={`${project.company || project.title} logó`} />
                  </div>
                </section>
              ) : null}

              {Array.isArray(project.brief_data?.photoUrls) && project.brief_data.photoUrls.length > 0 ? (
                <section className="admin-assets-block">
                  <span className="admin-assets-title">Ügyfél által feltöltött képek ({project.brief_data.photoUrls.length})</span>
                  <div className="asset-preview-grid">
                    {project.brief_data.photoUrls.map((url: string, index: number) => (
                      <AssetImage key={url} value={url} alt={`Ügyfélkép ${index + 1}`} />
                    ))}
                  </div>
                </section>
              ) : null}

              {Array.isArray(project.brief_data?.contentFileUrls) && project.brief_data.contentFileUrls.length > 0 ? (
                <section className="admin-assets-block">
                  <span className="admin-assets-title">Ügyfél által feltöltött szövegek ({project.brief_data.contentFileUrls.length})</span>
                  <div className="uploaded-file-list">
                    {project.brief_data.contentFileUrls.map((url: string, index: number) => (
                      <div key={url}>
                        <AssetLink label={`Szöveges anyag ${index + 1}`} value={url} />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {project.brief_data?.domainPurchaseState === "submitted" ? (
                <section className="admin-assets-block">
                  <span className="admin-assets-title">Megvásárolt domain ellenőrzése</span>
                  <div className="admin-brief-grid">
                    <div>
                      <span>Domain</span>
                      <strong>{project.brief_data.domainName}</strong>
                    </div>
                    <div>
                      <span>Ügyfél jelzése</span>
                      <strong>Aktív státusz elküldve</strong>
                    </div>
                  </div>
                  {project.brief_data.domainProofUrl ? (
                    <AssetLink
                      className="button secondary compact-action"
                      label="Igazolás megnyitása"
                      value={project.brief_data.domainProofUrl}
                    />
                  ) : null}
                </section>
              ) : null}

              {(() => {
                const logs = changeLogs[project.id] ?? [];
                if (logs.length === 0) return null;
                return (
                  <section style={{ background: 'rgba(48,56,65,0.03)', border: '1px solid var(--line)', borderRadius: '18px', padding: '16px', display: 'grid', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Adatlapváltozások előzménye ({logs.length})</span>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'grid', gap: '6px', fontSize: '13px' }}>
                      {logs.map((log) => (
                        <div key={log.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>
                          <span style={{ color: '#5f9296' }}>{new Date(log.changed_at).toLocaleString('hu-HU')}</span> · <strong>{log.changed_by_name}</strong> - <em>{log.field_name}:</em>
                          <div style={{ color: 'var(--muted)', marginTop: '2px', paddingLeft: '8px' }}>
                            <span style={{ textDecoration: 'line-through' }}>{log.old_value}</span> &rarr; <span style={{ color: 'var(--ink)' }}>{log.new_value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })()}
                </div>
              </details>

              <div className="admin-workflow" aria-label="Projekt folyamat">
                {(project.commercial_model === "subscription" ? [
                  ["contract_pending", "Szerződés"],
                  ["deposit_pending", "Első havidíj"],
                  ["in_progress", "Építés"],
                  ["review", "Jóváhagyás"],
                  ["launched", "Aktív"]
                ] : projectFlow).map(([value, label]) => (
                  <span className={project.status === value ? "active" : ""} key={value}>
                    {label}
                  </span>
                ))}
              </div>

              <div className="admin-project-grid chapter-in" key={`grid-${project.id}-${project.status}`}>
                <section className="admin-control-panel">
                  <div className="portal-panel-head">
                    <span>Aktuális feladat</span>
                    <small>Csak a jelenlegi lépés vezérlői láthatók</small>
                  </div>
                  <details className="admin-collapse">
                    <summary>Megjegyzések és ügyfélnek látható tájékoztatás</summary>
                    <div style={{ display: "grid", gap: "12px" }}>
                      <div className="locked-phase">
                        <span>Aktuális, zárolt fázis</span>
                        <strong>{projectStatusLabel[project.status] || project.status}</strong>
                        <small>A fázist csak a fent megjelölt következő lépés módosíthatja. Így nem lehet véletlenül átugrani az ügyfél vagy az admin feladatát.</small>
                      </div>
                      <label className="admin-field">
                        <span>Következő lépés — ezt az ügyfél látja</span>
                        <textarea
                          defaultValue={project.next_step ?? ""}
                          onBlur={(event) => updateClientProject(project.id, { next_step: event.target.value })}
                          placeholder="A Tovább gomb automatikusan kitölti — itt felülírhatod."
                        />
                      </label>
                      <label className="admin-field">
                        <span>Belső jegyzet — csak te látod</span>
                        <textarea
                          defaultValue={project.admin_notes ?? ""}
                          onBlur={(event) => updateClientProject(project.id, { admin_notes: event.target.value })}
                          placeholder="Privát emlékeztető magadnak..."
                        />
                      </label>
                    </div>
                  </details>

                  {showBuild && (
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '4px', display: 'grid', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14px' }}>Staging / előnézeti URL</strong>
                      <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Az ügyfél ezt látja a dashboardján</small>
                    </div>
                    <input
                      defaultValue={project.staging_url ?? ""}
                      onBlur={(event) => updateClientProject(project.id, { staging_url: event.target.value || null })}
                      placeholder="https://project-edge-xyz.vercel.app"
                      style={{ background: 'var(--white)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }}
                    />
                  </div>
                  )}

                  {showBuild && (
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '4px', display: 'grid', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '14px' }}>Tervezett átadás dátuma</strong>
                      <small style={{ color: 'var(--muted)', fontSize: '11px' }}>Az ügyfél a státusz alatt látja</small>
                    </div>
                    <input
                      type="date"
                      defaultValue={project.estimated_deadline ?? ""}
                      onBlur={(event) => updateClientProject(project.id, { estimated_deadline: event.target.value || null })}
                      style={{ background: 'var(--white)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }}
                    />
                  </div>
                  )}

                  {project.status === "deposit_pending" && project.payment_status === "unpaid" && project.deposit_amount && project.deposit_transfer_reported ? (
                    <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '4px', display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '14px' }}>{project.commercial_model === "subscription" ? "Első havidíj" : "Foglaló"}</strong>
                        <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                          {formatPrice(project.deposit_amount, project.offer_currency || "Ft")} · közlemény: {transferReference(project)}
                        </small>
                      </div>
                      <button
                        className="button secondary"
                        type="button"
                        style={{ color: '#315f63', borderColor: '#315f63', fontSize: '13px', minHeight: 'auto', padding: '10px 16px' }}
                        onClick={() => wizardNext(project)}
                      >
                        {project.commercial_model === "subscription" ? "Első havidíj" : "Foglaló"} megérkezett a számlára ✓
                      </button>
                    </div>
                  ) : null}

                  {project.commercial_model !== "subscription" && project.status === "launched" && project.payment_status === "deposit_paid" && project.final_transfer_reported && (
                    <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '4px', display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '14px' }}>Végső fizetés</strong>
                        <small style={{ color: 'var(--muted)', fontSize: '11px' }}>
                          Hátralék: {formatPrice((project.offer_price ?? 0) - (project.deposit_amount ?? 0), project.offer_currency || "Ft")} · közlemény: {transferReference(project)}
                        </small>
                      </div>
                      {project.final_payment_paid ? (
                        <div style={{ background: 'rgba(118,171,174,0.1)', border: '1px solid rgba(118,171,174,0.35)', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', color: '#315f63' }}>
                          ✓ Végső fizetés beérkezett — {project.final_payment_paid_at ? new Date(project.final_payment_paid_at).toLocaleDateString('hu-HU') : ''}
                        </div>
                      ) : (
                        <button
                          className="button secondary"
                          type="button"
                          style={{ color: '#315f63', borderColor: '#315f63', fontSize: '13px', minHeight: 'auto', padding: '10px 16px' }}
                          onClick={() => updateClientProject(project.id, {
                            final_payment_paid: true,
                            final_payment_paid_at: new Date().toISOString(),
                            payment_status: "fully_paid",
                            next_step: "A végső fizetés beérkezett. Az ügyfél lezárhatja a projektet; ekkor elindul a 30 napos díjmentes technikai garancia."
                          })}
                        >
                          Végső fizetés beérkezett ✓
                        </button>
                      )}
                    </div>
                  )}

                  {showPrepare && (
                  <button className="button secondary" onClick={() => primeOffer(project)} type="button">
                    Ajánlat sablon előkészítése
                  </button>
                  )}

                  {showBuild && (
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '16px', display: 'grid', gap: '12px' }}>
                    <strong>Kivitelezési Mérföldkövek ({project.milestones?.length || 0})</strong>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {project.milestones?.map((ms, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'rgba(48,56,65,0.05)', padding: '6px 10px', borderRadius: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            <input
                              type="checkbox"
                              checked={ms.done}
                              onChange={(e) => {
                                const updated = [...(project.milestones || [])];
                                updated[idx] = { ...updated[idx], done: e.target.checked };
                                updateClientProject(project.id, { milestones: updated });
                              }}
                            />
                            <span style={{ textDecoration: ms.done ? 'line-through' : 'none', color: ms.done ? 'var(--muted)' : 'var(--ink)' }}>{ms.title}</span>
                          </label>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: '#FF5722', cursor: 'pointer', padding: 0 }}
                            onClick={() => {
                              const updated = (project.milestones || []).filter((_, i) => i !== idx);
                              updateClientProject(project.id, { milestones: updated });
                            }}
                          >
                            Törlés
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        style={{ background: 'var(--white)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '6px 10px', borderRadius: '8px', fontSize: '13px', flex: 1 }}
                        placeholder="Új mérföldkő..."
                        value={newMilestoneTitle[project.id] ?? ""}
                        onChange={(e) => setNewMilestoneTitle({ ...newMilestoneTitle, [project.id]: e.target.value })}
                      />
                      <button
                        className="button primary"
                        style={{ minHeight: 'auto', padding: '6px 12px' }}
                        type="button"
                        onClick={() => {
                          const title = newMilestoneTitle[project.id]?.trim();
                          if (!title) return;
                          const updated = [...(project.milestones || []), { title, done: false }];
                          updateClientProject(project.id, { milestones: updated });
                          setNewMilestoneTitle({ ...newMilestoneTitle, [project.id]: "" });
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  )}

                  {showHandover && (
                    <AdminHandoverPanel
                      steps={project.handover_steps}
                      onChange={(steps) => updateClientProject(project.id, { handover_steps: steps })}
                      onStepCompleted={(_stepId, title) => {
                        void triggerNotification(
                          project.user_id,
                          project.contact_email,
                          "Átadási lépés kész — rajtad a sor",
                          `Elvégeztünk egy lépést a(z) "${project.title}" projekt átadásában: ${title}\n\nNyisd meg az ügyfélkaput, ahol a következő lépést és a hozzá tartozó linkeket találod.`,
                          "/ugyfelkapu/dashboard#statuses"
                        );
                      }}
                    />
                  )}
                </section>

                {showOffer && (
                <section className="admin-offer-builder">
                  <div className="portal-panel-head">
                    <span>Ajánlatépítő</span>
                    <small>{project.offer_status === "sent" ? "Elküldve" : "Vázlat"}</small>
                  </div>
                  <div className="admin-offer-fields">
                    <label className="admin-field">
                      <span>Ajánlat címe</span>
                      <input
                        defaultValue={project.offer_title ?? ""}
                        onBlur={(event) => updateClientProject(project.id, { offer_title: event.target.value })}
                        placeholder="pl. Feri weboldala – részletes ajánlat"
                      />
                    </label>
                    <label className="admin-field">
                      <span>Ütemezés</span>
                      <input
                        defaultValue={project.offer_timeline ?? ""}
                        onBlur={(event) => updateClientProject(project.id, { offer_timeline: event.target.value })}
                        placeholder="pl. 3–5 hét"
                      />
                    </label>
                    <label className="admin-field">
                      <span>Rövid összefoglaló</span>
                      <textarea
                        defaultValue={project.offer_summary ?? ""}
                        onBlur={(event) => updateClientProject(project.id, { offer_summary: event.target.value })}
                        placeholder="Mit kap az ügyfél, és miért ez a jó irány neki?"
                      />
                    </label>
                    <label className="admin-field">
                      <span>Mit tartalmaz</span>
                      <textarea
                        defaultValue={project.offer_scope ?? ""}
                        onBlur={(event) => updateClientProject(project.id, { offer_scope: event.target.value })}
                        placeholder="Oldalak, funkciók, admin, integrációk..."
                      />
                    </label>
                    <label className="admin-field">
                      <span>Tételek (soronként egy)</span>
                      <textarea
                        defaultValue={project.offer_deliverables ?? ""}
                        onBlur={(event) => updateClientProject(project.id, { offer_deliverables: event.target.value })}
                        placeholder="Egyedi főoldal&#10;Admin dashboard&#10;Supabase adatkezelés"
                      />
                    </label>
                    <label className="admin-field">
                      <span>Megjegyzés (opcionális)</span>
                      <textarea
                        defaultValue={project.offer_note ?? ""}
                        onBlur={(event) => updateClientProject(project.id, { offer_note: event.target.value })}
                        placeholder="Ár, fizetés vagy következő lépés megjegyzés..."
                      />
                    </label>
                  </div>
                  <div className="admin-price-row">
                    <label>
                      <span>Ajánlati ár</span>
                      <input
                        defaultValue={project.base_offer_price ?? project.offer_price ?? ""}
                        inputMode="numeric"
                        onBlur={(event) =>
                          updateClientProject(project.id, {
                            base_offer_price: event.target.value ? Number(event.target.value) : null
                          })
                        }
                        placeholder="350000"
                      />
                    </label>
                    <strong>{formatPrice(project.offer_price, project.offer_currency || "Ft")}</strong>
                    {project.coupon_code ? (
                      <small>
                        {project.coupon_code} · −{formatPrice(project.coupon_discount_amount, project.offer_currency || "Ft")}
                      </small>
                    ) : null}
                    <button className="button primary" onClick={() => sendProjectOffer(project)} type="button">
                      Ajánlat elküldése
                    </button>
                  </div>
                  {splitLines(project.offer_deliverables).length ? (
                    <div className="admin-deliverable-preview">
                      {splitLines(project.offer_deliverables).slice(0, 5).map((item) => (
                        <span key={item}>{item}</span>
                      ))}
                    </div>
                  ) : null}

                  {project.client_rating && (
                    <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', marginTop: '16px', fontSize: '14px' }}>
                      <strong style={{ color: '#315f63' }}>Kliens értékelése:</strong>
                      <div style={{ fontSize: '16px', color: '#FF9800', margin: '4px 0' }}>{"★".repeat(project.client_rating)}</div>
                      {project.client_review && <p style={{ fontStyle: 'italic', margin: 0 }}>"{project.client_review}"</p>}
                      <small style={{ color: 'var(--muted)' }}>Referencia engedélyezve: {project.reference_permitted ? "Igen" : "Nem"}</small>
                    </div>
                  )}
                </section>
                )}
              </div>

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

      {!loading && archivedProjects.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "32px", flexWrap: "wrap" }}>
            <h2 className="admin-section-title" style={{ margin: 0 }}>
              Archív (lezárt projektek) · {archivedProjects.length}
            </h2>
            <button
              type="button"
              className="button ghost"
              onClick={() => setShowArchive((v) => !v)}
              style={{ color: "#f5f5f5", borderColor: "rgba(245,245,245,.24)", minHeight: "auto", padding: "8px 16px", fontSize: "13px" }}
            >
              {showArchive ? "Elrejtés" : "Megnyitás"}
            </button>
          </div>
          {showArchive && (
            <div className="admin-project-board" style={{ marginTop: "16px" }}>
              {archivedProjects.map((project) => renderClosedProjectCard(project))}
            </div>
          )}
        </>
      )}

      {(() => {
        const openTickets = filteredTickets.filter((t) => t.status !== "closed");
        const closedCount = filteredTickets.length - openTickets.length;
        const visibleTickets = showClosedTickets ? filteredTickets : openTickets;
        return (
      <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <h2 className="admin-section-title" style={{ margin: 0 }}>Ügyfélkapus ticketek</h2>
        {closedCount > 0 && (
          <button
            type="button"
            className="button ghost"
            onClick={() => setShowClosedTickets((v) => !v)}
            style={{ color: "#f5f5f5", borderColor: "rgba(245,245,245,.24)", minHeight: "auto", padding: "8px 16px", fontSize: "13px" }}
          >
            {showClosedTickets ? `Lezártak elrejtése (${closedCount})` : `Lezártak mutatása (${closedCount})`}
          </button>
        )}
      </div>
      <div className="ticket-inbox" style={{ marginTop: "16px" }}>
        {loading ? (
          <div className="ticket-card">
            <strong>Betöltés...</strong>
          </div>
        ) : visibleTickets.length === 0 ? (
          <div className="ticket-card">
            <strong>{filteredTickets.length === 0 ? "Még nincs ügyfélkapus ticket." : "Nincs nyitott ticket."}</strong>
            <span>{filteredTickets.length === 0 ? "A bejelentkezett ügyfelek kérdései itt jelennek meg." : "Minden ticket lezárva. A lezártakat a fenti gombbal nézheted meg."}</span>
          </div>
        ) : (
          visibleTickets.map((ticket) => {
            const waitingMs = Date.now() - new Date(ticket.last_message_at).getTime();
            const isStale = ticket.status === "open" && waitingMs > TICKET_STALE_MS;
            const waitingHours = Math.floor(waitingMs / (60 * 60 * 1000));
            return (
            <article className="ticket-card" key={ticket.id} style={isStale ? { borderColor: "rgba(220,53,69,0.5)" } : undefined}>
              <div className="ticket-person">
                <span className="status-pill">{ticket.status}</span>
                {isStale && (
                  <span style={{ background: "rgba(220,53,69,0.15)", color: "#ff8a96", padding: "2px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}>
                    Válaszra vár · {waitingHours} órája
                  </span>
                )}
                <strong>{ticket.subject}</strong>
                <p>{ticket.contact_name || "Ügyfél"}</p>
                {ticket.contact_email ? <a href={`mailto:${ticket.contact_email}`}>{ticket.contact_email}</a> : null}
                {ticket.rating ? (
                  <div className="ticket-rating">
                    <span>{"★".repeat(ticket.rating)}</span>
                    {ticket.rating_comment ? <p>{ticket.rating_comment}</p> : null}
                  </div>
                ) : null}
              </div>
              <div className="ticket-conversation">
                <div className="admin-chat-thread">
                  {(clientTicketMessages[ticket.id] ?? []).map((item) => (
                    <div className={`admin-chat-message ${item.sender}`} key={item.id}>
                      <span>{item.sender === "admin" ? "Te" : "Ügyfél"}</span>
                      <p>{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ticket-actions">
                <select
                  value={ticket.status}
                  onChange={(event) => updateClientTicket(ticket.id, { status: event.target.value })}
                >
                  {ticketStatuses.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {ticket.status === "closed" ? (
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                    Lezárva. Ha újra kell nyitni, állítsd „Nyitott"-ra fent.
                  </p>
                ) : (
                  <>
                    <textarea
                      value={clientTicketReplies[ticket.id] ?? ""}
                      onChange={(event) =>
                        setClientTicketReplies((current) => ({ ...current, [ticket.id]: event.target.value }))
                      }
                      placeholder="Válasz az ügyfélkapuba..."
                      style={{ minHeight: 110 }}
                    />
                    <button
                      className="button primary admin-reply-button"
                      onClick={() => sendClientTicketReply(ticket.id)}
                      type="button"
                      disabled={!clientTicketReplies[ticket.id]?.trim()}
                    >
                      Válasz küldése
                    </button>
                  </>
                )}
              </div>
            </article>
            );
          })
        )}
      </div>
      </>
        );
      })()}
    </div>
  );
}
