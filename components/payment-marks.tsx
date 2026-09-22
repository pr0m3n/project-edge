/**
 * Fizetési jelölések és az árazás ígéret-ikonjai.
 *
 * Itt CSAK a saját, funkcionális ikonjaink élnek (kártya, bank, lakat,
 * garancia, pénztárca). A kártyamárkák valódi logói a `public/logo/pay/`
 * mappában vannak, az Iconify nyílt `logos` készletéből — egy újrarajzolt
 * védjegy mindig rosszabb, mint az eredeti.
 *
 * A felsorolt módok ahhoz igazodnak, amit a Stripe Checkout ténylegesen
 * felkínál ezen a fiókon: kártya (Visa, Mastercard, Amex, JCB), Apple Pay és
 * Link. Ha ez a Stripe-ban változik, ezt a listát is igazítani kell — egy
 * olyan logó, amivel a végén mégsem lehet fizetni, csalódás a fizetőoldalon.
 */

type IconProps = { size?: number };

function stroke(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };
}

/** Pajzs pipával — a „csak akkor fizetsz, ha tetszik" garanciához. */
export function IconGuarantee({ size = 22 }: IconProps) {
  return (
    <svg {...stroke(size)}>
      <path d="M12 3 4.5 6v5.5c0 4.3 3 8.3 7.5 9.5 4.5-1.2 7.5-5.2 7.5-9.5V6L12 3Z" />
      <path d="M8.75 11.8 11 14l4.25-4.4" />
    </svg>
  );
}

/** Pénztárca — az „utána sincs más költséged" ígérethez. */
export function IconWallet({ size = 22 }: IconProps) {
  return (
    <svg {...stroke(size)}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5" />
      <path d="M3 7.5v9A2.5 2.5 0 0 0 5.5 19h13a2.5 2.5 0 0 0 2.5-2.5v-2H17a2 2 0 0 1 0-4h4v-2a1 1 0 0 0-1-1H3Z" />
      <circle cx="17.4" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Bankkártya. */
export function IconCard({ size = 20 }: IconProps) {
  return (
    <svg {...stroke(size)}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19M6 15h3.5" />
    </svg>
  );
}

/** Bank — a banki átutaláshoz. */
export function IconBank({ size = 20 }: IconProps) {
  return (
    <svg {...stroke(size)}>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 9.5v8M9.5 9.5v8M14.5 9.5v8M19 9.5v8" />
      <path d="M3 20.5h18" />
    </svg>
  );
}

/** Lakat — a biztonságos fizetés jelzéséhez. */
export function IconLock({ size = 14 }: IconProps) {
  return (
    <svg {...stroke(size)}>
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
    </svg>
  );
}
