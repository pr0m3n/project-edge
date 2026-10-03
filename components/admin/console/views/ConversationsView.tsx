"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { useAdmin, type Conversation } from "@/components/admin/console/AdminData";
import {
  PORTAL_TICKET_STATUSES,
  PUBLIC_TICKET_STATUSES,
  SOURCE_LABEL,
  filterConversations,
  formatDateTime,
  shortStamp,
  type ConversationFilter
} from "@/components/admin/console/derive";
import { IconBack, IconChat, IconSearch } from "@/components/admin/console/icons";
import { Badge, ConversationStatusBadge, Count, EmptyState, PageHead } from "@/components/admin/console/ui";

/**
 * Beszélgetések: az AI-chat, a widget, a gyors sáv és az ügyfélkapu egy helyen.
 *
 * Gépen két panel (lista + szál), telefonon a lista és a szál külön képernyő —
 * a cím (`/admin/beszelgetesek/<id>`) dönti el, melyik látszik, így a telefon
 * vissza gombja is a listára visz.
 */

const FILTERS: Array<[ConversationFilter, string]> = [
  ["all", "Mind"],
  ["reply", "Válaszra vár"],
  ["ai", "AI-chat"],
  ["web", "Weboldal"],
  ["portal", "Ügyfélkapu"],
  ["answered", "Megválaszolt"],
  ["closed", "Lezárt"]
];

