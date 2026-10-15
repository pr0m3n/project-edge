import type { Metadata } from "next";
import { EmailsView } from "@/components/admin/console/views/EmailsView";

export const metadata: Metadata = { title: "Levelek · ProjectEdge Admin" };

export default function Page() {
  return <EmailsView />;
}
