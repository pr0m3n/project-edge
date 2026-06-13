"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("Beléptetés...");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setMessage("Nem sikerült belépni. Ellenőrizd az emailt és a jelszót.");
      return;
    }

    window.location.href = "/admin/dashboard";
  }

  return (
    <form className="admin-card" onSubmit={submit}>
      <p className="section-kicker">ProjectEdge Admin</p>
      <h1 style={{ fontSize: 42, lineHeight: 1 }}>Lead központ</h1>
      <p className="section-copy" style={{ color: "rgba(245,245,245,.72)" }}>
        Jelentkezz be a beérkező ajánlatkérések, ügyfelek és projektek kezeléséhez.
      </p>
      <div className="form-grid" style={{ gridTemplateColumns: "1fr", marginTop: 24 }}>
        <div className="field">
          <label htmlFor="email" style={{ color: "#f5f5f5" }}>Email</label>
          <input
            id="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@projectedge.hu"
          />
        </div>
        <div className="field">
          <label htmlFor="password" style={{ color: "#f5f5f5" }}>Jelszó</label>
          <input
            id="password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </div>
      </div>
      <button className="button primary" disabled={loading} style={{ width: "100%", marginTop: 18 }}>
        {loading ? "Belépés..." : "Belépés"}
      </button>
      <p className="form-status" style={{ color: "rgba(245,245,245,.72)" }}>{message}</p>
    </form>
  );
}
