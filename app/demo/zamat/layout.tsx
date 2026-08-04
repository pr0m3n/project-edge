import type { Metadata } from "next";
import { DemoBar } from "@/components/demo/DemoBar";
import { CartProvider } from "./CartContext";
import { CartDrawer, ZamatFooter, ZamatHeader } from "./ZamatChrome";
import "./zamat.css";

export const metadata: Metadata = {
  title: "Zamat Kávépörkölő — mintaprojekt | ProjectEdge",
  description:
    "Mintaprojekt: teljes webáruház egy kitalált specialty kávépörkölő márkának, működő kosárral és termékoldalakkal.",
  robots: { index: false, follow: false }
};

export default function ZamatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="zm-root">
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
