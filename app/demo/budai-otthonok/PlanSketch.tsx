import { useId } from "react";
import { isGlazed, isOutdoor, planBounds, wallRuns, type Plan } from "./plan";

/**
 * Az alaprajz 2D vázlata a listában — ugyanabból az adatból, mint a 3D
 * makett, ezért a kettő sosem mond ellent egymásnak.
 */
export function PlanSketch({ plan, className }: { plan: Plan; className?: string }) {
  const { w, d } = planBounds(plan);
  const pad = 1.4;
  const runs = wallRuns(plan);
  // A rajz felfelé mutató iránya a `facing` + 180°; az északi nyilat ennyivel
  // kell az óramutató irányába elforgatni, hogy valóban északra mutasson.
  const north = 180 - plan.facing;
  const hatch = `hatch${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      aria-label={`Alaprajz-vázlat, ${plan.level}`}
      className={className}
      role="img"
      viewBox={`${-pad} ${-pad} ${w + pad * 2} ${d + pad * 2}`}
    >
      <defs>
        <pattern height="0.6" id={hatch} patternTransform="rotate(45)" patternUnits="userSpaceOnUse" width="0.6">
          <line stroke="currentColor" strokeOpacity="0.28" strokeWidth="0.07" x1="0" x2="0" y1="0" y2="0.6" />
        </pattern>
      </defs>
      {plan.rooms.map((room, index) => (
        <rect
          fill={isOutdoor(room.kind) ? `url(#${hatch})` : "var(--sketch-fill, transparent)"}
          height={room.d}
          key={index}
          width={room.w}
          x={room.x}
          y={room.z}
        />
      ))}
      {runs.map((run, index) => {
        const glazed = isGlazed(plan, run);
        const width = run.type === "interior" ? 0.12 : glazed ? 0.1 : 0.3;
        const points =
          run.axis === "x"
            ? { x1: run.from, x2: run.to, y1: run.at, y2: run.at }
            : { x1: run.at, x2: run.at, y1: run.from, y2: run.to };
        return (
          <line
            key={index}
            stroke={glazed ? "var(--blue)" : "currentColor"}
            strokeLinecap="square"
            strokeWidth={width}
            {...points}
          />
        );
      })}
      <g transform={`translate(${w + pad * 0.45} ${-pad * 0.45}) rotate(${north})`}>
        <path d="M0 -0.7 L0.35 0.45 L0 0.2 L-0.35 0.45 Z" fill="currentColor" />
        <text fill="currentColor" fontFamily="var(--bo-mono), monospace" fontSize="0.8" textAnchor="middle" transform={`rotate(${-north})`} x="0" y="1.55">
          É
        </text>
      </g>
    </svg>
  );
}
