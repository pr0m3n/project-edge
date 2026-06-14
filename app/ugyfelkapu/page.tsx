import { ClientPortal } from "@/components/ClientPortal";
import { SiteNav } from "@/components/SiteNav";

export default function ClientPortalPage() {
  return (
    <main className="site-shell portal-page">
      <SiteNav />
      <ClientPortal />
    </main>
  );
}
