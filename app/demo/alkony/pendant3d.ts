/**
 * Az Esthajnal medál 3D-ben, böngészőben, modellfájl nélkül.
 *
 * A fém a stúdió környezetét tükrözi (PMREM), a kövek viszont nem
 * „üvegek": a shader a csiszolás 73 lapsíkján belül követi a fénysugarat —
 * belépés, teljes visszaverődések, kilépés csatornánként más törésmutatóval.
 * Ettől szikrázik a gyémánt színesen (diszperzió), és ettől lesz az
 * alexandrit a fény színétől függően zöld vagy lila.
 *
 * A stúdió egyetlen jelenet, két fénykészlettel (nappali sátor és
 * gyertyafény). A `setLight` a kettő között kever, és újrarendereli a
 * környezetet — a fém és a kövek ugyanazt a fényt látják.
 */

import * as THREE from "three";
import { brilliantCut, buildPendantShape, type Strand } from "./geometry";

export type Framing = "full" | "stone";

export type PendantViewer = {
  setPose: (yaw: number, pitch: number) => void;
  /** A táncoló foglalat kilengése a tengelye körül (radián). */
  setSwing: (angle: number) => void;
  /** 0 = nappali fény (6500 K), 1 = gyertyafény (2700 K). */
  setLight: (mix: number) => void;
  resize: (width: number, height: number) => void;
  render: () => void;
  dispose: () => void;
};

const STONE_RADIUS = 0.2;
const PAVE_RADIUS = 0.042;

/* ─── kövek: fénykövetés a csiszolás síkjai között ────────────────────── */

const gemVertex = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vFacet;
  varying vec3 vCam;
  varying vec3 vAxisX;
  varying vec3 vAxisY;
  varying vec3 vAxisZ;
  void main() {
    mat4 model = modelMatrix;
    #ifdef USE_INSTANCING
      model = model * instanceMatrix;
    #endif
    vPos = position;
    vFacet = normal;
    vCam = (inverse(model) * vec4(cameraPosition, 1.0)).xyz;
    vAxisX = normalize(model[0].xyz);
    vAxisY = normalize(model[1].xyz);
    vAxisZ = normalize(model[2].xyz);
    gl_Position = projectionMatrix * viewMatrix * model * vec4(position, 1.0);
  }
