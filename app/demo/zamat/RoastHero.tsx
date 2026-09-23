"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./CartContext";
import { findProduct, formatFt, type Product } from "./data";
import { beanColor, beanTemp, COOL_END, formatMinute, formatTemp, MARKS, phaseAt, rateOfRise, ROAST_END, toHex } from "./roast";

/**
 * Görgetésre egy teljes pörkölés: a görgetés = a pörkölés ideje.
 *
 * A szekció ~6 képernyő magas, benne sticky színpad. A haladásból perc lesz
 * (0 → 13,4), és minden ebből számolódik: a 3D babok színe, a görbe, a
 * mérőértékek és az, hogy melyik kávét „vesszük ki" éppen a dobból — azt
 * rögtön kosárba is lehet tenni.
 */

type Step = { from: number; kicker: string; product?: string };

const STEPS: Step[] = [
  { from: 0, kicker: "Egy pörkölés, percről percre" },
  { from: 1.2, kicker: "Szárítás · 1:30–5:00" },
  { from: 7.8, kicker: "Első pattanás · 196 °C", product: "etiopia-guji" },
  { from: 9.5, kicker: "Fejlesztés · 211 °C", product: "kolumbia-huila" },
  { from: 11.4, kicker: "Második pattanás · 224 °C", product: "brazil-cerrado" },
  { from: 12.5, kicker: "Hűtés · 4 perc" }
];

/* ── a görbe geometriája (statikus) ───────────────────────────────────── */

const W = 400;
const H = 170;
const X0 = 34;
const X1 = 392;
const Y0 = 150;
const Y1 = 12;
const T_MIN = 80;
const T_MAX = 235;
const xOf = (minute: number) => X0 + (Math.min(minute, ROAST_END) / ROAST_END) * (X1 - X0);
const yOf = (temp: number) => Y0 - ((temp - T_MIN) / (T_MAX - T_MIN)) * (Y0 - Y1);

const CURVE_PATH = Array.from({ length: 125 }, (_, index) => {
  const minute = (index / 124) * ROAST_END;
  return `${index ? "L" : "M"}${xOf(minute).toFixed(1)} ${yOf(beanTemp(minute)).toFixed(1)}`;
}).join(" ");

const DROPS = ["etiopia-guji", "kolumbia-huila", "brazil-cerrado"].map((slug) => findProduct(slug)).filter(Boolean) as Product[];

