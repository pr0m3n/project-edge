/**
 * A Budai Otthonok 3D makettje — kizárólag böngészőben, dinamikusan betöltve
 * (a `three` így csak ezen a demón töltődik le, és csak a hero után).
 *
 * Minden geometria az alaprajz-adatból (plan.ts) generálódik: nincs GLB, nincs
 * letöltendő modell. Egy új ingatlan felvétele = egy új `plan` objektum.
 *
 * Látvány: építészeti makett. Matt, papírfehér testek, vékony tusvonal az
 * éleken, a víz és az üveg az oldal jelzőkékjében. Ezért nem „rendernek",
 * hanem kézzel fogható modellnek hat.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { isGlazed, isOutdoor, planBounds, roomArea, sunAt, SUNRISE, SUNSET, wallRuns, type Plan, type Room } from "./plan";

/* ── segédek ─────────────────────────────────────────────────────────── */

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Iránytű-fok + magasság → világirány (északra −z, keletre +x). */
function sunVector(azimuth: number, elevation: number) {
  const az = (azimuth * Math.PI) / 180;
  const el = (elevation * Math.PI) / 180;
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
}

/** Az alaprajz +z tengelyét a `facing` iránytű-irányba forgató szög. */
const facingRotation = (plan: Plan) => ((180 - plan.facing) * Math.PI) / 180;

/* ── anyagok ─────────────────────────────────────────────────────────── */

export const INK = "#101214";
export const BLUE = "#2b44ff";
export const SUN = "#ffb547";

function createMaterials() {
  const standard = (color: string, roughness = 0.92) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
  return {
    maquette: standard("#f2f0ea"),
    floor: standard("#e2ded5", 0.96),
    wet: standard("#d3d8da", 0.8),
    deck: standard("#bfa98a"),
    lawn: standard("#a3b196", 1),
    furniture: standard("#d8d3c9"),
    soft: standard("#2a2d31", 0.85),
    base: standard("#17191c", 0.7),
    road: standard("#d8d6cf", 1),
    river: new THREE.MeshStandardMaterial({ color: BLUE, roughness: 0.3, metalness: 0.05 }),
    glass: new THREE.MeshStandardMaterial({
      color: BLUE,
      depthWrite: false,
      opacity: 0.22,
      roughness: 0.15,
      transparent: true
    }),
    line: new THREE.LineBasicMaterial({ color: INK, opacity: 0.26, transparent: true })
  };
}
type Materials = ReturnType<typeof createMaterials>;
type MaterialKey = Exclude<keyof Materials, "line">;

/* ── összevont geometria ─────────────────────────────────────────────── */

/**
 * Doboz-gyűjtő: az azonos anyagú elemeket egyetlen hálóba olvasztja. Egy
 * lakás ~150 kis dobozból áll; egyenként ennyi rajzolási hívás mobilon már
 * akadna, összevonva anyagonként egy.
 */
class Batch {
  private parts = new Map<string, THREE.BufferGeometry[]>();

  /** `y` a doboz ALJA, nem a közepe — a makettet alulról építjük. */
  box(key: MaterialKey, w: number, h: number, d: number, x: number, y: number, z: number) {
    if (w <= 0.001 || h <= 0.001 || d <= 0.001) return;
    const geometry = new THREE.BoxGeometry(w, h, d);
    geometry.translate(x, y + h / 2, z);
    this.add(key, geometry);
  }

  add(key: MaterialKey, geometry: THREE.BufferGeometry) {
    const list = this.parts.get(key) ?? [];
    list.push(geometry.index ? geometry.toNonIndexed() : geometry);
    this.parts.set(key, list);
  }

  build(materials: Materials, options: { edges?: MaterialKey[]; line?: THREE.LineBasicMaterial; override?: Partial<Record<MaterialKey, THREE.Material>> } = {}) {
    const group = new THREE.Group();
    for (const [key, list] of this.parts) {
      const merged = mergeGeometries(list, false);
      list.forEach((geometry) => geometry.dispose());
      if (!merged) continue;
      const materialKey = key as MaterialKey;
      const material = options.override?.[materialKey] ?? materials[materialKey];
      const mesh = new THREE.Mesh(merged, material);
      const transparent = material.transparent;
      mesh.castShadow = !transparent;
      mesh.receiveShadow = !transparent;
      mesh.name = key;
      if (options.edges?.includes(materialKey)) {
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(merged, 25), options.line ?? materials.line));
      }
      group.add(mesh);
    }
    this.parts.clear();
    return group;
  }
}

