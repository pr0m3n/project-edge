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
  ".process-extra",
  ".proc-step",
  ".founder-card",
  ".no-call",
  ".price-teaser",
  ".case-block",
  ".case-metric",
  ".demo-card",
  ".cta-band"
].join(",");

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function MotionVars() {
  const pathname = usePathname();
  // a /demo alatti mintaprojektek saját mozgásrendszert hoznak, azokat kihagyjuk
  const isDemo = pathname?.startsWith("/demo") ?? false;

  /* ── egérpozíció és görgetési arány CSS változóban ── */
  useEffect(() => {
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
    window.addEventListener("pointermove", setPointer, { passive: true });
    window.addEventListener("scroll", setScroll, { passive: true });
    window.addEventListener("resize", setScroll, { passive: true });

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      window.removeEventListener("pointermove", setPointer);
      window.removeEventListener("scroll", setScroll);
      window.removeEventListener("resize", setScroll);
    };
  }, []);

  /* ── görgetésre megjelenés (minden böngészőben ugyanígy) ── */
  useEffect(() => {
    if (isDemo || prefersReducedMotion()) return;
    let io: IntersectionObserver | null = null;

    // A teljes Next/React fa hidratálása után nyúlunk csak a DOM-osztályokhoz.
    // Streaming közben egy korábban lefutó effect különben módosíthatna olyan
    // elemeket, amelyeket React még éppen hidratál.
    const timer = window.setTimeout(() => {
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
    }, 220);

    return () => {
      window.clearTimeout(timer);
      io?.disconnect();
    };
  }, [isDemo, pathname]);

  return null;
}
