"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent, trackLeadConversion } from "@/lib/analytics";

type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  sender: "customer" | "admin" | "bot";
  status?: "sending" | "sent" | "error";
};

/**
 * A böngészőben tárolt beszélgetés. AI-beszélgetésnél a név és az email még
 * üres — csak az átadáskor kerül bele, amikor a látogató megadja.
 */
type StoredTicket = {
  email: string;
  id: string;
  name: string;
  token: string;
};

/** `bot` = az AI-asszisztens viszi, Patrik még nem vette át. */
type TicketState = "bot" | "open" | "answered" | "closed";

const initialForm = {
  name: "",
  email: "",
  message: ""
};

const storageKey = "projectedge-support-ticket";
const positionKey = "projectedge-chat-pos";
const greetKey = "projectedge-chat-greeted";
const reviewMessage = "Szeretnék egy rövid weboldal-áttekintést kérni. A weboldalam címe: ";

/** Az AI-nak szánt üzenet felső határa — a szerver is ennyit enged. */
const BOT_MESSAGE_LIMIT = 2000;

/** Egykoppintásos kezdőkérdések az üres AI-chatben. */
const STARTER_QUESTIONS = [
  "Mennyibe kerül egy weboldal?",
  "Mennyi idő alatt készül el?",
  "Bérlés vagy vásárlás — mi a különbség?"
];

/**
 * A bot válaszában a `projectedge.hu/…` hivatkozások kattinthatók. CSAK a
 * saját domain lesz link, relatív útvonalként: a modell szövegéből így sem
 * külső cím, sem `javascript:` nem kerülhet egy `href`-be.
 */
