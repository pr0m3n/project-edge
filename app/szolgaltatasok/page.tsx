import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

const services = [
  ["Signature weboldal", "Egyedi arculati irány, prémium nyitóélmény, gyors betöltés, tiszta ajánlat és konverziós útvonal."],
  ["Ajánlatkérő rendszer", "Többlépcsős űrlap, Supabase adatmentés, lead státuszok és admin áttekintés."],
  ["Üzleti admin", "Zárt dashboard érdeklődők, ügyfelek, projektek, jegyzetek és későbbi automatizációk kezelésére."],
  ["Redesign sprint", "Meglévő oldal újrapozicionálása frissebb vizuális nyelvvel és jobb ügyfélszerző struktúrával."]
];

export default function ServicesPage() {
  return (
    <main className="site-shell light-page">
      <SiteNav />
      <section className="page-hero compact">
        <p className="micro-label dark">Szolgáltatások</p>
        <h1>Komolyabb online jelenlét, rendszerként megépítve.</h1>
        <p>
          A cél nem az, hogy “legyen egy oldalad”. A cél az, hogy a látogató gyorsan értse az
          értékedet, merjen kapcsolatba lépni, te pedig azonnal kezelni tudd a beérkező leadet.
        </p>
      </section>

      <section className="service-board">
        {services.map(([title, copy], index) => (
          <article className="service-slab" key={title}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <section className="cta-band">
        <h2>Ha prémiumabbnak kell hatnia, másképp kell felépíteni.</h2>
        <Link className="button primary" href="/ajanlatkeres">
          Ajánlatot kérek
        </Link>
      </section>
    </main>
  );
}