/* ── lakás-makett egy alaprajzból ────────────────────────────────────── */

const EXTERIOR = 0.3;
const INTERIOR = 0.14;

function furnish(batch: Batch, room: Room) {
  const cx = room.x + room.w / 2;
  const cz = room.z + room.d / 2;
  const top = room.z;

  switch (room.kind) {
    case "bed": {
      const bw = Math.min(1.8, room.w - 1.1);
      batch.box("furniture", bw, 0.45, 2, cx, 0, top + 0.35 + 1);
      batch.box("maquette", bw - 0.2, 0.14, 0.4, cx, 0.45, top + 0.6);
      batch.box("furniture", 0.45, 0.5, 0.4, cx - bw / 2 - 0.35, 0, top + 0.45);
      batch.box("furniture", 0.45, 0.5, 0.4, cx + bw / 2 + 0.35, 0, top + 0.45);
      break;
    }
    case "living": {
      const sx = room.x + Math.min(room.w * 0.36, 3.6);
      const sz = room.z + room.d * 0.58;
      batch.box("soft", 2.8, 0.42, 0.95, sx, 0, sz);
      batch.box("soft", 2.8, 0.82, 0.24, sx, 0, sz - 0.36);
      batch.box("soft", 0.95, 0.42, 1.6, sx - 1.9 + 0.475, 0, sz + 1.25);
      batch.box("furniture", 1.2, 0.36, 0.7, sx + 0.2, 0, sz + 1.3);
      if (room.w >= 7) {
        const tx = room.x + room.w * 0.74;
        const tz = room.z + room.d * 0.42;
        batch.box("furniture", 2.2, 0.75, 1, tx, 0, tz);
        for (const dx of [-0.7, 0, 0.7]) {
          batch.box("furniture", 0.44, 0.46, 0.44, tx + dx, 0, tz - 0.8);
          batch.box("furniture", 0.44, 0.46, 0.44, tx + dx, 0, tz + 0.8);
        }
      }
      if (room.withKitchen) {
        const cw = Math.min(4.2, room.w * 0.42);
        batch.box("furniture", cw, 0.9, 0.65, room.x + room.w - 0.35 - cw / 2, 0, top + 0.5);
      }
      break;
    }
    case "kitchen": {
      batch.box("furniture", room.w - 0.8, 0.9, 0.65, cx, 0, top + 0.5);
      if (room.d > 4.5) batch.box("furniture", Math.min(2.4, room.w - 2.4), 0.9, 0.95, cx, 0, top + 2.2);
      if (room.d > 5.5) {
        batch.box("furniture", 2, 0.75, 1, cx, 0, room.z + room.d - 1.8);
        for (const dx of [-0.6, 0.6]) {
          batch.box("furniture", 0.44, 0.46, 0.44, cx + dx, 0, room.z + room.d - 2.6);
          batch.box("furniture", 0.44, 0.46, 0.44, cx + dx, 0, room.z + room.d - 1);
        }
      }
      break;
    }
    case "bath":
      batch.box("maquette", 1.7, 0.55, 0.78, room.x + 0.25 + 0.85, 0, top + 0.25 + 0.39);
      batch.box("furniture", 0.9, 0.85, 0.5, room.x + room.w - 0.8, 0, room.z + room.d - 0.45);
      break;
    case "study":
      batch.box("furniture", 1.5, 0.75, 0.7, cx, 0, top + 0.6);
      batch.box("soft", 0.5, 0.46, 0.5, cx, 0, top + 1.35);
      batch.box("furniture", 0.35, 1.9, Math.min(2.6, room.d - 1), room.x + 0.35, 0, cz);
      break;
    case "terrace": {
      const lx = room.x + room.w - 3.2;
      batch.box("furniture", 0.7, 0.34, 1.9, lx, 0, cz);
      batch.box("furniture", 0.7, 0.34, 1.9, lx + 1.1, 0, cz);
      batch.box("maquette", 1.4, 0.55, 0.55, room.x + 0.9, 0, room.z + room.d - 0.5);
      batch.box("furniture", 1.2, 0.72, 0.8, room.x + room.w * 0.35, 0, cz);
      break;
    }
    case "garden":
      batch.box("deck", room.w, 0.1, Math.min(2.2, room.d - 1), cx, 0, top + Math.min(2.2, room.d - 1) / 2);
      batch.box("furniture", 1.6, 0.72, 0.9, room.x + 1.6, 0.1, top + 1.1);
      break;
  }
}

