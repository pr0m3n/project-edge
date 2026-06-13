import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

const steps = [
  ["01", "Pozicionálás", "Kinek szól, mit kell elhinnie, és milyen döntést kell meghoznia?"],
  ["02", "Architektúra", "Oldaltérkép, ajánlatkérő logika, tartalomritmus és adatfolyam."],
  ["03", "Vizuális rendszer", "Tipográfia, mozgás, szekcióritmus, 3D/effekt elemek és mobil működés."],
  ["04", "Építés", "Next.js, Supabase, admin felület, Vercel deploy, env és adatbázis bekötés."],
  ["05", "Indítás után", "Finomhangolás az első leadek és visszajelzések alapján."]
];

export default function ProcessPage() {
  return (
    <main className="site-shell dark-page">
      <SiteNav />
      <section className="page-hero compact inverse">
        <p className="micro-label">Folyamat</p>
        <h1>Nem vakon designolunk. Előbb megtervezzük, mit kell elérnie.</h1>
      </section>
      <section className="timeline">
        {steps.map(([number, title, copy]) => (
          <article key={number}>
            <strong>{number}</strong>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>
      <section className="cta-band dark">
        <h2>Ha ez a tempó illik hozzád, indulhatunk.</h2>
        <Link className="button primary" href="/ajanlatkeres">
          Projekt indítása
        </Link>
      </section>
    </main>
  );
}
