"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TransitionLink } from "@/components/TransitionLink";
import { ContactButton } from "@/components/ContactButton";

const links = [
  { href: "/szolgaltatasok", label: "Szolgáltatások" },
  { href: "/folyamat", label: "Folyamat" },
  { href: "/munkak", label: "Munkák" },
  { href: "/blog", label: "Blog" },
  { href: "/ugyfelkapu", label: "Ügyfélkapu" }
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const [openedAtPath, setOpenedAtPath] = useState("");
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const menuOpen = open && openedAtPath === pathname;

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const menu = menuRef.current;
    const focusable = menu?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    focusable?.[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !focusable?.length) return;
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

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  function closeMenu() {
    setOpen(false);
  }

  return (
    <>
      <nav className="nav-shell" aria-label="Fő navigáció">
        <TransitionLink className="brand-lockup" href="/">
          <Image alt="" aria-hidden="true" className="brand-mark" height={44} priority src="/logo/pe-mark-ink.png" width={86} />
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
          <ContactButton className="nav-cta">Kapcsolat</ContactButton>
          <button
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Menü bezárása" : "Menü megnyitása"}
            aria-expanded={menuOpen}
            className="nav-hamburger"
            onClick={() => {
              setOpenedAtPath(pathname);
              setOpen((value) => !value);
            }}
            ref={triggerRef}
            type="button"
          >
            <span className={menuOpen ? "open" : ""} />
            <span className={menuOpen ? "open" : ""} />
            <span className={menuOpen ? "open" : ""} />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          className="mobile-nav-overlay"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
      <nav
        className={`mobile-nav ${menuOpen ? "open" : ""}`}
        aria-label="Mobil navigáció"
        aria-hidden={!menuOpen}
        id="mobile-navigation"
        inert={!menuOpen}
        ref={menuRef}
      >
        <div className="mobile-nav-links">
          {links.map((link) => (
            <TransitionLink key={link.href} href={link.href} onClick={closeMenu}>
              {link.label}
            </TransitionLink>
          ))}
          <ContactButton className="button primary" onClick={closeMenu}>
            Kapcsolatfelvétel
          </ContactButton>
        </div>
      </nav>
    </>
  );
}
