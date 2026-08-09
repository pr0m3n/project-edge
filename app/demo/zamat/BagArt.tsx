import { useId } from "react";
import type { Product } from "./data";

/**
 * A termékfotókat SVG kávészsák-illusztráció helyettesíti — így a mintabolt
 * stock fotó nélkül is egységes és igényes marad.
 */
export function BagArt({ product, small = false }: { product: Product; small?: boolean }) {
  const { palette, name, roast } = product;
  const instanceId = useId().replace(/:/g, "");
  const id = `${product.slug}-${instanceId}`;

  return (
    <svg
      aria-label={`${name} kávécsomag`}
      className={`zm-bag ${small ? "is-small" : ""}`}
      role="img"
      viewBox="0 0 220 280"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={palette.accent} />
          <stop offset="0.22" stopColor={palette.body} />
          <stop offset="0.72" stopColor={palette.body} />
          <stop offset="1" stopColor={palette.accent} />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse cx="110" cy="258" fill="#000" opacity="0.13" rx="66" ry="9" />

      {/* zacskó teste */}
      <path
        d="M46 74 h128 a6 6 0 0 1 6 6 l-6 164 a10 10 0 0 1 -10 9 H56 a10 10 0 0 1 -10 -9 L40 80 a6 6 0 0 1 6 -6 z"
        fill={`url(#${id}-body)`}
      />
      <path
        d="M46 74 h128 a6 6 0 0 1 6 6 l-6 164 a10 10 0 0 1 -10 9 H56 a10 10 0 0 1 -10 -9 L40 80 a6 6 0 0 1 6 -6 z"
        fill={`url(#${id}-sheen)`}
      />

      {/* hajtogatott tető */}
      <rect fill={palette.fold} height="30" rx="5" width="150" x="35" y="48" />
      <rect fill="#000" height="5" opacity="0.14" rx="2.5" width="150" x="35" y="73" />
      <rect fill="#fff" height="4" opacity="0.16" rx="2" width="122" x="49" y="54" />

      {/* aromaszelep */}
      <circle cx="110" cy="96" fill={palette.fold} r="7" />
      <circle cx="110" cy="96" fill="#000" opacity="0.25" r="3" />

      {/* címke */}
      <rect fill={palette.label} height="98" rx="7" width="112" x="54" y="118" />
      <rect fill={palette.accent} height="4" rx="2" width="30" x="66" y="132" />
      <text
        fill={palette.accent}
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="15"
        fontWeight="700"
        x="66"
        y="160"
      >
        ZAMAT
      </text>
      <text
        fill={palette.accent}
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="8"
        letterSpacing="0.9"
        opacity="0.72"
        x="66"
        y="176"
      >
        {roast.toUpperCase()} PÖRKÖLÉS
      </text>
      <rect fill={palette.accent} height="2" opacity="0.2" rx="1" width="84" x="66" y="186" />
      <rect fill={palette.accent} height="2" opacity="0.14" rx="1" width="60" x="66" y="194" />
      <rect fill={palette.accent} height="2" opacity="0.14" rx="1" width="70" x="66" y="202" />
    </svg>
  );
}
