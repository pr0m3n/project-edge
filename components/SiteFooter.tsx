import { TransitionLink } from "@/components/TransitionLink";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";
import { STUDIO_EMAIL, STUDIO_PHONE_LABEL, STUDIO_PHONE_TEL } from "@/lib/contact";

const navLinks = [
  { href: "/szolgaltatasok", label: "Szolgáltatások" },
  { href: "/folyamat", label: "Folyamat" },
  { href: "/munkak", label: "Munkák" },
  { href: "/blog", label: "Blog" },
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
          <a href={`mailto:${STUDIO_EMAIL}`}>{STUDIO_EMAIL}</a>
          <a href={`tel:${STUDIO_PHONE_TEL}`}>{STUDIO_PHONE_LABEL}</a>
        </div>

        <nav className="footer-col" aria-label="Oldaltérkép">
          <span className="footer-col-title">Oldalak</span>
          {navLinks.map((link) => (
            <TransitionLink key={link.href} href={link.href}>
              {link.label}
            </TransitionLink>
          ))}
        </nav>

        <nav className="footer-col" aria-label="Jogi információk">
          <span className="footer-col-title">Jogi</span>
          {legalLinks.map((link) => (
            <TransitionLink key={link.href} href={link.href}>
              {link.label}
            </TransitionLink>
          ))}
          <CookieSettingsButton />
        </nav>
      </div>

      <div className="footer-bottom">
        <span>© {year} ProjectEdge. Minden jog fenntartva.</span>
        <span>projectedge.hu</span>
      </div>
    </footer>
  );
}
