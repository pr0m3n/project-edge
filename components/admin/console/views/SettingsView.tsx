"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddClientPanel } from "@/components/admin/AddClientPanel";
import { useAdmin } from "@/components/admin/console/AdminData";
import { IconHistory, IconLogout, IconMoon, IconSun, IconTest } from "@/components/admin/console/icons";
import { Card, PageHead } from "@/components/admin/console/ui";

/** Beállítások: téma, kapcsolat, sandbox fizetési teszt, kilépés. */
export function SettingsView() {
  const admin = useAdmin();
  const liveLabel = admin.realtimeStatus === "live"
    ? "Élő — a változások azonnal megjelennek."
    : admin.realtimeStatus === "connecting"
      ? "Kapcsolódás folyamatban…"
      : "Megszakadt. Újracsatlakozás után magától frissül.";

  return (
    <>
      <PageHead compact title="Beállítások" />
      <div className="pa-stack" style={{ maxWidth: 760 }}>
        <Card title="Megjelenés">
          <div className="pa-inline">
            <button aria-pressed={admin.theme === "dark"} className={`pa-btn${admin.theme === "dark" ? " is-primary" : ""}`} onClick={() => admin.setTheme("dark")} type="button"><IconMoon /> Sötét</button>
            <button aria-pressed={admin.theme === "light"} className={`pa-btn${admin.theme === "light" ? " is-primary" : ""}`} onClick={() => admin.setTheme("light")} type="button"><IconSun /> Világos</button>
          </div>
        </Card>

        <Card title="Kapcsolat">
          <div className="pa-kv">
            <div><span>Élő frissítés</span><strong>{liveLabel}</strong></div>
            <div><span>Internet</span><strong>{admin.online ? "Elérhető" : "Nincs kapcsolat"}</strong></div>
          </div>
          <div className="pa-inline" style={{ marginTop: 12 }}>
            <button className="pa-btn" onClick={() => void admin.actions.reload(true)} type="button">Adatok újratöltése</button>
          </div>
        </Card>

        <Card subtitle="Csak Stripe sandbox környezetben érhető el. A végén ide tér vissza, és jelzi az eredményt." title="Fizetési teszt">
          <button className="pa-btn" disabled={admin.paymentTestLoading} onClick={() => void admin.actions.startPaymentSmokeTest()} type="button">
            <IconTest /> {admin.paymentTestLoading ? "Indítás…" : "200 Ft sandbox teszt"}
          </button>
        </Card>

        <Card subtitle="Az új admin mellett átmenetileg elérhető a régi felület is, ha valamit ott keresnél." title="Régi admin">
          <Link className="pa-btn" href="/admin/regi"><IconHistory /> Régi admin megnyitása</Link>
        </Card>

        <Card title="Fiók">
          <button className="pa-btn is-danger" onClick={() => void admin.actions.signOut()} type="button"><IconLogout /> Kilépés</button>
        </Card>
      </div>
    </>
  );
}

/** Új ügyfél kézi felvétele — a meglévő, tesztelt felvételi panel. */
export function AddClientView() {
  const admin = useAdmin();
  const router = useRouter();
  return (
    <>
      <PageHead back={{ href: "/admin/ugyfelek", label: "Ügyfelek" }} subtitle="Már meglévő, a rendszeren kívül szerződött ügyfél felvétele számlázással együtt." title="Ügyfél hozzáadása" />
      <div className="pa-embed">
        <AddClientPanel
          onClose={() => router.push("/admin/ugyfelek")}
          onCreated={() => admin.actions.reload(true)}
          onNotice={(text) => admin.actions.notify(text)}
        />
      </div>
    </>
  );
}
