"use client";

import { useState } from "react";

type ProjectBand = {
  key: string;
  label: string;
  copy: string;
  minPrice: number;
  maxPrice: number;
  minDays: number;
  maxDays: number;
};

const bands: ProjectBand[] = [
  {
    key: "landing",
    label: "Landing / bemutatkozó",
    copy: "Egy gyors, meggyőző oldal, ha most indulsz.",
    minPrice: 50000,
    maxPrice: 150000,
    minDays: 2,
    maxDays: 7
  },
  {
    key: "business",
    label: "Céges weboldal, több aloldallal",
    copy: "Bizalomépítés, szolgáltatások bemutatása, ajánlatkérés.",
    minPrice: 150000,
    maxPrice: 350000,
    minDays: 7,
    maxDays: 21
  },
  {
    key: "refresh",
    label: "Meglévő oldal felújítása",
    copy: "WordPress vagy egyedi — megnézem, mi gátol.",
    minPrice: 50000,
    maxPrice: 180000,
    minDays: 2,
    maxDays: 14
  },
  {
    key: "system",
    label: "Egyedi rendszer / ügyfélkapu",
    copy: "Belépés, admin, adatkezelés, automatizáció.",
    minPrice: 350000,
    maxPrice: 900000,
    minDays: 21,
    maxDays: 28
  }
];

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("hu-HU").format(value)} Ft`;
}

function formatDays(days: number) {
  if (days <= 10) {
    return `${days} nap`;
  }
  const weeks = Math.round(days / 7);
  return `${weeks} hét`;
}

export function PriceEstimator() {
  const [selected, setSelected] = useState(bands[0].key);
  const [complexity, setComplexity] = useState(35);

  const band = bands.find((item) => item.key === selected) ?? bands[0];
  const ratio = complexity / 100;
  const estimatedPrice = Math.round((band.minPrice + (band.maxPrice - band.minPrice) * ratio) / 5000) * 5000;
  const estimatedDays = Math.round(band.minDays + (band.maxDays - band.minDays) * ratio);

  return (
    <div className="estimator">
      <div className="estimator-types">
        {bands.map((item) => (
          <button
            className={item.key === selected ? "selected" : ""}
            key={item.key}
            onClick={() => setSelected(item.key)}
            type="button"
          >
            <strong>{item.label}</strong>
            <span>{item.copy}</span>
          </button>
        ))}
      </div>

      <div className="estimator-slider">
        <label htmlFor="complexity-slider">Mennyire összetett, amit szeretnél?</label>
        <input
          id="complexity-slider"
          type="range"
          min={0}
          max={100}
          value={complexity}
          onChange={(event) => setComplexity(Number(event.target.value))}
        />
        <div className="estimator-slider-labels">
          <span>Egyszerű, alap funkciók</span>
          <span>Igényes, sok funkció</span>
        </div>
      </div>

      <div className="estimator-result">
        <div>
          <span>Becsült ár</span>
          <strong>{formatPrice(estimatedPrice)}</strong>
        </div>
        <div>
          <span>Becsült átfutás</span>
          <strong>{formatDays(estimatedDays)}</strong>
        </div>
      </div>
      <p className="estimator-note">
        Ez egy tájékoztató becslés — a pontos árat és határidőt mindig a briefed alapján adom meg. Nem
        dolgozom rajta feleslegesen tovább a szükségesnél: egy kisebb oldal akár 1–2 nap alatt is
        elkészülhet.
      </p>
    </div>
  );
}
