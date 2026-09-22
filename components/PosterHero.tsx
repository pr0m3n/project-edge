"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./poster-hero.module.css";

/* A ceruzahegy helye a FORRÁSKÉP koordinátáiban (1774×887). Innen indul a
   feloldódás és onnan terjed kifelé — a rajzolás pontjából, nem a kép
   szélétől. A korábbi balról jobbra futó sáv az ujjaktól az alkar felé
   haladt, így az utolsó harmada már csupasz karon söpört végig. */
/* MÉRT érték, nem becslés: a képadatban a (440..780, 400..620) ablak legbalsó
   elég világos pixele. A korábbi (612, 495) a háttéren ült — ott a fényesség
   16, vagyis a feloldódás és a ceruzavonal is 44px-rel a hegy MELLŐL indult. */
const TIP_X = 568;
const TIP_Y = 499;

/* Mobilon lassabb és később indul. Két oka van. A kéz beúszása (`hand-in`,
   0.25s késleltetés + 1.2s) 1450ms-ig tart — 900ms-nál a feloldódás még a
   mozgó képre startolt rá. A másik: telefonon a kép erősen ki van vágva
   (760px-es render egy 390px-es nézetben), ezért a gyűrű sokkal hamarabb
   kiér a látható területről, mint desktopon. */
const SWEEP_DESKTOP_MS = 4600;
const SWEEP_MOBILE_MS = 5600;
const IDLE_MS = 2400;
const START_DELAY_DESKTOP_MS = 1600;
const START_DELAY_MOBILE_MS = 2400;

/* Szétszórás. Az első kísérlet négy alrétegre osztotta a cellákat, és
   rétegenként tolta el őket — de egy réteg MEREV TÖMBKÉNT mozdul, tehát négy
   csúszó sávot lehetett látni, nem szétszóródást. Most minden cella külön
   részecske: saját iránnyal, sebességgel és élettartammal.

   A részecske akkor „szabadul el", amikor a feloldódás frontja eléri — a
   szétszóródás így magától követi a frontot, nem egyszerre indul mindenhol. */
const SCATTER_SPREAD = 340;
const RELEASE_LEAD = 170;
const RELEASE_SPAN = 0.5;

/* A két gyűrű szándékosan nem egyforma. Korábban ugyanaz a gradiens maszkolta
   a fotó törlését és az ASCII-t, ezért pont ott tűnt el a kép, ahol a
   karakterek a legritkábbak voltak — az eredmény egy sötét lyuk lett, nem
   átalakulás. Az ASCII-gyűrű most szélesebb: a karakterek előbb jelennek meg,
   mint ahogy a fotó halványulni kezd, és tovább maradnak. */
const ERASE_BAND = 300;
const ASCII_BAND = 470;

/* Nem 1: a fotó szelleme ott marad a karakterek alatt. Ettől lesz belőle
   feloldódás és nem kivágás. CSAK a ciklusra igaz — görgetésnél teljes a
   törlés, mert ott a képnek el kell TŰNNIE, és ez a 18% maradék volt az, ami
   halvány szellemképként ottmaradt a kéz helyén. */
const ERASE_MAX = 0.82;
const ERASE_MAX_SCROLL = 1;

/* A görgetés most csak TRIGGER, nem lejátszófej. Ha a hero 17%-kal elindult
   felfelé, a befejezés saját idővonalon fut végig; visszafelé csak 4% alatt
   áll alaphelyzetbe. Ez a két külön küszöb a hiszterézis: a trackpad gyors
   oda-vissza mozdulatai nem tudják rángatni az animációt. */
const SCROLL_TRIGGER = 0.17;
const SCROLL_RESET = 0.04;
const SCROLL_FINISH_MS = 2400;
const SCROLL_RETURN_MS = 1100;
const TAIL_FADE = 0.22;

/* A ceruzahegytől a legtávolabbi sarok ~1263px; ennyi + a sáv, hogy a gyűrű
   hátulja is kifusson a képből. */
const MAX_R = 1320 + ERASE_BAND;

