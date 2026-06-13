"use client";

import { useEffect } from "react";

export function MotionVars() {
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

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      window.removeEventListener("pointermove", setPointer);
      window.removeEventListener("scroll", setScroll);
    };
  }, []);

  return null;
}
