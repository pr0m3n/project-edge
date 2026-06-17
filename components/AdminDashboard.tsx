"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Lead = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  website: string | null;
  project_type: string;
  budget: string | null;
  goals: string;
  status: string;
  notes: string | null;
};

type Ticket = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  message: string;
  rating: number | null;
  rating_comment: string | null;
  status: string;
  admin_reply: string | null;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  created_at: string;
  sender: "customer" | "admin";
  body: string;
};

type ClientProject = {
  id: string;
  user_id: string;
  created_at: string;
  contact_email: string | null;
  contact_name: string | null;
  title: string;
  company: string | null;
  website: string | null;
  project_type: string;
  budget: string | null;
  goals: string;
  status: string;
  next_step: string | null;
  admin_notes: string | null;
  offer_title: string | null;
  offer_summary: string | null;
  offer_scope: string | null;
  offer_timeline: string | null;
  offer_deliverables: string | null;
  offer_price: number | null;
  offer_currency: string | null;
  offer_note: string | null;
  offer_status: string | null;
  offer_sent_at: string | null;
  client_decision_note: string | null;
  brief_data: any;
  last_modified_at: string | null;
  last_modified_by: string | null;
  last_modified_by_name: string | null;
  delete_requested: boolean;
  delete_requested_at: string | null;
  status_before_delete_request: string | null;
  deposit_amount: number | null;
  payment_status: "unpaid" | "deposit_paid" | "fully_paid";
  contract_accepted: boolean;
  contract_accepted_at: string | null;
  milestones: Array<{ title: string; done: boolean }> | null;
  feedback_round: number;
  feedback_notes: string | null;
  handover_checklist: Array<{ title: string; done: boolean }> | null;
  maintenance_option: string | null;
  client_rating: number | null;
  client_review: string | null;
  reference_permitted: boolean;
  staging_url: string | null;
  final_payment_paid: boolean;
  final_payment_paid_at: string | null;
};

type ClientTicket = {
  id: string;
  user_id: string;
  project_id: string | null;
  contact_email: string | null;
  contact_name: string | null;
  subject: string;
  status: string;
  rating: number | null;
  rating_comment: string | null;
  last_message_at: string;
};

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
  ["review", "Átnézés"],
  ["launched", "Élesítve"],
  ["paused", "Szünetel"],
  ["closed", "Lezárva"],
  ["deletion_pending", "Törlés jóváhagyásra vár"]
];

const projectStatusLabel = Object.fromEntries(projectStatuses);

// Melyik státuszból hova lehet lépni (kényszer)
const allowedNextStatuses: Record<string, string[]> = {
  request_received: ["planning", "paused", "closed"],
  planning:         ["offer_sent", "request_received", "paused", "closed"],
  offer_sent:       ["deposit_pending", "planning", "paused", "closed"],
  deposit_pending:  ["contract_pending", "offer_sent"],
  contract_pending: ["in_progress", "deposit_pending"],
  in_progress:      ["review", "paused"],
  review:           ["in_progress", "launched"],
  launched:         ["closed"],
  paused:           ["in_progress", "review", "closed"],
  closed:           ["in_progress"],
  deletion_pending: ["planning", "closed"]
};

function allowedStatusOptions(current: string) {
  const allowed = allowedNextStatuses[current] ?? [];
  return projectStatuses.filter(([val]) => val === current || allowed.includes(val));
}

const projectFlow = [
  ["request_received", "Igény"],
  ["planning", "Tervezés"],
  ["offer_sent", "Ajánlat"],
  ["deposit_pending", "Foglaló"],
  ["contract_pending", "Szerződés"],
  ["in_progress", "Építés"],
  ["review", "Review"],
  ["launched", "Éles"]
];

const defaultOfferDeliverables = [
  "Stratégiai irány és oldalstruktúra",
  "Egyedi, reszponzív felület",
  "Frontend fejlesztés és alap animációk",
  "Supabase alapú adatkezelés / admin háttér",
  "Élesítés Vercelen, domain beállításokkal"
].join("\n");

