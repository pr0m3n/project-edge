"use client";

import { useEffect, useRef } from "react";

/**
 * A heró mozgó háttere — „Silk Aurora".
 *
 * A GLSL a Silk Aurora shaderből származik (componentry.fun, a szerző saját
 * regisztere), a React/Tailwind burok nélkül: itt egyetlen `<canvas>` és sima
 * WebGL, mert ennek az oldalnak nincs se Tailwindje, se framer-motionja.
 *
 * Ha nincs WebGL, a komponens nem rajzol semmit — és a `.home-hero` eredeti
 * színátmenetes háttere marad látszó. Ezért NEM szabad azt a hátteret
 * kivenni a CSS-ből: az itt a tartalék.
 */

const VERTEX_SHADER = `
attribute vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_res;
uniform vec2 u_mouse;
uniform float u_time;
uniform float u_speed;
uniform float u_intensity;
uniform float u_grain;
uniform float u_vignette;
uniform float u_mouseInfluence;
uniform vec3 u_base;
uniform vec3 u_mid;
uniform vec3 u_sheen;
uniform vec3 u_accent;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.93, 289.17))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.82, 0.57, -0.57, 0.82);

  for (int i = 0; i < 5; i++) {
    value += amp * noise(p);
    p = rot * p * 2.03;
    amp *= 0.5;
  }

  return value;
}

float ribbon(vec2 p, float offset, float width, float softness) {
  float y = p.y + sin(p.x * 1.8 + offset) * 0.18;
  y += sin(p.x * 4.2 - offset * 0.7) * 0.045;
  return smoothstep(width + softness, width, abs(y));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

  vec2 mouse = (u_mouse - 0.5) * vec2(aspect, 1.0);
  float t = u_time * 0.12 * u_speed;
  float pointerFalloff = smoothstep(0.72, 0.0, length(p - mouse));
  p += (mouse - p) * pointerFalloff * 0.05 * u_mouseInfluence;

  vec2 silk = p;
  silk.x += fbm(p * 1.6 + vec2(t * 0.8, -t * 0.35)) * 0.16;
  silk.y += fbm(p * 2.2 + vec2(-t * 0.25, t * 0.7)) * 0.10;

  float veilA = ribbon(silk + vec2(-0.18, 0.08), t * 2.1, 0.055, 0.22);
  float veilB = ribbon(silk * vec2(0.86, 1.18) + vec2(0.2, -0.14), -t * 2.8 + 1.7, 0.038, 0.18);
  float veilC = ribbon(silk * vec2(1.18, 0.9) + vec2(-0.08, 0.24), t * 1.4 - 2.1, 0.03, 0.16);

  float atmosphere = fbm(p * 1.35 + vec2(t * 0.22, -t * 0.1));
  float pearlescent = pow(max(0.0, sin((p.x - p.y) * 7.5 + atmosphere * 4.0 - t * 2.5)), 5.0);
  float glint = pow(max(0.0, noise(gl_FragCoord.xy * 0.065 + t * 18.0) - 0.72), 5.0);

  vec3 col = u_base;
  col = mix(col, u_mid, smoothstep(-0.45, 0.75, p.y + atmosphere * 0.75));
  col += u_accent * veilA * 0.72 * u_intensity;
  col += u_sheen * veilB * 0.64 * u_intensity;
  col += mix(u_sheen, u_accent, 0.35) * veilC * 0.42 * u_intensity;
  col += u_sheen * pearlescent * 0.075 * u_intensity;
  col += vec3(1.0, 0.93, 0.82) * glint * 0.22 * u_intensity;
  col += u_sheen * pointerFalloff * 0.08 * u_mouseInfluence;

  float vignette = smoothstep(1.25, 0.22, length(p));
  col *= mix(1.0 - u_vignette * 0.42, 1.06, vignette);

  float grain = (hash(gl_FragCoord.xy + t * 90.0) - 0.5) * 0.08 * u_grain;
  col += grain;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

/* A paletta az oldal saját tokenjeiből:
   accent = --ember (#ff5722) viszi a legerősebb szalagot,
   sheen  = --aqua  (#76abae) a gyöngyházfényt és a csillanást. */
const BASE: [number, number, number] = [0x08 / 255, 0x0c / 255, 0x10 / 255];
const MID: [number, number, number] = [0x18 / 255, 0x22 / 255, 0x2a / 255];
const SHEEN: [number, number, number] = [0x76 / 255, 0xab / 255, 0xae / 255];
const ACCENT: [number, number, number] = [0xff / 255, 0x57 / 255, 0x22 / 255];

const SPEED = 0.8;
const INTENSITY = 0.62;
const GRAIN = 0.8;
const VIGNETTE = 1;

export function HeroAurora() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
    if (!gl) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* Egérkövetés csak ott, ahol tényleg van egér. Érintőn a `pointermove`
       görgetés közben is szól, és a háttér elkezdene csúszkálni a hüvelykujj
       alatt — az nem finomság, hanem zaj. */
    const hasHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const position = gl.getAttribLocation(program, "position");
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u("u_res");
    const uMouse = u("u_mouse");
    const uTime = u("u_time");

    gl.uniform1f(u("u_speed"), reducedMotion ? 0 : SPEED);
    gl.uniform1f(u("u_intensity"), INTENSITY);
    gl.uniform1f(u("u_grain"), GRAIN);
    gl.uniform1f(u("u_vignette"), VIGNETTE);
    gl.uniform1f(u("u_mouseInfluence"), hasHover && !reducedMotion ? 1 : 0);
    gl.uniform3f(u("u_base"), BASE[0], BASE[1], BASE[2]);
    gl.uniform3f(u("u_mid"), MID[0], MID[1], MID[2]);
    gl.uniform3f(u("u_sheen"), SHEEN[0], SHEEN[1], SHEEN[2]);
    gl.uniform3f(u("u_accent"), ACCENT[0], ACCENT[1], ACCENT[2]);

    const resize = () => {
      /* Telefonon 1-re fogott pixelarány. Ez egy TELJES képernyős fragment
         shader, ötoktávos fbm-mel: retina mobilon a 2-es arány négyszer annyi
         pixelt jelentene, és ott a legkevesebb a GPU meg az akku. Ránézésre
         nincs különbség, mert a kép amúgy is lágy, felhőszerű. */
      const mobile = window.matchMedia("(max-width: 980px)").matches;
      const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 2);
      const { width, height } = host.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    const mouse = { x: 0.5, y: 0.5 };
    const target = { x: 0.5, y: 0.5 };

    const onPointerMove = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      target.x = (event.clientX - rect.left) / rect.width;
      target.y = 1 - (event.clientY - rect.top) / rect.height;
    };
    const onPointerLeave = () => {
      target.x = 0.5;
      target.y = 0.5;
    };

    if (hasHover) {
      host.addEventListener("pointermove", onPointerMove);
      host.addEventListener("pointerleave", onPointerLeave);
    }

    const draw = (elapsed: number) => {
      mouse.x += (target.x - mouse.x) * 0.045;
      mouse.y += (target.y - mouse.y) * 0.045;
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uTime, elapsed);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    canvas.classList.add("is-ready");

    /* Csökkentett mozgás mellett egyetlen állókép, aztán vége: nem elég a
       sebességet nullázni, mert a rajzolás költsége akkor is megmarad. */
    if (reducedMotion) {
      draw(8);
      return () => {
        resizeObserver.disconnect();
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
      };
    }

    /* Amíg a heró nem látszik (elgörgettek, vagy más fülön vannak), nem
       rajzolunk. Telefonon a heró másfél képernyő után elhagyja a nézetet,
       tehát a látogatás nagyobbik felében ez teljesen leáll. */
    let onScreen = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    observer.observe(host);

    let frame = 0;
    const start = performance.now();
    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (!onScreen || document.hidden) return;
      draw((now - start) / 1000);
    };
    frame = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver.disconnect();
      if (hasHover) {
        host.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerleave", onPointerLeave);
      }
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas aria-hidden="true" className="hero-aurora" ref={canvasRef} />;
}
