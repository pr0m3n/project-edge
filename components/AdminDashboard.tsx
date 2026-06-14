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
  ["in_progress", "Kivitelezés"],
  ["review", "Átnézés"],
  ["launched", "Élesítve"],
  ["paused", "Szünetel"],
  ["closed", "Lezárva"]
];

const projectStatusLabel = Object.fromEntries(projectStatuses);

const projectFlow = [
  ["request_received", "Igény"],
  ["planning", "Tervezés"],
  ["offer_sent", "Ajánlat"],
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
    patch: Partial<
      Pick<
        ClientProject,
        | "status"
        | "next_step"
        | "admin_notes"
        | "offer_title"
        | "offer_summary"
        | "offer_scope"
        | "offer_timeline"
        | "offer_deliverables"
        | "offer_price"
        | "offer_currency"
        | "offer_note"
        | "offer_status"
        | "offer_sent_at"
      >
    >
  ) {
    const { error } = await supabase.from("client_projects").update(patch).eq("id", id);

    if (error) {
      setMessage("Nem sikerült menteni az ügyfélprojektet.");
      return;
    }

    setClientProjects((current) => current.map((project) => (project.id === id ? { ...project, ...patch } : project)));
    setMessage("Ügyfélprojekt mentve.");
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
    const body = clientTicketReplies[ticketId]?.trim();
    if (!body) {
      return;
    }

    const { data, error } = await supabase
      .from("client_ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender: "admin",
        body
      })
      .select("*")
      .single();

    if (error || !data) {
      setMessage("Nem sikerült elküldeni az ügyfélkapus választ.");
      return;
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
        <button className="button ghost" onClick={signOut} style={{ color: "#f5f5f5", borderColor: "rgba(245,245,245,.24)" }}>
          Kilépés
        </button>
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
                  placeholder="Írd ide a válaszod, majd küldd el..."
                  style={{ minHeight: 110 }}
                />
                <button
                  className="button primary admin-reply-button"
                  onClick={() => sendTicketReply(ticket.id)}
                  type="button"
                >
                  Válasz küldése
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <h2 className="admin-section-title">Ügyfélkapus projektek</h2>
      <div className="admin-project-board">
        {loading ? (
          <div className="ticket-card">
            <strong>Betöltés...</strong>
          </div>
        ) : clientProjects.length === 0 ? (
          <div className="ticket-card">
            <strong>Még nincs ügyfélkapus projekt.</strong>
            <span>A regisztrált ügyfelek projektindításai itt jelennek meg.</span>
          </div>
        ) : (
          clientProjects.map((project) => {
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
            <article className="admin-project-card" key={project.id}>
              <header className="admin-project-top">
                <div>
                  <span className="status-pill">{projectStatusLabel[project.status] ?? project.status}</span>
                  <h3>{project.title}</h3>
                  <p>{brief["Cél"] || project.goals}</p>
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
                    {projectStatuses.map(([value, label]) => (
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
                  <button className="button secondary" onClick={() => primeOffer(project)} type="button">
                    Ajánlat sablon előkészítése
                  </button>
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
        ) : clientTickets.length === 0 ? (
          <div className="ticket-card">
            <strong>Még nincs ügyfélkapus ticket.</strong>
            <span>A bejelentkezett ügyfelek kérdései itt jelennek meg.</span>
          </div>
        ) : (
          clientTickets.map((ticket) => (
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
                  placeholder="Válasz az ügyfélkapuba..."
                  style={{ minHeight: 110 }}
                />
                <button
                  className="button primary admin-reply-button"
                  onClick={() => sendClientTicketReply(ticket.id)}
                  type="button"
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
