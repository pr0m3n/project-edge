"use client";

import { measurementEnabled } from "@/lib/analytics";

export function CookieSettingsButton() {
  if (!measurementEnabled) return null;

  return (
    <button
      className="footer-cookie-button"
      type="button"
      onClick={() => window.dispatchEvent(new Event("projectedge:open-cookie-settings"))}
    >
      Süti beállítások
    </button>
  );
}
