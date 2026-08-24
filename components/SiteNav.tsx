"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TransitionLink } from "@/components/TransitionLink";
import { ContactButton } from "@/components/ContactButton";
import { STUDIO_PHONE_LABEL, STUDIO_PHONE_TEL } from "@/lib/contact";

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
          {/* A hirdetésekből érkező forgalom többsége telefonos, és egy részük
              egyszerűen hívni akar. Ez az egyetlen elem a fejlécben, ami
              telefonon IS látszik a hamburger mellett — a `nav-cta` ott
              rejtve van. Ikonra fogyva marad meg, a szám csak asztali
              nézetben fér ki. */}
          <a aria-label={`Telefon: ${STUDIO_PHONE_LABEL}`} className="nav-phone" href={`tel:${STUDIO_PHONE_TEL}`}>
            <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
              <path d="M6.6 3.5h3l1.5 3.7-1.9 1.4a12.5 12.5 0 0 0 5.2 5.2l1.4-1.9 3.7 1.5v3a1.8 1.8 0 0 1-2 1.8A15.7 15.7 0 0 1 4.8 5.5a1.8 1.8 0 0 1 1.8-2Z" />
            </svg>
            <span>{STUDIO_PHONE_LABEL}</span>
          </a>
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
          <a className="mobile-nav-phone" href={`tel:${STUDIO_PHONE_TEL}`} onClick={closeMenu}>
            {STUDIO_PHONE_LABEL}
          </a>
        </div>
      </nav>
    </>
  );
}
