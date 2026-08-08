import type { Metadata } from "next";
import { FixoraSite } from "./FixoraSite";
import "./fixora.css";

export const metadata: Metadata = {
  title: "Varga Villanyszerelés — mintaprojekt | ProjectEdge",
  description: "Mintaprojekt: ajánlatkérő és árbecslő oldal egy kitalált helyi villanyszerelő márkának.",
  robots: { index: false, follow: false }
};

export default function VargaVillanyDemoPage() {
  return <FixoraSite />;
}
