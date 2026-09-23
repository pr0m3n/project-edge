/**
 * Egy pörkölés modellje — three.js nélkül, hogy a görbe (SVG), a 3D babok
 * és a szövegek ugyanabból a számításból dolgozzanak.
 *
 * A számok egy tipikus 12 kg-os dobpörkölő profilját követik: a zöld kávé
 * ~200 °C-os dobba kerül, a babhőmérséklet a „fordulópontig" leesik, aztán
 * lassuló ütemben emelkedik. Első pattanás ~196 °C, második ~224 °C.
 */

/** A pörkölés hossza percben (a második pattanás után). */
export const ROAST_END = 12.4;

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
  const t = Math.min(ROAST_END, Math.max(0, minute));
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

/* ── színek ─────────────────────────────────────────────────────────── */

/** A bab színe a pörkölés percében (sRGB hex-ek közti átmenet). */
const COLORS: [number, string][] = [
  // a zöld kávé valójában szürkészöld, nem olívazöld
  [0, "#a2a684"],
  [3, "#aaa681"],
  [5, "#c8b27c"],
  [6.6, "#b88b58"],
  [8, "#97603a"],
  [9, "#7c4a2a"],
  [10.2, "#5f3820"],
  [11.8, "#3b2415"],
  [12.4, "#2e1c11"]
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
