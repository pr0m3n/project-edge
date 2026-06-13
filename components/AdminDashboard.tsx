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

export function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketMessages, setTicketMessages] = useState<Record<string, TicketMessage[]>>({});
  const [ticketReplies, setTicketReplies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const stats = useMemo(() => {
    return {
      total: leads.length,
      fresh: leads.filter((lead) => lead.status === "new").length,
      won: leads.filter((lead) => lead.status === "won").length,
      tickets: tickets.filter((ticket) => ticket.status === "open").length
    };
  }, [leads, tickets]);

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

    if (error || ticketError) {
      setMessage("Nem sikerült betölteni a leadeket. Ellenőrizd az admin jogosultságot és az RLS szabályokat.");
      setLoading(false);
      return;
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

    setLeads(data ?? []);
    setTickets(ticketData ?? []);
    setTicketMessages(groupedMessages);
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

    setTicketMessages((current) => ({
      ...current,
      [ticketId]: [...(current[ticketId] ?? []), data]
    }));
    setTicketReplies((current) => ({ ...current, [ticketId]: "" }));
    setTickets((current) =>
      current.map((ticket) => (ticket.id === ticketId ? { ...ticket, status: "answered" } : ticket))
    );
    setMessage("Válasz elküldve.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/admin";
  }

  useEffect(() => {
    loadLeads();
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

      <h2 className="admin-section-title">Ajánlatkérések</h2>
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
            <strong>Még nincs ajánlatkérés.</strong>
            <span>Amint valaki kitölti a főoldali űrlapot, itt fog megjelenni.</span>
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
    </div>
  );
}