/** Makett-fa: vékony törzs, facettás korona — a klasszikus építészmakett-fa. */
function addTree(batch: Batch, x: number, y: number, z: number, scale = 1) {
  batch.box("maquette", 0.14 * scale, 1.1 * scale, 0.14 * scale, x, y, z);
  const crown = new THREE.IcosahedronGeometry(0.85 * scale, 0);
  crown.translate(x, y + 1.6 * scale, z);
  batch.add("maquette", crown);
}

type LabelAnchor = { id: string; text: string; sub?: string; object: THREE.Object3D; accent?: boolean };

/**
 * Egy lakás makettje. A csoport origója az alaprajz közepe, a padló a y = 0
 * síkon. A falak külön csoportban vannak, hogy „metszeni" lehessen őket
 * (y irányú skálázás) — így lehet a szobákba belátni.
 */
function buildApartment(plan: Plan, materials: Materials, wallHeight: number) {
  const { w, d } = planBounds(plan);
  const floors = new Batch();
  const walls = new Batch();
  const furniture = new Batch();
  const labels: LabelAnchor[] = [];
  const group = new THREE.Group();

  plan.rooms.forEach((room, index) => {
    const key: MaterialKey = room.kind === "bath" ? "wet" : room.kind === "terrace" ? "deck" : room.kind === "garden" ? "lawn" : "floor";
    floors.box(key, room.w, 0.08, room.d, room.x + room.w / 2, -0.08, room.z + room.d / 2);
    furnish(furniture, room);
    if (room.kind === "garden") {
      addTree(furniture, room.x + room.w - 1.2, 0, room.z + room.d - 1.1, 1.2);
      addTree(furniture, room.x + room.w - 3.4, 0, room.z + room.d - 0.9, 0.9);
    }
    const anchor = new THREE.Object3D();
    anchor.position.set(room.x + room.w / 2, 0.3, room.z + room.d / 2);
    group.add(anchor);
    labels.push({ id: `room-${index}`, object: anchor, text: room.name, sub: `${roomArea(room).toLocaleString("hu-HU")} m²` });
  });

  const piece = (key: MaterialKey, axis: "x" | "z", at: number, from: number, to: number, thickness: number, height: number, y = 0) => {
    const length = to - from;
    if (axis === "x") walls.box(key, length, height, thickness, from + length / 2, y, at);
    else walls.box(key, thickness, height, length, at, y, from + length / 2);
  };

  for (const run of wallRuns(plan)) {
    const { axis, at } = run;
    const length = run.to - run.from;

    if (run.type === "interior") {
      // Középen ajtónyílás, ha elfér — enélkül zárt dobozok sora lenne a lakás.
      if (length >= 2.2) {
        const mid = run.from + length / 2;
        piece("maquette", axis, at, run.from - INTERIOR / 2, mid - 0.45, INTERIOR, wallHeight);
        piece("maquette", axis, at, mid + 0.45, run.to + INTERIOR / 2, INTERIOR, wallHeight);
      } else {
        piece("maquette", axis, at, run.from - INTERIOR / 2, run.to + INTERIOR / 2, INTERIOR, wallHeight);
      }
      continue;
    }

    if (run.type === "parapet") {
      piece("glass", axis, at, run.from, run.to, 0.05, 1);
      piece("maquette", axis, at, run.from, run.to, 0.08, 0.06, 1);
      continue;
    }

    if (!isGlazed(plan, run)) {
      piece("maquette", axis, at, run.from - EXTERIOR / 2, run.to + EXTERIOR / 2, EXTERIOR, wallHeight);
      continue;
    }

    // Üvegfal: tömör végek, közte padlótól mennyezetig üveg, osztóbordákkal.
    const stub = run.type === "opening" ? 0.25 : 0.45;
    piece("maquette", axis, at, run.from - EXTERIOR / 2, run.from + stub, EXTERIOR, wallHeight);
    piece("maquette", axis, at, run.to - stub, run.to + EXTERIOR / 2, EXTERIOR, wallHeight);
    piece("glass", axis, at, run.from + stub, run.to - stub, 0.06, wallHeight);
    const span = length - stub * 2;
    const bays = Math.max(1, Math.round(span / 1.6));
    for (let bay = 1; bay < bays; bay++) {
      const pos = run.from + stub + (span / bays) * bay;
      piece("maquette", axis, at, pos - 0.04, pos + 0.04, 0.12, wallHeight);
    }
  }

  const floorGroup = floors.build(materials);
  const furnitureGroup = furniture.build(materials, { edges: ["maquette", "furniture"] });
  const wallGroup = walls.build(materials, { edges: ["maquette"] });
  group.add(floorGroup, furnitureGroup, wallGroup);

  // Középre igazítás: a gyerekek eltolva, így a csoport a saját közepe körül forog.
  for (const child of group.children) child.position.x -= w / 2;
  for (const child of group.children) child.position.z -= d / 2;

  return { group, walls: wallGroup, labels, size: { w, d } };
}

