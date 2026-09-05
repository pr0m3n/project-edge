import type { Metadata } from "next";
import Image from "next/image";
import { HeroAurora } from "@/components/HeroAurora";
import { ShaderBackdrop } from "@/components/ShaderBackdrop";
import { ModelViewer } from "@/components/ModelViewer";
import { TransitionLink } from "@/components/TransitionLink";
import { SiteNav } from "@/components/SiteNav";
import { PriceEstimator } from "@/components/PriceEstimator";
import { BriefStage } from "@/components/BriefStage";
import { DeliverStack } from "@/components/DeliverStack";
import { WorkDeck } from "@/components/WorkDeck";
import { AuditRequestSection } from "@/components/AuditRequestSection";
import { PhoneLink } from "@/components/PhoneLink";
import { STUDIO_PHONE_LABEL } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Weboldal készítés vállalkozásoknak | ProjectEdge",
  description: "Egyedi, gyors weboldal készítés 14 900 Ft/hó-tól, külön belépési díj nélkül. Domain, tárhely, email továbbítás és folyamatos karbantartás egyben, rugalmas vételi opcióval.",
  alternates: { canonical: "/" }
};

const paths = [
  {
    href: "/szolgaltatasok",
    eyebrow: "01 / Mit kapsz",
    title: "Weboldal, ami után könnyebb megkeresni téged.",
    copy: "Tiszta ajánlat, jó első benyomás, átgondolt űrlap. Nem kell túlbonyolítani, csak rendesen összerakni."
  },
  {
    href: "/folyamat",
    eyebrow: "02 / Hogyan dolgozom",
    title: "Előbb megértem az ajánlatod, aztán jöhet a látvány.",
    copy: "Rövid egyeztetések, látható haladás, nincs felesleges kör. Mindig tudod, épp min dolgozom."
  },
  {
    href: "/ugyfelkapu",
    eyebrow: "03 / Indítás",
    title: "Indíts projektet saját ügyfél dashboardból.",
    copy: "Belépés után ticketet nyithatsz, projektet indíthatsz, és később visszanézed az összes előzményt."
  }
];

const proof = [
  "Egyedi felépítés",
  "Mobilra tervezve",
  "Mérhető teljesítmény",
  "Frontend + backend egy kézben",
  "Ügyfélkapu és admin háttér",
  "Átlátható projektfolyamat"
];

/* Mind a négy tétel ugyanennek az oldalnak a GYIK-jéből és az árazásából jön —
   szándékosan nincs köztük olyan szám vagy ígéret, ami máshol nem szerepel. */
const deliverables = [
  {
    n: "01",
    title: "Domain, tárhely, email — nálam van.",
    copy:
      "Nem kell szolgáltatókat összevadásznod és számlákat követned. A .hu vagy .com domaint, az SSL-tanúsítványt és a gyors felhőtárhelyet én intézem, ugyanabból a havidíjból.",
    items: [".hu vagy .com domain", "SSL és felhőtárhely", "céges email továbbítás", "automata mentések"]
  },
  {
    n: "02",
    title: "Látod, hol tart, anélkül hogy utánam írogatnál.",
    copy:
      "Az ügyfélkapun belépsz, és ott van, mi készült el és mi jön ezután. Ticketet nyitsz, ha valami kell, és később visszanézed az összes előzményt.",
    items: ["saját ügyfélkapu", "ticketek és előzmények", "kötelező hívás nélkül"]
  },
  {
    n: "03",
    title: "Az élesítést te mondod ki, nem én.",
    copy:
      "A kész oldalt egy privát előnézeti linken kapod meg, és ott kérsz módosítást — annyiszor, ahányszor kell, amíg jó nem lesz. Csak a jóváhagyásod után kerül ki élesbe.",
    items: ["privát előnézeti link", "módosítás, amíg jó nem lesz", "te engeded élesbe"]
  },
  {
    n: "04",
    title: "Bármikor a tiéd lehet az egész.",
    copy:
      "Nincs bezárás: a rögzített vételi opcióval megveheted az oldalt a forráskóddal és a technikai fiókokkal együtt. Az átadás lépésenként megy, írásban.",
    items: ["forráskód és adatbázis", "domain és fiókok", "30 nap hibajavítás az átadás után"]
  }
];

