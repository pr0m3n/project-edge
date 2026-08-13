import type { Metadata } from "next";
import { DemoNoticeProvider } from "@/components/demo/DemoNotice";
import "./demo-bar.css";

/**
 * A /demo alatti oldalak kitalált márkákat mutatnak be (Zamat, Veyra, Budai
 * Otthonok…). Indexelve ezekre a nevekre rangsorolna a projectedge.hu, ami
 * félrevezető találatokat ad — a mintaoldalak a /munkak oldalról érhetők el.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true }
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoNoticeProvider>{children}</DemoNoticeProvider>;
}
