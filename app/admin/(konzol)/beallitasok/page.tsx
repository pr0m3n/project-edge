import type { Metadata } from "next";
import { SettingsView } from "@/components/admin/console/views/SettingsView";

export const metadata: Metadata = { title: "Beállítások · ProjectEdge Admin" };

export default function Page() {
  return <SettingsView />;
}