const faqs = [
  [
    "Mennyibe kerül a weboldal?",
    "Menedzselt bérlésben 14 900 Ft/hó-tól indulsz. Külön belépési vagy beállítási díj nincs: az első havidíj indítja a munkát, és a domain, a tárhely meg a karbantartás is benne van ugyanabban az összegben. Ha később a sajátodként szeretnéd a forráskóddal és a technikai fiókokkal együtt, a rögzített vételi opcióval bármikor megvásárolhatod."
  ],
  [
    "Mennyi idő alatt készül el?",
    "A hiánytalan brief, az első havidíj és a szükséges anyagok beérkezésétől számítva a Jelenlét oldal jellemzően 2–4 munkanap, az Üzleti 3–6 munkanap, az Egyedi 5–14 munkanap. Összetett webappnál külön ütemezést adok."
  ],
  [
    "Mi van, ha nem tetszik az irány?",
    "Az élesítés előtt megkapod a kész oldalt egy privát előnézeti linken, és ott kérsz módosítást — annyiszor, ahányszor kell, amíg jó nem lesz. Csak a jóváhagyásod után kerül ki élesbe."
  ],
  [
    "Jár céges email cím a weboldalhoz?",
    "Igen, a domainhez tartozó email címről (pl. info@cegnev.hu) díjmentesen biztosítunk automata email továbbítást a meglévő privát vagy céges fiókodba (pl. Gmail). Ha külön önálló Google Workspace vagy Microsoft 365 postafiókokat szeretnél, annak a beállításában és DNS konfigurációjában is segítünk."
  ],
  [
    "Kell hozzá saját domain és tárhely?",
    "Nem kell semmit külön venned: a .hu vagy .com domaint, az SSL-tanúsítványt és a gyors felhőtárhelyet is intézem a havidíj részeként."
  ],
  [
    "Mi van az élesítés után?",
    "A havidíj tartalmazza a folyamatos technikai felügyeletet, az automata biztonsági mentéseket, a technikai hibák javítását és a csomagodhoz tartozó kisebb tartalmi/design módosításokat. Nagy megbízhatóságú felhőinfrastruktúrán futtatom az oldalt, de százalékos rendelkezésre állást szándékosan nem ígérek: az üzemidő részben olyan harmadik felektől függ, amelyekre nincs ráhatásom. Ha kiesés van, azt díjmentesen és soron kívül kezelem."
  ],
  [
    "Kinél lesznek a hozzáférések és ki fizeti a futtatást?",
    "A domaint, a tárhelyet és a technikai infrastruktúrát én kezelem, neked ezzel nincs adminisztrációs teendőd. Ha egyszer úgy döntesz, hogy kivásárolod az oldalt, a forráskódot és a teljes infrastruktúrát átadom a saját fiókjaidba."
  ]
];

