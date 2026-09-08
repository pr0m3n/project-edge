import type { Metadata } from "next";
import { HeroPrototype } from "./HeroPrototype";

export const metadata: Metadata = {
  title: "Hero prototípus | ProjectEdge",
  description: "Ideiglenes, nem indexelhető ProjectEdge hero-koncepció.",
  robots: { index: false, follow: false }
};

export default function HeroPrototypePage() {
  return <HeroPrototype />;
}