/* ── napút-ív ────────────────────────────────────────────────────────── */

/** Heliodon-szerű napút: ív a makett fölött, óránkénti jelekkel és a nappal. */
function buildSunPath(radius: number) {
  const group = new THREE.Group();
  const points: THREE.Vector3[] = [];
  for (let hour = SUNRISE; hour <= SUNSET + 0.001; hour += 0.1) {
    const sun = sunAt(hour);
    points.push(sunVector(sun.azimuth, Math.max(0, sun.elevation)).multiplyScalar(radius));
  }
  const arcMaterial = new THREE.LineBasicMaterial({ color: SUN, transparent: true, opacity: 0.9 });
  const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), arcMaterial);
  group.add(arc);

  const tickMaterial = new THREE.MeshBasicMaterial({ color: SUN, transparent: true, opacity: 0.9 });
  const tickGeometry = new THREE.SphereGeometry(radius * 0.012, 8, 6);
  for (let hour = 7; hour <= 18; hour++) {
    const sun = sunAt(hour);
    const tick = new THREE.Mesh(tickGeometry, tickMaterial);
    tick.position.copy(sunVector(sun.azimuth, Math.max(0, sun.elevation)).multiplyScalar(radius));
    group.add(tick);
  }

  const sunMaterial = new THREE.MeshBasicMaterial({ color: SUN, transparent: true });
  const disc = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.028, 20, 14), sunMaterial);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.06, 20, 14),
    new THREE.MeshBasicMaterial({ color: SUN, transparent: true, opacity: 0.22, depthWrite: false })
  );
  disc.add(halo);
  group.add(disc);

  const setOpacity = (value: number) => {
    arcMaterial.opacity = 0.9 * value;
    tickMaterial.opacity = 0.9 * value;
    sunMaterial.opacity = value;
    (halo.material as THREE.MeshBasicMaterial).opacity = 0.22 * value;
    group.visible = value > 0.01;
  };

  const setHour = (hour: number) => {
    const sun = sunAt(hour);
    disc.position.copy(sunVector(sun.azimuth, Math.max(-2, sun.elevation)).multiplyScalar(radius));
    disc.visible = sun.elevation > -1;
  };

  return { group, setOpacity, setHour };
}

/* ── közös renderer + fények ─────────────────────────────────────────── */

const DAY = new THREE.Color("#dddcd6");
const DUSK = new THREE.Color("#1d2430");
const WARM = new THREE.Color("#ffb46a");
const NOON = new THREE.Color("#fff4e2");

function createStage(canvas: HTMLCanvasElement, shadowSize: number) {
  const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, canvas, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const background = DAY.clone();
  scene.background = background;
  scene.fog = new THREE.Fog(background, 90, 190);

  // A kamera sosincs 20 m-nél közelebb, ezért a közeli sík 2 m: a mélységpuffer
  // pontossága a közeli síktól függ, 0,5 m-nél a távoli részeken már kevés.
  const camera = new THREE.PerspectiveCamera(32, 1, 2, 320);
  const hemi = new THREE.HemisphereLight("#ffffff", "#aaa597", 1.05);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight("#fff4e2", 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  /** Napállás beállítása: fényirány, szín, erő és az égbolt/háttér. */
  const applyHour = (hour: number, focus: THREE.Vector3, reach: number) => {
    const state = sunAt(hour);
    const direction = sunVector(state.azimuth, Math.max(state.elevation, 1));
    sun.position.copy(focus).addScaledVector(direction, reach * 2);
    sun.target.position.copy(focus);
    const daylight = smooth(-1, 7, state.elevation);
    sun.intensity = 2.7 * daylight;
    sun.color.copy(NOON).lerp(WARM, 1 - smooth(4, 22, state.elevation));
    hemi.intensity = 0.35 + 0.75 * smooth(-3, 12, state.elevation);
    const dusk = smooth(17.9, 19.3, hour);
    background.copy(DAY).lerp(DUSK, dusk);
    (scene.fog as THREE.Fog).color.copy(background);
    return { dusk, daylight };
  };

  const fitShadow = (radius: number) => {
    const shadowCamera = sun.shadow.camera;
    shadowCamera.left = -radius;
    shadowCamera.right = radius;
    shadowCamera.top = radius;
    shadowCamera.bottom = -radius;
    shadowCamera.near = 1;
    shadowCamera.far = radius * 6;
    shadowCamera.updateProjectionMatrix();
  };

  const resize = (width: number, height: number) => {
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  };

  const dispose = () => {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material?.dispose();
    });
    renderer.dispose();
  };

  return { applyHour, camera, dispose, fitShadow, renderer, resize, scene };
}

