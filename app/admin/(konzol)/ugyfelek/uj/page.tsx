import type { Metadata } from "next";
import { AddClientView } from "@/components/admin/console/views/SettingsView";

export const metadata: Metadata = { title: "Ügyfél hozzáadása · ProjectEdge Admin" };

export default function Page() {
  return <AddClientView />;
}
