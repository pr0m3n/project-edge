"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ADS_ID, GA_ID, measurementEnabled, readConsent, trackPageView } from "@/lib/analytics";

/**
 * A gtag betöltése és a Consent Mode alapállapota.
 *
 * Fontos a sorrend: az alapértelmezett (tiltott) hozzájárulási állapotot még a
 * gtag.js betöltése ELŐTT be kell állítani, különben a Google már a döntés
 * előtt sütizne. Ezért fut a consent-default szkript beforeInteractive módban.
 */
export function Analytics() {
  const pathname = usePathname();

  // kliensoldali útvonalváltás jelzése (a config csak az első betöltést küldi)
  useEffect(() => {
    if (!measurementEnabled || !pathname) return;
    if (readConsent() !== "granted") return;
    trackPageView(pathname);
  }, [pathname]);

  if (!measurementEnabled) return null;

  const primaryId = GA_ID || ADS_ID;

  return (
    <>
      <Script id="consent-default" strategy="beforeInteractive">
        {`
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
            var stored = localStorage.getItem('pe-consent-v1');
            if (stored === 'granted') {
              gtag('consent', 'update', {
                ad_storage: 'granted',
                ad_user_data: 'granted',
                ad_personalization: 'granted',
                analytics_storage: 'granted'
              });
            }
          } catch (e) {}
        `}
      </Script>

      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${primaryId}`}
        strategy="afterInteractive"
      />

      <Script id="gtag-config" strategy="afterInteractive">
        {`
          gtag('js', new Date());
          ${GA_ID ? `gtag('config', '${GA_ID}');` : ""}
          ${ADS_ID ? `gtag('config', '${ADS_ID}');` : ""}
        `}
      </Script>
    </>
  );
}
