"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDemoNotice } from "@/components/demo/DemoNotice";
import { BagArt } from "./BagArt";
import { linePrice, useCart } from "./CartContext";
import { FREE_SHIPPING_LIMIT, findProduct, formatFt, grinds, sizes } from "./data";

const SHIPPING_FEE = 1490;

const navLinks = [
  { href: "/demo/zamat#kavek", label: "Kávék" },
  { href: "/demo/zamat#elofizetes", label: "Előfizetés" },
  { href: "/demo/zamat#tortenet", label: "A pörkölő" },
  { href: "/demo/zamat#velemenyek", label: "Vélemények" }
];

export function ZamatHeader() {
  const { count, setOpen } = useCart();
  const notice = useDemoNotice();
  const [stuck, setStuck] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="zm-announce">
        <span>Ingyenes szállítás {formatFt(FREE_SHIPPING_LIMIT)} felett</span>
        <span className="zm-announce-sep" aria-hidden="true" />
        <span>Kedden és pénteken pörkölünk — friss szemek, mindig</span>
      </div>

      <header className={`zm-header ${stuck ? "is-stuck" : ""}`}>
        <div className="zm-header-inner">
          <button
            aria-label="Menü"
            className="zm-icon-btn zm-burger"
            onClick={() => setMenu((v) => !v)}
            type="button"
          >
            <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
              <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
            </svg>
          </button>

          <Link className="zm-logo" href="/demo/zamat">
            <span className="zm-logo-mark" aria-hidden="true">
              <span />
            </span>
            <span className="zm-logo-text">
              Zamat
              <em>kávépörkölő</em>
            </span>
          </Link>

          <nav className={`zm-nav ${menu ? "is-open" : ""}`}>
            {navLinks.map((l) => (
              <Link href={l.href} key={l.href} onClick={() => setMenu(false)}>
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="zm-header-actions">
            <button
              aria-label="Keresés"
              className="zm-icon-btn"
              onClick={() =>
                notice("A kereső ebben a mintaprojektben nincs élesítve — a kínálat egyben látszik.")
              }
              type="button"
            >
              <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.6-3.6" strokeLinecap="round" />
              </svg>
            </button>
            <button
              aria-label="Kosár megnyitása"
              className="zm-icon-btn zm-cart-btn"
              onClick={() => setOpen(true)}
              type="button"
            >
              <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
                <path d="M6 8h12l-1 12H7L6 8z" strokeLinejoin="round" />
                <path d="M9.5 10V7a2.5 2.5 0 0 1 5 0v3" strokeLinecap="round" />
              </svg>
              {count > 0 && <span className="zm-cart-badge">{count}</span>}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

export function CartDrawer() {
  const { lines, subtotal, open, setOpen, setQty, remove, count } = useCart();
  const [checkoutNote, setCheckoutNote] = useState(false);

  useEffect(() => {
    if (!open) setCheckoutNote(false);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const missing = Math.max(0, FREE_SHIPPING_LIMIT - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_LIMIT) * 100);

  return (
    <>
      <div
        className={`zm-overlay ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside className={`zm-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <div className="zm-drawer-head">
          <h2>
            Kosár <span>({count})</span>
          </h2>
          <button aria-label="Bezárás" onClick={() => setOpen(false)} type="button">
            <svg fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24">
              <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {lines.length > 0 && (
          <div className="zm-ship-bar">
            {missing > 0 ? (
              <p>
                Még <strong>{formatFt(missing)}</strong> és ingyenes a szállítás
              </p>
            ) : (
              <p className="is-done">A szállítás ingyenes — jó választás.</p>
            )}
            <div className="zm-ship-track">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="zm-drawer-body">
          {lines.length === 0 && (
            <div className="zm-empty">
              <span className="zm-empty-art" aria-hidden="true" />
              <p>A kosarad még üres.</p>
              <button className="zm-btn" onClick={() => setOpen(false)} type="button">
                Nézzük a kávékat
              </button>
            </div>
          )}

          {lines.map((line) => {
            const product = findProduct(line.slug);
            if (!product) return null;
            const size = sizes.find((s) => s.id === line.size)?.label ?? "";
            const grind = grinds.find((g) => g.id === line.grind)?.label ?? "";
            return (
              <article className="zm-line" key={line.key}>
                <div className="zm-line-art">
                  <BagArt product={product} small />
                </div>
                <div className="zm-line-body">
                  <strong>{product.name}</strong>
                  <span className="zm-line-variant">
                    {size} · {grind}
                  </span>
                  <div className="zm-stepper">
                    <button
                      aria-label="Kevesebb"
                      onClick={() => setQty(line.key, line.qty - 1)}
                      type="button"
                    >
                      −
                    </button>
                    <span>{line.qty}</span>
                    <button
                      aria-label="Több"
                      onClick={() => setQty(line.key, line.qty + 1)}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="zm-line-side">
                  <strong>{formatFt(linePrice(line) * line.qty)}</strong>
                  <button onClick={() => remove(line.key)} type="button">
                    Törlés
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {lines.length > 0 && (
          <div className="zm-drawer-foot">
            <div className="zm-sum-row">
              <span>Részösszeg</span>
              <strong>{formatFt(subtotal)}</strong>
            </div>
            <div className="zm-sum-row muted">
              <span>Szállítás</span>
              <span>{missing > 0 ? formatFt(SHIPPING_FEE) : "Ingyenes"}</span>
            </div>
            <div className="zm-sum-row total">
              <span>Összesen</span>
              <strong>{formatFt(subtotal + (missing > 0 ? SHIPPING_FEE : 0))}</strong>
            </div>
            <button className="zm-btn full" onClick={() => setCheckoutNote(true)} type="button">
              Tovább a pénztárhoz
            </button>
            {checkoutNote && (
              <p className="zm-checkout-note">
                Ez egy mintaprojekt — a pénztár nincs élesítve, így valódi fizetés nem történik. A
                kosár logikája viszont éles: mennyiség, variánsok, szállítási küszöb, tárolás.
              </p>
            )}
            <p className="zm-secure">Biztonságos fizetés · 14 napos elállás · Ingyenes csere</p>
          </div>
        )}
      </aside>
    </>
  );
}

export function ZamatFooter() {
  return (
    <footer className="zm-footer">
      <div className="zm-footer-top">
        <div className="zm-footer-brand">
          <Link className="zm-logo" href="/demo/zamat">
            <span className="zm-logo-mark" aria-hidden="true">
              <span />
            </span>
            <span className="zm-logo-text">
              Zamat
              <em>kávépörkölő</em>
            </span>
          </Link>
          <p>
            Kis tételben pörkölünk Budapesten, hetente kétszer. Amit rendelsz, néhány napja még
            zöld szem volt.
          </p>
        </div>
        <div className="zm-footer-cols">
          <div>
            <span>Vásárlás</span>
            <Link href="/demo/zamat#kavek">Összes kávé</Link>
            <Link href="/demo/zamat#elofizetes">Előfizetés</Link>
            <Link href="/demo/zamat/termek/zamat-kostolo">Ajándékcsomag</Link>
          </div>
          <div>
            <span>Segítség</span>
            <Link href="/demo/zamat#gyik">Szállítás</Link>
            <Link href="/demo/zamat#gyik">Elállás</Link>
            <Link href="/demo/zamat#gyik">Kapcsolat</Link>
          </div>
          <div>
            <span>Rólunk</span>
            <Link href="/demo/zamat#tortenet">A pörkölő</Link>
            <Link href="/demo/zamat#tortenet">Termelők</Link>
            <Link href="/demo/zamat#velemenyek">Vélemények</Link>
          </div>
        </div>
      </div>
      <div className="zm-footer-bottom">
        <span>© 2026 Zamat Kávépörkölő — kitalált márka, ProjectEdge mintaprojekt.</span>
        <a href="https://www.projectedge.hu">Készítette: ProjectEdge</a>
      </div>
    </footer>
  );
}