/** Kamera gömbi koordinátákból: az = 0 → a néző délről (a +z felől) néz. */
function placeCamera(camera: THREE.PerspectiveCamera, target: THREE.Vector3, azimuth: number, elevation: number, distance: number) {
  const az = (azimuth * Math.PI) / 180;
  const el = (elevation * Math.PI) / 180;
  camera.position.set(
    target.x + Math.sin(az) * Math.cos(el) * distance,
    target.y + Math.sin(el) * distance,
    target.z + Math.cos(az) * Math.cos(el) * distance
  );
  camera.lookAt(target);
}

export type ProjectedLabel = { id: string; x: number; y: number; opacity: number };

function projector(camera: THREE.PerspectiveCamera, anchors: LabelAnchor[]) {
  const vector = new THREE.Vector3();
  return (width: number, height: number, opacityOf: (anchor: LabelAnchor) => number): ProjectedLabel[] =>
    anchors.map((anchor) => {
      anchor.object.getWorldPosition(vector);
      vector.project(camera);
      const behind = vector.z > 1;
      return {
        id: anchor.id,
        x: (vector.x * 0.5 + 0.5) * width,
        y: (-vector.y * 0.5 + 0.5) * height,
        opacity: behind ? 0 : opacityOf(anchor)
      };
    });
}

/* ── HERO: az egész ház, szétszedve ──────────────────────────────────── */

const FLOOR_HEIGHT = 3.4;
const LOWER_LEVELS = 5;

export type HeroLabel = { id: string; text: string; sub?: string; accent?: boolean };

