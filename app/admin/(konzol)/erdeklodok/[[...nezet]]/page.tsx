import type { Metadata } from "next";
import { LeadsView } from "@/components/admin/console/views/LeadsView";

export const metadata: Metadata = { title: "Érdeklődők · ProjectEdge Admin" };

export default function Page() {
  return <LeadsView />;
}
