/**
 * Alaprajz-logika three.js nélkül.
 *
 * Ugyanebből az adatból készül a 3D makett (model.ts), a kártyák 2D
 * alaprajz-vázlata (PlanSketch) és a napsütés-számítás is — ezért nincs benne
 * semmi, ami a böngészőhöz vagy a WebGL-hez kötné.
 *
 * Koordináták: méterben, 0,5 m-es rácsra. Az alaprajz saját `x` tengelye
 * jobbra, `z` tengelye „lefelé" (a rajz alja felé) nő. Hogy ez a lefelé irány
 * melyik égtáj, azt a `facing` mondja meg (iránytű-fok: 0 = É, 90 = K…).
 */

export type RoomKind = "living" | "kitchen" | "bed" | "bath" | "study" | "hall" | "terrace" | "garden";

export type Room = {
  name: string;
  kind: RoomKind;
  x: number;
  z: number;
  w: number;
  d: number;
  /** Nappali, amiben konyha is van — a makett konyhapultot is kap. */
  withKitchen?: boolean;
};

export type Plan = {
  /** A rajz alsó élének iránytű-iránya fokban. */
  facing: number;
  /** Felirat a szint neve helyén, pl. „5. emelet" vagy „Földszint". */
  level: string;
  /** A befoglaló téglalap azon oldalai, ahol nincs ablak: tűzfal a szomszéd
   *  ház felé, vagy a lépcsőház. Enélkül minden nappaliba egész nap besütne
   *  a nap, és a napfény-összevetésnek nem volna értelme. */
  blind?: ("top" | "bottom" | "left" | "right")[];
  rooms: Room[];
};

export const GRID = 0.5;

export const isOutdoor = (kind: RoomKind) => kind === "terrace" || kind === "garden";

export const roomArea = (room: Room) => Math.round(room.w * room.d * 10) / 10;

export function planBounds(plan: Plan) {
  let maxX = 0;
  let maxZ = 0;
  for (const room of plan.rooms) {
    maxX = Math.max(maxX, room.x + room.w);
    maxZ = Math.max(maxZ, room.z + room.d);
  }
  return { w: maxX, d: maxZ };
}

/**
 * Egy fal-szakasz két helyiség (vagy egy helyiség és a külvilág) határán.
 * `a`/`b` a szobák indexe, -1 = kívül. A két oldal sorrendje: `a` a kisebb
 * koordináta felőli oldal.
 */
export type WallRun = {
  axis: "x" | "z";
  /** A fal állandó koordinátája (x-irányú falnál a z, z-irányúnál az x). */
  at: number;
  from: number;
  to: number;
  a: number;
  b: number;
  type: "interior" | "exterior" | "solid" | "opening" | "parapet";
};

/**
 * A szobák rácscellákra bontva, majd a cellahatárokból összefűzött falak.
 * Így az is jól működik, ha két szoba csak részben érintkezik — a naiv
 * „szobánként négy fal" megoldás ott egymásba lógó, villódzó falakat adna.
 */
export function wallRuns(plan: Plan): WallRun[] {
  const { w, d } = planBounds(plan);
  const cols = Math.round(w / GRID);
  const rows = Math.round(d / GRID);
  const cells: number[] = new Array(cols * rows).fill(-1);

  plan.rooms.forEach((room, index) => {
    const x0 = Math.round(room.x / GRID);
    const z0 = Math.round(room.z / GRID);
    const x1 = Math.round((room.x + room.w) / GRID);
    const z1 = Math.round((room.z + room.d) / GRID);
    for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) cells[z * cols + x] = index;
  });

  const cell = (x: number, z: number) => (x < 0 || z < 0 || x >= cols || z >= rows ? -1 : cells[z * cols + x]);
  const runs: WallRun[] = [];

  const classify = (a: number, b: number): WallRun["type"] | null => {
    if (a === b) return null;
    const outA = a === -1 || isOutdoor(plan.rooms[a].kind);
    const outB = b === -1 || isOutdoor(plan.rooms[b].kind);
    if (outA && outB) {
      // Terasz és a semmi határa: üveg mellvéd. Két kültéri terület között nincs fal.
      return a === -1 || b === -1 ? "parapet" : null;
    }
    if (outA || outB) {
      // Szoba és terasz/kert határa: tolóajtós üvegfal.
      const other = outA ? a : b;
      return other === -1 ? "exterior" : "opening";
    }
    return "interior";
  };

  // x-irányú falak: a z = row*GRID vonalon, a (row-1) és a (row) sor között
  for (let row = 0; row <= rows; row++) {
    let start = 0;
    for (let col = 0; col <= cols; col++) {
      const pair = col < cols ? [cell(col, row - 1), cell(col, row)] : [-2, -2];
      const prev = col > start ? [cell(col - 1, row - 1), cell(col - 1, row)] : null;
      if (prev && (pair[0] !== prev[0] || pair[1] !== prev[1])) {
        const type = classify(prev[0], prev[1]);
        if (type) runs.push({ axis: "x", at: row * GRID, from: start * GRID, to: col * GRID, a: prev[0], b: prev[1], type });
        start = col;
      }
    }
  }

  // z-irányú falak: az x = col*GRID vonalon
  for (let col = 0; col <= cols; col++) {
    let start = 0;
    for (let row = 0; row <= rows; row++) {
      const pair = row < rows ? [cell(col - 1, row), cell(col, row)] : [-2, -2];
      const prev = row > start ? [cell(col - 1, row - 1), cell(col, row - 1)] : null;
      if (prev && (pair[0] !== prev[0] || pair[1] !== prev[1])) {
        const type = classify(prev[0], prev[1]);
        if (type) runs.push({ axis: "z", at: col * GRID, from: start * GRID, to: row * GRID, a: prev[0], b: prev[1], type });
        start = row;
      }
    }
  }

  // A vak oldalakra eső külső falak tömörek: se üveg, se napfény.
  const blind = new Set(plan.blind ?? []);
  for (const run of runs) {
    if (run.type !== "exterior") continue;
    const side =
      run.axis === "x" ? (run.at === 0 ? "top" : run.at === d ? "bottom" : null) : run.at === 0 ? "left" : run.at === w ? "right" : null;
    if (side && blind.has(side)) run.type = "solid";
  }

  return runs;
}

