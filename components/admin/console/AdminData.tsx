"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";
import { hardNavigate } from "@/lib/auth-navigation";
import { useRealtime, type RealtimeStatus } from "@/lib/use-realtime";
import { useConfirm, useOnline, useToasts, type ToastKind } from "@/components/ui/feedback";
import { BANK_TRANSFER_DETAILS, parseBrief } from "@/components/portal/format";
import { DEFAULT_HANDOVER_SERVICES, buildHandoverPlan, type HandoverStepState } from "@/lib/handover";
import type { AiPromptProject } from "@/lib/ai-build-prompt";
import type { BriefDraftRow } from "@/lib/brief-draft";
import {
  PARKING_MONTHLY_PRICE,
  buyoutPrice,
  elapsedBillingMonths,
  formatHuf,
  isWebsitePackage,
  isWebsitePurchaseRequest,
  purchaseOptionPrice,
  subscriptionPlan,
  websitePurchaseFeatures
} from "@/lib/subscriptions";
import type {
  AdminUserActivity,
  AppNotification,
  BillingoIssue,
  ChangeRequest,
  ClientProject,
  ClientTicket,
  Lead,
  Ticket,
  TicketMessage,
  WebsitePurchase
} from "@/components/admin/types";
import {
  PROJECT_STATUS_LABEL,
  buildConversations,
  buildCounts,
  buildTodayItems,
  type ConsoleCounts,
  type Conversation,
  type TodayItem
} from "@/components/admin/console/derive";

/**
 * Az admin konzol adatrétege.
 *
 * MINDEN adatbetöltés, élő frissítés és művelet itt él, egy helyen — a régi
 * `AdminDashboard.tsx` élesben bevált logikája, változatlan szabályokkal
 * (Stripe-biztos előfizetés-módosítás, értesítések, megerősítések). Az oldalak
 * (Ma, Beszélgetések, Ügyfelek, Pénz, Érdeklődők) csak megjelenítenek, és
 * innen hívják a műveleteket.
 *
 * Azért egy közös szolgáltató és nem oldalanként külön lekérés: a konzol
 * layoutja nem töltődik újra oldalváltáskor, így a navigáció azonnali, a
 * realtime csatorna egyetlen példányban fut, és a számlálók (pl. a menüben)
 * minden oldalon ugyanazt mutatják.
 */

export type PendingPayment = {
  id: string;
  project_id: string;
  amount: number;
  due_date: string | null;
  payment_reference: string | null;
  reminder_stage: number;
  status: "pending" | "reported";
  transfer_reported_at: string | null;
};

type RealtimePayload<Row> = { eventType: string; new: Row; old: Partial<Row> };

export type AdminTheme = "dark" | "light";
export const ADMIN_THEME_KEY = "projectedge-admin-theme";
const DISMISSED_KEY = "projectedge_admin_dismissed_v2";

let optimisticCounter = 0;
function optimisticId() {
  optimisticCounter += 1;
  return `optimistic-${Date.now()}-${optimisticCounter}`;
}

function messageKind(text: string): ToastKind {
  if (/nem sikerült|hiba|sikertelen|nem lehet|nem indítható|nem elérhető|figyelem/i.test(text)) return "error";
  if (/mentve|elküldve|törölve|jóváhagyva|elutasítva|kész|rögzítve|elkészült|elindult|lezárva|megszakadt|átvetted/i.test(text)) return "success";
  return "info";
}

const DEFAULT_OFFER_DELIVERABLES = [
  "Átgondolt oldalstruktúra és tartalmi felépítés",
  "Egyedi, minden eszközön jól mutató design",
  "Kész, működő weboldal alap animációkkal",
  "Saját admin felület, amiből te magad frissítheted az oldalt",
  "Az oldal élesítése a saját domainoden, teljes beállítással"
].join("\n");

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

