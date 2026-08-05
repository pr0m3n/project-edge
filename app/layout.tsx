import type { Metadata } from "next";
import { MotionVars } from "@/components/MotionVars";
import { SupportWidget } from "@/components/SupportWidget";
import { SiteFooter } from "@/components/SiteFooter";
import { ChromeGate } from "@/components/ChromeGate";
import { Analytics } from "@/components/Analytics";
import { CookieBanner } from "@/components/CookieBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProjectEdge | Egyedi weboldalak és digitális rendszerek",
  description:
    "Egyedi weboldalak, ügyfélkapuk és üzleti admin felületek egy kézben — a szövegtől az élesítésig.",
  metadataBase: new URL("https://www.projectedge.hu"),
  // A böngészőfülön és a mobil kezdőlapon is a weboldalon használt PE jel
  // jelenjen meg. Az app/icon.png és app/apple-icon.png ugyanez a jel sötét
  // háttéren; itt kifejezetten deklaráljuk, hogy ne a gyökér /favicon.ico
  // örökölt fájlja nyerjen egyes böngészőkben.
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: ["/icon.png"]
  },
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
        <Analytics />
        {children}
        <ChromeGate>
          <SiteFooter />
          <SupportWidget />
        </ChromeGate>
        <CookieBanner />
      </body>
    </html>
  );
}
