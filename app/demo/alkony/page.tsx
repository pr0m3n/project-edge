import type { Metadata } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import { AlkonySite } from "./AlkonySite";
import "./alkony.css";

/* Didone a címekhez és a márkanévhez (a divatlapok és ékszerházak betűje),
   geometrikus grotesk minden máshoz. `latin-ext` nélkül az ő és az ű
   helyettesítő betűvel jelenne meg. */
const display = Bodoni_Moda({
  axes: ["opsz"],
  display: "swap",
  style: ["normal"],
  subsets: ["latin-ext"],
  variable: "--ak-display"
});

const sans = Jost({ display: "swap", subsets: ["latin-ext"], variable: "--ak-sans" });

export const metadata: Metadata = {
  title: "Alkony — mintaprojekt | ProjectEdge",
  description:
    "Mintaprojekt: ékszer termékoldal valós idejű 3D medállal — szikrázó gyémántok és egy alexandrit, ami nappali fényben zöld, gyertyafényben lila.",
  robots: { index: false, follow: false }
};

export default function AlkonyDemoPage() {
  return (
    <div className={`${display.variable} ${sans.variable}`}>
      <AlkonySite />
    </div>
  );
}
