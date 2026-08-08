"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="site-shell" style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "48px 20px" }}>
      <section style={{ maxWidth: 560, textAlign: "center" }}>
        <span className="eyebrow">PROJECTEDGE · HIBA</span>
        <h1>Valami félrement.</h1>
        <p>Az oldalt nem sikerült betölteni. Próbáld újra, vagy írj nekünk a kapcsolatfelületen.</p>
        <button className="button primary" onClick={() => reset()} type="button">Újrapróbálom</button>
      </section>
    </main>
  );
}
