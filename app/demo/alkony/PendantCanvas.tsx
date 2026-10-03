"use client";

import { useEffect, useRef, useState } from "react";
import type { Framing, PendantViewer } from "./pendant3d";

/**
 * A 3D medál vászna. Amíg a three.js betölt (vagy ha nincs WebGL), a
 * `fallback` — a termékfotó — áll a helyén.
 *
 * Magától lassan ring, mint egy láncon függő medál; húzással körbe lehet
 * forgatni, elengedve visszatalál. A középső kő külön rugón billeg: a medál
 * minden gyorsulására meglendül, koppintásra pedig magától is (ez a
 * táncoló foglalat).
 *
 * A `light` a cél fényállás (0 = nappal, 1 = gyertya); a vászon maga
 * közelít felé, hogy a váltás ne ugorjon.
 */
export function PendantCanvas({
  className,
  fallback,
  framing,
  label,
  light
}: {
  className?: string;
  fallback: React.ReactNode;
  framing: Framing;
  label: string;
  light: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef(light);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    lightRef.current = light;
  }, [light]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let disposed = false;
    let cleanup = () => {};

    import("./pendant3d")
      .then(({ createPendantViewer }) => {
        if (disposed) return;
        let viewer: PendantViewer;
        try {
          viewer = createPendantViewer(canvas, framing, coarse ? "low" : "high");
        } catch {
          // nincs WebGL (vagy elfogyott a kontextus): marad a fotó
          return;
        }

        const swayYaw = framing === "full" ? 0.5 : 0.34;
        let userYaw = 0;
        let userPitch = 0;
        let spinVelocity = 0;
        let swayGain = 1;
        let idleFrom = 0;
        let drag: { x: number; y: number; yaw: number; pitch: number; moved: number } | null = null;

        let swing = 0;
        let swingVelocity = 0;
        let prevYaw = 0;
        let prevPitch = 0;
        let prevYawRate = 0;
        let prevPitchRate = 0;

        let shownLight = lightRef.current;
        viewer.setLight(shownLight);

        const start = performance.now();
        let last = start;
        let frame = 0;
        let visible = true;

        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          viewer.resize(rect.width, rect.height);
        };
        resize();
        const sizeObserver = new ResizeObserver(resize);
        sizeObserver.observe(canvas);

        const tick = (now: number) => {
          frame = 0;
          if (disposed || !visible) return;
          const dt = Math.max(0.001, Math.min(0.05, (now - last) / 1000));
          last = now;
          const time = (now - start) / 1000;

          const goal = lightRef.current;
          if (goal !== shownLight) {
            shownLight += (goal - shownLight) * (1 - Math.exp(-dt * 3.4));
            if (Math.abs(goal - shownLight) < 0.003) shownLight = goal;
            viewer.setLight(shownLight);
          }

          if (!drag) {
            userYaw += spinVelocity * dt;
            spinVelocity *= Math.exp(-dt * 2.6);
            if (now > idleFrom) {
              // elengedve visszafordul a legközelebbi „szemből" állásba
              const home = Math.round(userYaw / (Math.PI * 2)) * Math.PI * 2;
              userYaw += (home - userYaw) * (1 - Math.exp(-dt * 0.9));
              userPitch *= Math.exp(-dt * 1.6);
              swayGain += (1 - swayGain) * (1 - Math.exp(-dt * 0.8));
            }
          }
          const sway = reduced ? 0 : swayGain;
          const yaw = userYaw + sway * swayYaw * Math.sin(time * 0.42);
          const pitch = userPitch + sway * 0.07 * Math.sin(time * 0.31 + 1.2);
          viewer.setPose(yaw, pitch);

          // táncoló kő: csillapított rugó, amit a medál gyorsulása lök meg
          const yawRate = (yaw - prevYaw) / dt;
          const pitchRate = (pitch - prevPitch) / dt;
          const drive = -((pitchRate - prevPitchRate) / dt) - 0.35 * ((yawRate - prevYawRate) / dt);
          prevYaw = yaw;
          prevPitch = pitch;
          prevYawRate = yawRate;
          prevPitchRate = pitchRate;
          const omega = Math.PI * 2 * 2.3;
          swingVelocity += (-omega * omega * swing - 2 * 0.09 * omega * swingVelocity + Math.max(-60, Math.min(60, drive))) * dt;
          swing += swingVelocity * dt;
          swing = Math.max(-0.55, Math.min(0.55, swing));
          const tremor = reduced ? 0 : 0.014 * Math.sin(time * 7.1) * (0.6 + 0.4 * Math.sin(time * 0.9));
          viewer.setSwing(swing + tremor);

          viewer.render();
          frame = requestAnimationFrame(tick);
        };

        const down = (event: PointerEvent) => {
          drag = { moved: 0, pitch: userPitch, x: event.clientX, y: event.clientY, yaw: userYaw };
          canvas.setPointerCapture(event.pointerId);
          spinVelocity = 0;
        };
        const move = (event: PointerEvent) => {
          if (!drag) return;
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
          const nextYaw = drag.yaw + dx * 0.011;
          spinVelocity = (nextYaw - userYaw) * 60;
          userYaw = nextYaw;
          if (event.pointerType !== "touch") userPitch = Math.max(-0.45, Math.min(0.45, drag.pitch + dy * 0.005));
          swayGain = Math.max(0, swayGain - 0.08);
        };
        const up = () => {
          if (drag && drag.moved < 6 && !reduced) swingVelocity += 5.5;
          drag = null;
          idleFrom = performance.now() + 2600;
        };
        canvas.addEventListener("pointerdown", down);
        canvas.addEventListener("pointermove", move);
        canvas.addEventListener("pointerup", up);
        canvas.addEventListener("pointercancel", up);

        const visibility = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible && !frame) {
            last = performance.now();
            frame = requestAnimationFrame(tick);
          }
        });
        visibility.observe(canvas);

        viewer.render();
        setReady(true);
        frame = requestAnimationFrame(tick);

        cleanup = () => {
          cancelAnimationFrame(frame);
          sizeObserver.disconnect();
          visibility.disconnect();
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
  }, [framing]);

  return (
    <div className={`ak-canvas${ready ? " is-ready" : ""}${className ? ` ${className}` : ""}`}>
      <div className="ak-canvas-fallback">{fallback}</div>
      <canvas aria-label={label} ref={canvasRef} role="img" />
    </div>
  );
}
