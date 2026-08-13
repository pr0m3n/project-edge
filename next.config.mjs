/**
 * Content-Security-Policy.
 *
 * A `script-src` kényszerűen tartalmaz `'unsafe-inline'`-t: a Next.js a
 * hidratáláshoz inline scripteket ad ki, nonce-hoz pedig middleware kellene.
 * A többi direktíva viszont így is valódi védelmet ad — a `form-action`,
 * `base-uri`, `object-src` és `frame-ancestors` a leggyakoribb
 * adatkiszivárogtató és clickjacking utakat zárja le.
 *
 * A `connect-src`-ben a Supabase `wss://` is szerepel: enélkül a realtime
 * (projekt- és értesítésfrissítés) csendben leállna.
 */
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  // 'wasm-unsafe-eval': a @google/model-viewer (a főoldali 3D laptop) WebAssembly
  //   modult példányosít — enélkül a modell némán nem töltődik be.
  // 'unsafe-eval' CSAK fejlesztésben: a React dev módban eval()-t használ a
  //   hibakereséshez; élesben nincs rá szükség.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com",
  "font-src 'self' data:",
  // blob: — a model-viewer a GLB textúráit blob URL-ként tölti be.
  "connect-src 'self' blob: data: https://*.supabase.co wss://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
  "frame-src 'self' https://www.googletagmanager.com https://td.doubleclick.net",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  // A Stripe Checkout és a Billing Portal teljes oldalas átirányítás, nem
  // űrlapbeküldés — a 'self' tehát elég, és megfogja az adatkiszivárgást.
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests"
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }
        ]
      }
    ];
  }
};

export default nextConfig;
