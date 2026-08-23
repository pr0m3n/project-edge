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
    <div style={{ borderTop: "1px solid var(--adm-ink-08)", paddingTop: "16px", marginTop: "16px", display: "grid", gap: "12px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <strong style={{ color: "var(--adm-text)", fontSize: "15px" }}>
          Projekt összetevői és átadás {resolved.length ? `(${progress.done}/${progress.total})` : ""}
        </strong>
        <small style={{ color: active?.def.owner === "admin" ? "#FFA726" : "var(--adm-accent-text)", fontWeight: 700 }}>
          {active ? (active.def.owner === "admin" ? "⚡ Rajtad a sor" : "⏳ Ügyfélre vár") : resolved.length ? "🟢 Kész" : "Még nincs kijelölve"}
        </small>
      </div>

      <small style={{ color: "var(--adm-text-muted)", lineHeight: 1.5, fontSize: "12.5px" }}>
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
                border: on ? "1px solid var(--adm-accent-text)" : "1px solid var(--adm-ink-12)",
                background: on ? "rgba(118,171,174,0.18)" : "var(--adm-inset)",
                color: on ? "var(--adm-accent-text)" : "var(--adm-text-muted)",
                borderRadius: "999px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: on ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              {on ? "✓ " : "+ "}
              {HANDOVER_SERVICE_LABELS[service]}
            </button>
          );
        })}
      </div>

      {!resolved.length ? (
        <small style={{ color: "var(--adm-text-muted)" }}>
          Egyet sem jelöltél ki — az ügyfél most nem lát átadási lépést és útmutatót.
        </small>
      ) : null}

      {active ? (
        <div
          style={{
            background: active.def.owner === "admin" ? "rgba(255,87,34,0.12)" : "var(--adm-inset)",
            border: active.def.owner === "admin" ? "1px solid rgba(255,87,34,0.4)" : "1px solid rgba(118,171,174,0.35)",
            borderRadius: "14px",
            padding: "16px",
            display: "grid",
            gap: "12px"
          }}
        >
          <div>
            <small style={{ textTransform: "uppercase", letterSpacing: "0.6px", fontSize: "11px", fontWeight: 800, color: active.def.owner === "admin" ? "#FFA726" : "var(--adm-accent-text)" }}>
              {active.def.owner === "admin" ? "⚡ A te lépésed" : "👤 Az ügyfél lépése"} · {HANDOVER_SERVICE_LABELS[active.def.service]}
            </small>
            <strong style={{ display: "block", marginTop: "4px", color: "var(--adm-text)", fontSize: "15px" }}>{active.def.title}</strong>
            <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--adm-text-muted)", lineHeight: 1.45 }}>{active.def.detail}</p>
          </div>

          {active.def.input ? (
            <label style={{ display: "grid", gap: "6px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--adm-accent-text)" }}>{active.def.input.label}</span>
              {active.def.input.multiline ? (
                <textarea
                  value={drafts[active.def.id] ?? active.state.value ?? ""}
                  placeholder={active.def.input.placeholder}
                  onChange={(event) => setDrafts((current) => ({ ...current, [active.def.id]: event.target.value }))}
                  onBlur={(event) => onChange(setHandoverStepValue(steps, active.def.id, event.target.value))}
                  style={{
                    background: "#090C10",
                    border: "1px solid var(--adm-ink-15)",
                    borderRadius: "8px",
                    color: "var(--adm-text)",
                    fontSize: "13px",
                    padding: "8px 12px",
                    minHeight: "80px"
                  }}
                />
              ) : (
                <input
                  value={drafts[active.def.id] ?? active.state.value ?? ""}
                  placeholder={active.def.input.placeholder}
                  onChange={(event) => setDrafts((current) => ({ ...current, [active.def.id]: event.target.value }))}
                  onBlur={(event) => onChange(setHandoverStepValue(steps, active.def.id, event.target.value))}
                  style={{
                    background: "#090C10",
                    border: "1px solid var(--adm-ink-15)",
                    borderRadius: "8px",
                    color: "var(--adm-text)",
                    fontSize: "13px",
                    padding: "8px 12px"
                  }}
                />
              )}
              {active.def.input.sharedWith === "client" ? (
                <small style={{ color: "var(--adm-text-muted)", fontSize: "11.5px" }}>Ezt a szöveget az ügyfél a saját felületén látja.</small>
              ) : null}
            </label>
          ) : null}

          {active.def.owner === "admin" ? (
            <button
              className="admin-btn-primary"
              type="button"
              style={{ minHeight: "auto", padding: "8px 16px", width: "fit-content", fontSize: "12.5px" }}
              onClick={() => completeActive(drafts[active.def.id] ?? active.state.value ?? "")}
            >
              Kész, tovább az ügyfélre →
            </button>
          ) : (
            <button
              className="admin-btn-secondary"
              type="button"
              style={{ minHeight: "auto", padding: "8px 16px", width: "fit-content", fontSize: "12.5px" }}
              onClick={confirmForClient}
            >
              ✓ Ügyfél helyett igazolom (pl. képernyőmegosztáson megtette)
            </button>
          )}
        </div>
      ) : null}

      {resolved.length ? (
        <details className="admin-collapse" style={{ marginTop: "4px" }}>
          <summary style={{ color: "var(--adm-text-muted)", cursor: "pointer", fontSize: "13px" }}>Minden átadási lépés és az ügyfél válaszai</summary>
          <div style={{ display: "grid", gap: "6px", marginTop: "8px" }}>
            {resolved.map((item) => (
              <div
                key={item.def.id}
                style={{
                  display: "grid",
                  gap: "3px",
                  background: "var(--adm-inset)",
                  border: "1px solid var(--adm-ink-06)",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  opacity: item.state.done ? 0.75 : 1
                }}
              >
                <span style={{ color: "var(--adm-text)" }}>
                  <strong style={{ color: item.state.done ? "var(--adm-accent-text)" : "#FFA726" }}>
                    {item.state.done ? "✓" : item.def.owner === "admin" ? "MI" : "ÜGYFÉL"}
                  </strong>{" "}
                  {item.def.title}
                </span>
                {item.state.value ? (
                  <span style={{ color: "var(--adm-text-muted)", whiteSpace: "pre-wrap", fontSize: "12px", marginTop: "2px" }}>
                    {item.state.value}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
