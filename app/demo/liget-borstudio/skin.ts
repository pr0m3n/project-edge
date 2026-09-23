/**
 * Bőrmetszet 3D-ben — a Liget „melyik kezelés meddig hat" szakaszához.
 *
 * Nem orvosi realizmus: agyagból formázott, matt tankönyvi blokk a márka
 * színeiben. Három réteg (hám, irha, bőralja) egymásra illeszkedő, hullámos
 * határfelülettel; a vágott oldalakon canvas-textúra mutatja a belső
 * szerkezetet. A görgetésből kapott haladás hajt mindent: a rétegek
 * szétválnak, a kezelés hatóanyag-cseppjei a megfelelő mélységig jutnak,
 * az emelő kezelésnél pedig kisimulnak a felszíni ráncok.
 */

import * as THREE from "three";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const W = 6;
const D = 4;
const LAYERS = [
  { id: "epidermis", height: 0.42, color: "#ecc7ae", name: "Hám", detail: "0,1 mm · védőréteg" },
  { id: "dermis", height: 1.35, color: "#d69c8b", name: "Irha", detail: "1–2 mm · kollagén, erek" },
  { id: "hypodermis", height: 1.05, color: "#eedab4", name: "Bőralja", detail: "zsírszövet, párna" }
] as const;
export type LayerId = (typeof LAYERS)[number]["id"];

/** A hám és az irha közti hullámos határ (a papillák). */
const junction = (x: number, z: number) => 0.07 * Math.sin(x * 3.1) * Math.cos(z * 2.3) + 0.03 * Math.sin(x * 7 + z * 5);

/** A felszín: finom domborzat + három ránc, amit az emelő kezelés kisimít. */
const surface = (x: number, z: number, wrinkles: number) =>
  0.025 * Math.sin(x * 9 + z * 4) * Math.cos(z * 7) -
  wrinkles * (0.09 * Math.exp(-(((x + 1.2 + 0.2 * Math.sin(z)) / 0.12) ** 2)) + 0.07 * Math.exp(-(((x - 0.6 + 0.15 * Math.cos(z * 1.3)) / 0.1) ** 2)) + 0.05 * Math.exp(-(((x - 1.9) / 0.09) ** 2)));

function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/* ── metszet-textúrák ─────────────────────────────────────────────────── */

