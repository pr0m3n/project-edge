import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";

const services = [
  ["Új weboldal", "Ha most indulsz, kapsz egy tiszta, gyors, igényes oldalt. Nem sablonhangulatot, hanem saját arcot."],
  ["Meglévő oldal javítása", "Ha már van weboldalad, megnézem, hol gyenge: szöveg, sebesség, mobilnézet, ügyfélút vagy bizalomépítés."],
  ["Ügyfélkapu és projektindítás", "A megkeresések nem vesznek el emailben: belépés után projekt, ticket és beszélgetési előzmény is egy helyen van."],
  ["Admin háttér", "Egyszerű felület a beérkező ügyfeleknek, státuszoknak, ticketeknek és jegyzeteknek. Később tovább automatizálható."]
];

// Ügyféltípus → megoldás → mire használjuk → kb. ár
const solutions: Array<{
  type: string;
  who: string;
  stack: string;
  price: string;
}> = [
  {
    type: "Most indulsz / kell egy szép bemutatkozó",
    who: "Egyéni vállalkozó, szabadúszó, helyi szolgáltató, aki egy gyors, meggyőző oldalt szeretne.",
    stack: "Egyoldalas vagy néhány aloldalas landing — Next.js + Vercel tárhely. Nincs felesleges rendszer mögötte.",
    price: "150 000 – 300 000 Ft"
  },
  {
    type: "Komoly céges weboldal több aloldallal",
    who: "Működő vállalkozás, aki bizalmat épít, ajánlatot kér és kitűnik a versenytársak közül.",
    stack: "Egyedi prémium oldal — Next.js + Vercel, igény szerint ügyfélkapuval és ajánlatkérő folyamattal.",
    price: "400 000 – 800 000 Ft"
  },
  {
    type: "Már van WordPress oldalad",
    who: "Van működő oldalad, de lassú, elavult vagy nem hoz ügyfelet — vagy csak frissítés kell.",
    stack: "Megnézem, mi van benne. Ha jó az alap, marad a WordPress és csak felújítom. Ha gátol, átültetem modern rendszerre — a tartalmat áthozom.",
    price: "120 000 – 350 000 Ft"
  },
  {
    type: "Webshop kell",
    who: "Terméket vagy szolgáltatást árulnál online, kosárral és fizetéssel.",
    stack: "Bevált webshop-alapra építek (Shopify / WooCommerce) — nem találok fel mindent újra, hogy neked biztonságos és karbantartható maradjon.",
    price: "Egyedi ajánlat"
  },
  {
    type: "Egyedi rendszer, ügyfélkapu, admin",
    who: "Belépés, adatkezelés, dashboard, foglalás, automatizált folyamatok kellenek.",
    stack: "Egyedi webapp — Next.js + Supabase (adatbázis, belépés, jogosultság) + Vercel. Pont ilyen a ProjectEdge ügyfélkapu is.",
    price: "800 000 Ft-tól"
  },
  {
    type: "Folyamatos karbantartás és növekedés",
    who: "Kész oldalad van, de kell, aki figyel rá: frissítés, mérés, apró fejlesztések.",
    stack: "Havi csomag — biztonsági frissítések, mentés, mérés, kisebb módosítások, havi riport.",
    price: "25 000 – 60 000 Ft / hó"
  }
];

const bring = [
  ["Domain", "A weboldal címe (pl. vallalkozas.hu). Ha még nincs, segítek regisztrálni."],
  ["Tárhely-hozzáférés", "Ha van már oldalad vagy domained, a beállításhoz hozzáférés kell — vagy együtt intézzük."],
  ["Logó", "Lehetőleg vektoros (ai/svg/pdf). Ha nincs, kérhetsz logótervezést (külön díjas extra)."],
  ["Színek, betűtípus", "Ha van márkaszíned vagy betűtípusod, jelezd. Ha nincs, rám bízhatod."],
  ["Szövegek", "A szövegeket az ár tartalmazza — vázlatból megírom. Ha te írod, azt is szívesen átveszem."],
  ["Képek", "Saját fotók sokat dobnak az oldalon. Ha nincs, stock képpel és segítséggel megoldom."],
  ["Közösségi linkek", "Facebook, Instagram, LinkedIn, Google Cégprofil — amit ki szeretnél tenni."],
  ["Kapcsolat", "A megjelenő email és telefonszám, ahol az ügyfeleid elérnek."],
  ["Analytics", "Ha van Google Analytics a régi oldalon, a hozzáférés segít megérteni a számokat. Ha nincs, beállítom."],
  ["Számlázási adatok", "A szerződéshez és a számlához: cégnév, adószám, székhely — vagy magánszemély adatai."]
];

export default function ServicesPage() {
  return (
    <main className="site-shell light-page">
      <SiteNav />
      <section className="page-hero compact">
        <p className="micro-label dark">Szolgáltatások</p>
        <h1>Bármilyen vállalkozás vagy, van rá válaszom.</h1>
        <p>
          Van, ahol egy gyors, jól megírt landing elég. Máshol kell ügyfélkapu, admin felület,
          több aloldal vagy teljes újratervezés. Ha van már WordPress oldalad, azt sem dobom ki
          feleslegesen. Először mindig azt tisztázom, neked melyik a jó.
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
            Nem akarlak rábeszélni egy drága rendszerre, ha egy szép landing is elég. Az alábbi
            sávok tájékoztató jellegűek — a pontos árat a brief alapján adom meg.
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
              <div className="solution-price">
                <span>Kb. ár</span>
                <strong>{item.price}</strong>
              </div>
            </article>
          ))}
        </div>
        <p className="solutions-note">
          Az árak tájékoztató jellegűek, bruttó nagyságrendek a magyar piacon. A végleges ajánlat a
          projekt terjedelmétől függ — ezért kezdünk mindig egy rövid brieffel.
        </p>
      </section>

      <section className="bring-section">
        <div className="bring-head">
          <p className="micro-label dark">Mit hozz magaddal</p>
          <h2>Ezeket kérdezem meg induláskor.</h2>
          <p>
            A brief kitöltésekor ezekre kérdezek rá — de nyugodtan kezdj neki akkor is, ha még nincs
            meg minden. Amit nem tudsz, később pótolható, és sok mindenben segítek.
          </p>
        </div>
        <div className="bring-grid">
          {bring.map(([title, copy]) => (
            <div className="bring-item" key={title}>
              <strong>{title}</strong>
              <span>{copy}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2>Ha most kell rendbe rakni az online jelenléted, kezdjük egy rövid igényfelméréssel.</h2>
        <TransitionLink className="button primary" href="/ugyfelkapu">
          Projektet indítok
        </TransitionLink>
      </section>
    </main>
  );
}
