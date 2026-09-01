import type { Metadata } from "next";
import { Alfa_Slab_One, Roboto_Mono } from "next/font/google";
import { FixoraSite } from "./FixoraSite";
import "./fixora.css";

/* A `latin-ext` alkészlet kell, különben az ő és az ű helyettesítő betűvel
   jelenne meg a kövér címsorokban. */
const display = Alfa_Slab_One({
  display: "swap",
  subsets: ["latin-ext"],
  variable: "--fxr-display",
  weight: "400"
});

const mono = Roboto_Mono({
  display: "swap",
  subsets: ["latin-ext"],
  variable: "--fxr-mono",
  weight: ["500", "700"]
});

export const metadata: Metadata = {
  title: "Varga Villanyszerelés — mintaprojekt | ProjectEdge",
  description: "Mintaprojekt: ajánlatkérő és árbecslő oldal egy kitalált helyi villanyszerelő márkának.",
  robots: { index: false, follow: false }
};

export default function VargaVillanyDemoPage() {
  return <FixoraSite fontClass={`${display.variable} ${mono.variable}`} />;
}