`;

const gemFragment = /* glsl */ `
  uniform vec4 uPlanes[PLANES];
  uniform samplerCube uEnv;
  uniform vec3 uIor;
  uniform vec3 uAbsorb;
  uniform float uEnvIntensity;
  varying vec3 vPos;
  varying vec3 vFacet;
  varying vec3 vCam;
  varying vec3 vAxisX;
  varying vec3 vAxisY;
  varying vec3 vAxisZ;

  vec3 envAt(vec3 dir) {
    vec3 world = normalize(dir.x * vAxisX + dir.y * vAxisY + dir.z * vAxisZ);
    return textureLod(uEnv, world, 0.0).rgb * uEnvIntensity;
  }

  float fresnel(float cosi, float n1, float n2) {
    float sint = n1 / n2 * sqrt(max(0.0, 1.0 - cosi * cosi));
    if (sint >= 1.0) return 1.0;
    float cost = sqrt(max(0.0, 1.0 - sint * sint));
    float rs = (n2 * cosi - n1 * cost) / (n2 * cosi + n1 * cost);
    float rp = (n1 * cosi - n2 * cost) / (n1 * cosi + n2 * cost);
    return 0.5 * (rs * rs + rp * rp);
  }

  void main() {
    vec3 n = normalize(vFacet);
    vec3 ray = normalize(vPos - vCam);
    float ior = uIor.g;
    float entry = fresnel(clamp(-dot(ray, n), 0.0, 1.0), 1.0, ior);
    vec3 color = envAt(reflect(ray, n)) * entry;

    vec3 dir = refract(ray, n, 1.0 / ior);
    vec3 p = vPos;
    vec3 weight = vec3(1.0 - entry);
    float travelled = 0.0;
    for (int bounce = 0; bounce < BOUNCES; bounce++) {
      float exitT = 1e6;
      vec3 exitN = vec3(0.0, 1.0, 0.0);
      for (int i = 0; i < PLANES; i++) {
        vec4 plane = uPlanes[i];
        float facing = dot(plane.xyz, dir);
        if (facing > 1e-4) {
          float t = (plane.w - dot(plane.xyz, p)) / facing;
          if (t < exitT) { exitT = t; exitN = plane.xyz; }
        }
      }
      exitT = max(exitT, 0.0);
      p += dir * exitT;
      travelled += exitT;
      vec3 out_g = refract(dir, -exitN, ior);
      if (dot(out_g, out_g) > 0.0) {
        float inner = fresnel(dot(dir, exitN), ior, 1.0);
        vec3 out_r = refract(dir, -exitN, uIor.r);
        vec3 out_b = refract(dir, -exitN, uIor.b);
        if (dot(out_r, out_r) == 0.0) out_r = out_g;
        if (dot(out_b, out_b) == 0.0) out_b = out_g;
        vec3 light = vec3(envAt(out_r).r, envAt(out_g).g, envAt(out_b).b);
        color += weight * exp(-uAbsorb * travelled) * (1.0 - inner) * light;
        weight *= inner;
      }
      dir = reflect(dir, exitN);
    }
    color += weight * exp(-uAbsorb * travelled) * envAt(dir) * 0.35;

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function gemMaterial(planes: number[], env: THREE.Texture, ior: [number, number, number], absorb: THREE.Vector3, bounces: number) {
  const vectors: THREE.Vector4[] = [];
  for (let index = 0; index < planes.length; index += 4) {
    vectors.push(new THREE.Vector4(planes[index], planes[index + 1], planes[index + 2], planes[index + 3]));
  }
  return new THREE.ShaderMaterial({
    defines: { BOUNCES: bounces, PLANES: vectors.length },
    fragmentShader: gemFragment,
    uniforms: {
      uAbsorb: { value: absorb },
      uEnv: { value: env },
      uEnvIntensity: { value: 1 },
      uIor: { value: new THREE.Vector3(...ior) },
      uPlanes: { value: vectors }
    },
    vertexShader: gemVertex
  });
}

/* ─── stúdió: nappali sátor és gyertyafény egy jelenetben ─────────────── */

type StudioLight = { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial; day: THREE.Color; candle: THREE.Color };

function studio() {
  const scene = new THREE.Scene();
  const domeUniforms = { uMix: { value: 0 } };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(40, 64, 32),
    new THREE.ShaderMaterial({
      depthWrite: false,
      fragmentShader: /* glsl */ `
        uniform float uMix;
        varying vec3 vDir;
        void main() {
          float y = vDir.y;
          vec3 top = vec3(0.86, 0.89, 0.93);
          vec3 mid = vec3(0.50, 0.52, 0.55);
          vec3 low = vec3(0.13, 0.135, 0.14);
          vec3 day = y > 0.0 ? mix(mid, top, smoothstep(0.0, 0.85, y)) : mix(mid, low, smoothstep(0.0, 0.45, -y));
          float wall = pow(max(0.0, dot(vDir, normalize(vec3(-0.85, 0.05, 0.5)))), 2.5);
          vec3 candle = vec3(0.007, 0.0055, 0.0048) + vec3(0.03, 0.019, 0.012) * wall;
          gl_FragColor = vec4(mix(day, candle, uMix), 1.0);
        }
      `,
      side: THREE.BackSide,
      uniforms: domeUniforms,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `
    })
  );
  scene.add(dome);

  const lights: StudioLight[] = [];
  const add = (geometry: THREE.BufferGeometry, position: [number, number, number], day: number[], candle: number[]) => {
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    const color = ([r, g, b, power]: number[]) => new THREE.Color(r * power, g * power, b * power);
    lights.push({ candle: color(candle), day: color(day), material, mesh });
    return mesh;
  };
  const off = [0, 0, 0, 0];
  const daylight = [0.97, 0.99, 1.03];
  const flame = [1, 0.7, 0.42];
  const lamp = [1, 0.86, 0.72];

  // nappal: nagy felső softbox, két csíkfény, alacsony elülső derítés,
  // és néhány apró, nagyon erős pont — ezek adják a gyémánt szikráját
  add(new THREE.PlaneGeometry(14, 7), [0, 15, 4], [...daylight, 3], [...lamp, 0.42]);
  // a néző mögötti nagy, lágy derítő: ebből kap fényt a szív lapos teteje
  add(new THREE.PlaneGeometry(17, 9), [0, 3.5, 16], [...daylight, 1.8], [...lamp, 0.1]);
  add(new THREE.PlaneGeometry(2.4, 16), [-15, 2, 5], [...daylight, 4.2], off);
  add(new THREE.PlaneGeometry(2.4, 16), [14, 1, -3], [...daylight, 3.1], off);
  add(new THREE.PlaneGeometry(12, 3.5), [0, -4, 15], [...daylight, 1.1], off);
  for (const spot of [
    [-7, 9, 11],
    [8, 6, 10],
    [3, 12, -8],
    [-10, 3, -8],
    [11, -2, 6]
  ] as [number, number, number][]) {
    add(new THREE.SphereGeometry(0.42, 12, 8), spot, [...daylight, 34], off);
  }
  // fekete kartonok: kontúrt rajzolnak a polírozott fémre
  for (const flag of [
    [-10, 0, 12],
    [10, -1, 11],
    [0, 4, -15]
  ] as [number, number, number][]) {
    add(new THREE.PlaneGeometry(3, 18), flag, [0.05, 0.052, 0.056, 1], [0.004, 0.003, 0.0025, 1]);
  }

  // gyertyafény: kevés, apró, nagyon meleg láng, és egy derengő fal
  for (const candle of [
    [-8, -1.5, 12],
    [7, -2.5, 13],
    [12, 1, -5],
    [-5, 0.5, -13]
  ] as [number, number, number][]) {
    const mesh = add(new THREE.SphereGeometry(0.34, 12, 8), candle, off, [...flame, 150]);
    mesh.scale.set(1, 1.9, 1);
  }
  add(new THREE.PlaneGeometry(18, 10), [-17, 0, 6], off, [...flame, 0.08]);
  // két keskeny, meleg lámpacsík: este is legyen fényes él a fémen
  add(new THREE.PlaneGeometry(2, 9), [-9, 7, 9], off, [...lamp, 3.6]);
  add(new THREE.PlaneGeometry(2, 10), [10, 4, 6], off, [...lamp, 2.4]);
  add(new THREE.PlaneGeometry(9, 1.6), [0, 9, -10], off, [...lamp, 1.6]);
  add(new THREE.PlaneGeometry(6, 1.2), [-4, -6, 10], off, [...lamp, 2.2]);
  add(new THREE.PlaneGeometry(1.2, 7), [6, 2, 12], off, [...lamp, 2.8]);

  const setMix = (mix: number) => {
    domeUniforms.uMix.value = mix;
    for (const light of lights) {
      light.material.color.copy(light.day).lerp(light.candle, mix);
      const strength = light.material.color.r + light.material.color.g + light.material.color.b;
      light.mesh.visible = strength > 0.003;
    }
  };

  return {
    dispose() {
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        (mesh.material as THREE.Material | undefined)?.dispose();
      });
    },
    scene,
    setMix
  };
}

/* ─── csőhúzás: síkgörbe mentén tetszőleges keresztmetszet ─────────────── */

type Frame = (index: number, tangent: THREE.Vector3) => [THREE.Vector3, THREE.Vector3];
type Profile = (angle: number, index: number) => [number, number];

function sweep(points: THREE.Vector3[], closed: boolean, radial: number, frame: Frame, profile: Profile) {
  const count = points.length;
  const positions = new Float32Array(count * radial * 3);
  const tangent = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    const prev = points[closed ? (i - 1 + count) % count : Math.max(0, i - 1)];
    const next = points[closed ? (i + 1) % count : Math.min(count - 1, i + 1)];
    tangent.subVectors(next, prev).normalize();
    const [side, up] = frame(i, tangent);
    for (let j = 0; j < radial; j++) {
      const [u, v] = profile((j / radial) * Math.PI * 2, i);
      const k = (i * radial + j) * 3;
      positions[k] = points[i].x + side.x * u + up.x * v;
      positions[k + 1] = points[i].y + side.y * u + up.y * v;
      positions[k + 2] = points[i].z + side.z * u + up.z * v;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < (closed ? count : count - 1); i++) {
    const a = i * radial;
    const b = ((i + 1) % count) * radial;
    for (let j = 0; j < radial; j++) {
      const next = (j + 1) % radial;
      index.push(a + j, b + next, b + j, a + j, a + next, b + next);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

const Z = new THREE.Vector3(0, 0, 1);
const X = new THREE.Vector3(1, 0, 0);

/** Közel síkbeli görbe kerete: oldal a síkban, „fel" a néző felé. */
const planarFrame: Frame = (_, tangent) => {
  const side = new THREE.Vector3().crossVectors(Z, tangent).normalize();
  const up = new THREE.Vector3().crossVectors(tangent, side).normalize();
  return [side, up];
};

const ellipse = (halfWidth: number, halfDepth: number): Profile => (angle) => [halfWidth * Math.cos(angle), halfDepth * Math.sin(angle)];

/** Lekerekített téglalap (szuperellipszis): lapos teteje van, arra ül a pavé. */
const slab = (halfWidth: (index: number) => number, halfDepth: number, power = 0.42): Profile => (angle, index) => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [halfWidth(index) * Math.sign(c) * Math.abs(c) ** power, halfDepth * Math.sign(s) * Math.abs(s) ** power];
};

function strandPoints(strand: Strand) {
  return strand.points.map((point, index) => new THREE.Vector3(point.x, point.y, strand.z[index]));
}

/* ─── a medál ─────────────────────────────────────────────────────────── */

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

type Glint = {
  parent: THREE.Object3D;
  local: THREE.Vector3[];
  facets: THREE.Vector3[][];
  attribute: THREE.BufferAttribute;
  points: THREE.Points;
  strength: number;
};

function starTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const core = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(0.06, "rgba(255,255,255,0.85)");
    core.addColorStop(0.2, "rgba(255,255,255,0.12)");
    core.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, 128, 128);
    ctx.globalCompositeOperation = "lighter";
    for (const [angle, reach, width] of [
      [0, 63, 1.6],
      [Math.PI / 2, 63, 1.6],
      [Math.PI / 4, 30, 1.1],
      [-Math.PI / 4, 30, 1.1]
    ]) {
      ctx.save();
      ctx.translate(64, 64);
      ctx.rotate(angle);
      const ray = ctx.createLinearGradient(-reach, 0, reach, 0);
      ray.addColorStop(0, "rgba(255,255,255,0)");
      ray.addColorStop(0.5, "rgba(255,255,255,0.9)");
      ray.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = ray;
      ctx.fillRect(-reach, -width, reach * 2, width * 2);
      ctx.restore();
    }
  }
  return new THREE.CanvasTexture(canvas);
}

export function createPendantViewer(canvas: HTMLCanvasElement, framing: Framing, quality: "high" | "low"): PendantViewer {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === "high" ? 2 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 0);

  const bounces = quality === "high" ? 5 : 3;
  const env = studio();
  const gemCube = new THREE.WebGLCubeRenderTarget(quality === "high" ? 512 : 256, { type: THREE.HalfFloatType });
  const metalCube = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const gemCamera = new THREE.CubeCamera(0.1, 100, gemCube);
  const metalCamera = new THREE.CubeCamera(0.1, 100, metalCube);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let metalEnv: THREE.WebGLRenderTarget | null = null;

  const metal = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(0.8, 0.8, 0.82, THREE.LinearSRGBColorSpace),
    metalness: 1,
    roughness: 0.075
  });

  const cut = brilliantCut();
  const gemGeometry = new THREE.BufferGeometry();
  gemGeometry.setAttribute("position", new THREE.Float32BufferAttribute(cut.positions, 3));
  gemGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(cut.normals, 3));

  const diamond = gemMaterial(cut.planes, gemCube.texture, [2.402, 2.418, 2.46], new THREE.Vector3(0, 0.004, 0.012), bounces);
  // Az alexandrit elnyelése a fény színével együtt vált: nappal a kékeszöld
  // ablak, izzó- és gyertyafényben a vörös–ibolya ablak engedi át a fényt.
  const absorbDay = new THREE.Vector3(2.9, 0.78, 1.1);
  const absorbDusk = new THREE.Vector3(1.45, 1.3, 1.05);
  const absorbCandle = new THREE.Vector3(0.4, 2.3, 0.3);
  const alexandriteAbsorb = absorbDay.clone();
  const alexandrite = gemMaterial(cut.planes, gemCube.texture, [1.741, 1.746, 1.758], alexandriteAbsorb, bounces);

  const scene = new THREE.Scene();
  const pendant = new THREE.Group();
  scene.add(pendant);

  /* fonott szálak */
  const shape = buildPendantShape();
  const [knot, heart] = shape.strands;
  pendant.add(new THREE.Mesh(sweep(strandPoints(knot), true, 30, planarFrame, ellipse(knot.halfWidth, knot.halfDepth)), metal));
  pendant.add(new THREE.Mesh(sweep(strandPoints(heart), true, 36, planarFrame, slab(() => heart.halfWidth, heart.halfDepth)), metal));

  /* pavé: a szív tetején, ott nem, ahol a szív a csomó alá bújik */
  const heartPoints = strandPoints(heart);
  const unders: number[] = [];
  for (const crossing of shape.crossings) {
    const heartIndex = 1;
    if (crossing.a === heartIndex && !crossing.aOver) unders.push(crossing.sa);
    if (crossing.b === heartIndex && crossing.aOver) unders.push(crossing.sb);
  }
  const frameAt = (s: number) => {
    const step = heart.length / heartPoints.length;
    const count = heartPoints.length;
    const index = ((Math.round(s / step) % count) + count) % count;
    const prev = heartPoints[(index - 2 + heartPoints.length) % heartPoints.length];
    const next = heartPoints[(index + 2) % heartPoints.length];
    const tangent = new THREE.Vector3().subVectors(next, prev).normalize();
    const [side, up] = planarFrame(index, tangent);
    return { position: heartPoints[index].clone(), side, tangent, up };
  };
  const spacing = PAVE_RADIUS * 2.14;
  const clearance = 0.13;
  const random = seeded(7);
  const stones: THREE.Matrix4[] = [];
  const stoneSpots: { position: THREE.Vector3; up: THREE.Vector3 }[] = [];
  const beads: THREE.Vector3[] = [];
  const isFree = (s: number) =>
    unders.every((u) => {
      const distance = Math.abs(s - u);
      return Math.min(distance, heart.length - distance) > clearance;
    });
  const slots = Math.floor(heart.length / spacing);
  const step = heart.length / slots;
  for (let slot = 0; slot < slots; slot++) {
    const s = slot * step;
    if (!isFree(s)) continue;
    const { position, tangent, up } = frameAt(s);
    // a szív hajlata a csomó felső íve mögé bújik: ott a fotón sincs kő
    if (position.y > 0.3 && Math.abs(position.x) < 0.3) continue;
    // a rondiszt épp a sáv felszíne fölött: a korona teljesen kilátszik, a
    // pavilon a fémbe süllyed (a valóságban fúrt fészekbe)
    const center = position.clone().addScaledVector(up, heart.halfDepth + 0.002);
    const basis = new THREE.Matrix4().makeBasis(tangent, up, new THREE.Vector3().crossVectors(tangent, up));
    const spin = new THREE.Matrix4().makeRotationY(random() * Math.PI);
    const matrix = new THREE.Matrix4().makeTranslation(center.x, center.y, center.z).multiply(basis).multiply(spin).scale(new THREE.Vector3(PAVE_RADIUS, PAVE_RADIUS, PAVE_RADIUS));
    stones.push(matrix);
    stoneSpots.push({ position: center.clone().addScaledVector(up, PAVE_RADIUS * 0.45), up });
    // gyöngyök (a kőfogó „szemcsék") a kő két oldalán, a szomszéd felé eltolva
    for (const half of [-0.5, 0.5]) {
      if (!isFree(s + half * step)) continue;
      const between = frameAt(s + half * step);
      for (const edge of [-1, 1]) {
        beads.push(
          between.position
            .clone()
            .addScaledVector(between.side, edge * (heart.halfWidth - 0.011))
            .addScaledVector(between.up, heart.halfDepth + 0.006)
        );
      }
    }
  }
  const pave = new THREE.InstancedMesh(gemGeometry, diamond, stones.length);
  stones.forEach((matrix, index) => pave.setMatrixAt(index, matrix));
  pendant.add(pave);

  const beadMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0125, 12, 8), metal, beads.length);
  beads.forEach((position, index) => beadMesh.setMatrixAt(index, new THREE.Matrix4().makeTranslation(position.x, position.y, position.z)));
  pendant.add(beadMesh);

  /* középső kő a táncoló foglalatban: a tengely a csomó két belső ívéhez fut */
  const arcAt = (sign: number) => {
    let found = { x: sign * 0.396, z: 0 };
    let closest = Infinity;
    knot.points.forEach((point, index) => {
      if (Math.sign(point.x) !== sign || Math.abs(point.x) < 0.3 || Math.abs(point.x) > 0.5) return;
      if (Math.abs(point.y) < closest) {
        closest = Math.abs(point.y);
        found = { x: point.x, z: knot.z[index] };
      }
    });
    return found;
  };
  const leftArc = arcAt(-1);
  const rightArc = arcAt(1);
  const axleZ = (leftArc.z + rightArc.z) / 2 - 0.012;
  const girdleZ = axleZ + 0.06;
  const dancer = new THREE.Group();
  dancer.position.set(0, 0, axleZ);
  pendant.add(dancer);

  const stone = new THREE.Mesh(gemGeometry, alexandrite);
  stone.scale.setScalar(STONE_RADIUS);
  stone.quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0.2, 0, "XYZ"));
  stone.position.set(0, 0, girdleZ - axleZ);
  dancer.add(stone);

  const local = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z - axleZ);
  const basketTop = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.014, 12, 64), metal);
  basketTop.position.copy(local(0, 0, girdleZ - 0.07));
  const basketLow = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 10, 48), metal);
  basketLow.position.copy(local(0, 0, girdleZ - 0.15));
  dancer.add(basketTop, basketLow);
  for (let k = 0; k < 4; k++) {
    const angle = Math.PI / 4 + (k * Math.PI) / 2;
    const at = (radius: number, z: number) => local(radius * Math.cos(angle), radius * Math.sin(angle), z);
    const path = new THREE.CatmullRomCurve3([at(0.07, girdleZ - 0.15), at(0.152, girdleZ - 0.07), at(0.212, girdleZ - 0.004), at(0.206, girdleZ + 0.03), at(0.186, girdleZ + 0.048)]);
    dancer.add(new THREE.Mesh(new THREE.TubeGeometry(path, 24, 0.017, 10, false), metal));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.021, 14, 10), metal);
    tip.position.copy(at(0.186, girdleZ + 0.048));
    dancer.add(tip);
  }
  // a tengely: a foglalat két karja a kosártól a perselyekig
  const axleRadius = 0.017;
  const bushingX = Math.min(-leftArc.x, rightArc.x) - knot.halfWidth - 0.018;
  for (const sideSign of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(axleRadius, axleRadius, bushingX - 0.15, 14), metal);
    arm.rotation.z = Math.PI / 2;
    arm.position.set((sideSign * (bushingX + 0.15)) / 2, 0, 0);
    dancer.add(arm);
    const bushing = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 20), metal);
    bushing.rotation.z = Math.PI / 2;
    bushing.position.set(sideSign * bushingX, 0, axleZ);
    pendant.add(bushing);
  }

  /* fülecske (karika + csíptetős akasztó) */
  let tipZ = 0;
  let best = Infinity;
  knot.points.forEach((point, index) => {
    const distance = Math.hypot(point.x, point.y - 1);
    if (distance < best) {
      best = distance;
      tipZ = knot.z[index];
    }
  });
  const ringY = 1.035;
  const jumpRing = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.021, 14, 48), metal);
  jumpRing.position.set(0, ringY, tipZ);
  pendant.add(jumpRing);

  const bailPath = new THREE.CatmullRomCurve3(
    [
      [0, ringY + 0.01, 0],
      [0, ringY + 0.1, 0.045],
      [0, ringY + 0.23, 0.062],
      [0, ringY + 0.33, 0.052],
      [0, ringY + 0.385, 0],
      [0, ringY + 0.33, -0.052],
      [0, ringY + 0.23, -0.062],
      [0, ringY + 0.1, -0.045]
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z + tipZ)),
    true,
    "centripetal"
  );
  const bailPoints = bailPath.getSpacedPoints(220).slice(0, 220);
  const bailWidth = (index: number) => {
    const y = bailPoints[index].y - ringY;
    return 0.03 + 0.048 * Math.min(1, Math.max(0, y / 0.3)) ** 0.8;
  };
  const bailFrame: Frame = (_, tangent) => {
    const up = new THREE.Vector3().crossVectors(tangent, X).normalize();
    return [X.clone(), up];
  };
  pendant.add(new THREE.Mesh(sweep(bailPoints, true, 32, bailFrame, slab(bailWidth, 0.0125, 0.5)), metal));

  /* lánc: kábellánc, szemenként 90°-kal elforgatva */
  const chainBottom = ringY + 0.385 - 0.0125 - 0.05;
  const chainPath = new THREE.CatmullRomCurve3(
    [
      [-1.9, 5.4, -0.25],
      [-0.85, 2.9, -0.08],
      [-0.3, 1.72, 0],
      [-0.1, chainBottom + 0.01, 0],
      [0.1, chainBottom + 0.01, 0],
      [0.3, 1.72, 0],
      [0.85, 2.9, -0.08],
      [1.9, 5.4, -0.25]
    ].map(([x, y, z]) => new THREE.Vector3(x, y, z + tipZ)),
    false,
    "centripetal"
  );
  const linkRadius = 0.034;
  const linkStretch = 1.5;
  const linkPitch = 2 * (linkRadius * linkStretch - 0.0085) - 0.004;
  const links = Math.floor(chainPath.getLength() / linkPitch);
  const chain = new THREE.InstancedMesh(new THREE.TorusGeometry(linkRadius, 0.0085, 8, 22), metal, links);
  for (let index = 0; index < links; index++) {
    const u = (index + 0.5) / links;
    const position = chainPath.getPointAt(u);
    const tangent = chainPath.getTangentAt(u).normalize();
    const [side, up] = planarFrame(0, tangent);
    const across = index % 2 === 0 ? side : up;
    const normal = new THREE.Vector3().crossVectors(tangent, across);
    const matrix = new THREE.Matrix4().makeBasis(tangent, across, normal).scale(new THREE.Vector3(linkStretch, 1, 1));
    matrix.setPosition(position);
    chain.setMatrixAt(index, matrix);
  }
  pendant.add(chain);

  /* felvillanások: kis csillagok ott, ahol egy lap épp a fény felé fordul */
  const star = starTexture();
  const glints: Glint[] = [];
  const glintMaterial = (size: number) =>
    new THREE.ShaderMaterial({
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      blendSrc: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blending: THREE.CustomBlending,
      depthWrite: false,
      fragmentShader: /* glsl */ `
        uniform sampler2D uStar;
        uniform vec3 uColor;
        varying float vGlint;
        void main() {
          float k = texture2D(uStar, gl_PointCoord).a * min(vGlint, 1.0);
          gl_FragColor = vec4(uColor * k, k * 0.85);
        }
      `,
      toneMapped: false,
      transparent: true,
      uniforms: { uColor: { value: new THREE.Color(1, 1, 1) }, uScale: { value: 1 }, uSize: { value: size }, uStar: { value: star } },
      vertexShader: /* glsl */ `
        attribute float aGlint;
        uniform float uSize;
        uniform float uScale;
        varying float vGlint;
        void main() {
          vec4 view = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * view;
          vGlint = aGlint;
          gl_PointSize = aGlint > 0.02 ? uSize * uScale * sqrt(aGlint) / -view.z : 0.0;
        }
      `
    });
  const addGlints = (parent: THREE.Object3D, spots: { position: THREE.Vector3; up: THREE.Vector3 }[], size: number, strength: number, seed: number) => {
    const rand = seeded(seed);
    const facets = spots.map(({ up }) => {
      const list: THREE.Vector3[] = [];
      const helper = Math.abs(up.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const a = new THREE.Vector3().crossVectors(up, helper).normalize();
      const b = new THREE.Vector3().crossVectors(up, a).normalize();
      for (let k = 0; k < 5; k++) {
        const tilt = 0.25 + rand() * 0.55;
        const turn = rand() * Math.PI * 2;
        list.push(
          up
            .clone()
            .multiplyScalar(Math.cos(tilt))
            .addScaledVector(a, Math.sin(tilt) * Math.cos(turn))
            .addScaledVector(b, Math.sin(tilt) * Math.sin(turn))
            .normalize()
        );
      }
      return list;
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(spots.flatMap(({ position }) => [position.x, position.y, position.z]), 3));
    const attribute = new THREE.Float32BufferAttribute(new Float32Array(spots.length), 1);
    geometry.setAttribute("aGlint", attribute);
    const points = new THREE.Points(geometry, glintMaterial(size));
    points.frustumCulled = false;
    points.renderOrder = 5;
    parent.add(points);
    glints.push({ attribute, facets, local: spots.map(({ position }) => position), parent, points, strength });
  };
  addGlints(pendant, stoneSpots, 0.5, 1, 11);
  addGlints(
    dancer,
    [
      { position: local(-0.06, 0.05, girdleZ + 0.07), up: new THREE.Vector3(0, 0, 1) },
      { position: local(0.07, -0.04, girdleZ + 0.07), up: new THREE.Vector3(0, 0, 1) },
      { position: local(0.02, 0.09, girdleZ + 0.06), up: new THREE.Vector3(0, 0, 1) }
    ],
    0.9,
    0.55,
    5
  );

  // a fényforrások iránya (nappal / gyertya), a felvillanások ehhez igazodnak
  const glintLightsDay = [
    [-7, 9, 11],
    [8, 6, 10],
    [3, 12, -8],
    [-10, 3, -8],
    [11, -2, 6]
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());
  const glintLightsCandle = [
    [-8, -1.5, 12],
    [7, -2.5, 13],
    [12, 1, -5],
    [-5, 0.5, -13]
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());

  /* kamera */
  const camera = new THREE.PerspectiveCamera(framing === "full" ? 24 : 26, 1, 0.05, 60);
  const target = framing === "full" ? new THREE.Vector3(0, 0.2, 0) : new THREE.Vector3(0, 0, 0.03);

  let lightMix = 0;
  let width = 1;
  let height = 1;

  const relight = () => {
    env.setMix(lightMix);
    gemCamera.update(renderer, env.scene);
    metalCamera.update(renderer, env.scene);
    metalEnv = pmrem.fromCubemap(metalCube.texture, metalEnv);
    metal.envMap = metalEnv.texture;
    metal.needsUpdate = true;
    // vegyes fényben (alkony) a kő átmenetileg szürkés, nem kék
    const t = THREE.MathUtils.smoothstep(lightMix, 0.15, 0.85);
    if (t < 0.5) alexandriteAbsorb.copy(absorbDay).lerp(absorbDusk, t * 2);
    else alexandriteAbsorb.copy(absorbDusk).lerp(absorbCandle, t * 2 - 1);
    // a sötét szobában a kő kevés fényt kap; a műtermi fotó is rávilágít
    alexandrite.uniforms.uEnvIntensity.value = THREE.MathUtils.lerp(1, 2.4, lightMix);
    diamond.uniforms.uEnvIntensity.value = THREE.MathUtils.lerp(1.15, 1.5, lightMix);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(1.0, 1.25, lightMix);
    const warm = new THREE.Color(1, 1, 1).lerp(new THREE.Color(1, 0.8, 0.55), lightMix);
    for (const glint of glints) (glint.points.material as THREE.ShaderMaterial).uniforms.uColor.value.copy(warm);
  };
  relight();

  const worldQuat = new THREE.Quaternion();
  const worldPos = new THREE.Vector3();
  const view = new THREE.Vector3();
  const half = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const updateGlints = () => {
    scene.updateMatrixWorld();
    for (const glint of glints) {
      glint.parent.getWorldQuaternion(worldQuat);
      const values = glint.attribute.array as Float32Array;
      glint.local.forEach((position, index) => {
        worldPos.copy(position).applyMatrix4(glint.parent.matrixWorld);
        view.subVectors(camera.position, worldPos).normalize();
        let sum = 0;
        for (const facet of glint.facets[index]) {
          normal.copy(facet).applyQuaternion(worldQuat);
          for (const [set, weight] of [
            [glintLightsDay, 1 - lightMix],
            [glintLightsCandle, lightMix * 1.6]
          ] as [THREE.Vector3[], number][]) {
            if (weight < 0.01) continue;
            for (const light of set) {
              half.addVectors(light, view).normalize();
              const d = normal.dot(half);
              if (d > 0.99) sum += weight * d ** 900;
            }
          }
        }
        values[index] = Math.min(1.5, sum * 2.2 * glint.strength * (0.55 + 0.45 * lightMix));
      });
      glint.attribute.needsUpdate = true;
    }
  };

  return {
    dispose() {
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        for (const entry of Array.isArray(material) ? material : material ? [material] : []) entry.dispose();
      });
      star.dispose();
      env.dispose();
      gemCube.dispose();
      metalCube.dispose();
      metalEnv?.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
    render() {
      updateGlints();
      renderer.render(scene, camera);
    },
    resize(nextWidth: number, nextHeight: number) {
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const [spanY, spanX] = framing === "full" ? [3.3, 2.4] : [1.02, 1.02];
      const fitHeight = spanY / 2 / tan;
      const fitWidth = spanX / 2 / (tan * camera.aspect);
      camera.position.set(target.x, target.y + (framing === "full" ? 0.05 : 0), target.z + Math.max(fitHeight, fitWidth));
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      const scale = (height * renderer.getPixelRatio()) / (2 * tan);
      for (const glint of glints) (glint.points.material as THREE.ShaderMaterial).uniforms.uScale.value = scale * 0.1;
    },
    setLight(mix: number) {
      const next = THREE.MathUtils.clamp(mix, 0, 1);
      if (Math.abs(next - lightMix) < 0.0005) return;
      lightMix = next;
      relight();
    },
    setPose(yaw: number, pitch: number) {
      pendant.rotation.set(pitch, yaw, 0);
    },
    setSwing(angle: number) {
      dancer.rotation.x = angle;
    }
  };
}