function sectionTexture(id: LayerId, aspect: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = Math.max(64, Math.round(1024 / aspect));
  const ctx = canvas.getContext("2d");
  const rand = random(id.length * 97);
  if (!ctx) return canvas;
  const { width, height } = canvas;

  if (id === "epidermis") {
    ctx.fillStyle = "#ecc7ae";
    ctx.fillRect(0, 0, width, height);
    // a hám sejtsorai: vékony, egymással párhuzamos sávok, fölül a szaruréteg
    for (let row = 0; row < 7; row++) {
      ctx.strokeStyle = row < 2 ? "rgba(180,120,95,0.35)" : "rgba(176,120,98,0.18)";
      ctx.lineWidth = row < 2 ? 3 : 2;
      ctx.beginPath();
      const y = 8 + (row / 7) * (height - 16);
      for (let x = 0; x <= width; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.02 + row) * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,240,228,0.55)";
    ctx.fillRect(0, 0, width, 6);
  }

  if (id === "dermis") {
    ctx.fillStyle = "#d69c8b";
    ctx.fillRect(0, 0, width, height);
    // kollagénrostok: hullámos, egymáson átfutó kötegek
    for (let fiber = 0; fiber < 90; fiber++) {
      const y = rand() * height;
      ctx.strokeStyle = rand() > 0.5 ? "rgba(240,190,172,0.55)" : "rgba(170,105,90,0.35)";
      ctx.lineWidth = 2 + rand() * 4;
      ctx.beginPath();
      const amp = 6 + rand() * 12;
      const freq = 0.008 + rand() * 0.012;
      const phase = rand() * 6;
      const tilt = (rand() - 0.5) * 0.25;
      for (let x = -20; x <= width + 20; x += 10) ctx.lineTo(x, y + Math.sin(x * freq + phase) * amp + x * tilt);
      ctx.stroke();
    }
    // erek keresztmetszete
    for (let vessel = 0; vessel < 9; vessel++) {
      const x = rand() * width;
      const y = height * (0.25 + rand() * 0.65);
      const r = 7 + rand() * 9;
      ctx.fillStyle = "#b35f58";
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e1a393";
      ctx.beginPath();
      ctx.ellipse(x, y, r * 0.6, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // szőrtüszők: a felszínről lefutó csatornák hagymával
    for (const fx of [0.18, 0.47, 0.8]) {
      const x = fx * width;
      ctx.fillStyle = "#b98372";
      ctx.fillRect(x - 7, 0, 14, height * 0.62);
      ctx.beginPath();
      ctx.ellipse(x, height * 0.64, 16, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#5c4034";
      ctx.fillRect(x - 2, 0, 4, height * 0.62);
    }
  }

  if (id === "hypodermis") {
    ctx.fillStyle = "#e3c796";
    ctx.fillRect(0, 0, width, height);
    // zsírlebenyek: sűrűn pakolt, lekerekített sejtek
    for (let cell = 0; cell < 260; cell++) {
      const x = rand() * width;
      const y = rand() * height;
      const r = 16 + rand() * 22;
      ctx.fillStyle = rand() > 0.5 ? "#f3e2bf" : "#efdab2";
      ctx.strokeStyle = "rgba(190,150,100,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * (0.8 + rand() * 0.3), rand() * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  return canvas;
}

/* ── egy réteg: doboz, hullámos tetővel/aljjal ──────────────────────────── */

function layerMesh(index: number, anisotropy: number) {
  const layer = LAYERS[index];
  const geometry = new THREE.BoxGeometry(W, layer.height, D, 72, 1, 48);
  const base = geometry.attributes.position.array.slice() as Float32Array;
  const shape = (wrinkles: number) => {
    const position = geometry.attributes.position;
    for (let vertex = 0; vertex < position.count; vertex++) {
      const x = base[vertex * 3];
      const y = base[vertex * 3 + 1];
      const z = base[vertex * 3 + 2];
      let offset = 0;
      if (y > 0) offset = index === 0 ? surface(x, z, wrinkles) : index === 1 ? junction(x, z) : 0;
      else if (index === 0) offset = junction(x, z);
      position.setY(vertex, y + offset);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
  };
  shape(1);

  const texture = (aspect: number) => {
    const map = new THREE.CanvasTexture(sectionTexture(layer.id, aspect));
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = anisotropy;
    return map;
  };
  const cut = (aspect: number) =>
    new THREE.MeshPhysicalMaterial({ map: texture(aspect), roughness: 0.82, sheen: 0.4, sheenColor: new THREE.Color("#ffe0d0") });
  const plain = new THREE.MeshPhysicalMaterial({
    color: layer.color,
    roughness: index === 0 ? 0.62 : 0.85,
    sheen: index === 0 ? 0.8 : 0.3,
    sheenColor: new THREE.Color("#ffd6c4"),
    sheenRoughness: 0.5
  });
  const frontMaterial = cut(W / layer.height);
  const sideMaterial = cut(D / layer.height);
  // Sorrend: +x, −x, +y, −y, +z, −z
  const materials = [sideMaterial, sideMaterial, plain, plain, frontMaterial, frontMaterial];
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, materials: [plain, frontMaterial, sideMaterial], shape };
}

export type SkinLabel = { id: string; text: string; sub: string };

export function createSkinScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 80);

  scene.add(new THREE.HemisphereLight("#fff8f0", "#c9b39c", 1.25));
  const key = new THREE.DirectionalLight("#fff1e2", 2.2);
  key.position.set(5, 9, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -7;
  key.shadow.bias = -0.0006;
  key.shadow.normalBias = 0.02;
  const fill = new THREE.DirectionalLight("#ffd9c2", 0.7);
  fill.position.set(-6, 3, 2);
  scene.add(key, fill);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.12 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const block = new THREE.Group();
  scene.add(block);

  const built = LAYERS.map((_, index) => layerMesh(index, anisotropy));
  const groups = built.map(({ mesh }) => {
    const group = new THREE.Group();
    group.add(mesh);
    block.add(group);
    return group;
  });

  // szőrszálak a felszínből, a hám csoportjához kötve
  const hairMaterial = new THREE.MeshStandardMaterial({ color: "#5c4034", roughness: 0.6 });
  const hairGeometry = new THREE.CylinderGeometry(0.008, 0.02, 0.95, 6);
  hairGeometry.translate(0, 0.47, 0);
  for (const [fx, tilt] of [[0.18, 0.35], [0.47, -0.25], [0.8, 0.3]] as const) {
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.set(-W / 2 + fx * W, LAYERS[0].height / 2, D / 2 - 0.02);
    hair.rotation.z = tilt;
    hair.rotation.x = -0.2;
    hair.castShadow = true;
    groups[0].add(hair);
  }

  /* hatóanyag-cseppek */
  const dropCount = 36;
  const rand = random(3);
  const drops = Array.from({ length: dropCount }, () => ({
    x: (rand() - 0.5) * (W - 1),
    z: (rand() - 0.5) * (D - 1),
    delay: rand(),
    size: 0.05 + rand() * 0.05
  }));
  const dropMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 16, 12),
    new THREE.MeshPhysicalMaterial({ clearcoat: 1, color: "#fff7ef", opacity: 0.9, roughness: 0.08, transparent: true }),
    dropCount
  );
  dropMesh.castShadow = true;
  scene.add(dropMesh);

  /* címkék (HTML-horgonyok a rétegek jobb elülső élén) */
  const anchors = LAYERS.map((layer, index) => {
    const anchor = new THREE.Object3D();
    anchor.position.set(W / 2 + 0.15, 0, D / 2);
    groups[index].add(anchor);
    return anchor;
  });
  const labels: SkinLabel[] = LAYERS.map((layer) => ({ id: layer.id, text: layer.name, sub: layer.detail }));

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const target = new THREE.Vector3();
  let narrow = false;
  let lastWrinkles = 1;
  const baseY = [0, 0, 0];
  {
    // alulról fölfelé egymásra rakva; a blokk alja a padlón
    let y = 0;
    for (let index = LAYERS.length - 1; index >= 0; index--) {
      baseY[index] = y + LAYERS[index].height / 2;
      y += LAYERS[index].height;
    }
  }

  /**
   * `explode`: 0 = összeillesztve, 1 = szétnyitva.
   * `focus`: melyik réteg(ek) világítanak (0..1 rétegenként).
   * `drop`: a cseppek útja: 0 = nincs, 1-es fázisban hámig, 2-esben az irha tetejéig.
   * `wrinkles`: 1 = ráncos felszín, 0 = kisimult.
   */
  const update = (state: { explode: number; focus: [number, number, number]; dropPhase: number; dropDepth: number; wrinkles: number; seconds: number; orbit: number }) => {
    const gap = 1.25 * state.explode;
    groups.forEach((group, index) => {
      group.position.y = baseY[index] + gap * (LAYERS.length - 1 - index);
      const glow = state.focus[index];
      const anyFocus = Math.max(...state.focus);
      built[index].materials.forEach((material) => {
        const physical = material as THREE.MeshPhysicalMaterial;
        physical.emissive.set("#ff9c7a");
        physical.emissiveIntensity = 0.28 * glow;
        const dim = 1 - 0.55 * anyFocus * (1 - glow);
        physical.opacity = dim;
        const transparent = dim < 0.999;
        if (physical.transparent !== transparent) {
          physical.transparent = transparent;
          physical.needsUpdate = true;
        }
      });
    });

    if (Math.abs(state.wrinkles - lastWrinkles) > 0.004) {
      built[0].shape(state.wrinkles);
      lastWrinkles = state.wrinkles;
    }

    // cseppek: felülről esnek, a célmélységben elnyelődnek
    const topY = groups[0].position.y + LAYERS[0].height / 2;
    const dermisTop = groups[1].position.y + LAYERS[1].height / 2 - 0.25;
    const targetY = mix(topY, dermisTop, state.dropDepth);
    drops.forEach((drop, index) => {
      const local = clamp01(state.dropPhase * 1.6 - drop.delay * 0.6);
      const fall = smooth(0, 0.7, local);
      const absorb = smooth(0.7, 1, local);
      const y = mix(topY + 2.4, targetY, fall);
      const size = drop.size * (local > 0 ? 1 - absorb : 0) * (1 + 0.1 * Math.sin(state.seconds * 3 + index));
      position.set(drop.x, y, drop.z);
      scale.setScalar(Math.max(0.0001, size));
      matrix.compose(position, quaternion, scale);
      dropMesh.setMatrixAt(index, matrix);
    });
    dropMesh.instanceMatrix.needsUpdate = true;
    dropMesh.visible = state.dropPhase > 0.001 && state.dropPhase < 0.999;

    // kamera: elölről-jobbról, fölülről; lassan körbejár
    const azimuth = ((mix(28, -18, state.orbit) + Math.sin(state.seconds * 0.15) * 2) * Math.PI) / 180;
    const elevation = (mix(24, 16, state.explode) * Math.PI) / 180;
    const distance = (narrow ? 27 : 17.5) + 2.4 * state.explode;
    target.set(0, 1.4 + 1.2 * state.explode, 0);
    camera.position.set(
      Math.sin(azimuth) * Math.cos(elevation) * distance,
      target.y + Math.sin(elevation) * distance,
      Math.cos(azimuth) * Math.cos(elevation) * distance
    );
    camera.lookAt(target);
    key.target.position.copy(target);
  };

  return {
    labels,
    update,
    project(width: number, height: number) {
      return anchors.map((anchor, index) => {
        anchor.getWorldPosition(projected);
        projected.project(camera);
        return { id: LAYERS[index].id, x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height };
      });
    },
    resize(width: number, height: number) {
      narrow = width / Math.max(1, height) < 0.85;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      if (narrow) camera.setViewOffset(width, height, 0, height * 0.12, width, height);
      else camera.setViewOffset(width, height, -width * 0.12, 0, width, height);
    },
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      scene.traverse((object) => {
        const item = object as THREE.Mesh;
        item.geometry?.dispose();
        const material = item.material as THREE.Material | THREE.Material[] | undefined;
        const list = Array.isArray(material) ? material : material ? [material] : [];
        for (const entry of list) {
          (entry as THREE.MeshStandardMaterial).map?.dispose();
          entry.dispose();
        }
      });
      renderer.dispose();
    }
  };
}