export function RoastHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef<HTMLElement>(null);
  const tempRef = useRef<HTMLElement>(null);
  const rorRef = useRef<HTMLElement>(null);
  const phaseRef = useRef<HTMLElement>(null);
  const swatchRef = useRef<HTMLElement>(null);
  const clipRef = useRef<SVGRectElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [still, setStill] = useState(false);
  const { add, lastAdded } = useCart();

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setStill(reduced);

    let disposed = false;
    let frame = 0;
    let visible = true;
    let current = reduced ? 10 : 0;
    let lastStep = -1;
    let cleanup = () => {};

    const readouts = (minute: number) => {
      const temp = beanTemp(minute);
      if (timeRef.current) timeRef.current.textContent = formatMinute(minute);
      if (tempRef.current) tempRef.current.textContent = formatTemp(temp);
      if (rorRef.current) rorRef.current.textContent = minute > 1.6 && minute < ROAST_END ? `${rateOfRise(minute).toFixed(1).replace(".", ",")} °C/p` : "—";
      if (phaseRef.current) phaseRef.current.textContent = phaseAt(minute).name;
      if (swatchRef.current) swatchRef.current.style.background = toHex(beanColor(minute));
      clipRef.current?.setAttribute("width", `${Math.max(0, xOf(minute) - X0 + 2)}`);
      dotRef.current?.setAttribute("cx", xOf(minute).toFixed(1));
      dotRef.current?.setAttribute("cy", yOf(temp).toFixed(1));
      const nextStep = STEPS.reduce((found, item, index) => (minute >= item.from ? index : found), 0);
      if (nextStep !== lastStep) {
        lastStep = nextStep;
        setStep(nextStep);
      }
    };

    // A színpad a fejléc alá tapad: a rögzített szakasz a szekció és a színpad különbsége.
    const stage = canvas.parentElement as HTMLElement;
    const targetMinute = () => {
      if (reduced) return 10;
      const rect = section.getBoundingClientRect();
      const stickyTop = parseFloat(getComputedStyle(stage).top) || 0;
      const total = rect.height - stage.offsetHeight;
      const progress = total <= 0 ? 0 : Math.min(1, Math.max(0, (stickyTop - rect.top) / total));
      return progress * COOL_END;
    };

    readouts(current);

    import("./beans")
      .then(({ createRoastScene }) => {
        if (disposed) return;
        let scene: ReturnType<typeof createRoastScene>;
        try {
          scene = createRoastScene(canvas, { count: window.innerWidth < 700 ? 110 : 170 });
        } catch {
          setStatus("failed");
          return;
        }

        const resize = () => {
          const rect = canvas.getBoundingClientRect();
          scene.resize(rect.width, rect.height);
        };
        resize();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(canvas);

        const draw = (time: number) => {
          const target = targetMinute();
          current += (target - current) * (reduced ? 1 : 0.085);
          if (Math.abs(target - current) < 0.002) current = target;
          scene.update(current, reduced ? 0 : time / 1000);
          scene.render();
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
  }, []);

  const dropCard = (slug: string) => {
    const product = findProduct(slug);
    if (!product?.drop) return null;
    const added = lastAdded === `${product.slug}|250|szemes`;
    return (
      <div className="zm-drop">
        <span className="zm-drop-swatch" style={{ background: toHex(beanColor(product.drop)) }} aria-hidden="true" />
        <div className="zm-drop-body">
          <small>
            Kivesszük: {formatMinute(product.drop)} · {formatTemp(beanTemp(product.drop))}
          </small>
          <Link href={`/demo/zamat/termek/${product.slug}`}>{product.name}</Link>
          <span>{product.notes.join(" · ")}</span>
        </div>
        <button className={`zm-btn sm${added ? " is-added" : ""}`} onClick={() => add(product.slug, "250", "szemes")} type="button">
          {added ? "Kosárban" : formatFt(product.price)}
        </button>
      </div>
    );
  };

  const copy = [
    <>
      <h1>Kedden pörköltük, csütörtökön nálad van.</h1>
      <p>
        Heti kétszer pörkölünk, kis tételekben, egy 12 kilós dobban. Görgess végig egy pörkölésen: megmutatjuk, melyik
        percben vesszük ki az egyes kávékat.
      </p>
      <div className="zm-hero-actions">
        <Link className="zm-btn lg" href="#kavek">Az aktuális tételek</Link>
      </div>
    </>,
    <>
      <h2>A zöld kávé még szénaszagú.</h2>
      <p>
        Az első öt percben a szem kiszárad, és sárgulni kezd. Ha itt kivennénk, ihatatlan lenne: a savak és a cukrok még
        nem alakultak át.
      </p>
    </>,
    <>
      <h2>Pattan. Most vesszük ki az etiópot.</h2>
      <p>Az első pattanás után 42 másodperccel. Így marad benne a bergamott és a jázmin.</p>
      {dropCard("etiopia-guji")}
    </>,
    <>
      <h2>Két perccel később: a kolumbiai.</h2>
      <p>Tovább fejlesztjük, hogy a savak lekerekedjenek, és előjöjjön a karamell. Tejjel is ez működik a legjobban.</p>
      {dropCard("kolumbia-huila")}
    </>,
    <>
      <h2>Második pattanás: espresso.</h2>
      <p>A felszínre kiül az olaj, a gyümölcs helyét az étcsokoládé és a dió veszi át. Ennél tovább nem visszük.</p>
      {dropCard("brazil-cerrado")}
    </>,
    <>
      <h2>Négy perc hűtés, aztán zacskó.</h2>
      <p>A csomagon ott a pörkölés napja és a tételszám. A pörkölés utáni 4–20. napon a legjobb.</p>
      <div className="zm-hero-actions">
        <Link className="zm-btn lg" href="#kavek">Kávét választok</Link>
        <Link className="zm-btn ghost-light lg" href="#naplo">Pörkölési napló</Link>
      </div>
    </>
  ];

  return (
    <section aria-label="Egy pörkölés görgetésre" className={`zm-roast${still ? " is-still" : ""}`} id="porkoles" ref={sectionRef}>
      <div className="zm-roast-stage">
        <canvas aria-hidden="true" className={`zm-roast-canvas${status === "ready" ? " is-ready" : ""}`} ref={canvasRef} />

        {!still && (
          <div className="zm-roast-copy" aria-live="polite">
            {copy.map((content, index) => (
              <div aria-hidden={index !== step} className={`zm-roast-step${index === step ? " is-active" : ""}`} key={index}>
                <p className="zm-kicker">{STEPS[index].kicker}</p>
                {content}
              </div>
            ))}
          </div>
        )}

        <figure className="zm-chart">
          <dl className="zm-readouts">
            <div><dt>Idő</dt><dd ref={timeRef}>00:00</dd></div>
            <div><dt>Bab</dt><dd ref={tempRef}>200 °C</dd></div>
            <div><dt>RoR</dt><dd ref={rorRef}>—</dd></div>
            <div className="is-phase"><dt>Szakasz</dt><dd><i ref={swatchRef} aria-hidden="true" /><span ref={phaseRef}>Betöltés</span></dd></div>
          </dl>
          <svg aria-label="Pörkölési görbe: babhőmérséklet az idő függvényében" role="img" viewBox={`0 0 ${W} ${H}`}>
            <defs>
              <clipPath id="zm-roast-progress">
                <rect height={H} ref={clipRef} width="0" x={X0} y="0" />
              </clipPath>
            </defs>
            {[100, 150, 200].map((temp) => (
              <g key={temp}>
                <line className="zm-chart-grid" x1={X0} x2={X1} y1={yOf(temp)} y2={yOf(temp)} />
                <text className="zm-chart-axis" x={X0 - 6} y={yOf(temp) + 3.5} textAnchor="end">{temp}°</text>
              </g>
            ))}
            {MARKS.map((mark) => (
              <g key={mark.label}>
                <line className="zm-chart-mark" x1={xOf(mark.at)} x2={xOf(mark.at)} y1={Y1} y2={Y0} />
                {/* a görbe jobb szélén a felirat befelé áll, különben kilóg a keretből */}
                <text
                  className="zm-chart-label"
                  textAnchor={xOf(mark.at) > X1 - 60 ? "end" : "start"}
                  x={xOf(mark.at) + (xOf(mark.at) > X1 - 60 ? -3 : 3)}
                  y={Y0 - 4}
                >
                  {mark.label}
                </text>
              </g>
            ))}
            {DROPS.map((product) => (
              <g key={product.slug}>
                <circle className="zm-chart-drop" cx={xOf(product.drop ?? 0)} cy={yOf(beanTemp(product.drop ?? 0))} r="3.2" />
              </g>
            ))}
            <path className="zm-chart-curve is-ghost" d={CURVE_PATH} />
            <path className="zm-chart-curve" clipPath="url(#zm-roast-progress)" d={CURVE_PATH} />
            <circle className="zm-chart-dot" cx={X0} cy={yOf(200)} r="4.5" ref={dotRef} />
            {[0, 4, 8, 12].map((minute) => (
              <text className="zm-chart-axis" key={minute} textAnchor="middle" x={xOf(minute)} y={H - 4}>
                {minute}′
              </text>
            ))}
          </svg>
        </figure>

        {!still && step === 0 && <span className="zm-scroll-hint">Görgess — indul a pörkölés</span>}
      </div>

      {still && (
        <div className="zm-roast-static">
          {copy.map((content, index) => (
            <div className="zm-roast-step is-active" key={index}>
              <p className="zm-kicker">{STEPS[index].kicker}</p>
              {content}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
