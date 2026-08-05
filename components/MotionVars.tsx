"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * A görgetésre megjelenő blokkok. A Chrome ezeket CSS-ből, `animation-timeline:
 * view()`-val animálja (lásd globals.css) — Safariban és Firefoxban viszont ez
 * még nem támogatott, ott ez a lista kapja meg a JS-es tartalékot.
 *
 * FONTOS: ha ide új szelektort veszel fel, tedd be a globals.css `reveal-up`
 * szabálylistájába is, különben Chrome-ban nem fog animálódni.
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

  /* ── görgetésre megjelenés ott, ahol a CSS scroll-timeline nem megy ── */
  useEffect(() => {
    if (isDemo || prefersReducedMotion()) return;

    const hasViewTimeline =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline", "view()");

    // Chrome-ban a CSS elintézi, nincs dolgunk
    if (hasViewTimeline) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    if (!targets.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    targets.forEach((el) => {
      // a rejtést maga a JS teszi rá — így ha nem fut le, semmi nem tűnik el
      el.classList.add("js-reveal");

      // rácson belüli sorrend a lépcsőzetes megjelenéshez
      const siblings = el.parentElement ? Array.from(el.parentElement.children) : [];
      const index = siblings.indexOf(el);
      if (index > 0 && index < 8) {
        el.style.setProperty("--reveal-i", String(index));
      }

      // ami már eleve a képernyőn van, azonnal látszódjon
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        requestAnimationFrame(() => el.classList.add("is-in"));
      } else {
        io.observe(el);
      }
    });

    return () => io.disconnect();
  }, [isDemo, pathname]);

  /* ── mágneses gombok: a kurzor felé húznak egy kicsit ── */
  useEffect(() => {
    if (isDemo || prefersReducedMotion()) return;
    if (window.matchMedia("(hover: none)").matches) return;

    function onMove(event: PointerEvent) {
      const button = (event.target as HTMLElement | null)?.closest<HTMLElement>(".button");
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      button.style.setProperty("--bx", `${(x * 10).toFixed(1)}px`);
      button.style.setProperty("--by", `${(y * 6).toFixed(1)}px`);
    }

    function onLeave(event: PointerEvent) {
      const button = (event.target as HTMLElement | null)?.closest<HTMLElement>(".button");
      if (!button) return;
      button.style.removeProperty("--bx");
      button.style.removeProperty("--by");
    }

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave, { passive: true });

    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
    };
  }, [isDemo]);

  return null;
}