export function ConversationsView() {
  const admin = useAdmin();
  const params = useParams<{ id?: string[] }>();
  const selectedId = Array.isArray(params?.id) ? params.id[0] : undefined;
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [query, setQuery] = useState("");

  // A „Ma" oldal AI-összesítője `?szuro=ai`-val érkezik.
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("szuro");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- az URL csak a böngészőben ismert; kezdőértékként hidratálási eltérést adna
    if (value === "ai" || value === "reply" || value === "web" || value === "portal" || value === "answered" || value === "closed") setFilter(value);
  }, []);

  const filtered = useMemo(() => filterConversations(admin.conversations, filter, query), [admin.conversations, filter, query]);
  const selected = selectedId ? admin.conversations.find((item) => item.id === selectedId) ?? null : null;

  const countFor = (value: ConversationFilter) => filterConversations(admin.conversations, value, "").length;

  return (
    <>
      <div className={selectedId ? "pa-hide-mobile" : undefined}>
        <PageHead
          compact
          subtitle={`${admin.counts.needsReply} válaszra vár · ${admin.counts.aiConversations} AI-beszélgetés`}
          title="Beszélgetések"
        />
      </div>

      <div className={`pa-inbox${selectedId ? " has-thread" : ""}`}>
        <div className="pa-inbox-list">
          <div className="pa-inbox-list-head">
            <label className="pa-search">
              <IconSearch />
              <span className="sr-only">Keresés</span>
              <input className="pa-input" onChange={(event) => setQuery(event.target.value)} placeholder="Keresés név, email vagy szöveg szerint" type="search" value={query} />
            </label>
            <div className="pa-chips is-scroll" role="group" aria-label="Szűrés">
              {FILTERS.map(([value, label]) => (
                <button aria-pressed={filter === value} className="pa-chip" key={value} onClick={() => setFilter(value)} type="button">
                  {label}
                  {value === "reply" || value === "ai" || value === "portal" ? <Count tone={value === "reply" ? "hot" : value === "ai" ? "ai" : undefined} value={countFor(value)} /> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="pa-inbox-scroll">
            {admin.loading ? (
              <p className="pa-empty">Betöltés…</p>
            ) : filtered.length === 0 ? (
              <EmptyState icon={<IconChat />} title="Nincs ilyen beszélgetés">
                {query ? "Próbálj más kulcsszót." : "Ebben a szűrésben most nincs semmi."}
              </EmptyState>
            ) : filtered.map((item) => (
              <Link
                aria-current={item.id === selectedId ? "page" : undefined}
                className={`pa-conv${item.needsReply ? " is-unread" : ""}`}
                href={`/admin/beszelgetesek/${item.id}`}
                key={`${item.kind}-${item.id}`}
                scroll={false}
              >
                <div className="pa-conv-top">
                  <strong>{item.title}</strong>
                  <time dateTime={item.lastActivity}>{shortStamp(item.lastActivity, admin.nowMs)}</time>
                </div>
                <p>{item.snippet || item.subtitle}</p>
                <div className="pa-row-top">
                  <Badge tone={item.source === "ai" ? "ai" : item.source === "gyorssav" ? "accent" : "neutral"}>{SOURCE_LABEL[item.source]}</Badge>
                  <ConversationStatusBadge conversation={item} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {selected ? (
          <Thread conversation={selected} key={selected.id} />
        ) : (
          <div className="pa-thread">
            {selectedId && !admin.loading ? (
              <EmptyState title="Ez a beszélgetés nem található">
                Lehet, hogy törölték. <Link className="pa-link" href="/admin/beszelgetesek">Vissza a listához</Link>
              </EmptyState>
            ) : (
              <EmptyState icon={<IconChat />} title="Válassz egy beszélgetést">
                A bal oldali listából nyisd meg, amire válaszolni szeretnél.
              </EmptyState>
            )}
          </div>
        )}
      </div>
    </>
  );
}

const COARSE_QUERY = "(hover: none) and (pointer: coarse)";

function subscribeCoarse(onChange: () => void) {
  const query = window.matchMedia(COARSE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Érintőképernyő-e (telefon): ott az Enter új sor, a küldés a gombbal megy. */
function useCoarsePointer() {
  return useSyncExternalStore(subscribeCoarse, () => window.matchMedia(COARSE_QUERY).matches, () => false);
}

function Thread({ conversation }: { conversation: Conversation }) {
  const admin = useAdmin();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const coarse = useCoarsePointer();

  const messages = conversation.kind === "public"
    ? admin.ticketMessages[conversation.id] ?? []
    : admin.clientTicketMessages[conversation.id] ?? [];
  const project = conversation.projectId ? admin.clientProjects.find((item) => item.id === conversation.projectId) : null;
  const statuses = conversation.kind === "public" ? PUBLIC_TICKET_STATUSES : PORTAL_TICKET_STATUSES;
  const closed = conversation.status === "closed";

  useEffect(() => {
    const element = bodyRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length]);

  function resize() {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    const ok = conversation.kind === "public"
      ? await admin.actions.sendPublicReply(conversation.id, text)
      : await admin.actions.sendPortalReply(conversation.id, text);
    setSending(false);
    if (ok) {
      setDraft("");
      window.requestAnimationFrame(resize);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Telefonon az Enter új sor (a küldés a gombbal megy), gépen küld.
    if (event.key === "Enter" && !event.shiftKey && !coarse && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  }

  const placeholder = closed ? "Ez a beszélgetés lezárult." : conversation.status === "bot" ? "Válasz…" : "Írd ide a válaszod…";
  const note = closed
    ? null
    : conversation.status === "bot" && !conversation.email
      ? "Nincs email címe: a válaszod csak akkor éri el, ha a chat még nyitva van nála."
      : conversation.status === "bot"
        ? "Ha most írsz, átveszed a beszélgetést az AI-tól."
        : null;

  return (
    <section aria-label="Beszélgetés" className="pa-thread">
      <header className="pa-thread-head">
        <div style={{ minWidth: 0 }}>
          <Link className="pa-back pa-only-mobile" href="/admin/beszelgetesek" style={{ marginBottom: 6 }}>
            <IconBack /> Beszélgetések
          </Link>
          <h2>{conversation.title}</h2>
          <p>
            {conversation.email ? <a href={`mailto:${conversation.email}`}>{conversation.email}</a> : conversation.subtitle}
            {conversation.kind === "portal" && conversation.subtitle ? ` · ${conversation.subtitle}` : ""}
          </p>
          <div className="pa-row-top" style={{ marginTop: 6 }}>
            <Badge tone={conversation.source === "ai" ? "ai" : conversation.source === "gyorssav" ? "accent" : "neutral"}>{SOURCE_LABEL[conversation.source]}</Badge>
            <ConversationStatusBadge conversation={conversation} />
            {project ? <Link className="pa-link" href={`/admin/ugyfelek/${project.id}`}>{project.title} →</Link> : null}
          </div>
        </div>
        <label className="pa-field" style={{ minWidth: 170 }}>
          <span>Állapot</span>
          <select
            className="pa-select"
            onChange={(event) => void admin.actions.setConversationStatus(conversation, event.target.value)}
            value={conversation.status}
          >
            {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </header>

      <div className="pa-thread-body" ref={bodyRef}>
        {conversation.handoffReason ? (
          <div className="pa-banner is-ai" style={{ marginBottom: 4 }}>
            <div>
              <strong>{conversation.status === "bot" ? "Az AI átadást javasolt — elérhetőséget nem adott meg" : "Átadva az AI-tól"}</strong>
              <p>{conversation.handoffReason}</p>
            </div>
          </div>
        ) : null}
        {conversation.rating ? (
          <div className="pa-banner" style={{ marginBottom: 4 }}>
            <div>
              <strong>Értékelés: <span className="pa-stars">{"★".repeat(conversation.rating)}</span></strong>
              {conversation.ratingComment ? <p>„{conversation.ratingComment}”</p> : null}
            </div>
          </div>
        ) : null}
        {messages.length === 0 ? (
          <p className="pa-faint" style={{ margin: "auto", textAlign: "center" }}>Még nincsenek üzenetek ebben a beszélgetésben.</p>
        ) : messages.map((message) => {
          const who = message.sender === "admin" ? "Te" : message.sender === "bot" ? "AI-asszisztens" : conversation.kind === "public" && !conversation.email ? "Látogató" : conversation.title;
          return (
            <div className={`pa-msg is-${message.sender}`} key={message.id}>
              <div className="pa-msg-meta">
                <b>{who}</b>
                <time dateTime={message.created_at} title={formatDateTime(message.created_at)}>{shortStamp(message.created_at, admin.nowMs)}</time>
              </div>
              <div className="pa-msg-bubble">{message.body}</div>
            </div>
          );
        })}
      </div>

      <form
        className="pa-composer"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label className="sr-only" htmlFor={`reply-${conversation.id}`}>Válasz</label>
        <textarea
          className="pa-textarea"
          disabled={closed}
          id={`reply-${conversation.id}`}
          onChange={(event) => {
            setDraft(event.target.value);
            resize();
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          ref={inputRef}
          rows={1}
          value={draft}
        />
        <button className="pa-btn is-primary" disabled={closed || sending || !draft.trim()} type="submit">
          {sending ? "Küldés…" : "Küldés"}
        </button>
      </form>
      {note || (!closed && !coarse) ? (
        <p className="pa-composer-note">
          {note}
          {note && !coarse ? " · " : ""}
          {!closed && !coarse ? "Enter: küldés · Shift+Enter: új sor" : ""}
        </p>
      ) : null}
    </section>
  );
}
