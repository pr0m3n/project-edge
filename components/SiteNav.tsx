"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TransitionLink } from "@/components/TransitionLink";

const links = [
  { href: "/szolgaltatasok", label: "Szolgáltatások" },
  { href: "/folyamat", label: "Folyamat" },
  { href: "/munkak", label: "Munkák" },
  { href: "/ugyfelkapu", label: "Ügyfélkapu" }
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <nav className="nav-shell" aria-label="Fő navigáció">
        <TransitionLink className="brand-lockup" href="/">
          <img alt="" aria-hidden="true" className="brand-mark" src="/logo/pe-mark-ink.png" />
          <span className="sr-only">ProjectEdge</span>
        </TransitionLink>
        <div className="nav-orbit">
          {links.map((link) => (
            <TransitionLink key={link.href} href={link.href}>
              {link.label}
            </TransitionLink>
          ))}
        </div>
        <div className="nav-end">
          <TransitionLink className="nav-cta" href="/ugyfelkapu">
            Projekt indítása
          </TransitionLink>
          <button
            aria-label={open ? "Menü bezárása" : "Menü megnyitása"}
            aria-expanded={open}
            className="nav-hamburger"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            <span className={open ? "open" : ""} />
            <span className={open ? "open" : ""} />
            <span className={open ? "open" : ""} />
          </button>
        </div>
      </nav>

      {open && (
        <div
          className="mobile-nav-overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <nav
        className={`mobile-nav ${open ? "open" : ""}`}
        aria-label="Mobil navigáció"
        aria-hidden={!open}
      >
        <div className="mobile-nav-links">
          {links.map((link) => (
            <TransitionLink key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </TransitionLink>
          ))}
          <TransitionLink className="button primary" href="/ugyfelkapu" onClick={() => setOpen(false)}>
            Projekt indítása
          </TransitionLink>
        </div>
      </nav>
    </>
  );
}
