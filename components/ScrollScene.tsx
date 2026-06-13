"use client";

import { useEffect, useRef } from "react";

export function ScrollScene() {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }

    function update() {
      const scroll = Math.min(window.scrollY / 700, 1);
      scene?.style.setProperty("--scroll", scroll.toFixed(3));
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div className="scene-wrap" ref={sceneRef} aria-hidden="true">
      <div className="scene-stage">
        <div className="device device-main">
          <span className="device-camera" />
          <span className="device-screen" />
          <span className="device-line one" />
          <span className="device-line two" />
          <span className="device-chip" />
        </div>
        <div className="device device-card">
          <span />
          <strong>Lead</strong>
          <em>qualified</em>
        </div>
        <div className="device device-panel">
          <span />
          <span />
          <span />
        </div>
        <div className="scene-ring" />
        <div className="scene-axis" />
      </div>
    </div>
  );
}
