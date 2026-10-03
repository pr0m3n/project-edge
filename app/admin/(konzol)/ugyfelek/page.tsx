import type { Metadata } from "next";
import { ClientsView } from "@/components/admin/console/views/ClientsView";

export const metadata: Metadata = { title: "Ügyfelek · ProjectEdge Admin" };

export default function Page() {
  return <ClientsView />;
}
