import type { Metadata } from "next";
import { Big_Shoulders, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { DemoBar } from "@/components/demo/DemoBar";
import { CartProvider } from "./CartContext";
import { CartDrawer, ZamatFooter, ZamatHeader } from "./ZamatChrome";
import "./zamat.css";

/* Ipari, keskeny címbetű (a pörkölőgépek és zsákfeliratok világa), mellé
   Plex a szövegnek és a mérési adatoknak. `latin-ext` nélkül az ő és az ű
   helyettesítő betűvel jelenne meg. */
const display = Big_Shoulders({
  display: "swap",
  subsets: ["latin-ext"],
  variable: "--zm-display"
});

const sans = IBM_Plex_Sans({
  display: "swap",
  subsets: ["latin-ext"],
  variable: "--zm-sans",
  weight: ["400", "500", "600"]
});

const mono = IBM_Plex_Mono({
  display: "swap",
  subsets: ["latin-ext"],
  variable: "--zm-mono",
  weight: ["400", "500"]
});

export const metadata: Metadata = {
  title: "Zamat Kávépörkölő — mintaprojekt | ProjectEdge",
  description:
    "Mintaprojekt: webáruház egy kitalált kávépörkölőnek — görgetésre lejátszott 3D pörkölés, forgatható zacskó, működő kosár.",
  robots: { index: false, follow: false }
};

export default function ZamatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`zm-root ${display.variable} ${sans.variable} ${mono.variable}`}>
      <DemoBar project="Zamat Kávépörkölő" />
      <CartProvider>
        <ZamatHeader />
        {children}
        <ZamatFooter />
        <CartDrawer />
      </CartProvider>
    </div>
  );
}