function renderBotText(text: string) {
  const parts = text.split(/((?:https?:\/\/)?(?:www\.)?projectedge\.hu(?:\/[a-z0-9\-/]*)?)/gi);
  return parts.map((part, index) => {
    const match = part.match(/^(?:https?:\/\/)?(?:www\.)?projectedge\.hu(\/[a-z0-9\-/]*)?$/i);
    if (!match) return part;
    const path = (match[1] ?? "/").replace(/\/+$/, "") || "/";
    return (
      <a href={path} key={index}>
        {part.replace(/^https?:\/\//i, "")}
      </a>
    );
  });
}

function formatTime(isoString: string) {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function SendIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

function TypingBubble() {
  return (
    <div aria-label="Az asszisztens válaszol" className="chat-typing-bubble" role="status">
      <span className="chat-typing-dot" />
      <span className="chat-typing-dot" />
      <span className="chat-typing-dot" />
    </div>
  );
}

/** Egy buborék a falon. A bot üzenete az admin oldalán ül, „AI" jelöléssel. */
function MessageBubble({ message }: { message: ChatMessage }) {
  const side = message.sender === "customer" ? "customer" : "admin";
  return (
    <div
      className={`chat-bubble ${side} ${message.sender === "bot" ? "bot" : ""} ${message.status === "sending" ? "sending" : ""}`}
    >
      <p>{message.sender === "bot" ? renderBotText(message.body) : message.body}</p>
      <div className="chat-bubble-time">
        {message.sender === "bot" ? <span className="chat-bot-tag">AI</span> : null}
        {message.sender === "admin" ? <span className="chat-bot-tag human">Patrik</span> : null}
        {formatTime(message.created_at)}
        {message.sender === "customer" && (
          <span>{message.status === "sending" ? " • küldés…" : message.status === "error" ? " • ⚠️ hiba" : " • ✓"}</span>
        )}
      </div>
    </div>
  );
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
  /**
   * Ki válaszol egy ÚJ beszélgetésben: az AI-asszisztens, vagy egyből Patrik.
   *
   * Alapból az AI: regisztráció és email nélkül, azonnal válaszol. Egyből
   * Patrikhoz megy a weboldal-áttekintés kérése és a főoldali gyors sáv (ott a
   * látogató már kész üzenettel érkezik, és Patriktól vár választ), meg az,
   * aki a „Patriknak írnék" gombot választja.
   */
  const [chatMode, setChatMode] = useState<"bot" | "human">("bot");
  /** Az AI éppen válaszol — gépelésjelző, és addig nem küldhető újabb üzenet. */
  const [botThinking, setBotThinking] = useState(false);
  /**
   * Az átadás űrlapja (név + email) látszik-e. Akkor nyílik ki, ha az AI
   * átadást javasolt, vagy a látogató maga kérte Patrikot.
   */
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffInitiator, setHandoffInitiator] = useState<"bot" | "visitor">("bot");
  /** Az átadás megtörtént ebben a munkamenetben — egy rövid visszaigazoló sor. */
  const [handoffDone, setHandoffDone] = useState(false);
  /** Amíg egy AI-kérés fut, a háttérfrissítés nem írhatja felül az üzenetfalat. */
  const botBusyRef = useRef(false);

  // Draggable Chat Head State
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Az `active` szándékosan ref és nem state: a pointerdown → pointerup páros
  // egy gyors koppintásnál ugyanabba a React batch-be esik, így a state még a
  // régi értékén állna, és a megnyitás elmaradna.
  // A `drag` hamis érintésnél: telefonon a buborék nem húzható (a
  // hüvelykujj görgetés közben folyton elmozdította), ott csak koppintani lehet.
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    posX: number;
    posY: number;
    moved: boolean;
    active: boolean;
    drag: boolean;
  }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
    moved: false,
    active: false,
    drag: false
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
      // Érintőképernyőn nincs húzás, tehát egy korábban elmentett pozíció sem
      // érvényes: a buborék mindig a helyén, a sarokban van.
      if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) {
        window.sessionStorage.removeItem(positionKey);
        return;
      }
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
      // Futó AI-kérés közben a szerver már látja a látogató üzenetét, a kliens
      // viszont még az optimista másolatát mutatja — egy frissítés most
      // duplán rajzolná ki. A válasz megérkezése úgyis felülírja a falat.
      if (botBusyRef.current) return;
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
    // kerül a falra, és azoknak látszaniuk kell görgetés nélkül. Ugyanígy a
    // gépelésjelző és az átadás utáni visszaigazoló sor.
  }, [messages, open, draftStage, botThinking, handoffDone]);

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
      setChatMode(nextIntent === "review" || handedMessage ? "human" : "bot");
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
    const drag = e.pointerType !== "touch";
    if (drag) target.setPointerCapture(e.pointerId);

    const rect = target.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: rect.left,
      posY: rect.top,
      moved: false,
      active: true,
      drag
    };
    if (drag) setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current.active) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.hypot(dx, dy) > (dragStartRef.current.drag ? 5 : 10)) {
      dragStartRef.current.moved = true;
    }
    // érintésnél a mozdulat csak azt dönti el, hogy koppintás volt-e
    if (!dragStartRef.current.drag) return;

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
    if (!dragStartRef.current.drag) return;

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

  /* A böngésző `pointercancel`-t küld, amikor egy a buborékon kezdett
     érintésből görgetés lesz. Ez nem koppintás: nem nyithat meg semmit. */
  function handlePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current.active) return;
    if (dragStartRef.current.drag) {
      dragStartRef.current.moved = true;
      handlePointerUp(e);
      return;
    }
    dragStartRef.current.active = false;
  }

  function toggleOpen() {
    /* A köszöntésnek nincs több dolga, ha egyszer megnyílt a chat. */
    setGreeting(false);
    if (!open) {
      formStartedAt.current = Date.now();
      trackEvent("support_opened", { intent: "contact", source: "floating_button" });
      setEntryIntent("contact");
      if (!ticket) setChatMode("bot");
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
      /* Ez a legalacsonyabb küszöbű VALÓDI megkeresés az oldalon: van üzenet,
         név és email, és keletkezett ticket. A konverzió szándékosan ITT sül
         el, nem a gyors sáv küldésénél (`BriefQuickLane`): az csak előtölti a
         chatet, a látogató a „hogy szólíthatlak" képernyőn még elpártolhat.
         Így egy megkeresés egyszer számít, és csak akkor, ha tényleg megvan. */
      trackLeadConversion("chat");
    } catch {
      setStatus("error");
      setNotice("Hálózati hiba. Kérlek próbáld újra.");
    }
  }

  // --- OPTIMISTIC INSTANT REPLY ---
  async function sendReply(event?: FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault();
    const messageText = reply.trim();
    if (!messageText) return;
    if (!ticket) {
      // Új AI-beszélgetés: az első kérdés hozza létre a ticketet.
      if (chatMode !== "bot" || botBusyRef.current) return;
      setReply("");
      resetReplyHeight();
      void askBot(messageText);
      return;
    }
    if (ticketStatus === "closed") return;
    if (ticketStatus === "bot") {
      if (botBusyRef.current) return;
      setReply("");
      resetReplyHeight();
      void askBot(messageText);
      return;
    }
    setReply("");
    resetReplyHeight();
    await postHumanMessage(messageText);
  }

  function resetReplyHeight() {
    if (replyTextareaRef.current) {
      replyTextareaRef.current.style.height = "auto";
    }
  }

  /** Üzenet Patriknak — a rendes, emberi beszélgetés útja. */
  async function postHumanMessage(messageText: string) {
    if (!ticket) return;
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

  /**
   * Kérdés az AI-asszisztensnek. Az első kérdés hozza létre a beszélgetést —
   * név és email nélkül —, a többi ugyanabba megy.
   */
  async function askBot(text: string) {
    const messageText = text.trim().slice(0, BOT_MESSAGE_LIMIT);
    if (!messageText || botBusyRef.current) return;

    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((current) => [
      ...current,
      { id: optimisticId, body: messageText, created_at: new Date().toISOString(), sender: "customer", status: "sending" }
    ]);
    setNotice("");
    botBusyRef.current = true;
    setBotThinking(true);

    try {
      /* A szerver az 1,5 másodpercen belül érkező első üzenetet botnak nézi.
         Egy kezdőkérdésre viszont egy ember is rákoppinthat ennyi idő alatt —
         ő ne kapjon hibát, csak egy pillanattal tovább lássa a gépelésjelzőt. */
      const earlyBy = ticket ? 0 : 1_600 - (Date.now() - formStartedAt.current);
      if (earlyBy > 0) await new Promise((resolve) => window.setTimeout(resolve, earlyBy));

      const response = await fetch("/api/support-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ticket ? { "X-Visitor-Token": ticket.token } : {})
        },
        body: JSON.stringify(
          ticket
            ? { ticketId: ticket.id, message: messageText }
            : { message: messageText, source, website, startedAt: formStartedAt.current }
        )
      });

      if (response.status === 409 && ticket) {
        /* Patrik közben átvette a beszélgetést (vagy lezárta). Az üzenet nem
           veszhet el: a rendes úton megy tovább hozzá. */
        const data = await response.json().catch(() => ({}));
        botBusyRef.current = false;
        setMessages((current) => current.filter((m) => m.id !== optimisticId));
        setTicketStatus(data.status === "closed" ? "closed" : "answered");
        if (data.status !== "closed") await postHumanMessage(messageText);
        return;
      }

      if (response.status === 404 && ticket) {
        /* A tárolt beszélgetés már nem létezik (törölték, vagy lejárt a
           token). Beragadás helyett tiszta lappal indulunk. */
        botBusyRef.current = false;
        resetConversation();
        setReply(messageText);
        setNotice("A korábbi beszélgetés már nem elérhető — küldd el újra a kérdésed.");
        return;
      }

      if (!response.ok) {
        setMessages((current) => current.map((m) => (m.id === optimisticId ? { ...m, status: "error" } : m)));
        setNotice(
          response.status === 429
            ? "Most túl sok üzenet érkezett. Várj egy kicsit, vagy írj Patriknak."
            : "Nem sikerült elküldeni. Próbáld újra."
        );
        return;
      }

      const data = await response.json();
      if (!ticket && data.ticket) {
        const nextTicket: StoredTicket = { email: "", id: data.ticket.id, name: "", token: data.ticket.visitorToken };
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(nextTicket));
        } catch {
          /* Privát módban sem baj: ebben a fülben a beszélgetés így is megy. */
        }
        setTicket(nextTicket);
        setTicketStatus("bot");
        setHasRated(false);
        trackEvent("support_bot_started", { source });
      }
      setMessages((current) => [
        ...current.filter((m) => m.id !== optimisticId),
        ...(data.messages ?? []).map((m: ChatMessage) => ({ ...m, status: "sent" as const }))
      ]);
      trackEvent("support_bot_message", { handoff: Boolean(data.handoff) });
      if (data.handoff) {
        setHandoffInitiator("bot");
        setHandoffOpen(true);
      }
    } catch {
      setMessages((current) => current.map((m) => (m.id === optimisticId ? { ...m, status: "error" } : m)));
      setNotice("Hálózati hiba. Kérlek próbáld újra.");
    } finally {
      botBusyRef.current = false;
      setBotThinking(false);
    }
  }

  /** A látogató maga kéri Patrikot. */
  function requestHuman() {
    if (ticket && ticketStatus === "bot") {
      setHandoffInitiator("visitor");
      setHandoffOpen(true);
      setNotice("");
      trackEvent("support_handoff_requested", { initiator: "visitor" });
      return;
    }
    /* Még nincs beszélgetés: a megkezdett szöveg átkerül a Patriknak szóló
       üzenetbe, és a megszokott „üzenet → név és email" út indul. */
    setChatMode("human");
    setForm((current) => ({ ...current, message: reply || current.message }));
    setReply("");
    setDraftStage("compose");
    trackEvent("support_handoff_requested", { initiator: "visitor", before_first_message: true });
  }

  /** Név és email az átadáshoz — innentől Patrik viszi a beszélgetést. */
  async function submitHandoff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket) return;
    setStatus("loading");
    setNotice("");

    try {
      const response = await fetch(`/api/tickets/${ticket.id}/handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Visitor-Token": ticket.token },
        body: JSON.stringify({ name: form.name, email: form.email, initiator: handoffInitiator })
      });

      if (!response.ok) {
        setStatus("error");
        setNotice("Nem sikerült továbbítani. Nézd meg az email címet, vagy próbáld újra.");
        return;
      }

      const data = await response.json();
      const nextTicket: StoredTicket = {
        ...ticket,
        email: data.ticket?.email ?? form.email,
        name: data.ticket?.name ?? form.name
      };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(nextTicket));
      } catch {
        /* nem baj */
      }
      setTicket(nextTicket);
      setTicketStatus(data.ticket?.status ?? "open");
      setHandoffOpen(false);
      setHandoffDone(true);
      setForm(initialForm);
      setStatus("idle");
      trackEvent("support_handoff", { initiator: handoffInitiator });
      /* Az AI-beszélgetés itt lesz valódi megkeresés: van név, email, és a
         látogató Patriktól vár választ. A kézi chat a ticket létrehozásakor
         jelzi ugyanezt — egy beszélgetés így is csak egyszer számít. */
      trackLeadConversion("chat");
    } catch {
      setStatus("error");
      setNotice("Hálózati hiba. Kérlek próbáld újra.");
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
    setReply("");
    setChatMode("bot");
    setHandoffOpen(false);
    setHandoffDone(false);
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

  /** Az AI-asszisztens viszi-e a beszélgetést (vagy fogja, az első kérdéstől). */
  const botMode = ticket ? ticketStatus === "bot" : chatMode === "bot";

  /* Az átadás űrlapja. Változóban, nem belső komponensként: egy render
     közben definiált komponens minden gépelésnél újra felépülne, és a mező
     elveszítené a fókuszt. */
  const handoffForm = (
    <form className="chat-identify chat-handoff" onSubmit={submitHandoff}>
      <p className="chat-handoff-lead">
        {handoffInitiator === "visitor"
          ? "Patrik személyesen válaszol. Hogy szólíthat, és hova írjon, ha épp nem vagy az oldalon?"
          : "Ezt Patrik veszi át. Hogy szólíthat, és hova írjon, ha épp nem vagy az oldalon?"}
      </p>
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
        {status === "loading" ? "Küldés…" : "Átadom Patriknak"}
      </button>
      <small>
        A teljes eddigi beszélgetést megkapja, nem kell újra leírnod.{" "}
        <button className="chat-draft-edit" onClick={() => setHandoffOpen(false)} type="button">
          Inkább kérdezek még
        </button>
      </small>
    </form>
  );

  return (
    <>
      {/* Draggable Chat Trigger Head */}
      <div
        className={`support-widget support-trigger-container ${open ? "open" : ""} ${isDragging ? "dragging" : ""}`}
        onPointerCancel={handlePointerCancel}
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
              Kérdésed van? Az asszisztensem azonnal válaszol, és ha kell, átadja nekem.
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
          className={`support-panel ${botMode ? "bot-mode" : ""}`}
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
              <div className={`support-avatar ${botMode ? "bot" : ""}`}>
                {botMode ? "AI" : "PE"}
                <span className="support-avatar-online" />
              </div>
              <div className="support-head-titles">
                <strong id="support-dialog-title">
                  {botMode
                    ? "ProjectEdge asszisztens"
                    : ticket
                      ? ticket.name || "ProjectEdge Chat"
                      : entryIntent === "review"
                        ? "Weboldal áttekintés"
                        : "ProjectEdge Chat"}
                </strong>
                <span>
                  <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#00E676" }} />
                  {/* Az érkező üzenetről azonnal megy értesítés, ezért a valóság
                      jellemzően percekben mérhető — nem munkanapokban. */}
                  {ticketStatus === "closed"
                    ? "Beszélgetés lezárva"
                    : botMode
                      ? "AI · azonnal válaszol · Patrik is látja"
                      : "Általában pár percen belül válaszolok"}
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
                {botMode ? (
                  <button className="chat-human-link" disabled={handoffOpen} onClick={requestHuman} type="button">
                    Patrikkal beszélnék
                  </button>
                ) : (
                  <span>
                    {ticket.email ? `${ticket.email} · ` : ""}
                    {ticketStatus === "closed" ? "lezárva" : "aktív"}
                  </span>
                )}
                <button onClick={resetConversation} type="button">Új téma</button>
              </div>

              {/* Message Wall */}
              <div aria-live="polite" className="chat-messages" ref={messagesRef}>
                {messages.length === 0 ? (
                  <p className="chat-empty">Beszélgetés betöltése…</p>
                ) : (
                  messages.map((message) => <MessageBubble key={message.id} message={message} />)
                )}
                {botThinking ? <TypingBubble /> : null}
                {handoffDone && !botMode ? (
                  <p className="chat-system-note">
                    Átadva Patriknak. A válaszát itt látod, és emailben is megkapod{ticket.email ? ` (${ticket.email})` : ""}.
                  </p>
                ) : null}
              </div>

              {botMode && handoffOpen ? (
                handoffForm
              ) : (
                <form className="chat-composer" onSubmit={sendReply}>
                  <textarea
                    disabled={ticketStatus === "closed"}
                    maxLength={botMode ? BOT_MESSAGE_LIMIT : 5000}
                    onChange={(e) => handleReplyInput(e.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    placeholder={
                      ticketStatus === "closed"
                        ? "Ez a beszélgetés lezárult."
                        : botMode
                          ? "Kérdezz bármit… (Enter a küldéshez)"
                          : "Írj üzenetet… (Enter a küldéshez)"
                    }
                    ref={replyTextareaRef}
                    rows={1}
                    value={reply}
                  />
                  <button
                    aria-label="Üzenet küldése"
                    className="chat-send-button"
                    disabled={!reply.trim() || ticketStatus === "closed" || botThinking}
                    type="submit"
                  >
                    <SendIcon />
                  </button>
                </form>
              )}

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
          ) : botMode ? (
            /* Új beszélgetés az AI-asszisztenssel: se név, se email — a
               látogató egyből kérdezhet. Az első kérdés hozza létre a ticketet. */
            <>
              <div aria-live="polite" className="chat-messages" ref={messagesRef}>
                <div className="chat-bubble admin bot">
                  <p>
                    Szia! A ProjectEdge AI-asszisztense vagyok. Kérdezz bármit az árakról, a csomagokról vagy a
                    folyamatról — azonnal válaszolok, és ha kell, átadlak Patriknak.
                  </p>
                  <div className="chat-bubble-time">
                    <span className="chat-bot-tag">AI</span>
                  </div>
                </div>

                {messages.length === 0 && !botThinking ? (
                  <div className="chat-starters">
                    {STARTER_QUESTIONS.map((question) => (
                      <button key={question} onClick={() => void askBot(question)} type="button">
                        {question}
                      </button>
                    ))}
                  </div>
                ) : null}

                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {botThinking ? <TypingBubble /> : null}
              </div>

              <form className="chat-composer" onSubmit={sendReply}>
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
                <textarea
                  autoFocus
                  maxLength={BOT_MESSAGE_LIMIT}
                  onChange={(e) => handleReplyInput(e.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Kérdezz bármit… (Enter a küldéshez)"
                  ref={replyTextareaRef}
                  rows={1}
                  value={reply}
                />
                <button
                  aria-label="Üzenet küldése"
                  className="chat-send-button"
                  disabled={!reply.trim() || botThinking}
                  type="submit"
                >
                  <SendIcon />
                </button>
              </form>
              <p className="chat-bot-footnote">
                AI válaszol, Patrik is látja a beszélgetést. Érzékeny adatot ne írj ide.{" "}
                <button onClick={requestHuman} type="button">
                  Inkább Patriknak írok
                </button>
              </p>
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
                    <SendIcon />
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
              {/* Aki az AI-tól váltott át, egy koppintással visszamehet. A
                  weboldal-áttekintésnél és a gyors sávnál nincs mire visszamenni. */}
              {draftStage === "compose" && entryIntent === "contact" && source !== "gyorssav" ? (
                <p className="chat-bot-footnote">
                  <button
                    onClick={() => {
                      setChatMode("bot");
                      setReply(form.message);
                      updateField("message", "");
                    }}
                    type="button"
                  >
                    Vissza az AI-asszisztenshez
                  </button>
                </p>
              ) : null}
            </>
          )}

          {notice && <p className={`support-notice ${status}`}>{notice}</p>}
        </div>
      ) : null}
    </>
  );
}
