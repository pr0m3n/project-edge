"use client";

import { useEffect, useRef } from "react";

/**
 * Mozgó háttér sötét szekciók alá — három arcban.
 *
 * A `HeroAurora` testvére: ugyanaz a felállás (egy `<canvas>`, sima WebGL,
 * se Tailwind, se animációs könyvtár), csak itt nincs egérkövetés, viszont
 * VAN késleltetett indulás.
 *
 * MIÉRT KÉSLELTETETT: ezekből egy oldalon több is fut (a főoldalon a
 * `.manifesto` és a `.no-call`), a heróban pedig már ott az auróra. Minden
 * shader egy külön WebGL kontextus, amiből a böngésző véges számút ad. Ezért
 * a kontextus csak akkor épül fel, amikor a szekció 300px-re megközelíti a
 * nézetet — aki a herónál elpattan, egyet sem fizet meg belőlük.
 *
 * A HÁTTÉR MINDIG TARTALÉKOS. Ha nincs WebGL, a komponens nem rajzol semmit,
 * és a szekció CSS-háttere marad látszó — azt tehát NEM szabad kivenni.
 */

type Variant = "waves" | "halftone" | "shadow" | "mesh";

const VERTEX_SHADER = `
attribute vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

/* Közös zajkészlet — ugyanaz a hash/noise/fbm hármas, mint az aurórában. */
const NOISE = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;

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
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);

  for (int i = 0; i < 5; i++) {
    value += amp * noise(p);
    p = rot * p * 2.02;
    amp *= 0.5;
  }

  return value;
}
`;

/* A paletta végig az oldal tokenjeiből: --night (#11171c), --ink (#303841),
   --ember (#ff5722), --aqua (#76abae). A forrásminták kékek voltak; kék
   nélkül maradnak, különben az oldalnak lenne egy negyedik színcsaládja. */
