"use client";

import { useState } from "react";

/**
 * A /szolgaltatasok korábban egyetlen, 4100 pixel magas és 857 szavas
 * szekcióban sorolta fel az összes helyzetet. Itt a látogató előbb a saját
 * állapotát választja ki, és onnantól csak a rá tartozó ágat olvassa.
 */

export type Branch = {
  id: string;
  label: string;
  hint: string;
  cards: Array<{ type: string; who: string; stack: string }>;
  extras: Array<{ title: string; copy: string; price: string }>;
};

export function SolutionBranches({ branches }: { branches: Branch[] }) {
  const [activeId, setActiveId] = useState(branches[0].id);
  const active = branches.find((branch) => branch.id === activeId) ?? branches[0];

  return (
    <div className="branch-block">
      <div className="branch-tabs" role="tablist" aria-label="Hol tartasz most?">
        {branches.map((branch) => (
          <button
            aria-controls={`branch-panel-${branch.id}`}
            aria-selected={branch.id === activeId}
            className={`branch-tab${branch.id === activeId ? " on" : ""}`}
            id={`branch-tab-${branch.id}`}
            key={branch.id}
            onClick={() => setActiveId(branch.id)}
            role="tab"
            type="button"
          >
            <strong>{branch.label}</strong>
            <span>{branch.hint}</span>
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`branch-tab-${active.id}`}
        className="branch-panel"
        id={`branch-panel-${active.id}`}
        key={active.id}
        role="tabpanel"
      >
        <div className="branch-cards">
          {active.cards.map((card, index) => (
            <article className="solution-card" key={card.type} style={{ "--i": index } as React.CSSProperties}>
              <h3>{card.type}</h3>
              <p className="solution-who">{card.who}</p>
              <div className="solution-stack">
                <span>Mit használok</span>
                <p>{card.stack}</p>
              </div>
            </article>
          ))}
        </div>

        {active.extras.length > 0 && (
          <div className="special-cases">
            {active.extras.map((extra) => (
              <div className="special-case-row" key={extra.title}>
                <div>
                  <strong>{extra.title}</strong>
                  <span>{extra.copy}</span>
                </div>
                <b>{extra.price}</b>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
