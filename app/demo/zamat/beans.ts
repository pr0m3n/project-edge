/**
 * A pörkölés 3D jelenete — kizárólag böngészőben, dinamikusan betöltve.
 *
 * Világos, csendes kompozíció: egy mázas kerámiatál, benne egy kupac kávébab,
 * ami a görgetéssel helyben pörkölődik. Nincs „szálló babfelhő": a babok a
 * tálban maradnak, lassan forog velük a tál, és csak a két pattanásnál ugrik
 * fel néhány — ahogy a dobban is. Az első pattanásnál pelyva (ezüstbőr)
 * száll fel. Sötét pörkölésnél kiül az olaj, fényesebb lesz a felszín.
 *
 * A babgeometria procedurális (domború hát, lapos has, S-ívű barázda),
 * finom zaj-bumpmappel; ~150 bab egyetlen instancolt rajzolásban.
 */

import * as THREE from "three";
import { beanColor, ROAST_END } from "./roast";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Determinisztikus véletlen: minden betöltésnél ugyanaz a kupac. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Kávébab. Hossztengely: z. A −y oldal a domború hát, a +y oldal lapos,
 * rajta a jellegzetes, enyhén S-ívű barázda, ami a végek felé elfogy.
 */
function beanGeometry(detail: number) {
  const geometry = new THREE.SphereGeometry(1, detail, Math.round(detail * 0.7));
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    vertex.fromBufferAttribute(position, index);
    const along = vertex.z;
    // a végek felé kicsit elkeskenyedik (tojásdad, nem ellipszoid)
    const taper = 1 - 0.1 * along * along;
    const x = vertex.x * 0.66 * taper;
    let y = vertex.y;
    if (y < 0) {
      y *= 0.52;
    } else {
      y *= 0.2;
      const offset = x - 0.07 * Math.sin(along * 2.4);
      const fade = 1 - Math.abs(along) ** 3;
      y -= 0.2 * Math.exp(-((offset / 0.07) ** 2)) * fade;
      // a barázda két ajka kicsit kidomborodik
      y += 0.04 * Math.exp(-(((Math.abs(offset) - 0.14) / 0.08) ** 2)) * fade;
    }
    position.setXYZ(index, x, y, along);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Finom, szabálytalan felszín — ettől nem lesz műanyaghatású a bab. */
function noiseTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const image = ctx.createImageData(size, size);
    const rand = random(5);
    for (let index = 0; index < size * size; index++) {
      const value = 110 + rand() * 60;
      image.data.set([value, value, value, 255], index * 4);
    }
    ctx.putImageData(image, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** A tál belső felülete: t = 0 a közép, t = 1 a perem. */
const innerProfile = (t: number) => ({
  r: 0.2 + 3.1 * Math.sin((t * Math.PI) / 2) ** 0.8,
  y: 0.05 + 1.05 * (1 - Math.cos((t * Math.PI) / 2))
});

/** A tál belső aljának magassága egy adott sugárnál (mintavételezéssel). */
function innerHeight(radius: number) {
  let previous = innerProfile(0);
  for (let step = 1; step <= 60; step++) {
    const next = innerProfile(step / 60);
    if (next.r >= radius) {
      const u = (radius - previous.r) / Math.max(1e-6, next.r - previous.r);
      return previous.y + (next.y - previous.y) * Math.max(0, u);
    }
    previous = next;
  }
  return previous.y;
}

/** Mázas kerámiatál: lapos talp, íves fal, kihajló perem. */
function bowlGeometry() {
  const points: THREE.Vector2[] = [];
  for (let step = 0; step <= 24; step++) {
    const { r, y } = innerProfile(step / 24);
    points.push(new THREE.Vector2(r, y));
  }
  // perem, majd vissza a külső falon
  points.push(new THREE.Vector2(3.42, 1.12));
  for (let step = 24; step >= 0; step--) {
    const t = step / 24;
    points.push(new THREE.Vector2(0.45 + 3.05 * Math.sin((t * Math.PI) / 2) ** 0.8, 1.02 * (1 - Math.cos((t * Math.PI) / 2))));
  }
  return new THREE.LatheGeometry(points, 96);
}

type Bean = {
  base: THREE.Vector3;
  rotation: THREE.Quaternion;
  size: number;
  shade: number;
  hue: number;
  hop: number;
  hopAt: number;
  spin: THREE.Vector3;
};

export function createRoastScene(canvas: HTMLCanvasElement, options: { detail: number }) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 80);

  scene.add(new THREE.HemisphereLight("#fffaf2", "#cfc6b8", 1.15));
  const key = new THREE.DirectionalLight("#fff4e6", 2.4);
  key.position.set(-4, 9, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { bottom: -6, left: -6, right: 6, top: 6 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.015;
  const rim = new THREE.DirectionalLight("#ffe2c4", 0.8);
  rim.position.set(6, 3, -5);
  scene.add(key, rim);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ opacity: 0.13 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const turntable = new THREE.Group();
  scene.add(turntable);

  const bowl = new THREE.Mesh(
    bowlGeometry(),
    new THREE.MeshPhysicalMaterial({ clearcoat: 0.6, clearcoatRoughness: 0.35, color: "#f4efe7", roughness: 0.55, side: THREE.DoubleSide })
  );
  bowl.castShadow = true;
  bowl.receiveShadow = true;
  turntable.add(bowl);

  /* babok */
  const bump = noiseTexture();
  const material = new THREE.MeshPhysicalMaterial({
    bumpMap: bump,
    bumpScale: 0.6,
    clearcoat: 0,
    clearcoatRoughness: 0.25,
    roughness: 0.78
  });
  const rand = random(19);
  const beans: Bean[] = [];
  const euler = new THREE.Euler();

  /*
   * Kupac rétegenként: minden réteg egy kicsit szűkebb korong, egy
   * rácsra szórt babokkal. Így a babok egymáson fekszenek, nem lebegnek;
   * a kis egymásba lógást a fölöttük lévők eltakarják.
   */
  const LAYERS = [
    { radius: 2.7, lift: 0.1 },
    { radius: 2.05, lift: 0.3 },
    { radius: 1.35, lift: 0.5 },
    { radius: 0.7, lift: 0.68 }
  ];
  const CELL = 0.37;
  LAYERS.forEach((layer, layerIndex) => {
    const top = layerIndex === LAYERS.length - 1;
    for (let gx = -layer.radius; gx <= layer.radius; gx += CELL) {
      for (let gz = -layer.radius; gz <= layer.radius; gz += CELL) {
        const x = gx + (rand() - 0.5) * CELL * 0.7 + (layerIndex % 2) * CELL * 0.5;
        const z = gz + (rand() - 0.5) * CELL * 0.7 + (layerIndex % 2) * CELL * 0.5;
        const radius = Math.hypot(x, z);
        if (radius > layer.radius - 0.12) continue;
        // a réteg széle lejt: a kupac nem henger, hanem domb
        const edge = 1 - (radius / layer.radius) ** 2;
        const y = innerHeight(radius) + layer.lift * (layerIndex === 0 ? 1 : 0.55 + 0.45 * edge) + 0.02 * rand();
        euler.set((rand() > 0.5 ? 0 : Math.PI) + (rand() - 0.5) * 0.8, rand() * Math.PI * 2, (rand() - 0.5) * 0.8);
        const outer = layerIndex >= LAYERS.length - 2 || radius > layer.radius - 0.5;
        beans.push({
          base: new THREE.Vector3(x, y, z),
          hop: outer && rand() < (top ? 0.5 : 0.12) ? 0.45 + rand() * 0.8 : 0,
          hopAt: rand() * 0.5,
          hue: (rand() - 0.5) * 0.05,
          rotation: new THREE.Quaternion().setFromEuler(euler),
          shade: 0.86 + rand() * 0.24,
          size: 0.2 + rand() * 0.04,
          spin: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize()
        });
      }
    }
  });

  const mesh = new THREE.InstancedMesh(beanGeometry(options.detail), material, beans.length);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  turntable.add(mesh);

  /* pelyva: apró, papírvékony, világos pikkelyek — felszállnak és sodródnak */
  const chaffCount = 60;
  const chaffMesh = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.06, 7),
    new THREE.MeshStandardMaterial({ color: "#d9c39a", roughness: 1, side: THREE.DoubleSide }),
    chaffCount
  );
  const chaff = Array.from({ length: chaffCount }, () => ({
    angle: rand() * Math.PI * 2,
    radius: rand() * 2.2,
    speed: 0.5 + rand() * 0.9,
    sway: rand() * Math.PI * 2,
    size: 0.6 + rand() * 0.9
  }));
  turntable.add(chaffMesh);

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const spin = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  const hsl = { h: 0, l: 0, s: 0 };
  const target = new THREE.Vector3();
  let narrow = false;

  /** Pattanás: a pillanatban 1, fél perc alatt lecseng. */
  const crackPulse = (minute: number, at: number, offset: number) => {
    const local = minute - at - offset;
    return local < 0 || local > 0.45 ? 0 : Math.sin((local / 0.45) * Math.PI);
  };

  const update = (minute: number, seconds: number) => {
    const swell = 1 + 0.12 * smooth(6.5, 11.5, minute);
    const [r, g, b] = beanColor(minute);
    material.roughness = mix(0.8, 0.38, smooth(9.8, 12.2, minute));
    material.clearcoat = 0.65 * smooth(10.8, 12.3, minute);
    material.bumpScale = mix(0.6, 0.25, smooth(8, 12, minute));

    beans.forEach((bean, index) => {
      const hop = bean.hop ? Math.max(crackPulse(minute, 8, bean.hopAt), crackPulse(minute, 11.8, bean.hopAt * 0.6)) * bean.hop : 0;
      position.copy(bean.base);
      position.y += hop;
      spin.setFromAxisAngle(bean.spin, hop * 5);
      quaternion.copy(bean.rotation).premultiply(spin);
      scale.setScalar(bean.size * swell);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);

      color.setRGB(r, g, b, THREE.SRGBColorSpace);
      color.getHSL(hsl);
      color.setHSL(hsl.h + bean.hue, hsl.s, Math.min(1, hsl.l * bean.shade));
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    // pelyva az első pattanástól kb. két percig
    const life = smooth(7.9, 8.2, minute) * (1 - smooth(9.4, 10.3, minute));
    chaffMesh.visible = life > 0.01;
    if (chaffMesh.visible) {
      const age = Math.max(0, minute - 7.9);
      chaff.forEach((flake, index) => {
        const rise = age * flake.speed * 1.4;
        position.set(
          Math.cos(flake.angle + rise * 0.4) * (flake.radius + rise * 0.3),
          1.2 + rise + 0.1 * Math.sin(seconds * 1.3 + flake.sway),
          Math.sin(flake.angle + rise * 0.4) * (flake.radius + rise * 0.3)
        );
        euler.set(seconds * 0.9 + flake.sway, seconds * 0.6 + index, 0);
        quaternion.setFromEuler(euler);
        scale.setScalar(flake.size * life);
        matrix.compose(position, quaternion, scale);
        chaffMesh.setMatrixAt(index, matrix);
      });
      chaffMesh.instanceMatrix.needsUpdate = true;
    }

    // a tál lassan forog; a görgetés is forgatja, hogy legyen mozgás
    turntable.rotation.y = minute * 0.16 + seconds * 0.04;

    const cooling = smooth(ROAST_END, ROAST_END + 0.8, minute);
    const azimuth = ((mix(-10, 12, minute / (ROAST_END + 1)) + Math.sin(seconds * 0.12) * 1.5) * Math.PI) / 180;
    const elevation = (mix(34, 50, cooling) * Math.PI) / 180;
    const distance = (narrow ? 25 : 14) - 1 * smooth(4, 10, minute);
    target.set(0, 0.7, 0);
    camera.position.set(
      Math.sin(azimuth) * Math.cos(elevation) * distance,
      target.y + Math.sin(elevation) * distance,
      Math.cos(azimuth) * Math.cos(elevation) * distance
    );
    camera.lookAt(target);
  };

  return {
    update,
    resize(width: number, height: number) {
      narrow = width / Math.max(1, height) < 0.85;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
      // A tál ne a szöveg alatt álljon: asztalin jobbra, telefonon feljebb.
      if (narrow) camera.setViewOffset(width, height, 0, height * 0.2, width, height);
      else camera.setViewOffset(width, height, -width * 0.2, height * 0.07, width, height);
    },
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      bump.dispose();
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
