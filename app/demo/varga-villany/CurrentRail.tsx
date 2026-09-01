"use client";

import { useEffect, useRef, useState } from "react";

/**
 * „Az áram végigfut az oldalon."
 *
 * A képernyő bal szélén ülő, végig látható sín. Ahogy az olvasó görget, egy
 * lime fényvonal tölti fel felülről lefelé, az élén egy izzó fejjel. A sín
 * mentén csomópontok jelölik a szekciókat: amikor az áram odaér, a csomópont
 * kigyullad, és kiírja a szekció nevét.
 *
 * A vonal szándékosan nem egyenes: apró töréseket kap, hogy villámra
 * emlékeztessen, de ne vonja el a figyelmet a tartalomról.
 *
 * A haladást egyetlen CSS változó (`--rail`) hordozza, a kirajzolást a
 * `stroke-dashoffset` végzi — így a görgetés alatt nincs React-újrarajzolás,
 * csak a csomópontok állapotváltásánál.
 */

/* `dark`: a szekció háttere sötét, tehát a felirat világos kell legyen. */
const SECTIONS = [
  { id: "szolgaltatasok", label: "Szolgáltatások", dark: false },
  { id: "munka", label: "Munkáink", dark: true },
  { id: "szaki", label: "Ki jön ki", dark: false },
  { id: "ajanlat", label: "Árbecslő", dark: false }
];

/* A sín útvonala egy 0–1000 magas dobozban, enyhe villámtörésekkel. */
const PATH = "M9 0 L9 118 L3 196 L15 246 L9 322 L9 470 L2 548 L16 604 L9 686 L9 838 L4 908 L12 952 L9 1000";

type Node = { id: string; label: string; dark: boolean; at: number };

export function CurrentRail() {
  const railRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rail = railRef.current;
    if (!rail) return;

    let frame = 0;

    /* A csomópontok helye a dokumentumban elfoglalt arányukból jön, így a sín
       akkor is együtt mozog a tartalommal, ha közben változik a magasság. */
    function measure() {
      const limit = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      setNodes(
        SECTIONS.flatMap((section) => {
          const el = document.getElementById(section.id);
          if (!el) return [];
          const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.5;
          return [{ ...section, at: Math.min(Math.max(top / limit, 0.04), 0.97) }];
        })
      );
    }

    function update() {
      frame = 0;
      const limit = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const value = Math.min(Math.max(window.scrollY / limit, 0), 1);
      rail?.style.setProperty("--rail", value.toFixed(4));
      setProgress(value);
    }

    function onScroll() {
      if (frame) return;
      frame = requestAnimationFrame(update);
    }

    function onResize() {
      measure();
      onScroll();
    }

    measure();
    update();

    if (reduced) {
      rail.style.setProperty("--rail", "1");
      return;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    const timer = window.setTimeout(onResize, 600);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden="true" className="fxr-rail" ref={railRef}>
      <svg
        className="fxr-rail-svg"
        preserveAspectRatio="none"
        viewBox="0 0 18 1000"
      >
        <path className="fxr-rail-track" d={PATH} pathLength={1} />
        <path className="fxr-rail-live" d={PATH} pathLength={1} />
      </svg>

      <span className="fxr-rail-head" />

      {nodes.map((node, index) => {
        const passed = progress >= node.at;
        /* Feliratot csak az éppen aktuális csomópont mutat: a legutolsó, amit
           az áram már elért. Így nem torlódik három felirat egymásra. */
        const next = nodes[index + 1];
        const current = passed && (!next || progress < next.at);
        return (
          <span
            className={[
              "fxr-rail-node",
              passed ? "on" : "",
              current ? "current" : "",
              node.dark ? "dark" : ""
            ].join(" ")}
            key={node.id}
            style={{ top: `${node.at * 100}%` }}
          >
            <i />
            <b>{node.label}</b>
          </span>
        );
      })}
    </div>
  );
}
