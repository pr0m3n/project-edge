"use client";

import Link from "next/link";
import { useState } from "react";
import { BagViewer } from "./BagViewer";
import { useCart } from "./CartContext";
import { findProduct, formatFt, type Product } from "./data";
import { beanColor, beanTemp, formatMinute, formatTemp, toHex } from "./roast";

/**
 * A főoldal hero-ja: egy nagy, lassan forgó 3D zacskó. A pörkölési fok
 * gombjaira a zacskó egyet pördül, és „átöltözik" a választott kávéra —
 * a kosárba rakás innen egy kattintás.
 */

const PICKS = [
  { label: "Világos", slug: "etiopia-guji" },
  { label: "Közepes", slug: "kolumbia-huila" },
  { label: "Sötét", slug: "brazil-cerrado" }
];

export function ZamatHero() {
  const [slug, setSlug] = useState(PICKS[0].slug);
  const product = findProduct(slug) as Product;
  const { add, lastAdded } = useCart();
  const added = lastAdded === `${product.slug}|250|szemes`;

  return (
    <section className="zm-hero" id="porkoles">
      <div className="zm-hero-head">
        <p className="zm-kicker">Budapesti kis tételes pörkölő</p>
        <h1>Kedden pörköltük, csütörtökön nálad van.</h1>
      </div>

      <div className="zm-hero-bag">
        <BagViewer product={product} scrollSpin zoom={1.18} />
      </div>

      <div className="zm-hero-controls">
        <p className="zm-hero-lead">Heti kétszer pörkölünk egy 12 kilós dobban. Válassz pörkölést:</p>

        <div className="zm-hero-picks" role="group" aria-label="Pörkölési fok">
          {PICKS.map((pick) => {
            const item = findProduct(pick.slug);
            return (
              <button
                aria-pressed={pick.slug === slug}
                className={pick.slug === slug ? "is-active" : ""}
                key={pick.slug}
                onClick={() => setSlug(pick.slug)}
                type="button"
              >
                <i aria-hidden="true" style={{ background: toHex(beanColor(item?.drop ?? 10)) }} />
                {pick.label}
              </button>
            );
          })}
        </div>

        <div className="zm-hero-product" aria-live="polite">
          <div>
            <Link href={`/demo/zamat/termek/${product.slug}`}>{product.name}</Link>
            <span>{product.notes.join(" · ")}</span>
            {product.drop && (
              <small>
                Kivétel a dobból {formatMinute(product.drop)} · {formatTemp(beanTemp(product.drop))}
              </small>
            )}
          </div>
          <button className={`zm-btn lg${added ? " is-added" : ""}`} onClick={() => add(product.slug, "250", "szemes")} type="button">
            {added ? "Kosárban" : `Kosárba · ${formatFt(product.price)}`}
          </button>
        </div>
      </div>
    </section>
  );
}