export function toAiPromptProject(project: ClientProject): AiPromptProject {
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

/* ── Perces óra ─────────────────────────────────────────────────────────
   A „most" percenként frissül, így a relatív időpontok és a lejáratok maguktól
   aktualizálódnak. Külső tárként olvassuk (nem renderben hívott `Date.now()`),
   a szerveren és a hidratáláskor 0 — addig a dátumfüggő listák üresek. */
function subscribeMinute(onChange: () => void) {
  const timer = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(timer);
}
const minuteSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const serverMinute = () => 0;

async function accessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

function useAdminDataState() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketMessages, setTicketMessages] = useState<Record<string, TicketMessage[]>>({});
  const [clientProjects, setClientProjects] = useState<ClientProject[]>([]);
  const [clientTickets, setClientTickets] = useState<ClientTicket[]>([]);
  const [clientTicketMessages, setClientTicketMessages] = useState<Record<string, TicketMessage[]>>({});
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [websitePurchases, setWebsitePurchases] = useState<WebsitePurchase[]>([]);
  const [websitePurchaseBusyId, setWebsitePurchaseBusyId] = useState<string | null>(null);
  const [billingoIssues, setBillingoIssues] = useState<BillingoIssue[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [billingoRetryId, setBillingoRetryId] = useState<string | null>(null);
  const [briefDrafts, setBriefDrafts] = useState<BriefDraftRow[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUserActivity[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [paymentTestLoading, setPaymentTestLoading] = useState(false);
  const nowMs = useSyncExternalStore(subscribeMinute, minuteSnapshot, serverMinute);
  const [theme, setThemeState] = useState<AdminTheme>("dark");
  const [dismissed, setDismissed] = useState<string[]>([]);

  const { toasts, pushToast, dismissToast } = useToasts();
  const { confirm, confirmModal } = useConfirm();
  const online = useOnline();

  const notify = useCallback((text: string, kind?: ToastKind) => {
    pushToast(text, kind ?? messageKind(text), kind === "error" || messageKind(text) === "error" ? 6500 : 4000);
  }, [pushToast]);

  /* A mentett téma és az elrejtett teendők a böngészőben élnek. Effektben
     olvassuk, nem kezdőértékként: a szerver nem látja őket, és eltérő első
     render hidratálási hibát adna. */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ADMIN_THEME_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- egyszeri visszaállítás a böngésző tárolójából (lásd fent)
      if (stored === "light" || stored === "dark") setThemeState(stored);
      const hidden = JSON.parse(window.localStorage.getItem(DISMISSED_KEY) || "[]");
      if (Array.isArray(hidden)) setDismissed(hidden.filter((id): id is string => typeof id === "string"));
    } catch {
      /* privát mód — alapértelmezésekkel megy tovább */
    }
  }, []);

  const setTheme = useCallback((next: AdminTheme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(ADMIN_THEME_KEY, next);
    } catch {
      /* csak erre a munkamenetre marad meg */
    }
  }, []);

  const saveDismissed = useCallback((ids: string[]) => {
    setDismissed(ids);
    try {
      window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-400)));
    } catch {
      /* csak erre a munkamenetre */
    }
  }, []);

  /* ── Betöltés ──────────────────────────────────────────────────────── */

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
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

    // Első hullám: minden fő lista párhuzamosan, egyetlen hálózati körben.
    const [
      { data: leadData, error: leadError },
      { data: ticketData, error: ticketError },
      { data: clientProjectData, error: clientProjectError },
      { data: clientTicketData, error: clientTicketError },
      { data: notificationData },
      { data: changeRequestData },
      { data: websitePurchaseData },
      { data: billingoData },
      { data: pendingPaymentData },
      { data: briefDraftData, error: briefDraftError }
    ] = await Promise.all([
      supabase.from("quote_requests").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("support_tickets").select("*").order("last_message_at", { ascending: false, nullsFirst: false }).limit(300),
      supabase.from("client_projects").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("client_tickets").select("*").order("last_message_at", { ascending: false }).limit(300),
      supabase.from("notifications").select("*").is("user_id", null).order("created_at", { ascending: false }).limit(60),
      supabase.from("change_requests").select("*").order("requested_at", { ascending: false }).limit(300),
      supabase.from("website_purchases").select("*").order("created_at", { ascending: false }).limit(100),
      supabase
        .from("subscription_payments")
        .select("id,project_id,amount,paid_at,stripe_invoice_id,billingo_error")
        .is("billingo_document_id", null)
        .eq("status", "paid")
        .order("paid_at", { ascending: false }),
      supabase
        .from("subscription_payments")
        .select("id,project_id,amount,due_date,payment_reference,reminder_stage,status,transfer_reported_at")
        .in("status", ["pending", "reported"])
        .order("due_date", { ascending: true })
        .returns<PendingPayment[]>(),
      supabase
        .from("brief_drafts")
        .select("*")
        .is("submitted_at", null)
        .order("updated_at", { ascending: false })
        .returns<BriefDraftRow[]>()
    ]);

    if (leadError || ticketError) {
      setLoadError("Nem sikerült betölteni az adatokat. Ellenőrizd az admin jogosultságot és a kapcsolatot.");
      setLoading(false);
      return;
    }

    // Második hullám: a ticketek üzenetei.
    const ticketIds = (ticketData ?? []).map((ticket) => ticket.id);
    const clientTicketIds = clientTicketError ? [] : (clientTicketData ?? []).map((ticket) => ticket.id);
    const [{ data: messagesData, error: messagesError }, { data: clientMessagesData, error: clientMessagesError }] = await Promise.all([
      ticketIds.length
        ? supabase.from("support_ticket_messages").select("*").in("ticket_id", ticketIds).order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      clientTicketIds.length
        ? supabase.from("client_ticket_messages").select("*").in("ticket_id", clientTicketIds).order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null })
    ]);

    if (messagesError || clientMessagesError) {
      setLoadError("A beszélgetések üzeneteit nem sikerült betölteni.");
    } else {
      setLoadError("");
    }

    const groupBy = (rows: TicketMessage[] | null) =>
      (rows ?? []).reduce<Record<string, TicketMessage[]>>((groups, item) => {
        groups[item.ticket_id] = [...(groups[item.ticket_id] ?? []), item];
        return groups;
      }, {});

    setLeads(leadData ?? []);
    setTickets(ticketData ?? []);
    setTicketMessages(groupBy(messagesData as TicketMessage[] | null));
    setClientProjects(clientProjectError ? [] : clientProjectData ?? []);
    setClientTickets(clientTicketError ? [] : clientTicketData ?? []);
    setClientTicketMessages(groupBy(clientMessagesData as TicketMessage[] | null));
    setNotifications(notificationData ?? []);
    setChangeRequests(changeRequestData ?? []);
    setWebsitePurchases((websitePurchaseData ?? []) as WebsitePurchase[]);
    setBillingoIssues((billingoData ?? []) as BillingoIssue[]);
    setPendingPayments(pendingPaymentData ?? []);
    setBriefDrafts(briefDraftError ? [] : briefDraftData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Csak induláskor; a további frissítést a realtime és az újracsatlakozás
    // hozza. A `loading` már igazként indul, ezért nem kell újra beállítani.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- aszinkron betöltés: állapotot csak a hálózati válasz után ír
    void reload(true);
  }, [reload]);

  /* ── Élő frissítés ─────────────────────────────────────────────────── */

  function addTicketMessage(message: TicketMessage) {
    setTicketMessages((current) => {
      const messages = current[message.ticket_id] ?? [];
      if (messages.some((item) => item.id === message.id)) return current;
      return { ...current, [message.ticket_id]: [...messages, message] };
    });
  }

  function addClientTicketMessage(message: TicketMessage) {
    setClientTicketMessages((current) => {
      const messages = current[message.ticket_id] ?? [];
      if (messages.some((item) => item.id === message.id)) return current;
      return { ...current, [message.ticket_id]: [...messages, message] };
    });
  }

  function mergeRows<Row extends { id: string }>(setter: (fn: (rows: Row[]) => Row[]) => void, payload: RealtimePayload<Row>) {
    if (payload.eventType === "DELETE") {
      const removedId = payload.old?.id;
      if (removedId) setter((current) => current.filter((row) => row.id !== removedId));
      return;
    }
    const row = payload.new;
    if (!row?.id) return;
    setter((current) => current.some((item) => item.id === row.id)
      ? current.map((item) => (item.id === row.id ? { ...item, ...row } : item))
      : [row, ...current]);
  }

  const realtimeStatus: RealtimeStatus = useRealtime(
    "projectedge-admin",
    [
      { table: "support_tickets", handler: (p) => mergeRows(setTickets, p as unknown as RealtimePayload<Ticket>) },
      { table: "support_ticket_messages", event: "INSERT", handler: (p) => addTicketMessage(p.new as TicketMessage) },
      { table: "client_projects", handler: (p) => mergeRows(setClientProjects, p as unknown as RealtimePayload<ClientProject>) },
      { table: "client_tickets", handler: (p) => mergeRows(setClientTickets, p as unknown as RealtimePayload<ClientTicket>) },
      { table: "client_ticket_messages", event: "INSERT", handler: (p) => addClientTicketMessage(p.new as TicketMessage) },
      {
        table: "notifications",
        handler: (p) => {
          const payload = p as unknown as RealtimePayload<AppNotification>;
          // Csak az admin (címzett nélküli) értesítései.
          if (payload.eventType !== "DELETE" && payload.new?.user_id) return;
          mergeRows(setNotifications, payload);
        }
      },
      { table: "change_requests", handler: (p) => mergeRows(setChangeRequests, p as unknown as RealtimePayload<ChangeRequest>) },
      { table: "quote_requests", handler: (p) => mergeRows(setLeads, p as unknown as RealtimePayload<Lead>) },
      { table: "website_purchases", handler: (p) => mergeRows(setWebsitePurchases, p as unknown as RealtimePayload<WebsitePurchase>) },
      {
        table: "brief_drafts",
        handler: (p) => {
          const row = p.new as BriefDraftRow;
          if (!row?.user_id) return;
          // A beküldött piszkozat már nem piszkozat: kikerül a listából.
          setBriefDrafts((current) => {
            const without = current.filter((draft) => draft.user_id !== row.user_id);
            return row.submitted_at ? without : [row, ...without];
          });
        }
      }
    ],
    () => { void reload(true); }
  );

  /* ── Közös segédek ─────────────────────────────────────────────────── */

  /**
   * Értesítés az ügyfélnek (ügyfélkapu + email). A címzettet a szerver az
   * adatbázisból állapítja meg a jogosultság alapján, nem a kliens küldi.
   */
  async function triggerNotification(targetUserId: string | null, title: string, message: string, link: string) {
    try {
      const token = await accessToken();
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ userId: targetUserId, title, message, link })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.success === false || result.emailSent === false) {
        const reason = typeof result.emailError === "string" ? ` (${result.emailError})` : "";
        console.error("A rendszerértesítés egyik kézbesítési csatornája hibázott.", result);
        notify(result.success === false && result.emailSent
          ? "Az email kiment, de az ügyfélkapus értesítést nem sikerült rögzíteni."
          : `Figyelem: az ügyfélkapus értesítés rögzülhetett, de az email nem ment ki${reason}.`, "error");
      }
    } catch (error) {
      console.error("Nem sikerült elküldeni a rendszerértesítést:", error);
      notify("Figyelem: az értesítés rögzítve, de az email szolgáltató nem volt elérhető.", "error");
    }
  }

  /**
   * Projektmező mentése — optimistán: a felület azonnal mutatja az új értéket
   * (pipa, legördülő), és hiba esetén visszaáll. Az ügyfél értesítése a
   * mentés ELŐTTI állapothoz képest dönti el, mi változott.
   */
  async function updateClientProject(id: string, patch: Partial<ClientProject>, options: { silent?: boolean } = {}) {
    const project = clientProjects.find((p) => p.id === id);
    setClientProjects((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    const { error } = await supabase.from("client_projects").update(patch).eq("id", id);
    if (error) {
      if (project) {
        const revert = Object.fromEntries(Object.keys(patch).map((key) => [key, project[key as keyof ClientProject]])) as Partial<ClientProject>;
        setClientProjects((current) => current.map((item) => (item.id === id ? { ...item, ...revert } : item)));
      }
      notify("Nem sikerült menteni az ügyfélprojektet.", "error");
      return false;
    }
    if (project) {
      if (patch.status && patch.status !== project.status) {
        await triggerNotification(
          project.user_id,
          "Frissítés érkezett a projektedhez",
          `A(z) "${project.title}" projekt új szakaszba lépett: ${PROJECT_STATUS_LABEL[patch.status] || patch.status}.${patch.next_step ? `\n\nTeendő / következő lépés: ${patch.next_step}` : ""}`,
          "/ugyfelkapu/dashboard#statuses"
        );
      } else if (patch.next_step && patch.next_step !== project.next_step) {
        await triggerNotification(
          project.user_id,
          "Következő lépés módosult",
          `Új feladat/következő lépés lett kijelölve a(z) "${project.title}" projektben: ${patch.next_step}`,
          "/ugyfelkapu/dashboard#statuses"
        );
      }
    }
    if (!options.silent) notify("Mentve.", "success");
    return true;
  }

  /**
   * Előfizetés-módosítás MINDIG a szerveren keresztül: a `/api/stripe/subscription`
   * végzi el a Stripe-oldali műveletet, és csak siker esetén írja a billing mezőket.
   */
  async function stripeSubscriptionAction(project: ClientProject, action: "cancel_now" | "pause" | "resume") {
    const token = await accessToken();
    if (!token) {
      notify("A munkamenet lejárt. Jelentkezz be újra.", "error");
      return false;
    }
    try {
      const response = await fetch("/api/stripe/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId: project.id, action })
      });
      const result = await response.json().catch(() => ({})) as { error?: string; stripeUpdated?: boolean };
      if (!response.ok) {
        notify(result.error || "Az előfizetés Stripe-oldali módosítása nem sikerült.", "error");
        return false;
      }
      if (project.stripe_subscription_id && !result.stripeUpdated) {
        notify("Figyelem: a Stripe nem erősítette meg a módosítást. Ellenőrizd a Stripe felületén.", "error");
      }
      return true;
    } catch {
      notify("A Stripe nem elérhető. Az előfizetés nem módosult — próbáld újra.", "error");
      return false;
    }
  }

  /* ── Műveletek ─────────────────────────────────────────────────────── */

  const actions = {
    reload,
    notify,

    async signOut() {
      await supabase.auth.signOut();
      hardNavigate("/admin");
    },

    async startPaymentSmokeTest() {
      setPaymentTestLoading(true);
      const token = await accessToken();
      if (!token) {
        notify("A munkamenet lejárt. Jelentkezz be újra.", "error");
        setPaymentTestLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/stripe/smoke-test", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json() as { error?: string; url?: string };
        if (!response.ok || !result.url) {
          notify(result.error || "A sandbox fizetési teszt nem indítható.", "error");
          return;
        }
        window.location.assign(result.url);
      } catch {
        notify("A sandbox fizetési teszt nem indítható.", "error");
      } finally {
        setPaymentTestLoading(false);
      }
    },

    async markNotificationRead(id: string) {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
      setNotifications((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
    },

    async markAllNotificationsRead() {
      const { error } = await supabase.from("notifications").update({ read: true }).is("user_id", null);
      if (error) {
        notify("Nem sikerült olvasottra állítani az értesítéseket.", "error");
        return;
      }
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    },

    dismissTodayItem(id: string) {
      saveDismissed([...dismissed.filter((item) => item !== id), id]);
    },

    restoreDismissed() {
      saveDismissed([]);
    },

    /** Az összes most látható, elrejthető teendő elrejtése (csak ezen a gépen). */
    dismissAllToday(ids: string[]) {
      saveDismissed(Array.from(new Set([...dismissed, ...ids])));
    },

    /* Projekt */
    updateClientProject,

    async sendFollowupReminder(project: ClientProject) {
      const ok = await confirm({
        title: "Onboarding emlékeztető küldése",
        message: `Küldesz egy segítőkész follow-up emailt az ügyfélnek a(z) „${project.title}” projekt elindításával kapcsolatban?`,
        confirmLabel: "Email elküldése",
        cancelLabel: "Mégse"
      });
      if (!ok) return;
      try {
        const token = await accessToken();
        if (!token) return;
        const response = await fetch("/api/admin/followup", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ projectId: project.id })
        });
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          notify(result.error || "Nem sikerült elküldeni az emlékeztetőt.", "error");
          return;
        }
        notify("Emlékeztető email elküldve.", "success");
      } catch {
        notify("Hálózati hiba az emlékeztető küldésekor.", "error");
      }
    },

    primeOffer(project: ClientProject) {
      const purchasePlan = project.commercial_model === "purchase" && project.brief_data && isWebsitePackage(project.brief_data)
        ? subscriptionPlan(project.brief_data.subscriptionPlan) : null;
      return updateClientProject(project.id, {
        offer_currency: project.offer_currency || "Ft",
        ...(purchasePlan ? {
          offer_price: project.offer_price ?? purchaseOptionPrice(purchasePlan.key),
          deposit_amount: project.deposit_amount ?? 10000
        } : {}),
        offer_deliverables: project.offer_deliverables || (purchasePlan ? websitePurchaseFeatures(purchasePlan).join("\n") : DEFAULT_OFFER_DELIVERABLES),
        offer_status: project.offer_status || "draft",
        offer_summary: project.offer_summary || "Egy átgondolt, konverzióra és későbbi bővíthetőségre épített webes rendszer, nem csak egy új design.",
        offer_title: project.offer_title || `${project.title} - részletes ajánlat`,
        offer_timeline: project.offer_timeline || (purchasePlan ? `${purchasePlan.buildTime}, a hiánytalan anyagok beérkezésétől. Vezetett technikai átadás a teljes díj rendezése után.` : "Első ütem: tervezés és design. Második ütem: fejlesztés, tesztelés és élesítés."),
        status: "planning",
        next_step: project.next_step || "Átnézem az adatlapot és összerakom a részletes ajánlatot a dashboardodban."
      });
    },

    sendProjectOffer(project: ClientProject) {
      return updateClientProject(project.id, {
        offer_status: "sent",
        offer_sent_at: new Date().toISOString(),
        status: "offer_sent",
        next_step: "Elkészült a részletes ajánlat. Nézd át a projektednél a tételeket, az ütemezést és az árat."
      });
    },

    /** Menedzselt oldal élesítése (a jóváhagyás és a fizetés után). */
    launchManagedProject(project: ClientProject) {
      return updateClientProject(project.id, {
        status: "launched",
        next_step: "Az oldal éles és felügyelet alatt van. A módosításokat és az előfizetést innen kezelheted.",
        site_health_status: "healthy",
        last_health_check_at: new Date().toISOString(),
        handover_steps: []
      });
    },

    sendPreview(project: ClientProject) {
      return updateClientProject(project.id, {
        status: "review",
        next_step: "Elkészült az előnézeti verzió. Nyisd meg, majd kérj módosítást vagy hagyd jóvá az élesítéshez."
      });
    },

    /** A projekt léptetése a következő fázisba — a régi varázsló szabályai szerint. */
    async advanceProject(project: ClientProject) {
      switch (project.status) {
        case "request_received":
          return actions.primeOffer(project);
        case "planning":
          return actions.sendProjectOffer(project);
        case "deposit_pending":
          // Menedzseltnél az első díjat a Stripe-webhook (vagy a befizetés
          // rögzítése) írja — kézzel nem szabad „aktívra" állítani.
          if (project.commercial_model === "subscription") {
            if (project.payment_status === "deposit_paid") return actions.launchManagedProject(project);
            notify("Az első díj még nem érkezett be. Kártyánál a Stripe-terhelés, utalásnál a befizetés rögzítése után élesíthetsz.", "info");
            return false;
          }
          if (project.deposit_transfer_reported) {
            return updateClientProject(project.id, {
              payment_status: "deposit_paid",
              status: "in_progress",
              next_step: "A foglaló beérkezett. Elindult a kivitelezés; most az adminisztrátor dolgozik."
            });
          }
          return false;
        case "in_progress":
          return actions.sendPreview(project);
        case "review": {
          if (!project.review_approved) return false;
          // Élesítéskor összeáll a vezetett átadás terve; a fölösleges
          // szolgáltatásokat az átadás-panelen ki lehet venni.
          const managed = project.commercial_model === "subscription";
          return updateClientProject(project.id, {
            status: "launched",
            next_step: managed ? "Az oldal éles és felügyelet alatt van. A módosításokat és az előfizetést innen kezelheted." : "Az oldal éles. Kérlek, rendezd a hátralékot, majd jelezd az utalást.",
            site_health_status: managed ? "healthy" : project.site_health_status,
            last_health_check_at: managed ? new Date().toISOString() : project.last_health_check_at,
            handover_steps: managed ? [] : project.handover_steps?.length ? project.handover_steps : buildHandoverPlan(DEFAULT_HANDOVER_SERVICES)
          });
        }
        default:
          return false;
      }
    },

    setMilestones(project: ClientProject, milestones: Array<{ title: string; done: boolean }>) {
      return updateClientProject(project.id, { milestones }, { silent: true });
    },

    setHandoverSteps(project: ClientProject, steps: HandoverStepState[]) {
      return updateClientProject(project.id, { handover_steps: steps }, { silent: true });
    },

    async notifyHandoverStep(project: ClientProject, title: string) {
      await triggerNotification(
        project.user_id,
        "Új átadási lépés érkezett",
        `A(z) "${project.title}" weboldalad átadásában most a te lépésed következik: "${title}". Nyisd meg az ügyfélkaput!`,
        "/ugyfelkapu/dashboard"
      );
    },

    async approveDeletion(project: ClientProject) {
      const ok = await confirm({
        title: "Projekt végleges törlése",
        message: `A(z) "${project.title}" projekt és minden adata véglegesen törlődik. Ez a művelet nem visszavonható.`,
        confirmLabel: "Végleges törlés",
        cancelLabel: "Mégse",
        danger: true
      });
      if (!ok) return false;
      // A Stripe tovább terhelne, a webhook pedig nem találná a projektet.
      if (project.stripe_subscription_id && !(await stripeSubscriptionAction(project, "cancel_now"))) {
        notify("A Stripe-előfizetést nem sikerült megszüntetni, ezért a projektet nem töröltem. Próbáld újra.", "error");
        return false;
      }
      const { error } = await supabase.from("client_projects").delete().eq("id", project.id);
      if (error) {
        notify("Nem sikerült törölni a projektet.", "error");
        return false;
      }
      await triggerNotification(project.user_id, "Projekt törölve", `A(z) "${project.title}" projektet az adminisztrátor véglegesen törölte.`, "/ugyfelkapu/dashboard#projects");
      setClientProjects((current) => current.filter((item) => item.id !== project.id));
      notify("Projekt véglegesen törölve.", "success");
      return true;
    },

    async rejectDeletion(project: ClientProject) {
      const prevStatus = project.status_before_delete_request || "planning";
      const nextStep = `Törlési kérelem elutasítva. Projekt visszaállítva a(z) "${PROJECT_STATUS_LABEL[prevStatus] || prevStatus}" fázisba.`;
      const { error } = await supabase.from("client_projects").update({ status: prevStatus, delete_requested: false, next_step: nextStep }).eq("id", project.id);
      if (error) {
        notify("Nem sikerült elutasítani a törlést.", "error");
        return;
      }
      await triggerNotification(
        project.user_id,
        "Projekt törlése elutasítva",
        `A(z) "${project.title}" projekt törlési kérelmét az adminisztrátor elutasította. A projekt visszaállt "${PROJECT_STATUS_LABEL[prevStatus] || prevStatus}" státuszba.`,
        "/ugyfelkapu/dashboard#statuses"
      );
      setClientProjects((current) => current.map((item) => item.id === project.id ? { ...item, status: prevStatus, delete_requested: false, next_step: nextStep } : item));
      notify("Törlési kérelem elutasítva.", "success");
    },

    /* Előfizetés — Stripe-biztos műveletek. */
    async approveSubscriptionPause(project: ClientProject) {
      const ok = await confirm({
        title: "Szüneteltetés jóváhagyása",
        message: `A weboldal parkolóállapotba kerül, a Stripe-ban az előfizetés szünetel. A következő ciklustól ${formatHuf(PARKING_MONTHLY_PRICE)}/hó parkolási díj él.`,
        confirmLabel: "Szüneteltetés",
        cancelLabel: "Mégse"
      });
      if (!ok) return;
      if (!(await stripeSubscriptionAction(project, "pause"))) return;
      await updateClientProject(project.id, {
        status: "paused",
        site_health_status: "offline",
        next_step: `A menedzselt weboldal parkolóállapotba került. A következő számlázási időszaktól ${formatHuf(PARKING_MONTHLY_PRICE)}/hó parkolási díj él. Bármikor kérheted az újraaktiválást.`
      });
      await reload(true);
    },

    async approveSubscriptionResume(project: ClientProject) {
      if (!(await stripeSubscriptionAction(project, "resume"))) return;
      await updateClientProject(project.id, {
        status: "launched",
        site_health_status: "healthy",
        last_health_check_at: new Date().toISOString(),
        next_step: "A weboldal újra aktív és felügyelet alatt áll. A következő számlázástól ismét a csomag havidíja él."
      });
      await reload(true);
    },

    async finishSubscriptionCancellation(project: ClientProject) {
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
      await reload(true);
    },

    /** Kérelem elutasítása: visszaáll aktívra, a Stripe-hoz nem nyúl. */
    async declineSubscriptionRequest(project: ClientProject) {
      const ok = await confirm({
        title: "Kérelem elutasítása",
        message: "Az előfizetés aktív marad, a Stripe-ban nem változik semmi. Az ügyfél értesítést kap.",
        confirmLabel: "Elutasítás",
        cancelLabel: "Mégse"
      });
      if (!ok) return;
      await updateClientProject(project.id, {
        subscription_status: "active",
        next_step: "A kérésedet átbeszéltük: az előfizetés változatlanul aktív marad. Kérdés esetén írj üzenetet."
      });
    },

    /* Változáskérések és árajánlatok */
    async setChangeRequestStatus(request: ChangeRequest, project: ClientProject, status: ChangeRequest["status"]) {
      const { error } = await supabase.from("change_requests").update({ status }).eq("id", request.id);
      if (error) {
        notify("Nem sikerült frissíteni a kérést.", "error");
        return;
      }
      setChangeRequests((current) => current.map((item) => (item.id === request.id ? { ...item, status } : item)));
      const purchase = isWebsitePurchaseRequest(request.description);
      const statusLabel = status === "waiting_client" ? "A következő lépés rád vár"
        : status === "completed" ? "Elkészült"
          : status === "declined" ? "Nem folytatható"
            : status === "in_progress" ? "Folyamatban"
              : status === "planned" ? "Előkészítés alatt" : "Frissítve";
      await triggerNotification(
        project.user_id,
        purchase ? "Frissítés a weboldal megvásárlásáról" : "Módosítási kérés állapota frissült",
        `${statusLabel} a(z) "${project.title}" ${purchase ? "megvásárlási folyamatában" : "projektednél benyújtott módosításban"}.`,
        "/ugyfelkapu/dashboard#statuses"
      );
      notify("Kérés frissítve, az ügyfél értesítést kapott.", "success");
    },

    async resolveChangeRequest(requestId: string) {
      const ok = await confirm({
        title: "Lezárod ezt a kérést?",
        message: "A kérés elintézettre vált, és eltűnik a teendőlistáról. Az ügyfél a saját felületén lezártként látja majd.",
        confirmLabel: "Lezárás",
        cancelLabel: "Mégsem"
      });
      if (!ok) return;
      const { error } = await supabase.from("change_requests").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", requestId);
      if (error) {
        notify("A kérés lezárása nem sikerült.", "error");
        return;
      }
      setChangeRequests((current) => current.map((request) => request.id === requestId ? { ...request, status: "completed" } : request));
      notify("A kérés lezárva.", "success");
    },

    async sendChangeQuote(request: ChangeRequest, project: ClientProject, amount: number, note: string) {
      if (!Number.isFinite(amount) || amount < 1000) {
        notify("Az ajánlati ár legalább 1 000 Ft legyen.", "error");
        return false;
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
        notify(`Az ajánlatot nem sikerült elküldeni: ${error.message}`, "error");
        return false;
      }
      await triggerNotification(
        project.user_id,
        "Ajánlat érkezett a módosításodra",
        `A(z) „${project.title}" projektnél kért módosításra ${formatHuf(Math.round(amount))} összegű ajánlatot küldtünk. Az ügyfélkapun elfogadhatod vagy elutasíthatod.`,
        "/ugyfelkapu/dashboard"
      );
      notify("Ajánlat elküldve az ügyfélnek.", "success");
      await reload(true);
      return true;
    },

    async confirmChangePayment(request: ChangeRequest, project: ClientProject) {
      const ok = await confirm({
        title: "Utalás jóváhagyása",
        message: "Csak akkor hagyd jóvá, ha az összeg ténylegesen megérkezett a bankszámlára. Ezzel a módosítás munkába kerül.",
        confirmLabel: "Beérkezett",
        cancelLabel: "Mégse"
      });
      if (!ok) return;
      const { error } = await supabase.rpc("confirm_change_payment", { request_id: request.id });
      if (error) {
        notify(`A jóváhagyás nem sikerült: ${error.message}`, "error");
        return;
      }
      await triggerNotification(project.user_id, "Megérkezett a fizetés — indul a módosítás", `A(z) „${project.title}" projektnél kért módosítás díja beérkezett. A munka elindul.`, "/ugyfelkapu/dashboard");
      notify("Fizetés jóváhagyva, a módosítás munkába került.", "success");
      await reload(true);
    },

    notifyChangeThreadReply(project: ClientProject) {
      return triggerNotification(
        project.user_id,
        "Új üzenet a kérésedhez",
        `Válasz érkezett a(z) „${project.title}" projekt egyik kérésére. Nyisd meg az ügyfélkaput a részletekért.`,
        "/ugyfelkapu/dashboard"
      );
    },

    /* Kivásárlás (tulajdonba vétel) */
    async prepareWebsitePurchase(purchase: WebsitePurchase, project: ClientProject) {
      setWebsitePurchaseBusyId(purchase.id);
      const { data, error } = await supabase.rpc("prepare_website_purchase", {
        p_purchase_id: purchase.id,
        p_admin_note: websitePurchasePreparationNote(project, purchase)
      });
      setWebsitePurchaseBusyId(null);
      if (error) {
        notify(`A fizetési összefoglalót nem sikerült előkészíteni: ${error.message}`, "error");
        return;
      }
      if (data) setWebsitePurchases((current) => current.map((item) => item.id === purchase.id ? data as WebsitePurchase : item));
      await triggerNotification(project.user_id, "Fizetési adatok érkeztek a weboldaladhoz", `Elkészítettük a(z) „${project.title}” tulajdonba-vételének fizetési összefoglalóját. Nyisd meg az ügyfélkaput a fizetési mód kiválasztásához.`, "/ugyfelkapu/dashboard");
      notify("A fizetési összefoglaló elkészült, az ügyfél értesítést kapott.", "success");
      await reload(true);
    },

    async activateWebsitePurchase(purchase: WebsitePurchase, project: ClientProject) {
      if (purchase.status !== "transfer_reported") {
        notify("A bankkártyás fizetés automatikusan aktiválódik; ezt a gombot banki átutalásnál használd.", "info");
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
        notify("A Stripe-előfizetést nem sikerült megszüntetni, ezért a vásárlást nem zártam le. Próbáld újra.", "error");
        setWebsitePurchaseBusyId(null);
        return;
      }
      const { data, error } = await supabase.rpc("activate_website_purchase", {
        p_purchase_id: purchase.id,
        p_handover: buildHandoverPlan(["vercel", "github", "domain"])
      });
      setWebsitePurchaseBusyId(null);
      if (error) {
        notify(`A technikai átadás indítása nem sikerült: ${error.message}`, "error");
        return;
      }
      if (data) setWebsitePurchases((current) => current.map((item) => item.id === purchase.id ? data as WebsitePurchase : item));
      await triggerNotification(project.user_id, "A vételár beérkezett — indul az átadás", `A(z) „${project.title}” tulajdonba vétele fizetve. Az előfizetés megszűnt, a vezetett technikai átadás megnyílt az ügyfélkapuban.`, "/ugyfelkapu/dashboard");
      notify("Vételár jóváhagyva, a vezetett technikai átadás elindult.", "success");
      await reload(true);
    },

    async cancelWebsitePurchase(purchase: WebsitePurchase) {
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
      if (error) {
        notify(`A folyamatot nem sikerült megszakítani: ${error.message}`, "error");
        return;
      }
      if (data) setWebsitePurchases((current) => current.map((item) => item.id === purchase.id ? data as WebsitePurchase : item));
      notify("A tulajdonba-vételi folyamat megszakadt.", "success");
      await reload(true);
    },

    async startProjectWebsitePurchase(project: ClientProject) {
      // A fizetendő összeg NEM a listaár: a befizetett havidíjak fele beszámít.
      const anchor = project.billing_cycle_started_at ?? project.subscription_started_at ?? project.created_at;
      const { payable } = buyoutPrice(project.subscription_plan, elapsedBillingMonths(anchor));
      const ok = await confirm({
        title: "Kivásárlási folyamat indítása",
        message: `Fizetendő vételár a beszámítással: ${formatHuf(payable)}. Utána a fizetési összefoglalót kell előkészítened.`,
        confirmLabel: "Indítás",
        cancelLabel: "Mégse"
      });
      if (!ok) return;
      const { data, error } = await supabase
        .from("website_purchases")
        .insert({ project_id: project.id, user_id: project.user_id, amount: payable, status: "requested" })
        .select("*")
        .single();
      if (error || !data) {
        notify(`Nem sikerült elindítani a kivásárlási folyamatot: ${error?.message || ""}`, "error");
        return;
      }
      setWebsitePurchases((current) => [data as WebsitePurchase, ...current]);
      notify("A kivásárlási folyamat elindult. Készítsd elő a fizetési adatokat.", "success");
      await reload(true);
    },

    /* Számlázás */
    async retryBillingoInvoice(paymentId: string) {
      const token = await accessToken();
      if (!token) {
        notify("A munkamenet lejárt. Jelentkezz be újra.", "error");
        return;
      }
      setBillingoRetryId(paymentId);
      try {
        const response = await fetch("/api/billingo/retry", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ paymentId })
        });
        const result = await response.json().catch(() => ({})) as { error?: string; invoiceNumber?: string };
        if (!response.ok) {
          notify(result.error || "A számlázás újrapróbálása nem sikerült.", "error");
          return;
        }
        setBillingoIssues((current) => current.filter((issue) => issue.id !== paymentId));
        notify(`Számla elkészült${result.invoiceNumber ? `: ${result.invoiceNumber}` : ""}.`, "success");
      } catch {
        notify("A számlázó szolgáltatás nem elérhető.", "error");
      } finally {
        setBillingoRetryId(null);
      }
    },

    /* Érdeklődők */
    async updateLead(id: string, patch: Partial<Pick<Lead, "status" | "notes">>) {
      const { error } = await supabase.from("quote_requests").update(patch).eq("id", id);
      if (error) {
        notify("Nem sikerült menteni a módosítást.", "error");
        return;
      }
      setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
      notify("Mentve.", "success");
    },

    async loadAdminUsers() {
      setUsersLoading(true);
      setUsersError("");
      try {
        const token = await accessToken();
        if (!token) throw new Error("A munkamenet lejárt. Jelentkezz be újra.");
        const response = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json().catch(() => ({})) as { users?: AdminUserActivity[]; error?: string };
        if (!response.ok) throw new Error(result.error || "A felhasználói lista nem tölthető be.");
        setAdminUsers(result.users ?? []);
        setUsersLoaded(true);
      } catch (error) {
        setUsersError(error instanceof Error ? error.message : "A felhasználói lista nem tölthető be.");
      } finally {
        setUsersLoading(false);
      }
    },

    /* Beszélgetések */
    async setConversationStatus(conversation: Conversation, status: string) {
      const table = conversation.kind === "public" ? "support_tickets" : "client_tickets";
      const { error } = await supabase.from(table).update({ status }).eq("id", conversation.id);
      if (error) {
        notify("Nem sikerült menteni az állapotot.", "error");
        return;
      }
      if (conversation.kind === "public") {
        setTickets((current) => current.map((ticket) => (ticket.id === conversation.id ? { ...ticket, status } : ticket)));
      } else {
        setClientTickets((current) => current.map((ticket) => (ticket.id === conversation.id ? { ...ticket, status } : ticket)));
      }
      notify("Állapot mentve.", "success");
    },

    /** Válasz egy látogatói (widget/AI) beszélgetésre — a szerver emailben is kézbesíti. */
    async sendPublicReply(ticketId: string, body: string) {
      const ticket = tickets.find((item) => item.id === ticketId);
      if (ticket?.status === "closed") {
        notify("Lezárt beszélgetésre nem lehet választ küldeni.", "error");
        return false;
      }
      const text = body.trim();
      if (!text) return false;
      const tempId = optimisticId();
      addTicketMessage({ id: tempId, ticket_id: ticketId, body: text, created_at: new Date().toISOString(), sender: "admin" });
      setTickets((current) => current.map((item) => (item.id === ticketId ? { ...item, status: "answered" } : item)));
      const token = await accessToken();
      const response = await fetch(`/api/tickets/${ticketId}/admin-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ body: text })
      }).catch(() => null);
      const result = response ? await response.json().catch(() => null) : null;
      if (!response?.ok || !result?.message) {
        setTicketMessages((current) => ({ ...current, [ticketId]: (current[ticketId] ?? []).filter((m) => m.id !== tempId) }));
        notify("Nem sikerült elküldeni a választ.", "error");
        return false;
      }
      setTicketMessages((current) => ({ ...current, [ticketId]: (current[ticketId] ?? []).map((m) => (m.id === tempId ? result.message : m)) }));
      notify(result.emailSent ? "Válasz elküldve, emailben is kézbesítve." : `Figyelem: a válasz mentve, de az email nem ment ki: ${result.emailError ?? "nincs email cím"}.`, result.emailSent ? "success" : "info");
      return true;
    },

    /** Válasz egy ügyfélkapus ticketre. */
    async sendPortalReply(ticketId: string, body: string) {
      const ticket = clientTickets.find((item) => item.id === ticketId);
      if (ticket?.status === "closed") {
        notify("Lezárt beszélgetésre nem lehet választ küldeni.", "error");
        return false;
      }
      const text = body.trim();
      if (!text) return false;
      const { data: sessionData } = await supabase.auth.getSession();
      const adminUserId = sessionData?.session?.user?.id;
      const tempId = optimisticId();
      addClientTicketMessage({ id: tempId, ticket_id: ticketId, body: text, created_at: new Date().toISOString(), sender: "admin", user_id: adminUserId });
      setClientTickets((current) => current.map((item) => (item.id === ticketId ? { ...item, status: "answered" } : item)));
      const { data, error } = await supabase
        .from("client_ticket_messages")
        .insert({ ticket_id: ticketId, sender: "admin", body: text, user_id: adminUserId })
        .select("*")
        .single();
      if (error || !data) {
        console.error("Hiba az ügyfélkapus válasz küldésekor:", error);
        setClientTicketMessages((current) => ({ ...current, [ticketId]: (current[ticketId] ?? []).filter((m) => m.id !== tempId) }));
        notify("Nem sikerült elküldeni az ügyfélkapus választ.", "error");
        return false;
      }
      setClientTicketMessages((current) => ({ ...current, [ticketId]: (current[ticketId] ?? []).map((m) => (m.id === tempId ? data as TicketMessage : m)) }));
      if (ticket) {
        await triggerNotification(ticket.user_id, "Új üzeneted érkezett", `ProjectEdge válaszolt a(z) "${ticket.subject}" beszélgetésben:\n\n${text.slice(0, 500)}`, `/ugyfelkapu/dashboard#support:${ticketId}`);
      }
      notify("Válasz elküldve.", "success");
      return true;
    }
  };

  /* ── Származtatott adatok ──────────────────────────────────────────── */

  const conversations = useMemo(
    () => buildConversations({ tickets, ticketMessages, clientTickets, clientTicketMessages }),
    [tickets, ticketMessages, clientTickets, clientTicketMessages]
  );

  const allToday = useMemo(() => nowMs ? buildTodayItems({
    projects: clientProjects,
    conversations,
    leads,
    changeRequests,
    websitePurchases,
    billingoIssues,
    pendingPayments,
    briefDraftCount: briefDrafts.length,
    nowMs
  }) : [], [clientProjects, conversations, leads, changeRequests, websitePurchases, billingoIssues, pendingPayments, briefDrafts.length, nowMs]);

  const today = useMemo(() => allToday.filter((item) => !item.dismissible || !dismissed.includes(item.id)), [allToday, dismissed]);
  const hiddenTodayCount = allToday.length - today.length;

  const counts: ConsoleCounts = useMemo(() => buildCounts({
    today,
    conversations,
    projects: clientProjects,
    billingoIssues,
    pendingPayments,
    leads,
    nowMs: nowMs || 0
  }), [today, conversations, clientProjects, billingoIssues, pendingPayments, leads, nowMs]);

  const unreadNotifications = notifications.filter((item) => !item.read).length;

  return {
    loading,
    loadError,
    nowMs,
    online,
    realtimeStatus,
    theme,
    setTheme,
    toasts,
    dismissToast,
    confirm,
    confirmModal,
    leads,
    tickets,
    ticketMessages,
    clientProjects,
    clientTickets,
    clientTicketMessages,
    changeRequests,
    websitePurchases,
    websitePurchaseBusyId,
    billingoIssues,
    billingoRetryId,
    pendingPayments,
    briefDrafts,
    notifications,
    unreadNotifications,
    adminUsers,
    usersLoading,
    usersError,
    usersLoaded,
    paymentTestLoading,
    conversations,
    today,
    hiddenTodayCount,
    counts,
    actions
  };
}

export type AdminData = ReturnType<typeof useAdminDataState>;

const AdminDataContext = createContext<AdminData | null>(null);

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const value = useAdminDataState();
  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdmin() {
  const value = useContext(AdminDataContext);
  if (!value) throw new Error("useAdmin csak az AdminDataProvider-en belül használható.");
  return value;
}

export type { TodayItem, Conversation };
