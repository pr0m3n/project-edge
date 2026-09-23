import { useId } from "react";
import type { Product } from "./data";
import { beanColor, beanTemp, toHex } from "./roast";

/**
 * A zacskó rajza — egy csomagolási RENDSZER, nem hat különböző színű zacskó:
 * mindegyik matt fekete tasak ugyanazzal a címkével, és a tételt a színsáv,
 * a nagy betűs származási hely és a pörkölési skála különbözteti meg. Így
 * dolgoznak a valódi specialty pörkölők is.
 *
 * A pörkölési skála négyzetei a bab valódi színét kapják a kivétel percében
 * (roast.ts), a címke szövegei pedig a termékadatból jönnek. Ugyanezt a
 * címkét rajzolja a 3D zacskó textúrája is (bag3d.ts).
 */

/** 1–5: a kivételi hőmérséklet alapján (196 °C = 1, 224 °C felett = 5). */
export function roastLevel(product: Product) {
  if (!product.drop) return 3;
  return Math.min(5, Math.max(1, Math.round((beanTemp(product.drop) - 196) / 7) + 1));
}

export const labelTitle = (product: Product) => product.name.split(" ")[0].toUpperCase();
export const labelRegion = (product: Product) => product.origin.split("·")[1]?.trim() ?? product.origin;

export function BagArt({ product, small = false }: { product: Product; small?: boolean }) {
  const { palette } = product;
  const id = `bag${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const title = labelTitle(product);
  const level = roastLevel(product);
  const roastHex = toHex(beanColor(product.drop ?? 10));

  return (
    <svg
      aria-label={`${product.name} kávécsomag`}
      className={`zm-bag ${small ? "is-small" : ""}`}
      role="img"
      viewBox="0 0 220 280"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-body`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#100d0b" />
          <stop offset="0.18" stopColor="#221d19" />
          <stop offset="0.62" stopColor="#1d1916" />
          <stop offset="1" stopColor="#0f0c0a" />
        </linearGradient>
      </defs>

      <ellipse cx="110" cy="262" fill="#000" opacity="0.18" rx="70" ry="8" />

      {/* tasak: hegesztett tető, alul talpas szélesedés */}
      <path d="M44 52 h132 l4 190 q0 14 -14 14 H54 q-14 0 -14 -14 z" fill={`url(#${id}-body)`} />
      <rect fill="#0c0a08" height="20" rx="2" width="136" x="42" y="36" />
      {[0, 1, 2, 3, 4, 5, 6].map((line) => (
        <rect fill="#2b2622" height="1" key={line} width="128" x="46" y={39 + line * 2.2} />
      ))}
      <path d="M42 44 l5 3 l-5 3 z" fill="#f2ede4" opacity="0.6" />
      <circle cx="110" cy="76" fill="#0c0a08" r="7" />
      <circle cx="110" cy="76" fill="#2b2622" r="3" />

      {/* címke */}
      <rect fill={palette.label} height="148" width="124" x="48" y="96" />
      <rect fill={palette.body} height="22" width="124" x="48" y="96" />
      <text fill="#fff" fontSize="7.5" letterSpacing="1.2" style={{ fontFamily: "var(--zm-mono), monospace" }} x="56" y="110">
        ZAMAT
      </text>
      <text fill="#fff" fontSize="6.5" style={{ fontFamily: "var(--zm-mono), monospace" }} textAnchor="end" x="164" y="110">
        {product.lot}
      </text>

      <text
        fill="#17120e"
        fontSize="30"
        fontWeight="800"
        lengthAdjust="spacingAndGlyphs"
        style={{ fontFamily: "var(--zm-display), Impact, sans-serif" }}
        textLength={title.length > 7 ? 108 : undefined}
        x="56"
        y="150"
      >
        {title}
      </text>
      <text fill="#5b5048" fontSize="7.5" style={{ fontFamily: "var(--zm-mono), monospace" }} x="56" y="163">
        {labelRegion(product).toUpperCase()}
      </text>

      <text fill="#5b5048" fontSize="6" letterSpacing="0.8" style={{ fontFamily: "var(--zm-mono), monospace" }} x="56" y="184">
        PÖRKÖLÉS
      </text>
      {[0, 1, 2, 3, 4].map((dot) => (
        <rect
          fill={dot < level ? roastHex : "none"}
          height="8"
          key={dot}
          stroke={dot < level ? roastHex : "#b9afa4"}
          strokeWidth="1"
          width="14"
          x={56 + dot * 17}
          y="189"
        />
      ))}

      <text fill="#17120e" fontSize="7" style={{ fontFamily: "var(--zm-sans), sans-serif" }} x="56" y="214">
        {product.notes.slice(0, 3).join(" · ")}
      </text>
      <line stroke="#17120e" strokeOpacity="0.2" x1="56" x2="164" y1="224" y2="224" />
      <text fill="#5b5048" fontSize="6.5" style={{ fontFamily: "var(--zm-mono), monospace" }} x="56" y="236">
        250 G · {product.process.toUpperCase()}
      </text>
    </svg>
  );
}
