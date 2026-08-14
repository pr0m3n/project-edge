"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";

const STORAGE_KEY = "projectedge-exit-offer-v1";
const DISPLAY_INTERVAL = 14 * 24 * 60 * 60 * 1000;
const MARKETING_ROUTES = new Set([
  "/",
  "/szolgaltatasok",
  "/folyamat",
  "/munkak",
  "/munkak/checky",
  "/weboldal-keszites",
  "/havidijas-weboldal",
  "/weboldal-kisvallalkozasoknak",
  "/wordpress-weboldal-ujratervezes"
]);

function recentlyShown() {
  try {
    const shownAt = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(shownAt) && Date.now() - shownAt < DISPLAY_INTERVAL;
  } catch {
    return false;
  }
}

function pageIsBusy() {
  if (document.querySelector(".support-widget.open, .mobile-nav.open")) return true;
  const brief = document.getElementById("projektbrief");
  if (!brief) return false;
  const rect = brief.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

export function ExitOffer() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!MARKETING_ROUTES.has(pathname) || recentlyShown()) return;
    let armed = false;
    const armTimer = window.setTimeout(() => { armed = true; }, 12_000);

    function show(source: "exit" | "mobile-scroll") {
      if (!armed || pageIsBusy() || recentlyShown()) return;
      try { window.localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* nincs tárolás */ }
      setOpen(true);
      trackEvent("exit_offer_shown", { source, coupon: "INDULAS15" });
    }

    function onMouseOut(event: MouseEvent) {
      if (event.clientY <= 0 && !event.relatedTarget) show("exit");
    }

    function onScroll() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable >= 0.65) show("mobile-scroll");
    }

    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(armTimer);
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]");
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;

  async function useOffer() {
    try {
      await navigator.clipboard.writeText("INDULAS15");
    } catch {
      /* A kód a felületen is olvasható. */
    }
    trackEvent("exit_offer_accepted", { coupon: "INDULAS15" });
    setOpen(false);
    router.push("/#projektbrief");
  }

  return (
    <div className="exit-offer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <div
        aria-describedby="exit-offer-description"
        aria-labelledby="exit-offer-title"
        aria-modal="true"
        className="exit-offer"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button aria-label="Ajánlat bezárása" className="exit-offer-close" onClick={() => setOpen(false)} type="button">×</button>
        <span className="exit-offer-kicker">INDULÓ AJÁNLAT · EGYSZERI PROJEKTHEZ</span>
        <h2 id="exit-offer-title">15% kedvezmény az első weboldaladra.</h2>
        <p id="exit-offer-description">
          Az egyedi ajánlat elfogadása előtt használd a kódot. A kedvezmény legfeljebb 50 000 Ft,
          és egy fiókkal egyszer vehető igénybe.
        </p>
        <div className="exit-offer-code"><span>Kuponkód</span><strong>INDULAS15</strong></div>
        <button className="button primary" onClick={useOffer} type="button">
          Kód másolása és projekt indítása
        </button>
        <small>Előfizetésre nem érvényes. Nem jelenik meg újra 14 napig.</small>
      </div>
    </div>
  );
}
