import Link from "next/link";

export default function NotFound() {
  return (
    <main className="site-shell" style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: "48px 20px" }}>
      <section style={{ maxWidth: 560, textAlign: "center" }}>
        <span className="eyebrow">404 · NINCS ITT SEMMI</span>
        <h1>Ez az oldal nem található.</h1>
        <p>Lehet, hogy a link régi, vagy az oldal már máshová költözött.</p>
        <Link className="button primary" href="/">Vissza a kezdőlapra</Link>
      </section>
    </main>
  );
}
