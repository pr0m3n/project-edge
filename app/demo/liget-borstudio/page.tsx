import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import { NomaSite } from "./NomaSite";
import "./noma.css";

/* `latin-ext` nélkül az ő és az ű helyettesítő betűvel jelenne meg. */
/* A Fraunces variable font: `axes` mellett nem adhatunk meg fix `weight`
   értékeket, ezért a teljes vastagságtartományt töltjük be. */
const display = Fraunces({
  axes: ["opsz"],
  display: "swap",
  subsets: ["latin-ext"],
  variable: "--noma-display"
});

const sans = Instrument_Sans({
  display: "swap",
  subsets: ["latin-ext"],
  variable: "--noma-sans",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  title: "Liget Bőrstúdió — mintaprojekt | ProjectEdge",
  description: "Mintaprojekt: időpontfoglalós bemutatkozó oldal egy kitalált prémium bőrstúdiónak.",
  robots: { index: false, follow: false }
};

export default function LigetBorstudioDemoPage() {
  return <NomaSite fontClass={`${display.variable} ${sans.variable}`} />;
}
