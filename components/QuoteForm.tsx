"use client";

import { FormEvent, useState } from "react";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  website: "",
  projectType: "premium-business-site",
  budget: "not-sure",
  timeline: "1-2 months",
  goals: ""
};

export function QuoteForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("Mentem az ajánlatkérést...");

    const response = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    if (!response.ok) {
      setStatus("error");
      setMessage("Valami nem sikerült. Ellenőrizd a mezőket, vagy próbáld újra pár perc múlva.");
      return;
    }

    setStatus("success");
    setForm(initialForm);
    setMessage("Megkaptam az ajánlatkérést. Hamarosan jelentkezem egy pontos következő lépéssel.");
  }

  return (
    <form className="quote-panel" onSubmit={submit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="name">Név *</label>
          <input
            id="name"
            required
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Boczán Patrik"
          />
        </div>
        <div className="field">
          <label htmlFor="email">Email *</label>
          <input
            id="email"
            required
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            placeholder="hello@ceged.hu"
          />
        </div>
        <div className="field">
          <label htmlFor="phone">Telefon</label>
          <input
            id="phone"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="+36 ..."
          />
        </div>
        <div className="field">
          <label htmlFor="company">Cég / márka</label>
          <input
            id="company"
            value={form.company}
            onChange={(event) => updateField("company", event.target.value)}
            placeholder="ProjectEdge"
          />
        </div>
        <div className="field">
          <label htmlFor="website">Jelenlegi weboldal</label>
          <input
            id="website"
            value={form.website}
            onChange={(event) => updateField("website", event.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="field">
          <label htmlFor="projectType">Projekt típusa *</label>
          <select
            id="projectType"
            required
            value={form.projectType}
            onChange={(event) => updateField("projectType", event.target.value)}
          >
            <option value="premium-business-site">Prémium céges weboldal</option>
            <option value="landing-page">Kampány / landing page</option>
            <option value="redesign">Meglévő oldal újratervezése</option>
            <option value="web-app">Webapp / admin rendszer</option>
            <option value="care-plan">Karbantartás és növekedési csomag</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="budget">Tervezett büdzsé</label>
          <select
            id="budget"
            value={form.budget}
            onChange={(event) => updateField("budget", event.target.value)}
          >
            <option value="not-sure">Még nem tudom</option>
            <option value="300k-600k">300 000 - 600 000 Ft</option>
            <option value="600k-1m">600 000 - 1 000 000 Ft</option>
            <option value="1m-2m">1 000 000 - 2 000 000 Ft</option>
            <option value="2m-plus">2 000 000 Ft felett</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="timeline">Ideális indulás *</label>
          <select
            id="timeline"
            required
            value={form.timeline}
            onChange={(event) => updateField("timeline", event.target.value)}
          >
            <option value="asap">Minél hamarabb</option>
            <option value="1-2 months">1-2 hónapon belül</option>
            <option value="quarter">Ebben a negyedévben</option>
            <option value="planning">Még tervezési fázis</option>
          </select>
        </div>
        <div className="field full">
          <label htmlFor="goals">Mit kell elérnie az oldalnak? *</label>
          <textarea
            id="goals"
            required
            value={form.goals}
            onChange={(event) => updateField("goals", event.target.value)}
            placeholder="Több ajánlatkérés, prémiumabb márkaérzet, gyorsabb ügyfélszerzés, automatizált folyamatok..."
          />
        </div>
      </div>
      <button className="button primary" disabled={status === "loading"} type="submit">
        {status === "loading" ? "Küldés..." : "Ajánlatkérés elküldése"}
      </button>
      <p className={`form-status ${status === "success" ? "success" : ""} ${status === "error" ? "error" : ""}`}>
        {message}
      </p>
    </form>
  );
}
