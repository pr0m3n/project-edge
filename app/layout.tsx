import type { Metadata } from "next";
import { MotionVars } from "@/components/MotionVars";
import { SupportWidget } from "@/components/SupportWidget";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProjectEdge | Prémium weboldalak és digitális rendszerek",
  description:
    "ProjectEdge prémium weboldalakat, ügyfélkapukat és üzleti admin felületeket épít növekedésre kész vállalkozásoknak.",
  metadataBase: new URL("https://www.projectedge.hu"),
  openGraph: {
    title: "ProjectEdge | Weboldalak, amelyek üzletet építenek",
    description:
      "Egyedi weboldal készítés, ügyfél dashboard, admin rendszerek és Supabase alapú üzleti automatizáció.",
    url: "https://www.projectedge.hu",
    siteName: "ProjectEdge",
    locale: "hu_HU",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "ProjectEdge | Weboldalak, amelyek üzletet építenek",
    description:
      "Egyedi weboldal készítés, ügyfél dashboard, admin rendszerek és Supabase alapú üzleti automatizáció."
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body>
        <MotionVars />
        {children}
        <SiteFooter />
        <SupportWidget />
      </body>
    </html>
  );
}
