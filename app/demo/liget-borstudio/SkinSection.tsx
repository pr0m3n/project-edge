"use client";

import { useEffect, useRef, useState } from "react";
import type { SkinLabel } from "./skin";
import type { Treatment } from "./TreatmentPicker";

/**
 * „Melyik kezelés meddig hat?" — görgetésre szétnyíló bőrmetszet.
 *
 * A három kezelés ára és ideje azért különbözik, mert más mélységben
 * dolgoznak. Ezt itt látni lehet: a rétegek szétválnak, a hatóanyag-cseppek
 * a hámig vagy az irha tetejéig jutnak, az emelő kezelésnél pedig kisimulnak
 * a felszíni ráncok. Minden kezelésnél ott a foglalás gombja.
 */

type Step = { from: number; kicker: string; title: string; copy: string; treatment?: number; depth?: string };

const STEPS: Step[] = [
  {
    from: 0,
    kicker: "A bőr, közelről",
    title: "Három kezelés, három mélység.",
    copy: "Az áruk nem véletlenül más. Görgess tovább, és megmutatjuk, melyik kezelés meddig ér le a bőrödben."
  },
  {
    from: 0.13,
    kicker: "Három réteg",
    title: "Hám, irha, bőralja.",
    copy: "A hám tizedmilliméter vastag, ez véd. Alatta az irha: kollagén, erek, szőrtüszők. Legalul a bőralja, ami párnáz."
  },
  {
    from: 0.3,
    kicker: "01 · a legfelső tizedmilliméter",
    title: "A nyugtató kúra a hámot erősíti.",
    copy: "Kipirosodó, érzékeny bőrnél a védőréteg sérült. A hatóanyag itt dolgozik, és nem is kell mélyebbre mennie.",
    treatment: 1,
    depth: "Hám"
  },
  {
    from: 0.52,
    kicker: "02 · a hámon át",
    title: "A Rituálé az irha tetejéig jut.",
    copy: "Diagnosztika után mélyhidratálás: a hatóanyag átjut a hámon, és az irha felső rétegében köti meg a vizet.",
    treatment: 0,
    depth: "Hám és felső irha"
  },
  {
    from: 0.74,
    kicker: "03 · a kollagénen",
    title: "Az emelő kezelés az irhán dolgozik.",
    copy: "Manuális liftingmasszázs a kollagénrostokon, enzimes megújítás a felszínen. Ettől simulnak ki a finom ráncok.",
    treatment: 2,
    depth: "Irha"
  },
  {
    from: 0.93,
    kicker: "Ha nem tudod, melyik kell",
    title: "Az első alkalom mindig diagnosztika.",
    copy: "Megnézzük a bőröd, és megmondjuk, melyik kezelés kell. Ha bőrgyógyász kell hozzá, azt is megmondjuk."
  }
];

/** Egy lépés ablaka: be- és kiúszással. */
const windowed = (p: number, from: number, to: number) => {
  const fade = 0.035;
  const on = Math.min(1, Math.max(0, (p - from) / fade));
  const off = Math.min(1, Math.max(0, (to - p) / fade));
  return Math.min(on, off);
};
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

type Props = { treatments: Treatment[]; onBook: (index: number) => void };

