import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Egy `auth.users` sor megkeresése email cím alapján.
 *
 * A Supabase admin API-nak nincs „getUserByEmail" hívása, csak lapozható
 * listázás — ezért kell végigmenni az oldalakon. Kis ügyfélszámnál ez egyetlen
 * kérés, és pontosan ez a művelet dönti el, hogy egy kézzel felvett ügyfélből
 * új fiók lesz-e, vagy rákötjük a meglévőre.
 *
 * Az összehasonlítás kisbetűsítve és levágott szóközökkel történik: a Supabase
 * a címet normalizálva tárolja, de az adminhoz kézzel begépelt cím bármilyen
 * formában érkezhet.
 */
const USER_PAGE_SIZE = 200;
const MAX_USER_PAGES = 25;

export async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<User | null> {
  const needle = email.trim().toLowerCase();
  if (!needle) return null;

  for (let page = 1; page <= MAX_USER_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: USER_PAGE_SIZE });
    if (error) throw error;

    const found = data.users.find((user) => user.email?.trim().toLowerCase() === needle);
    if (found) return found;
    if (data.users.length < USER_PAGE_SIZE) return null;
  }

  return null;
}

/** Levágott, kisbetűs email — mindenhol ez a tárolt alak. */
export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) && value.length <= 254;
}

/** Levágott szöveg felső hosszkorláttal; üresből `null` lesz, nem üres string. */
export function cleanText(value: unknown, limit = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, limit);
  return trimmed || null;
}

/**
 * Dátum beolvasása a felületről.
 *
 * A `<input type="date">` `YYYY-MM-DD`-t ad, amit a `new Date()` UTC éjfélként
 * értelmez — ez pont az, amit akarunk, mert a `lib/onboarding.ts` végig UTC-ben
 * számol. Bármi más formátumra `null`-t adunk vissza hiba helyett, hogy a hívó
 * dönthessen: van, ahol a dátum opcionális.
 */
export function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? `${value.trim()}T00:00:00.000Z` : value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Egész forintösszeg ellenőrzése — ugyanaz a sáv, amit a Checkout is elfogad. */
export function parsePrice(value: unknown): number | null {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(amount) || amount < 1_000 || amount > 10_000_000) return null;
  return amount;
}

/**
 * Az éles weboldal címének normalizálása.
 *
 * Séma nélkül `https://`-t teszünk elé, mert a 039-es elérhetőség-ellenőrzés
 * ezt fogja hívni, és egy séma nélküli cím ott csendben hibára futna. Csak
 * http/https engedett: egy `javascript:` vagy `file:` cím itt nem adatbeviteli
 * hiba lenne, hanem biztonsági rés.
 */
export function normalizeUrl(value: unknown): string | null {
  const raw = cleanText(value, 300);
  if (!raw) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}
