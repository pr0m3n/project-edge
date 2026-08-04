"use client";

import { usePathname } from "next/navigation";

/**
 * A /demo alatti mintaprojektek saját, önálló arculatot mutatnak — ott a
 * ProjectEdge lábléc és support widget nem jelenhet meg, különben szétesik az
 * illúzió, hogy egy külön márka oldalát nézzük.
 */
export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname?.startsWith("/demo")) {
    return null;
  }

  return <>{children}</>;
}
