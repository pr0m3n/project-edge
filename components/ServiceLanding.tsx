import { JsonLd } from "@/components/JsonLd";
import { PriceEstimator } from "@/components/PriceEstimator";
import { PublicBriefWizard } from "@/components/PublicBriefWizard";
import { SiteNav } from "@/components/SiteNav";

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
            <a className="button secondary" href="https://checky.hu" rel="noreferrer" target="_blank">Éles rendszer megtekintése ↗</a>
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

      {/* A PriceEstimator saját bevezetője itt kikapcsolva: a fenti section-head
          már ugyanazt mondja el, két azonos árfejléc volt egymás alatt. */}
      <section className="landing-pricing"><div className="section-head"><p className="micro-label dark">Átlátható konstrukció</p><h2>Menedzselt weboldal, egyetlen fix havidíjért.</h2><p>A domain, a tárhely és a folyamatos karbantartás mind benne van a havidíjban — külön belépési díj nélkül, rugalmas vételi opcióval.</p></div><PriceEstimator showLead={false} /></section>

      {/* A brief korábban a főoldal /#projektbrief horgonyára dobta a látogatót:
          a fizetett forgalom pont a kitöltés előtt hagyta el a landinget. Itt
          helyben kitölthető, a záró CTA is ugyanerre a szekcióra mutat. */}
      <PublicBriefWizard />

      <section className="voices-section">
        <div className="section-head">
          <p className="micro-label dark">Miért én</p>
          <h2>Kivel dolgozol együtt?</h2>
        </div>
        <div className="voices-grid">
          <article className="voice-card feature">
            <p className="voice-claim">
              A Checky.hu-nál nem csak a felület készült el: frontend, backend, adatkezelés és a
              bonyolultabb működési folyamatok is egy kézben épültek. Éles rendszer, nem portfólió-kép.
            </p>
            <div className="voice-author">
              <div>
                <strong>
                  <a href="https://checky.hu" rel="noreferrer" target="_blank">Checky.hu megnyitása ↗</a>
                </strong>
                <span>full-stack referencia</span>
              </div>
            </div>
          </article>
          <article className="voice-card">
            <p className="voice-claim">
              Nem ügynökség vagyok, hanem egy fejlesztő, aki a tervezéstől a kódig és az indításig
              mindent maga csinál. Velem beszélsz, én építem, és én is felelek érte.
            </p>
            <div className="voice-author">
              <div>
                <strong>Patrik</strong>
                <span>alapító · fejlesztő · ProjectEdge</span>
              </div>
            </div>
          </article>
          <article className="voice-card">
            <p className="voice-claim">
              Ha a bérlésből kivásárolod, a végén minden a tiéd: domain, forráskód, adatbázis. Az
              átadás lépésenként megy, írásban — és a lezárásától még 30 napig díjmentesen javítom,
              ami elromlik.
            </p>
            <div className="voice-author">
              <div>
                <strong>Nincs bezárás</strong>
                <span>kivásárlás + 30 nap hibajavítás</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="faq-section">
        <div className="section-head"><p className="micro-label dark">GYIK</p><h2>A döntés előtt.</h2></div>
        <div className="faq-list">{content.faq.map(([question, answer]) => <details className="faq-item" key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
      </section>

      <section className="cta-band"><h2>Írd le, mire van szükséged — kötelező értekezletek nélkül, gyorsan elindulunk.</h2><a className="button primary" href="#projektbrief">Projektbrief indítása</a></section>
    </main>
  );
}
