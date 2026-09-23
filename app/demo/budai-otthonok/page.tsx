import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { NestSite } from "./NestSite";
import "./nest.css";

/* A betűpár az építészeti rajzot idézi: széles grotesk a címekhez (az Archivo
   `wdth` tengelyén), monospace a méretekhez és adatokhoz. `latin-ext` nélkül
   az ő és az ű helyettesítő betűvel jelenne meg. */
const sans = Archivo({
  axes: ["wdth"],
  display: "swap",
  subsets: ["latin-ext"],
  variable: "--bo-sans"
});

const mono = JetBrains_Mono({
  display: "swap",
  subsets: ["latin-ext"],
  variable: "--bo-mono"
});

export const metadata: Metadata = {
  title: "Budai Otthonok — mintaprojekt | ProjectEdge",
  description: "Mintaprojekt: ingatlankereső 3D makettel, forgatható alaprajzzal és napfény-számítással.",
  robots: { index: false, follow: false }
};

export default function BudaiOtthonokDemoPage() {
  return (
    <div className={`${sans.variable} ${mono.variable}`}>
      <NestSite />
    </div>
  );
}
