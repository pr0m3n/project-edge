"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type Lead = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  website: string | null;
  project_type: string;
  budget: string | null;
  goals: string;
  status: string;
  notes: string | null;
};

const statuses = [
  ["new", "Új"],
  ["contacted", "Megkeresve"],
  ["proposal_sent", "Ajánlat elküldve"],
  ["won", "Nyert"],
  ["lost", "Elveszett"],
  ["archived", "Archivált"]
];

export function AdminDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const stats = useMemo(() => {
    return {
      total: leads.length,
      fresh: leads.filter((lead) => lead.status === "new").length,
      won: leads.filter((lead) => lead.status === "won").length
    };
  }, [leads]);

  async function loadLeads() {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      window.location.href = "/admin";
      return;
    }

    const { data, error } = await supabase
      .from("quote_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Nem sikerült betölteni a leadeket. Ellenőrizd az admin jogosultságot és az RLS szabályokat.");
      setLoading(false);
      return;
    }

    setLeads(data ?? []);
    setLoading(false);
  }

  async function updateLead(id: string, patch: Partial<Pick<Lead, "status" | "notes">>) {
    const { error } = await supabase.from("quote_requests").update(patch).eq("id", id);

    if (error) {
      setMessage("Nem sikerült menteni a módosítást.");
      return;
    }

    setLeads((current) => current.map((lead) => (lead.id === id ? { ...lead, ...patch } : lead)));
    setMessage("Módosítás mentve.");
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/admin";
  }

  useEffect(() => {
    loadLeads();
  }, []);

  return (
    <div className="admin-dashboard">
      <header className="admin-header">
        <div>
          <p className="section-kicker">ProjectEdge CRM</p>
          <h1 style={{ fontSize: 56, lineHeight: 1 }}>Ajánlatkérések</h1>
          <p className="section-copy" style={{ color: "rgba(245,245,245,.72)" }}>
            {stats.total} lead összesen, {stats.fresh} új, {stats.won} nyert.
          </p>
        </div>
        <button className="button ghost" onClick={signOut} style={{ color: "#f5f5f5", borderColor: "rgba(245,245,245,.24)" }}>
          Kilépés
        </button>
      </header>

      {message ? <p className="form-status" style={{ color: "#f5f5f5" }}>{message}</p> : null}

      <div className="lead-table">
        <div className="lead-row header">
          <span>Érdeklődő</span>
          <span>Projekt</span>
          <span>Büdzsé</span>
          <span>Státusz</span>
          <span>Jegyzet</span>
        </div>
        {loading ? (
          <div className="lead-row">
            <strong>Betöltés...</strong>
          </div>
        ) : leads.length === 0 ? (
          <div className="lead-row">
            <strong>Még nincs ajánlatkérés.</strong>
            <span>Amint valaki kitölti a főoldali űrlapot, itt fog megjelenni.</span>
          </div>
        ) : (
          leads.map((lead) => (
            <article className="lead-row" key={lead.id}>
              <div>
                <strong>{lead.name}</strong>
                <p>{lead.email}</p>
                <p>{lead.phone || lead.company || "Nincs extra adat"}</p>
              </div>
              <div>
                <strong>{lead.project_type}</strong>
                <p>{lead.goals}</p>
              </div>
              <div>
                <span className="status-pill">{lead.budget || "nincs megadva"}</span>
              </div>
              <div>
                <select
                  value={lead.status}
                  onChange={(event) => updateLead(lead.id, { status: event.target.value })}
                >
                  {statuses.map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <textarea
                  defaultValue={lead.notes ?? ""}
                  onBlur={(event) => updateLead(lead.id, { notes: event.target.value })}
                  placeholder="Következő lépés, ajánlat, hívás dátuma..."
                  style={{ minHeight: 92 }}
                />
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
