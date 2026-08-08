import type { Metadata } from "next";
import { NestSite } from "./NestSite";
import "./nest.css";

export const metadata: Metadata = {
  title: "Budai Otthonok — mintaprojekt | ProjectEdge",
  description: "Mintaprojekt: kereshető ingatlankatalógus mentéssel és szűrőkkel.",
  robots: { index: false, follow: false }
};

export default function BudaiOtthonokDemoPage() { return <NestSite />; }
