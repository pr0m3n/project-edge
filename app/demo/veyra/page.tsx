import type { Metadata } from "next";
import { Geist_Mono, Schibsted_Grotesk } from "next/font/google";
import { VeyraSite } from "./VeyraSite";
import "./veyra.css";

/* `latin-ext` nélkül az ő és az ű helyettesítő betűvel jelenne meg. */
const sans = Schibsted_Grotesk({ display: "swap", subsets: ["latin-ext"], variable: "--vy-sans" });
const mono = Geist_Mono({ display: "swap", subsets: ["latin-ext"], variable: "--vy-mono" });

export const metadata: Metadata = {
  title: "Veyra — mintaprojekt | ProjectEdge",
  description:
    "Mintaprojekt: foglalórendszer landing oldala egy kitalált márkának — görgetésre megtelő 3D hétnaptár, várólista, interaktív árazás.",
  robots: { index: false, follow: false }
};

export default function VeyraDemoPage() {
  return (
    <div className={`${sans.variable} ${mono.variable}`}>
      <VeyraSite />
    </div>
  );
}
