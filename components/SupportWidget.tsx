"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

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
  const [ticket, setTicket] = useState<StoredTicket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
    const interval = window.setInterval(() => loadMessages(ticket, true), 12000);
    return () => window.clearInterval(interval);
  }, [ticket, open]);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, open]);

  if (pathname.startsWith("/admin")) {
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

  function resetConversation() {
    window.localStorage.removeItem(storageKey);
    setTicket(null);
    setMessages([]);
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
                <span>{ticket.name}</span>
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
                  required
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  placeholder="Írd ide a válaszod..."
                />
                <button className="button primary" disabled={status === "loading"} type="submit">
                  Küldés
                </button>
              </form>
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