const FRAGMENT_SHADERS: Record<Variant, string> = {
  /* „Árnyékos" — két eltérő léptékű fbm sodródik egymáson. Ez a legcsendesebb
     a háromból: gyakorlatilag a szekció eddigi színátmenete, csak él. */
  shadow:
    NOISE +
    `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * 0.045;

  float a = fbm(p * 1.15 + vec2(t, -t * 0.6));
  float b = fbm(p * 2.30 + vec2(-t * 0.8, t * 0.4));
  float f = smoothstep(0.16, 0.94, a * 0.74 + b * 0.32);

  vec3 col = mix(vec3(0.055, 0.078, 0.098), vec3(0.196, 0.235, 0.263), f);
  col += vec3(0.463, 0.671, 0.682) * pow(f, 3.0) * 0.11;

  float vignette = smoothstep(1.35, 0.25, length(p));
  col *= mix(0.70, 1.07, vignette);
  col += (hash(gl_FragCoord.xy + u_time * 60.0) - 0.5) * 0.045;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,

  /* „Raszteres" — egy lágy fénymező alatt elforgatott pontrács, a pont sugara
     a fényből jön. Ez a leghangosabb; a `.no-call` fátyla nélkül megeszi a
     szöveget, lásd a CSS-ben a `.no-call-scrim`-et. */
  halftone:
    NOISE +
    `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * 0.10;

  float f = fbm(p * 1.25 + vec2(t * 0.9, -t * 0.5));
  f += 0.60 * smoothstep(0.95, 0.0, length(p - vec2(sin(t * 0.70) * 0.42, cos(t * 0.55) * 0.26)));
  f += 0.35 * smoothstep(0.75, 0.0, length(p - vec2(cos(t * 0.43) * -0.5, sin(t * 0.61) * 0.22)));
  f = clamp(f * 0.92, 0.0, 1.35);

  /* A rács ferde, mint a nyomdai raszter: vízszintesen a képernyő
     pixelrácsával interferálna, és hullámos moaré-mintát adna. */
  float angle = 0.5;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  float cell = max(u_res.y, 1.0) / 46.0;
  vec2 grid = rot * gl_FragCoord.xy / cell;
  float d = length(fract(grid) - 0.5);
  float radius = clamp(f, 0.0, 1.0) * 0.54;
  float dots = smoothstep(radius, radius - 0.12, d);

  vec3 ink = mix(vec3(1.0, 0.341, 0.133), vec3(0.463, 0.671, 0.682), clamp(uv.y * 1.2, 0.0, 1.0));
  vec3 col = vec3(0.043, 0.063, 0.078) + ink * dots * (0.30 + f * 0.60);
  col += ink * pow(clamp(f, 0.0, 1.0), 4.0) * 0.07;
  col += (hash(gl_FragCoord.xy + u_time * 40.0) - 0.5) * 0.03;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,

  /* „Mesh drift" — három lassan vándorló gócpont, fbm-mel elhajlítva. A
     főoldali brief alatt fut, ahol eddig két CSS-folt utánozta ugyanezt kék-
     lilában: a gócok itt ember és aqua, tehát a szakasz végre a többi oldalhoz
     tartozik. Szándékosan a leglágyabb a négyből — a brief alatt űrlap van, ott
     a háttér ne akarjon szerepelni. */
  mesh:
    NOISE +
    `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * 0.055;

  vec2 c1 = vec2(sin(t * 0.90) * 0.42, cos(t * 0.72) * 0.30);
  vec2 c2 = vec2(cos(t * 0.61) * -0.52, sin(t * 0.83) * 0.26);
  vec2 c3 = vec2(sin(t * 0.47 + 1.7) * 0.30, cos(t * 0.55 + 0.8) * -0.34);

  /* A gócok köré tekert zaj nélkül szabályos, tojásdad foltok lennének —
     ettől lesz belőle sodródó köd. */
  vec2 q = p + (fbm(p * 1.3 + vec2(t, -t * 0.6)) - 0.5) * 0.30;

  float a = smoothstep(0.86, 0.0, length(q - c1));
  float b = smoothstep(0.72, 0.0, length(q - c2));
  float c = smoothstep(0.95, 0.0, length(q - c3));

  vec3 col = vec3(0.043, 0.063, 0.078);
  col = mix(col, vec3(1.0, 0.341, 0.133), a * 0.40);
  col = mix(col, vec3(0.463, 0.671, 0.682), b * 0.38);
  col = mix(col, vec3(0.176, 0.243, 0.267), c * 0.55);
  col += vec3(1.0, 0.45, 0.22) * pow(a, 3.0) * 0.18;
  col += vec3(0.463, 0.671, 0.682) * pow(b, 3.0) * 0.15;

  float vignette = smoothstep(1.45, 0.25, length(p));
  col *= mix(0.62, 1.05, vignette);
  col += (hash(gl_FragCoord.xy + u_time * 55.0) - 0.5) * 0.035;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,

  /* „Hullámos" — egymásra rakott szinuszok egy fbm-mel megtört vízszintes
     határon, a taréjon meleg fénnyel. A durva szemcse itt nem hiba: ez adja
     a minta nyomatszerű karakterét, ezért marad benne. */
  waves:
    NOISE +
    `
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / max(u_res.y, 1.0);
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float t = u_time * 0.09;

  float w = p.y;
  w += sin(p.x * 2.1 + t * 1.6) * 0.13;
  w += sin(p.x * 4.7 - t * 1.1) * 0.055;
  w += fbm(p * 1.4 + vec2(t * 0.5, -t * 0.3)) * 0.38;

  float band = smoothstep(-0.58, 0.52, w);
  vec3 col = mix(vec3(0.043, 0.063, 0.078), vec3(0.176, 0.243, 0.267), band);

  float crest = smoothstep(0.40, 0.60, band) * (1.0 - smoothstep(0.60, 0.88, band));
  col += mix(vec3(1.0, 0.341, 0.133), vec3(0.463, 0.671, 0.682), clamp(uv.x * 0.9, 0.0, 1.0)) * crest * 1.15;
  col += vec3(0.463, 0.671, 0.682) * pow(band, 4.0) * 0.38;

  /* A szemcse képkockánként lép, nem pixelenként folyamatos: így nem
     sercegő zaj lesz belőle, hanem nyomdai szemcse. */
  col += (hash(gl_FragCoord.xy + floor(u_time * 24.0)) - 0.5) * 0.20 * (1.0 - abs(band - 0.5) * 0.75);

  float vignette = smoothstep(1.42, 0.30, length(p));
  col *= mix(0.76, 1.05, vignette);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`
};

export function ShaderBackdrop({ variant }: { variant: Variant }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    let cancelled = false;
    let dispose: (() => void) | undefined;

    /* A tényleges felépítés. Csak az első közelítéskor fut le, és a saját
       takarítóját adja vissza. */
    const build = (): (() => void) | undefined => {
      const gl = canvas.getContext("webgl", { antialias: false, alpha: false });
      if (!gl) return;

      /* Visszavonási verem. MIÉRT NEM SOROLJUK FEL A VÉGÉN: a fordítás és a
         linkelés is elbukhat (öreg driver, elfogyott WebGL-kontextus), és
         olyankor a `build()` üres kézzel tér vissza — a külső takarító tehát
         sosem fut le. Ha minden lefoglalás rögtön mellérakja a maga
         elengedését, a hibás ág is tisztán zár. */
      const undo: Array<() => void> = [];
      const teardown = () => {
        while (undo.length) undo.pop()?.();
      };

      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          gl.deleteShader(shader);
          return null;
        }
        undo.push(() => gl.deleteShader(shader));
        return shader;
      };

      const vertexShader = compile(gl.VERTEX_SHADER, VERTEX_SHADER);
      const fragmentShader = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADERS[variant]);
      if (!vertexShader || !fragmentShader) {
        teardown();
        return;
      }

      const program = gl.createProgram();
      if (!program) {
        teardown();
        return;
      }
      undo.push(() => gl.deleteProgram(program));
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        teardown();
        return;
      }
      gl.useProgram(program);

      const position = gl.getAttribLocation(program, "position");
      const buffer = gl.createBuffer();
      undo.push(() => gl.deleteBuffer(buffer));
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      const uRes = gl.getUniformLocation(program, "u_res");
      const uTime = gl.getUniformLocation(program, "u_time");

      const resize = () => {
        /* Telefonon 1-es pixelarány — ugyanaz az indok, mint az aurórában:
           teljes képernyős fragment shader, ötoktávos fbm, és pont ott a
           legkevesebb a GPU. A szemcse amúgy is elfedi a különbséget. */
        const mobile = window.matchMedia("(max-width: 980px)").matches;
        const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1 : 1.5);
        const width = host.clientWidth || Math.floor(host.getBoundingClientRect().width);
        const height = host.clientHeight || Math.floor(host.getBoundingClientRect().height);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);
      };

      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      undo.push(() => resizeObserver.disconnect());

      const draw = (elapsed: number) => {
        gl.uniform1f(uTime, elapsed);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      };

      const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      let onScreen = true;
      let frame = 0;
      const start = performance.now();

      const render = (now: number) => {
        frame = requestAnimationFrame(render);
        draw((now - start) / 1000);
      };

      /* A hurok TÉNYLEG leáll — nem csak a rajzolás marad el benne, ahogy az
         auróránál. Ott egy shader fut egy oldalon; itt kettő is lehet, és egy
         üresen pörgő `requestAnimationFrame` is ébren tartja a lapot.
         Csökkentett mozgás mellett egyetlen állókép marad a vásznon, és azt a
         beállítást menet közben is követjük. */
      const sync = () => {
        const running = onScreen && !motionQuery.matches;
        if (running && !frame) {
          frame = requestAnimationFrame(render);
        } else if (!running && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
        if (motionQuery.matches) draw(8);
      };

      undo.push(() => {
        if (frame) cancelAnimationFrame(frame);
      });
      motionQuery.addEventListener("change", sync);
      undo.push(() => motionQuery.removeEventListener("change", sync));

      const observer = new IntersectionObserver(([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      });
      observer.observe(host);
      undo.push(() => observer.disconnect());

      canvas.classList.add("is-ready");
      sync();

      return teardown;
    };

    /* A `cancelled` nem óvatoskodás: a megfigyelő visszahívása egy külön
       feladatban fut, tehát elvben az effect takarítása UTÁN is elsülhet. Ha
       akkor épülne fel a WebGL, a takarítója már senki nem hívná meg. */
    const primer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || cancelled) return;
        primer.disconnect();
        dispose = build();
      },
      { rootMargin: "300px" }
    );
    primer.observe(host);

    return () => {
      cancelled = true;
      primer.disconnect();
      dispose?.();
    };
  }, [variant]);

  return <canvas aria-hidden="true" className={`shader-backdrop ${variant}`} ref={canvasRef} />;
}
