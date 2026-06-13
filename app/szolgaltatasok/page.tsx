import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

const services = [
  ["Új weboldal", "Ha most indulsz, kapsz egy tiszta, gyors, igényes oldalt. Nem sablonhangulatot, hanem saját arcot."],
  ["Meglévő oldal javítása", "Ha már van weboldalad, megnézzük, hol gyenge: szöveg, sebesség, ajánlatkérés, mobilnézet vagy bizalomépítés."],
  ["Ajánlatkérő űrlap", "Olyan űrlap, amit tényleg ki lehet tölteni. A beküldések adatbázisba mennek, nem vesznek el emailben."],
  ["Admin háttér", "Egyszerű felület a beérkező érdeklődőknek, státuszoknak és jegyzeteknek. Később bővíthető ügyfélkezeléssé."]
];

export default function ServicesPage() {
  return (
    <main className="site-shell light-page">
      <SiteNav />
      <section className="page-hero compact">
        <p className="micro-label dark">Szolgáltatások</p>
        <h1>Nem minden cégnek ugyanaz az oldal kell.</h1>
        <p>
          Van, ahol egy gyors, jól megírt landing elég. Máshol kell ajánlatkérő, admin felület,
          több aloldal vagy teljes újratervezés. Először ezt tisztázzuk.
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
        <h2>Ha most kell rendbe rakni az online jelenléted, kezdjük egy rövid igényfelméréssel.</h2>
        <Link className="button primary" href="/ajanlatkeres">
          Ajánlatot kérek
        </Link>
      </section>
    </main>
  );
}
