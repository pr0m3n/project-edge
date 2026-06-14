"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  sender: "customer" | "admin";
};

type StoredTicket = {
  email: string;
  id: string;
  name: string;
  token: string;
};

type TicketState = "open" | "answered" | "closed";

const initialForm = {
  name: "",
  email: "",
  message: ""
};

const storageKey = "projectedge-support-ticket";

export function SupportWidget() {
  const pathname = usePathname();
  const messagesRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [reply, setReply] = useState("");
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ticket, setTicket] = useState<StoredTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [ticketStatus, setTicketStatus] = useState<TicketState>("open");
  const [hasRated, setHasRated] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return;
    }

    try {
      setTicket(JSON.parse(stored));
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    if (!ticket || !open) {
      return;
    }

    loadMessages(ticket);
    const fallbackInterval = window.setInterval(() => loadMessages(ticket, true), 30000);
    const channel = supabase
      .channel(`support-ticket-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          filter: `ticket_id=eq.${ticket.id}`,
          schema: "public",
          table: "support_ticket_messages"
        },
        (payload) => {
          const nextMessage = payload.new as ChatMessage;
          setMessages((current) =>
            current.some((message) => message.id === nextMessage.id) ? current : [...current, nextMessage]
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          filter: `id=eq.${ticket.id}`,
          schema: "public",
          table: "support_tickets"
        },
        (payload) => {
          const nextTicket = payload.new as {
            rating?: number | null;
            rating_comment?: string | null;
            status?: TicketState;
          };
          if (nextTicket.status) {
            setTicketStatus(nextTicket.status);
          }
          setHasRated(Boolean(nextTicket.rating || nextTicket.rating_comment));
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(fallbackInterval);
      supabase.removeChannel(channel);
    };
  }, [ticket, open]);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, open]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/ugyfelkapu")) {
    return null;
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function loadMessages(currentTicket: StoredTicket, silent = false) {
    if (!silent) {
      setStatus("loading");
    }

    const response = await fetch(`/api/tickets/${currentTicket.id}?token=${currentTicket.token}`);

    if (!response.ok) {
      if (!silent) {
        setStatus("error");
        setNotice("Nem sikerült betölteni a beszélgetést.");
      }
      return;
    }

    const data = await response.json();
    setMessages(data.messages ?? []);
    setTicketStatus(data.ticket?.status ?? "open");
    setHasRated(Boolean(data.ticket?.rating || data.ticket?.ratingComment));
    if (!silent) {
      setStatus("idle");
    }
  }

  async function startConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setNotice("Küldöm az első üzenetet...");

    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    if (!response.ok) {
      setStatus("error");
      setNotice("Nem sikerült elküldeni. Nézd meg az email címet, vagy próbáld újra.");
      return;
    }

    const data = await response.json();
    const nextTicket = {
      email: data.ticket.email,
      id: data.ticket.id,
      name: data.ticket.name,
      token: data.ticket.visitorToken
    };

    window.localStorage.setItem(storageKey, JSON.stringify(nextTicket));
    setTicket(nextTicket);
    setMessages(data.messages ?? []);
    setTicketStatus(data.ticket.status ?? "open");
    setHasRated(false);
    setForm(initialForm);
    setStatus("success");
    setNotice("Megkaptam. Itt tudjuk folytatni a beszélgetést.");
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket || !reply.trim()) {
      return;
    }

    setStatus("loading");
    const response = await fetch(`/api/tickets/${ticket.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: reply,
        token: ticket.token
      })
    });

    if (!response.ok) {
      setStatus("error");
      setNotice("Nem sikerült elküldeni az üzenetet.");
      return;
    }

    const data = await response.json();
    setMessages((current) => [...current, data.message]);
    setReply("");
    setStatus("idle");
    setNotice("");
  }

  async function submitRating(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket || !rating) {
      setNotice("Válassz egy értékelést 1 és 5 között.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    const response = await fetch(`/api/tickets/${ticket.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating,
        ratingComment,
        token: ticket.token
      })
    });

    if (!response.ok) {
      setStatus("error");
      setNotice("Nem sikerült menteni az értékelést.");
      return;
    }

    setHasRated(true);
    setStatus("success");
    setNotice("Köszönöm a visszajelzést.");
  }

  function resetConversation() {
    window.localStorage.removeItem(storageKey);
    setTicket(null);
    setMessages([]);
    setTicketStatus("open");
    setRating(0);
    setRatingComment("");
    setHasRated(false);
    setNotice("");
    setStatus("idle");
  }

  return (
    <aside className={`support-widget ${open ? "open" : ""}`} aria-label="Ügyfélszolgálati chat">
      {open ? (
        <div className="support-panel chat">
          <div className="support-head">
            <div>
              <span>ProjectEdge support</span>
              <strong>{ticket ? "Beszélgetés" : "Írj nyugodtan"}</strong>
            </div>
            <button aria-label="Chat ablak bezárása" onClick={() => setOpen(false)} type="button">
              ×
            </button>
          </div>

          {ticket ? (
            <>
              <div className="chat-meta">
                <span>{ticket.name} · {ticketStatus === "closed" ? "lezárva" : "aktív"}</span>
                <button onClick={resetConversation} type="button">Új kérdés</button>
              </div>
              <div className="chat-messages" ref={messagesRef}>
                {messages.length === 0 ? (
                  <p className="chat-empty">A beszélgetés betöltése...</p>
                ) : (
                  messages.map((message) => (
                    <div className={`chat-bubble ${message.sender}`} key={message.id}>
                      <p>{message.body}</p>
                    </div>
                  ))
                )}
              </div>
              <form className="chat-reply" onSubmit={sendReply}>
                <textarea
                  disabled={ticketStatus === "closed"}
                  required
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder={ticketStatus === "closed" ? "Ez a beszélgetés lezárva." : "Írd ide a válaszod..."}
                />
                <button className="button primary" disabled={status === "loading" || ticketStatus === "closed"} type="submit">
                  Küldés
                </button>
              </form>
              {ticketStatus === "closed" ? (
                <form className="support-rating" onSubmit={submitRating}>
                  <strong>{hasRated ? "Köszönöm az értékelést." : "Milyen volt a segítség?"}</strong>
                  {!hasRated ? (
                    <>
                      <div className="rating-row" role="radiogroup" aria-label="Ügyfélszolgálat értékelése">
                        {[1, 2, 3, 4, 5].map((value) => (
                          <button
                            aria-label={`${value} csillag`}
                            className={rating >= value ? "active" : ""}
                            key={value}
                            onClick={() => setRating(value)}
                            type="button"
                          >
                            ★
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={ratingComment}
                        onChange={(event) => setRatingComment(event.target.value)}
                        placeholder="Pár szóban megírhatod, mi volt jó vagy min javítsak."
                      />
                      <button className="button secondary" disabled={status === "loading"} type="submit">
                        Értékelés küldése
                      </button>
                    </>
                  ) : null}
                </form>
              ) : null}
            </>
          ) : (
            <form onSubmit={startConversation}>
              <input
                required
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Név"
              />
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="Email"
              />
              <textarea
                required
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder="Miben segíthetek?"
              />
              <button className="button primary" disabled={status === "loading"} type="submit">
                {status === "loading" ? "Küldés..." : "Beszélgetés indítása"}
              </button>
            </form>
          )}

          <p className={`support-notice ${status}`}>{notice}</p>
        </div>
      ) : null}
      <button className="support-trigger" onClick={() => setOpen((current) => !current)} type="button">
        <span />
        Chat
      </button>
    </aside>
  );
}
