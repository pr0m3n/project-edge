"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORT_TOKEN_HASH_KEY } from "@/lib/support-link";

const storageKey = "projectedge-support-ticket";

/**
 * `invalid` = a linkből hiányzik a token (elveszett másoláskor),
 * `expired`  = a szerver nem ismeri a ticketet vagy a tokent (404),
 * `error`    = átmeneti hiba (hálózat vagy 5xx) — érdemes újrapróbálni.
 * A háromféle ok háromféle teendőt jelent az olvasónak, ezért nem egy üzenet.
 */
type State = "checking" | "invalid" | "expired" | "error" | "ready";

/**
 * A hash-ből kiolvasott tokennel ellenőrizzük a beszélgetést, majd ugyanabba a
 * localStorage kulcsba írjuk, amit a SupportWidget is használ. Ezért működik a
 * link bármelyik eszközön: a widget onnantól sajátjaként ismeri fel a ticketet.
 *
 * A tokent olvasás után azonnal töröljük az URL-ből, hogy ne maradjon benne a
 * böngésző előzményében és a megosztott képernyőképeken.
 */
export function ResumeConversation({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  /**
   * A kiolvasott token — REF, nem state.
   *
   * A tokent olvasás után azonnal töröljük az URL-ből, tehát pontosan egyszer
   * olvasható ki. Fejlesztésben a StrictMode minden effektet kétszer futtat: ha
   * a token state-ben élne, a második futás a closure régi `null` értékét látná,
   * újra megpróbálná kiolvasni a MÁR kiürített hash-t, és felülírná üressel.
   * A ref viszont túléli a dupla futtatást, így a második kör már a meglévő
   * tokent használja.
   */
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (tokenRef.current === null) {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      tokenRef.current = hash.get(SUPPORT_TOKEN_HASH_KEY)?.trim() ?? "";
      if (tokenRef.current) {
        // A token nem maradhat a cimsorban: onnan bekerulne az elozmenyekbe es
        // a megosztott kepernyokepekre is.
        window.history.replaceState(null, "", window.location.pathname);
      }
    }

    const token = tokenRef.current;
    if (!token) {
      setState("invalid");
      return;
    }

    let cancelled = false;

    async function resume() {
      try {
        const response = await fetch(`/api/tickets/${ticketId}`, {
          headers: { "x-visitor-token": token as string }
        });
        if (cancelled) return;

        if (!response.ok) {
          setState(response.status === 404 ? "expired" : "error");
          return;
        }

        const data = (await response.json()) as {
          ticket: { id: string; email: string; name: string };
        };
        if (cancelled) return;

        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            email: data.ticket.email,
            id: data.ticket.id,
            name: data.ticket.name,
            token
          })
        );

        setState("ready");
        router.replace("/?chat=open");
      } catch {
        if (!cancelled) setState("error");
      }
    }

    void resume();
    return () => {
      cancelled = true;
    };
  }, [router, ticketId]);

  return (
    <section className="page-hero compact resume-conversation">
      <p className="micro-label dark">Support</p>
      {state === "checking" || state === "ready" ? (
        <>
          <h1>Megnyitom a beszélgetésed…</h1>
          <p>Egy pillanat, betöltöm az előzményeket ezen az eszközön is.</p>
        </>
      ) : null}
      {state === "expired" ? (
        <>
          <h1>Ez a link már nem érvényes.</h1>
          <p>
            Elképzelhető, hogy a beszélgetés lezárult, vagy a link egy régebbi értesítőből
            származik. Nyiss új beszélgetést a chatben, vagy írj közvetlenül:{" "}
            <a href="mailto:info@projectedge.hu">info@projectedge.hu</a>.
          </p>
        </>
      ) : null}
      {state === "invalid" ? (
        <>
          <h1>Hiányzik a link azonosítója.</h1>
          <p>
            Nyisd meg a linket közvetlenül az emailből, másolás nélkül — a cím végén lévő rész is
            hozzátartozik. Ha nem megy, írj bátran:{" "}
            <a href="mailto:info@projectedge.hu">info@projectedge.hu</a>.
          </p>
        </>
      ) : null}
      {state === "error" ? (
        <>
          <h1>Most nem sikerült megnyitni.</h1>
          <p>
            Átmeneti hiba történt a beszélgetés betöltésekor. Töltsd újra az oldalt néhány
            másodperc múlva, vagy írj közvetlenül:{" "}
            <a href="mailto:info@projectedge.hu">info@projectedge.hu</a>.
          </p>
        </>
      ) : null}
    </section>
  );
}
