"use client";

import { useEffect, useRef, useState } from "react";
import { CANCELLED, DAY_SHORT, DAYS, formatFt, formatHour, stats, WAITLIST } from "./week";

/**
 * „Hogyan működik": egy hét, görgetésre. A görgetés = a hét telése.
 * Szándékosan a nyitókép (IntroHero) után jön, nem helyette.
 * A számlálók (foglalás, kihasználtság, bevétel) ugyanabból a modellből
 * számolnak, mint a 3D zsetonok (week.ts).
 */

type Step = { from: number; kicker: string; title: string; copy: string };

const STEPS: Step[] = [
  {
    from: 0,
    kicker: "Hogyan működik · egy hét egy perc alatt",
    title: "Hétfő reggel még üres a naptár.",
    copy: "Görgess tovább, és nézd meg, hogyan telik meg egy fodrászszalon hete úgy, hogy közben senki nem vette fel a telefont."
  },
  {
    from: 0.13,
    kicker: "1 · a foglalások",
    title: "A vendégek akkor foglalnak, amikor nekik jó.",
    copy: "Éjjel, hajnalban, vasárnap este. A Veyra csak a valóban szabad időpontokat mutatja, így nincs ütközés és nincs visszaírás."
  },
  {
    from: 0.46,
    kicker: "2 · az emlékeztetők",
    title: "Minden vendég kap emlékeztetőt előző nap.",
    copy: "SMS-ben vagy emailben, a te szövegeddel. Egy koppintással visszaigazolja, vagy lemondja, és akkor szól a rendszer."
  },
  {
    from: 0.62,
    kicker: "3 · a lemondás",
    title: "Lemondták. Két perc múlva újra foglalt.",
    copy: "A várólistán állók értesítést kapnak, és aki elsőként elfogadja, azé az időpont. Neked nem kell csinálnod semmit."
  },
  {
    from: 0.82,
    kicker: "Ennyi volt a hét",
    title: "Tele van, és egy telefonhívás sem kellett hozzá.",
    copy: "14 napig ingyen kipróbálhatod. Beállítani egy délután, a meglévő vendéglistádat pedig mi hozzuk át."
  }
];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function WeekHero({ onStart }: { onStart: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const countRef = useRef<HTMLElement>(null);
  const occupancyRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const revenueRef = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [cancelState, setCancelState] = useState(0);
  const [ready, setReady] = useState(false);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStill(reduced);

    let disposed = false;
    let frame = 0;
    let visible = false;
    let current = reduced ? 1 : 0;
    let lastStep = -1;
    let lastCancel = -1;
    let cleanup = () => {};
    const stage = canvas.parentElement as HTMLElement;

    const goal = () => {
      if (reduced) return 1;
      const rect = section.getBoundingClientRect();
      const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
      const total = rect.height - stage.offsetHeight;
      return total <= 0 ? 0 : clamp01((stickyTop - rect.top) / total);
    };

    const readouts = (progress: number) => {
      const now = stats(progress);
      if (countRef.current) countRef.current.textContent = String(now.count);
      if (occupancyRef.current) occupancyRef.current.textContent = `${Math.round(now.occupancy * 100)}%`;
      if (barRef.current) barRef.current.style.transform = `scaleX(${now.occupancy.toFixed(3)})`;
      if (revenueRef.current) revenueRef.current.textContent = formatFt(now.revenue);
      const nextStep = STEPS.reduce((found, item, index) => (progress >= item.from ? index : found), 0);
      if (nextStep !== lastStep) {
        lastStep = nextStep;
        setStep(nextStep);
      }
      const cancel = progress < 0.62 || progress > 0.84 ? 0 : progress < WAITLIST.arrive + 0.045 ? 1 : 2;
      if (cancel !== lastCancel) {
        lastCancel = cancel;
        setCancelState(cancel);
      }
    };
    readouts(current);

    import("./calendar3d")
      .then(({ createWeekScene }) => {
        if (disposed) return;
        let scene: ReturnType<typeof createWeekScene>;
        try {
          scene = createWeekScene(canvas);
        } catch {
          return;
        }
        // A horgony-feliratok a DOM-ból, `data-anchor` alapján.
        const anchorElements = new Map<string, HTMLElement>();
        stage.querySelectorAll<HTMLElement>("[data-anchor]").forEach((element) => anchorElements.set(element.dataset.anchor ?? "", element));
        let size = { height: 1, width: 1 };
        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          size = { height: rect.height, width: rect.width };
          scene.resize(rect.width, rect.height);
        };
        resize();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);

        const draw = (time: number) => {
          const target = goal();
          current += (target - current) * (reduced ? 1 : 0.09);
          if (Math.abs(target - current) < 0.0003) current = target;
          scene.update(current, reduced ? 0 : time / 1000);
          scene.render();
          for (const anchor of scene.project(size.width, size.height)) {
            const element = anchorElements.get(anchor.id);
            if (!element) continue;
            element.style.setProperty("--x", `${anchor.x.toFixed(1)}px`);
            element.style.setProperty("--y", `${anchor.y.toFixed(1)}px`);
          }
          readouts(current);
        };

        const loop = (time: number) => {
          frame = 0;
          if (disposed || !visible) return;
          draw(time);
          if (!reduced) frame = requestAnimationFrame(loop);
        };
        const intersection = new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting;
          if (visible && !frame) frame = requestAnimationFrame(loop);
        });
        intersection.observe(section);
        const redraw = () => requestAnimationFrame(draw);
        if (reduced) window.addEventListener("resize", redraw);

        setReady(true);
        cleanup = () => {
          cancelAnimationFrame(frame);
          intersection.disconnect();
          resizeObserver.disconnect();
          window.removeEventListener("resize", redraw);
          scene.dispose();
        };
      })
      .catch(() => {});

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  const body = (item: Step, index: number) => (
    <>
      <p className="vy-kicker">{item.kicker}</p>
      <h2>{item.title}</h2>
      <p className="vy-hw-lead">{item.copy}</p>
      {index === STEPS.length - 1 && (
        <div className="vy-hero-actions">
          <button className="vy-primary" onClick={onStart} type="button">
            14 napig ingyen <span aria-hidden="true">↗</span>
          </button>
        </div>
      )}
    </>
  );

  return (
    <section aria-label="Hogyan működik: egy hét a Veyrával" className={`vy-hw${still ? " is-still" : ""}`} id="egy-het" ref={sectionRef}>
      <div className="vy-hw-stage">
        <canvas aria-hidden="true" className={`vy-hw-canvas${ready ? " is-ready" : ""}`} ref={canvasRef} />

        <div aria-hidden="true" className="vy-hw-anchors">
          {DAYS.map((day, index) => (
            <span className="vy-anchor is-day" key={day} data-anchor={`day-${index}`}>
              <b className="is-long">{day}</b>
              <b className="is-short">{DAY_SHORT[index]}</b>
            </span>
          ))}
          {[9, 12, 15, 18].map((hour) => (
            <span className="vy-anchor is-hour" key={hour} data-anchor={`hour-${hour}`}>
              {hour}:00
            </span>
          ))}
          <span className={`vy-anchor is-callout${cancelState ? " is-on" : ""}${cancelState === 2 ? " is-filled" : ""}`} data-anchor="cancel">
            {cancelState === 2 ? (
              <>
                <b>Betöltve · {WAITLIST.bookedAt}</b>
                <small>{WAITLIST.name} a várólistáról</small>
              </>
            ) : (
              <>
                <b>Lemondva · CS 11:02</b>
                <small>
                  {CANCELLED.name} · {CANCELLED.service.name} · {formatHour(CANCELLED.start)}
                </small>
              </>
            )}
          </span>
        </div>

        {!still && (
          <div aria-live="polite" className="vy-hw-copy">
            {STEPS.map((item, index) => (
              <div aria-hidden={index !== step} className={`vy-hw-step${index === step ? " is-active" : ""}`} key={item.title}>
                {body(item, index)}
              </div>
            ))}
          </div>
        )}

        <dl className="vy-hw-hud">
          <div>
            <dt>Foglalás a héten</dt>
            <dd ref={countRef}>0</dd>
          </div>
          <div>
            <dt>Kihasználtság</dt>
            <dd>
              <span ref={occupancyRef}>0%</span>
              <i aria-hidden="true">
                <em ref={barRef} />
              </i>
            </dd>
          </div>
          <div>
            <dt>Várható bevétel</dt>
            <dd ref={revenueRef}>0 Ft</dd>
          </div>
        </dl>
      </div>

      {still && (
        <div className="vy-hw-static">
          {STEPS.map((item, index) => (
            <div className="vy-hw-step is-active" key={item.title}>
              {body(item, index)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
