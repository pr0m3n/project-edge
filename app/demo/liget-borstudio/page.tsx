import type { Metadata } from "next";
import { NomaSite } from "./NomaSite";
import "./noma.css";

export const metadata: Metadata = {
  title: "Liget Bőrstúdió — mintaprojekt | ProjectEdge",
  description: "Mintaprojekt: prémium szépségstúdió oldal működő időpontfoglaló folyamattal.",
  robots: { index: false, follow: false }
};

export default function LigetBorstudioDemoPage() { return <NomaSite />; }
