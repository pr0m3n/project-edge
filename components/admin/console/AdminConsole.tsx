"use client";

import "@/components/admin/console/console.css";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { OfflineBanner, ToastStack } from "@/components/ui/feedback";
import { AdminDataProvider, useAdmin } from "@/components/admin/console/AdminData";
import { consoleHref, shortStamp } from "@/components/admin/console/derive";
import {
  IconBell,
  IconChat,
  IconClients,
  IconClose,
  IconLeads,
  IconLogout,
  IconMoney,
  IconMoon,
  IconMore,
  IconSettings,
  IconSun,
  IconToday
} from "@/components/admin/console/icons";
import { Count } from "@/components/admin/console/ui";

/**
 * Az admin konzol kerete.
 *
 *  - Gépen (≥1100 px): bal oldali menüsáv a számlálókkal.
 *  - Tableten: ugyanez ikonsávként.
 *  - Telefonon: felső sáv (cím, értesítések, menü) és alsó menüsor öt
 *    fő résszel, a hüvelykujj alatt.
 *
 * Minden rész saját címet kap (`/admin/ma`, `/admin/ugyfelek/<id>` …), így a
 * vissza gomb működik, és egy értesítésből közvetlenül oda lehet ugrani.
 */

type Section = {
  href: string;
  label: string;
  short: string;
  icon: ReactNode;
};

