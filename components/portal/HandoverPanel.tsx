import type { Project } from "@/components/portal/types";
import { useState } from "react";
import {
  HANDOVER_SERVICE_LABELS,
  activeHandoverStep,
  handoverProgress,
  resolveHandoverSteps,
  type ResolvedHandoverStep
} from "@/lib/handover";

type HandoverPanelProps = {
  project: Project;
  busy: boolean;
  onCompleteStep: (stepId: string, value: string) => void;
};

/**
 * Az átadás korábban egy admin által pipált szöveges lista volt: az ügyfél nem
 * látta, mit kell TENNIE, ezért maradt a telefonálás. Itt egyszerre pontosan egy
 * lépés aktív, a felelősével, a linkjeivel és a hozzá tartozó PDF-fel — a kész
 * lépések összecsukva, a hátralévők halkan alatta.
 */
export function HandoverPanel({ project, busy, onCompleteStep }: HandoverPanelProps) {
  const [value, setValue] = useState("");
  const steps = resolveHandoverSteps(project.handover_steps);
  const active = activeHandoverStep(project.handover_steps);
  const progress = handoverProgress(project.handover_steps);

  if (!steps.length) {
    return null;
  }

  const complete = !active;
  const waitingOnStudio = Boolean(active && active.def.owner === "admin");

  // Amit mi adtunk meg az ügyfélnek (pl. a beállítandó DNS rekordok): a lezárt
  // admin-lépések megosztott értékei. Ezek nélkül a soron következő ügyfél-lépés
  // elvégezhetetlen lenne üzenetezés nélkül.
  const sharedFromStudio = steps.filter(
    (item) => item.def.owner === "admin" && item.def.input?.sharedWith === "client" && item.state.value?.trim()
  );

  return (
    <section className="handover-panel">
      <header className="handover-head">
        <div>
          <span className="micro-label">Vezetett átadás</span>
          <strong>
            {complete
              ? "Az átadás minden lépése kész."
              : waitingOnStudio
                ? "Most nálunk van a következő lépés."
                : "Egy lépés van rajtad."}
          </strong>
        </div>
        <div className="handover-progress" role="img" aria-label={`${progress.done} / ${progress.total} lépés kész`}>
          <div className="handover-progress-bar">
            <i style={{ width: `${progress.percent}%` }} />
          </div>
          <span>
            {progress.done}/{progress.total}
          </span>
        </div>
      </header>

      {active ? (
        <article className={`handover-active ${active.def.owner === "client" ? "is-client" : "is-studio"}`}>
          <div className="handover-active-top">
            <span className="handover-tag">{active.def.owner === "client" ? "Rajtad a sor" : "Nálunk a labda"}</span>
            <span className="handover-service">{HANDOVER_SERVICE_LABELS[active.def.service]}</span>
          </div>
          <h4>{active.def.title}</h4>
          <p>{active.def.detail}</p>
          {active.def.where ? <p className="handover-where">{active.def.where}</p> : null}

          {active.def.warning ? <p className="handover-warning">{active.def.warning}</p> : null}

          {active.def.owner === "client" && sharedFromStudio.length ? (
            <div className="handover-shared">
              <span className="micro-label">Amit tőlünk kaptál</span>
              {sharedFromStudio.map((item) => (
                <div key={item.def.id}>
                  <strong>{item.def.title}</strong>
                  <pre>{item.state.value}</pre>
                </div>
              ))}
            </div>
          ) : null}

          {active.def.links?.length || active.def.guide ? (
            <div className="handover-links">
              {active.def.guide ? (
                <a className="handover-guide-link" href={active.def.guide.href} target="_blank" rel="noreferrer">
                  {active.def.guide.label} <span aria-hidden="true">↗</span>
                </a>
              ) : null}
              {active.def.links?.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer noopener">
                  {link.label} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          ) : null}

          {active.def.owner === "client" ? (
            <div className="handover-action">
              {active.def.input ? (
                <label className="field">
                  <span>{active.def.input.label}</span>
                  {active.def.input.multiline ? (
                    <textarea
                      value={value}
                      placeholder={active.def.input.placeholder}
                      onChange={(event) => setValue(event.target.value)}
                    />
                  ) : (
                    <input
                      value={value}
                      placeholder={active.def.input.placeholder}
                      onChange={(event) => setValue(event.target.value)}
                    />
                  )}
                </label>
              ) : null}
              <button
                className="button primary"
                type="button"
                disabled={busy}
                onClick={() => {
                  onCompleteStep(active.def.id, value);
                  setValue("");
                }}
              >
                {busy ? "Mentés..." : "Megtettem, tovább"}
              </button>
            </div>
          ) : (
            <p className="waiting-copy">
              Ezzel a lépéssel mi dolgozunk. Nincs teendőd — értesítést kapsz, amint továbbmegy.
            </p>
          )}
        </article>
      ) : (
        <p className="handover-done-copy">
          Minden hozzáférés a te oldalán van. Ezután tudod lezárni a projektet, és ekkor indul a 30 napos díjmentes
          technikai garancia.
        </p>
      )}

      <details className="disclosure">
        <summary>Az átadás összes lépése ({progress.done}/{progress.total})</summary>
        <ol className="handover-list">
          {steps.map((item) => (
            <li key={item.def.id} className={stepClass(item, active)}>
              <span className="handover-list-mark">{item.state.done ? "✓" : item.def.owner === "client" ? "te" : "mi"}</span>
              <div>
                <strong>{item.def.title}</strong>
                <small>
                  {HANDOVER_SERVICE_LABELS[item.def.service]}
                  {item.state.done && item.state.done_at
                    ? ` · ${new Date(item.state.done_at).toLocaleDateString("hu-HU")}`
                    : ""}
                </small>
                {item.state.done && item.state.value?.trim() ? <pre>{item.state.value}</pre> : null}
              </div>
            </li>
          ))}
        </ol>
      </details>
    </section>
  );
}

function stepClass(item: ResolvedHandoverStep, active: ResolvedHandoverStep | null) {
  if (item.state.done) return "is-done";
  if (active && active.def.id === item.def.id) return "is-active";
  return "is-upcoming";
}
