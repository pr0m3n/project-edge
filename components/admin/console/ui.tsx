"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IconBack, IconInbox } from "@/components/admin/console/icons";
import { PROJECT_STATUS_LABEL, SUBSCRIPTION_STATUS_LABEL, type Conversation } from "@/components/admin/console/derive";
import type { ClientProject } from "@/components/admin/types";

/** Az admin konzol közös építőelemei. Csak megjelenítés, logika nélkül. */

export function PageHead({
  title,
  subtitle,
  actions,
  back,
  compact = false
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  /** Telefonon a cím a felső sávban van — itt nem kell kétszer. */
  compact?: boolean;
}) {
  return (
    <>
      {back ? (
        <Link className="pa-back" href={back.href}>
          <IconBack />
          {back.label}
        </Link>
      ) : null}
      <header className={`pa-page-head${compact ? " is-compact" : ""}`}>
        <div>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {actions ? <div className="pa-page-actions">{actions}</div> : null}
      </header>
    </>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
  tone
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: "hot" | "good";
}) {
  const className = `pa-stat${tone ? ` is-${tone}` : ""}`;
  const body = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </>
  );
  return href ? <Link className={className} href={href}>{body}</Link> : <div className={className}>{body}</div>;
}

export type Tone = "neutral" | "accent" | "ai" | "success" | "warn" | "danger";

export function Badge({ tone = "neutral", dot = false, children }: { tone?: Tone; dot?: boolean; children: ReactNode }) {
  return (
    <span className={`pa-badge${tone === "neutral" ? "" : ` is-${tone}`}`}>
      {dot ? <i aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function Count({ value, tone }: { value: number; tone?: "hot" | "ai" }) {
  if (!value) return null;
  return <span className={`pa-count${tone ? ` is-${tone}` : ""}`}>{value > 99 ? "99+" : value}</span>;
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="pa-empty">
      <span className="pa-empty-icon">{icon ?? <IconInbox />}</span>
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Betöltés" className="pa-list">
      {Array.from({ length: rows }, (_, index) => (
        <div className="pa-row" key={index}>
          <div className="pa-row-main">
            <span className="pa-skel" style={{ height: 14, width: `${40 + ((index * 17) % 35)}%` }} />
            <span className="pa-skel" style={{ height: 12, marginTop: 6, width: `${55 + ((index * 11) % 30)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Card({ title, subtitle, actions, children, pad = true }: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  pad?: boolean;
}) {
  return (
    <section className="pa-card">
      {title ? (
        <header className="pa-card-head">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="pa-inline">{actions}</div> : null}
        </header>
      ) : null}
      {pad ? <div className="pa-card-body">{children}</div> : children}
    </section>
  );
}

/* ── Állapot-címkék ─────────────────────────────────────────────────────── */

export function projectTone(project: ClientProject): Tone {
  if (project.delete_requested) return "danger";
  if (project.status === "closed") return "neutral";
  if (project.status === "launched") return "success";
  if (project.status === "paused") return "warn";
  if (["request_received", "planning", "in_progress"].includes(project.status)) return "accent";
  return "ai";
}

export function ProjectStatusBadge({ project }: { project: ClientProject }) {
  return (
    <Badge dot tone={projectTone(project)}>
      {project.delete_requested ? "Törlést kért" : PROJECT_STATUS_LABEL[project.status] ?? project.status}
    </Badge>
  );
}

export function SubscriptionBadge({ status }: { status: string | null }) {
  const value = status ?? "inactive";
  const tone: Tone = value === "active" ? "success"
    : value === "cancelled" ? "neutral"
      : value.endsWith("_requested") ? "accent"
        : value === "paused" ? "warn" : "neutral";
  return <Badge tone={tone}>{SUBSCRIPTION_STATUS_LABEL[value] ?? value}</Badge>;
}

export function HealthBadge({ status }: { status: string | null }) {
  if (status === "offline") return <Badge dot tone="danger">Oldal leállt</Badge>;
  if (status === "issue_detected") return <Badge dot tone="warn">Figyelmet igényel</Badge>;
  if (status === "healthy") return <Badge dot tone="success">Oldal rendben</Badge>;
  return null;
}

export function ConversationStatusBadge({ conversation }: { conversation: Conversation }) {
  if (conversation.status === "bot") {
    return <Badge tone="ai">{conversation.handoffReason ? "AI · átadást kért" : "AI kezeli"}</Badge>;
  }
  if (conversation.status === "open") return <Badge tone="accent">Válaszra vár</Badge>;
  if (conversation.status === "answered") return <Badge tone="success">Megválaszolva</Badge>;
  return <Badge>Lezárva</Badge>;
}