const SECTIONS: Section[] = [
  { href: "/admin/ma", label: "Ma", short: "Ma", icon: <IconToday /> },
  { href: "/admin/beszelgetesek", label: "Beszélgetések", short: "Üzenetek", icon: <IconChat /> },
  { href: "/admin/ugyfelek", label: "Ügyfelek", short: "Ügyfelek", icon: <IconClients /> },
  { href: "/admin/penz", label: "Pénz", short: "Pénz", icon: <IconMoney /> },
  { href: "/admin/erdeklodok", label: "Érdeklődők", short: "Érdeklődők", icon: <IconLeads /> }
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminConsole({ children }: { children: ReactNode }) {
  return (
    <AdminDataProvider>
      <Shell>{children}</Shell>
    </AdminDataProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const admin = useAdmin();
  const pathname = usePathname() ?? "/admin/ma";
  const router = useRouter();
  // A panel ahhoz az oldalhoz tartozik, ahol megnyitották: oldalváltáskor
  // magától eltűnik (effekt és extra render nélkül).
  const [panelState, setPanelState] = useState<{ kind: "notifications" | "menu"; path: string } | null>(null);
  const panel = panelState && panelState.path === pathname ? panelState.kind : null;
  const setPanel = (kind: "notifications" | "menu" | null) => setPanelState(kind ? { kind, path: pathname } : null);

  useEffect(() => {
    if (!panel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelState(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  /* A sandbox fizetési teszt a Stripe-ról ide tér vissza; eddig semmi nem
     jelezte, hogy sikerült-e. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("payment-test");
    if (!result) return;
    admin.actions.notify(result === "success" ? "A sandbox fizetési teszt sikeres volt." : "A sandbox fizetési tesztet megszakítottad.", result === "success" ? "success" : "info");
    params.delete("payment-test");
    const query = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    // Csak az első betöltéskor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { counts } = admin;
  const badges: Record<string, ReactNode> = {
    "/admin/ma": <Count tone={counts.todayUrgent ? "hot" : undefined} value={counts.todayAction} />,
    "/admin/beszelgetesek": counts.needsReply ? <Count tone="hot" value={counts.needsReply} /> : <Count tone="ai" value={counts.aiConversations} />,
    "/admin/ugyfelek": <Count value={counts.adminTurn} />,
    "/admin/penz": <Count tone="hot" value={counts.moneyAttention} />,
    "/admin/erdeklodok": <Count value={counts.freshLeads} />
  };
  const hot: Record<string, boolean> = {
    "/admin/ma": counts.todayUrgent > 0,
    "/admin/beszelgetesek": counts.needsReply > 0,
    "/admin/ugyfelek": counts.adminTurn > 0,
    "/admin/penz": counts.moneyAttention > 0,
    "/admin/erdeklodok": counts.freshLeads > 0
  };

  const current = [...SECTIONS, { href: "/admin/beallitasok", label: "Beállítások", short: "Beállítások", icon: null }]
    .find((section) => isActive(pathname, section.href));

  const liveLabel = admin.realtimeStatus === "live" ? "Élő kapcsolat" : admin.realtimeStatus === "connecting" ? "Kapcsolódás…" : "Nincs élő kapcsolat";

  return (
    <main className="admin-page pe-admin" data-admin-theme={admin.theme}>
      <div className="pa-shell">
        <aside aria-label="Admin menü" className="pa-sidebar">
          <Link className="pa-brand" href="/admin/ma">
            <span className="pa-brand-mark">PE</span>
            <span className="pa-brand-text">
              <strong>ProjectEdge</strong>
              <span>Admin</span>
            </span>
          </Link>

          <nav className="pa-nav">
            {SECTIONS.map((section) => (
              <Link
                aria-current={isActive(pathname, section.href) ? "page" : undefined}
                className="pa-nav-item"
                href={section.href}
                key={section.href}
                title={section.label}
              >
                <span className="pa-nav-icon">{section.icon}</span>
                <span className="pa-nav-text">{section.label}</span>
                {badges[section.href]}
                <span aria-hidden="true" className={`pa-dot${hot[section.href] ? " is-on" : ""}`} />
              </Link>
            ))}
          </nav>

          <div className="pa-sidebar-foot">
            <Link
              aria-current={isActive(pathname, "/admin/beallitasok") ? "page" : undefined}
              className="pa-nav-item"
              href="/admin/beallitasok"
              title="Beállítások"
            >
              <span className="pa-nav-icon"><IconSettings /></span>
              <span className="pa-nav-text">Beállítások</span>
            </Link>
            <button
              className="pa-nav-item"
              onClick={() => admin.setTheme(admin.theme === "light" ? "dark" : "light")}
              style={{ background: "none", border: 0, cursor: "pointer", font: "inherit", textAlign: "left", width: "100%" }}
              title={admin.theme === "light" ? "Sötét mód" : "Világos mód"}
              type="button"
            >
              <span className="pa-nav-icon">{admin.theme === "light" ? <IconMoon /> : <IconSun />}</span>
              <span className="pa-nav-text">{admin.theme === "light" ? "Sötét mód" : "Világos mód"}</span>
            </button>
            <span className={`pa-live is-${admin.realtimeStatus}`} title={liveLabel}>
              <i aria-hidden="true" />
              <span>{liveLabel}</span>
            </span>
          </div>
        </aside>

        <div className="pa-main">
          <header className="pa-topbar">
            <div className="pa-topbar-title">
              <span className="pa-brand-mark" aria-hidden="true">PE</span>
              <strong>{current?.label ?? "Admin"}</strong>
            </div>
            <span className="pa-search-hint" aria-hidden="true" />
            <span className={`pa-live is-${admin.realtimeStatus}`} title={liveLabel}>
              <i aria-hidden="true" />
            </span>
            <button
              aria-expanded={panel === "notifications"}
              aria-label={`Értesítések${admin.unreadNotifications ? ` (${admin.unreadNotifications} olvasatlan)` : ""}`}
              className="pa-icon-btn"
              onClick={() => setPanel(panel === "notifications" ? null : "notifications")}
              type="button"
            >
              <IconBell />
              {admin.unreadNotifications ? <span className="pa-badge-dot">{admin.unreadNotifications > 9 ? "9+" : admin.unreadNotifications}</span> : null}
            </button>
            <button
              aria-expanded={panel === "menu"}
              aria-label="Menü"
              className="pa-icon-btn"
              onClick={() => setPanel(panel === "menu" ? null : "menu")}
              type="button"
            >
              <IconMore />
            </button>
          </header>

          <OfflineBanner online={admin.online} />

          <div className="pa-content">
            {admin.loadError ? (
              <div className="pa-banner is-danger" role="alert">
                <div>
                  <strong>Betöltési hiba</strong>
                  <p>{admin.loadError}</p>
                </div>
                <button className="pa-btn is-sm" onClick={() => void admin.actions.reload()} type="button">Újra</button>
              </div>
            ) : null}
            {children}
          </div>
        </div>
      </div>

      <nav aria-label="Fő menü" className="pa-bottombar">
        {SECTIONS.map((section) => (
          <Link
            aria-current={isActive(pathname, section.href) ? "page" : undefined}
            className="pa-tab"
            href={section.href}
            key={section.href}
          >
            {section.icon}
            <span>{section.short}</span>
            {badges[section.href]}
          </Link>
        ))}
      </nav>

      {panel ? <div aria-hidden="true" className="pa-scrim" onClick={() => setPanel(null)} /> : null}

      {panel === "notifications" ? (
        <section aria-label="Értesítések" className="pa-popover" role="dialog">
          <header className="pa-popover-head">
            <strong>Értesítések</strong>
            <div className="pa-inline">
              {admin.unreadNotifications ? (
                <button className="pa-link" onClick={() => void admin.actions.markAllNotificationsRead()} type="button">Mind olvasott</button>
              ) : null}
              <button aria-label="Bezárás" className="pa-icon-btn" onClick={() => setPanel(null)} type="button"><IconClose /></button>
            </div>
          </header>
          <div className="pa-popover-scroll">
            {admin.notifications.length === 0 ? (
              <p className="pa-empty">Nincsenek értesítések.</p>
            ) : admin.notifications.map((item) => (
              <button
                className={`pa-notif${item.read ? "" : " is-unread"}`}
                key={item.id}
                onClick={() => {
                  if (!item.read) void admin.actions.markNotificationRead(item.id);
                  setPanel(null);
                  router.push(consoleHref(item.link));
                }}
                type="button"
              >
                <strong>{item.title}</strong>
                <p>{item.message}</p>
                <time dateTime={item.created_at}>{shortStamp(item.created_at, admin.nowMs)}</time>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {panel === "menu" ? (
        <section aria-label="Menü" className="pa-popover" role="dialog">
          <header className="pa-popover-head">
            <strong>Menü</strong>
            <button aria-label="Bezárás" className="pa-icon-btn" onClick={() => setPanel(null)} type="button"><IconClose /></button>
          </header>
          <div className="pa-menu">
            <Link href="/admin/beallitasok"><IconSettings /> Beállítások</Link>
            <button onClick={() => admin.setTheme(admin.theme === "light" ? "dark" : "light")} type="button">
              {admin.theme === "light" ? <IconMoon /> : <IconSun />}
              {admin.theme === "light" ? "Sötét mód" : "Világos mód"}
            </button>
            <button onClick={() => void admin.actions.signOut()} type="button"><IconLogout /> Kilépés</button>
          </div>
        </section>
      ) : null}

      <ToastStack onDismiss={admin.dismissToast} toasts={admin.toasts} />
      {admin.confirmModal}
    </main>
  );
}
