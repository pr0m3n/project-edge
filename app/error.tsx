"use client";

import { useEffect } from "react";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error caught:", error);
  }, [error]);

  return (
    <main className="site-shell light-page not-found-page">
      <SiteNav />

      <section className="not-found-hero">
        <div className="not-found-noise" aria-hidden="true" />
        <div className="not-found-container">
          <div className="not-found-header">
            <span className="not-found-badge error">500 // RENDSZERHIBA</span>
            <h1>Valami váratlan történt.</h1>
            <p className="not-found-lead">
              A kért művelet során technikai hiba lépett fel. A hibát naplóztuk, kérlek próbáld meg
              újratölteni a nézetet, vagy térj vissza a kezdőlapra.
            </p>
          </div>

          <div className="not-found-actions">
            <button className="button primary" onClick={() => reset()} type="button">
              Oldal újratöltése
            </button>
            <TransitionLink className="button spectral" href="/">
              Vissza a kezdőlapra
            </TransitionLink>
          </div>
        </div>
      </section>
    </main>
  );
}
