import type { Metadata } from "next";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { WorkGallery, WorkHero } from "@/components/WorkGallery";
import { WordRoll } from "@/components/WordRoll";
import { PledgeScroll } from "@/components/PledgeScroll";
import { WORKS } from "@/lib/works";

export const metadata: Metadata = {
  title: "Munkák és projektbemutatók | ProjectEdge",
  description: "Élesben futó ügyfélmunkák és végigkattintható mintaprojektek: mit építek, kinek, és hogyan néz ki használat közben.",
  alternates: { canonical: "/munkak" }
};

const pledges = [
  {
    quote:
      "Nem sablonból dolgozom, és nem kell írogatnod, hogy hol tart. Belépsz, és látod, mi készült el és mi jön ezután.",
    name: "Átlátható munka",
    role: "tervezéstől az indításig"
  },
  {
    quote:
      "Aki rákeres a szolgáltatásodra, megtalálja az oldalad, és két koppintással ír neked. Telefonon is.",
    name: "Eredményre tervezve",
    role: "sebesség + ügyfélszerzés"
  },
  {
    quote:
      "Kényelmes folyamat: az ügyfélkapun indítod a projektet, követed a haladást és fizetsz. Felesleges körök és kötelező értekezletek nélkül.",
    name: "Kényelmes folyamat",
    role: "minden egy helyen"
  }
];

export default function WorkPage() {
  return (
    <main className="site-shell light-page">
      <SiteNav />

      <WorkHero />

      <WorkGallery />

      {/* Ez a sáv nem dísz: a munkaválasztó után hosszú világos futam
          következett, amiben a látogató elveszítette, hogy hol tart. Egy
          keskeny sötét csík kettévágja — és közben egy sorban elmondja,
          amit az egész oldal állít: sokféle üzleti célra építek. */}
      <section className="roll-band" aria-label="Üzleti célok">
        <WordRoll prefix="Ezt építem:" words={WORKS.map((work) => work.goal)} />
      </section>

      <PledgeScroll pledges={pledges} />

      {/* A záró sávban NEM a munkák számának van helye: aki idáig ért, már
          végignézte őket, tehát a kérdés nem az, hogy tudok-e építeni, hanem
          hogy kinek ír és mi történik utána. Ezért az utolsó kép egy arc, a
          szöveg pedig a következő lépésről szól. */}
      <section className="cta-band">
        <div className="cta-band-copy">
          <h2>Van egy ötleted vagy egy meglévő oldalad? Abból el lehet indulni.</h2>
          <p className="cta-band-sub">
            Írd le pár mondatban, mire lenne szükséged. Általában pár percen belül válaszolok —
            árral, határidővel és a következő lépéssel, kötelezettség nélkül.
          </p>
          <span className="cta-signoff">
            <Image
              alt=""
              className="cta-signoff-photo"
              height={140}
              sizes="52px"
              src="/profile/patrik.png"
              width={105}
            />
            <span>
              <b>Patrik válaszol, nem egy űrlap.</b>
              <small>alapító · fejlesztő · ProjectEdge</small>
            </span>
          </span>
        </div>
        {/* A gomb eddig az ügyfélkapura vitt, vagyis egy bejelentkező képernyőre
            — miközben a szöveg fölötte azt ígéri, hogy „írd le pár mondatban".
            A főoldali brief gyorssávja pontosan ez: egy mondat, regisztráció
            nélkül. A többi oldal CTA-ja azért mutat az ügyfélkapura, mert ott a
            felirat is adatlapot ígér („Projekt indítása"). */}
        <TransitionLink className="button primary" href="/#projektbrief">
          Beszéljünk róla
        </TransitionLink>
      </section>
    </main>
  );
}
