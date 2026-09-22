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
 * Útvonal-előtagok, ahol NEM keletkezhet új hirdetési lead.
 *
 * A lábléc (benne a telefonszám) és a chat widget a `ChromeGate` miatt az
 * adminban és az ügyfélkapuban is ott van. Aki ott kattint, az vagy a stúdió
 * maga, vagy egy MEGLÉVŐ ügyfél — egyik sem a hirdetés hozta érdeklődő. Ezek a
 * kattintások korábban ugyanúgy konverziót küldtek az Adsnek.
 */
export const CONVERSION_FREE_PATH_PREFIXES = ["/admin", "/ugyfelkapu"] as const;

/**
 * Az a két típus, ami a zárt felületen belül is VALÓDI lead.
 *
 * A `project` a beküldött projektindító adatlap (szerver visszaigazolta az
 * insertet), a `brief` pedig a sikeres regisztráció — mindkettő természetes
 * helye az `/ugyfelkapu`, ezért őket a fenti útvonalszűrő nem érintheti.
 */
export const PORTAL_NATIVE_KINDS: readonly LeadKind[] = ["brief", "project"];

/**
 * Munkamenetenként legfeljebb egyszer számít.
 *
 * A telefonszám négy helyen jelenik meg ugyanazon az oldalon (fejléc, mobil
 * menü, gyors sáv, lábléc); egy ember több koppintása akkor is EGY érdeklődő,
 * ha az Ads-műveletnél véletlenül „Minden konverzió" a számlálás.
 */
export const ONCE_PER_SESSION_KINDS: readonly LeadKind[] = ["phone", "brief"];

export type LeadContext = {
  /** `window.location.pathname` a hívás pillanatában. */
  path: string;
  /** Tud-e az eszköz ténylegesen hívást indítani (érintős, nem asztali). */
  canPlaceCall: boolean;
  /** Elsült-e már ez a típus ebben a munkamenetben. */
  alreadySent: boolean;
};

export type LeadBlock = "cannot-place-call" | "suppressed-path" | "duplicate";

export function isConversionFreePath(path: string) {
  // Szándékosan nem puszta `startsWith`: a `/adminisztracio` nem az admin.
  return CONVERSION_FREE_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

/**
 * Kimehet-e a konverzió, és ha nem, miért.
 *
 * Tiszta függvény, hogy teszttel rögzíthető legyen — a mérés csendben romlik
 * el, ezért itt egyetlen ág sem maradhat ellenőrizetlenül.
 *
 * A sorrend számít: előbb az eszköz (asztali gépen a `tel:` link nem csinál
 * semmit, tehát a koppintás nem bizonyít semmit), aztán az útvonal, végül az
 * ismétlés. Így a GA4-be kerülő `lead_not_counted` mindig a LEGERŐSEBB okot
 * mondja meg.
 */
export function leadConversionBlockedBy(kind: LeadKind, context: LeadContext): LeadBlock | null {
  if (kind === "phone" && !context.canPlaceCall) return "cannot-place-call";
  if (!PORTAL_NATIVE_KINDS.includes(kind) && isConversionFreePath(context.path)) return "suppressed-path";
  if (context.alreadySent && ONCE_PER_SESSION_KINDS.includes(kind)) return "duplicate";
  return null;
}

/**
 * A konverzió értéke. A hívó felülírhatja (az elindított előfizetésnél a
 * tényleges életciklus-érték megy), de csak értelmes számmal: a `0`, a `NaN`
 * és a negatív érték a típus alapértékére esik vissza, nem megy ki nullás
 * konverzióként az Adsbe.
 */
export function leadValue(kind: LeadKind, value?: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : LEAD_VALUES[kind];
}

/**
 * A konverziós esemény `send_to` értéke, vagy `null`, ha nincs mihez küldeni.
 *
 * Az alapértelmezések felülírhatók, hogy teszt alól is hívható legyen — a
 * modul szintjén a `process.env` értékek build időben fixálódnak.
 */
export function adsSendTo(
  kind: LeadKind,
  adsId: string = ADS_ID,
  labels: Record<LeadKind, string> = ADS_LEAD_LABELS,
  fallbackLabel: string = ADS_LEAD_LABEL
) {
  const label = labels[kind] || fallbackLabel;
  if (!adsId || !label) return null;
  return `${adsId}/${label}`;
}

/** Ugyanazon az oldalbetöltésen belüli ismétlés elleni védelem. */
const sentOnThisPage = new Set<LeadKind>();
const LEAD_SENT_PREFIX = "pe-lead-sent-";

function wasLeadSent(kind: LeadKind) {
  if (sentOnThisPage.has(kind)) return true;
  try {
    return window.sessionStorage.getItem(`${LEAD_SENT_PREFIX}${kind}`) === "1";
  } catch {
    // Privát böngészésben nincs tárolás — ilyenkor a memóriabeli halmaz véd.
    return false;
  }
}

function rememberLeadSent(kind: LeadKind) {
  sentOnThisPage.add(kind);
  try {
    window.sessionStorage.setItem(`${LEAD_SENT_PREFIX}${kind}`, "1");
  } catch {
    /* lásd fent */
  }
}

/**
 * Tud-e az eszköz hívást indítani. Az asztali böngészőben a `tel:` link
 * jellemzően nem csinál semmit, ezért az ottani kattintás nem érdeklődés.
 */
function deviceCanPlaceCall() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try {
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  } catch {
    return false;
  }
}

