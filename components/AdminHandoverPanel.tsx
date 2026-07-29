import { useState } from "react";
import {
  ALL_HANDOVER_SERVICES,
  HANDOVER_SERVICE_LABELS,
  activeHandoverStep,
  completeHandoverStep,
  handoverProgress,
  handoverServicesOf,
  reconcileHandoverPlan,
  resolveHandoverSteps,
  setHandoverStepValue,
  type HandoverService,
  type HandoverStepState
} from "@/lib/handover";

type AdminHandoverPanelProps = {
  steps: HandoverStepState[] | null;
  /** A projekt indulásakor még nincs terv — ez állítja össze az első verziót. */
  onChange: (steps: HandoverStepState[]) => void;
  /** Értesítés az ügyfélnek, amikor egy admin lépés lezárul és rá kerül a sor. */
  onStepCompleted?: (stepId: string, title: string) => void;
};

/**
 * Az admin oldali átadás-vezérlő. A régi szabad szöveges checklist helyett
 * ugyanazt a lépéssort látja az admin, mint az ügyfél — így nem kell egyeztetni,
 * hogy éppen kinél van a labda.
 */
export function AdminHandoverPanel({ steps, onChange, onStepCompleted }: AdminHandoverPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const resolved = resolveHandoverSteps(steps);
  const active = activeHandoverStep(steps);
  const progress = handoverProgress(steps);
  const services = handoverServicesOf(steps);

  function toggleService(service: HandoverService) {
    const next = services.includes(service)
      ? services.filter((item) => item !== service)
      : [...services, service];
    onChange(reconcileHandoverPlan(steps, next));
  }

  function completeActive(value: string) {
    if (!active) return;
    const result = completeHandoverStep(steps, active.def.id, "admin", value);
    if (result.error) return;
    onChange(result.steps);
    onStepCompleted?.(active.def.id, active.def.title);
    setDrafts((current) => ({ ...current, [active.def.id]: "" }));
  }

  /** Az ügyfél lépésének igazolása helyette — pl. képernyőmegosztás közben megtette. */
  function confirmForClient() {
    if (!active) return;
    const next = (steps ?? []).map((step) =>
      step.id === active.def.id ? { ...step, done: true, done_at: new Date().toISOString() } : step
    );
    onChange(next);
  }

  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: "16px", marginTop: "16px", display: "grid", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <strong>Projekt összetevői és átadás {resolved.length ? `(${progress.done}/${progress.total})` : ""}</strong>
        <small style={{ color: "var(--muted)" }}>
          {active ? (active.def.owner === "admin" ? "Rajtad a sor" : "Ügyfélre vár") : resolved.length ? "Kész" : "Még nincs kijelölve"}
        </small>
      </div>

      {/* Ezt a briefek átolvasása után érdemes kijelölni: ebből derül ki, milyen
          útmutatókat és lépéseket kap egyáltalán az ügyfél. Statikus oldalnál a
          Supabase / Resend / GitHub kikapcsolva marad, és akkor az ügyfélnek
          eszébe sem jut fiókot nyitni hozzájuk. */}
      <small style={{ color: "var(--muted)", lineHeight: 1.5 }}>
        Jelöld ki, mit használ a projekt. Csak a bekapcsolt szolgáltatások útmutatóit és lépéseit kapja meg az ügyfél.
        A Vercel és a domain minden projektnél kell; a többit csak akkor kapcsold be, ha tényleg van rá szükség.
      </small>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {ALL_HANDOVER_SERVICES.map((service) => {
          const on = services.includes(service);
          return (
            <button
              key={service}
              type="button"
              onClick={() => toggleService(service)}
              style={{
                border: `1px solid ${on ? "#76ABAE" : "var(--line)"}`,
                background: on ? "rgba(118,171,174,0.16)" : "transparent",
                color: "inherit",
                borderRadius: "999px",
                padding: "5px 11px",
                fontSize: "12px",
                cursor: "pointer"
              }}
            >
              {on ? "✓ " : "+ "}
              {HANDOVER_SERVICE_LABELS[service]}
            </button>
          );
        })}
      </div>

      {!resolved.length ? (
        <small style={{ color: "var(--muted)" }}>
          Egyet sem jelöltél ki — az ügyfél most nem lát átadási lépést és útmutatót.
        </small>
      ) : null}

      {active ? (
        <div
          style={{
            background: active.def.owner === "admin" ? "rgba(255,87,34,0.10)" : "rgba(118,171,174,0.10)",
            border: `1px solid ${active.def.owner === "admin" ? "rgba(255,87,34,0.35)" : "rgba(118,171,174,0.35)"}`,
            borderRadius: "14px",
            padding: "14px",
            display: "grid",
            gap: "10px"
          }}
        >
          <div>
            <small style={{ textTransform: "uppercase", letterSpacing: "0.6px", fontSize: "11px", fontWeight: 700 }}>
              {active.def.owner === "admin" ? "A te lépésed" : "Az ügyfél lépése"} · {HANDOVER_SERVICE_LABELS[active.def.service]}
            </small>
            <strong style={{ display: "block", marginTop: "2px" }}>{active.def.title}</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: "13px", opacity: 0.85 }}>{active.def.detail}</p>
          </div>

          {active.def.input ? (
            <label className="admin-field">
              <span>{active.def.input.label}</span>
              {active.def.input.multiline ? (
                <textarea
                  value={drafts[active.def.id] ?? active.state.value ?? ""}
                  placeholder={active.def.input.placeholder}
                  onChange={(event) => setDrafts((current) => ({ ...current, [active.def.id]: event.target.value }))}
                  onBlur={(event) => onChange(setHandoverStepValue(steps, active.def.id, event.target.value))}
                />
              ) : (
                <input
                  value={drafts[active.def.id] ?? active.state.value ?? ""}
                  placeholder={active.def.input.placeholder}
                  onChange={(event) => setDrafts((current) => ({ ...current, [active.def.id]: event.target.value }))}
                  onBlur={(event) => onChange(setHandoverStepValue(steps, active.def.id, event.target.value))}
                />
              )}
              {active.def.input.sharedWith === "client" ? (
                <small style={{ color: "var(--muted)" }}>Ezt a szöveget az ügyfél a saját felületén látja.</small>
              ) : null}
            </label>
          ) : null}

          {active.def.owner === "admin" ? (
            <button
              className="button primary"
              type="button"
              style={{ minHeight: "auto", padding: "8px 14px", width: "fit-content" }}
              onClick={() => completeActive(drafts[active.def.id] ?? active.state.value ?? "")}
            >
              Kész, tovább az ügyfélre
            </button>
          ) : (
            <button
              className="button secondary"
              type="button"
              style={{ minHeight: "auto", padding: "8px 14px", width: "fit-content" }}
              onClick={confirmForClient}
            >
              Ügyfél helyett igazolom (pl. képernyőmegosztáson megtette)
            </button>
          )}
        </div>
      ) : null}

      {resolved.length ? (
        <details className="admin-collapse">
          <summary>Minden átadási lépés és az ügyfél válaszai</summary>
          <div style={{ display: "grid", gap: "6px" }}>
            {resolved.map((item) => (
              <div
                key={item.def.id}
                style={{
                  display: "grid",
                  gap: "2px",
                  background: "rgba(48,56,65,0.05)",
                  padding: "8px 10px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  opacity: item.state.done ? 0.7 : 1
                }}
              >
                <span>
                  <strong>{item.state.done ? "✓" : item.def.owner === "admin" ? "MI" : "ÜGYFÉL"}</strong> {item.def.title}
                </span>
                {item.state.value ? (
                  <span style={{ color: "var(--muted)", whiteSpace: "pre-wrap" }}>{item.state.value}</span>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