export function createHeroScene(canvas: HTMLCanvasElement, plan: Plan) {
  const stage = createStage(canvas, 2048);
  const { scene, camera } = stage;
  const materials = createMaterials();

  // A „többi szint" saját anyagpéldányokat kap, hogy a fókusznál elhalványíthassuk.
  const fadeMaquette = materials.maquette.clone();
  const fadeLine = materials.line.clone();
  const windowGlass = new THREE.MeshStandardMaterial({ color: "#26303b", emissive: "#ffb35c", emissiveIntensity: 0, roughness: 0.35 });
  const roofMaterial = materials.maquette.clone();
  const roofLine = materials.line.clone();

  const { w: W } = planBounds(plan);
  const indoorDepth = Math.max(...plan.rooms.filter((room) => !isOutdoor(room.kind)).map((room) => room.z + room.d));
  const { d: D } = planBounds(plan);

  /* A ház a saját alaprajz-koordinátáiban épül, a végén elforgatva. */
  const building = new THREE.Group();
  building.rotation.y = facingRotation(plan);
  scene.add(building);

  const levels: THREE.Group[] = [];
  const labels: LabelAnchor[] = [];
  const elevationLabel = (level: number) => (level === 0 ? "±0,00" : `+${(level * FLOOR_HEIGHT).toFixed(2).replace(".", ",")}`);

  for (let level = 0; level < LOWER_LEVELS; level++) {
    const batch = new Batch();
    const inner = FLOOR_HEIGHT - 0.3;
    batch.box("maquette", W, 0.3, indoorDepth, 0, 0, 0);
    // hátsó (lépcsőházi) tömör fal és a két oldal tömör sávja
    batch.box("maquette", W, inner, 0.3, 0, 0.3, -indoorDepth / 2 + 0.15);
    batch.box("maquette", 0.3, inner, indoorDepth, W / 2 - 0.15, 0.3, 0);
    // függőleges bordák a folyó és a déli homlokzat előtt
    for (let x = -W / 2 + 0.75; x < W / 2 - 0.5; x += 1.5) batch.box("maquette", 0.14, inner, 0.45, x, 0.3, indoorDepth / 2 + 0.2);
    for (let z = -indoorDepth / 2 + 1.2; z < indoorDepth / 2; z += 1.5) batch.box("maquette", 0.45, inner, 0.14, -W / 2 - 0.2, 0.3, z);
    if (level > 0) {
      batch.box("maquette", W, 0.2, 1.8, 0, 0, indoorDepth / 2 + 0.9);
      batch.box("glass", W, 1, 0.05, 0, 0.2, indoorDepth / 2 + 1.78);
    } else {
      // földszint: bejárati előtető
      batch.box("maquette", 5, 0.2, 2.2, W / 4, 2.8, indoorDepth / 2 + 1.1);
    }
    const group = batch.build(materials, { edges: ["maquette"], line: fadeLine, override: { maquette: fadeMaquette } });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(W - 0.8, inner, indoorDepth - 0.8), windowGlass);
    glass.position.set(0, 0.3 + inner / 2, 0);
    glass.receiveShadow = true;
    group.add(glass);

    const anchor = new THREE.Object3D();
    // Az északi, folyó felőli sarok: a kamera keletről néz, így ez a kép
    // jobb széle — a felirat a szabad térbe lóg ki, nem a homlokzatra.
    anchor.position.set(W / 2 + 0.3, 0.15, indoorDepth / 2 + 1.9);
    group.add(anchor);
    labels.push({ id: `level-${level}`, object: anchor, text: elevationLabel(level), sub: level === 0 ? "Földszint · lobby" : `${level}. emelet` });

    group.position.set(0, level * FLOOR_HEIGHT, 0);
    // középre: az alaprajz (0..W, 0..D) közepe legyen az origó
    group.position.x = 0;
    group.position.z = -(D - indoorDepth) / 2;
    building.add(group);
    levels.push(group);
  }

  /* Penthouse: födém + a valódi alaprajz + leemelhető tető */
  const penthouse = new THREE.Group();
  const slab = new Batch();
  slab.box("maquette", W + 0.3, 0.35, D + 0.3, 0, 0, 0);
  penthouse.add(slab.build(materials, { edges: ["maquette"] }));
  const apartment = buildApartment(plan, materials, 2.9);
  // A lakás padlója 5 cm-rel a födém FÖLÖTT: ha a kettő teteje egy síkba
  // esik, a két felület felváltva nyer a mélységtesztben, és a terasz meg a
  // nappali padlója lépcsős csíkokban villódzik, amint mozog a kamera.
  apartment.group.position.y = 0.4;
  penthouse.add(apartment.group);

  const roofBatch = new Batch();
  const roofZ = -(D - indoorDepth) / 2;
  roofBatch.box("maquette", W + 0.4, 0.35, indoorDepth + 0.4, 0, 0, roofZ);
  roofBatch.box("maquette", 3.2, 1.3, 3, W / 2 - 2.4, 0.35, roofZ - indoorDepth / 2 + 1.8);
  // a pergola a terasz fölé nyúlik (a terasz közepe a központosított koordinátákban indoorDepth/2)
  for (let x = -W / 2 + 0.4; x < W / 2 - 2.4; x += 0.9) roofBatch.box("maquette", 0.12, 0.18, D - indoorDepth, x, 0.1, indoorDepth / 2);
  const roof = roofBatch.build(materials, { edges: ["maquette"], line: roofLine, override: { maquette: roofMaterial } });
  roof.position.y = 0.4 + 2.9;
  penthouse.add(roof);

  const penthouseAnchor = new THREE.Object3D();
  penthouseAnchor.position.set(W / 2 + 0.3, 0.2, D / 2);
  penthouse.add(penthouseAnchor);
  labels.push({ id: "level-ph", object: penthouseAnchor, text: elevationLabel(LOWER_LEVELS), sub: "Penthouse · 148 m² · eladó", accent: true });
  labels.push(...apartment.labels);

  // Esti fény a lakásban: napnyugta után „felkapcsolnak" bent.
  const lamp = new THREE.PointLight("#ffb46a", 0, 26, 1.4);
  lamp.position.set(-W / 6, 2.4, -D / 6);
  penthouse.add(lamp);

  penthouse.position.y = LOWER_LEVELS * FLOOR_HEIGHT;
  building.add(penthouse);

  /* Környezet: makett-talapzat, rakpart, Duna, domboldal, szomszéd tömbök */
  const context = new Batch();
  context.box("base", 78, 1.4, 62, 0, -1.4, 0);
  context.box("river", 16, 0.12, 62, 25, 0, 0);
  context.box("road", 6, 0.06, 62, 14, 0, 0);
  context.box("maquette", 22, 1.6, 62, -20, 0, 0);
  context.box("maquette", 15, 1.6, 62, -23.5, 1.6, 0);
  context.box("maquette", 8, 1.6, 62, -27, 3.2, 0);
  context.box("maquette", 10, 13, 9, -1, 0, -20);
  context.box("maquette", 9, 9.5, 8, 0, 0, 20);
  context.box("maquette", 8, 7, 10, -20, 1.6, -18);
  context.box("maquette", 7, 5, 8, -24, 3.2, 12);
  context.box("maquette", 6, 3, 14, -1, 0, 32);
  for (let z = -28; z <= 28; z += 4.5) addTree(context, 11.4, 0, z, 1.05);
  for (let z = -26; z <= 26; z += 7) addTree(context, -15, 1.6, z + 2, 1.3);
  const contextGroup = context.build(materials, { edges: ["maquette"] });
  scene.add(contextGroup);

  /* Napút a penthouse fölött */
  const sunPath = buildSunPath(15);
  scene.add(sunPath.group);

  const target = new THREE.Vector3();
  const overview = new THREE.Vector3(0, 10, 0);
  const focusPoint = new THREE.Vector3();
  const project = projector(camera, labels);
  let narrow = false;

  // Kamera-kulcskockák: [haladás, azimut, magasság, távolság]
  const keys: [number, number, number, number][] = [
    [0, 52, 19, 66],
    [0.3, 78, 14, 78],
    [0.56, 68, 56, 34],
    [0.8, 36, 62, 33],
    [1, 18, 50, 40]
  ];

  let state = { progress: 0, hour: 10.5 };

  const setProgress = (progress: number, drift = 0) => {
    const explode = smooth(0.08, 0.32, progress);
    const focus = smooth(0.36, 0.56, progress);
    const roofLift = smooth(0.38, 0.52, progress);
    const cut = smooth(0.46, 0.6, progress);
    const hour = progress < 0.62 ? 10.5 : mix(10.5, 19.6, smooth(0.62, 0.97, progress));

    levels.forEach((group, level) => (group.position.y = level * FLOOR_HEIGHT + level * 2.4 * explode));
    penthouse.position.y = LOWER_LEVELS * FLOOR_HEIGHT + LOWER_LEVELS * 2.4 * explode + 1.2 * explode;

    // A többi szint elhalványul; átlátszóan nem írnak mélységet, különben a
    // saját bordáik egymást takarják ki csíkosan.
    const fade = 1 - 0.9 * focus;
    for (const material of [fadeMaquette, windowGlass]) {
      material.opacity = fade;
      const transparent = fade < 0.999;
      if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.depthWrite = !transparent;
        material.needsUpdate = true;
      }
    }
    fadeLine.opacity = 0.26 * fade;
    for (const group of levels) group.visible = fade > 0.02;

    roof.position.y = 0.4 + 2.9 + roofLift * 9;
    roofMaterial.opacity = 1 - roofLift;
    if (roofMaterial.transparent !== roofLift > 0.001) {
      roofMaterial.transparent = roofLift > 0.001;
      roofMaterial.needsUpdate = true;
    }
    roofLine.opacity = 0.26 * (1 - roofLift);
    roof.visible = roofLift < 0.995;
    apartment.walls.scale.y = 1 - 0.55 * cut;

    windowGlass.emissiveIntensity = 1.8 * smooth(18.4, 19.4, hour);
    lamp.intensity = 60 * smooth(18.3, 19.3, hour);

    // kamera
    let index = 0;
    while (index < keys.length - 2 && progress > keys[index + 1][0]) index++;
    const [p0, a0, e0, d0] = keys[index];
    const [p1, a1, e1, d1] = keys[index + 1];
    const t = smooth(p0, p1, progress);
    const azimuth = mix(a0, a1, t) + drift;
    const elevation = mix(e0, e1, t);
    const distance = mix(d0, d1, t) * (narrow ? 1.95 : 1);

    penthouse.getWorldPosition(focusPoint);
    focusPoint.y += 1.4;
    target.set(0, mix(9 + 4 * explode, focusPoint.y, focus), 0);
    placeCamera(camera, target, azimuth, elevation, distance);

    const sunReach = 40;
    const light = stage.applyHour(hour, focus > 0.5 ? focusPoint : overview, sunReach);
    stage.fitShadow(focus > 0.5 ? 16 : 40);

    sunPath.group.position.copy(focusPoint);
    sunPath.setHour(hour);
    sunPath.setOpacity(smooth(0.6, 0.68, progress));

    state = { progress, hour };
    return { hour, dusk: light.dusk };
  };

  const labelOpacity = (anchor: LabelAnchor) => {
    const { progress } = state;
    if (anchor.id.startsWith("level")) return smooth(0.16, 0.24, progress) * (1 - smooth(0.36, 0.44, progress));
    return smooth(0.55, 0.62, progress) * (1 - smooth(0.9, 0.97, progress));
  };

  return {
    labels: labels.map(({ id, text, sub, accent }) => ({ id, text, sub, accent })) as HeroLabel[],
    setProgress,
    resize(width: number, height: number) {
      narrow = width / Math.max(1, height) < 0.85;
      stage.resize(width, height);
      // A makett ne a szöveg alatt álljon: asztalin jobbra, telefonon felfelé
      // toljuk a képet (a vetítés eltolásával, így a kamera útja nem változik).
      if (narrow) camera.setViewOffset(width, height, 0, height * 0.16, width, height);
      else camera.setViewOffset(width, height, -width * 0.11, 0, width, height);
    },
    render() {
      stage.renderer.render(scene, camera);
    },
    project(width: number, height: number) {
      return project(width, height, labelOpacity);
    },
    dispose: stage.dispose
  };
}

