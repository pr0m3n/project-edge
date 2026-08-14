/**
 * Mérés és hirdetési konverziókövetés.
 *
 * Minden azonosító környezeti változóból jön. Ha egyik sincs beállítva, a
 * mérés teljesen inaktív: nem töltődik be szkript, és a süti-banner sem
 * jelenik meg — így a jogi állapot is helyes marad (nem kérünk hozzájárulást
 * olyasmihez, amit nem is használunk).
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const ADS_ID = process.env.NEXT_PUBLIC_ADS_ID ?? "";
/** A Google Ads konverziós művelet címkéje (AW-123456789/AbCdEf...). */
export const ADS_LEAD_LABEL = process.env.NEXT_PUBLIC_ADS_LEAD_LABEL ?? "";

export const measurementEnabled = Boolean(GA_ID || ADS_ID);

export const CONSENT_KEY = "pe-consent-v1";
export type ConsentChoice = "granted" | "denied";

export const CONSENT_DEFAULT_SCRIPT = `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });
  try {
    var stored = localStorage.getItem('${CONSENT_KEY}');
    if (stored === 'granted') {
      gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted'
      });
    }
  } catch (e) {}
`;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function readConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function storeConsent(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    /* privát böngészésben nincs tárolás — a banner ilyenkor újra megjelenik */
  }
}

/**
 * Consent Mode v2 frissítés. A Google 2024 márciusa óta EGT-s forgalomnál
 * elvárja ezeket a jeleket; nélkülük a hirdetési konverziók egy része nem
 * érkezik meg.
 */
export function applyConsent(choice: ConsentChoice) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    ad_storage: choice,
    ad_user_data: choice,
    ad_personalization: choice,
    analytics_storage: choice
  });
}

/** Oldalletöltés jelzése kliensoldali útvonalváltáskor. */
export function trackPageView(path: string) {
  if (!GA_ID || typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "page_view", { page_path: path, page_location: window.location.href });
}

/** Tetszőleges esemény (pl. arak_valto_hasznalva). */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

/**
 * Google Ads konverzió. Ezt akkor hívjuk, amikor tényleges érdeklődés
 * születik (elküldött brief) — ez az, amiből a Google licitálása tanulni tud.
 */
export function trackLeadConversion(value?: number) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  trackEvent("generate_lead", value ? { value, currency: "HUF" } : {});
  if (ADS_ID && ADS_LEAD_LABEL) {
    window.gtag("event", "conversion", {
      send_to: `${ADS_ID}/${ADS_LEAD_LABEL}`,
      ...(value ? { value, currency: "HUF" } : {})
    });
  }
}
