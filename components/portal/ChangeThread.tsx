"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * Beszélgetés egy módosítási kérésen belül.
 *
 * Ugyanaz a komponens szolgálja ki az ügyfélkaput és az admint — csak a
 * `role` más. Így nem tud elcsúszni a két oldal, és egy üzenet mindig ahhoz a
 * kéréshez tartozik, amiről szó van (a támogatási ticketek ettől függetlenül
 * megmaradnak önálló ügyeknek).
 *
 * Az üzeneteket csak nyitáskor tölti be: egy admin nézetben tucatnyi kérés is
 * lehet, és fölösleges lenne mindegyikhez lekérdezni.
 */

type ChangeMessage = {
  id: string;
  sender: "client" | "admin";
  body: string;
  created_at: string;
};

type ChangeThreadProps = {
  requestId: string;
  role: "client" | "admin";
  /** Új üzenet után a hívó értesítheti a másik felet. */
  onSent?: (body: string) => void | Promise<void>;
};

export function ChangeThread({ requestId, role, onSent }: ChangeThreadProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChangeMessage[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from("change_request_messages")
      .select("id,sender,body,created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    if (loadError) setError("Az üzenetek most nem tölthetők be.");
    else {
      setMessages((data ?? []) as ChangeMessage[]);
      setError("");
    }
    setLoading(false);
  }, [requestId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    const { error: sendError } = await supabase
      .from("change_request_messages")
      .insert({ request_id: requestId, sender: role, body: text });
    if (sendError) {
      setError("Az üzenetet nem sikerült elküldeni.");
    } else {
      setBody("");
      setError("");
      await load();
      await onSent?.(text);
    }
    setSending(false);
  }

  return (
    <div className="change-thread">
      <button className="change-thread-toggle" onClick={() => setOpen(!open)} type="button">
        {open ? "Beszélgetés elrejtése" : messages.length ? `Beszélgetés (${messages.length})` : "Beszélgetés megnyitása"}
      </button>

      {open ? (
        <div className="change-thread-body">
          {loading ? <p className="change-thread-empty">Betöltés…</p> : null}
          {!loading && !messages.length ? (
            <p className="change-thread-empty">
              {role === "admin"
                ? "Még nincs üzenet. Írj ide, ha kérdésed van a kéréssel kapcsolatban — az ügyfél az ügyfélkapun látja."
                : "Még nincs üzenet. Írj ide, ha pontosítanád a kérést vagy kérdésed van."}
            </p>
          ) : null}

          {messages.map((message) => (
            <article className={`change-message ${message.sender === role ? "mine" : ""}`} key={message.id}>
              <span>{message.sender === "admin" ? "ProjectEdge" : "Ügyfél"} · {new Date(message.created_at).toLocaleString("hu-HU")}</span>
              <p>{message.body}</p>
            </article>
          ))}

          <div className="change-thread-composer">
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={role === "admin" ? "Válasz az ügyfélnek…" : "Írj üzenetet…"}
              rows={2}
            />
            <button className="button primary" disabled={sending || !body.trim()} onClick={send} type="button">
              {sending ? "Küldés…" : "Küldés"}
            </button>
          </div>

          {error ? <p className="change-thread-error" role="alert">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
