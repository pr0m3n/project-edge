import Link from "next/link";

const navLinks = [
  { href: "/szolgaltatasok", label: "Szolgáltatások" },
  { href: "/folyamat", label: "Folyamat" },
  { href: "/munkak", label: "Munkák" },
  { href: "/ugyfelkapu", label: "Ügyfélkapu" }
];

const legalLinks = [
  { href: "/impresszum", label: "Impresszum" },
  { href: "/adatkezeles", label: "Adatkezelési tájékoztató" },
  { href: "/aszf", label: "ÁSZF" }
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer" aria-label="Lábléc">
      <div className="footer-grid">
        <div className="footer-brand">
          <span className="footer-logo">ProjectEdge</span>
          <p>
            Egyedi weboldalak, ügyfélkapuk és üzleti rendszerek — a tervezéstől a kódig egy kézben.
          </p>
          <a href="mailto:info@projectedge.hu">info@projectedge.hu</a>
        </div>

        <nav className="footer-col" aria-label="Oldaltérkép">
          <span className="footer-col-title">Oldalak</span>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <nav className="footer-col" aria-label="Jogi információk">
          <span className="footer-col-title">Jogi</span>
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="footer-bottom">
        <span>© {year} ProjectEdge. Minden jog fenntartva.</span>
        <span>projectedge.hu</span>
      </div>
    </footer>
  );
}