/* A gyűrű középpontja MENET KÖZBEN vándorol jobbra. Enélkül a feloldódás egy
   helyben táguló kör volt: a ceruzahegynél egyszerűen „ott termett”. Így
   viszont van iránya — jobbra sodródik a kézen és az alkaron végig. */
const DRIFT_X = 820;

/* Be- és kifutó burkológörbe a gyűrű erősségén. Ez az, ami miatt nem
   „előugrik”: a legelső képkockákon az erő nulla, és onnan úszik fel. */
const FADE_IN = 0.24;
const FADE_OUT = 0.18;

/* A ceruzavonal kikerült. A hegy pozíciója mérhető és stabil, a vastagság
   állítható — de a vonal ATTÓL volt jó, hogy pont az „Adjunk neki helyet."
   alá esett, és ez a viszony nem tartható: a vászon a képpel skálázódik, a
   szöveg a viewporttal. Végigmérve az eltérés +18px (390) és −81px (820)
   között mozog; 1440-en volt véletlenül 3px. A ceruza alatt ráadásul tiszta
   háttér van, tehát máshol egy odavetett vonal lebegett a semmiben. */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

const smoothstep = (t: number) => t * t * (3 - 2 * t);

function Hand() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let disposed = false;
    let frame = 0;
    let timer = 0;
    let started = 0;
    let settleFrame = 0;
    let scrolling = false;
    let observer: IntersectionObserver | null = null;
    let onScroll: (() => void) | null = null;

    // A görgetés arányát a hero szakaszhoz mérjük, nem a vászonhoz: a vászon
    // túllóg a szakaszon, tehát rossz viszonyítási alap lenne.
    const hero = canvas.closest("section");
    if (!hero) return;

    const source = new window.Image();

    source.onload = () => {
      if (disposed) return;
      const w = source.naturalWidth;
      const h = source.naturalHeight;

      // ── Előkészítés. Mindez EGYSZER fut le, nem képkockánként. ──
      const photo = document.createElement("canvas");
      photo.width = w;
      photo.height = h;
      const p = photo.getContext("2d", { willReadFrequently: true });
      if (!p) return;
      p.drawImage(source, 0, 0);
      const pixels = p.getImageData(0, 0, w, h);
      // A közel fekete mattot renderelési időben vágjuk ki; a forrásfájl marad.
      for (let i = 0; i < pixels.data.length; i += 4) {
        const brightness = Math.max(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
        pixels.data[i + 3] = Math.round(Math.max(0, Math.min(1, (brightness - 23) / 23)) * 255);
        const gray = pixels.data[i] * 0.3 + pixels.data[i + 1] * 0.59 + pixels.data[i + 2] * 0.11;
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = gray;
      }
      p.putImageData(pixels, 0, 0);

      canvas.width = w;
      canvas.height = h;

      /* ── Kódréteg, előre kirajzolva. ──────────────────────────────────
         A sűrűségrámpa `.:+*#%@` helyett kódkarakterekből áll, és a világos
         cellák egy részére egész token kerül (`<div>`, `</a>`). A rámpa így is
         hét fokozatú, tehát a kép tónusa megmarad — csak most kimondja, hogy
         WEBBÉ alakul, nem valami általános digitálissá. */
      const RAMP = [".", ":", "/", "<", "=", "#", "@"];
      const TOKENS = ["<div>", "</a>", "</>", "{ }", "<h1>", "</p>", "flex", ":root"];
      const CELL_W = 14;
      const CELL_H = 17;

      const CELL_FONT = "16px ui-monospace, SFMono-Regular, Menlo, monospace";

      /* Egyetlen cellabejáró, két fogyasztóval: ebből épül az összevont
         kódréteg (a ciklushoz) ÉS a részecskelista (a görgetéshez). Így a
         kettő garantáltan ugyanazt a képet adja. */
      const eachCell = (
        visit: (x: number, y: number, text: string, alpha: number, token: boolean, hash: number) => number
      ) => {
        for (let y = 0; y < h; y += CELL_H) {
          let skipUntil = -1;
          for (let x = 0; x < w; x += CELL_W) {
            const i = (y * w + x) * 4;
            if (pixels.data[i + 3] < 180) continue;
            if (x < skipUntil) continue;
            const v = pixels.data[i];
            // Cellánkénti, de determinisztikus zaj: a feloldódás éle ettől nem
            // tiszta ív, hanem szórt, és ugyanez adja a részecskék irányát is.
            const hash = (x * 73 + y * 131) % 97;
            const alpha = (0.4 + v / 420) * (0.55 + 0.45 * (hash / 97));
            const token = v > 118 && hash % 9 === 0;
            const text = token
              ? TOKENS[(x + y) % TOKENS.length]
              : RAMP[Math.min(6, Math.floor(v / 37))];
            const drawn = visit(x, y, text, alpha, token, hash);
            if (token) skipUntil = x + drawn + CELL_W;
          }
        }
      };

      const ascii = document.createElement("canvas");
      ascii.width = w;
      ascii.height = h;
      const a = ascii.getContext("2d");
      if (!a) return;
      a.font = CELL_FONT;
      a.textBaseline = "middle";
      eachCell((x, y, text, alpha, token) => {
        a.fillStyle = `rgba(245,245,245,${alpha})`;
        a.textAlign = token ? "left" : "center";
        a.fillText(text, x, y);
        return token ? a.measureText(text).width : 0;
      });

      /* Részecskék. Lustán épülnek: aki el sem görget, annak ne kelljen
         végigszámolni. Az irány radiálisan kifelé mutat a ceruzahegytől, balra
         húzva és cellánkénti szórással — ettől lesz szórt legyező, nem sugár. */
      type Particle = {
        x: number;
        y: number;
        text: string;
        alpha: number;
        token: boolean;
        dist: number;
        vx: number;
        vy: number;
      };
      let particles: Particle[] | null = null;

      const buildParticles = () => {
        if (particles) return particles;
        const list: Particle[] = [];
        eachCell((x, y, text, alpha, token, hash) => {
          const dx = x - TIP_X;
          const dy = y - TIP_Y;
          const angle = Math.atan2(dy, dx);
          const r1 = ((hash * 37) % 101) / 101 - 0.5;
          const r2 = ((hash * 61) % 89) / 89 - 0.5;
          const speed = 0.55 + (((hash * 17) % 53) / 53) * 0.95;
          list.push({
            x,
            y,
            text,
            alpha,
            token,
            dist: Math.hypot(dx, dy),
            vx: (Math.cos(angle) * 0.4 - 0.85 + r1 * 0.7) * speed,
            vy: (Math.sin(angle) * 0.55 + r2 * 0.9) * speed
          });
          return token ? a.measureText(text).width : 0;
        });
        particles = list;
        return particles;
      };

      /* Minden részecske külön rajzolódik. A `globalAlpha` + egyszínű
         `fillStyle` szándékos: így nem kell részecskénként rgba-sztringet
         összefűzni és elemezni, ami ennyi elemnél már mérhető. */
      const drawParticles = (radius: number, tail: number) => {
        const list = buildParticles();
        ctx.save();
        ctx.font = CELL_FONT;
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#f5f5f5";
        let align = "";
        for (let i = 0; i < list.length; i++) {
          const q = list[i];
          const age = (radius + RELEASE_LEAD - q.dist) / (MAX_R * RELEASE_SPAN);
          if (age <= 0) continue;
          const k = age > 1 ? 1 : age;
          const alpha = q.alpha * (1 - k) * tail;
          if (alpha <= 0.015) continue;
          const want = q.token ? "left" : "center";
          if (align !== want) {
            ctx.textAlign = want as CanvasTextAlign;
            align = want;
          }
          ctx.globalAlpha = alpha;
          const off = k * SCATTER_SPREAD;
          ctx.fillText(q.text, q.x + q.vx * off, q.y + q.vy * off);
        }
        ctx.restore();
      };

      const blend = document.createElement("canvas");
      blend.width = w;
      blend.height = h;
      const bc = blend.getContext("2d");
      if (!bc) return;

      /* Lágy élű gyűrű, a `cx` középponttal. Öt megállóval, nem hárommal: a
         korábbi kemény sáv a semmiből pattant elő és úgy is tűnt el. */
      const ring = (
        target: CanvasRenderingContext2D,
        cx: number,
        radius: number,
        band: number,
        peak: number
      ) => {
        const inner = Math.max(0, radius - band);
        const outer = radius + band;
        const g = target.createRadialGradient(cx, TIP_Y, inner, cx, TIP_Y, outer);
        // A csúcs ott van, ahol a gyűrű közepe — ez nem mindig 0.5, mert
        // induláskor a belső sugarat 0-ra kell vágni.
        const mid = Math.min(0.999, Math.max(0.001, (radius - inner) / (outer - inner)));
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(mid * 0.5, `rgba(0,0,0,${peak * 0.3})`);
        g.addColorStop(mid, `rgba(0,0,0,${peak})`);
        g.addColorStop(mid + (1 - mid) * 0.5, `rgba(0,0,0,${peak * 0.3})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        return g;
      };

      /* Kitöltött, lágy élű korong — nem gyűrű. A görgetéses ág ezt használja:
         ott a feloldódásnak MARADNIA kell, nem áthaladnia. A gyűrű átvonul és
         mögötte visszaáll a fotó; ez viszont amit egyszer elért, azt kóddá is
         hagyja, tehát a hero elhagyásakor a rajz tényleg kód. */
      const disc = (
        target: CanvasRenderingContext2D,
        cx: number,
        radius: number,
        feather: number,
        peak: number
      ) => {
        const inner = Math.max(0, radius - feather);
        const outer = Math.max(inner + 1, radius);
        const g = target.createRadialGradient(cx, TIP_Y, inner, cx, TIP_Y, outer);
        g.addColorStop(0, `rgba(0,0,0,${peak})`);
        g.addColorStop(1, "rgba(0,0,0,0)");
        return g;
      };

      const paint = (dissolve: number, filled = false, tail = 1) => {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(photo, 0, 0);
        if (dissolve <= 0) return;

        // A burkológörbe adja a fade-int és a fade-outot. Ez az, ami miatt a
        // feloldódás nem „megjelenik”, hanem felúszik. Görgetésnél nincs rá
        // szükség: ott a görgetés maga adja a felfutást.
        const envelope = filled
          ? 1
          : smoothstep(clamp01(dissolve / FADE_IN)) *
            smoothstep(clamp01((1 - dissolve) / FADE_OUT));
        if (envelope <= 0.001) return;

        const radius = dissolve * MAX_R;
        // Görgetésnél nem sodródik a középpont: a részecskék elszabadulását a
        // FIX hegytől mért távolság dönti el, a kettőnek egyeznie kell.
        const cx = filled ? TIP_X : TIP_X + dissolve * DRIFT_X;

        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = filled
          ? disc(ctx, cx, radius, ERASE_BAND, ERASE_MAX_SCROLL)
          : ring(ctx, cx, radius, ERASE_BAND, ERASE_MAX * envelope);
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        if (filled) {
          // Görgetésnél nincs maszkolt kódréteg: a részecskék önmagukban
          // rajzolódnak, mindegyik a saját helyére.
          drawParticles(radius, tail);
          return;
        }

        bc.clearRect(0, 0, w, h);
        bc.drawImage(ascii, 0, 0);
        bc.globalCompositeOperation = "destination-in";
        bc.fillStyle = ring(bc, cx, radius, ASCII_BAND, envelope);
        bc.fillRect(0, 0, w, h);
        bc.globalCompositeOperation = "source-over";
        ctx.drawImage(blend, 0, 0);
      };

      const schedule = (delay: number) => {
        clearTimeout(timer);
        timer = window.setTimeout(() => {
          frame = requestAnimationFrame(step);
        }, delay);
      };

      const halt = () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
        frame = 0;
        timer = 0;
        started = 0;
      };

      const isMobile = () => matchMedia("(max-width:760px)").matches;

      const step = (now: number) => {
        if (disposed || scrolling) return;
        if (!started) started = now;
        const t = (now - started) / (isMobile() ? SWEEP_MOBILE_MS : SWEEP_DESKTOP_MS);

        if (t >= 1) {
          paint(0);
          started = 0;
          // Itt SZÁNDÉKOSAN nem ütemezünk képkockát. A korábbi verzió
          // desktopon örökké futott 60 fps-en, és a ciklus 2/3-ában — amikor
          // semmi nem történt — is újrarajzolt egy 1774×887-es vásznat.
          schedule(IDLE_MS);
          return;
        }

        paint(smoothstep(t));
        frame = requestAnimationFrame(step);
      };

      /* ── Görgetés-vezérelt befejezés ──────────────────────────────────
         A ciklus magától visszaáll, vagyis a kéz mindig visszajön. Görgetésre
         viszont a feloldódás VÉGIG megy: mire elhagyod a heroit, a rajz teljesen
         kóddá vált, és onnan veszi át a szót az alatta megépült oldal. A kéz
         közben lefelé sodródik és halványul. */
      /* A stílus a VÁSZONRA megy, nem a `.visual` konténerre: azon fut a
         `hand-in` animáció `both` kitöltéssel, és a CSS-animáció a kaszkádban
         az inline stílus FÖLÖTT van — az opacity emiatt sosem érvényesült,
         ezért maradt láthatóan ott a kéz legörgetve. */
      const visual = canvas;

      /* 0.8 volt: azzal a kéz még jól láthatóan ott ült, amikor a mutató már
         megállt — ezért tűnt úgy, hogy „megáll és nem tűnik el". 0.7-tel a
         teljes eltűnés hamarabb bekövetkezik, mint ahogy a hero elhagyná a
         képernyőt, tehát nincs olyan szakasz, ahol áll, de még látszik. */
      const rawProgress = () => {
        const r = hero.getBoundingClientRect();
        return clamp01(-r.top / Math.max(1, r.height * 0.7));
      };

      /* ── Triggerelt befejezés ───────────────────────────────────────────
         A haladás a trigger után csak nőhet, mert az időből számolódik, nem
         a scrollY-ból. A scroll így elindítja a jelenetet, de nem tudja
         előre-hátra tekerni. */
      let finishStarted = 0;
      let finishFrom = 0;
      let finishProgress = 0;
      let returnStarted = 0;
      let returnFrom = 0;

      const renderFinish = (s: number) => {
        finishProgress = s;
        visual.style.transform = `translateY(${s * 170}px)`;
        paint(smoothstep(s), true, clamp01((1 - s) / TAIL_FADE));
      };

      const finish = (now: number) => {
        settleFrame = 0;
        if (disposed || !scrolling) return;
        if (!finishStarted) finishStarted = now;
        const duration = Math.max(1, SCROLL_FINISH_MS * (1 - finishFrom));
        const t = clamp01((now - finishStarted) / duration);
        renderFinish(finishFrom + (1 - finishFrom) * smoothstep(t));
        if (t < 1) settleFrame = requestAnimationFrame(finish);
      };

      const hardResetFinish = () => {
        cancelAnimationFrame(settleFrame);
        settleFrame = 0;
        finishStarted = 0;
        finishFrom = 0;
        finishProgress = 0;
        returnStarted = 0;
        returnFrom = 0;
        scrolling = false;
        visual.style.transform = "";
        visual.style.opacity = "";
        paint(0);
        schedule(isMobile() ? START_DELAY_MOBILE_MS : START_DELAY_DESKTOP_MS);
      };

      /* A tetejére visszaérve nem pattintjuk vissza a teljes fotót. Az aktuális
         állapotból egy rövid, ease-elt ellenanimáció építi vissza a kezet. */
      const returnFinish = (now: number) => {
        settleFrame = 0;
        if (disposed || !scrolling) return;
        if (!returnStarted) returnStarted = now;
        const duration = Math.max(1, SCROLL_RETURN_MS * returnFrom);
        const t = clamp01((now - returnStarted) / duration);
        renderFinish(returnFrom * (1 - smoothstep(t)));
        if (t < 1) {
          settleFrame = requestAnimationFrame(returnFinish);
        } else {
          hardResetFinish();
        }
      };

      const startFinish = () => {
        cancelAnimationFrame(settleFrame);
        finishFrom = finishProgress;
        finishStarted = 0;
        returnStarted = 0;
        settleFrame = requestAnimationFrame(finish);
      };

      const startReturn = () => {
        cancelAnimationFrame(settleFrame);
        returnFrom = finishProgress;
        returnStarted = 0;
        finishStarted = 0;
        settleFrame = requestAnimationFrame(returnFinish);
      };

      onScroll = () => {
        /* Telefonon NINCS görgetés-vezérelt ág. Nem szeszélyből: a tartomány a
           hero magasságához van kötve (hero × 0.7), és a hero mobilon ~518px,
           tehát a teljes effekt ~363px görgetésbe férne bele — egyetlen
           hüvelykujj-mozdulatba. Ehhez jön, hogy az érintéses görgetés
           lendületes, tehát bármilyen scroll-kötött animáció rángatósnak
           érződik rajta. A tartomány megnyújtása sem megoldás: akkor meg alig
           történne belőle valami olvasás közben.
           Marad a ciklus, amit az IntersectionObserver amúgy is leállít, ha a
           hero elhagyja a képernyőt. */
        if (isMobile()) {
          if (scrolling) hardResetFinish();
          return;
        }

        const progress = rawProgress();
        if (!scrolling && progress >= SCROLL_TRIGGER) {
          scrolling = true;
          halt();
          startFinish();
          return;
        }

        if (scrolling && progress <= SCROLL_RESET && !returnStarted) startReturn();
        else if (scrolling && progress >= SCROLL_TRIGGER && returnStarted) startFinish();
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      paint(0);
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      /* Ez váltotta ki az „Újrajátszás" gombot. A ciklus csak akkor fut,
         amíg a hero tényleg a képernyőn van — lejjebb görgetve megáll, és
         visszagörgetve elölről indul. Így mobilon sem kell mesterségesen
         két körre korlátozni, és nem kell gomb ahhoz, hogy újra lássa. */
      observer = new IntersectionObserver(
        (entries) => {
          if (disposed) return;
          halt();
          if (entries[0].isIntersecting && !scrolling) {
            paint(0);
            schedule(isMobile() ? START_DELAY_MOBILE_MS : START_DELAY_DESKTOP_MS);
          }
        },
        { threshold: 0 }
      );
      observer.observe(canvas);
    };

    source.src = "/experiments/hero-hand-pencil-dark.png";
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settleFrame);
      clearTimeout(timer);
      observer?.disconnect();
      if (onScroll) window.removeEventListener("scroll", onScroll);
      source.onload = null;
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className={styles.hand}
      role="img"
      aria-label="Ceruzát tartó kéz, finom ASCII-átalakulással"
    />
  );
}

// Based on the solid circle / monochrome subject composition of
// ravikatiyar162's Minimalist Hero, retrieved from 21st.dev.
export function PosterHero() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = hero.getBoundingClientRect();
      const x = event.clientX / rect.width - rect.left / rect.width - 0.5;
      const y = event.clientY / rect.height - rect.top / rect.height - 0.5;
      hero.style.setProperty("--paper-one-x", `${x * 20}px`);
      hero.style.setProperty("--paper-one-y", `${y * 14}px`);
      hero.style.setProperty("--paper-two-x", `${x * -13}px`);
      hero.style.setProperty("--paper-two-y", `${y * -9}px`);
      hero.style.setProperty("--print-x", `${x * 9}px`);
      hero.style.setProperty("--print-y", `${y * 7}px`);
      hero.style.setProperty("--print-neg-x", `${x * -9}px`);
      hero.style.setProperty("--print-neg-y", `${y * -7}px`);
    };
    const reset = () => {
      hero.style.setProperty("--paper-one-x", "0px");
      hero.style.setProperty("--paper-one-y", "0px");
      hero.style.setProperty("--paper-two-x", "0px");
      hero.style.setProperty("--paper-two-y", "0px");
      hero.style.setProperty("--print-x", "0px");
      hero.style.setProperty("--print-y", "0px");
      hero.style.setProperty("--print-neg-x", "0px");
      hero.style.setProperty("--print-neg-y", "0px");
    };

    hero.addEventListener("pointermove", move, { passive: true });
    hero.addEventListener("pointerleave", reset);
    return () => {
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", reset);
    };
  }, []);

  return (
    <div className={styles.page}>
      <section ref={heroRef} className={styles.hero} aria-labelledby="hero-title">
        <div className={`${styles.paperLayer} ${styles.paperOne}`} aria-hidden="true" />
        <div className={`${styles.paperLayer} ${styles.paperTwo}`} aria-hidden="true" />
        <div className={`${styles.printArc} ${styles.printArcAqua}`} aria-hidden="true" />
        <div className={`${styles.printArc} ${styles.printArcEmber}`} aria-hidden="true" />
        <div className={styles.disc} aria-hidden="true" />
        {/* Ugyanaz a döntés, mint a korábbi heróban (app/page.tsx): ez a sor
            önmeghatározás volt, ami a látogatónak semmit nem mondott. A
            fizetett forgalom viszont kulcsszóra érkezik, és itt kapja meg a
            visszaigazolást, hogy jó helyen jár — a H1 közben maradhat
            eredmény-központú, nem kell kulcsszót beletuszkolni. */}
        <p className={styles.eyebrow}>Bemutatkozó és céges weboldal készítés</p>
        <h1 id="hero-title" className={styles.title}>
          Van egy ötleted.
        </h1>
        <div className={styles.visual}>
          <Hand />
        </div>
        <p className={styles.script}>Adjunk neki helyet.</p>
        <span className={styles.sideNote}>
          Egyedi weboldalak.
          <br />
          Személyesen, végig.
        </span>
      </section>
      <footer className={styles.bottom}>
        {/* A poszter (cím + kéz) hangulatot ad, de nem mondja meg, MIT árulunk
            és kinek. Ez a sor mondja ki konkrétan — a H1 ettől maradhat
            eredmény-központú. */}
        <p className={styles.offer}>
          <strong>Egyedi céges weboldal, már 2–4 munkanap alatt.</strong>
          <br />
          <span>Domain, tárhely és karbantartás a havidíjban — végig egy emberrel egyeztetsz.</span>
        </p>
        {/* „Nézzük a lehetőségeket" nem mondta meg, hova visz — a cél viszont a
            csomagok és az árak. A hirdetésekből érkezők jelentős része
            konkrétan árat keres, tehát a gomb mondja is ki. */}
        <Link href="#arak" className={styles.cta}>
          Csomagok és árak <span aria-hidden="true">↗</span>
        </Link>
        {/* A legerősebb érv az ár MELLETT: egy ismeretlen szolgáltatónál a
            vevő fő félelme, hogy előre fizet és rosszat kap. Itt nem fizet
            előre — ennek a hajtás fölött kell látszania, nem az 5. képernyőn. */}
        <p className={styles.price}>
          <strong>14 900 Ft</strong> / hó-tól
          <br />
          <span className={styles.promise}>Csak akkor fizetsz, ha tetszik</span>
        </p>
      </footer>
    </div>
  );
}

/* A hero alatti tartalmat ez a burok oldja fel a világos szakaszba. Külön
   komponens, mert a `.after` osztály a hero CSS-moduljában él — a `children`
   szerveroldali marad, csak a burok fut kliensen. */
export function PosterHeroFollow({ children }: { children: React.ReactNode }) {
  return <div className={styles.after}>{children}</div>;
}
