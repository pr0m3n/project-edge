"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";

type ModelViewerProps = {
  alt: string;
  className?: string;
  exposure?: string;
  src: string;
};

export function ModelViewer({ alt, className, exposure = "1", src }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  /** A modell tényleges megjelenítése — csak amikor a geometria már kész. */
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Ha nincs IntersectionObserver, azonnal töltünk. Enélkül a modell sosem
    // jelenne meg, és a látogató csak a lüktető vázat nézné a végtelenségig.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      // Bőven a viewport előtt indul a betöltés. A 250px azt jelentette, hogy
      // a model-viewer (~1 MB) és a GLB letöltése akkor kezdődött, amikor a
      // blokk már majdnem a képernyőn volt — ezért „ugrott be" utólag.
      // A 1200px-es előretartás egy átlagos görgetéssel is nagyjából egy
      // képernyőnyi időt ad a letöltésre.
      { rootMargin: "1200px 0px" }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    void import("@google/model-viewer");
  }, [visible]);

  /**
   * A model-viewer először üresen renderel, és csak a GLB feldolgozása után
   * rajzol. E nélkül a modell egy kész, tömör alakzatként pattant be a
   * placeholder helyére. A `load` eseményre áttűnünk, tehát a váz és a modell
   * között folyamatos az átmenet.
   */
  useEffect(() => {
    const model = modelRef.current;
    if (!visible || !model) return;
    if ((model as HTMLElement & { loaded?: boolean }).loaded) {
      setLoaded(true);
      return;
    }
    const onLoad = () => setLoaded(true);
    model.addEventListener("load", onLoad);
    return () => model.removeEventListener("load", onLoad);
  }, [visible]);

  useEffect(() => {
    if (!visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    function rotateWithScroll() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const model = modelRef.current;
        const container = containerRef.current;
        if (!model || !container) return;
        const rect = container.getBoundingClientRect();
        const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        const azimuth = Math.max(-35, Math.min(215, progress * 250 - 35));
        model.setAttribute("camera-orbit", `${azimuth}deg 75deg auto`);
      });
    }
    rotateWithScroll();
    window.addEventListener("scroll", rotateWithScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", rotateWithScroll);
    };
  }, [visible]);

  return (
    <div className={`${className ?? ""} model-host${loaded ? " is-loaded" : ""}`} ref={containerRef}>
      {/* A váz mindaddig látszik, amíg a modell tényleg ki nem rajzolódik —
          így nincs üres lyuk, majd hirtelen felbukkanó bolygó. */}
      <span className="model-loading" aria-hidden="true" />
      {/*
        model-viewer is registered by the client-side import above.
        React.createElement keeps TypeScript happy without global JSX augmentation.
      */}
      {visible ? React.createElement("model-viewer", {
        alt,
        src,
        "camera-controls": true,
        "disable-zoom": true,
        "interaction-prompt": "none",
        exposure,
        loading: "eager",
        ref: (element: HTMLElement | null) => { modelRef.current = element; },
        reveal: "auto"
      }) : null}
    </div>
  );
}
