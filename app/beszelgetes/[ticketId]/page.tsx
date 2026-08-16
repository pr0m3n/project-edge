import type { Metadata } from "next";
import { ResumeConversation } from "./ResumeConversation";

/**
 * A support beszélgetés folytatása másik eszközön.
 *
 * A tokent a link hash-e hordozza, amit a szerver nem lát — ezért a tényleges
 * munkát egy kliens komponens végzi. Az oldal `noindex`: privát beszélgetéshez
 * vezet, nincs keresőben helye.
 */
export const metadata: Metadata = {
  title: "Beszélgetés folytatása | ProjectEdge",
  robots: { index: false, follow: false, nocache: true }
};

export default async function ResumeConversationPage({
  params
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  return (
    <main className="site-shell light-page">
      <ResumeConversation ticketId={ticketId} />
    </main>
  );
}