/** Üvegfal-e a szakasz: tolóajtó a teraszra, mellvéd, vagy ablakos külső fal
 *  (fürdőben és előszobában nincs nagy üvegfelület, és a rövid szakasz sem az). */
export function isGlazed(plan: Plan, run: WallRun) {
  if (run.type === "opening" || run.type === "parapet") return true;
  if (run.type !== "exterior" || run.to - run.from < 1.5) return false;
  const room = plan.rooms[run.a === -1 ? run.b : run.a];
  return room.kind !== "bath" && room.kind !== "hall";
}

/* ── Nap ─────────────────────────────────────────────────────────────── */

/** Szeptember végi budapesti napállás, egyszerűsítve (napkelte 6:40, napnyugta 18:55). */
export const SUNRISE = 6.67;
export const SUNSET = 18.92;

/** Iránytű-fok (azimut) és magasság fokban az adott órában. */
export function sunAt(hour: number) {
  const t = (hour - SUNRISE) / (SUNSET - SUNRISE);
  return {
    azimuth: 90 + 180 * t,
    elevation: 42 * Math.sin(Math.PI * t)
  };
}

/** Egy alaprajz-irányvektor (x, z) iránytű-foka a `facing` elforgatás után. */
export function compassOf(plan: Plan, x: number, z: number) {
  // A rajz +z iránya = `facing`. Az y körüli elforgatás szöge θ = 180° − facing.
  const theta = ((180 - plan.facing) * Math.PI) / 180;
  const wx = x * Math.cos(theta) + z * Math.sin(theta);
  const wz = -x * Math.sin(theta) + z * Math.cos(theta);
  // világ: északra −z, keletre +x
  return ((Math.atan2(wx, -wz) * 180) / Math.PI + 360) % 360;
}

/** A szoba üvegfelületeinek kifelé mutató irányai (iránytű-fok). */
export function windowDirections(plan: Plan, roomIndex: number) {
  const directions = new Set<number>();
  for (const run of wallRuns(plan)) {
    if (run.type === "parapet" || !isGlazed(plan, run)) continue;
    if (run.a !== roomIndex && run.b !== roomIndex) continue;
    // A szoba a `b` oldalon van → a kifelé mutató normál a negatív irány.
    const sign = run.b === roomIndex ? -1 : 1;
    const dir = run.axis === "x" ? compassOf(plan, 0, sign) : compassOf(plan, sign, 0);
    directions.add(Math.round(dir));
  }
  return [...directions];
}

const angleGap = (a: number, b: number) => {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
};

/** Besüt-e a nap az adott órában legalább az egyik ablakon. */
export function isSunlit(directions: number[], hour: number) {
  const sun = sunAt(hour);
  if (sun.elevation < 2) return false;
  return directions.some((direction) => angleGap(direction, sun.azimuth) < 70);
}

/** Percek, amíg napkeltétől `until` óráig besüt a nap. 5 perces lépésekben. */
export function sunMinutes(directions: number[], until = 24) {
  let minutes = 0;
  for (let hour = SUNRISE; hour < Math.min(until, SUNSET); hour += 5 / 60) {
    if (isSunlit(directions, hour)) minutes += 5;
  }
  return minutes;
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours} ó ${rest.toString().padStart(2, "0")} p` : `${rest} p`;
}

export function formatClock(hour: number) {
  const total = Math.round(hour * 60);
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}

/** A fő nappali (az első `living` szoba) indexe. */
export const livingIndex = (plan: Plan) => Math.max(0, plan.rooms.findIndex((room) => room.kind === "living"));

const COMPASS = ["É", "ÉK", "K", "DK", "D", "DNy", "Ny", "ÉNy"];
export const compassLabel = (degrees: number) => COMPASS[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
