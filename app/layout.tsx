import type { Metadata } from "next";
import { MotionVars } from "@/components/MotionVars";
import { SupportWidget } from "@/components/SupportWidget";
import { SiteFooter } from "@/components/SiteFooter";
import { ChromeGate } from "@/components/ChromeGate";
import { Analytics } from "@/components/Analytics";
import { CookieBanner } from "@/components/CookieBanner";
import { ExitOffer } from "@/components/ExitOffer";
import { JsonLd } from "@/components/JsonLd";
import { PROVIDER } from "@/lib/legal";
import { CONSENT_DEFAULT_SCRIPT, measurementEnabled } from "@/lib/analytics";
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
      <head>
        {measurementEnabled ? (
          <script id="consent-default" dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT_SCRIPT }} />
        ) : null}
      </head>
      <body>
        <a className="skip-link" href="#main-content">Ugrás a tartalomhoz</a>
        <JsonLd data={{
          "@context": "https://schema.org",
          "@type": "ProfessionalService",
          "@id": "https://www.projectedge.hu/#business",
          name: PROVIDER.brand,
          legalName: PROVIDER.legalName,
          url: "https://www.projectedge.hu",
          email: PROVIDER.email,
          image: "https://www.projectedge.hu/opengraph-image",
          address: {
            "@type": "PostalAddress",
            streetAddress: "Kard köz 1. B",
            postalCode: "8200",
            addressLocality: "Veszprém",
            addressCountry: "HU"
          },
          areaServed: { "@type": "Country", name: "Magyarország" },
          priceRange: "14 900–599 000 Ft",
          founder: { "@type": "Person", name: PROVIDER.contactName }
        }} />
        <Analytics />
        <div id="main-content" tabIndex={-1}>{children}</div>
        <ChromeGate>
          <SiteFooter />
          <SupportWidget />
        </ChromeGate>
        <CookieBanner />
        <ExitOffer />
        {/* Keep DOM-mutating reveal effects after the streamed page subtree. */}
        <MotionVars />
      </body>
    </html>
  );
}
