"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "unauthorized") {
      setMessage("Nincs jogosultságod az admin felület eléréséhez. Jelentkezz be admin fiókkal.");
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("Beléptetés...");

    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !authData.user) {
      setLoading(false);
      setMessage("Nem sikerült belépni. Ellenőrizd az emailt és a jelszót.");
      return;
    }

    // Verify if user is in admin_users
    const { data: adminCheck, error: adminCheckError } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (adminCheckError || !adminCheck) {
      console.log("Nem sikerült belépni, mert az admin_users tábla üres, vagy ez a felhasználó hiányzik belőle.");
      console.log("A bejelentkezett felhasználó UUID-ja (ezt kell beillesztened az admin_users táblába):", authData.user.id);
      console.log(`Futtasd ezt az SQL-t a Supabase SQL editorában:\n\nINSERT INTO public.admin_users (user_id, email, full_name) VALUES ('${authData.user.id}', '${authData.user.email}', 'Admin');`);
      
      await supabase.auth.signOut();
      setLoading(false);
      setMessage("Ez a felhasználó nem rendelkezik adminisztrátori jogosultsággal.");
      return;
    }

    window.location.href = "/admin/dashboard";
  }

  return (
    <form className="admin-card" onSubmit={submit}>
      <p className="section-kicker">ProjectEdge Admin</p>
      <h1 style={{ fontSize: 42, lineHeight: 1 }}>Admin központ</h1>
      <p className="section-copy" style={{ color: "rgba(245,245,245,.72)" }}>
        Jelentkezz be az ügyfelek, projektek, ticketek és státuszok kezeléséhez.
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
