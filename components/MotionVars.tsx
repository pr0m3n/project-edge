"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * A görgetésre megjelenő blokkok.
 *
 * Korábban ezt CSS-ből, `animation-timeline: view()`-val oldottuk meg, de a
 * lap alján lévő elemeknél (pl. záró CTA) az animation-range sosem ért véget —
 * nem volt hova tovább görgetni —, így félig áttetszőn ragadtak. Emiatt minden
 * böngésző ugyanezt a JS-es utat kapja: egy kódút, kiszámítható végállapot.
 */
const REVEAL_SELECTOR = [
  ".section-head",
  ".featured-copy",
  ".checky-card",
  ".route-tile",
  ".service-slab",
  ".timeline article",
  ".work-matrix article",
  ".quote-panel",
  ".orbit-copy",
  ".planet-stage",
  ".manifesto article",
  ".bring-item",
  ".voice-card",
  ".deliver-intro",
  ".deliver-row",
  ".process-extra",
  ".proc-step",
  ".founder-card",
  ".no-call",
  ".price-teaser",
  ".live-work-tile",
  ".checky-story-step",
  ".checky-feature-card",
  ".checky-evidence-card",
  ".checky-architecture-flow",
  ".demo-card",
  ".cta-band"
].join(",");

/* Csak ezek az elemek olvassák a `--mx` / `--my` értéket. Mivel a változók a
   dokumentum gyökerén ülnek, minden írásuk az EGÉSZ oldal stílusát
   érvényteleníti — egy 18 000 pixel magas főoldalon ez minden egérmozdulatnál
   számottevő munka. Ezért a figyelő csak akkor van bekötve, amikor legalább
   egy ilyen elem képernyőn van; a lap többi részén (brief, árak, GYIK, lábléc)
   nincs mit kiszámolni. */
const POINTER_SELECTOR = [
  ".system-window",
  ".laptop-model",
  ".device-main",
  ".device-panel",
  ".planet-model",
  ".checky-card",
  ".founder-card"
].join(",");

function prefersStaticMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 767px), (hover: none) and (pointer: coarse)").matches
  );
}

export function MotionVars() {
  const pathname = usePathname();
  // a /demo alatti mintaprojektek saját mozgásrendszert hoznak, azokat kihagyjuk
  const isDemo = pathname?.startsWith("/demo") ?? false;

  /* ── egérpozíció és görgetési arány CSS változóban ── */
  useEffect(() => {
    if (prefersStaticMotion()) {
      document.documentElement.style.setProperty("--mx", "0");
      document.documentElement.style.setProperty("--my", "0");
      document.documentElement.style.setProperty("--page-scroll", "0");
      return;
    }

    let frame = 0;

    function setPointer(event: PointerEvent) {
      if (frame) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        const x = event.clientX / window.innerWidth - 0.5;
        const y = event.clientY / window.innerHeight - 0.5;
        document.documentElement.style.setProperty("--mx", x.toFixed(3));
        document.documentElement.style.setProperty("--my", y.toFixed(3));
      });
    }

    function setScroll() {
      const limit = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(window.scrollY / limit, 1);
      document.documentElement.style.setProperty("--page-scroll", progress.toFixed(3));
    }

    setScroll();
    window.addEventListener("scroll", setScroll, { passive: true });
    window.addEventListener("resize", setScroll, { passive: true });

    /* Az egérfigyelő csak addig van bekötve, amíg egy parallaxist használó
       elem látszik. A megfigyelőt a `load` után kötjük be, hogy a streamelt
       oldalág is a helyén legyen, mire végigkérdezzük a DOM-ot. */
    /* Halmaz, nem számláló: az első callback EGYSZERRE jelenti mind a hét
       elemet, és a képernyőn kívüliek mínuszai elvinnék a számlálót nulla alá —
       a látható elem mellett is lekapcsolna a figyelő. */
    const shown = new Set<Element>();
    let listening = false;
    let observer: IntersectionObserver | null = null;

    function syncListener() {
      const shouldListen = shown.size > 0;
      if (shouldListen === listening) return;
      listening = shouldListen;
      if (shouldListen) {
        window.addEventListener("pointermove", setPointer, { passive: true });
      } else {
        window.removeEventListener("pointermove", setPointer);
      }
    }

    function observeParallax() {
      const targets = Array.from(document.querySelectorAll<HTMLElement>(POINTER_SELECTOR));
      if (!targets.length) return;
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              shown.add(entry.target);
            } else {
              shown.delete(entry.target);
            }
          });
          syncListener();
        },
        { rootMargin: "200px 0px" }
      );
      targets.forEach((target) => observer?.observe(target));
    }

    if (document.readyState === "complete") {
      observeParallax();
    } else {
      window.addEventListener("load", observeParallax, { once: true });
    }

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      window.removeEventListener("load", observeParallax);
      window.removeEventListener("pointermove", setPointer);
      window.removeEventListener("scroll", setScroll);
      window.removeEventListener("resize", setScroll);
      observer?.disconnect();
    };
  }, []);

  /* ── görgetésre megjelenés (minden böngészőben ugyanígy) ── */
  useEffect(() => {
    if (isDemo || prefersStaticMotion()) return;
    let io: IntersectionObserver | null = null;
    let firstFrame = 0;
    let secondFrame = 0;
    let timer = 0;

    function initializeReveal() {
      const targets = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
      if (!targets.length) return;

      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-in");
            io?.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );

      targets.forEach((el) => {
        el.classList.add("js-reveal");
        const siblings = el.parentElement ? Array.from(el.parentElement.children) : [];
        const index = siblings.indexOf(el);
        if (index > 0 && index < 8) el.style.setProperty("--reveal-i", String(index));

        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92) {
          requestAnimationFrame(() => el.classList.add("is-in"));
        } else {
          io?.observe(el);
        }
      });
    }

    // A komponens a gyökérlayout végén fut. A `load` esemény és két
    // renderkocka megvárása után a streamelt oldalág is hidratált, így nem
    // módosítunk olyan class/style attribútumot, amelyet React még egyeztet.
    function scheduleReveal() {
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          // A Next streamelt oldalága lassabb eszközön a gyökérlayout effektje
          // után is hidratálhat. Rövid türelmi idővel nem írjuk át a React által
          // még egyeztetett class/style attribútumokat (hydration mismatch).
          timer = window.setTimeout(initializeReveal, 500);
        });
      });
    }

    if (document.readyState === "complete") {
      scheduleReveal();
    } else {
      window.addEventListener("load", scheduleReveal, { once: true });
    }

    return () => {
      window.removeEventListener("load", scheduleReveal);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(timer);
      io?.disconnect();
    };
  }, [isDemo, pathname]);

  return null;
}
