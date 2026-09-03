import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";

const quickRoutes = [
  {
    href: "/#arak",
    eyebrow: "01 / Árak",
    title: "Csomagok & Konstrukciók",
    copy: "Menedzselt weboldal egyetlen fix havidíjért."
  },
  {
    href: "/munkak",
    eyebrow: "02 / Portfólió",
    title: "Referenciák és 5 élő demó",
    copy: "Élesben futó ügyfélmunkák és végigkattintható mintaprojektek."
  },
  {
    href: "/folyamat",
    eyebrow: "03 / Módszertan",
    title: "Hogyan dolgozom?",
    copy: "Átlátható haladás, kötelező hívások nélkül."
  },
  {
    href: "/ingyenes-weboldal-audit",
    eyebrow: "04 / Lead Mágnes",
    title: "Ingyenes Weboldal-Audit",
    copy: "3 pontos gyorselemzés 24 órán belül."
  }
];

export default function NotFound() {
  return (
    <main className="site-shell light-page not-found-page">
      <SiteNav />

      <section className="not-found-hero">
        <div className="not-found-noise" aria-hidden="true" />
        <div className="not-found-container">
          <div className="not-found-header">
            <span className="not-found-badge">404 // HIBAKÓD · ROUTE NOT FOUND</span>
            <h1>Ez az oldal nincs a térképen.</h1>
            <p className="not-found-lead">
              Lehet, hogy elgépelted az URL-t, vagy a keresett aloldal már egy új, modernebb
              struktúrába költözött. De semmi gond, innen könnyen tovább tudsz navigálni:
            </p>
          </div>

          <div className="not-found-terminal" aria-hidden="true">
            <div className="not-found-terminal-bar">
              <span /><span /><span />
              <b>projectedge / router</b>
            </div>
            <div className="not-found-terminal-body">
              <p><span>$</span> router.resolve(request.path)</p>
              <p className="terminal-res"><span>→</span> status: <strong>404 NOT_FOUND</strong></p>
              <p className="terminal-suggest"><span>ℹ</span> Javaslat: Válassz az alábbi fő útvonalak közül ↓</p>
            </div>
          </div>

          <div className="not-found-routes-grid">
            {quickRoutes.map((route) => (
              <TransitionLink className="not-found-tile" href={route.href} key={route.href}>
                <span className="tile-eyebrow">{route.eyebrow}</span>
                <h3>{route.title}</h3>
                <p>{route.copy}</p>
                <strong>Tovább <span>→</span></strong>
              </TransitionLink>
            ))}
          </div>

          <div className="not-found-actions">
            <TransitionLink className="button primary" href="/">
              Vissza a kezdőlapra
            </TransitionLink>
            <TransitionLink className="button spectral" href="/#projektbrief">
              Projektbrief indítása
            </TransitionLink>
          </div>
        </div>
      </section>
    </main>
  );
}
