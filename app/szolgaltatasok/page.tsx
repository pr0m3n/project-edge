import type { ReactElement } from "react";
import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { PriceEstimator } from "@/components/PriceEstimator";
import { BuildTower } from "@/components/BuildTower";
import { SolutionBranches, type Branch } from "@/components/SolutionBranches";
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
  ["Meglévő oldal felújítása", "A régi oldal nem akadály, hanem kiindulás: a tartalmat áthozom, és ugyanúgy bérelt oldalként épül újra."]
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
    type: "Már van oldalad, de nem hoz ügyfelet",
    who: "Van működő oldalad, de lassú, elavult vagy nem érkezik rajta megkeresés.",
    stack: "Új oldal épül a helyére, a tartalmat áthozom — ugyanabban a havidíjas konstrukcióban, mint bármelyik új oldal. A domainedet megtartod."
  },
  {
    type: "Egyedi rendszer, ügyfélkapu, admin",
    who: "Belépés, adatkezelés, dashboard, foglalás, automatizált folyamatok kellenek.",
    stack: "Egyedi webapp — Next.js + Supabase (adatbázis, belépés, jogosultság) + Vercel. Pont ilyen a ProjectEdge ügyfélkapu is."
  }
];

// A négy megoldás és a két különleges eset a látogató kiindulási helyzete
// szerint van ágakba rendezve. Korábban mind a hat egyetlen, 4100 pixel magas
// szekcióban állt egymás alatt — mindenki elolvasta a másik háromnak szólót is.
const branches: Branch[] = [
  {
    id: "uj",
    label: "Még nincs oldalam",
    hint: "Most indulok, vagy nincs online jelenlétem",
    cards: [solutions[0], solutions[1]],
    extras: []
  },
  {
    id: "van",
    label: "Van, de nem hoz ügyfelet",
    hint: "Ugyanaz a havidíjas konstrukció — a régi oldal csak a kiindulás",
    cards: [solutions[2]],
    extras: [
      {
        title: "Meglévő oldal gondozása (nem tőlem származó oldalra)",
        copy: "Már van egy működő oldalad mástól, és kell valaki, aki figyel rá: frissítés, mentés, mérés, apró javítások, havi riport. Ez NEM a weboldal-bérlés — ott a gondozás már benne van a havidíjban.",
        price: "15 000 – 35 000 Ft / hó"
      }
    ]
  },
  {
    id: "rendszer",
    label: "Egyedi rendszer kell",
    hint: "Belépés, adatbázis, ügyfélkapu — ez az egyetlen, amit nem lehet bérelni",
    cards: [solutions[3]],
    extras: [],
    // Egy webapp nem termék, hanem megbízás: nem űrlapon rendelik meg, hanem
    // beszélgetés után. Ezért itt nincs ár és nincs önkiszolgáló brief —
    // csak egy kapcsolatfelvételi kiút, hogy ne versenyezzen a bérléssel.
    talk: {
      title: "Ilyet nem lehet bérelni.",
      copy: "Egy belépéssel, adatbázissal és jogosultságkezeléssel működő rendszer több száz órás munka — ez egyszeri, egyedi fejlesztés, saját ajánlattal. Írd le, mire van szükséged, és átbeszéljük.",
      cta: "Írok róla"
    }
  }
];

const bring: Array<{ Icon: (props: { size?: number }) => ReactElement; title: string; copy: string }> = [
  { Icon: IconGlobe, title: "Vágyott domain", copy: "Írj három névötletet prioritási sorrendben. Előfizetésnél a regisztrációt és a megújítást én intézem." },
  { Icon: IconKey, title: "Technikai teendők", copy: "Előfizetésnél nincs Vercel-, Supabase- vagy tárhelyfiók: minden infrastruktúrát a ProjectEdge kezel." },
  // A logótervezés MINDEN konstrukcióban kérhető — bérlésnél is, mindhárom
  // csomagban. A brief és az ügyfélkapu is így működik; korábban ez az oldal
  // egyedül állította, hogy csak egyszeri projektnél elérhető.
  { Icon: IconShapes, title: "Logó", copy: `Lehetőleg vektoros (ai/svg/pdf). Ha nincs: letisztult szöveges logót készítek a márkanévből, felár nélkül. Teljes logótervezést bármelyik havidíjas csomagnál kérhetsz ${formatHuf(LOGO_DESIGN_PRICE)} egyszeri felárért — a projekt indításakor kapsz rá fizetési adatokat.` },
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
      {/* A hero korábban egy 57 szavas bekezdéssel indult — a részletek
          (kivásárlás, felújítás, egyedi rendszer) lejjebb, a saját águkban vannak. */}
      <section className="page-hero compact hero-with-tower">
        <div>
          <p className="micro-label dark">Szolgáltatások</p>
          <h1>Annyit építek, amennyi kell.</h1>
          <p>
            A weboldalt bérled: havidíjat fizetsz, én pedig megépítem és üzemeltetem. Külön belépési
            díj nincs — az első havidíj indítja a munkát.
          </p>
        </div>
        <BuildTower level={3} />
      </section>

      {/* Korábban öt nagy, váltakozó színű kocka volt, bennük 40 pixeles
          címsorokkal — dobozokként olvasódtak, nem tartalomként. Most egy
          összefüggő lista hajszálvonalakkal, bal oldali sorszámoszloppal. */}
      <section className="service-ledger">
        {services.map(([title, copy], index) => (
          <article className="ledger-row" key={title}>
            <span className="ledger-num">{String(index + 1).padStart(2, "0")}</span>
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
            Válaszd ki, hol tartasz most — és csak a rád tartozó részt olvasd el.
          </p>
        </div>

        <SolutionBranches branches={branches} />

        <PriceEstimator />

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
