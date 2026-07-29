/**
 * Ügyfél által feltöltött fájlok (logó, szövegek, képek, domain-igazolás)
 * hivatkozása és megnyitása.
 *
 * Korábban a kliens `getPublicUrl()`-t hívott, és a teljes publikus URL került
 * az adatbázisba. A bucketek publikusak voltak, tehát ezek a fájlok — köztük a
 * domain-tulajdonosi igazolás, amin név, cím és telefonszám szerepel —
 * bejelentkezés nélkül elérhetők voltak. A 018-as migráció priváttá tette a
 * bucketeket, itt pedig a hozzáférés signed URL-lel történik.
 *
 * Tárolási formátum:
 *   * új feltöltés:  "client-assets:felhasznalo-id/fajl.png"  (bucket + útvonal)
 *   * régi rekordok: "https://<projekt>.supabase.co/storage/v1/object/public/client-assets/..."
 *
 * Mindkettőt megértjük, tehát a meglévő feltöltések is megnyithatók maradnak —
 * csak már hitelesítés után, rövid életű linkkel.
 */

import { supabase } from "@/lib/supabase/client";

export type AssetBucket = "client-assets" | "client-logos";

export type AssetRef = { bucket: AssetBucket; path: string };

const BUCKETS: AssetBucket[] = ["client-assets", "client-logos"];
const SIGNED_URL_TTL_SECONDS = 60 * 10;

/** Az adatbázisban tárolandó hivatkozás egy feltöltött fájlhoz. */
export function assetReference(bucket: AssetBucket, path: string) {
  return `${bucket}:${path}`;
}

/** Tárolt érték értelmezése — új (bucket:path) és régi (publikus URL) formát is kezel. */
export function parseAssetReference(value: string | null | undefined): AssetRef | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  for (const bucket of BUCKETS) {
    if (raw.startsWith(`${bucket}:`)) {
      const path = raw.slice(bucket.length + 1).replace(/^\/+/, "");
      return path ? { bucket, path } : null;
    }
  }

  // Régi, publikus Supabase Storage URL.
  const legacy = raw.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
  if (legacy) {
    const bucket = legacy[1] as AssetBucket;
    if (BUCKETS.includes(bucket)) {
      return { bucket, path: decodeURIComponent(legacy[2]) };
    }
  }

  return null;
}

/**
 * Rövid életű, aláírt megnyitási link. `null`, ha a hivatkozás értelmezhetetlen
 * vagy nincs jogosultság — a hívó ilyenkor hibát jelez a felhasználónak.
 */
export async function signedAssetUrl(value: string | null | undefined): Promise<string | null> {
  const ref = parseAssetReference(value);
  if (!ref) {
    // Nem storage-hivatkozás (pl. kézzel beírt külső link) — csak https-t adunk vissza.
    const raw = (value ?? "").trim();
    return raw.startsWith("https://") ? raw : null;
  }

  const { data, error } = await supabase.storage.from(ref.bucket).createSignedUrl(ref.path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

/** Emberi néven megjeleníthető fájlnév a hivatkozásból. */
export function assetFileName(value: string | null | undefined) {
  const ref = parseAssetReference(value);
  const source = ref?.path ?? (value ?? "");
  const name = source.split("/").pop() ?? "";
  return name.split("?")[0] || "fájl";
}

export function isPdfAsset(value: string | null | undefined) {
  return assetFileName(value).toLowerCase().endsWith(".pdf");
}
