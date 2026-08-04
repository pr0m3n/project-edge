"use client";

import Link from "next/link";
import { useState } from "react";
import { BagArt } from "../../BagArt";
import { useCart } from "../../CartContext";
import { Stars } from "../../ProductGrid";
import { type Product, formatFt, grinds, products, sizes } from "../../data";

export function ProductDetail({ product }: { product: Product }) {
  const { add } = useCart();
  const [size, setSize] = useState("250");
  const [grind, setGrind] = useState("szemes");
  const [qty, setQty] = useState(1);

  const hasVariants = product.variants !== false;
  const multiplier = hasVariants ? (sizes.find((s) => s.id === size)?.multiplier ?? 1) : 1;
  const price = Math.round((product.price * multiplier) / 10) * 10;
  const related = products.filter((p) => p.slug !== product.slug).slice(0, 3);

  return (
    <main className="zm-detail">
      <nav className="zm-crumbs">
        <Link href="/demo/zamat">Főoldal</Link>
        <span aria-hidden="true">/</span>
        <Link href="/demo/zamat#kavek">Kávék</Link>
        <span aria-hidden="true">/</span>
        <span>{product.name}</span>
      </nav>

      <div className="zm-detail-top">
        <div className="zm-detail-art" style={{ background: `${product.palette.label}` }}>
          {product.badge && <span className="zm-badge">{product.badge}</span>}
          <BagArt product={product} />
          <div className="zm-detail-notes">
            {product.notes.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
        </div>

        <div className="zm-detail-buy">
          <span className="zm-origin">{product.origin}</span>
          <h1>{product.name}</h1>
          <div className="zm-rating">
            <Stars value={product.rating} />
            <span>
              {product.rating.toString().replace(".", ",")} · {product.reviews} értékelés
            </span>
          </div>
          <p className="zm-detail-lead">{product.short}</p>

          <div className="zm-spec-row">
            <div>
              <span>Pörkölés</span>
              <strong>{product.roast}</strong>
            </div>
            <div>
              <span>Feldolgozás</span>
              <strong>{product.process}</strong>
            </div>
            {product.altitude !== "—" && (
              <div>
                <span>Magasság</span>
                <strong>{product.altitude}</strong>
              </div>
            )}
          </div>

          {hasVariants && (
            <>
              <div className="zm-option">
                <span className="zm-option-label">Kiszerelés</span>
                <div className="zm-option-row">
                  {sizes.map((s) => (
                    <button
                      className={size === s.id ? "is-active" : ""}
                      key={s.id}
                      onClick={() => setSize(s.id)}
                      type="button"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="zm-option">
                <span className="zm-option-label">Őrlés</span>
                <div className="zm-option-row">
                  {grinds.map((g) => (
                    <button
                      className={grind === g.id ? "is-active" : ""}
                      key={g.id}
                      onClick={() => setGrind(g.id)}
                      type="button"
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="zm-buy-row">
            <div className="zm-stepper lg">
              <button
                aria-label="Kevesebb"
                onClick={() => setQty(Math.max(1, qty - 1))}
                type="button"
              >
                −
              </button>
              <span>{qty}</span>
              <button aria-label="Több" onClick={() => setQty(Math.min(20, qty + 1))} type="button">
                +
              </button>
            </div>
            <button
              className="zm-btn lg full"
              onClick={() => add(product.slug, size, grind, qty)}
              type="button"
            >
              Kosárba · {formatFt(price * qty)}
            </button>
          </div>

          <ul className="zm-buy-trust">
            <li>Pörkölés a feladás előtti napon</li>
            <li>Ingyenes szállítás 15 000 Ft felett</li>
            <li>Nem ízlett? Kicseréljük.</li>
          </ul>

          <div className="zm-accordion">
            <details open>
              <summary>Erről a tételről</summary>
              <p>{product.long}</p>
            </details>
            <details>
              <summary>Főzési ajánlás</summary>
              <p>
                Ajánlott módszerek: {product.brew.join(", ")}. Filterhez 60 g/l arányt javaslunk, 92
                fokos vízzel; espressóhoz 18 g őrleményből 38 g ital, 26–30 másodperc alatt.
              </p>
            </details>
            <details>
              <summary>Szállítás és elállás</summary>
              <p>
                Feladás 1 munkanapon belül, kézbesítés 1–2 nap. 14 napos elállási jog, bontatlan
                csomagolás esetén. Ha nem ízlik, írj — kicseréljük másik tételre.
              </p>
            </details>
          </div>
        </div>
      </div>

      <section className="zm-section">
        <div className="zm-section-head">
          <span className="zm-eyebrow">Ez is tetszhet</span>
          <h2>További tételek</h2>
        </div>
        <div className="zm-related">
          {related.map((p) => (
            <Link className="zm-related-card" href={`/demo/zamat/termek/${p.slug}`} key={p.slug}>
              <BagArt product={p} />
              <div>
                <strong>{p.name}</strong>
                <span>{p.roast} pörkölés</span>
                <em>{formatFt(p.price)}</em>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
