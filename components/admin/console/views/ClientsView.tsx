"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAdmin } from "@/components/admin/console/AdminData";
import { clientHref, isAdminTurn, isLiveProject, relativeTime } from "@/components/admin/console/derive";
import { IconArrow, IconClients, IconPlus, IconSearch } from "@/components/admin/console/icons";
import { Badge, Count, EmptyState, HealthBadge, ListSkeleton, PageHead, ProjectStatusBadge } from "@/components/admin/console/ui";
import type { ClientProject } from "@/components/admin/types";
import { formatHuf, isWebsitePackage, purchaseOptionPrice, subscriptionPlan } from "@/lib/subscriptions";

/**
 * Ügyfelek — minden projekt egy listában.
 *
 * A régi „Projektek" és „Menedzselt oldalak" fül egyesítése. Egy sor egy
 * ügyfél-projekt; rákattintva a teljes ügyfél-lap nyílik. A lezárt projektek
 * az „Archív" szűrőben vannak, nem keverednek az élők közé.
 */

type Filter = "live" | "turn" | "subscription" | "purchase" | "archive";

export function modelLabel(project: ClientProject) {
  if (project.commercial_model === "subscription") {
    const plan = subscriptionPlan(project.subscription_plan);
    return `${plan.name} · ${formatHuf(project.monthly_price ?? plan.price)}/hó`;
  }
  const purchasePlan = project.brief_data && isWebsitePackage(project.brief_data) ? subscriptionPlan(project.brief_data.subscriptionPlan) : null;
  if (purchasePlan) return `${purchasePlan.name} · ${formatHuf(project.offer_price ?? purchaseOptionPrice(purchasePlan.key))} egyszeri`;
  return project.offer_price ? `Egyedi · ${formatHuf(project.offer_price)}` : `Egyedi projekt${project.budget ? ` · ${project.budget}` : ""}`;
}

export function ClientsView() {
  const admin = useAdmin();
  const [filter, setFilter] = useState<Filter>("live");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const live = admin.clientProjects.filter(isLiveProject);
    return {
      live,
      turn: live.filter(isAdminTurn),
      subscription: live.filter((p) => p.commercial_model === "subscription"),
      purchase: live.filter((p) => p.commercial_model === "purchase"),
      archive: admin.clientProjects.filter((p) => !isLiveProject(p))
    } satisfies Record<Filter, ClientProject[]>;
  }, [admin.clientProjects]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = needle ? (filter === "archive" ? groups.archive : admin.clientProjects) : groups[filter];
    return list.filter((project) => {
      if (!needle) return true;
      return [project.title, project.company, project.contact_name, project.contact_email, project.project_type, project.managed_domain_name, project.website]
        .filter(Boolean)
        .some((field) => (field as string).toLowerCase().includes(needle));
    }).sort((a, b) => Number(isAdminTurn(b)) - Number(isAdminTurn(a)) || new Date(b.last_modified_at ?? b.created_at).getTime() - new Date(a.last_modified_at ?? a.created_at).getTime());
  }, [admin.clientProjects, filter, groups, query]);

  const chips: Array<[Filter, string]> = [
    ["live", "Élő"],
    ["turn", "Rajtad a sor"],
    ["subscription", "Havidíjas"],
    ["purchase", "Egyszeri"],
    ["archive", "Archív"]
  ];

  return (
    <>
      <PageHead
        compact
        actions={(
          <Link className="pa-btn is-primary" href="/admin/ugyfelek/uj">
            <IconPlus /> Ügyfél hozzáadása
          </Link>
        )}
        subtitle={`${groups.live.length} élő projekt · ${groups.turn.length} vár rád`}
        title="Ügyfelek"
      />

      <div className="pa-toolbar">
        <label className="pa-search">
          <IconSearch />
          <span className="sr-only">Keresés</span>
          <input className="pa-input" onChange={(event) => setQuery(event.target.value)} placeholder="Keresés cím, név, email, domain szerint" type="search" value={query} />
        </label>
        <div aria-label="Szűrés" className="pa-chips is-scroll" role="group">
          {chips.map(([value, label]) => (
            <button aria-pressed={filter === value} className="pa-chip" key={value} onClick={() => setFilter(value)} type="button">
              {label}
              <Count tone={value === "turn" && groups.turn.length ? "hot" : undefined} value={groups[value].length} />
            </button>
          ))}
        </div>
      </div>

      {admin.loading ? (
        <ListSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <div className="pa-card">
          <EmptyState icon={<IconClients />} title={query ? "Nincs találat" : filter === "archive" ? "Nincs lezárt projekt" : "Nincs ilyen projekt"}>
            {query ? "Próbálj más kulcsszót." : filter === "live" ? "A regisztrált ügyfelek projektindításai és a kézzel felvett ügyfelek itt jelennek meg." : "Ebben a szűrésben most nincs semmi."}
          </EmptyState>
        </div>
      ) : (
        <div className="pa-list">
          {rows.map((project) => {
            const turn = isLiveProject(project) && isAdminTurn(project);
            return (
              <Link className="pa-row" href={clientHref(project.id)} key={project.id}>
                <div className="pa-row-main">
                  <div className="pa-row-top">
                    <span className="pa-row-title">{project.title}</span>
                    <ProjectStatusBadge project={project} />
                    {turn ? <Badge tone="accent">Rajtad a sor</Badge> : null}
                    {project.commercial_model === "subscription" && project.status === "launched" ? <HealthBadge status={project.site_health_status} /> : null}
                  </div>
                  <span className="pa-row-sub">
                    {[project.company, project.contact_name, project.contact_email].filter(Boolean).join(" · ") || "Nincs kapcsolattartó"}
                  </span>
                  <span className="pa-row-meta">
                    <span className="pa-only-mobile" style={{ display: "none" }}>{relativeTime(project.last_modified_at ?? project.created_at, admin.nowMs)} · </span>
                    {modelLabel(project)}
                    {project.next_step ? ` · ${project.next_step.length > 110 ? `${project.next_step.slice(0, 109)}…` : project.next_step}` : ""}
                  </span>
                </div>
                <div className="pa-row-side pa-hide-mobile">
                  <span className="pa-faint">{relativeTime(project.last_modified_at ?? project.created_at, admin.nowMs)}</span>
                  <IconArrow className="pa-faint" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