/* ── ADATLAP: egy lakás, forgatható, napállással ─────────────────────── */

export function createPlanViewer(canvas: HTMLCanvasElement, plan: Plan) {
  const stage = createStage(canvas, 1536);
  const { scene, camera } = stage;
  const materials = createMaterials();
  const { w, d } = planBounds(plan);
  const radius = Math.max(w, d);

  const apartment = buildApartment(plan, materials, 2.7);
  apartment.walls.scale.y = 0.5;

  const pivot = new THREE.Group();
  pivot.rotation.y = facingRotation(plan);
  pivot.add(apartment.group);
  scene.add(pivot);

  // A talapzat a lakás körvonalát követi (a tájolás szerint elforgatva), nem
  // egy nagy fekete négyzet — így a makett tölti ki a képet.
  const base = new Batch();
  base.box("base", w + 3, 0.5, d + 3, 0, -0.58, 0);
  const baseGroup = base.build(materials);
  baseGroup.rotation.y = facingRotation(plan);
  scene.add(baseGroup);
  // A talapzat északi széle a világ −z irányában, az elforgatás után.
  const theta = facingRotation(plan);
  const northEdge = (Math.abs(Math.cos(theta)) * (d + 3) + Math.abs(Math.sin(theta)) * (w + 3)) / 2;

  // Északi nyíl a talapzat szélén
  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, -0.9);
  arrowShape.lineTo(0.5, 0.6);
  arrowShape.lineTo(0, 0.25);
  arrowShape.lineTo(-0.5, 0.6);
  arrowShape.closePath();
  const arrow = new THREE.Mesh(new THREE.ShapeGeometry(arrowShape), new THREE.MeshBasicMaterial({ color: "#f2f0ea" }));
  arrow.rotation.x = -Math.PI / 2;
  arrow.position.set(0, -0.07, -northEdge + 0.9);
  scene.add(arrow);
  const northAnchor = new THREE.Object3D();
  northAnchor.position.set(0, -0.07, -northEdge - 0.6);
  scene.add(northAnchor);

  const sunPath = buildSunPath(radius * 0.72);
  sunPath.setOpacity(1);
  scene.add(sunPath.group);

  const anchors: LabelAnchor[] = [...apartment.labels, { id: "north", text: "É", object: northAnchor }];
  const project = projector(camera, anchors);
  const origin = new THREE.Vector3(0, 0, 0);
  let view = { azimuth: 35, elevation: 52 };
  let narrow = false;

  const place = () => placeCamera(camera, new THREE.Vector3(0, 0.5, 0), view.azimuth, view.elevation, radius * (narrow ? 2.7 : 1.65));

  return {
    labels: anchors.map(({ id, text, sub }) => ({ id, text, sub })) as HeroLabel[],
    setHour(hour: number) {
      stage.applyHour(hour, origin, radius * 2);
      stage.fitShadow(radius * 0.9);
      sunPath.setHour(hour);
    },
    setView(azimuth: number, elevation: number) {
      view = { azimuth, elevation: Math.min(80, Math.max(20, elevation)) };
      place();
    },
    get view() {
      return view;
    },
    resize(width: number, height: number) {
      narrow = width / Math.max(1, height) < 1;
      stage.resize(width, height);
      place();
    },
    render() {
      stage.renderer.render(scene, camera);
    },
    project(width: number, height: number) {
      return project(width, height, () => 1);
    },
    dispose: stage.dispose
  };
}

