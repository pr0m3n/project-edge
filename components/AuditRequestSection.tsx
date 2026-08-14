"use client";

import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/analytics";

type AuditFormState = {
  name: string;
  email: string;
  websiteUrl: string;
  challenge: string;
};

const CHALLENGE_OPTIONS = [
  "Kevés megkeresést hoz",
  "Lassú a betöltése",
  "Elavult a design",
  "Mobilról nehezen használható",
  "Nem tudom, mi a hiba, de nem működik jól"
];

export function AuditRequestSection() {
  const [form, setForm] = useState<AuditFormState>({
    name: "",
    email: "",
    websiteUrl: "",
    challenge: CHALLENGE_OPTIONS[0]
  });
  const [startedAt, setStartedAt] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setStartedAt(Date.now());
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!form.name.trim() || !form.email.trim() || !form.websiteUrl.trim()) {
      setError("Kérlek töltsd ki a neved, az email címed és a weboldalad URL-jét.");
      return;
    }

    setLoading(true);
    trackEvent("audit_request_started", { challenge: form.challenge });

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          startedAt
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Hiba történt a küldés során.");
      }

      setSubmitted(true);
      trackEvent("audit_request_completed", { website: form.websiteUrl });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Váratlan hiba történt. Kérlek próbáld újra.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="audit-section" id="ingyenes-audit">
      <div className="audit-container">
        <div className="audit-editorial">
          <p className="micro-label">Ingyenes gyorselemzés · 24 órán belül</p>
          <h2>Nem hoz elég vevőt a jelenlegi oldalad?</h2>
          <p className="audit-lead">
            Add meg a weboldalad címét, és <strong>24 órán belül</strong> küldök egy közvetlen,
            emberi 3 pontos elemzést: betöltési sebesség, mobilos használhatóság és konverziós felépítés szerint.
          </p>
          <ul className="audit-perks">
            <li>
              <span>01</span>
              <div>
                <strong>Sebesség & Kód</strong>
                <small>Megnézem, mi lassítja a betöltést és rontja a Google helyezést.</small>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Konverzió & Ajánlat</strong>
                <small>Kiderül, miért lépnek le a látogatók kapcsolatfelvétel nélkül.</small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Azonnal hasznosítható tippek</strong>
                <small>Konkrét javítási javaslatok, felesleges szakzsargon és elköteleződés nélkül.</small>
              </div>
            </li>
          </ul>
        </div>

        <div className="audit-card">
          {submitted ? (
            <div className="audit-success" role="status">
              <span className="audit-success-icon">✓</span>
              <h3>Köszönöm, megkaptam!</h3>
              <p>
                Rögzítettem a(z) <strong>{form.websiteUrl}</strong> címet. 24 órán belül átnézem, és
                részletes visszajelzést küldök a megadott email címedre (<strong>{form.email}</strong>).
              </p>
              <button
                className="button secondary"
                onClick={() => {
                  setSubmitted(false);
                  setForm({ name: "", email: "", websiteUrl: "", challenge: CHALLENGE_OPTIONS[0] });
                }}
                type="button"
              >
                Új elemzés kérése
              </button>
            </div>
          ) : (
            <form className="audit-form" onSubmit={handleSubmit}>
              <div className="audit-form-head">
                <span className="audit-pill">0 FT · NINCS ELKÖTELEZŐDÉS</span>
                <h3>Kérd az ingyenes 3 pontos elemzést</h3>
              </div>

              <div className="audit-fields">
                <label className="audit-field">
                  <span>Neved</span>
                  <input
                    autoComplete="name"
                    disabled={loading}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Például: Kovács Péter"
                    required
                    type="text"
                    value={form.name}
                  />
                </label>

                <label className="audit-field">
                  <span>Email címed (ide küldöm az eredményt)</span>
                  <input
                    autoComplete="email"
                    disabled={loading}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="peter@vallalkozas.hu"
                    required
                    type="email"
                    value={form.email}
                  />
                </label>

                <label className="audit-field">
                  <span>Jelenlegi weboldalad címe</span>
                  <input
                    disabled={loading}
                    onChange={(e) => setForm((prev) => ({ ...prev, websiteUrl: e.target.value }))}
                    placeholder="https://sajatoldalam.hu"
                    required
                    type="text"
                    value={form.websiteUrl}
                  />
                </label>

                <label className="audit-field">
                  <span>Mi a legnagyobb gondod az oldallal?</span>
                  <select
                    disabled={loading}
                    onChange={(e) => setForm((prev) => ({ ...prev, challenge: e.target.value }))}
                    value={form.challenge}
                  >
                    {CHALLENGE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error ? <p className="audit-error" role="alert">{error}</p> : null}

              <button className="button primary audit-submit-btn" disabled={loading} type="submit">
                {loading ? "Küldés folyamatban..." : "Kérem az ingyenes elemzést →"}
              </button>
              <small className="audit-privacy-note">
                Nem küldök hírlevelet vagy kéretlen leveleket. Csak az elkészült elemzést kapod meg.
              </small>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
