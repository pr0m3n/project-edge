"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ADS_ID, CLARITY_ID, GA_ID, measurementEnabled, readConsent, trackPageView } from "@/lib/analytics";

/**
 * A süti-hozzájárulás mint külső tároló.
 *
 * A döntés a `localStorage`-ban él, amihez a szerver nem fér hozzá. Ha
 * renderelés közben olvasnánk, a szerver mindig „nincs hozzájárulás"-t adna,
 * a kliens első renderje viszont a valódi értéket — a Clarity `<Script>` emiatt
 * hidratálási eltérést okozott, és a hibás részfa újrarenderelésekor a mérőkód
 * betöltése el is maradhatott. Ez magyarázza, miért látott a Clarity
 * nagyságrenddel kevesebb munkamenetet, mint amennyi kattintást az Ads mért.
 *
 * A `useSyncExternalStore` pont erre való: a szerver-pillanatkép mindig
 * `false`, a kliens pedig a mount után áll rá a valódi értékre.
 */
function subscribeToConsent(onChange: () => void) {
  window.addEventListener("projectedge:consent-changed", onChange);
  return () => window.removeEventListener("projectedge:consent-changed", onChange);
}

function consentSnapshot() {
  return readConsent() === "granted";
}

function consentServerSnapshot() {
  return false;
}

/**
 * A mérőkódok betöltése és a Consent Mode alapállapota.
 *
 * Fontos a sorrend: az alapértelmezett (tiltott) hozzájárulási állapotot még a
 * gtag.js betöltése ELŐTT be kell állítani, különben a Google már a döntés
 * előtt sütizne. Ezért fut a consent-default szkript beforeInteractive módban.
 */
export function Analytics() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const consentGranted = useSyncExternalStore(subscribeToConsent, consentSnapshot, consentServerSnapshot);

  // A config szándékosan send_page_view:false, így az első és a későbbi
  // kliensoldali oldalmegtekintést is pontosan ez az egy effekt küldi.
  useEffect(() => {
    if (!measurementEnabled || !pathname || !ready) return;
    if (!consentGranted) return;
    trackPageView(pathname);
  }, [consentGranted, pathname, ready]);

  if (!measurementEnabled) return null;

  const primaryId = GA_ID || ADS_ID;

  return (
    <>
      {primaryId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${primaryId}`}
            strategy="afterInteractive"
          />

          <Script id="gtag-config" onReady={() => setReady(true)} strategy="afterInteractive">
            {`
              gtag('js', new Date());
              ${GA_ID ? `gtag('config', '${GA_ID}', { send_page_view: false });` : ""}
              ${ADS_ID ? `gtag('config', '${ADS_ID}', { send_page_view: false });` : ""}
            `}
          </Script>
        </>
      ) : null}

      {CLARITY_ID && consentGranted ? (
        <Script id="clarity-init" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");
          `}
        </Script>
      ) : null}
    </>
  );
}
