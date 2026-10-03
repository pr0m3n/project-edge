import type { Metadata } from "next";
import { ConversationsView } from "@/components/admin/console/views/ConversationsView";

export const metadata: Metadata = { title: "Beszélgetések · ProjectEdge Admin" };

export default function Page() {
  return <ConversationsView />;
}
