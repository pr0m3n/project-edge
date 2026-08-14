"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/lib/supabase/client";

type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  sender: "customer" | "admin";
  status?: "sending" | "sent" | "error";
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
const positionKey = "projectedge-chat-pos";
const reviewMessage = "Szeretnék egy rövid weboldal-áttekintést kérni. A weboldalam címe: ";

function formatTime(isoString: string) {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function SupportWidget() {
  const pathname = usePathname();
  const messagesRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
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

  // Draggable Chat Head State
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
    moved: false
  });

  // Mobile Bottom-Sheet Pull-Down to Close
  const sheetTouchStartRef = useRef<number>(0);

  // Load stored ticket & position
  useEffect(() => {
    formStartedAt.current = Date.now();
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        setTicket(JSON.parse(stored));
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    try {
      const storedPos = window.sessionStorage.getItem(positionKey);
      if (storedPos) {
        const parsed = JSON.parse(storedPos);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPos(parsed);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const loadMessages = useCallback(async (currentTicket: StoredTicket, silent = false) => {
    if (!silent) setStatus("loading");

    try {
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
      setMessages((current) => {
        // Keep any pending optimistic messages that haven't synced yet
        const serverMessages: ChatMessage[] = (data.messages ?? []).map((m: ChatMessage) => ({
          ...m,
          status: "sent" as const
        }));
        const pendingOptimistic = current.filter((m) => m.status === "sending");
        const existingIds = new Set(serverMessages.map((m) => m.id));
        const filteredPending = pendingOptimistic.filter((m) => !existingIds.has(m.id));
        return [...serverMessages, ...filteredPending];
      });

      setTicketStatus(data.ticket?.status ?? "open");
      setHasRated(Boolean(data.ticket?.rating || data.ticket?.ratingComment));
      if (!silent) setStatus("idle");
    } catch {
      if (!silent) {
        setStatus("error");
        setNotice("Hálózati hiba történt a beszélgetés betöltésekor.");
      }
    }
  }, []);

  // Poll when open
  useEffect(() => {
    if (!ticket || !open) {
      return;
    }

    loadMessages(ticket, true);
    const interval = window.setInterval(() => loadMessages(ticket, true), 12000);
    return () => window.clearInterval(interval);
  }, [ticket, open, loadMessages]);

  // Realtime Supabase Channel if authenticated / accessible
  useEffect(() => {
    if (!ticket || !open) return;

    const channel = supabase
      .channel(`ticket-live-${ticket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_ticket_messages",
          filter: `ticket_id=eq.${ticket.id}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((current) => {
            if (current.some((m) => m.id === newMsg.id || (m.status === "sending" && m.body === newMsg.body))) {
              return current.map((m) =>
                m.id === newMsg.id || (m.status === "sending" && m.body === newMsg.body)
                  ? { ...newMsg, status: "sent" }
                  : m
              );
            }
            return [...current, { ...newMsg, status: "sent" }];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ticket, open]);

  // Smooth Auto-scroll to bottom on message list change
  useEffect(() => {
    if (!open || !messagesRef.current) return;
    const el = messagesRef.current;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, open]);

  // Auto-resize reply textarea
  const handleReplyInput = (value: string) => {
    setReply(value);
    if (replyTextareaRef.current) {
      replyTextareaRef.current.style.height = "auto";
      replyTextareaRef.current.style.height = `${Math.min(replyTextareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Keyboard accessibility
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("input:not(.honeypot), textarea, button")?.focus();
    });

    function closeOnEscape(event: globalThis.KeyboardEvent) {
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

  // Open from custom CTA buttons on landing
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

  // --- DRAG & DROP LOGIC ---
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (open) return; // Don't drag while chat is actively open
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const rect = target.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: rect.left,
      posY: rect.top,
      moved: false
    };
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(dx, dy) > 5) {
      dragStartRef.current.moved = true;
    }

    const nextX = Math.max(12, Math.min(window.innerWidth - 120, dragStartRef.current.posX + dx));
    const nextY = Math.max(12, Math.min(window.innerHeight - 70, dragStartRef.current.posY + dy));
    setPos({ x: nextX, y: nextY });
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (!dragStartRef.current.moved) {
      // Count as a pure click!
      toggleOpen();
      return;
    }

    // Magnetic Snap to nearest screen edge (left or right)
    const currentX = pos?.x ?? dragStartRef.current.posX;
    const currentY = pos?.y ?? dragStartRef.current.posY;
    const snapToRight = currentX > window.innerWidth / 2;
    const finalX = snapToRight ? window.innerWidth - 110 : 20;
    const finalY = Math.max(20, Math.min(window.innerHeight - 80, currentY));

    const finalPos = { x: finalX, y: finalY };
    setPos(finalPos);

    try {
      window.sessionStorage.setItem(positionKey, JSON.stringify(finalPos));
    } catch {
      // Ignore
    }
  }

  function toggleOpen() {
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
    setOpen((c) => !c);
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // --- OPTIMISTIC START CONVERSATION ---
  async function startConversation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setNotice("");

    try {
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
      const nextTicket: StoredTicket = {
        email: data.ticket.email,
        id: data.ticket.id,
        name: data.ticket.name,
        token: data.ticket.visitorToken
      };

      window.localStorage.setItem(storageKey, JSON.stringify(nextTicket));
      setTicket(nextTicket);
      setMessages((data.messages ?? []).map((m: ChatMessage) => ({ ...m, status: "sent" })));
      setTicketStatus(data.ticket.status ?? "open");
      setHasRated(false);
      setForm(initialForm);
      setWebsite("");
      formStartedAt.current = Date.now();
      setStatus("idle");
      trackEvent("support_message_sent", { intent: entryIntent, first_message: true });
    } catch {
      setStatus("error");
      setNotice("Hálózati hiba. Kérlek próbáld újra.");
    }
  }

  // --- OPTIMISTIC INSTANT REPLY ---
  async function sendReply(event?: FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault();
    const messageText = reply.trim();
    if (!ticket || !messageText || ticketStatus === "closed") {
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      body: messageText,
      created_at: new Date().toISOString(),
      sender: "customer",
      status: "sending"
    };

    // Instant UI update (0ms lag)
    setMessages((current) => [...current, optimisticMsg]);
    setReply("");
    if (replyTextareaRef.current) {
      replyTextareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch(`/api/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Visitor-Token": ticket.token },
        body: JSON.stringify({ body: messageText })
      });

      if (!response.ok) {
        setMessages((current) =>
          current.map((m) => (m.id === optimisticId ? { ...m, status: "error" } : m))
        );
        setNotice("Nem sikerült elküldeni az üzenetet.");
        return;
      }

      const data = await response.json();
      setMessages((current) =>
        current.map((m) => (m.id === optimisticId ? { ...data.message, status: "sent" } : m))
      );
      setNotice("");
    } catch {
      setMessages((current) =>
        current.map((m) => (m.id === optimisticId ? { ...m, status: "error" } : m))
      );
      setNotice("Hálózati hiba küldéskor.");
    }
  }

  function handleComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendReply();
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
    try {
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
      setNotice("Köszönöm az értékelést!");
    } catch {
      setStatus("error");
      setNotice("Hiba történt az értékelés mentésekor.");
    }
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

  // Mobile sheet pull-down handlers
  function handleSheetTouchStart(e: React.TouchEvent) {
    sheetTouchStartRef.current = e.touches[0].clientY;
  }

  function handleSheetTouchMove(e: React.TouchEvent) {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - sheetTouchStartRef.current;
    if (deltaY > 90) {
      closePanel();
    }
  }

  const triggerStyle: React.CSSProperties = pos
    ? {
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        bottom: "auto",
        right: "auto"
      }
    : {
        bottom: "24px",
        right: "24px"
      };

  return (
    <>
      {/* Draggable Chat Trigger Head */}
      <div
        className={`support-trigger-container ${isDragging ? "dragging" : ""}`}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={triggerStyle}
      >
        <button
          aria-controls="support-dialog"
          aria-expanded={open}
          aria-label={open ? "Chat bezárása" : "Chat megnyitása"}
          className="support-trigger"
          ref={triggerRef}
          type="button"
        >
          <span className="support-trigger-badge" />
          Chat
        </button>
      </div>

      {/* Modern Glassmorphic / Bottom Sheet Panel */}
      {open ? (
        <div
          aria-labelledby="support-dialog-title"
          className="support-panel"
          id="support-dialog"
          ref={panelRef}
          role="dialog"
        >
          {/* Mobile Bottom-Sheet Drag Handle */}
          <div
            className="support-sheet-handle"
            onTouchMove={handleSheetTouchMove}
            onTouchStart={handleSheetTouchStart}
          />

          {/* iOS Style Header */}
          <div
            className="support-head"
            onTouchMove={handleSheetTouchMove}
            onTouchStart={handleSheetTouchStart}
          >
            <div className="support-head-info">
              <div className="support-avatar">
                PE
                <span className="support-avatar-online" />
              </div>
              <div className="support-head-titles">
                <strong id="support-dialog-title">
                  {ticket
                    ? ticket.name
                    : entryIntent === "review"
                      ? "Weboldal áttekintés"
                      : "ProjectEdge Chat"}
                </strong>
                <span>
                  <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#00E676" }} />
                  {ticketStatus === "closed" ? "Beszélgetés lezárva" : "Elérhető • Gyors válasz"}
                </span>
              </div>
            </div>
            <button
              aria-label="Chat ablak bezárása"
              className="support-head-close"
              onClick={closePanel}
              type="button"
            >
              ×
            </button>
          </div>

          {ticket ? (
            <>
              <div className="chat-meta">
                <span>{ticket.email} · {ticketStatus === "closed" ? "lezárva" : "aktív"}</span>
                <button onClick={resetConversation} type="button">Új téma</button>
              </div>

              {/* Message Wall */}
              <div className="chat-messages" ref={messagesRef}>
                {messages.length === 0 ? (
                  <p className="chat-empty">Beszélgetés betöltése…</p>
                ) : (
                  messages.map((message) => (
                    <div
                      className={`chat-bubble ${message.sender} ${message.status === "sending" ? "sending" : ""}`}
                      key={message.id}
                    >
                      <p>{message.body}</p>
                      <div className="chat-bubble-time">
                        {formatTime(message.created_at)}
                        {message.sender === "customer" && (
                          <span>{message.status === "sending" ? " • küldés…" : message.status === "error" ? " • ⚠️ hiba" : " • ✓"}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Modern Composer */}
              <form className="chat-composer" onSubmit={sendReply}>
                <textarea
                  disabled={ticketStatus === "closed"}
                  maxLength={5000}
                  onChange={(e) => handleReplyInput(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder={
                    ticketStatus === "closed"
                      ? "Ez a beszélgetés lezárult."
                      : "Írj üzenetet… (Enter a küldéshez)"
                  }
                  ref={replyTextareaRef}
                  rows={1}
                  value={reply}
                />
                <button
                  aria-label="Üzenet küldése"
                  className="chat-send-button"
                  disabled={!reply.trim() || ticketStatus === "closed"}
                  type="submit"
                >
                  <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </button>
              </form>

              {/* Rating Section on Closed Ticket */}
              {ticketStatus === "closed" && (
                <form className="support-rating" onSubmit={submitRating}>
                  <strong>{hasRated ? "Köszönöm az értékelést!" : "Hogy tetszett a segítségünk?"}</strong>
                  {!hasRated && (
                    <>
                      <div aria-label="Ügyfélszolgálat értékelése" className="rating-row" role="radiogroup">
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
                        onChange={(e) => setRatingComment(e.target.value)}
                        placeholder="Röviden leírhatod a véleményed…"
                        rows={2}
                        value={ratingComment}
                      />
                      <button className="button secondary" disabled={status === "loading"} type="submit">
                        Értékelés beküldése
                      </button>
                    </>
                  )}
                </form>
              )}
            </>
          ) : (
            <form className="initial-form" onSubmit={startConversation}>
              <input
                aria-hidden="true"
                autoComplete="off"
                className="honeypot"
                name="website"
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                type="text"
                value={website}
              />
              <input
                maxLength={120}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Neved"
                required
                value={form.name}
              />
              <input
                maxLength={160}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="Email címed"
                required
                type="email"
                value={form.email}
              />
              <textarea
                maxLength={5000}
                onChange={(e) => updateField("message", e.target.value)}
                placeholder={
                  entryIntent === "review"
                    ? "Írd be a weboldalad címét és röviden, miben kérsz véleményt."
                    : "Miben segíthetünk? Írd meg bátran!"
                }
                required
                rows={3}
                value={form.message}
              />
              <button className="button primary" disabled={status === "loading"} type="submit">
                {status === "loading" ? "Beszélgetés indítása…" : "Üzenet küldése"}
              </button>
            </form>
          )}

          {notice && <p className={`support-notice ${status}`}>{notice}</p>}
        </div>
      ) : null}
    </>
  );
}
