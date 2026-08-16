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

/**
 * Mérési hosztok SZOLGÁLTATÓNKÉNT, nem direktívánként.
 *
 * Tanulság egy valós hibából: a Clarityhez korábban csak a `www.clarity.ms`
 * került be a `script-src`-be. Az a cím viszont csak egy BETÖLTŐ, ami a tényleges
 * könyvtárat a `scripts.clarity.ms`-ről húzza le — így a mérés némán megállt,
 * miközben a `window.clarity` csonk létezett, tehát „működőnek" látszott.
 * Ugyanez történt a Google Adsszel: a gtag több hosztra is szór (googleadservices,
 * doubleclick, google.com/ccm, ország szerinti google.<tld> pixel).
 *
 * Ezért itt egy szolgáltató = egy lista, és minden érintett direktíva ugyanazt
 * a listát kapja. Új mérőeszköznél elég egy tömböt bővíteni.
 */
const CLARITY_HOSTS = [
  // A `*` szándékos: a betöltő a www-n, a könyvtár a scripts-en, a felvételek
  // pedig régiónként külön aldomainen (pl. `e.clarity.ms`) érkeznek.
  "https://*.clarity.ms"
];

const GOOGLE_TAG_HOSTS = [
  "https://www.googletagmanager.com",
  "https://www.googleadservices.com",
  "https://googleads.g.doubleclick.net",
  "https://pagead2.googlesyndication.com"
];

const GOOGLE_COLLECT_HOSTS = [
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  // A gtag a konverziót a `google.com/ccm/collect` és `/rmkt/collect` címekre is
  // elküldi, a remarketing-pixelt pedig a látogató ORSZÁGA szerinti domainre
  // (nálunk google.hu). A CSP nem tud TLD-re jokerezni, ezért a magyar célpiac
  // domainje külön szerepel; más országból érkezőnél ez a pixel kimaradhat.
  "https://www.google.com",
  "https://google.com",
  "https://www.google.hu"
];

const measurementScriptHosts = [...GOOGLE_TAG_HOSTS, ...CLARITY_HOSTS].join(" ");
const measurementConnectHosts = [...GOOGLE_TAG_HOSTS, ...GOOGLE_COLLECT_HOSTS, ...CLARITY_HOSTS].join(" ");
const measurementImageHosts = [...GOOGLE_TAG_HOSTS, ...GOOGLE_COLLECT_HOSTS, ...CLARITY_HOSTS].join(" ");

const csp = [
  "default-src 'self'",
  // 'wasm-unsafe-eval': a @google/model-viewer (a főoldali 3D laptop) WebAssembly
  //   modult példányosít — enélkül a modell némán nem töltődik be.
  // 'unsafe-eval' CSAK fejlesztésben: a React dev módban eval()-t használ a
  //   hibakereséshez; élesben nincs rá szükség.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} ${measurementScriptHosts}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://*.supabase.co ${measurementImageHosts}`,
  "font-src 'self' data:",
  // blob: — a model-viewer a GLB textúráit blob URL-ként tölti be.
  // ws://localhost CSAK fejlesztésben: a Next HMR websocketjét a 'self' nem
  // fedi le, enélkül a helyi fejlesztés folyamatosan újracsatlakozni próbál.
  `connect-src 'self' blob: data:${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""} https://*.supabase.co wss://*.supabase.co ${measurementConnectHosts}`,
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
