/**
 * Mérés és hirdetési konverziókövetés.
 *
 * A GA4 és a Clarity azonosítója környezeti változóból jön; a Google Ads
 * azonosítójának van beégetett alapértéke, mert az élesben mindig ugyanaz.
 *
 * Ennek következménye, hogy a `measurementEnabled` a gyakorlatban MINDIG igaz,
 * tehát a süti-banner akkor is megjelenik, ha egyetlen környezeti változó sincs
 * beállítva. Ez szándékos: az Ads konverziómérés a hirdetések alapja, nem
 * szeretnénk, hogy egy hiányzó env változótól némán kikapcsoljon. Ha valaha
 * tényleg mérés nélküli telepítés kell, ezt az alapértéket kell kivenni.
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const ADS_ID = process.env.NEXT_PUBLIC_ADS_ID || "AW-18391344774";
/**
 * A Google Ads konverziós művelet címkéje (AW-123456789/AbCdEf...).
 *
 * Ez a TARTALÉK: minden olyan érdeklődéstípus ide esik vissza, amelyhez még
 * nincs saját címke felvéve. Így a mérés akkor sem néma, amikor még csak
 * egyetlen konverziós művelet létezik az Ads fiókban.
 */
export const ADS_LEAD_LABEL = process.env.NEXT_PUBLIC_ADS_LEAD_LABEL ?? "";
/** Microsoft Clarity azonosító (hőtérképek, session replay, hibadetektálás). */
export const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID ?? "";

export const measurementEnabled = Boolean(GA_ID || ADS_ID || CLARITY_ID);

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
 * Az érdeklődés fajtái — a licitálás ezekből tanul.
 *
 * Miért NEM egyetlen konverzió: korábban csak a tölcsér legalja számított
 * konverziónak (elküldött brief, audit űrlap, elindított projekt). Ezek
 * ritkák, ezért a Google gyakorlatilag semmilyen jelet nem kapott — a
 * konverzió-alapú licitáláshoz kellő 15–30 esemény/hó hónapokig nem gyűlt
 * volna össze. A chat és a telefonhívás viszont VALÓDI megkeresés, csak eddig
 * nem jutott el az Adsig.
 *
 * A `chat` és a `phone` szándékosan olcsóbb: gyakoribbak, de zajosabbak is
 * (félrekattintás, teszt). Az érték adja meg a súlyt, hogy később értékalapú
 * licitálásra lehessen váltani anélkül, hogy a rendszer a legolcsóbb jelre
 * optimalizálna.
 */
export type LeadKind = "chat" | "phone" | "audit" | "brief" | "project";

/**
 * Típusonkénti konverziós címke. Amíg egy típushoz nincs saját Ads-művelet
 * felvéve, az `ADS_LEAD_LABEL`-re esik vissza — így új címke bevezetéséhez
 * csak env változót kell állítani, kódot nem.
 *
 * A `process.env.NEXT_PUBLIC_*` hivatkozásoknak statikusnak kell lenniük,
 * mert a Next build időben helyettesíti be őket.
 */
const ADS_LEAD_LABELS: Record<LeadKind, string> = {
  chat: process.env.NEXT_PUBLIC_ADS_CHAT_LABEL ?? "",
  phone: process.env.NEXT_PUBLIC_ADS_PHONE_LABEL ?? "",
  audit: process.env.NEXT_PUBLIC_ADS_AUDIT_LABEL ?? "",
  brief: process.env.NEXT_PUBLIC_ADS_BRIEF_LABEL ?? "",
  project: process.env.NEXT_PUBLIC_ADS_PROJECT_LABEL ?? ""
};

/**
 * Feltételezett megtartás hónapban. A konverziós ÉRTÉK nem egy havidíj, hanem
 * amennyit az ügyfél a teljes életciklusa alatt hoz — különben egy valódi
 * projektindítás (14 900 Ft/hó) kisebb értéket jelentene a licitálásnak, mint
 * egy puszta brief-kitöltés, és a Google a gyengébb jelet erősítené.
 *
 * BECSLÉS, nem mért adat. Ha lesz valós lemorzsolódási számod, ezt írd át.
 */
export const ASSUMED_RETENTION_MONTHS = 12;

/**
 * Alapértelmezett konverziós érték forintban, ha a hívó nem ad meg sajátot.
 *
 * Ezek BECSLÉSEK: azt fejezik ki, mekkora eséllyel lesz az adott megkeresésből
 * fizető ügyfél. Egy ügyfél ~216 000 Ft (12 hó × ~18 000), a többi ebből
 * visszaosztva. Nem jelenik meg a felületen, és nem fizet érte senki — ezt
 * CSAK a Google licitálása látja, hogy tudja, melyik megkeresésből érdemes
 * többet szereznie.
 *
 * A `phone` a legolcsóbb, a tulajdonos döntése alapján: egy koppintás lehet
 * félrenyúlás, asztali gépen ráadásul semmit nem csinál, és nem bizonyítja,
 * hogy a hívás létrejött. A `chat` ehhez képest tartalmas — van benne leírt
 * kérdés, név és email, és ticket is keletkezik belőle.
 */
export const LEAD_VALUES: Record<LeadKind, number> = {
  chat: 5000,
  phone: 2000,
  audit: 10000,
  brief: 30000,
  project: 200000
};

/**
 * Google Ads konverzió. Akkor hívjuk, amikor tényleges érdeklődés születik —
 * ez az, amiből a Google licitálása tanulni tud.
 *
 * A `value` felülírja a típus alapértékét (az elindított előfizetésnél a
 * tényleges havidíjat küldjük).
 */
export function trackLeadConversion(kind: LeadKind, value?: number) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  const amount = value ?? LEAD_VALUES[kind];
  trackEvent("generate_lead", { lead_kind: kind, value: amount, currency: "HUF" });
  const label = ADS_LEAD_LABELS[kind] || ADS_LEAD_LABEL;
  if (ADS_ID && label) {
    window.gtag("event", "conversion", {
      send_to: `${ADS_ID}/${label}`,
      value: amount,
      currency: "HUF"
    });
  }
}
