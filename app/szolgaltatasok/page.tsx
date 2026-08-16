import type { ReactElement } from "react";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { PriceEstimator } from "@/components/PriceEstimator";
import { LOGO_DESIGN_PRICE, formatHuf } from "@/lib/subscriptions";
import {
  IconGlobe,
  IconKey,
  IconShapes,
  IconDroplet,
  IconPen,
  IconCamera,
  IconLink,
  IconPhone,
  IconBarChart,
  IconReceipt
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Weboldal készítés és egyedi rendszerek | ProjectEdge",
  description: "Landing oldalak, céges weboldalak, redesign, ügyfélkapu és admin rendszer egy kézben, átlátható folyamattal.",
  alternates: { canonical: "/szolgaltatasok" }
};

const services = [
  ["Új, menedzselt weboldal", "Bérlésnél mindig új oldal épül, a választott csomag keretei szerint. Domain, tárhely, email továbbítás és felügyelet egyben."],
  ["Kivásárlás bármikor", "A bérelt oldalt egyszeri díjért megveheted: a forráskód, a domain és a hozzáférések a tieddé válnak, az előfizetés pedig lezárul."],
  ["Folyamatos gondozás", "A bérelt oldalt figyelem, frissítem, és a csomag szerinti módosításokat elvégzem. Neked nincs technikai feladatod."],
  ["Díjmentes email továbbítás", "A domainhez tartozó email címekről (pl. info@cegnev.hu) automatikusan továbbítom a leveleket a saját postafiókodba."],
  ["Egyedi webapp vagy admin", "Belépés, adatbázis, ügyfélkapu csak megvásárolható projektként kérhető."]
];

// Ügyféltípus → megoldás → mire használjuk (az ár a lenti csúszkás becslőben van,
// hogy ne legyen két, egymástól eltérő megjelenésű ár-forrás az oldalon)
const solutions: Array<{
  type: string;
  who: string;
  stack: string;
}> = [
  {
    type: "Most indulsz / kell egy szép bemutatkozó",
    who: "Egyéni vállalkozó, szabadúszó, helyi szolgáltató, aki egy gyors, meggyőző oldalt szeretne.",
    stack: "Egyoldalas vagy néhány aloldalas landing — Next.js + Vercel tárhely. Nincs felesleges rendszer mögötte."
  },
  {
    type: "Komoly céges weboldal több aloldallal",
    who: "Működő vállalkozás, aki bizalmat épít, ajánlatot kér és kitűnik a versenytársak közül.",
    stack: "Egyedi prémium oldal — Next.js + Vercel, igény szerint ügyfélkapuval és ajánlatkérő folyamattal."
  },
  {
    type: "Már van WordPress oldalad — egyszeri projekt",
    who: "Van működő oldalad, de lassú, elavult vagy nem hoz ügyfelet — vagy csak frissítés kell.",
    stack: "Megnézem, mi van benne. Ha jó az alap, marad a WordPress és csak felújítom. Ha gátol, átültetem modern rendszerre — a tartalmat áthozom."
  },
  {
    type: "Egyedi rendszer, ügyfélkapu, admin — egyszeri projekt",
    who: "Belépés, adatkezelés, dashboard, foglalás, automatizált folyamatok kellenek.",
    stack: "Egyedi webapp — Next.js + Supabase (adatbázis, belépés, jogosultság) + Vercel. Pont ilyen a ProjectEdge ügyfélkapu is."
  }
];

// Ezek nem illenek a fenti, egyszeri projekt-becslőbe (egyedi ajánlat, illetve
// havi visszatérő díj), ezért külön, egyszerű sorként jelennek meg.
const specialCases: Array<[string, string, string]> = [
  ["Webshop kell", "Terméket vagy szolgáltatást árulnál online, kosárral és fizetéssel — bevált alapra építek (Shopify / WooCommerce).", "Egyedi ajánlat"],
  ["Meglévő oldal gondozása (nem tőlem származó oldalra)", "Már van egy működő oldalad mástól, és kell valaki, aki figyel rá: frissítés, mentés, mérés, apró javítások, havi riport. Ez NEM a weboldal-bérlés — ott a gondozás már benne van a havidíjban.", "15 000 – 35 000 Ft / hó"]
];

