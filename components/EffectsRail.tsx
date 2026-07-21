"use client";

import { useRef } from "react";
import type { ReactNode } from "react";

type Capability = {
  dark: boolean;
  fx: string;
  eyebrow: string;
  title: string;
  copy: string;
  stage: ReactNode;
};

type EffectsRailProps = {
  capabilities: Capability[];
};

export function EffectsRail({ capabilities }: EffectsRailProps) {
  const railRef = useRef<HTMLDivElement>(null);

  function scrollByCard(direction: 1 | -1) {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector(".cap-card");
    const step = card ? card.clientWidth + 18 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  return (
    <>
      <div className="cap-hint-row">
        <p className="cap-hint">← Húzd oldalra a kártyákat →</p>
        <div className="cap-nav">
          <button aria-label="Előző effekt" onClick={() => scrollByCard(-1)} type="button">‹</button>
          <button aria-label="Következő effekt" onClick={() => scrollByCard(1)} type="button">›</button>
        </div>
      </div>
      <div className="cap-rail" ref={railRef}>
        {capabilities.map((cap) => (
          <article className={`cap-card ${cap.dark ? "dark" : ""}`} key={cap.title}>
            <div className={`cap-stage ${cap.fx}`}>{cap.stage}</div>
            <div className="cap-caption">
              <span className="cap-eyebrow">{cap.eyebrow}</span>
              <h3>{cap.title}</h3>
              <p>{cap.copy}</p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
