"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

/**
 * ÉLŐ KAPCSOLAT, AMI TÉNYLEG ÉLŐ.
 *
 * A korábbi felállásban a realtime csatorna egyetlen `.subscribe()` hívással
 * indult, visszahívás nélkül. Ez három dolgot jelentett:
 *
 *  1. Ha a csatorna nem tudott feliratkozni (lejárt token, hálózati hiba),
 *     azt SENKI nem tudta meg — a felület csendben statikussá vált.
 *  2. Ha a WebSocket menet közben elszakadt (laptop felébred alvásból, wifi
 *     vált, mobilhálózat vált), a Supabase kliens újracsatlakozott, de a
 *     szakadás alatt történt változások VÉGLEG elvesztek: a csatorna nem
 *     játssza vissza a kimaradt eseményeket.
 *  3. A felhasználó semmiből nem látta, hogy amit néz, az friss-e.
 *
 * Ez a hook mindhármat megoldja:
 *
 *  - Állapotot ad vissza (`live` / `connecting` / `offline`), amit ki lehet
 *    tenni a fejlécbe egyetlen pontként.
 *  - Újracsatlakozáskor MEGHÍVJA a `onResync` visszahívást, ami újratölti a
 *    listákat. Ez a lényeg: a csatorna újraéled, de az elmaradt változásokat
 *    csak egy teljes újratöltés hozza vissza.
 *  - Ugyanezt teszi, amikor a fül újra láthatóvá válik, vagy a böngésző
 *    visszakapcsol hálózatra — ez a két pillanat, amikor az ember ránéz a
 *    képernyőre, és elvárja, hogy friss legyen.
 *
 * A `handlers` és az `onResync` szándékosan ref-en keresztül él: ha a hook
 * függősége lenne, minden render új csatornát nyitna, ami a régi hibánál is
 * rosszabb (csatorna-szivárgás és duplikált események).
 */

export type RealtimeStatus = "connecting" | "live" | "offline";

export type RealtimeHandler = {
  table: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  handler: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
};

/** Az újracsatlakozás várakozása: 1s, 2s, 4s, 8s, majd 15s-en megáll. */
function backoffDelay(attempt: number) {
  return Math.min(1_000 * 2 ** attempt, 15_000);
}

export function useRealtime(
  channelName: string,
  handlers: RealtimeHandler[],
  onResync: () => void
) {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  // A friss visszahívások ref-en át jutnak be a csatornába. A frissítés
  // EFFEKTBEN történik, nem renderben: renderben ref-et írni azért tilos,
  // mert a render lefuthat anélkül is, hogy a React véglegesítené (megszakított
  // vagy újrapróbált render), és akkor a ref egy soha meg nem valósult
  // állapotot őrizne. Az effekt csak véglegesített render után fut.
  const handlersRef = useRef(handlers);
  const resyncRef = useRef(onResync);

  useEffect(() => {
    handlersRef.current = handlers;
    resyncRef.current = onResync;
  });

  /** Volt-e már sikeres kapcsolat. Az első csatlakozás nem „újra"-csatlakozás. */
  const connectedOnceRef = useRef(false);

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let disposed = false;

    function connect() {
      if (disposed) return;

      channel = supabase.channel(channelName);

      for (const entry of handlersRef.current) {
        channel.on(
          "postgres_changes",
          { event: entry.event ?? "*", schema: "public", table: entry.table },
          // A Supabase típusa itt szándékosan laza: a payload alakja táblánként
          // más, a hívó tudja, mit vár.
          (payload) => entry.handler(payload as RealtimePostgresChangesPayload<Record<string, unknown>>)
        );
      }

      channel.subscribe((state) => {
        if (disposed) return;

        if (state === "SUBSCRIBED") {
          attempt = 0;
          setStatus("live");
          // CSAK újracsatlakozáskor töltünk újra. Az első csatlakozásnál a
          // hívó amúgy is most töltötte be az adatot — a duplikált lekérdezés
          // ott csak lassítana.
          if (connectedOnceRef.current) resyncRef.current();
          connectedOnceRef.current = true;
          return;
        }

        if (state === "CHANNEL_ERROR" || state === "TIMED_OUT" || state === "CLOSED") {
          setStatus("offline");

          // Újracsatlakozás növekvő várakozással. A régi csatornát el kell
          // engedni, különben a Supabase kliens a háttérben tovább próbálná,
          // és két párhuzamos csatorna küldene ugyanarról eseményt.
          if (channel) {
            void supabase.removeChannel(channel);
            channel = null;
          }
          retryTimer = setTimeout(() => {
            attempt += 1;
            setStatus("connecting");
            connect();
          }, backoffDelay(attempt));
        }
      });
    }

    connect();

    /**
     * A fül visszatérése és a hálózat visszatérése.
     *
     * Ez az a két pillanat, amikor az ember ránéz a képernyőre, és azt hiszi,
     * friss adatot lát. A WebSocket ilyenkor gyakran él, csak a szakadás
     * alatti változások hiányoznak — azokat semmilyen esemény nem hozza
     * vissza, egyedül egy újratöltés.
     */
    function refreshIfVisible() {
      if (document.visibilityState === "visible") resyncRef.current();
    }

    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("online", refreshIfVisible);

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("online", refreshIfVisible);
      if (channel) void supabase.removeChannel(channel);
    };
    // A csatorna neve az egyetlen valódi függőség: a handlerek és az onResync
    // ref-en át frissülnek, hogy egy render se nyisson új csatornát.
  }, [channelName]);

  return status;
}
