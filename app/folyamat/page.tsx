import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { IconMessageCircle, IconCompass, IconPenTool, IconGear, IconSparkles, IconPackage, IconWrench, IconLock } from "@/components/icons";

export const metadata: Metadata = {
  title: "A közös munka folyamata | ProjectEdge",
  description: "Az igényfelméréstől a designon és fejlesztésen át az élesítésig: követhető weboldal-készítési folyamat."
};

const steps = [
  {
    number: "01",
    title: "Átbeszéljük",
    copy: "Kitöltesz egy adatlapot: mid van most, mi nem működik, kiket szeretnél elérni. Hívás nélkül is megy.",
    tag: "hívás nélkül is",
    Icon: IconMessageCircle
  },
  {
    number: "02",
    title: "Rendet rakok",
    copy: "Összerakom, milyen oldalak kellenek és mi hova kerül. Itt dől el, mire nincs szükséged — hogy ne fizess feleslegesen.",
    tag: "1–2 nap",
    Icon: IconCompass
  },
  {
    number: "03",
    title: "Megtervezem",
    copy: "Kapsz egy látványtervet, mielőtt egy sort is kódolnék. Itt módosítunk, amíg nem tetszik.",
    tag: "jóváhagyásra váró irány",
    Icon: IconPenTool
  },
  {
    number: "04",
    title: "Felépítem",
    copy: "Megépítem, mobilra is. A domaint és az élesítést is én intézem. Közben végig látod, hol tartok.",
    tag: "a projekt nagy része",
    Icon: IconGear
  },
  {
    number: "05",
    title: "Finomítom",
    copy: "Indulás után javítom, ami csak éles használatban derül ki. Nem tűnök el az átadás után.",
    tag: "indulás után is",
    Icon: IconSparkles
  }
];

const extras = [
  {
    Icon: IconMessageCircle,
    title: "Folyamatos kapcsolat",
    copy: "Írsz az ügyfélkapun, és ott is marad. Nem vész el semmi emailben."
  },
  {
    Icon: IconPackage,
    title: "Kétféle befejezés",
    copy: "Bérlésnél én üzemeltetem tovább. Vásárlásnál a forráskód és minden hozzáférés a tiéd."
  },
  {
    Icon: IconWrench,
    title: "Indulás után",
    copy: "Bérlésnél innentől figyelem és frissítem, és elvégzem a csomagban foglalt módosításokat."
  },
  {
    Icon: IconLock,
    title: "Hogyan indul a fizetés",
    copy: "Bérlésnél az első havidíj indítja a munkát, induló díj nincs. Vásárlásnál foglaló, majd átadás."
  }
];

export default function ProcessPage() {
  return (
    <main className="site-shell dark-page">
      <SiteNav />
      <section className="page-hero compact inverse">
        <p className="micro-label">Folyamat</p>
        <h1>Így megy a közös munka, lépésről lépésre.</h1>
        <p className="process-intro">
          Nem a látvánnyal kezdünk. Előbb átnézzük, mit csinálsz és kiknek — utána jön a design és
          a kód.
        </p>
      </section>
      <section className="proc-list">
        {steps.map(({ number, title, copy, tag, Icon }) => (
          <article className="proc-step" key={number}>
            <span className="proc-num">{number}</span>
            <div className="proc-body">
              <h2>{title}</h2>
              <p>{copy}</p>
              <span className="step-tag">{tag}</span>
            </div>
            <div className="proc-icon" aria-hidden="true">
              <Icon size={28} />
            </div>
          </article>
        ))}
      </section>
      <section className="process-extras">
        {extras.map(({ Icon, title, copy }) => (
          <article className="process-extra" key={title}>
            <div className="extra-ico" aria-hidden="true">
              <Icon size={24} />
            </div>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
      </section>
      <section className="cta-band dark">
        <h2>Töltsd ki az adatlapot. Tizenöt perc, és tudom, mire van szükséged.</h2>
        <TransitionLink className="button primary" href="/ugyfelkapu">
          Projekt indítása
        </TransitionLink>
      </section>
    </main>
  );
}
