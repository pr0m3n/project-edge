import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { ProcessTimeline, type FlowStep } from "@/components/ProcessTimeline";
import { InteractiveFlowStage } from "@/components/InteractiveFlowStage";

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

      {/* Interaktív Két Útvonal Színpad Művészi WebGL Shaderrel és Élő Szimulációval */}
      <InteractiveFlowStage />
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
