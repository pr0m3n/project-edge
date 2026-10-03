"use client";

import { usePathname } from "next/navigation";

/**
 * A /demo alatti mintaprojektek saját, önálló arculatot mutatnak — ott a
 * ProjectEdge lábléc és support widget nem jelenhet meg, különben szétesik az
 * illúzió, hogy egy külön márka oldalát nézzük. Az admin felületen sem.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Az adminban sincs helye a nyilvános láblécnek (telefonon az admin alján
  // jelent meg a weboldal teljes lábléce).
  if (pathname?.startsWith("/demo") || pathname?.startsWith("/admin")) {
    return null;
  }

  return <>{children}</>;
}