const adminPaletteOptions: Array<[string, string[]]> = [
  ["ProjectEdge", ["#F5F5F5", "#76ABAE", "#303841", "#FF5722"]],
  ["Monokróm tech", ["#F7F7F2", "#D9E2DF", "#20242A", "#111111"]],
  ["Meleg prémium", ["#FFF7EF", "#E8C6A4", "#32302F", "#E6532E"]],
  ["Friss SaaS", ["#F7FBF9", "#92D1C3", "#29353D", "#2F8F83"]],
  ["Luxus sötét", ["#F4EFE7", "#C6A15B", "#1E2329", "#0E1116"]],
  ["Editorial", ["#FAF7F0", "#D8D0C5", "#2F343B", "#B94D3A"]],
  ["Electric tech", ["#F8FAFF", "#8DE3FF", "#2630FF", "#111827"]],
  ["Organikus", ["#FAF8EF", "#BFD7B5", "#36594C", "#D96C3B"]],
  ["Rose premium", ["#FFF7F8", "#E8B4BC", "#332B31", "#C44569"]],
  ["Blueprint", ["#F3F8FF", "#9DB7D6", "#1D3557", "#457B9D"]],
  ["Sunset", ["#FFF1E6", "#F7B267", "#2B2D42", "#F25C54"]],
  ["Minimal fehér", ["#FFFFFF", "#E9ECEF", "#343A40", "#ADB5BD"]]
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("hu-HU", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function formatPrice(value: number | null, currency = "Ft") {
  if (!value) {
    return "Nincs ár megadva";
  }

  return `${new Intl.NumberFormat("hu-HU").format(value)} ${currency}`;
}

function splitLines(value: string | null) {
  return (value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBrief(value: string | null) {
  const pairs = splitLines(value).map((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      return ["Megjegyzés", line] as const;
    }

    return [line.slice(0, separatorIndex).trim(), line.slice(separatorIndex + 1).trim()] as const;
  });

  return Object.fromEntries(pairs) as Record<string, string>;
}

function paletteByName(name?: string) {
  return adminPaletteOptions.find(([label]) => label === name)?.[1] ?? adminPaletteOptions[0][1];
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
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  // Upgraded flow states
  const [changeLogs, setChangeLogs] = useState<Record<string, any[]>>({});
  const [newMilestoneTitle, setNewMilestoneTitle] = useState<Record<string, string>>({});
  const [newHandoverTitle, setNewHandoverTitle] = useState<Record<string, string>>({});

  // Phase 2 state variables
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("all");

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
    if (selectedClientFilter === "all") return clientProjects;
    return clientProjects.filter((p) => p.user_id === selectedClientFilter);
  }, [clientProjects, selectedClientFilter]);

  const filteredTickets = useMemo(() => {
    if (selectedClientFilter === "all") return clientTickets;
    return clientTickets.filter((t) => t.user_id === selectedClientFilter);
  }, [clientTickets, selectedClientFilter]);

  async function triggerNotification(
    targetUserId: string | null,
    targetEmail: string | null,
    title: string,
    message: string,
    link: string
  ) {
    try {
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUserId,
          email: targetEmail,
          title,
          message,
          link
        })
      });
    } catch (err) {
      console.error("Nem sikerült elküldeni a rendszer értesítést:", err);
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

  async function loadLeads() {
    setLoading(true);
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
    setLoading(false);
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
          "Projekt státusz módosult",
          `A(z) "${project.title}" projekt státusza megváltozott: ${projectStatusLabel[patch.status] || patch.status}.`,
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
    const { error } = await supabase.from("client_projects").delete().eq("id", project.id);
    if (error) {
      setMessage("Nem sikerült jóváhagyni a törlést.");
    } else {
      await triggerNotification(
        project.user_id,
        project.contact_email,
        "Projekt törlése jóváhagyva",
        `A(z) "${project.title}" projekt törlési kérelmét az adminisztrátor jóváhagyta.`,
        "/ugyfelkapu/dashboard#projects"
      );
      setMessage("Projekt véglegesen törölve.");
      loadLeads();
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
      setMessage("Törlési kérelem elutasítva.");
      loadLeads();
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
      next_step: project.next_step || "Átnézem a briefet és összerakom a részletes ajánlatot a dashboardodban."
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

    const { data, error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender: "admin",
        body
      })
      .select("*")
      .single();

    if (error || !data) {
      setMessage("Nem sikerült elküldeni a választ.");
      return;
    }

    addTicketMessage(data);
    setTicketReplies((current) => ({ ...current, [ticketId]: "" }));
    setTickets((current) =>
      current.map((ticket) => (ticket.id === ticketId ? { ...ticket, status: "answered" } : ticket))
    );
    setMessage("Válasz elküldve.");
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
        "Új válasz érkezett a ticketedre",
        `Az adminisztrátor válaszolt a support ticketedre: "${ticket.subject}".`,
        "/ugyfelkapu/dashboard#support"
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
        () => loadLeads()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_tickets"
        },
        () => loadLeads()
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
        () => loadLeads()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

      {message ? <p className="form-status" style={{ color: "#f5f5f5" }}>{message}</p> : null}

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
          <h3 style={{ margin: 0, fontSize: "18px", color: "#fff" }}>Ügyfél alapú szűrés</h3>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>Szűrd le a projekt és support táblákat egy adott ügyfélre.</p>
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

      <h2 className="admin-section-title">Ügyfélkapus projektek</h2>
      <div className="admin-project-board">
        {loading ? (
          <div className="ticket-card">
            <strong>Betöltés...</strong>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="ticket-card">
            <strong>Még nincs ügyfélkapus projekt.</strong>
            <span>A regisztrált ügyfelek projektindításai itt jelennek meg.</span>
          </div>
        ) : (
          filteredProjects.map((project) => {
            if (project.status === "closed") {
              const rating = project.client_rating;
              const review = project.client_review;
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

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "10px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <select
                      value={project.status}
                      onChange={(event) => updateClientProject(project.id, { status: event.target.value })}
                      style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "6px", background: "#25282F", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                    >
                      {allowedStatusOptions(project.status).map(([val, lbl]) => (
                        <option key={val} value={val}>{lbl}</option>
                      ))}
                    </select>
                  </div>
                </article>
              );
            }

            const brief = parseBrief(project.goals);
            const palette = paletteByName(brief["Színirány"]);
            const briefFields = [
              ["Cél", brief["Cél"]],
              ["Célközönség", brief["Célközönség / vásárlók"]],
              ["Oldalak", brief["Fontos oldalak"]],
              ["Funkciók", brief["Kért funkciók"]],
              ["Stílus", brief["Stílus / hangulat"]],
              ["Karakter", brief["Vizuális karakter"]],
              ["Prioritás", brief["Prioritás"]]
            ].filter(([, value]) => Boolean(value));

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
                </div>
              </header>

              <div className="admin-project-facts">
                <div>
                  <span>Típus</span>
                  <strong>{project.project_type}</strong>
                </div>
                <div>
                  <span>Büdzsé</span>
                  <strong>{project.budget || "Nincs megadva"}</strong>
                </div>
                <div>
                  <span>Weboldal</span>
                  {project.website ? <a href={project.website}>{project.website}</a> : <strong>Nincs</strong>}
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

              {(() => {
                const logs = changeLogs[project.id] ?? [];
                if (logs.length === 0) return null;
                return (
                  <section style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '18px', padding: '16px', display: 'grid', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Brief változások előzménye ({logs.length})</span>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'grid', gap: '6px', fontSize: '13px' }}>
                      {logs.map((log) => (
                        <div key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                          <span style={{ color: '#76ABAE' }}>{new Date(log.changed_at).toLocaleString('hu-HU')}</span> · <strong>{log.changed_by_name}</strong> - <em>{log.field_name}:</em>
                          <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: '2px', paddingLeft: '8px' }}>
                            <span style={{ textDecoration: 'line-through' }}>{log.old_value}</span> &rarr; <span style={{ color: '#fff' }}>{log.new_value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })()}

              <div className="admin-workflow" aria-label="Projekt folyamat">
                {projectFlow.map(([value, label]) => (
                  <span className={project.status === value ? "active" : ""} key={value}>
                    {label}
                  </span>
                ))}
              </div>

              <div className="admin-project-grid">
                <section className="admin-control-panel">
                  <div className="portal-panel-head">
                    <span>Projekt irányítás</span>
                    <small>Ügyfél ezt látja</small>
                  </div>
                  <select
                    value={project.status}
                    onChange={(event) => updateClientProject(project.id, { status: event.target.value })}
                  >
                    {allowedStatusOptions(project.status).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <textarea
                    defaultValue={project.next_step ?? ""}
                    onBlur={(event) => updateClientProject(project.id, { next_step: event.target.value })}
                    placeholder="Következő lépés, amit az ügyfél a dashboardban lát..."
                  />
                  <textarea
                    defaultValue={project.admin_notes ?? ""}
                    onBlur={(event) => updateClientProject(project.id, { admin_notes: event.target.value })}
                    placeholder="Belső jegyzet, csak neked..."
                  />

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '4px', display: 'grid', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '14px' }}>Staging / előnézeti URL</strong>
                      <small style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>Az ügyfél ezt látja a dashboardján</small>
                    </div>
                    <input
                      defaultValue={project.staging_url ?? ""}
                      onBlur={(event) => updateClientProject(project.id, { staging_url: event.target.value || null })}
                      placeholder="https://project-edge-xyz.vercel.app"
                      style={{ background: '#25282F', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }}
                    />
                  </div>

                  {project.payment_status === "deposit_paid" && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '4px', display: 'grid', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '14px' }}>Végső fizetés</strong>
                        <small style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                          Hátralék: {formatPrice((project.offer_price ?? 0) - (project.deposit_amount ?? 0), project.offer_currency || "Ft")}
                        </small>
                      </div>
                      {project.final_payment_paid ? (
                        <div style={{ background: 'rgba(118,171,174,0.1)', border: '1px solid rgba(118,171,174,0.2)', padding: '12px 16px', borderRadius: '12px', fontSize: '13px', color: '#76ABAE' }}>
                          ✓ Végső fizetés beérkezett — {project.final_payment_paid_at ? new Date(project.final_payment_paid_at).toLocaleDateString('hu-HU') : ''}
                        </div>
                      ) : (
                        <button
                          className="button secondary"
                          type="button"
                          style={{ color: '#76ABAE', borderColor: 'rgba(118,171,174,0.3)', fontSize: '13px', minHeight: 'auto', padding: '10px 16px' }}
                          onClick={() => updateClientProject(project.id, {
                            final_payment_paid: true,
                            final_payment_paid_at: new Date().toISOString(),
                            payment_status: "fully_paid"
                          })}
                        >
                          Végső fizetés beérkezett ✓
                        </button>
                      )}
                    </div>
                  )}

                  <button className="button secondary" onClick={() => primeOffer(project)} type="button">
                    Ajánlat sablon előkészítése
                  </button>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '16px', display: 'grid', gap: '12px' }}>
                    <strong>Kivitelezési Mérföldkövek ({project.milestones?.length || 0})</strong>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {project.milestones?.map((ms, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '8px' }}>
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
                            <span style={{ textDecoration: ms.done ? 'line-through' : 'none', color: ms.done ? 'rgba(255,255,255,0.4)' : '#fff' }}>{ms.title}</span>
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
                        style={{ background: '#25282F', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '13px', flex: 1 }}
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

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '16px', display: 'grid', gap: '12px' }}>
                    <strong>Átadási checklist ({project.handover_checklist?.length || 0})</strong>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {project.handover_checklist?.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '8px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            <input
                              type="checkbox"
                              checked={item.done}
                              onChange={(e) => {
                                const updated = [...(project.handover_checklist || [])];
                                updated[idx] = { ...updated[idx], done: e.target.checked };
                                updateClientProject(project.id, { handover_checklist: updated });
                              }}
                            />
                            <span style={{ textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'rgba(255,255,255,0.4)' : '#fff' }}>{item.title}</span>
                          </label>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: '#FF5722', cursor: 'pointer', padding: 0 }}
                            onClick={() => {
                              const updated = (project.handover_checklist || []).filter((_, i) => i !== idx);
                              updateClientProject(project.id, { handover_checklist: updated });
                            }}
                          >
                            Törlés
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        style={{ background: '#25282F', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '13px', flex: 1 }}
                        placeholder="Új átadási pont..."
                        value={newHandoverTitle[project.id] ?? ""}
                        onChange={(e) => setNewHandoverTitle({ ...newHandoverTitle, [project.id]: e.target.value })}
                      />
                      <button
                        className="button primary"
                        style={{ minHeight: 'auto', padding: '6px 12px' }}
                        type="button"
                        onClick={() => {
                          const title = newHandoverTitle[project.id]?.trim();
                          if (!title) return;
                          const updated = [...(project.handover_checklist || []), { title, done: false }];
                          updateClientProject(project.id, { handover_checklist: updated });
                          setNewHandoverTitle({ ...newHandoverTitle, [project.id]: "" });
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </section>

                <section className="admin-offer-builder">
                  <div className="portal-panel-head">
                    <span>Ajánlatépítő</span>
                    <small>{project.offer_status === "sent" ? "Elküldve" : "Vázlat"}</small>
                  </div>
                  <div className="admin-offer-grid">
                    <input
                      defaultValue={project.offer_title ?? ""}
                      onBlur={(event) => updateClientProject(project.id, { offer_title: event.target.value })}
                      placeholder="Ajánlat címe"
                    />
                    <input
                      defaultValue={project.offer_timeline ?? ""}
                      onBlur={(event) => updateClientProject(project.id, { offer_timeline: event.target.value })}
                      placeholder="Ütemezés, például: 3-5 hét"
                    />
                    <textarea
                      defaultValue={project.offer_summary ?? ""}
                      onBlur={(event) => updateClientProject(project.id, { offer_summary: event.target.value })}
                      placeholder="Rövid, emberi összefoglaló: mit kap és miért ez a jó irány?"
                    />
                    <textarea
                      defaultValue={project.offer_scope ?? ""}
                      onBlur={(event) => updateClientProject(project.id, { offer_scope: event.target.value })}
                      placeholder="Scope: oldalak, funkciók, admin, integrációk..."
                    />
                    <textarea
                      defaultValue={project.offer_deliverables ?? ""}
                      onBlur={(event) => updateClientProject(project.id, { offer_deliverables: event.target.value })}
                      placeholder="Tételek soronként. Példa: Egyedi főoldal&#10;Admin dashboard&#10;Supabase adatkezelés"
                    />
                    <textarea
                      defaultValue={project.offer_note ?? ""}
                      onBlur={(event) => updateClientProject(project.id, { offer_note: event.target.value })}
                      placeholder="Megjegyzés az árhoz, fizetéshez vagy következő lépéshez..."
                    />
                  </div>
                  <div className="admin-price-row">
                    <label>
                      <span>Ajánlati ár</span>
                      <input
                        defaultValue={project.offer_price ?? ""}
                        inputMode="numeric"
                        onBlur={(event) =>
                          updateClientProject(project.id, {
                            offer_price: event.target.value ? Number(event.target.value) : null
                          })
                        }
                        placeholder="350000"
                      />
                    </label>
                    <strong>{formatPrice(project.offer_price, project.offer_currency || "Ft")}</strong>
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
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginTop: '16px', fontSize: '14px' }}>
                      <strong style={{ color: '#76ABAE' }}>Kliens Értékelése:</strong>
                      <div style={{ fontSize: '16px', color: '#FF9800', margin: '4px 0' }}>{"★".repeat(project.client_rating)}</div>
                      {project.client_review && <p style={{ fontStyle: 'italic', margin: 0 }}>"{project.client_review}"</p>}
                      <small style={{ color: 'rgba(255,255,255,0.5)' }}>Referencia engedélyezve: {project.reference_permitted ? "Igen" : "Nem"}</small>
                    </div>
                  )}
                </section>
              </div>
            </article>
          );
          })
        )}
      </div>

      <h2 className="admin-section-title">Ügyfélkapus ticketek</h2>
      <div className="ticket-inbox">
        {loading ? (
          <div className="ticket-card">
            <strong>Betöltés...</strong>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="ticket-card">
            <strong>Még nincs ügyfélkapus ticket.</strong>
            <span>A bejelentkezett ügyfelek kérdései itt jelennek meg.</span>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <article className="ticket-card" key={ticket.id}>
              <div className="ticket-person">
                <span className="status-pill">{ticket.status}</span>
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
                <textarea
                  value={clientTicketReplies[ticket.id] ?? ""}
                  onChange={(event) =>
                    setClientTicketReplies((current) => ({ ...current, [ticket.id]: event.target.value }))
                  }
                  disabled={ticket.status === "closed"}
                  placeholder={ticket.status === "closed" ? "Ez a ticket lezárva." : "Válasz az ügyfélkapuba..."}
                  style={{ minHeight: 110 }}
                />
                <button
                  className="button primary admin-reply-button"
                  onClick={() => sendClientTicketReply(ticket.id)}
                  type="button"
                  disabled={ticket.status === "closed" || !clientTicketReplies[ticket.id]?.trim()}
                >
                  Válasz küldése
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
