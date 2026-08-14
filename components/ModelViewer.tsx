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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin: "250px" }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    void import("@google/model-viewer");
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
    <div className={className} ref={containerRef}>
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
        loading: "lazy",
        ref: (element: HTMLElement | null) => { modelRef.current = element; },
        reveal: "auto"
      }) : <span className="model-loading" aria-hidden="true" />}
    </div>
  );
}
