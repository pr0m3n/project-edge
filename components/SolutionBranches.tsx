"use client";

import { useState } from "react";
import { ContactButton } from "@/components/ContactButton";

/**
 * A /szolgaltatasok korábban egyetlen, 4100 pixel magas és 857 szavas
 * szekcióban sorolta fel az összes helyzetet. Itt a látogató előbb a saját
 * állapotát választja ki, és onnantól csak a rá tartozó ágat olvassa.
 *
 * Megjelenés: a választó egy tömör kapcsolósáv (nem három nagy kártya), az
 * eredmény pedig EGYETLEN sötét panel hajszálvonalas oszlopokkal — így nincs
 * doboz a dobozban, amitől a szekció korábban zsúfoltnak hatott.
 */

export type Branch = {
  id: string;
  label: string;
  hint: string;
  cards: Array<{ type: string; who: string; stack: string }>;
  extras: Array<{ title: string; copy: string; price: string }>;
  /**
   * Csak az egyedi rendszer ágán: nincs ár és nincs önkiszolgáló brief.
   * Egy webapp nem termék, hanem megbízás — beszélgetés után indul, nem
   * űrlapon. Így nem versenyzik a bérléssel a látogató figyelméért.
   */
  talk?: { title: string; copy: string; cta: string };
};

export function SolutionBranches({ branches }: { branches: Branch[] }) {
  const [activeId, setActiveId] = useState(branches[0].id);
  const active = branches.find((branch) => branch.id === activeId) ?? branches[0];

  return (
    <div className="branch-block">
      <div className="branch-switch" role="tablist" aria-label="Hol tartasz most?">
        {branches.map((branch) => (
          <button
            aria-controls={`branch-panel-${branch.id}`}
            aria-selected={branch.id === activeId}
            className={`branch-pill${branch.id === activeId ? " on" : ""}`}
            id={`branch-tab-${branch.id}`}
            key={branch.id}
            onClick={() => setActiveId(branch.id)}
            role="tab"
            type="button"
          >
            {branch.label}
          </button>
        ))}
      </div>

      <p className="branch-hint" key={`hint-${active.id}`}>{active.hint}</p>

      <div
        aria-labelledby={`branch-tab-${active.id}`}
        className="branch-panel"
        id={`branch-panel-${active.id}`}
        key={active.id}
        role="tabpanel"
      >
        <div className="branch-cols" data-count={active.cards.length}>
          {active.cards.map((card, index) => (
            <article className="branch-col" key={card.type} style={{ "--i": index } as React.CSSProperties}>
              <h3>{card.type}</h3>
              <dl>
                <div>
                  <dt>Kinek szól</dt>
                  <dd>{card.who}</dd>
                </div>
                <div>
                  <dt>Mit használok</dt>
                  <dd>{card.stack}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>

        {active.talk && (
          <div className="branch-talk">
            <div>
              <strong>{active.talk.title}</strong>
              <p>{active.talk.copy}</p>
            </div>
            {/* Nem az ügyfélkapuba visz: ott a bérléses brief az alapértelmezés,
                ami pont az ellenkezője annak, amit ez az ág mond. A beépített
                üzenetküldő panelt nyitja, ami ticketet hoz létre az adminban. */}
            <ContactButton className="button primary">{active.talk.cta}</ContactButton>
          </div>
        )}

        {active.extras.length > 0 && (
          <div className="branch-extras">
            {active.extras.map((extra) => (
              <div className="branch-extra" key={extra.title}>
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
