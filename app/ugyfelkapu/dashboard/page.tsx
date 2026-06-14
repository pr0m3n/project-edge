import { ClientPortal } from "@/components/ClientPortal";

export default function ClientDashboardPage() {
  return (
    <main className="site-shell portal-page dashboard-page">
      <ClientPortal view="dashboard" />
    </main>
  );
}
