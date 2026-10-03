/**
 * Az Esthajnal medál geometriája — tiszta matek, three.js nélkül.
 *
 * A medál két fonott szálból áll a fotó alapján: egy kelta hármas csomóból
 * (triquetra), aminek a kerekded közepében ül a kő a tengelyén, és egy
 * gyémántokkal kirakott szívből. Mindkettő síkgörbe; a fonást (melyik szál
 * megy felül egy keresztezésnél) itt számoljuk ki, a görbe mentén mért
 * z-eltolásként.
 *
 * Egység: a csomó csúcsai 1 távolságra vannak a kő közepétől.
 */

export type P2 = { x: number; y: number };

const DEG = Math.PI / 180;

function arc(center: P2, radius: number, from: number, to: number, count: number): P2[] {
  const points: P2[] = [];
  for (let index = 0; index < count; index++) {
    const angle = from + ((to - from) * index) / count;
    points.push({ x: center.x + radius * Math.cos(angle), y: center.y + radius * Math.sin(angle) });
  }
  return points;
}

function line(from: P2, to: P2, count: number): P2[] {
  const points: P2[] = [];
  for (let index = 0; index < count; index++) {
    const t = index / count;
    points.push({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
  }
  return points;
}

/** Zárt töröttvonal újramintázása egyenletes ívhossz szerint. */
function resampleClosed(points: P2[], step: number): P2[] {
  const count = points.length;
  const cumulative = [0];
  for (let index = 1; index <= count; index++) {
    const a = points[index - 1];
    const b = points[index % count];
    cumulative.push(cumulative[index - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  const total = cumulative[count];
  const samples = Math.max(8, Math.round(total / step));
  const result: P2[] = [];
  let segment = 0;
  for (let index = 0; index < samples; index++) {
    const s = (index / samples) * total;
    while (cumulative[segment + 1] < s) segment++;
    const a = points[segment];
    const b = points[(segment + 1) % count];
    const t = (s - cumulative[segment]) / Math.max(1e-12, cumulative[segment + 1] - cumulative[segment]);
    result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return result;
}

/**
 * Gauss-simítás zárt görbén. Ez kerekíti le a csomó csúcsait és a szív
 * alját: a cső különben a hegyes sarokban önmagába gyűrődne. A köríveken
 * a hatása elhanyagolható (σ²/2R zsugorodás, tizedmilliméter alatt).
 */
function smoothClosed(points: P2[], sigma: number): P2[] {
  const count = points.length;
  const reach = Math.ceil(sigma * 3);
  const weights: number[] = [];
  for (let k = -reach; k <= reach; k++) weights.push(Math.exp(-(k * k) / (2 * sigma * sigma)));
  const sum = weights.reduce((a, b) => a + b, 0);
  return points.map((_, index) => {
    let x = 0;
    let y = 0;
    for (let k = -reach; k <= reach; k++) {
      const point = points[(index + k + count) % count];
      x += point.x * weights[k + reach];
      y += point.y * weights[k + reach];
    }
    return { x: x / sum, y: y / sum };
  });
}

function prepare(raw: P2[], smoothing: number) {
  const step = 0.004;
  const even = resampleClosed(raw, step);
  return resampleClosed(smoothClosed(even, smoothing / step), step);
}

/* ─── a három szál ─────────────────────────────────────────────────────── */

/**
 * Hármas csomó: három félkör, mindegyik a másik kettő középpontján megy át.
 * A középpontok 0,5-re vannak a kő közepétől, a csúcsok 1-re (fent, balra
 * lent, jobbra lent) — pont ahogy a fotón.
 */
function triquetra(): P2[] {
  const rho = 0.5;
  const radius = Math.sqrt(3) * rho;
  const c1 = { x: rho * Math.cos(30 * DEG), y: rho * Math.sin(30 * DEG) };
  const c2 = { x: -c1.x, y: c1.y };
  const c3 = { x: 0, y: -rho };
  return [
    ...arc(c1, radius, 120 * DEG, 300 * DEG, 500),
    ...arc(c3, radius, 0, 180 * DEG, 500),
    ...arc(c2, radius, 240 * DEG, 420 * DEG, 500)
  ];
}

/** Szív: két körív a hajlatokban, két egyenes oldal a csúcsig. */
function heart(): P2[] {
  const lobe = 0.49;
  const right = { x: 0.4, y: 0.26 };
  const left = { x: -right.x, y: right.y };
  const tip = { x: 0, y: -0.86 };

  const dipAngle = Math.atan2(Math.sqrt(lobe * lobe - right.x * right.x), -right.x);
  const toCenter = Math.hypot(right.x - tip.x, right.y - tip.y);
  const direction = Math.atan2(right.y - tip.y, right.x - tip.x) - Math.asin(lobe / toCenter);
  const reach = Math.sqrt(toCenter * toCenter - lobe * lobe);
  const touch = { x: tip.x + reach * Math.cos(direction), y: tip.y + reach * Math.sin(direction) };
  const touchAngle = Math.atan2(touch.y - right.y, touch.x - right.x);
  const mirrored = { x: -touch.x, y: touch.y };

  return [
    ...arc(right, lobe, dipAngle, touchAngle, 500),
    ...line(touch, tip, 260),
    ...line(tip, mirrored, 260),
    ...arc(left, lobe, Math.PI - touchAngle, Math.PI - dipAngle, 500)
  ];
}

/* ─── fonás ───────────────────────────────────────────────────────────── */

export type Strand = {
  id: "knot" | "heart";
  points: P2[];
  /** A görbe menti ívhossz minden mintapontban. */
  arc: number[];
  length: number;
  /** A keresztmetszet fél-szélessége a síkban és fél-mélysége z-ben. */
  halfWidth: number;
  halfDepth: number;
  z: number[];
};

export type Crossing = {
  a: number;
  b: number;
  sa: number;
  sb: number;
  at: P2;
  /** Az `a` szál (az `sa` pontban) fut-e felül. Önkeresztezésnél a = b. */
  aOver: boolean;
  /** A két szál szöge a keresztezésben (radián, 0..π/2). */
  angle: number;
};

function arcLengths(points: P2[]) {
  const lengths = [0];
  for (let index = 1; index <= points.length; index++) {
    const a = points[index - 1];
    const b = points[index % points.length];
    lengths.push(lengths[index - 1] + Math.hypot(b.x - a.x, b.y - a.y));
  }
  return lengths;
}

function findCrossings(strands: Strand[]) {
  const found: Omit<Crossing, "aOver">[] = [];
  for (let a = 0; a < strands.length; a++) {
    for (let b = a; b < strands.length; b++) {
      const A = strands[a].points;
      const B = strands[b].points;
      for (let i = 0; i < A.length; i++) {
        const p1 = A[i];
        const p2 = A[(i + 1) % A.length];
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);
        for (let j = a === b ? i + 8 : 0; j < B.length; j++) {
          if (a === b && i < 8 && j >= B.length - 8 + i) continue;
          const q1 = B[j];
          const q2 = B[(j + 1) % B.length];
          if (Math.max(q1.x, q2.x) < minX || Math.min(q1.x, q2.x) > maxX) continue;
          if (Math.max(q1.y, q2.y) < minY || Math.min(q1.y, q2.y) > maxY) continue;
          const rx = p2.x - p1.x;
          const ry = p2.y - p1.y;
          const sx = q2.x - q1.x;
          const sy = q2.y - q1.y;
          const denom = rx * sy - ry * sx;
          if (Math.abs(denom) < 1e-12) continue;
          const t = ((q1.x - p1.x) * sy - (q1.y - p1.y) * sx) / denom;
          const u = ((q1.x - p1.x) * ry - (q1.y - p1.y) * rx) / denom;
          if (t < 0 || t >= 1 || u < 0 || u >= 1) continue;
          const cos = Math.abs(rx * sx + ry * sy) / (Math.hypot(rx, ry) * Math.hypot(sx, sy));
          found.push({
            a,
            angle: Math.acos(Math.min(1, cos)),
            at: { x: p1.x + rx * t, y: p1.y + ry * t },
            b,
            sa: strands[a].arc[i] + t * Math.hypot(rx, ry),
            sb: strands[b].arc[j] + u * Math.hypot(sx, sy)
          });
        }
      }
    }
  }
  return found;
}

type Pass = { crossing: number; strand: number; s: number; isA: boolean };

function passesOf(strands: Strand[], crossings: Omit<Crossing, "aOver">[]) {
  const passes: Pass[][] = strands.map(() => []);
  crossings.forEach((crossing, index) => {
    passes[crossing.a].push({ crossing: index, isA: true, s: crossing.sa, strand: crossing.a });
    passes[crossing.b].push({ crossing: index, isA: false, s: crossing.sb, strand: crossing.b });
  });
  passes.forEach((list) => list.sort((p, q) => p.s - q.s));
  return passes;
}

/**
 * Váltakozó fonás: minden szálon végigmenve felül–alul–felül… Egy összefüggő
 * síkbeli diagramnak mindig van ilyen kiosztása; szálanként csak azt kell
 * megtalálni, hogy felüllel vagy alullal kezd.
 */
function weave(strands: Strand[], raw: Omit<Crossing, "aOver">[]): Crossing[] {
  const passes = passesOf(strands, raw);
  for (let mask = 0; mask < 1 << strands.length; mask++) {
    const aOver: (boolean | null)[] = raw.map(() => null);
    const bOver: (boolean | null)[] = raw.map(() => null);
    passes.forEach((list, strand) => {
      const phase = (mask >> strand) & 1;
      list.forEach((pass, order) => {
        const isOver = (order + phase) % 2 === 0;
        if (pass.isA) aOver[pass.crossing] = isOver;
        else bOver[pass.crossing] = isOver;
      });
    });
    if (raw.every((_, index) => aOver[index] !== bOver[index])) {
      return raw.map((crossing, index) => ({ ...crossing, aOver: aOver[index]! }));
    }
  }
  throw new Error("A fonás nem váltakozó — a görbék valahol érintik egymást.");
}

/** z(s): a keresztezésekben fennsík, köztük koszinuszos átmenet. */
function heights(strand: Strand, index: number, crossings: Crossing[], strands: Strand[]) {
  const keys = passesOf(strands, crossings)[index].map((pass) => {
    const crossing = crossings[pass.crossing];
    const other = strands[pass.isA ? crossing.b : crossing.a];
    const isOver = pass.isA ? crossing.aOver : !crossing.aOver;
    const lift = (strand.halfDepth + other.halfDepth + 0.006) / 2;
    const sideways = (strand.halfWidth + other.halfWidth) / Math.max(0.35, Math.sin(crossing.angle));
    return { hold: sideways * 0.55, s: pass.s, z: isOver ? lift : -lift };
  });
  if (!keys.length) return strand.points.map(() => 0);

  const L = strand.length;
  return strand.arc.slice(0, strand.points.length).map((s) => {
    let next = keys.findIndex((key) => key.s >= s);
    if (next === -1) next = 0;
    const prev = (next - 1 + keys.length) % keys.length;
    const a = keys[prev];
    const b = keys[next];
    let sb = b.s;
    let x = s;
    if (sb <= a.s) sb += L;
    if (x < a.s) x += L;
    const gap = sb - a.s;
    const holdA = Math.min(a.hold, gap * 0.4);
    const holdB = Math.min(b.hold, gap * 0.4);
    if (x - a.s <= holdA) return a.z;
    if (sb - x <= holdB) return b.z;
    const t = (x - a.s - holdA) / Math.max(1e-9, gap - holdA - holdB);
    return a.z + (b.z - a.z) * (1 - Math.cos(Math.PI * t)) * 0.5;
  });
}

export type PendantShape = {
  strands: Strand[];
  crossings: Crossing[];
  /** z magasság egy szálon egy adott ívhossznál. */
  zAt: (strand: Strand, s: number) => number;
};

export function buildPendantShape(): PendantShape {
  const make = (id: Strand["id"], points: P2[], halfWidth: number, halfDepth: number): Strand => {
    const lengths = arcLengths(points);
    return { arc: lengths, halfDepth, halfWidth, id, length: lengths[points.length], points, z: [] };
  };
  const strands = [
    make("knot", prepare(triquetra(), 0.02), 0.037, 0.03),
    make("heart", prepare(heart(), 0.03), 0.052, 0.024)
  ];

  const crossings = weave(strands, findCrossings(strands));
  strands.forEach((strand, index) => {
    strand.z = heights(strand, index, crossings, strands);
  });

  const zAt = (strand: Strand, s: number) => {
    const L = strand.length;
    const wrapped = ((s % L) + L) % L;
    const step = L / strand.points.length;
    const index = Math.floor(wrapped / step);
    const t = wrapped / step - index;
    const a = strand.z[index % strand.z.length];
    const b = strand.z[(index + 1) % strand.z.length];
    return a + (b - a) * t;
  };

  return { crossings, strands, zAt };
}

/* ─── briliáns csiszolás ──────────────────────────────────────────────── */

export type GemCut = {
  /** Kifelé mutató lapsíkok: nx, ny, nz, d (egységnyi rondiszt-sugárra). */
  planes: number[];
  /** Nem indexelt háromszögek lapnormálokkal. */
  positions: number[];
  normals: number[];
};

type V3 = [number, number, number];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V3): V3 => {
  const length = Math.hypot(a[0], a[1], a[2]);
  return [a[0] / length, a[1] / length, a[2] / length];
};

/**
 * Kerek briliáns, 57 lap + 16 lapos rondiszt. Az arányok a „Tolkowsky-
 * közeli" sávban: 34,5°-os korona, 40,75°-os pavilon, ~56%-os tábla.
 * A csúcsokat kézzel adjuk meg, így minden lap garantáltan sík — a shader
 * ugyanezekkel a síkokkal követi a fényt a kőben.
 */
export function brilliantCut(): GemCut {
  const girdle = 0.03;
  const crown = 34.5 * DEG;
  const pavilion = 40.75 * DEG;
  const tableRadius = 0.57;
  const starReach = 0.76;
  const lowerReach = 0.78;
  const eighth = Math.PI / 4;

  const at = (radius: number, angle: number, y: number): V3 => [radius * Math.cos(angle), y, radius * Math.sin(angle)];
  const bezelY = (radial: number) => girdle + (1 - radial) * Math.tan(crown);
  const mainY = (radial: number) => -girdle - (1 - radial) * Math.tan(pavilion);

  const table: V3[] = [];
  const star: V3[] = [];
  const top: V3[] = [];
  const bottom: V3[] = [];
  const lower: V3[] = [];
  for (let k = 0; k < 8; k++) {
    table.push(at(tableRadius, k * eighth, bezelY(tableRadius)));
    star.push(at(starReach, (k + 0.5) * eighth, bezelY(starReach * Math.cos(eighth / 2))));
    lower.push(at(lowerReach, (k + 0.5) * eighth, mainY(lowerReach * Math.cos(eighth / 2))));
  }
  for (let j = 0; j < 16; j++) {
    top.push(at(1, (j * eighth) / 2, girdle));
    bottom.push(at(1, (j * eighth) / 2, -girdle));
  }
  const culet: V3 = [0, mainY(0), 0];

  const faces: V3[][] = [];
  faces.push([...table]);
  for (let k = 0; k < 8; k++) {
    const next = (k + 1) % 8;
    const prev = (k + 7) % 8;
    faces.push([table[k], table[next], star[k]]);
    faces.push([table[k], star[prev], top[2 * k], star[k]]);
    faces.push([star[k], top[2 * k], top[2 * k + 1]]);
    faces.push([star[k], top[2 * k + 1], top[(2 * k + 2) % 16]]);
    faces.push([culet, lower[prev], bottom[2 * k], lower[k]]);
    faces.push([lower[k], bottom[2 * k], bottom[2 * k + 1]]);
    faces.push([lower[k], bottom[2 * k + 1], bottom[(2 * k + 2) % 16]]);
  }
  for (let j = 0; j < 16; j++) {
    const next = (j + 1) % 16;
    faces.push([top[j], top[next], bottom[next], bottom[j]]);
  }

  const planes: number[] = [];
  const positions: number[] = [];
  const normals: number[] = [];
  for (const face of faces) {
    const center = face.reduce<V3>((sum, v) => [sum[0] + v[0] / face.length, sum[1] + v[1] / face.length, sum[2] + v[2] / face.length], [0, 0, 0]);
    let normal = unit(cross(sub(face[1], face[0]), sub(face[2], face[0])));
    if (dot(normal, center) < 0) normal = [-normal[0], -normal[1], -normal[2]];
    planes.push(normal[0], normal[1], normal[2], dot(normal, face[0]));
    // a háromszögek körüljárása a kifelé mutató normálhoz igazodik
    const ordered = dot(cross(sub(face[1], face[0]), sub(face[2], face[0])), normal) > 0 ? face : [...face].reverse();
    for (let index = 1; index < ordered.length - 1; index++) {
      for (const vertex of [ordered[0], ordered[index], ordered[index + 1]]) {
        positions.push(...vertex);
        normals.push(...normal);
      }
    }
  }
  return { normals, planes, positions };
}

/** A csiszolás magassága egységnyi sugárra: [pavilon alja, tábla]. */
export function cutExtent() {
  const cut = brilliantCut();
  let min = Infinity;
  let max = -Infinity;
  for (let index = 1; index < cut.positions.length; index += 3) {
    min = Math.min(min, cut.positions[index]);
    max = Math.max(max, cut.positions[index]);
  }
  return { bottom: min, top: max };
}
