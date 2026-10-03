"use client";

import type { CommercialModel } from "@/lib/subscriptions";

export function CommercialModelPicker({ value, onChange }: { value: CommercialModel; onChange: (model: CommercialModel) => void }) {
  return (
    <div className="model-switch" role="radiogroup" aria-label="Weboldal konstrukciója">
      <i className={value === "purchase" ? "right" : ""} aria-hidden="true" />
      {(["subscription", "purchase"] as const).map((model, index) => (
        <button type="button" role="radio" aria-checked={value === model} tabIndex={value === model ? 0 : -1}
          className={value === model ? "active" : ""} key={model}
          onClick={() => onChange(model)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? "subscription" : event.key === "End" ? "purchase" : model === "subscription" ? "purchase" : "subscription";
            onChange(next);
            const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button");
            buttons?.[next === "subscription" ? 0 : 1]?.focus();
          }}>
          <span>0{index + 1}</span>
          <strong>{model === "subscription" ? "Havidíjas weboldal" : "Weboldal megvásárlása"}</strong>
          <small>{model === "subscription" ? "Induló díj nélkül, folyamatos üzemeltetéssel" : "Egyszeri díj, saját tulajdon és teljes átadás"}</small>
        </button>
      ))}
    </div>
  );
}
