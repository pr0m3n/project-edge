"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "./CartContext";
import { findProduct, formatFt, type Product } from "./data";
import { beanColor, beanTemp, formatMinute, formatTemp, toHex } from "./roast";

/**
 * A főoldal hero-ja: pörkölési fokonként egy-egy termékfotó. A gombokra a kép
 * átúszik a választott kávéra — a kosárba rakás innen egy kattintás.
 *
 * Korábban egy nagy, forgó 3D zacskó állt itt; a tulajdonosnak nem tetszett,
 * és fotóval kérte. A 3D zacskó a termékoldalakon megmaradt.
 *
 * Mindhárom kép egyszerre van a DOM-ban, egymásra rakva, és csak az átlátszóság
 * vált: így a váltás azonnali, nincs töltési villanás.
 */

const PICKS = [
  { label: "Világos", slug: "etiopia-guji", photo: "/demo/zamat/hero-vilagos.webp", alt: "Terrakotta kávészacskó, világos pörkölésű szemek és filteres kávéfőző" },
  { label: "Közepes", slug: "kolumbia-huila", photo: "/demo/zamat/hero-kozepes.webp", alt: "Okkersárga kávészacskó, közepes pörkölésű szemek fakanálban, kézi daráló" },
  { label: "Sötét", slug: "brazil-cerrado", photo: "/demo/zamat/hero-sotet.webp", alt: "Sötétbarna kávészacskó, sötét pörkölésű szemek és egy csésze espresso" }
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

      <div className="zm-hero-photo">
        {PICKS.map((pick, index) => (
          <Image
            alt={pick.slug === slug ? pick.alt : ""}
            className={pick.slug === slug ? "is-on" : ""}
            fill
            key={pick.slug}
            priority={index === 0}
            sizes="(max-width: 1000px) 100vw, 600px"
            src={pick.photo}
          />
        ))}
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
