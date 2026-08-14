import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { AuditRequestSection } from "@/components/AuditRequestSection";
import { JsonLd } from "@/components/JsonLd";
import { TransitionLink } from "@/components/TransitionLink";

export const metadata: Metadata = {
  title: "Ingyenes weboldal-audit és gyorselemzés | ProjectEdge",
  description:
    "Küldd el a weboldalad címét, és 24 órán belül megkapod a 3 pontos, személyre szabott elemzést: sebesség, konverzió és mobilélmény. Teljesen ingyenes.",
  alternates: { canonical: "/ingyenes-weboldal-audit" }
};

export default function AuditPage() {
  return (
    <main className="site-shell light-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Ingyenes weboldal-audit és gyorselemzés",
          description:
            "3 pontos weboldal elemzés vállalkozásoknak: betöltési sebesség, mobilos használhatóság és konverziós struktúra.",
          provider: { "@id": "https://www.projectedge.hu/#business" },
          areaServed: { "@type": "Country", name: "Magyarország" },
          url: "https://www.projectedge.hu/ingyenes-weboldal-audit"
        }}
      />
      <SiteNav />

      <section className="page-hero compact">
        <p className="micro-label dark">Weboldal elemzés · Lead mágnes</p>
        <h1>Miért nem hoz elég ajánlatot az oldalad?</h1>
        <p>
          Sok weboldal szép, mégsem hoz vevőket: lassú a betöltés, zavaros a navigáció, vagy
          nem világos a látogatónak, mit kellene tennie. Kérj egy 3 pontos, azonnal alkalmazható
          elemzést — ingyen, 24 órán belül.
        </p>
      </section>

      <AuditRequestSection />

      <section className="audit-faq-section" style={{ maxWidth: "1280px", margin: "0 auto", padding: "clamp(60px, 8vw, 100px) clamp(18px, 6vw, 88px)" }}>
        <div className="section-head">
          <p className="micro-label dark">Gyakori kérdések</p>
          <h2>Hogyan zajlik az elemzés?</h2>
        </div>
        <div className="faq-list">
          <details className="faq-item">
            <summary>Tényleg teljesen ingyenes?</summary>
            <p>
              Igen, 100%-ban díjmentes és semmilyen vásárlási kötelezettséggel nem jár. Célom, hogy
              valós értéket és konkrét, azonnal érthető visszajelzést adjak a jelenlegi webes jelenlétedről.
            </p>
          </details>
          <details className="faq-item">
            <summary>Milyen formában kapom meg a visszajelzést?</summary>
            <p>
              Közvetlen, lényegretörő emailben (vagy szükség esetén 2-3 perces képernyővideóban) mutatom meg
              a 3 legfontosabb pontot, amin érdemes javítanod a jobb ügyfélszerzés érdekében.
            </p>
          </details>
          <details className="faq-item">
            <summary>Mi történik az elemzés után?</summary>
            <p>
              A javaslatokat megcsinálhatod a jelenlegi fejlesztőddel, magad is — vagy ha szeretnéd,
              hogy én építsek egy modern, gyors és konvertáló új oldalt, megbeszélhetjük a lehetőségeket.
            </p>
          </details>
        </div>
      </section>

      <section className="cta-band">
        <h2>Inkább teljesen új oldalt szeretnél a nulláról?</h2>
        <TransitionLink className="button primary" href="/#arak">
          Csomagok és árak megnézése
        </TransitionLink>
      </section>
    </main>
  );
}
