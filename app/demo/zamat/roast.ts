/**
 * Egy pörkölés modellje — three.js nélkül, hogy a görbe (SVG), a 3D babok
 * és a szövegek ugyanabból a számításból dolgozzanak.
 *
 * A számok egy tipikus 12 kg-os dobpörkölő profilját követik: a zöld kávé
 * ~200 °C-os dobba kerül, a babhőmérséklet a „fordulópontig" leesik, aztán
 * lassuló ütemben emelkedik. Első pattanás ~196 °C, második ~224 °C.
 */

/** A görgetés teljes hossza percben: pörkölés + hűtés. */
export const ROAST_END = 12.4;
export const COOL_END = 13.4;

/** [perc, babhőmérséklet °C] — Catmull–Rom-mal simítva. */
const CURVE: [number, number][] = [
  [0, 200],
  [0.8, 128],
  [1.5, 97],
  [3, 118],
  [5, 150],
  [6.6, 174],
  [8, 196],
  [9, 204],
  [10, 211],
  [11, 218],
  [11.8, 224],
  [12.4, 227]
];

export function beanTemp(minute: number): number {
  // Kiöntés után a hűtőtálcán gyorsan hűl (~40 °C-ig), a keverőkar alatt.
  if (minute > ROAST_END) {
    const u = Math.min(1, (minute - ROAST_END) / (COOL_END - ROAST_END));
    return 40 + (beanTemp(ROAST_END) - 40) * Math.exp(-3.2 * u);
  }
  const t = Math.max(0, minute);
  let i = 0;
  while (i < CURVE.length - 2 && t > CURVE[i + 1][0]) i++;
  const p0 = CURVE[Math.max(0, i - 1)];
  const p1 = CURVE[i];
  const p2 = CURVE[i + 1];
  const p3 = CURVE[Math.min(CURVE.length - 1, i + 2)];
  const u = (t - p1[0]) / (p2[0] - p1[0]);
  const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0] || 1);
  const m2 = (p3[1] - p1[1]) / (p3[0] - p1[0] || 1);
  const h = p2[0] - p1[0];
  const u2 = u * u;
  const u3 = u2 * u;
  // Hermite-bázis
  return (
    (2 * u3 - 3 * u2 + 1) * p1[1] +
    (u3 - 2 * u2 + u) * h * m1 +
    (-2 * u3 + 3 * u2) * p2[1] +
    (u3 - u2) * h * m2
  );
}

/** Emelkedési ráta (Rate of Rise), °C/perc. */
export function rateOfRise(minute: number) {
  const dt = 0.25;
  return (beanTemp(minute) - beanTemp(minute - dt)) / dt;
}

/* ── színek ─────────────────────────────────────────────────────────── */

/** A bab színe a pörkölés percében (sRGB hex-ek közti átmenet). */
const COLORS: [number, string][] = [
  [0, "#7d8a4f"],
  [3, "#8f9259"],
  [5, "#c4ad68"],
  [6.6, "#b6864b"],
  [8, "#94582d"],
  [9, "#7a4322"],
  [10.2, "#5c321a"],
  [11.8, "#352012"],
  [12.4, "#2a190f"]
];

const hexToRgb = (hex: string) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);

export function beanColor(minute: number): [number, number, number] {
  const t = Math.min(ROAST_END, Math.max(0, minute));
  let i = 0;
  while (i < COLORS.length - 2 && t > COLORS[i + 1][0]) i++;
  const [t0, c0] = COLORS[i];
  const [t1, c1] = COLORS[i + 1];
  const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  const a = hexToRgb(c0);
  const b = hexToRgb(c1);
  return [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * u) as [number, number, number];
}

export const toHex = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b].map((value) => Math.round(value * 255).toString(16).padStart(2, "0")).join("")}`;

/* ── fázisok és kivételek ───────────────────────────────────────────── */

export type Phase = { from: number; name: string };

export const PHASES: Phase[] = [
  { from: 0, name: "Betöltés" },
  { from: 1.5, name: "Szárítás" },
  { from: 5, name: "Sárgulás" },
  { from: 6.6, name: "Maillard-szakasz" },
  { from: 8, name: "Első pattanás" },
  { from: 9, name: "Fejlesztés" },
  { from: 11.8, name: "Második pattanás" },
  { from: ROAST_END, name: "Hűtés" }
];

export const phaseAt = (minute: number) => PHASES.reduce((found, phase) => (minute >= phase.from ? phase : found), PHASES[0]);

/** Jelölések a görbén. */
export const MARKS = [
  { at: 1.5, label: "fordulópont" },
  { at: 5, label: "sárgulás" },
  { at: 8, label: "1. pattanás" },
  { at: 11.8, label: "2. pattanás" }
];

export function formatMinute(minute: number) {
  const total = Math.max(0, Math.round(minute * 60));
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

export const formatTemp = (value: number) => `${Math.round(value)} °C`;

/* ── pörkölési napok ────────────────────────────────────────────────── */

/** Az utolsó `count` pörkölési nap (kedd és péntek) a `from` naptól visszafelé. */
export function roastDays(from: Date, count: number) {
  const days: Date[] = [];
  const day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (days.length < count) {
    if (day.getDay() === 2 || day.getDay() === 5) days.push(new Date(day));
    day.setDate(day.getDate() - 1);
  }
  return days;
}

const WEEKDAYS = ["vasárnap", "hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat"];
const MONTHS = ["jan.", "febr.", "márc.", "ápr.", "máj.", "jún.", "júl.", "aug.", "szept.", "okt.", "nov.", "dec."];

export const formatDay = (date: Date) => `${MONTHS[date.getMonth()]} ${date.getDate()}., ${WEEKDAYS[date.getDay()]}`;
export const formatStamp = (date: Date) =>
  `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}.`;
