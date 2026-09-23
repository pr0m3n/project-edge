/**
 * A Veyra hete 3D-ben — böngészőben, dinamikusan betöltve.
 *
 * Egy asztali tervezőtábla (napok × órák), amire görgetésre beesnek a
 * foglalások lekerekített zsetonokként. Utána végigfut rajtuk az emlékeztetők
 * hulláma, egy csütörtöki időpontot lemondanak (felemelkedik és eltűnik), a
 * helyére pedig oldalról becsúszik a várólistás vendég.
 */

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { BOOKINGS, CANCELLED, CLOSE, DAYS, OPEN, WAITLIST, type Booking } from "./week";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function bounce(t: number) {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

const COL = 1.7;
const ROW = 0.62;
const HOURS = 10;
const BOARD_W = DAYS.length * COL + 0.6;
const BOARD_D = HOURS * ROW + 1.1;
const TOP = 0.3;
const TONES = { blue: "#9fc9ff", coral: "#ff6b52", lime: "#c9f24b" };

const xOf = (day: number) => -BOARD_W / 2 + 0.3 + COL * (day + 0.5);
const zOf = (hour: number) => -BOARD_D / 2 + 0.8 + (hour - OPEN) * ROW;

export type Anchor = { id: string; x: number; y: number };

export function createWeekScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 90);
  scene.add(new THREE.HemisphereLight("#ffffff", "#d8d2c4", 1.3));
  const key = new THREE.DirectionalLight("#fffaf0", 2.1);
  key.position.set(-5, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { bottom: -9, left: -9, right: 9, top: 9 });
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  /* tábla */
  const board = new THREE.Mesh(
    new RoundedBoxGeometry(BOARD_W, TOP, BOARD_D, 4, 0.12),
    new THREE.MeshStandardMaterial({ color: "#fffdf7", roughness: 0.9 })
  );
  board.position.y = TOP / 2;
  board.receiveShadow = true;
  board.castShadow = true;
  scene.add(board);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // rácsvonalak: óránként és naponként
  const lineMaterial = new THREE.MeshBasicMaterial({ color: "#d9d4c8" });
  const lines = new THREE.Group();
  for (let hour = 0; hour <= HOURS; hour++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(BOARD_W - 0.6, 0.004, hour % 3 === 0 ? 0.03 : 0.015), lineMaterial);
    line.position.set(0, TOP + 0.002, zOf(OPEN + hour));
    lines.add(line);
  }
  for (let day = 0; day <= DAYS.length; day++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.004, HOURS * ROW), lineMaterial);
    line.position.set(-BOARD_W / 2 + 0.3 + COL * day, TOP + 0.002, zOf(OPEN) + (HOURS * ROW) / 2);
    lines.add(line);
  }
  // zárva: szombat délután, ebédszünetek
  const closedMaterial = new THREE.MeshBasicMaterial({ color: "#efebe2" });
  const closed = new THREE.Mesh(new THREE.BoxGeometry(COL - 0.1, 0.003, (OPEN + HOURS - CLOSE[5]) * ROW), closedMaterial);
  closed.position.set(xOf(5), TOP + 0.001, zOf(CLOSE[5]) + ((OPEN + HOURS - CLOSE[5]) * ROW) / 2);
  lines.add(closed);
  for (let day = 0; day < 5; day++) {
    const lunch = new THREE.Mesh(new THREE.BoxGeometry(COL - 0.1, 0.003, 0.5 * ROW), closedMaterial);
    lunch.position.set(xOf(day), TOP + 0.001, zOf(13.25));
    lines.add(lunch);
  }
  scene.add(lines);

  /* foglalás-zsetonok: egy instancolt háló, egyszínű egységkockákból skálázva */
  const tiles: Booking[] = [...BOOKINGS, WAITLIST];
  const geometry = new RoundedBoxGeometry(1, 1, 1, 3, 0.14);
  const material = new THREE.MeshStandardMaterial({ roughness: 0.55 });
  const mesh = new THREE.InstancedMesh(geometry, material, tiles.length);
  mesh.castShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  const white = new THREE.Color("#ffffff");
  const grey = new THREE.Color("#b8b4aa");

  /* HTML-horgonyok: napok fejléce, órák, és a lemondás helye */
  const anchors: { id: string; point: THREE.Vector3 }[] = [
    ...DAYS.map((_, day) => ({ id: `day-${day}`, point: new THREE.Vector3(xOf(day), TOP, -BOARD_D / 2 + 0.3) })),
    ...[9, 12, 15, 18].map((hour) => ({ id: `hour-${hour}`, point: new THREE.Vector3(-BOARD_W / 2 + 0.05, TOP, zOf(hour)) })),
    { id: "cancel", point: new THREE.Vector3(xOf(CANCELLED.day) + COL / 2, TOP + 0.3, zOf(CANCELLED.start + CANCELLED.service.hours / 2)) }
  ];
  const projected = new THREE.Vector3();
  const target = new THREE.Vector3();
  let narrow = false;

  const update = (progress: number, seconds: number) => {
    const reminder = smooth(0.46, 0.62, progress);
    tiles.forEach((booking, index) => {
      const width = COL - 0.22;
      const depth = booking.service.hours * ROW - 0.08;
      const height = 0.2;
      let x = xOf(booking.day);
      const z = zOf(booking.start) + (booking.service.hours * ROW) / 2;
      let y = TOP + height / 2 + 0.005;
      let size = 1;
      euler.set(0, 0, 0);
      color.set(TONES[booking.service.tone]);

      if (booking === WAITLIST) {
        // oldalról csúszik be a lemondott helyre
        const slide = smooth(WAITLIST.arrive, WAITLIST.arrive + 0.05, progress);
        x = mix(BOARD_W / 2 + 2.6, xOf(booking.day), slide);
        y += 0.5 * Math.sin(Math.PI * slide);
        size = progress < WAITLIST.arrive - 0.03 ? 0 : 1;
        euler.set(0, (1 - slide) * 0.5, 0);
      } else {
        const drop = clamp01((progress - booking.arrive) / 0.035);
        y += (1 - bounce(drop)) * 5;
        size = drop > 0 ? 1 : 0;
        if (booking === CANCELLED) {
          const lift = smooth(0.63, 0.68, progress);
          y += lift * 3.2;
          euler.set(lift * 0.6, lift * 1.2, lift * 0.3);
          color.lerp(grey, smooth(0.62, 0.64, progress));
          size *= 1 - smooth(0.66, 0.69, progress);
        }
      }

      // emlékeztető-hullám: naponként végigfut, felvillantja a zsetonokat
      const wave = Math.exp(-(((reminder * 7.5 - booking.day - 0.5) / 0.55) ** 2));
      if (booking !== WAITLIST) {
        color.lerp(white, 0.55 * wave);
        y += 0.18 * wave;
      }

      position.set(x, y, z);
      quaternion.setFromEuler(euler);
      scale.set(width * size, height * size, depth * size);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // Álló kijelzőn 90°-kal elforgatva nézünk rá: így a tábla hosszabb oldala
    // (a hat nap) függőlegesen fut, és a keskeny képernyőre is kifér.
    const azimuth = (((narrow ? 90 : 0) + mix(-24, 14, progress) * (narrow ? 0.4 : 1) + Math.sin(seconds * 0.13) * 1.5) * Math.PI) / 180;
    const elevation = (mix(58, 44, smooth(0, 0.5, progress)) * Math.PI) / 180;
    const distance = narrow ? 30 : 19.5;
    target.set(0, 0, 0.3);
    camera.position.set(
      Math.sin(azimuth) * Math.cos(elevation) * distance,
      Math.sin(elevation) * distance,
      Math.cos(azimuth) * Math.cos(elevation) * distance
    );
    camera.lookAt(target);
  };

  return {
    update,
    project(width: number, height: number): Anchor[] {
      return anchors.map(({ id, point }) => {
        projected.copy(point).project(camera);
        return { id, x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height };
      });
    },
    resize(width: number, height: number) {
      narrow = width / Math.max(1, height) < 0.85;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      if (narrow) camera.setViewOffset(width, height, 0, height * 0.1, width, height);
      else camera.setViewOffset(width, height, -width * 0.22, 0, width, height);
    },
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      scene.traverse((object) => {
        const item = object as THREE.Mesh;
        item.geometry?.dispose();
        const itemMaterial = item.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(itemMaterial)) itemMaterial.forEach((entry) => entry.dispose());
        else itemMaterial?.dispose();
      });
      renderer.dispose();
    }
  };
}