export default function Home() {
  return (
    <main className="site-shell">
      <SiteNav />

      <section className="home-hero">
        {/* A mozgó háttér és a fölötte fekvő fátyol. A fátyol nem dísz: az
            auróra szalagjai vándorolnak, és ha egy világos szalag a cím alá
            ér, a szöveg olvashatatlan lesz. Balra garantálja a kontrasztot,
            jobbra elenged, hogy a makett mögött látszódjon a shader. */}
        <HeroAurora />
        <div className="hero-scrim" aria-hidden="true" />
        <div className="hero-noise" aria-hidden="true" />
        <div className="home-hero-grid">
          <div className="hero-editorial">
            {/* Ez a sor korábban a stúdió önmeghatározása volt („Digital Build
                Studio") — a látogatónak semmit nem mondott. A fizetett forgalom
                viszont a `bemutatkozó weboldal`, `egyedi weboldal`,
                `weboldal tervezés` kifejezésekre érkezik, ezért innentől ez
                visszaigazolja neki, hogy jó helyen jár. A H1 maradhat
                eredmény-központú, nem kell kulcsszót beletuszkolni. */}
            <p className="micro-label">Bemutatkozó és céges weboldal készítés</p>
            {/* A sorok külön <span>-ek, de a szöveges tartalmuk összeragadna
                („Weboldal, amitbérelsz.Én építem…") — pont ezt olvassa ki a
                Google és a képernyőolvasó. A sorvégi szóköz állítja helyre a
                mondatot anélkül, hogy a tördelés változna. */}
            <h1 className="hero-statement">
              <span>Weboldal, ami után </span>
              <span className="hero-accent">megkeresnek. </span>
              <span>Bérelhető — én építem, én üzemeltetem.</span>
            </h1>
            {/* Az ár a heróban: a hirdetésekből érkezők harmada árat keres
                (`weblap árak`, `weboldal árak`, `landing oldal készítés ár`),
                és eddig a csomagokig kellett görgetnie érte. Külön sávban áll,
                nem a bekezdésben, hogy olvasás nélkül is beugorjon. */}
            <p className="hero-price">
              <strong>14 900 Ft</strong>
              <span>/hó-tól</span>
              <em>nincs belépési díj</em>
            </p>
            {/* Itt korábban egy bekezdés állt a domainről, a tárhelyről és a
                karbantartásról. Kivettük: pontosan ezt mondja el lentebb a
                „Domain, tárhely, email — nálam van" blokk, részletesebben. A
                heróban viszont ez volt az egyetlen elem, ami a mozgó
                háttérrel verekedett — hosszú, halvány szöveg mozgó alapon a
                legnehezebben olvasható dolog, ami van. */}
            <div className="hero-command">
              <a className="button primary" href="#arak">Csomagok és árak</a>
              <TransitionLink className="button spectral" href="/munkak">
                Munkáim és demók
              </TransitionLink>
            </div>
            <p className="hero-subhint">
              Vagy kezdd azonnal: <a href="#projektbrief">online projektbrief kitöltése →</a>
            </p>
            {/* A narancs vonal is kikerült. Az auróra fölött már volt egy
                narancs elem túl sok: az ársáv éle, a fő gomb és a vonal
                ugyanazt a színt vitte három helyen. Az ársáv és a gomb
                dolgozik, a vonal csak dísz volt. */}
          </div>
          <div className="hero-system" aria-label="ProjectEdge projektfolyamat előnézet">
            <div className="system-glow" aria-hidden="true" />
            <div className="system-window">
              {/* A körbefutó fény. A kártyán ez az egyetlen folyamatos
                  mozgás, és a KERETEN él — a szöveg mögött semmi nem mozog. */}
              <span aria-hidden="true" className="system-beam"><i /></span>
              <div className="system-window-bar">
                <span /><span /><span />
                <b>projectedge / live build</b>
              </div>
              <div className="system-preview">
                <span className="system-kicker">ÚJ PROJEKT</span>
                <strong>Az ötlettől az éles oldalig.</strong>
                <p>Stratégia, design és fejlesztés egyetlen átlátható folyamatban.</p>
                <i>Projekt indítása →</i>
              </div>
            </div>
            <div className="system-card progress-card">
              <span>Fejlesztés</span>
              <strong>72%</strong>
              <div><i /></div>
            </div>
            <div className="system-card status-card">
              <span className="status-dot" />
              <div><small>KÖVETKEZŐ LÉPÉS</small><strong>Mobilnézet finomítása</strong></div>
            </div>
            {/* A harmadik lebegő kártya („Egy kézben: szöveg, design, kód")
                kikerült: három lebegő elem a makett körül zsúfoltnak
                olvasódott, és ezt az állítást a „Mit kapsz" szakasz úgyis
                kimondja. Kettő maradt, azok viszont látszanak. */}
          </div>
        </div>
      </section>

      <section className="proof-marquee" aria-label="ProjectEdge előnyök">
        <div className="proof-track">
          {[...proof, ...proof].map((item, index) => (
            <span className="proof-pill" key={index}>
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* Ezek szándékosan NEM idézetek: saját vállalások. A korábbi
          blockquote + „szerző" felépítés ügyfélvéleménynek látszott, holott
          nincs mögötte valós referencia. A vállalás-kártyákból viszont nem
          derült ki, mit is kap konkrétan a látogató — ezért lett belőle
          tételes átadási lista. Minden állítás mögött ott áll ugyanennek az
          oldalnak egy GYIK-pontja: nincs köztük új ígéret. */}
      <section className="deliver-section">
        <div className="deliver-intro">
          <p className="micro-label dark">Mire számíthatsz</p>
          <h2>Ezt kapod tőlem.</h2>
          <p>
            Nem ügynökség vagy alvállalkozói lánc: egy ember, aki a tervezéstől az üzemeltetésig
            végigviszi. Ez a négy dolog az, ami ebből neked konkrétan jár.
          </p>
          {/* Ahogy görgetsz a négy tételen, rétegenként összeáll a kész oldal. */}
          <DeliverStack />
        </div>
        <div className="deliver-list">
          {deliverables.map((item) => (
            <article className="deliver-row" key={item.title}>
              <span className="deliver-n">{item.n}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
                <ul className="deliver-items">
                  {item.items.map((entry) => (
                    <li key={entry}>{entry}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* A brief a főoldal egyetlen sötét szakasza. Korábban közvetlenül a heró
          alatt ült, és a két sötét felület úgy csapódott egymásnak, hogy
          telefonon zavaró volt. Innen viszont a látogató már érti, miről van
          szó, mire a feketéhez ér. A heró `#projektbrief` linkje egy
          koppintással továbbra is idehoz. */}
      <BriefStage />

      <section className="price-teaser">
        <div className="section-head">
          <p className="micro-label dark">Árak</p>
          <h2>Menedzselt weboldal, egyetlen fix havidíjért.</h2>
          <p>
            A domaint, a tárhelyet, a karbantartást és a havi módosításokat mind intézem ugyanabból az összegből.
            Ha később a saját tulajdonodba vennéd, a forráskóddal együtt bármikor megvásárolhatod.
          </p>
        </div>
        {/* A saját bevezetője itt kikapcsolva: a fenti section-head már
            ugyanezt mondja el, két azonos „Árak" fejléc egymás alatt volt. */}
        <PriceEstimator showLead={false} />
      </section>

      <WorkDeck />

      <section className="founder-section">
        <div className="founder-card">
          <Image
            alt="Patrik, a ProjectEdge alapítója és fejlesztője"
            className="founder-photo"
            fill
            sizes="(max-width: 880px) calc(100vw - 36px), 42vw"
            src="/profile/patrik.png"
          />
          <span className="founder-photo-tag">{"// Szia, Patrik vagyok."}</span>
          <div className="founder-badge">
            <strong>Patrik</strong>
            <span>alapító · fejlesztő · ProjectEdge</span>
          </div>
        </div>
        <div className="founder-copy">
          <p className="micro-label dark">Ki vagyok</p>
          <h2>Egy ember, aki végigviszi a projektedet.</h2>
          <p>
            Nem ügynökség vagyok, hanem egy fejlesztő, aki a tervezéstől a kódig és az indításig
            mindent maga csinál. Nálad nem lesz kihez passzolgatni a felelősséget — velem beszélsz,
            én építem, és én is felelek érte.
          </p>
          <div className="founder-tags">
            <span>Next.js</span>
            <span>Supabase</span>
            <span>Full-stack</span>
            <span>3D / Motion</span>
            <span>UI/UX</span>
          </div>
        </div>
      </section>

      <section className="orbit-section">
        {/* A „mindent egy kézben" üzenetet a fenti founder-szekció mondja ki;
            itt már csak az érdekel, mi történik a start és az élesítés között. */}
        <div className="orbit-copy">
          <p className="micro-label">Folyamat / lépésről lépésre</p>
          <h2>Mi történik az indulás és az élesítés között?</h2>
          <p>
            Nem kell külön tervezőt, fejlesztőt és technikai kapcsolattartót összehangolnod, ezért
            gyorsabbak a döntések és kevesebb részlet vész el útközben. Három szakasz van, és
            mindegyik végén látod, hol tart az oldalad.
          </p>
          <ul className="orbit-facts">
            <li>Struktúra és vizuális tervezés</li>
            <li>Fejlesztés és rendszerkapcsolatok</li>
            <li>Mobilos finomhangolás és élesítés</li>
          </ul>
          <TransitionLink className="button spectral" href="/folyamat">
            Megnézem, hogyan dolgozol
          </TransitionLink>
        </div>
        <div className="planet-stage">
          <ModelViewer
            alt="A teljes projektfolyamatot jelképező pixelbolygó"
            className="model-frame planet-model"
            exposure="0.9"
            src="/models/pixel_planet_trappist-1-e.glb"
          />
          <span className="orbit-line one" />
          <span className="orbit-line two" />
        </div>
      </section>

      <section className="no-call">
        <ShaderBackdrop variant="halftone" />
        <div className="no-call-scrim" aria-hidden="true" />
        <div>
          <p className="micro-label">Ügyfélkapu & Egyeztetés</p>
          <h2>Nem kötelező telefonálnod.</h2>
          <p className="nc-copy">
            Az ügyfélkapun elindítod a projektet, követed a haladást, fizetsz és kérdezel — amikor
            neked kényelmes. A teljes folyamat zökkenőmentesen végigvihető írásban, kötelező értekezletek
            nélkül, de ha telefonon vagy online megbeszélésen egyeztetnél, természetesen állok rendelkezésedre.
          </p>
          <TransitionLink className="button primary" href="/ugyfelkapu">
            Indítás az ügyfélkapun
          </TransitionLink>
          {/* A szakasz eddig azzal zárult, hogy „ha telefonon egyeztetnél,
              állok rendelkezésedre" — csak épp nem volt mit hívni. */}
          <p className="nc-phone">
            Ha mégis inkább telefonálnál: <PhoneLink>{STUDIO_PHONE_LABEL}</PhoneLink>
          </p>
        </div>
        <ul className="nc-list">
          <li>Teljes folyamat írásban — vagy igény szerint gyors hívással</li>
          <li>Adatlap, státusz és fizetés egy helyen</li>
          <li>Közvetlen segítség és válaszok az ügyfélkapun</li>
        </ul>
      </section>

      <section className="faq-section">
        <div className="section-head">
          <p className="micro-label dark">GYIK</p>
          <h2>A leggyakoribb kérdések.</h2>
        </div>
        <div className="faq-list">
          {faqs.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <AuditRequestSection />

      {/* Kivezető linkek szándékosan a lap végén: a funnel közepén elvitték
          a fizetett forgalmat az árak és a brief elől. */}
      <section className="route-section">
        <div className="route-intro">
          <p className="micro-label dark">Hova tovább?</p>
          <h2>Mi érdekel?</h2>
        </div>
        <div className="route-grid">
          {paths.map((path) => (
            <TransitionLink className="route-tile" href={path.href} key={path.href}>
              <span>{path.eyebrow}</span>
              <h3>{path.title}</h3>
              <p>{path.copy}</p>
              <strong>Megnyitás</strong>
            </TransitionLink>
          ))}
        </div>
      </section>

      <section className="manifesto">
        <ShaderBackdrop variant="shadow" />
        <div>
          <p>Design</p>
          <p>rendszer</p>
          <p>adat</p>
          <p>konverzió</p>
        </div>
        <article>
          <span>Röviden</span>
          <h2>A jó weboldal nem magyarázkodik. Tisztán vezet tovább.</h2>
          <TransitionLink className="button secondary" href="/folyamat">
            Nézd meg a folyamatot
          </TransitionLink>
        </article>
      </section>
    </main>
  );
}
