"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HeroLabel } from "./model";
import { compassLabel, formatClock, formatDuration, livingIndex, sunMinutes, windowDirections, type Plan } from "./plan";

/**
 * Görgetésre szétnyíló makett: ház → szintek → alaprajz → napfény.
 *
 * A szekció ~5 képernyő magas, benne egy sticky színpad; a görgetés
 * 0..1 közötti haladássá alakul, és a jelenet ebből számol mindent.
 * A haladást simítjuk (lerp), így a trackpad és a görgő lépcsői nem
 * látszanak a kamerán.
 *
 * `prefers-reduced-motion` mellett nincs rögzített görgetés: egyetlen
 * álló kép marad (alaprajz a napúttal), a négy lépés szövege pedig alatta.
 */

const STEP_STARTS = [0, 0.14, 0.4, 0.6];
const STEP_NAMES = ["Ház", "Szintek", "Alaprajz", "Napfény"];

type Props = { plan: Plan; homeCount: number; onOpenFeatured: () => void };

export function MaquetteHero({ plan, homeCount, onOpenFeatured }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
  const clockRef = useRef<HTMLElement>(null);
  const sunRef = useRef<HTMLElement>(null);
  const [labels, setLabels] = useState<HeroLabel[]>([]);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [still, setStill] = useState(false);

  const living = useMemo(() => windowDirections(plan, livingIndex(plan)), [plan]);
  const totalSun = useMemo(() => formatDuration(sunMinutes(living)), [living]);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStill(reduced);

    let disposed = false;
    let frame = 0;
    let visible = true;
    let current = reduced ? 0.7 : 0;
    let lastStep = -1;
    let lastMinute = -1;
    let cleanup = () => {};

    import("./model")
      .then(({ createHeroScene }) => {
        if (disposed) return;
        let scene: ReturnType<typeof createHeroScene>;
        try {
          scene = createHeroScene(canvas, plan);
        } catch {
          setStatus("failed");
          return;
        }
        setLabels(scene.labels);

        let size = { width: 1, height: 1 };
        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          size = { width: rect.width, height: rect.height };
          scene.resize(rect.width, rect.height);
        };
        resize();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);

        // A színpad a fejléc alá tapad, ezért a rögzített szakasz hossza a
        // szekció és a színpad magasságának különbsége, nem a viewporté.
        const stage = canvas.parentElement as HTMLElement;
        const targetProgress = () => {
          if (reduced) return 0.7;
          const rect = section.getBoundingClientRect();
          const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
          const total = rect.height - stage.offsetHeight;
          return total <= 0 ? 0 : Math.min(1, Math.max(0, (stickyTop - rect.top) / total));
        };

        const draw = (time: number) => {
          const target = targetProgress();
          current += (target - current) * (reduced ? 1 : 0.09);
          if (Math.abs(target - current) < 0.0002) current = target;
          const drift = reduced ? 0 : Math.sin(time / 5200) * 2.2;
          const { hour } = scene.setProgress(current, drift);
          scene.render();

          for (const label of scene.project(size.width, size.height)) {
            const element = labelRefs.current.get(label.id);
            if (!element) continue;
            element.style.opacity = label.opacity.toFixed(3);
            element.style.setProperty("--x", `${label.x.toFixed(1)}px`);
            element.style.setProperty("--y", `${label.y.toFixed(1)}px`);
          }

          const minute = Math.round(hour * 60);
          if (minute !== lastMinute) {
            lastMinute = minute;
            if (clockRef.current) clockRef.current.textContent = formatClock(hour);
            if (sunRef.current) sunRef.current.textContent = formatDuration(sunMinutes(living, hour));
          }

          const nextStep = STEP_STARTS.reduce((found, start, index) => (current >= start - 0.001 ? index : found), 0);
          if (nextStep !== lastStep) {
            lastStep = nextStep;
            setStep(nextStep);
          }
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

        // Csökkentett mozgásnál nincs folyamatos ciklus: csak átméretezéskor rajzolunk újra.
        const redraw = () => requestAnimationFrame(draw);
        if (reduced) resizeObserver.observe(section);
        if (reduced) window.addEventListener("resize", redraw);

        setStatus("ready");
        frame = requestAnimationFrame(loop);

        cleanup = () => {
          cancelAnimationFrame(frame);
          intersection.disconnect();
          resizeObserver.disconnect();
          window.removeEventListener("resize", redraw);
          scene.dispose();
        };
      })
      .catch(() => setStatus("failed"));

    return () => {
      disposed = true;
      cleanup();
    };
  }, [plan, living]);

  /** A lépésjelölőre kattintva odagörget, ahol az a lépés elkezdődik. */
  const jumpTo = (index: number) => {
    const section = sectionRef.current;
    if (!section || still) return;
    const stage = section.firstElementChild as HTMLElement;
    const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
    const total = section.offsetHeight - stage.offsetHeight;
    const top = section.getBoundingClientRect().top + window.scrollY - stickyTop;
    window.scrollTo({ behavior: "smooth", top: top + total * (STEP_STARTS[index] + (index ? 0.08 : 0)) });
  };

  const steps = [
    <>
      <h1>Minden lakást megépítünk kicsiben.</h1>
      <p>
        A hirdetett ingatlanokról méretarányos 3D makett készül. Alaprajz, tájolás és napfény: mind látszik, mielőtt
        elindulsz a megtekintésre.
      </p>
      <div className="bo-hero-actions">
        <a className="bo-button" href="#ingatlanok">{homeCount} aktuális otthon</a>
        <button className="bo-button ghost" onClick={onOpenFeatured} type="button">A penthouse adatlapja</button>
      </div>
    </>,
    <>
      <h2>Szintenként felmérjük a házat.</h2>
      <p>
        Látod, hányadik emeleten van a lakás, és mi van alatta. Ez a penthouse a +17,00-s szinten van, saját lifttel és a
        Dunára néző terasszal.
      </p>
    </>,
    <>
      <h2>Az alaprajz körbejárható.</h2>
      <p>
        Valós méretű falak és bútorok, szobánként négyzetméterrel. Az adatlapon egérrel forgathatod, telefonon az ujjaddal.
      </p>
    </>,
    <>
      <h2>Megmutatjuk, mikor süt be a nap.</h2>
      <p>
        Szeptemberi napállással ebbe a nappaliba ma <strong>{totalSun}</strong> hosszan süt be a nap, {living.map(compassLabel).join(" és ")} felől.
      </p>
      <button className="bo-button" onClick={onOpenFeatured} type="button">Kipróbálom az adatlapon</button>
    </>
  ];

  return (
    <section aria-label="A penthouse makettje" className={`bo-hero${still ? " is-still" : ""}`} id="makett" ref={sectionRef}>
      <div className="bo-stage">
        <canvas aria-hidden="true" className={`bo-canvas${status === "ready" ? " is-ready" : ""}`} ref={canvasRef} />

        {status === "failed" && (
          <div className="bo-fallback">
            <Image alt="A penthouse terasza a Dunára" fill priority sizes="100vw" src="/demo/budai-otthonok/hero.webp" style={{ objectFit: "cover" }} />
          </div>
        )}

        <div aria-hidden="true" className={`bo-scrim${step === 0 && !still ? " is-on" : ""}`} />

        <div aria-hidden="true" className="bo-labels">
          {labels.map((label) => (
            <div
              className={`bo-label${label.id.startsWith("level") ? " is-level" : ""}${label.accent ? " is-accent" : ""}`}
              key={label.id}
              ref={(element) => {
                if (element) labelRefs.current.set(label.id, element);
                else labelRefs.current.delete(label.id);
              }}
              style={{ opacity: 0 }}
            >
              <b>{label.text}</b>
              {label.sub && <span>{label.sub}</span>}
            </div>
          ))}
        </div>

        {!still && (
          <div className="bo-copy" aria-live="polite">
            {steps.map((content, index) => (
              <div className={`bo-copy-step${index === step ? " is-active" : ""}`} key={index} aria-hidden={index !== step}>
                <p className="bo-kicker">
                  {String(index + 1).padStart(2, "0")} / 04 · {STEP_NAMES[index]}
                </p>
                {content}
              </div>
            ))}
          </div>
        )}

        <nav aria-label="Makett lépései" className="bo-steps">
          {STEP_NAMES.map((name, index) => (
            <button className={index === step ? "is-active" : ""} key={name} onClick={() => jumpTo(index)} type="button">
              <span>{String(index + 1).padStart(2, "0")}</span>
              {name}
            </button>
          ))}
        </nav>

        <dl className="bo-hud">
          <div>
            <dt>Makett</dt>
            <dd>1:200 · Várkert rakpart, I. ker.</dd>
          </div>
          <div>
            <dt>Időpont</dt>
            <dd>
              szept. 23. <b ref={clockRef}>10:30</b>
            </dd>
          </div>
          <div className="is-sun">
            <dt>Napsütés a nappaliban</dt>
            <dd>
              <b ref={sunRef}>0 p</b>
            </dd>
          </div>
        </dl>

        {!still && step === 0 && <span className="bo-scroll-hint">Görgess — szétszedjük a házat</span>}
      </div>

      {still && (
        <div className="bo-copy-static">
          {steps.map((content, index) => (
            <div className="bo-copy-step is-active" key={index}>
              <p className="bo-kicker">
                {String(index + 1).padStart(2, "0")} / 04 · {STEP_NAMES[index]}
              </p>
              {content}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