export function SkinSection({ treatments, onBook }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRefs = useRef(new Map<string, HTMLDivElement>());
  const [labels, setLabels] = useState<SkinLabel[]>([]);
  const [step, setStep] = useState(0);
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
    let current = reduced ? 0.6 : 0;
    let lastStep = -1;
    let cleanup = () => {};
    const stage = canvas.parentElement as HTMLElement;

    const target = () => {
      if (reduced) return 0.6;
      const rect = section.getBoundingClientRect();
      const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
      const total = rect.height - stage.offsetHeight;
      return total <= 0 ? 0 : clamp01((stickyTop - rect.top) / total);
    };

    import("./skin")
      .then(({ createSkinScene }) => {
        if (disposed) return;
        let scene: ReturnType<typeof createSkinScene>;
        try {
          scene = createSkinScene(canvas);
        } catch {
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

        const draw = (time: number) => {
          const goal = target();
          current += (goal - current) * (reduced ? 1 : 0.09);
          if (Math.abs(goal - current) < 0.0003) current = goal;
          const p = current;

          const explode = smooth(0.13, 0.25, p) * (1 - smooth(0.9, 0.98, p));
          const epidermis = windowed(p, 0.3, 0.52) + windowed(p, 0.52, 0.74) + 0.35 * windowed(p, 0.74, 0.93);
          const dermis = 0.8 * windowed(p, 0.52, 0.74) + windowed(p, 0.74, 0.93);
          const dropPhase = p < 0.52 ? clamp01((p - 0.32) / 0.18) : p < 0.74 ? clamp01((p - 0.54) / 0.18) : 0;
          scene.update({
            dropDepth: p < 0.52 ? 0 : 1,
            dropPhase,
            explode,
            focus: [Math.min(1, epidermis), Math.min(1, dermis), 0],
            orbit: p,
            seconds: reduced ? 0 : time / 1000,
            wrinkles: 1 - smooth(0.77, 0.9, p)
          });
          scene.render();

          for (const label of scene.project(size.width, size.height)) {
            const element = labelRefs.current.get(label.id);
            if (!element) continue;
            element.style.setProperty("--x", `${label.x.toFixed(1)}px`);
            element.style.setProperty("--y", `${label.y.toFixed(1)}px`);
            element.style.opacity = smooth(0.5, 0.9, explode).toFixed(3);
          }

          const nextStep = STEPS.reduce((found, item, index) => (p >= item.from ? index : found), 0);
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

  const content = (item: Step) => {
    const treatment = item.treatment !== undefined ? treatments[item.treatment] : undefined;
    return (
      <>
        <p className="noma-eyebrow">{item.kicker}</p>
        <h2>{item.title}</h2>
        <p className="noma-lede">{item.copy}</p>
        {treatment && item.treatment !== undefined && (
          <div className="noma-skin-card">
            <div>
              <strong>{treatment.name}</strong>
              <span>
                {treatment.time} · {treatment.price} · hat: {item.depth?.toLowerCase()}
              </span>
            </div>
            <button className="noma-btn small" onClick={() => onBook(item.treatment ?? 0)} type="button">
              Ezt kérem
            </button>
          </div>
        )}
        {item === STEPS[STEPS.length - 1] && (
          <button className="noma-btn" onClick={() => onBook(0)} type="button">
            Konzultációval kezdem
          </button>
        )}
      </>
    );
  };

  return (
    <section aria-label="Melyik kezelés meddig hat" className={`noma-skin${still ? " is-still" : ""}`} id="melyseg" ref={sectionRef}>
      <div className="noma-skin-stage">
        <canvas aria-hidden="true" className={`noma-skin-canvas${ready ? " is-ready" : ""}`} ref={canvasRef} />
        <div aria-hidden="true" className="noma-skin-labels">
          {labels.map((label) => (
            <div
              className="noma-skin-label"
              key={label.id}
              ref={(element) => {
                if (element) labelRefs.current.set(label.id, element);
                else labelRefs.current.delete(label.id);
              }}
              style={{ opacity: 0 }}
            >
              <b>{label.text}</b>
              <span>{label.sub}</span>
            </div>
          ))}
        </div>

        {!still && (
          <div className="noma-skin-copy" aria-live="polite">
            {STEPS.map((item, index) => (
              <div aria-hidden={index !== step} className={`noma-skin-step${index === step ? " is-active" : ""}`} key={item.title}>
                {content(item)}
              </div>
            ))}
          </div>
        )}

        {!still && (
          <ol aria-hidden="true" className="noma-skin-progress">
            {STEPS.map((item, index) => (
              <li className={index <= step ? "is-done" : ""} key={item.title} />
            ))}
          </ol>
        )}
      </div>

      {still && (
        <div className="noma-skin-static">
          {STEPS.map((item) => (
            <div className="noma-skin-step is-active" key={item.title}>
              {content(item)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
