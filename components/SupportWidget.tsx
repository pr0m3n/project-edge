"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

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
const greetKey = "projectedge-chat-greeted";
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
  /**
   * Honnan indult a beszélgetés — a ticket `source` mezőjébe megy, és az
   * adminban ez különbözteti meg a főoldali gyors sávból érkező érdeklődőt a
   * lebegő chatből érkezőtől. A szerver úgyis szűri az értéket, ez itt csak
   * annyit tud, amennyit a megnyitó esemény mondott.
   */
  const [source, setSource] = useState("projectedge.hu");
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

  /** A köszöntő buborék: munkamenetenként egyszer, késleltetve. */
  const [greeting, setGreeting] = useState(false);
  /**
   * Az első üzenet két lépésben megy el.
   *
   * Korábban a chat megnyitásakor egy háromsoros űrlap fogadta a látogatót
   * (Neved / Email címed / üzenet), és ez KAPCSOLATI ŰRLAPNAK látszott — mintha
   * ide beírna valamit, aztán majd valaki emailben keresi. Pedig ez egy
   * beszélgetés. Innentől a chat felülete fogad: egy üzenet a stúdiótól és egy
   * beíró mező. A nevet és az emailt csak akkor kérjük, amikor a látogató már
   * megírta, amit akart — ott már van miért megadnia.
   */
  const [draftStage, setDraftStage] = useState<"compose" | "identify">("compose");

  // Draggable Chat Head State
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Az `active` szándékosan ref és nem state: a pointerdown → pointerup páros
  // egy gyors koppintásnál ugyanabba a React batch-be esik, így a state még a
  // régi értékén állna, és a megnyitás elmaradna.
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    posX: number;
    posY: number;
    moved: boolean;
    active: boolean;
  }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
    moved: false,
    active: false
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

  /* ── A köszöntés ───────────────────────────────────────────────────
        Egy kis buborék a chat gomb fölött: „itt vagyok, írj nyugodtan".

        Szándékosan visszafogott: munkamenetenként EGYSZER jelenik meg, 9
        másodperc után (a főoldalon átlagosan 32 másodpercet töltenek, tehát
        ennyi idő alatt már látszik, de nem ugrik az arcába), és magától
        elmegy 13 másodperc múlva. Aki már írt egy ticketet, annak nem jön
        elő — ő nem új látogató, akit meg kell szólítani. ── */
  useEffect(() => {
    if (open || ticket) return;
    let shown = false;
    try {
      shown = window.sessionStorage.getItem(greetKey) === "1";
    } catch {
      /* Privát módban a sessionStorage tiltott lehet — akkor inkább nem
         köszönünk, mint hogy minden oldalváltásnál újra felugorjon. */
      return;
    }
    if (shown) return;

    const timers: number[] = [];
    timers.push(
      window.setTimeout(() => {
        try {
          window.sessionStorage.setItem(greetKey, "1");
        } catch {
          /* nem baj */
        }
        setGreeting(true);
        timers.push(window.setTimeout(() => setGreeting(false), 13_000));
      }, 9_000)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [open, ticket]);

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



  // Smooth Auto-scroll to bottom on message list change
  useEffect(() => {
    if (!open || !messagesRef.current) return;
    const el = messagesRef.current;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: "smooth"
    });
    // A `draftStage` is szerepel: az első üzenet elküldésekor két új buborék
    // kerül a falra, és azoknak látszaniuk kell görgetés nélkül.
  }, [messages, open, draftStage]);

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
      const detail = (event as CustomEvent<{ intent?: "contact" | "review"; message?: string; source?: string }>).detail;
      const nextIntent = detail?.intent === "review" ? "review" : "contact";
      /* A gyors sávból KÉSZ üzenettel érkezünk: a látogató már leírta, mit
         akar, ezért az írómezőt átugorjuk, és rögtön a „hogy szólíthatlak"
         képernyő jön. Enélkül újra kellene gépelnie ugyanazt. */
      const handedMessage = typeof detail?.message === "string" ? detail.message.trim().slice(0, 5000) : "";
      setEntryIntent(nextIntent);
      setSource(detail?.source === "gyorssav" ? "gyorssav" : "projectedge.hu");
      setOpen(true);
      formStartedAt.current = Date.now();
      trackEvent("support_opened", { intent: nextIntent, source: detail?.source === "gyorssav" ? "quick_lane" : "cta" });
      if (!ticket) {
        setForm((current) => ({
          ...current,
          message:
            handedMessage ||
            (nextIntent === "review"
              ? current.message || reviewMessage
              : current.message === reviewMessage
                ? ""
                : current.message)
        }));
        setDraftStage(handedMessage ? "identify" : "compose");
      }
    }

    window.addEventListener("projectedge:open-support", openFromCallToAction);
    return () => window.removeEventListener("projectedge:open-support", openFromCallToAction);
  }, [ticket]);

  /**
   * Érkezés a beszélgetés-folytató magic linkről (`/beszelgetes/…` → `/?chat=open`).
   * A ticket ekkorra már a localStorage-ban van, csak ki kell nyitni a panelt.
   * A paramétert egyből eltávolítjuk, hogy egy frissítés ne nyissa meg újra.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("chat") !== "open") return;
    setOpen(true);
    formStartedAt.current = Date.now();
    trackEvent("support_opened", { intent: "contact", source: "magic_link" });
    params.delete("chat");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, []);

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
      moved: false,
      active: true
    };
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current.active) return;
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
    if (!dragStartRef.current.active) return;
    dragStartRef.current.active = false;
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
    /* A köszöntésnek nincs több dolga, ha egyszer megnyílt a chat. */
    setGreeting(false);
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
        body: JSON.stringify({ ...form, source, website, startedAt: formStartedAt.current })
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
      setDraftStage("compose");
      setSource("projectedge.hu");
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

  /** Az első üzenet megírva — jöhet a név és az email. */
  function goToIdentify(event?: FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault();
    if (!form.message.trim()) return;
    setNotice("");
    setDraftStage("identify");
  }

  function handleDraftKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      goToIdentify();
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

  // Alaphelyzetben nincs inline pozíció: így a `.support-widget` CSS-e (és vele
  // a mobil `env(safe-area-inset-bottom)` szabály) tud érvényesülni. Inline
  // stílust csak akkor adunk, ha a felhasználó elhúzta a buborékot.
  const triggerStyle: React.CSSProperties = pos
    ? {
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        bottom: "auto",
        right: "auto"
      }
    : {};

  return (
    <>
      {/* Draggable Chat Trigger Head */}
      <div
        className={`support-widget support-trigger-container ${open ? "open" : ""} ${isDragging ? "dragging" : ""}`}
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
          onKeyDown={(event) => {
            // A megnyitást a konténer pointer-eseményei intézik (a húzás miatt),
            // azok viszont billentyűzetről nem keletkeznek. Enter/Space nélkül
            // a chat billentyűzettel elérhetetlen lenne.
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleOpen();
            }
          }}
          ref={triggerRef}
          type="button"
        >
          {/* Korábban csak egy zöld pont volt a narancs körben — telefonon a
              felirat el is tűnik (`font-size: 0`), tehát semmi nem jelezte,
              hogy ez egy chat. Innentől valódi ikon van benne. */}
          <svg aria-hidden="true" className="support-trigger-icon" fill="none" viewBox="0 0 24 24">
            <path
              d="M20.5 11.7c0 4-3.9 7.2-8.7 7.2-1 0-2-.14-2.9-.4L4 20l1.2-3.4c-1-1.2-1.6-2.7-1.6-4.4C3.6 7.7 7.5 4.5 12.3 4.5s8.2 3.2 8.2 7.2Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
            <circle cx="8.9" cy="11.7" fill="currentColor" r="1.05" />
            <circle cx="12.3" cy="11.7" fill="currentColor" r="1.05" />
            <circle cx="15.7" cy="11.7" fill="currentColor" r="1.05" />
          </svg>
          <span className="support-trigger-label">Chat</span>
          <span className="support-trigger-badge" />
        </button>

        {/* A köszöntés a húzható konténeren BELÜL van, hogy elhúzott gombnál is
            vele maradjon. A rajta lévő koppintás a konténer pointer-eseményein
            keresztül megnyitja a chatet — kivéve a bezáró ×-et, ami leállítja
            az esemény terjedését, különben a bezárás is megnyitná. */}
        {greeting && !open ? (
          <div className="support-greeting" role="status">
            <p>
              <strong>Szia, Patrik vagyok.</strong>
              Kérdésed van? Írj nyugodtan itt — nem kell telefonálnod.
            </p>
            <button
              aria-label="Köszöntés bezárása"
              className="support-greeting-close"
              onPointerDown={(event) => {
                event.stopPropagation();
                setGreeting(false);
              }}
              type="button"
            >
              ×
            </button>
          </div>
        ) : null}
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
                  {/* Az érkező üzenetről azonnal megy értesítés, ezért a valóság
                      jellemzően percekben mérhető — nem munkanapokban. */}
                  {ticketStatus === "closed" ? "Beszélgetés lezárva" : "Általában pár percen belül válaszolok"}
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
            /* Nem űrlap, hanem CHAT. Ugyanaz az üzenetfal és beíró mező, mint
               futó beszélgetésnél — csak a stúdió üzenete van benne előre.
               A háromsoros „Neved / Email címed / üzenet" űrlap kapcsolati
               űrlapnak látszott, és a látogatók emailes megkeresésre
               számítottak tőle, nem beszélgetésre. */
            <>
              <div className="chat-messages" ref={messagesRef}>
                <div className="chat-bubble admin">
                  <p>
                    {entryIntent === "review"
                      ? "Szia! Küldd el a weboldalad címét, és leírom, min változtatnék rajta."
                      : "Szia, Patrik vagyok. Írd meg, miben segíthetek — nem kell telefonálnod."}
                  </p>
                </div>

                {draftStage === "identify" ? (
                  <>
                    <div className="chat-bubble customer">
                      <p>{form.message}</p>
                      <div className="chat-bubble-time">
                        <button className="chat-draft-edit" onClick={() => setDraftStage("compose")} type="button">
                          módosítom
                        </button>
                      </div>
                    </div>
                    <div className="chat-bubble admin">
                      <p>Megvan. Már csak azt áruld el, hogy szólíthatlak, és hova írjak, ha épp nem vagy az oldalon.</p>
                    </div>
                  </>
                ) : null}
              </div>

              {draftStage === "compose" ? (
                <form className="chat-composer" onSubmit={goToIdentify}>
                  <textarea
                    autoFocus
                    maxLength={5000}
                    onChange={(e) => updateField("message", e.target.value)}
                    onKeyDown={handleDraftKeyDown}
                    placeholder={
                      entryIntent === "review"
                        ? "A weboldalad címe, és miben kérsz véleményt…"
                        : "Írj üzenetet… (Enter a küldéshez)"
                    }
                    rows={1}
                    value={form.message}
                  />
                  <button
                    aria-label="Tovább"
                    className="chat-send-button"
                    disabled={!form.message.trim()}
                    type="submit"
                  >
                    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
                      <path d="M22 2L11 13" />
                      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                    </svg>
                  </button>
                </form>
              ) : (
                <form className="chat-identify" onSubmit={startConversation}>
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
                  <div className="chat-identify-fields">
                    <input
                      autoComplete="name"
                      autoFocus
                      maxLength={120}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Neved"
                      required
                      value={form.name}
                    />
                    <input
                      autoComplete="email"
                      inputMode="email"
                      maxLength={160}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="Email címed"
                      required
                      type="email"
                      value={form.email}
                    />
                  </div>
                  <button className="button primary" disabled={status === "loading"} type="submit">
                    {status === "loading" ? "Küldés…" : "Üzenet küldése"}
                  </button>
                  <small>Az emailre csak azért van szükség, hogy a válaszom elérjen, ha közben becsuktad az oldalt.</small>
                </form>
              )}
            </>
          )}

          {notice && <p className={`support-notice ${status}`}>{notice}</p>}
        </div>
      ) : null}
    </>
  );
}