/**
 * Google Ads konverzió. Akkor hívjuk, amikor tényleges érdeklődés születik —
 * ez az, amiből a Google licitálása tanulni tud.
 *
 * A `value` felülírja a típus alapértékét (az elindított előfizetésnél a
 * tényleges életciklus-értéket küldjük).
 *
 * Ami NEM megy ki, az sem tűnik el: `lead_not_counted` néven GA4 eseményt kap,
 * okkal együtt. Enélkül a szűrés ugyanolyan vak folt lenne, mint amilyen a
 * szűretlen mérés volt.
 *
 * A visszatérési érték a blokkolás oka (vagy `null`) — teszt és hibakeresés
 * számára, a hívók nem kötelesek használni.
 */
export function trackLeadConversion(kind: LeadKind, value?: number): LeadBlock | null {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return null;

  const blocked = leadConversionBlockedBy(kind, {
    path: window.location.pathname,
    canPlaceCall: deviceCanPlaceCall(),
    alreadySent: wasLeadSent(kind)
  });

  if (blocked) {
    trackEvent("lead_not_counted", { lead_kind: kind, reason: blocked });
    return blocked;
  }

  const amount = leadValue(kind, value);
  rememberLeadSent(kind);
  trackEvent("generate_lead", { lead_kind: kind, value: amount, currency: "HUF" });

  const sendTo = adsSendTo(kind);
  if (!sendTo) return null;

  window.gtag("event", "conversion", {
    send_to: sendTo,
    value: amount,
    currency: "HUF",
    // A Google ezzel szűri ki a hálózati újrapróbálkozásból eredő dupla
    // beérkezést. Enélkül minden ismételt ping külön konverzió.
    transaction_id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${kind}-${Date.now()}`
  });

  return null;
}

/**
 * Jelzi, hogy ÚJ fiók született. Nem itt küldünk konverziót: a regisztráció
 * pillanatában az oldal gyakran azonnal tovább navigál (`hardNavigate`), és az
 * e-mailes megerősítés akár másik eszközön is megtörténhet. A jelet ezért
 * eltesszük, és a dashboardon olvassuk vissza, ahol az oldal már stabil.
 *
 * `localStorage`, nem `sessionStorage`: a megerősítő linket a látogató sokszor
 * új lapon nyitja meg.
 */
export const SIGNUP_LEAD_KEY = "projectedge-signup-lead-v1";
/** Ennél régebbi jelet eldobunk — nem tartozhat a mostani munkamenethez. */
export const SIGNUP_LEAD_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function markSignupLead(now: number = Date.now()) {
  try {
    window.localStorage.setItem(SIGNUP_LEAD_KEY, String(now));
  } catch {
    /* privát böngészés */
  }
}

/** Tiszta párja a `consumeSignupLead`-nek, hogy tesztelhető legyen. */
export function isFreshSignupLead(raw: string | null, now: number = Date.now()) {
  if (!raw) return false;
  const stamp = Number(raw);
  if (!Number.isFinite(stamp) || stamp <= 0) return false;
  // A jövőbeli időbélyeg elállított rendszerórát jelent, nem friss jelet.
  if (stamp > now) return false;
  return now - stamp <= SIGNUP_LEAD_MAX_AGE_MS;
}

/** Egyszer olvasható: visszaadja, hogy volt-e friss regisztrációs jel, és törli. */
export function consumeSignupLead(now: number = Date.now()) {
  try {
    const raw = window.localStorage.getItem(SIGNUP_LEAD_KEY);
    window.localStorage.removeItem(SIGNUP_LEAD_KEY);
    return isFreshSignupLead(raw, now);
  } catch {
    return false;
  }
}
