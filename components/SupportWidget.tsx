"use client";

import { FormEvent, useState } from "react";
import { usePathname } from "next/navigation";

const initialForm = {
  name: "",
  email: "",
  message: ""
};

export function SupportWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [notice, setNotice] = useState("");

  if (pathname.startsWith("/admin")) {
    return null;
  }

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setNotice("Küldöm az üzenetet...");

    const response = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    if (!response.ok) {
      setStatus("error");
      setNotice("Nem sikerült elküldeni. Nézd meg az email címet, vagy próbáld újra.");
      return;
    }

    setForm(initialForm);
    setStatus("success");
    setNotice("Megkaptam az üzenetet. Válaszolok, amint tudok.");
  }

  return (
    <aside className={`support-widget ${open ? "open" : ""}`} aria-label="Ügyfélszolgálati kérdés">
      {open ? (
        <div className="support-panel">
          <div className="support-head">
            <div>
              <span>Kérdésed van?</span>
              <strong>Írj nyugodtan</strong>
            </div>
            <button aria-label="Ticket ablak bezárása" onClick={() => setOpen(false)} type="button">
              ×
            </button>
          </div>
          <form onSubmit={submit}>
            <input
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Név"
            />
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              placeholder="Email"
            />
            <textarea
              required
              value={form.message}
              onChange={(event) => updateField("message", event.target.value)}
              placeholder="Miben segíthetek?"
            />
            <button className="button primary" disabled={status === "loading"} type="submit">
              {status === "loading" ? "Küldés..." : "Üzenet küldése"}
            </button>
            <p className={`support-notice ${status}`}>{notice}</p>
          </form>
        </div>
      ) : null}
      <button className="support-trigger" onClick={() => setOpen((current) => !current)} type="button">
        <span />
        Kérdezek
      </button>
    </aside>
  );
}
