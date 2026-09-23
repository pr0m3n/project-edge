"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { HeroLabel } from "./model";
import {
  compassLabel,
  formatClock,
  formatDuration,
  isSunlit,
  livingIndex,
  sunMinutes,
  SUNRISE,
  SUNSET,
  windowDirections,
  type Plan
} from "./plan";

type Viewer = {
  labels: HeroLabel[];
  setHour: (hour: number) => void;
  setView: (azimuth: number, elevation: number) => void;
  readonly view: { azimuth: number; elevation: number };
  resize: (width: number, height: number) => void;
  render: () => void;
  project: (width: number, height: number) => { id: string; x: number; y: number; opacity: number }[];
  dispose: () => void;
};

/**
 * Forgatható 3D alaprajz napállás-csúszkával. Húzással forog; a görgőt
 * szándékosan NEM kezeli, mert a modális ablakban görgetni is kell.
 */
export function PlanViewer({ plan }: { plan: Plan }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
  const sizeRef = useRef({ width: 1, height: 1 });
  const [labels, setLabels] = useState<HeroLabel[]>([]);
  const [hour, setHour] = useState(10);
  const [playing, setPlaying] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  const living = useMemo(() => windowDirections(plan, livingIndex(plan)), [plan]);
  const livingName = plan.rooms[livingIndex(plan)].name.split(" · ")[0].toLowerCase();
  const lit = isSunlit(living, hour);

  const draw = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.render();
    const { width, height } = sizeRef.current;
    for (const label of viewer.project(width, height)) {
      const element = labelRefs.current.get(label.id);
      if (!element) continue;
      element.style.setProperty("--x", `${label.x.toFixed(1)}px`);
      element.style.setProperty("--y", `${label.y.toFixed(1)}px`);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let cleanup = () => {};

    import("./model")
      .then(({ createPlanViewer }) => {
        if (disposed) return;
        let viewer: Viewer;
        try {
          viewer = createPlanViewer(canvas, plan);
        } catch {
          setStatus("failed");
          return;
        }
        viewerRef.current = viewer;
        setLabels(viewer.labels);
        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          sizeRef.current = { width: rect.width, height: rect.height };
          viewer.resize(rect.width, rect.height);
          requestAnimationFrame(draw);
        };
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);
        resize();
        setStatus("ready");
        cleanup = () => {
          observer.disconnect();
          viewer.dispose();
          viewerRef.current = null;
        };
      })
      .catch(() => setStatus("failed"));

    return () => {
      disposed = true;
      cleanup();
    };
  }, [plan]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.setHour(hour);
    requestAnimationFrame(draw);
  }, [hour, status]);

  // „Lejátszás": egy nap kb. 9 másodperc alatt, napkeltétől napnyugtáig.
  const hourRef = useRef(hour);
  useEffect(() => {
    hourRef.current = hour;
  }, [hour]);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last = performance.now();
    const end = SUNSET + 0.4;
    const tick = (now: number) => {
      const next = Math.min(end, hourRef.current + ((now - last) / 1000) * 1.35);
      last = now;
      hourRef.current = next;
      setHour(next);
      if (next >= end) setPlaying(false);
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  const drag = useRef<{ x: number; y: number; azimuth: number; elevation: number; touch: boolean } | null>(null);

  return (
    <div className="bo-viewer">
      <div
        className={`bo-viewer-stage${status === "ready" ? " is-ready" : ""}`}
        onPointerDown={(event) => {
          const viewer = viewerRef.current;
          if (!viewer) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY, ...viewer.view, touch: event.pointerType === "touch" };
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          const viewer = viewerRef.current;
          if (!start || !viewer) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          // Érintésnél csak vízszintesen forgat — a függőleges húzás görgetés marad.
          viewer.setView(start.azimuth - dx * 0.45, start.touch ? start.elevation : start.elevation + dy * 0.3);
          draw();
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <canvas aria-label={`${plan.level} 3D alaprajza`} ref={canvasRef} role="img" />
        <div aria-hidden="true" className="bo-labels">
          {labels.map((label) => (
            <div
              className={`bo-label is-room${label.id === "north" ? " is-north" : ""}`}
              key={label.id}
              ref={(element) => {
                if (element) labelRefs.current.set(label.id, element);
                else labelRefs.current.delete(label.id);
              }}
            >
              <b>{label.text}</b>
              {label.sub && <span>{label.sub}</span>}
            </div>
          ))}
        </div>
        {status === "failed" && <p className="bo-viewer-failed">A 3D nézethez WebGL-képes böngésző kell.</p>}
        <span className="bo-viewer-hint">Húzd a forgatáshoz</span>
      </div>

      <div className="bo-viewer-controls">
        <button
          aria-label={playing ? "Megállítás" : "Egy nap lejátszása"}
          className="bo-play"
          onClick={() => {
            if (!playing && hour >= SUNSET) setHour(SUNRISE - 0.3);
            setPlaying((value) => !value);
          }}
          type="button"
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <label className="bo-time">
          <span>
            Napállás · szept. 23. <b>{formatClock(hour)}</b>
          </span>
          <input
            max={SUNSET + 0.4}
            min={SUNRISE - 0.3}
            onChange={(event) => {
              setPlaying(false);
              setHour(Number(event.target.value));
            }}
            step={1 / 12}
            type="range"
            value={hour}
          />
        </label>
        <dl className="bo-viewer-facts">
          <div className={lit ? "is-lit" : ""}>
            <dt>A {livingName}ban most</dt>
            <dd>{lit ? "besüt a nap" : "nincs direkt napfény"}</dd>
          </div>
          <div>
            <dt>Napsütés egész nap</dt>
            <dd>{formatDuration(sunMinutes(living))}</dd>
          </div>
          <div>
            <dt>Ablakok iránya</dt>
            <dd>{living.map(compassLabel).join(", ")}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
