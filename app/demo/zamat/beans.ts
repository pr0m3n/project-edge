/**
 * A pörkölés 3D jelenete — kizárólag böngészőben, dinamikusan betöltve.
 *
 * Egyetlen procedurális babgeometria (lapos oldal, S-alakú barázda),
 * instancolva: ~170 bab egyetlen rajzolási hívással. A görgetésből kapott
 * pörkölési perc hajt mindent: szín (roast.ts), duzzadás, fényesség
 * (sötét pörkölésnél kiül az olaj), a két pattanás lökése és a pelyva,
 * a végén pedig a babok a hűtőtálcára ülnek, és forog a keverőkar.
 */

import * as THREE from "three";
import { beanColor, beanTemp, ROAST_END } from "./roast";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Determinisztikus véletlen: minden betöltésnél ugyanaz a kompozíció. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/** Kávébab: nyújtott ellipszoid, a +y oldal lapos, rajta S-ívű barázda. */
function beanGeometry() {
  const geometry = new THREE.SphereGeometry(1, 30, 20);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    vertex.fromBufferAttribute(position, index);
    const x = vertex.x * 0.64;
    let y = vertex.y * 0.46;
    const z = vertex.z * 0.92;
    if (y > 0) {
      y *= 0.6;
      const offset = x - 0.05 * Math.sin(vertex.z * 3.1);
      const crease = Math.exp(-((offset / 0.075) ** 2)) * (1 - Math.abs(vertex.z) ** 6);
      y -= 0.17 * crease;
    }
    position.setXYZ(index, x, y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Egy pattanás lökése: a pillanatban 1, utána gyorsan lecseng. */
const crack = (minute: number, at: number) => (minute < at ? 0 : Math.exp(-(minute - at) * 3.2) * (minute - at < 1.6 ? 1 : 0));

type Bean = {
  angle: number;
  radius: number;
  height: number;
  speed: number;
  phase: number;
  size: number;
  shade: number;
  axis: THREE.Vector3;
  spin: number;
  heap: THREE.Vector3;
  heapRotation: THREE.Quaternion;
};

export function createRoastScene(canvas: HTMLCanvasElement, options: { count: number }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, canvas, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const background = new THREE.Color("#140f0b");
  const scene = new THREE.Scene();
  scene.background = background;
  scene.fog = new THREE.Fog(background, 11, 24);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 60);

  scene.add(new THREE.HemisphereLight("#fff1e0", "#2a1a10", 0.55));
  const key = new THREE.DirectionalLight("#ffe3c4", 2.8);
  key.position.set(4, 6, 5);
  const rim = new THREE.DirectionalLight("#ffae6b", 1.7);
  rim.position.set(-6, 2, -4);
  const heat = new THREE.PointLight("#ff5a1f", 0, 16, 1.6);
  heat.position.set(0, -3.4, 0.8);
  scene.add(key, rim, heat);

  /* babok */
  const geometry = beanGeometry();
  const material = new THREE.MeshPhysicalMaterial({ clearcoat: 0, clearcoatRoughness: 0.3, metalness: 0, roughness: 0.8 });
  const mesh = new THREE.InstancedMesh(geometry, material, options.count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  const rand = random(7);
  const beans: Bean[] = Array.from({ length: options.count }, () => {
    const heapRadius = 2.45 * Math.sqrt(rand());
    const heapAngle = rand() * Math.PI * 2;
    const mound = 0.8 * (1 - (heapRadius / 2.45) ** 2);
    return {
      angle: rand() * Math.PI * 2,
      radius: 1.1 + rand() * 2,
      height: (rand() - 0.5) * 4.4,
      speed: 0.18 + rand() * 0.22,
      phase: rand() * Math.PI * 2,
      size: 0.27 + rand() * 0.08,
      shade: 0.84 + rand() * 0.3,
      axis: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
      spin: 0.4 + rand() * 0.9,
      heap: new THREE.Vector3(Math.cos(heapAngle) * heapRadius, -2.15 + mound * (0.55 + rand() * 0.45), Math.sin(heapAngle) * heapRadius),
      heapRotation: new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 0.6 - 0.3 + (rand() > 0.5 ? Math.PI : 0), rand() * Math.PI * 2, rand() * 0.6 - 0.3))
    };
  });

  /* hűtőtálca: perforált acél korong, perem, forgó keverőkar */
  const tray = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: "#3a332d", metalness: 0.85, roughness: 0.38 });
  const trayDisc = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.12, 72), steel);
  trayDisc.position.y = -2.42;
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(3, 0.09, 12, 96), steel);
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = -2.3;
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.5, 72, 1, true), new THREE.MeshStandardMaterial({ color: "#2c2621", metalness: 0.8, roughness: 0.45, side: THREE.DoubleSide }));
  wall.position.y = -2.2;
  const arm = new THREE.Group();
  const armBar = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.1, 0.1), steel);
  const armBar2 = armBar.clone();
  armBar2.rotation.y = Math.PI / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 24), steel);
  arm.add(armBar, armBar2, hub);
  arm.position.y = -1.75;
  tray.add(trayDisc, rimRing, wall, arm);
  scene.add(tray);

  /* pelyva: az első pattanásnál leváló ezüstbőr, felfelé sodródik */
  const chaffCount = 240;
  const chaffBase = new Float32Array(chaffCount * 4);
  for (let index = 0; index < chaffCount; index++) {
    const angle = rand() * Math.PI * 2;
    const radius = rand() * 3.2;
    chaffBase.set([Math.cos(angle) * radius, (rand() - 0.5) * 4, Math.sin(angle) * radius, 0.6 + rand() * 1.4], index * 4);
  }
  const chaffGeometry = new THREE.BufferGeometry();
  const chaffPositions = new Float32Array(chaffCount * 3);
  chaffGeometry.setAttribute("position", new THREE.BufferAttribute(chaffPositions, 3));
  const chaffMaterial = new THREE.PointsMaterial({ color: "#e9d4ae", depthWrite: false, opacity: 0, size: 0.05, transparent: true });
  const chaff = new THREE.Points(chaffGeometry, chaffMaterial);
  scene.add(chaff);

  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const spinQuaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const vortex = new THREE.Vector3();
  const color = new THREE.Color();
  const tint = new THREE.Color();
  let narrow = false;

  const update = (minute: number, seconds: number) => {
    const temp = beanTemp(minute);
    const settle = smooth(ROAST_END, ROAST_END + 0.75, minute);
    const swell = 1 + 0.13 * smooth(6.5, 11.5, minute);
    const first = crack(minute, 8);
    const second = crack(minute, 11.8);
    const heatLevel = smooth(95, 226, temp);

    const [r, g, b] = beanColor(minute);
    color.setRGB(r, g, b, THREE.SRGBColorSpace);
    material.roughness = mix(0.82, 0.36, smooth(9.5, 12.2, minute));
    material.clearcoat = 0.7 * smooth(10.6, 12.3, minute);

    beans.forEach((bean, index) => {
      const theta = bean.angle + seconds * bean.speed * (0.35 + heatLevel * 0.9) * (1 - settle) + minute * 0.32;
      const push = 1 + 0.4 * first * Math.sin(bean.phase * 3) ** 2 + 0.28 * second * Math.cos(bean.phase * 2) ** 2;
      const radius = bean.radius * push;
      vortex.set(
        Math.cos(theta) * radius,
        bean.height + 0.28 * Math.sin(seconds * 0.55 + bean.phase) + 0.5 * first * Math.sin(bean.phase),
        Math.sin(theta) * radius
      );
      position.lerpVectors(vortex, bean.heap, settle);

      spinQuaternion.setFromAxisAngle(bean.axis, bean.phase + (seconds * bean.spin + minute * 1.4) * (1 - settle));
      quaternion.copy(spinQuaternion).slerp(bean.heapRotation, settle);
      const size = bean.size * swell;
      scale.set(size, size, size);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);

      tint.copy(color).multiplyScalar(bean.shade);
      mesh.setColorAt(index, tint);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // pelyva: 8. perctől 10,5-ig, felfelé sodródva és ringatózva
    const chaffLife = smooth(7.9, 8.3, minute) * (1 - smooth(9.6, 10.6, minute));
    chaffMaterial.opacity = 0.85 * chaffLife;
    chaff.visible = chaffLife > 0.01;
    if (chaff.visible) {
      const age = Math.max(0, minute - 7.9);
      for (let index = 0; index < chaffCount; index++) {
        const [x, y, z, speed] = chaffBase.subarray(index * 4, index * 4 + 4);
        chaffPositions[index * 3] = x + 0.25 * Math.sin(seconds * 0.8 + index);
        chaffPositions[index * 3 + 1] = y + age * speed * 1.6;
        chaffPositions[index * 3 + 2] = z + 0.25 * Math.cos(seconds * 0.7 + index);
      }
      chaffGeometry.attributes.position.needsUpdate = true;
    }

    // a dob hője alulról izzik; pattanáskor felvillan
    heat.intensity = (14 * heatLevel + 55 * first + 30 * second) * (1 - settle);
    background.setRGB(mix(0.078, 0.11, heatLevel * (1 - settle)), mix(0.059, 0.066, heatLevel), mix(0.043, 0.04, heatLevel), THREE.SRGBColorSpace);
    (scene.fog as THREE.Fog).color.copy(background);

    // a tálca alulról emelkedik be, a kar forog
    tray.visible = settle > 0.001;
    tray.position.y = mix(-4, 0, smooth(0, 0.6, settle));
    arm.rotation.y = seconds * 0.5;

    // kamera: lassú körpálya, a végén föléhajol a tálcának
    const progress = minute / (ROAST_END + 1);
    const azimuth = ((mix(-14, 18, progress) + Math.sin(seconds * 0.12) * 2) * Math.PI) / 180;
    const distance = mix(10, 8.6, settle) * (narrow ? 1.55 : 1);
    camera.position.set(Math.sin(azimuth) * distance, mix(0.6, 4.6, settle), Math.cos(azimuth) * distance);
    camera.lookAt(0, mix(0, -1.9, settle), 0);

    return { temp };
  };

  return {
    update,
    resize(width: number, height: number) {
      narrow = width / Math.max(1, height) < 0.85;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      // A babok ne a szöveg alatt örvényeljenek: asztalin jobbra, telefonon feljebb.
      if (narrow) camera.setViewOffset(width, height, 0, height * 0.2, width, height);
      else camera.setViewOffset(width, height, -width * 0.2, 0, width, height);
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
