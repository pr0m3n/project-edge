import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { IconMessageCircle, IconPackage, IconWrench, IconLock } from "@/components/icons";
import { ProcessTimeline, type FlowStep } from "@/components/ProcessTimeline";

export const metadata: Metadata = {
  title: "A közös munka folyamata | ProjectEdge",
  description: "Az igényfelméréstől a designon és fejlesztésen át az élesítésig: követhető weboldal-készítési folyamat.",
  alternates: { canonical: "/folyamat" }
};

const steps: FlowStep[] = [
  {
    number: "01",
    title: "Átbeszéljük",
    copy: "Kitöltesz egy adatlapot: mid van most, mi nem működik, kiket szeretnél elérni. Írásban vagy gyors hívással is egyeztethetünk.",
    tag: "rugalmas egyeztetés",
    scene: "brief"
  },
  {
    number: "02",
    title: "Rendet rakok",
    copy: "Összerakom, milyen oldalak kellenek és mi hova kerül. Itt dől el, mire nincs szükséged — hogy ne fizess feleslegesen.",
    tag: "az első 1–2 nap",
    scene: "terv"
  },
  {
    number: "03",
    title: "Felépítem",
    copy: "Megépítem, mobilra is. A domaint és az élesítést is én intézem. Közben az ügyfélkapun végig látod, hol tartok.",
    tag: "a projekt nagy része",
    scene: "epites"
  },
  {
    number: "04",
    title: "Megnézed és jóváhagyod",
    copy: "Privát előnézeti linken megkapod a kész oldalt. Itt kérsz módosítást, és csak a te jóváhagyásod után kerül élesbe.",
    tag: "nálad a döntés",
    scene: "jovahagyas"
  },
  {
    number: "05",
    title: "Finomítom",
    copy: "Indulás után javítom, ami csak éles használatban derül ki. Nem tűnök el az átadás után.",
    tag: "indulás után is",
    scene: "finomitas"
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
    copy: "Bérlésnél az első havidíj indítja a munkát — külön belépési díj nincs. Vásárlásnál foglaló, majd átadás."
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
        <ProcessTimeline steps={steps} />
      </section>
      {/* A két konstrukció NEM ugyanazon a folyamaton megy végig: bérlésnél
          nincs ajánlati kör, vásárlásnál viszont van, és átadás is. Korábban egy
          leírás próbálta lefedni mindkettőt, amiből az ügyfél mást várt. */}
      <section className="flow-split" aria-labelledby="flow-split-title">
        <div className="flow-split-head">
          <p className="micro-label">Két útvonal</p>
          <h2 id="flow-split-title">A lépések attól függenek, bérelsz vagy egyszeri projektet kérsz.</h2>
        </div>
        <div className="flow-split-grid">
          <article>
            <span>BÉRLÉS · a leggyakoribb</span>
            <ol>
              <li>Kitöltöd az adatlapot és csomagot választasz</li>
              <li>Elfogadod a szerződést az ügyfélkapun</li>
              <li>Elindul az előfizetés — az első havidíj indítja a munkát</li>
              <li>Megépítem az oldalt</li>
              <li>Előnézet, módosítás, jóváhagyás</li>
              <li>Élesítés, majd folyamatos üzemeltetés</li>
            </ol>
            <p>Nincs ajánlati kör és nincs technikai átadás — az infrastruktúrát végig én kezelem. Ha később a sajátod lenne, a rögzített vételi opcióval bármikor kivásárolhatod.</p>
          </article>
          <article>
            <span>EGYSZERI PROJEKT · webapp, felújítás</span>
            <ol>
              <li>Kitöltöd az adatlapot</li>
              <li>Egyedi ajánlatot kapsz, amit elfogadsz</li>
              <li>Szerződés, majd foglaló utalása</li>
              <li>Megépítem az oldalt</li>
              <li>Előnézet, módosítás, jóváhagyás</li>
              <li>Végszámla, majd vezetett technikai átadás</li>
            </ol>
            <p>Webapp, meglévő oldal felújítása és webshop nem bérelhető — ezek egyszeri, egyedi projektek. Az átadás lépésenként megy az ügyfélkapun, néhány fiókot neked kell létrehoznod, ehhez írásos útmutatót adok.</p>
          </article>
        </div>
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
      <section className="delivery-times" aria-labelledby="delivery-times-title">
        <div><p className="micro-label">Várható elkészítés</p><h2 id="delivery-times-title">Gyors, de nem kapkodós.</h2><p>Az idő a hiánytalan brief, a szükséges anyagok és az induló fizetés beérkezésétől számít.</p></div>
        <dl><div><dt>Jelenlét</dt><dd>2–4 munkanap</dd></div><div><dt>Üzleti</dt><dd>3–6 munkanap</dd></div><div><dt>Egyedi</dt><dd>5–14 munkanap</dd></div></dl>
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
