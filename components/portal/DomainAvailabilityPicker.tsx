"use client";

import { useEffect, useState } from "react";

type DomainResult = { domain: string; status: "available" | "taken" | "unknown"; source: string };

export function DomainAvailabilityPicker({ value, onChange }: { value: string; onChange: (domain: string) => void }) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<DomainResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSearch(search: string) {
    if (!search.trim()) return;
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/domains/check?name=${encodeURIComponent(search.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nem sikerült az ellenőrzés.");
      setResults(data.results || []);
    } catch (caught) {
      setResults([]); setError(caught instanceof Error ? caught.message : "Nem sikerült az ellenőrzés.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!query.trim() || query.trim() === value) return;
    const timer = window.setTimeout(() => runSearch(query), 550);
    return () => window.clearTimeout(timer);
  }, [query, value]);

  return <div className="domain-picker">
    <div className="domain-search-row">
      <div><span className="domain-search-prefix">www.</span><input aria-label="Domainnév keresése" value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value !== value) onChange(""); }} placeholder="markanev vagy markanev.design" /></div>
      <button className="button secondary" type="button" onClick={() => runSearch(query)} disabled={loading || !query.trim()}>{loading ? "Ellenőrzés…" : "Keresés"}</button>
    </div>
    <p className="domain-picker-help">Írj be csak egy nevet a népszerű végződésekhez, vagy egy teljes domaint bármely aktív végződéssel.</p>
    {error ? <p className="domain-picker-error">{error}</p> : null}
    {results.length ? <div className="domain-results">
      {results.map((result) => <button key={result.domain} type="button" className={`${result.status} ${value === result.domain ? "selected" : ""}`} disabled={result.status !== "available"} onClick={() => onChange(result.domain)}>
        <span><strong>{result.domain}</strong><small>{result.status === "available" ? "Előzetesen szabad" : result.status === "taken" ? "Foglalt" : "Külön ellenőrzést igényel"}</small></span>
        <b>{value === result.domain ? "Kiválasztva ✓" : result.status === "available" ? "Ezt kérem" : "—"}</b>
      </button>)}
    </div> : null}
    {value ? <div className="domain-selected"><span>Kiválasztott webcím</span><strong>{value}</strong><button type="button" onClick={() => { onChange(""); setQuery(""); setResults([]); }}>Módosítom</button></div> : null}
    <small className="domain-legal-note">Az eredmény élő nyilvántartói előellenőrzés. A domain véglegesen a regisztrátor sikeres visszaigazolásával foglalható.</small>
  </div>;
}
