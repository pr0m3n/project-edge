import type { Metadata } from "next";
import { VeyraSite } from "./VeyraSite";
import "./veyra.css";

export const metadata: Metadata = {
  title: "Veyra — mintaprojekt | ProjectEdge",
  description:
    "Mintaprojekt: prémium landing page egy kitalált foglalórendszer márkának. A ProjectEdge saját fejlesztésű demója.",
  robots: { index: false, follow: false }
};

export default function VeyraDemoPage() {
  return <VeyraSite />;
}
