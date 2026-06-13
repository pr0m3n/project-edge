import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProjectEdge | Premium weboldalak es digitális rendszerek",
  description:
    "ProjectEdge prémium weboldalakat, ajánlatkérő rendszereket és üzleti admin felületeket épít növekedésre kész vállalkozásoknak.",
  metadataBase: new URL("https://www.projectedge.hu"),
  openGraph: {
    title: "ProjectEdge | Weboldalak, amelyek üzletet építenek",
    description:
      "Egyedi weboldal készítés, lead-kezelés, admin rendszerek és Supabase alapú üzleti automatizáció.",
    url: "https://www.projectedge.hu",
    siteName: "ProjectEdge",
    locale: "hu_HU",
    type: "website"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
