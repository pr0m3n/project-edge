"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

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
const reviewMessage = "Szeretnék egy rövid weboldal-áttekintést kérni. A weboldalam címe: ";

export function SupportWidget() {
  const pathname = usePathname();
  const messagesRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const formStartedAt = useRef(0);
  const [open, setOpen] = useState(false);
  const [entryIntent, setEntryIntent] = useState<"contact" | "review">("contact");
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
  const [website, setWebsite] = useState("");

  const loadMessages = useCallback(async (currentTicket: StoredTicket, silent = false) => {
    if (!silent) setStatus("loading");

    const response = await fetch(`/api/tickets/${currentTicket.id}`, {
      headers: { "X-Visitor-Token": currentTicket.token }
    });

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
    if (!silent) setStatus("idle");
  }, []);

  useEffect(() => {
    formStartedAt.current = Date.now();
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

    return () => {
      window.clearInterval(fallbackInterval);
    };
  }, [ticket, open, loadMessages]);

  useEffect(() => {
    messagesRef.current?.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("input:not(.honeypot), textarea, button")?.focus();
    });
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    function openFromCallToAction(event: Event) {
      const detail = (event as CustomEvent<{ intent?: "contact" | "review" }>).detail;
      const nextIntent = detail?.intent === "review" ? "review" : "contact";
      setEntryIntent(nextIntent);
      setOpen(true);
      formStartedAt.current = Date.now();
      trackEvent("support_opened", { intent: nextIntent, source: "cta" });
      if (!ticket) {
        setForm((current) => ({
          ...current,
          message:
            nextIntent === "review"
              ? current.message || reviewMessage
              : current.message === reviewMessage
                ? ""
                : current.message
        }));
      }
    }

    window.addEventListener("projectedge:open-support", openFromCallToAction);
    return () => window.removeEventListener("projectedge:open-support", openFromCallToAction);
  }, [ticket]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/ugyfelkapu")) {
    return null;
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function startConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setNotice("Küldöm az első üzenetet...");

    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, website, startedAt: formStartedAt.current })
    });

    if (!response.ok) {
      setStatus("error");
      setNotice("Nem sikerült elküldeni. Nézd meg az email címet, vagy próbáld újra.");
      return;
    }

    const data = await response.json();
    const emailFailed = data.emailSent === false;
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
    setWebsite("");
    formStartedAt.current = Date.now();
    setStatus(emailFailed ? "error" : "success");
    setNotice(emailFailed
      ? "Az üzenetet elmentettem, de az értesítő email nem ment ki. Rövidesen ellenőrizzük."
      : "Megkaptam. Itt tudjuk folytatni a beszélgetést.");
    trackEvent("support_message_sent", { intent: entryIntent, first_message: true });
  }

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket || !reply.trim()) {
      return;
    }

    setStatus("loading");
    const response = await fetch(`/api/tickets/${ticket.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Visitor-Token": ticket.token },
      body: JSON.stringify({ body: reply })
    });

    if (!response.ok) {
      setStatus("error");
      setNotice("Nem sikerült elküldeni az üzenetet.");
      return;
    }

    const data = await response.json();
    setMessages((current) => [...current, data.message]);
    setReply("");
    if (data.emailSent === false) {
      setStatus("error");
      setNotice("Az üzenetet elmentettem, de az értesítő email nem ment ki. Rövidesen ellenőrizzük.");
    } else {
      setStatus("idle");
      setNotice("");
    }
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
      headers: { "Content-Type": "application/json", "X-Visitor-Token": ticket.token },
      body: JSON.stringify({ rating, ratingComment })
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
    formStartedAt.current = Date.now();
  }

  function closePanel() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <aside className={`support-widget ${open ? "open" : ""}`} aria-label="Ügyfélszolgálati chat">
      {open ? (
        <div
          aria-labelledby="support-dialog-title"
          className="support-panel chat"
          id="support-dialog"
          ref={panelRef}
          role="dialog"
        >
          <div className="support-head">
            <div>
              <span>ProjectEdge kapcsolat</span>
              <strong id="support-dialog-title">
                {ticket
                  ? "Beszélgetés"
                  : entryIntent === "review"
                    ? "Kérj rövid áttekintést"
                    : "Írj nyugodtan"}
              </strong>
            </div>
            <button aria-label="Chat ablak bezárása" onClick={closePanel} type="button">
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
                  maxLength={5000}
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
                        maxLength={1000}
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
                aria-hidden="true"
                autoComplete="off"
                className="honeypot"
                name="website"
                onChange={(event) => setWebsite(event.target.value)}
                tabIndex={-1}
                type="text"
                value={website}
              />
              <input
                maxLength={120}
                required
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Név"
              />
              <input
                maxLength={160}
                required
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="Email"
              />
              <textarea
                maxLength={5000}
                required
                value={form.message}
                onChange={(event) => updateField("message", event.target.value)}
                placeholder={
                  entryIntent === "review"
                    ? "Írd be a weboldalad címét és röviden, miben kérsz véleményt."
                    : "Miben segíthetek?"
                }
              />
              <button className="button primary" disabled={status === "loading"} type="submit">
                {status === "loading" ? "Küldés..." : "Beszélgetés indítása"}
              </button>
            </form>
          )}

          <p className={`support-notice ${status}`}>{notice}</p>
        </div>
      ) : null}
      <button
        aria-controls="support-dialog"
        aria-expanded={open}
        aria-label={open ? "Chat bezárása" : "Chat megnyitása"}
        className="support-trigger"
        onClick={() => {
          if (!open) {
            formStartedAt.current = Date.now();
            trackEvent("support_opened", { intent: "contact", source: "floating_button" });
            setEntryIntent("contact");
            if (!ticket) {
              setForm((current) => ({
                ...current,
                message: current.message === reviewMessage ? "" : current.message
              }));
            }
          }
          setOpen((current) => !current);
        }}
        ref={triggerRef}
        type="button"
      >
        <span />
        Chat
      </button>
    </aside>
  );
}