const bring: Array<{ Icon: (props: { size?: number }) => ReactElement; title: string; copy: string }> = [
  { Icon: IconGlobe, title: "Vágyott domain", copy: "Írj három névötletet prioritási sorrendben. Előfizetésnél a regisztrációt és a megújítást én intézem." },
  { Icon: IconKey, title: "Technikai teendők", copy: "Előfizetésnél nincs Vercel-, Supabase- vagy tárhelyfiók: minden infrastruktúrát a ProjectEdge kezel." },
  // A logótervezés a briefben csak egyszeri projektnél kérhető (ott van ajánlat,
  // amiben tételként szerepelhet). Bérlésnél nincs ajánlati kör, ezért ott
  // szöveges (wordmark) logót készítek a márkanévből — ezt itt is kimondjuk,
  // különben az ár olyasmit ígérne, amit a brief nem tud befogadni.
  { Icon: IconShapes, title: "Logó", copy: `Lehetőleg vektoros (ai/svg/pdf). Ha nincs: bérlésnél letisztult szöveges logót készítek a márkanévből, felár nélkül. Egyszeri projektnél kérhetsz teljes logótervezést ${formatHuf(LOGO_DESIGN_PRICE)} egyszeri felárért, ami az ajánlatban külön tételként szerepel.` },
  { Icon: IconDroplet, title: "Színek, betűtípus", copy: "Ha van márkaszíned vagy betűtípusod, jelezd. Ha nincs, rám bízhatod." },
  { Icon: IconPen, title: "Szövegek", copy: "A szövegeket az ár tartalmazza — vázlatból megírom. Ha te írod, azt is szívesen átveszem." },
  { Icon: IconCamera, title: "Képek", copy: "Saját fotók sokat dobnak az oldalon. Ha nincs, stock képpel és segítséggel megoldom." },
  { Icon: IconLink, title: "Közösségi linkek", copy: "Facebook, Instagram, LinkedIn, Google Cégprofil — amit ki szeretnél tenni." },
  { Icon: IconPhone, title: "Kapcsolat", copy: "A megjelenő email és telefonszám, ahol az ügyfeleid elérnek." },
  { Icon: IconBarChart, title: "Analytics", copy: "Ha van Google Analytics a régi oldalon, a hozzáférés segít megérteni a számokat. Ha nincs, beállítom." },
  { Icon: IconReceipt, title: "Számlázási adatok", copy: "A szerződéshez és a számlához: cégnév, adószám, székhely — vagy magánszemély adatai." }
];

export default function ServicesPage() {
  return (
    <main className="site-shell light-page">
      <SiteNav />
      <section className="page-hero compact">
        <p className="micro-label dark">Szolgáltatások</p>
        <h1>Annyit építek, amennyi kell.</h1>
        <p>
          A weboldalt bérled: havidíjat fizetsz, én pedig megépítem és üzemeltetem — a domaintől a
          karbantartásig mindent én intézek, induló díj nélkül. Ha egy idő után a sajátod lenne,
          bármikor kivásárolhatod, és akkor a forráskódot is átadom. Meglévő oldal átalakítása és
          webapp nem bérelhető: azok egyszeri, egyedi projektek.
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

      <section className="solutions-section">
        <div className="solutions-head">
          <p className="micro-label dark">Megoldás minden helyzetre</p>
          <h2>Megnézem, hol tartasz — és pontosan azt ajánlom, ami kell.</h2>
          <p>
            Nem akarlak rábeszélni egy összetett rendszerre, ha egy jól felépített landing is elég.
            Először a használati módot választod ki, utána pontosan azt a csomagot, amire szükséged van.
          </p>
        </div>
        <div className="solutions-grid">
          {solutions.map((item) => (
            <article className="solution-card" key={item.type}>
              <h3>{item.type}</h3>
              <p className="solution-who">{item.who}</p>
              <div className="solution-stack">
                <span>Mit használok</span>
                <p>{item.stack}</p>
              </div>
            </article>
          ))}
        </div>

        <PriceEstimator />

        <div className="special-cases">
          {specialCases.map(([title, copy, price]) => (
            <div className="special-case-row" key={title}>
              <div>
                <strong>{title}</strong>
                <span>{copy}</span>
              </div>
              <b>{price}</b>
            </div>
          ))}
        </div>

        <p className="solutions-note">
          A bérlés első hónapja előre fizetendő. Hűségidő nincs, bármikor lemondható vagy
          szüneteltethető.
        </p>
      </section>

      <section className="bring-section">
        <div className="bring-head">
          <p className="micro-label dark">Mit hozz magaddal</p>
          <h2>Ezeket kérdezem meg induláskor.</h2>
          <p>
            A projektindító adatlap kitöltésekor ezekre kérdezek rá — de nyugodtan kezdj neki akkor is, ha még nincs
            meg minden. Amit nem tudsz, később pótolható, és sok mindenben segítek.
          </p>
        </div>
        <div className="bring-grid">
          {bring.map(({ Icon, title, copy }, index) => (
            <div className="bring-item" key={title} style={{ animationDelay: `${(index % 5) * 60}ms` }}>
              <span className="bring-icon" aria-hidden="true"><Icon /></span>
              <div>
                <strong>{title}</strong>
                <span>{copy}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2>Kezdjük egy rövid adatlappal.</h2>
        <TransitionLink className="button primary" href="/ugyfelkapu">
          Projektet indítok
        </TransitionLink>
      </section>
    </main>
  );
}
