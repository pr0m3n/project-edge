import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

const workTypes = [
  ["Céges weboldal", "Amikor fontos, hogy az első benyomás komolyabb legyen, mint egy sima bemutatkozó oldal."],
  ["Landing page", "Egy ajánlat, egy cél, egy tiszta út. Kampányhoz, induláshoz vagy gyors teszthez."],
  ["Webes rendszer", "Ajánlatkérő, belépés, adatbázis, admin. Akkor jó, ha már folyamatot is kell kezelni."],
  ["Redesign", "Nem nulláról kezdünk, hanem a meglévő oldalból hozzuk ki azt, amit eddig nem tudott."]
];

export default function WorkPage() {
  return (
    <main className="site-shell light-page">
      <SiteNav />
      <section className="page-hero compact">
        <p className="micro-label dark">Munkák</p>
        <h1>Itt nem csak képeket érdemes majd mutatni.</h1>
        <p>
          Egy jó munka mögött ott van a probléma, a döntés és az eredmény is. A referenciák ezért
          később rövid esettanulmányként kerülnek ide.
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
        <h2>Ha van egy ötleted vagy meglévő oldalad, abból már el lehet indulni.</h2>
        <Link className="button primary" href="/ajanlatkeres">
          Beszéljünk róla
        </Link>
      </section>
    </main>
  );
}
