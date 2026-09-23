/**
 * Forgatható 3D kávészacskó a termékoldalon — böngészőben, dinamikusan.
 *
 * A tasak egy sűrűn osztott dobozból készül: fölül a hegesztésnél
 * ellapul, középen kidomborodik, alul talpasan kiszélesedik. Az előlapra a
 * BagArt-tal azonos kiosztású címke kerül (canvas-textúra, a termékadatból),
 * a hátlapra a pörkölés napja és a tételszám.
 */

import * as THREE from "three";
import type { Product } from "./data";
import { beanColor, formatStamp, roastDays, toHex } from "./roast";
import { labelRegion, labelTitle, roastLevel } from "./BagArt";

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

const BAG_W = 2.2;
const BAG_H = 3.66; // a BagArt 132 × 220-as tasakjának aránya
const BAG_D = 0.78;

function bagGeometry() {
  const geometry = new THREE.BoxGeometry(BAG_W, BAG_H, BAG_D, 28, 40, 8);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < position.count; index++) {
    vertex.fromBufferAttribute(position, index);
    const t = (vertex.y + BAG_H / 2) / BAG_H; // 0 = talp, 1 = tető
    const across = vertex.x / (BAG_W / 2);
    // fölfelé elvékonyodik, a hegesztésnél lapos
    let depth = 1 - 0.93 * smooth(0.4, 0.9, t);
    if (t > 0.9) depth = 0.05;
    let z = vertex.z * depth;
    // az elő- és hátlap középen kidomborodik
    if (Math.abs(vertex.z) > 0.01 && t < 0.9) z += Math.sign(vertex.z) * 0.1 * Math.sin(Math.PI * Math.min(1, t / 0.9)) * (1 - across * across);
    // talpas alj: a legalsó sávban kicsit szélesebb
    const x = vertex.x * (1 + 0.035 * (1 - smooth(0, 0.12, t)));
    position.setXYZ(index, x, vertex.y, z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

type Fonts = { display: string; mono: string; sans: string };

/** A BagArt SVG-koordinátáiban rajzol (tasak: x 44–176, y 36–256). */
function frontLabel(product: Product, fonts: Fonts) {
  const scale = 7.76;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(132 * scale);
  canvas.height = Math.round(220 * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(scale, scale);
  ctx.translate(-44, -36);

  const body = ctx.createLinearGradient(44, 0, 176, 0);
  body.addColorStop(0, "#15110e");
  body.addColorStop(0.5, "#221d19");
  body.addColorStop(1, "#15110e");
  ctx.fillStyle = body;
  ctx.fillRect(44, 36, 132, 220);
  ctx.fillStyle = "#0c0a08";
  ctx.fillRect(44, 36, 132, 20);
  ctx.fillStyle = "#2b2622";
  for (let line = 0; line < 7; line++) ctx.fillRect(46, 39 + line * 2.2, 128, 1);
  ctx.beginPath();
  ctx.arc(110, 76, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#0c0a08";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(110, 76, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#2b2622";
  ctx.fill();

  ctx.fillStyle = product.palette.label;
  ctx.fillRect(48, 96, 124, 148);
  ctx.fillStyle = product.palette.body;
  ctx.fillRect(48, 96, 124, 22);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff";
  ctx.font = `500 7.5px ${fonts.mono}`;
  ctx.fillText("ZAMAT", 56, 110);
  ctx.textAlign = "right";
  ctx.font = `500 6.5px ${fonts.mono}`;
  ctx.fillText(product.lot, 164, 110);
  ctx.textAlign = "left";

  const title = labelTitle(product);
  ctx.fillStyle = "#17120e";
  ctx.font = `800 30px ${fonts.display}`;
  const measured = ctx.measureText(title).width;
  ctx.save();
  if (measured > 108) {
    ctx.translate(56, 0);
    ctx.scale(108 / measured, 1);
    ctx.fillText(title, 0, 150);
  } else {
    ctx.fillText(title, 56, 150);
  }
  ctx.restore();

  ctx.fillStyle = "#5b5048";
  ctx.font = `500 7.5px ${fonts.mono}`;
  ctx.fillText(labelRegion(product).toUpperCase(), 56, 163);
  ctx.font = `500 6px ${fonts.mono}`;
  ctx.fillText("PÖRKÖLÉS", 56, 184);

  const level = roastLevel(product);
  const roastHex = toHex(beanColor(product.drop ?? 10));
  for (let dot = 0; dot < 5; dot++) {
    if (dot < level) {
      ctx.fillStyle = roastHex;
      ctx.fillRect(56 + dot * 17, 189, 14, 8);
    } else {
      ctx.strokeStyle = "#b9afa4";
      ctx.lineWidth = 1;
      ctx.strokeRect(56.5 + dot * 17, 189.5, 13, 7);
    }
  }

  ctx.fillStyle = "#17120e";
  ctx.font = `400 7px ${fonts.sans}`;
  ctx.fillText(product.notes.slice(0, 3).join(" · "), 56, 214);
  ctx.fillStyle = "rgba(23,18,14,0.2)";
  ctx.fillRect(56, 224, 108, 0.6);
  ctx.fillStyle = "#5b5048";
  ctx.font = `500 6.5px ${fonts.mono}`;
  ctx.fillText(`250 G · ${product.process.toUpperCase()}`, 56, 236);
  return canvas;
}

function backLabel(product: Product, fonts: Fonts) {
  const scale = 7.76;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(132 * scale);
  canvas.height = Math.round(220 * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#1d1916";
  ctx.fillRect(0, 0, 132, 220);
  ctx.fillStyle = "#0c0a08";
  ctx.fillRect(0, 0, 132, 20);

  ctx.fillStyle = "#efe9df";
  ctx.fillRect(14, 70, 104, 110);
  ctx.fillStyle = "#17120e";
  ctx.font = `500 6px ${fonts.mono}`;
  const rows: [string, string][] = [
    ["PÖRKÖLVE", formatStamp(roastDays(new Date(), 1)[0])],
    ["TÉTEL", product.lot],
    ["TERMELŐ", product.producer],
    ["FARM", product.farm],
    ["FELDOLGOZÁS", product.process],
    ["MAGASSÁG", product.altitude]
  ];
  rows.forEach(([key, value], index) => {
    const y = 86 + index * 14;
    ctx.fillStyle = "#7a6f66";
    ctx.fillText(key, 20, y);
    ctx.fillStyle = "#17120e";
    ctx.textAlign = "right";
    ctx.fillText(value.length > 22 ? `${value.slice(0, 21)}…` : value, 112, y);
    ctx.textAlign = "left";
  });
  ctx.fillStyle = "#efe9df";
  ctx.font = `800 13px ${fonts.display}`;
  ctx.fillText("ZAMAT KÁVÉPÖRKÖLŐ", 14, 200);
  ctx.font = `500 5.5px ${fonts.mono}`;
  ctx.fillStyle = "#a79d93";
  ctx.fillText("BUDAPEST · KŐBÁNYAI ÚT 31.", 14, 209);
  return canvas;
}

function contactShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(0,0,0,0.42)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new THREE.CanvasTexture(canvas);
}

export function createBagViewer(canvas: HTMLCanvasElement, product: Product, fonts: Fonts, zoom = 1) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 50);
  camera.position.set(0, 0.5, 11.2);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight("#ffffff", "#8f857a", 1.1));
  const key = new THREE.DirectionalLight("#fff4e6", 2.4);
  key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight("#ffd2a8", 1.4);
  rim.position.set(-5, 2, -3);
  scene.add(key, rim);

  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  const texture = (source: HTMLCanvasElement) => {
    const map = new THREE.CanvasTexture(source);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = anisotropy;
    return map;
  };
  const side = new THREE.MeshStandardMaterial({ color: "#1b1714", roughness: 0.78 });
  const front = new THREE.MeshStandardMaterial({ map: texture(frontLabel(product, fonts)), roughness: 0.72 });
  const back = new THREE.MeshStandardMaterial({ map: texture(backLabel(product, fonts)), roughness: 0.72 });
  const materials = [side, side, side, side, front, back];
  const bag = new THREE.Mesh(bagGeometry(), materials);
  const pivot = new THREE.Group();
  pivot.add(bag);
  scene.add(pivot);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.6), new THREE.MeshBasicMaterial({ depthWrite: false, map: contactShadow(), transparent: true }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -BAG_H / 2 - 0.01;
  scene.add(shadow);

  return {
    setRotation(yaw: number, pitch: number) {
      pivot.rotation.set(pitch, yaw, 0);
    },
    /** Címke csere újraépítés nélkül (a hero termékváltójához). */
    setProduct(next: Product) {
      for (const [material, draw] of [
        [front, frontLabel],
        [back, backLabel]
      ] as const) {
        material.map?.dispose();
        material.map = texture(draw(next, fonts));
        material.needsUpdate = true;
      }
    },
    resize(width: number, height: number) {
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.position.z = (camera.aspect < 0.8 ? 13.5 : 11.2) / zoom;
      camera.updateProjectionMatrix();
    },
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      scene.traverse((object) => {
        const item = object as THREE.Mesh;
        item.geometry?.dispose();
        const itemMaterial = item.material as THREE.Material | THREE.Material[] | undefined;
        const list = Array.isArray(itemMaterial) ? itemMaterial : itemMaterial ? [itemMaterial] : [];
        for (const entry of list) {
          (entry as THREE.MeshStandardMaterial).map?.dispose();
          entry.dispose();
        }
      });
      renderer.dispose();
    }
  };
}
