import Link from "next/link";

const links = [
  { href: "/szolgaltatasok", label: "Szolgáltatások" },
  { href: "/folyamat", label: "Folyamat" },
  { href: "/munkak", label: "Munkák" },
  { href: "/ugyfelkapu", label: "Ügyfélkapu" }
];

export function SiteNav() {
  return (
    <nav className="nav-shell" aria-label="Fő navigáció">
      <Link className="brand-lockup" href="/">
        <span className="brand-cube" aria-hidden="true">
          <span />
        </span>
        <span>ProjectEdge</span>
      </Link>
      <div className="nav-orbit">
        {links.map((link) => (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ))}
      </div>
      <Link className="nav-cta" href="/ugyfelkapu">
        Projekt indítása
      </Link>
    </nav>
  );
}
