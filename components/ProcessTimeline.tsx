"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A /folyamat lépéslistája korábban öt egyforma doboz volt egymás alatt.
 *
 * Itt egy folytonos vonal fut végig a szekción, ami görgetésre rajzolódik ki,
 * és minden lépésnél becsatlakozik egy csomópontba. Amit már elhagytál, az
 * halványabb marad — így a lapon látszik, hol tartasz.
 *
 * A lépések mellett nem ikon áll, hanem egy kis jelenet, ami eljátssza, ami
 * abban a fázisban történik. Egy folyamatoldalon a mozgás nem dekoráció: az
 * idő múlását ábrázolja, ami pont a téma.
 */

export type FlowStep = {
  number: string;
  title: string;
  copy: string;
  tag: string;
  scene: "brief" | "terv" | "epites" | "jovahagyas" | "finomitas";
};

function Scene({ kind }: { kind: FlowStep["scene"] }) {
  if (kind === "brief") {
    return (
      <div className="flow-scene scene-brief">
        <span className="sc-label">ADATLAP</span>
        <i style={{ "--w": "82%", "--d": "0ms" } as React.CSSProperties} />
        <i style={{ "--w": "64%", "--d": "260ms" } as React.CSSProperties} />
        <i style={{ "--w": "91%", "--d": "520ms" } as React.CSSProperties} />
        <i style={{ "--w": "48%", "--d": "780ms" } as React.CSSProperties} />
        <span className="sc-caret" />
      </div>
    );
  }

  if (kind === "terv") {
    return (
      <div className="flow-scene scene-terv">
        <span className="sc-label">STRUKTÚRA</span>
        <div className="sc-wire">
          <b style={{ "--d": "0ms" } as React.CSSProperties} />
          <b style={{ "--d": "140ms" } as React.CSSProperties} />
          <b style={{ "--d": "280ms" } as React.CSSProperties} />
          <b style={{ "--d": "420ms" } as React.CSSProperties} />
          <b style={{ "--d": "560ms" } as React.CSSProperties} />
        </div>
      </div>
    );
  }

  if (kind === "epites") {
    return (
      <div className="flow-scene scene-epites">
        <span className="sc-label">FEJLESZTÉS</span>
        <div className="sc-code">
          <i style={{ "--w": "70%", "--d": "0ms" } as React.CSSProperties} />
          <i style={{ "--w": "46%", "--d": "180ms" } as React.CSSProperties} />
          <i style={{ "--w": "84%", "--d": "360ms" } as React.CSSProperties} />
          <i style={{ "--w": "58%", "--d": "540ms" } as React.CSSProperties} />
        </div>
        <span className="sc-sweep" />
      </div>
    );
  }

  if (kind === "jovahagyas") {
    return (
      <div className="flow-scene scene-jovahagyas">
        <span className="sc-label">ELŐNÉZET</span>
        <div className="sc-frame">
          <span className="sc-bar" />
          <span className="sc-block one" />
          <span className="sc-block two" />
        </div>
        <span className="sc-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M4 12.5l5.2 5.2L20 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          </svg>
        </span>
      </div>
    );
  }

  return (
    <div className="flow-scene scene-finomitas">
      <span className="sc-label">FINOMHANGOLÁS</span>
      <div className="sc-sliders">
        <b style={{ "--p": "68%", "--d": "0ms" } as React.CSSProperties} />
        <b style={{ "--p": "42%", "--d": "220ms" } as React.CSSProperties} />
        <b style={{ "--p": "88%", "--d": "440ms" } as React.CSSProperties} />
      </div>
      <span className="sc-live">ÉLES</span>
    </div>
  );
}

export function ProcessTimeline({ steps }: { steps: FlowStep[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState<number>(-1);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      rail.style.setProperty("--p", "1");
      setLit(steps.length - 1);
      return;
    }

    let frame = 0;

    function update() {
      frame = 0;
      const node = railRef.current;
      if (!node) {
        return;
      }

      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight;
      // A vonal akkor kezd rajzolódni, amikor a szekció teteje a képernyő
      // alsó harmadába ér, és akkor teljes, amikor az alja kicsúszna.
      const raw = (viewport * 0.72 - rect.top) / Math.max(rect.height * 0.82, 1);
      const progress = Math.min(Math.max(raw, 0), 1);
      node.style.setProperty("--p", progress.toFixed(4));

      const nodes = Array.from(node.querySelectorAll<HTMLElement>(".flow-node"));
      let current = -1;
      nodes.forEach((dot, index) => {
        if (dot.getBoundingClientRect().top < viewport * 0.7) {
          current = index;
        }
      });
      setLit((previous) => (previous === current ? previous : current));
    }

    function onScroll() {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [steps.length]);

  return (
    <div className="flow-rail" ref={railRef}>
      <svg className="flow-line" viewBox="0 0 60 1000" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M30 0 C 6 120, 54 240, 30 360 S 6 600, 30 720 S 54 900, 30 1000"
          fill="none"
          pathLength={1}
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
        />
      </svg>

      {steps.map((step, index) => (
        <article className={`flow-step${index <= lit ? " lit" : ""}`} key={step.number}>
          <span className="flow-node" aria-hidden="true">
            <b />
          </span>
          <div className="flow-copy">
            <span className="flow-num">{step.number}</span>
            <h2>{step.title}</h2>
            <p>{step.copy}</p>
            <span className="step-tag">{step.tag}</span>
          </div>
          <div className="flow-visual" aria-hidden="true">
            <Scene kind={step.scene} />
          </div>
        </article>
      ))}
    </div>
  );
}
