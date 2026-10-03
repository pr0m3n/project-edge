import type { Metadata } from "next";
import { Bodoni_Moda, Instrument_Sans } from "next/font/google";
import { AlkonySite } from "./AlkonySite";
import "./alkony.css";

/* Didone a nagy címekhez és a márkanévhez (a divatlapok és ékszerházak
   betűje) — de CSAK nagy méretben: kicsiben a hajszálvonalai szálkásak.
   Minden más egy erős, nagy x-magasságú groteszk; a korábbi Jost kis
   méretben vékonynak és aprónak hatott. `latin-ext` nélkül az ő és az ű
   helyettesítő betűvel jelenne meg. */
const display = Bodoni_Moda({
  axes: ["opsz"],
  display: "swap",
  style: ["normal"],
  subsets: ["latin-ext"],
  variable: "--ak-display"
});

const sans = Instrument_Sans({ display: "swap", subsets: ["latin-ext"], variable: "--ak-sans" });

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
