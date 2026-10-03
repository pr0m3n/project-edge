import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import { AlkonySite } from "./AlkonySite";
import "./alkony.css";

/* Egyetlen betűcsalád az egész oldalon: erős, nagy x-magasságú groteszk.
   Korábban a nagy címek, a logó és az árak Bodoni (Didone) betűvel mentek,
   de a hajszálvonalai még nagy méretben is vékonynak és zavarónak hatottak
   — a hangsúlyt most a méret és a súly adja, nem a betű kontrasztja.
   `latin-ext` nélkül az ő és az ű helyettesítő betűvel jelenne meg. */
const sans = Instrument_Sans({ display: "swap", subsets: ["latin-ext"], variable: "--ak-sans" });

export const metadata: Metadata = {
  title: "Alkony — mintaprojekt | ProjectEdge",
  description:
    "Mintaprojekt: ékszer termékoldal valós idejű 3D medállal — szikrázó gyémántok és egy alexandrit, ami nappali fényben zöld, gyertyafényben lila.",
  robots: { index: false, follow: false }
};

export default function AlkonyDemoPage() {
  return (
    <div className={sans.variable}>
      <AlkonySite />
    </div>
  );
}
