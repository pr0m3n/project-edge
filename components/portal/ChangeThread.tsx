"use client";

import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * Beszélgetés egy módosítási kérésen belül.
 *
 * Ugyanaz a komponens szolgálja ki az ügyfélkaput és az admint — csak a
 * `role` más. Az üzenetek azonnal (optimistic UI), fagyás nélkül jelennek meg,
 * és Supabase Realtime csatornán szinkronizálódnak élőben.
 */

type ChangeMessage = {
  id: string;
  sender: "client" | "admin";
  body: string;
  created_at: string;
  status?: "sending" | "sent" | "error";
};

type ChangeThreadProps = {
  requestId: string;
  role: "client" | "admin";
  /** Új üzenet után a hívó értesítheti a másik felet. */
  onSent?: (body: string) => void | Promise<void>;
};

function formatThreadDate(isoString: string) {
  try {
    const d = new Date(isoString);
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

export function ChangeThread({ requestId, role, onSent }: ChangeThreadProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChangeMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("change_request_messages")
      .select("id,sender,body,created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    if (loadError) {
      setError("Az üzenetek most nem tölthetők be.");
    } else {
      setMessages((prev) => {
        const serverMsgs: ChangeMessage[] = (data ?? []).map((m) => ({
          ...m,
          sender: m.sender as "client" | "admin",
          status: "sent"
        }));
        const pending = prev.filter((m) => m.status === "sending");
        const existingIds = new Set(serverMsgs.map((m) => m.id));
        const filteredPending = pending.filter((m) => !existingIds.has(m.id));
        return [...serverMsgs, ...filteredPending];
      });
      setError("");
    }
    setLoading(false);
  }, [requestId]);

  // Load when expanded
  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Live Realtime sync
  useEffect(() => {
    if (!open) return;

    const channel = supabase
      .channel(`change-req-live-${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "change_request_messages",
          filter: `request_id=eq.${requestId}`
        },
        (payload) => {
          const newRow = payload.new as { id: string; sender: "client" | "admin"; body: string; created_at: string };
          setMessages((prev) => {
            if (prev.some((m) => m.id === newRow.id || (m.status === "sending" && m.body === newRow.body))) {
              return prev.map((m) =>
                m.id === newRow.id || (m.status === "sending" && m.body === newRow.body)
                  ? { ...newRow, status: "sent" }
                  : m
              );
            }
            return [...prev, { ...newRow, status: "sent" }];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, requestId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (open && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, open]);

  const handleBodyChange = (value: string) => {
    setBody(value);
    if (composerRef.current) {
      composerRef.current.style.height = "auto";
      composerRef.current.style.height = `${Math.min(composerRef.current.scrollHeight, 120)}px`;
    }
  };

  async function send() {
    const text = body.trim();
    if (!text) return;

    const tempId = `optimistic-${Date.now()}`;
    const optimisticMessage: ChangeMessage = {
      id: tempId,
      body: text,
      created_at: new Date().toISOString(),
      sender: role,
      status: "sending"
    };

    // Instant UI feedback (0ms latency)
    setMessages((prev) => [...prev, optimisticMessage]);
    setBody("");
    setError("");
    if (composerRef.current) {
      composerRef.current.style.height = "auto";
    }

    const { data: inserted, error: sendError } = await supabase
      .from("change_request_messages")
      .insert({ request_id: requestId, sender: role, body: text })
      .select("id,sender,body,created_at")
      .single();

    if (sendError) {
      setError("Az üzenetet nem sikerült elküldeni.");
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "error" } : m))
      );
    } else {
      if (inserted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...inserted, sender: inserted.sender as "client" | "admin", status: "sent" } : m))
        );
      }
      await onSent?.(text);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="change-thread">
      <button
        className="change-thread-toggle"
        onClick={() => setOpen(!open)}
        type="button"
      >
        <span>💬</span>
        {open
          ? "Beszélgetés elrejtése"
          : messages.length
            ? `Beszélgetés (${messages.length})`
            : "Beszélgetés megnyitása"}
      </button>

      {open ? (
        <div className="change-thread-body" ref={scrollContainerRef}>
          {loading && !messages.length ? (
            <p className="change-thread-empty">Betöltés…</p>
          ) : null}

          {!loading && !messages.length ? (
            <p className="change-thread-empty">
              {role === "admin"
                ? "Még nincs üzenet. Írj ide, ha kérdésed van a kéréssel kapcsolatban — az ügyfél azonnal látja."
                : "Még nincs üzenet. Írj ide bátran, ha pontosítanád a kérést vagy kérdésed van."}
            </p>
          ) : null}

          {messages.map((message) => (
            <article
              className={`change-message ${message.sender === role ? "mine" : ""}`}
              key={message.id}
            >
              <span>
                {message.sender === "admin" ? "ProjectEdge" : "Ügyfél"} ·{" "}
                {formatThreadDate(message.created_at)}
                {message.status === "sending" && " • küldés…"}
                {message.status === "error" && " • ⚠️ hiba"}
              </span>
              <p>{message.body}</p>
            </article>
          ))}

          <div className="change-thread-composer">
            <textarea
              onChange={(event) => handleBodyChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={role === "admin" ? "Válasz az ügyfélnek… (Enter = küldés)" : "Írj üzenetet… (Enter = küldés)"}
              ref={composerRef}
              rows={1}
              value={body}
            />
            <button
              className="button primary"
              disabled={!body.trim()}
              onClick={send}
              type="button"
            >
              Küldés
            </button>
          </div>

          {error ? (
            <p className="change-thread-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
