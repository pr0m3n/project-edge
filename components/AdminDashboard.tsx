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

  async function updateClientProject(id: string, patch: Partial<Pick<ClientProject, "status" | "next_step" | "admin_notes">>) {
    const { error } = await supabase.from("client_projects").update(patch).eq("id", id);

    if (error) {
      setMessage("Nem sikerült menteni az ügyfélprojektet.");
      return;
    }

    setClientProjects((current) => current.map((project) => (project.id === id ? { ...project, ...patch } : project)));
    setMessage("Ügyfélprojekt mentve.");
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
      <div className="ticket-inbox">
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
          clientProjects.map((project) => (
            <article className="ticket-card client-project-card" key={project.id}>
              <div className="ticket-person">
                <span className="status-pill">{project.status}</span>
                <strong>{project.title}</strong>
                <p>{project.contact_name || "Ügyfél"}</p>
                {project.contact_email ? <a href={`mailto:${project.contact_email}`}>{project.contact_email}</a> : null}
                <p>{project.company || "Nincs cégnév"}</p>
                {project.website ? <a href={project.website}>{project.website}</a> : null}
              </div>
              <div className="ticket-conversation">
                <strong>{project.project_type}</strong>
                <p>{project.goals}</p>
                <span className="status-pill">{project.budget || "nincs megadva"}</span>
              </div>
              <div className="ticket-actions">
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
                  placeholder="Következő lépés, amit az ügyfél lát..."
                  style={{ minHeight: 92 }}
                />
                <textarea
                  defaultValue={project.admin_notes ?? ""}
                  onBlur={(event) => updateClientProject(project.id, { admin_notes: event.target.value })}
                  placeholder="Belső jegyzet..."
                  style={{ minHeight: 92 }}
                />
              </div>
            </article>
          ))
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
