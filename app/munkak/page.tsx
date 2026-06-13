import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

const workTypes = [
  ["Céges weboldal", "Prémium első benyomás, szolgáltatásfókusz, erős CTA rendszer."],
  ["Landing page", "Gyors kampányindítás, tesztelhető ajánlat, tiszta üzenet."],
  ["Webes rendszer", "Ajánlatkérő, admin, lead-kezelés, Supabase alapok."],
  ["Növekedési redesign", "Frissebb struktúra, jobb tartalom, erősebb bizalmi elemek."]
];

export default function WorkPage() {
  return (
    <main className="site-shell light-page">
      <SiteNav />
      <section className="page-hero compact">
        <p className="micro-label dark">Munkák</p>
        <h1>Portfólió, ami nem screenshotokból, hanem eredményekből épül.</h1>
        <p>
          A referenciák itt később külön esettanulmányként jelennek meg: cél, döntések, rendszer,
          technológia, eredmény.
        </p>
      </section>
      <section className="work-matrix">
        {workTypes.map(([title, copy]) => (
          <article key={title}>
            <span />
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>
      <section className="cta-band">
        <h2>Legyen a következő munka az első erős case study.</h2>
        <Link className="button primary" href="/ajanlatkeres">
          Beszéljünk róla
        </Link>
      </section>
    </main>
  );
}
