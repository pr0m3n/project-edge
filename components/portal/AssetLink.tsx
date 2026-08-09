import { useEffect, useState } from "react";
import { isPdfAsset, signedAssetUrl } from "@/lib/storage-assets";

/**
 * Ügyfél által feltöltött fájl megnyitása. A bucketek priváttá tétele után
 * (018-as migráció) nincs publikus URL: itt kérünk rövid életű signed linket.
 * A hivatkozás lehet új formátumú ("client-assets:út/fájl.png") vagy régi,
 * publikus URL — a lib/storage-assets.ts mindkettőt megérti.
 */
export function AssetLink({
  value,
  label,
  className
}: {
  value: string | null | undefined;
  label: string;
  className?: string;
}) {
  const url = useSignedAsset(value);

  if (url === null) {
    return <span className="asset-link-error">A fájl megnyitása nem sikerült (lehet, hogy törölve lett).</span>;
  }

  if (!url) {
    return <span className="asset-link-loading">{label} betöltése...</span>;
  }

  return (
    <a className={className} href={url} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

/** Kép előnézet privát bucketből. PDF esetén fájl-linket mutatunk helyette. */
export function AssetImage({
  value,
  alt,
  className
}: {
  value: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const url = useSignedAsset(value);

  if (isPdfAsset(value)) {
    return <AssetLink className={className} label="PDF megnyitása" value={value} />;
  }
  if (url === null) {
    return <span className="asset-link-error">A kép előnézete nem érhető el.</span>;
  }
  if (url === undefined) {
    return <span className="asset-link-loading">előnézet...</span>;
  }

  return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} className={className} src={url} />
    </a>
  );
}

/** `undefined` = még tölt, `null` = nem sikerült, string = kész link. */
export function useSignedAsset(value: string | null | undefined) {
  const [resolved, setResolved] = useState<{ value: string; url: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!value) return;
    signedAssetUrl(value).then((signed) => {
      if (!cancelled) setResolved({ value, url: signed });
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!value) return null;
  return resolved?.value === value ? resolved.url : undefined;
}
