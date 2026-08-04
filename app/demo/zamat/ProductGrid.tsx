"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BagArt } from "./BagArt";
import { useCart } from "./CartContext";
import { formatFt, products } from "./data";

const filters = ["Mind", "Világos", "Közepes", "Sötét"] as const;
const sorts = [
  { id: "ajanlott", label: "Ajánlott" },
  { id: "olcso", label: "Ár szerint növekvő" },
  { id: "draga", label: "Ár szerint csökkenő" },
  { id: "ertekeles", label: "Legjobb értékelés" }
];

export function Stars({ value }: { value: number }) {
  return (
    <span className="zm-stars" aria-label={`${value} az 5-ből`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 20 20" className={i < Math.round(value) ? "is-on" : ""}>
          <path d="M10 1.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
        </svg>
      ))}
    </span>
  );
}

export function ProductGrid() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("Mind");
  const [sort, setSort] = useState("ajanlott");
  const { add, lastAdded } = useCart();

  const shown = useMemo(() => {
    const list = products.filter((p) => filter === "Mind" || p.roast === filter);
    const sorted = [...list];
    if (sort === "olcso") sorted.sort((a, b) => a.price - b.price);
    if (sort === "draga") sorted.sort((a, b) => b.price - a.price);
    if (sort === "ertekeles") sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [filter, sort]);

  return (
    <>
      <div className="zm-toolbar">
        <div className="zm-filters">
          {filters.map((f) => (
            <button
              className={filter === f ? "is-active" : ""}
              key={f}
              onClick={() => setFilter(f)}
              type="button"
            >
              {f}
            </button>
          ))}
        </div>
        <label className="zm-sort">
          <span>Rendezés</span>
          <select onChange={(e) => setSort(e.target.value)} value={sort}>
            {sorts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="zm-grid">
        {shown.map((p) => {
          const justAdded = lastAdded === `${p.slug}|250|szemes`;
          return (
            <article className="zm-product" key={p.slug}>
              <Link className="zm-product-art" href={`/demo/zamat/termek/${p.slug}`}>
                {p.badge && <span className="zm-badge">{p.badge}</span>}
                <BagArt product={p} />
              </Link>
              <div className="zm-product-body">
                <span className="zm-origin">{p.origin}</span>
                <h3>
                  <Link href={`/demo/zamat/termek/${p.slug}`}>{p.name}</Link>
                </h3>
                <div className="zm-rating">
                  <Stars value={p.rating} />
                  <span>({p.reviews})</span>
                </div>
                <p>{p.short}</p>
                <div className="zm-notes">
                  {p.notes.map((n) => (
                    <span key={n}>{n}</span>
                  ))}
                </div>
                <div className="zm-product-foot">
                  <div className="zm-price">
                    <strong>{formatFt(p.price)}</strong>
                    {p.oldPrice && <s>{formatFt(p.oldPrice)}</s>}
                    <span>250 g</span>
                  </div>
                  <button
                    className={`zm-btn sm ${justAdded ? "is-added" : ""}`}
                    onClick={() => add(p.slug, "250", "szemes")}
                    type="button"
                  >
                    {justAdded ? "Kosárban" : "Kosárba"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
