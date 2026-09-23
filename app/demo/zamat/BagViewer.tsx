"use client";

import { useEffect, useRef, useState } from "react";
import { BagArt } from "./BagArt";
import type { Product } from "./data";

/**
 * A termékoldal 3D zacskója. Amíg a three.js betölt (és ha nincs WebGL),
 * az SVG-rajz áll a helyén — ugyanaz a címke, így az átváltás nem ugrik.
 * Lassan forog; húzással körbe lehet nézni, a hátoldalon a pörkölés napja.
 */
export function BagViewer({ product }: { product: Product }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let cleanup = () => {};

    const root = canvas.closest(".zm-root") ?? document.documentElement;
    const style = getComputedStyle(root);
    const fonts = {
      display: style.getPropertyValue("--zm-display").trim() || "Impact, sans-serif",
      mono: style.getPropertyValue("--zm-mono").trim() || "monospace",
      sans: style.getPropertyValue("--zm-sans").trim() || "sans-serif"
    };

    // A canvas-textúra csak akkor rajzol a webfonttal, ha az már betöltött.
    Promise.all([
      document.fonts.load(`800 30px ${fonts.display}`, "ÉTIÓPIAÁŐŰ"),
      document.fonts.load(`500 8px ${fonts.mono}`, "ZAMAT"),
      document.fonts.load(`400 8px ${fonts.sans}`, "őű"),
      import("./bag3d")
    ])
      .then(([, , , { createBagViewer }]) => {
        if (disposed) return;
        let viewer: ReturnType<typeof createBagViewer>;
        try {
          viewer = createBagViewer(canvas, product, fonts);
        } catch {
          return;
        }

        let yaw = -0.35;
        let pitch = 0;
        let dragging: { x: number; y: number; yaw: number; pitch: number } | null = null;
        let idleFrom = 0;
        let last = performance.now();
        let frame = 0;
        let visible = true;

        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          viewer.resize(rect.width, rect.height);
        };
        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);

        const tick = (now: number) => {
          frame = 0;
          if (disposed || !visible) return;
          const delta = Math.min(0.05, (now - last) / 1000);
          last = now;
          if (!dragging && !reduced && now > idleFrom) yaw += delta * 0.22;
          if (!dragging) pitch *= 0.92;
          viewer.setRotation(yaw, pitch);
          viewer.render();
          frame = requestAnimationFrame(tick);
        };

        const down = (event: PointerEvent) => {
          canvas.setPointerCapture(event.pointerId);
          dragging = { x: event.clientX, y: event.clientY, yaw, pitch };
        };
        const move = (event: PointerEvent) => {
          if (!dragging) return;
          yaw = dragging.yaw + (event.clientX - dragging.x) * 0.012;
          if (event.pointerType !== "touch") pitch = Math.max(-0.3, Math.min(0.3, dragging.pitch + (event.clientY - dragging.y) * 0.004));
          if (reduced) {
            viewer.setRotation(yaw, pitch);
            viewer.render();
          }
        };
        const up = () => {
          dragging = null;
          idleFrom = performance.now() + 2200;
        };
        canvas.addEventListener("pointerdown", down);
        canvas.addEventListener("pointermove", move);
        canvas.addEventListener("pointerup", up);
        canvas.addEventListener("pointercancel", up);

        const intersection = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible && !frame) {
            last = performance.now();
            frame = requestAnimationFrame(tick);
          }
        });
        intersection.observe(canvas);

        viewer.setRotation(yaw, pitch);
        viewer.render();
        setReady(true);
        frame = requestAnimationFrame(tick);

        cleanup = () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
          intersection.disconnect();
          canvas.removeEventListener("pointerdown", down);
          canvas.removeEventListener("pointermove", move);
          canvas.removeEventListener("pointerup", up);
          canvas.removeEventListener("pointercancel", up);
          viewer.dispose();
        };
      })
      .catch(() => {});

    return () => {
      disposed = true;
      cleanup();
    };
  }, [product]);

  return (
    <div className={`zm-bag-viewer${ready ? " is-ready" : ""}`}>
      <div className="zm-bag-fallback">
        <BagArt product={product} />
      </div>
      <canvas aria-label={`${product.name} zacskó, húzással forgatható`} ref={canvasRef} role="img" />
      {ready && <span className="zm-bag-hint">Húzd — a hátoldalon a pörkölés napja</span>}
    </div>
  );
}
