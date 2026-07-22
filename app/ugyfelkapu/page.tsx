import type { Metadata } from "next";
import { ClientPortal } from "@/components/ClientPortal";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Ügyfélkapu | ProjectEdge",
  description: "Projektindítás, brief, üzenetek és projektstátusz egyetlen átlátható ügyfélfelületen."
};

export default function ClientPortalPage() {
  return (
    <main className="site-shell portal-page">
      <SiteNav />
      <ClientPortal view="auth" />
    </main>
  );
}
