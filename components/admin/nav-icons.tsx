/**
 * Az admin navigáció ikonjai.
 *
 * Miért nem emoji: az emoji minden rendszeren MÁS — színes, rajzolt, a
 * betűtípustól független kép, ami a felület saját tipográfiájától és
 * színvilágától elüt. Egy sor emoji egymás mellett ezért zsúfoltnak és
 * összeszedetlennek hat, akkor is, ha az elrendezés maga rendben van. Ráadásul
 * a méretük és a talpvonaluk rendszerenként eltér, tehát a fülcímkék sosem
 * állnak pontosan egy vonalban.
 *
 * Ezek egyszerű, egy vonalvastagságú kontúrikonok, amik `currentColor`-t
 * használnak: átveszik az aktív/inaktív fül színét, és a világos módban is
 * magától helyesek maradnak. Egyetlen vizuális nyelv az egész felületen.
 */

type IconProps = { size?: number };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };
}

/** Ma — egy kipipált nap a naptárban. */
export function NavToday({ size = 17 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M9.5 15.5l1.8 1.8 3.4-3.6" />
    </svg>
  );
}

/** Bevétel — emelkedő oszlopok. */
export function NavRevenue({ size = 17 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 21h18" />
      <rect x="5" y="13" width="3.5" height="6" rx="1" />
      <rect x="10.25" y="9" width="3.5" height="10" rx="1" />
      <rect x="15.5" y="4" width="3.5" height="15" rx="1" />
    </svg>
  );
}

/** Teendők & Inbox — beérkező tálca. */
export function NavInbox({ size = 17 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 13h5l1.5 2.5h5L16 13h5" />
      <path d="M5.5 4h13l2.5 9v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5l2.5-9Z" />
    </svg>
  );
}

/** Projektek — rétegek. */
export function NavProjects({ size = 17 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z" />
      <path d="M3 12.5 12 17l9-4.5M3 17 12 21.5 21 17" />
    </svg>
  );
}

/** Üzenetek — buborék. */
export function NavMessages({ size = 17 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 3.5v-14A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8Z" />
      <path d="M8.5 9.5h7M8.5 12.5h4" />
    </svg>
  );
}

/** Menedzselt oldalak — böngészőablak. */
export function NavManaged({ size = 17 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M3 9h18M6.5 6.5h.01M9 6.5h.01" />
    </svg>
  );
}

/** Félbehagyott adatlapok — félig kitöltött lap. */
export function NavDrafts({ size = 17 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13h5M8.5 16.5h2.5" />
    </svg>
  );
}

/** Felhasználók — két alak. */
export function NavUsers({ size = 17 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.9M17.5 14.8c2.1.6 3.5 2.3 3.5 4.6" />
    </svg>
  );
}

/** Érdeklődők — alak plusz jellel. */
export function NavLeads({ size = 17 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="10" cy="8" r="3.2" />
      <path d="M4 20c0-3.2 2.7-5.2 6-5.2 1 0 2 .2 2.8.5" />
      <path d="M18 14v6M15 17h6" />
    </svg>
  );
}
