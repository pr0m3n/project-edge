import type { Metadata } from "next";
import { ClientDetailView } from "@/components/admin/console/views/ClientDetailView";

export const metadata: Metadata = { title: "Ügyfél · ProjectEdge Admin" };

export default function Page() {
  return <ClientDetailView />;
}
