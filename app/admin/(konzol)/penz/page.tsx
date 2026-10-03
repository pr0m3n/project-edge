import type { Metadata } from "next";
import { MoneyView } from "@/components/admin/console/views/MoneyView";

export const metadata: Metadata = { title: "Pénz · ProjectEdge Admin" };

export default function Page() {
  return <MoneyView />;
}
