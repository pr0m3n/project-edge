import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

const steps = [
  ["01", "Átbeszéljük", "Mi van most, mi nem működik, és milyen típusú megkereséseket szeretnél kapni?"],
  ["02", "Rendet rakunk", "Oldalak, szövegek, ajánlatkérő mezők, fontos döntési pontok. Itt derül ki, mire van tényleg szükség."],
  ["03", "Megtervezem", "Nem kész sablonból indulok. Kapsz egy vizuális irányt, ami illik a szolgáltatásodhoz és az ügyfeleidhez."],
  ["04", "Felépítem", "Next.js, Supabase, gyors betöltés, mobilnézet, domain és Vercel deploy. Amit kell, bekötünk."],
  ["05", "Finomítjuk", "Indulás után megnézzük, hogyan viselkedik az oldal, és javítunk azon, ami a valós használatban látszik."]
];

export default function ProcessPage() {
  return (
    <main className="site-shell dark-page">
      <SiteNav />
      <section className="page-hero compact inverse">
        <p className="micro-label">Folyamat</p>
        <h1>Előbb kitaláljuk, mit kell mondania az oldalnak.</h1>
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
        <h2>Ha szereted, amikor átlátható a munka, valószínűleg jól fogunk haladni.</h2>
        <Link className="button primary" href="/ajanlatkeres">
          Projekt indítása
        </Link>
      </section>
    </main>
  );
}
