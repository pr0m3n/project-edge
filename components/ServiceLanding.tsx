import { JsonLd } from "@/components/JsonLd";
import { PriceEstimator } from "@/components/PriceEstimator";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";

export type ServiceLandingContent = {
  slug: string;
  eyebrow: string;
  title: string;
  lead: string;
  promise: string;
  audience: string[];
  outcomes: Array<{ title: string; copy: string }>;
  process: Array<{ title: string; copy: string }>;
  faq: Array<[string, string]>;
};

export function ServiceLanding({ content }: { content: ServiceLandingContent }) {
  const url = `https://www.projectedge.hu/${content.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: content.title,
    description: content.lead,
    provider: { "@id": "https://www.projectedge.hu/#business" },
    areaServed: { "@type": "Country", name: "Magyarország" },
    url
  };

  return (
    <main className="site-shell light-page service-landing">
      <JsonLd data={jsonLd} />
      <SiteNav />
      <section className="landing-hero">
        <div>
          <p className="micro-label dark">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p>{content.lead}</p>
          <div className="hero-command">
            <a className="button primary" href="#arak">Csomagok és árak</a>
            <TransitionLink className="button secondary" href="/munkak/checky">Éles rendszer megtekintése</TransitionLink>
          </div>
        </div>
        <aside><span>PROJECTEDGE · TELJESEN ONLINE</span><strong>{content.promise}</strong><ul>{content.audience.map((item) => <li key={item}>{item}</li>)}</ul></aside>
      </section>

      <section className="landing-outcomes">
        <header><p className="micro-label dark">Nem csak látvány</p><h2>Mit kapsz a végén?</h2></header>
        <div>{content.outcomes.map((item, index) => <article key={item.title}><span>0{index + 1}</span><h3>{item.title}</h3><p>{item.copy}</p></article>)}</div>
      </section>

      <section className="landing-process">
        <header><p className="micro-label">Követhető folyamat</p><h2>Briefből működő weboldal.</h2></header>
        <ol>{content.process.map((item, index) => <li key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3><p>{item.copy}</p></div></li>)}</ol>
      </section>

      <section className="landing-pricing"><div className="section-head"><p className="micro-label dark">Átlátható konstrukció</p><h2>Béreled vagy megveszed.</h2><p>Az előfizetésnél nincs induló díj. Egyszeri projektnél a részletes brief alapján kapsz végleges ajánlatot.</p></div><PriceEstimator /></section>

      <section className="faq-section">
        <div className="section-head"><p className="micro-label dark">GYIK</p><h2>A döntés előtt.</h2></div>
        <div className="faq-list">{content.faq.map(([question, answer]) => <details className="faq-item" key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
      </section>

      <section className="cta-band"><h2>Írd le, mire van szükséged — a folyamat hívás nélkül is végigvihető.</h2><TransitionLink className="button primary" href="/#projektbrief">Projektbrief indítása</TransitionLink></section>
    </main>
  );
}
