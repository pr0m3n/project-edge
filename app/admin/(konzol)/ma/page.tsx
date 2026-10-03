import type { Metadata } from "next";
import { TodayView } from "@/components/admin/console/views/TodayView";

export const metadata: Metadata = { title: "Ma · ProjectEdge Admin" };

export default function Page() {
  return <TodayView />;
}
