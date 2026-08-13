import type { Metadata } from "next";
import { DemoNoticeProvider } from "@/components/demo/DemoNotice";
import "./demo-bar.css";

/**
 * A /demo alatti oldalak kitalált márkákat mutatnak be (Zamat, Veyra, Budai
 * Otthonok…), ezért nem indexelhetők: különben a projectedge.hu ezekre a
 * kitalált nevekre rangsorolna.
 *
 * Minden mintaoldal maga is beállítja a `robots` mezőt — ez itt az alapérték,
 * hogy egy később hozzáadott demo akkor se szivárogjon be a keresőbe, ha
 * elfelejtik kiírni. A sitemapból is kikerültek (app/sitemap.ts).
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoNoticeProvider>{children}</DemoNoticeProvider>;
}
