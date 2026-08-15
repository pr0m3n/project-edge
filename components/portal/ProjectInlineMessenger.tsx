"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Project, Ticket, TicketMessage } from "@/components/portal/types";

type ProjectInlineMessengerProps = {
  project: Project;
  tickets: Ticket[];
  messages: Record<string, TicketMessage[]>;
  userId: string | null;
  userEmail: string;
  userName: string;
  onRefresh: () => Promise<void> | void;
};

type OptimisticMsg = TicketMessage & { sending?: boolean };

function formatMsgTime(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return `Ma ${d.toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return d.toLocaleString("hu-HU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "";
  }
}

export function ProjectInlineMessenger({
  project,
  tickets,
  messages,
  userId,
  userEmail,
  userName,
  onRefresh
}: ProjectInlineMessengerProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<OptimisticMsg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Find or determine the ticket dedicated to this project
  const projectTicket =
    tickets.find((t) => t.project_id === project.id) ||
    tickets.find((t) => t.subject?.toLowerCase().includes(project.title.toLowerCase())) ||
    tickets[0];

  const serverMessages = projectTicket ? (messages[projectTicket.id] ?? []) : [];

  // Sync server messages into local state with optimistic merge
  useEffect(() => {
    setLocalMessages((prev) => {
      const pending = prev.filter((m) => m.sending);
      const serverMapped: OptimisticMsg[] = serverMessages.map((m) => ({ ...m, sending: false }));
      const serverIds = new Set(serverMapped.map((m) => m.id));
      const filteredPending = pending.filter((m) => !serverIds.has(m.id));
      return [...serverMapped, ...filteredPending];
    });
  }, [serverMessages]);

  // Realtime subscription for incoming messages
  useEffect(() => {
    if (!projectTicket?.id) return;

    const channel = supabase
      .channel(`project-chat-${projectTicket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_ticket_messages",
          filter: `ticket_id=eq.${projectTicket.id}`
        },
        (payload) => {
          const newMsg = payload.new as TicketMessage;
          setLocalMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id || (m.sending && m.body === newMsg.body))) {
              return prev.map((m) =>
                m.id === newMsg.id || (m.sending && m.body === newMsg.body)
                  ? { ...newMsg, sending: false }
                  : m
              );
            }
            return [...prev, { ...newMsg, sending: false }];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectTicket?.id]);

  // Smooth scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [localMessages.length]);

  const handleTextChange = (val: string) => {
    setText(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleQuickTag = (tag: string) => {
    const next = text ? `${text} ${tag}: ` : `${tag}: `;
    setText(next);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg: OptimisticMsg = {
      id: tempId,
      ticket_id: projectTicket?.id ?? "temp",
      sender: "customer",
      body: trimmed,
      created_at: new Date().toISOString(),
      user_id: userId,
      sending: true
    };

    // Instant optimistic UI (0ms delay)
    setLocalMessages((prev) => [...prev, optimisticMsg]);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setSending(true);

    try {
      let activeTicketId = projectTicket?.id;

      if (!activeTicketId) {
        // Create dedicated project ticket if none exists yet
        const { data: newTicket, error: createTicketError } = await supabase
          .from("client_tickets")
          .insert({
            contact_email: userEmail,
            contact_name: userName || userEmail,
            project_id: project.id,
            subject: `Projekt egyeztetés: ${project.title}`,
            user_id: userId
          })
          .select("*")
          .single();

        if (createTicketError || !newTicket) {
          throw new Error("Nem sikerült elindítani a beszélgetést.");
        }
        activeTicketId = newTicket.id;
      }

      const { data: insertedMsg, error: insertError } = await supabase
        .from("client_ticket_messages")
        .insert({
          ticket_id: activeTicketId,
          body: trimmed,
          sender: "customer",
          user_id: userId
        })
        .select("*")
        .single();

      if (insertError) throw insertError;

      // Update optimistic message with real server data
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...insertedMsg, sending: false } : m))
      );

      // Trigger notification for admin
      await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: null,
          email: "admin@projectedge.hu",
          title: `Új üzenet a projekthez: ${project.title}`,
          body: `${userName || userEmail}: "${trimmed.slice(0, 100)}${trimmed.length > 100 ? "..." : ""}"`,
          link: "/admin"
        })
      }).catch(() => {});

      if (!projectTicket) {
        void onRefresh();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      // Mark as error or revert
      setLocalMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="project-ios-messenger">
      {/* ── Header ── */}
      <header className="project-messenger-head">
        <div className="project-messenger-brand">
          <div className="project-messenger-avatar">
            <span>PE</span>
            <div className="online-beacon" />
          </div>
          <div>
            <strong>Közvetlen egyeztetés a fejlesztővel</strong>
            <small>Írj ide, ha módosítást, új funkciót vagy finomítást szeretnél a projekten</small>
          </div>
        </div>
        <div className="project-messenger-badge">
          <span className="live-dot" />
          <span>Válaszidő: 1-2 órán belül</span>
        </div>
      </header>

      {/* ── Quick topic suggestions ── */}
      <div className="project-messenger-tags">
        <button type="button" onClick={() => handleQuickTag("✨ Szöveg módosítás")}>✨ Szöveg csere</button>
        <button type="button" onClick={() => handleQuickTag("🎨 Szín / Kép változtatás")}>🎨 Szín / Kép</button>
        <button type="button" onClick={() => handleQuickTag("📱 Mobil nézet finomítás")}>📱 Mobil nézet</button>
        <button type="button" onClick={() => handleQuickTag("🚀 Élesítési kérdés")}>🚀 Élesítés</button>
      </div>

      {/* ── Chat Messages Container ── */}
      <div className="project-messenger-viewport" ref={scrollRef}>
        {localMessages.length === 0 ? (
          <div className="project-messenger-welcome">
            <div className="welcome-bubble">
              <span style={{ fontSize: "24px", display: "block", marginBottom: "6px" }}>👋</span>
              <strong>Szia! Miben segíthetek a(z) „{project.title}” oldalon?</strong>
              <p>
                Írd meg az észrevételeidet, a kért szöveg- vagy dizájnmódosításokat, és közvetlenül itt kapod a választ a fejlesztőtől.
              </p>
            </div>
          </div>
        ) : (
          localMessages.map((msg) => {
            const isClient = msg.sender === "customer";
            return (
              <div
                key={msg.id}
                className={`ios-chat-row ${isClient ? "outgoing" : "incoming"}`}
              >
                {!isClient && (
                  <div className="ios-msg-avatar" title="ProjectEdge Fejlesztő">
                    PE
                  </div>
                )}
                <div className={`ios-chat-bubble ${isClient ? "bubble-client" : "bubble-dev"}`}>
                  {!isClient && <span className="bubble-author">ProjectEdge Stúdió</span>}
                  <p className="bubble-text">{msg.body}</p>
                  <div className="bubble-meta">
                    <span className="bubble-time">{formatMsgTime(msg.created_at)}</span>
                    {isClient && (
                      <span className="bubble-status">
                        {msg.sending ? "○" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── iOS-Style Input Composer ── */}
      <footer className="project-messenger-composer">
        <textarea
          ref={textareaRef}
          className="ios-chat-input"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Írd meg a kért változtatást vagy kérdésedet… (Enter = küldés)"
          rows={1}
        />
        <button
          type="button"
          className={`ios-send-button ${text.trim() ? "active" : ""}`}
          onClick={() => void handleSend()}
          disabled={!text.trim() || sending}
          aria-label="Üzenet küldése"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </footer>
    </section>
  );
}
