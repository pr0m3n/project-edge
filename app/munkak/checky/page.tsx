import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SiteNav } from "@/components/SiteNav";

export const metadata: Metadata = {
  title: "Checky.hu projektbemutató | ProjectEdge",
  description:
    "A Checky.hu tervezése és fejlesztése: partnerkeresés, foglalás, üzenetküldés, átvizsgálási jelentés, fizetés és adminfelület.",
  alternates: { canonical: "/munkak/checky" }
};

const productAreas = [
  {
    number: "01",
    title: "Szakértő keresése",
    copy: "A látogató megadja, hol van az autó, majd listán és térképen is megnézheti a közelben elérhető átvizsgálókat.",
    items: ["Keresés település és szolgáltatás alapján", "Lista és térkép", "Rendezés ár és értékelés szerint"]
  },
  {
    number: "02",
    title: "Profilok és csomagok",
    copy: "Minden szakértőnek saját adatlapja van. Itt látható a bemutatkozása, az árai, a kiszállási területe és a korábbi értékelései.",
    items: ["Csomagok és előre látható árak", "Kedvencek mentése", "Műhelyes vagy helyszíni átvizsgálás"]
  },
  {
    number: "03",
    title: "Üzenet és foglalás",
    copy: "A vásárló írhat a kiválasztott szakértőnek, majd elküldheti az autó adatait, a helyszínt és azt is, mikorra szeretne időpontot.",
    items: ["Beépített üzenetküldés", "Követhető foglalási állapot", "Értesítések a fontos változásokról"]
  },
  {
    number: "04",
    title: "Jelentés az átvizsgálásról",
    copy: "A vizsgálat után a szakértő leírja, mit talált. Az összefoglaló mellé hibákat, megjegyzéseket, fényképeket és dokumentumokat is csatolhat.",
    items: ["Átlátható digitális jelentés", "Fényképek és PDF-ek", "Értékelés csak lezárt munka után"]
  },
  {
    number: "05",
    title: "Partner- és adminfelület",
    copy: "A partnerek külön felületen kezelik a profiljukat és a munkáikat. Az adminoldalon a felhasználók, foglalások, pénzügyek és ügyfélszolgálati kérések is áttekinthetők.",
    items: ["SimplePay fizetés és kredit", "Pénzügyek és műveleti napló", "Ügyfélszolgálat és tartalomkezelés"]
  }
];

const featureGroups = [
  { label: "KERESÉS", title: "Lista, térkép és szűrés", copy: "A látogató hely, csomag, kiszállási terület és értékelés alapján kereshet szakértőt." },
  { label: "ÉRTÉKELÉS", title: "Vélemények valódi munkák után", copy: "Értékelést az küldhet, akinek a foglalása a Checkyn keresztül lezárult." },
  { label: "KAPCSOLAT", title: "Üzenetek és értesítések", copy: "A felek az oldalon belül beszélhetik meg a vizsgálat részleteit." },
  { label: "FOGLALÁS", title: "Követhető állapotok", copy: "Az igény elküldésétől a lemondásig vagy lezárásig minden fontos változás látható." },
  { label: "JELENTÉS", title: "Az eredmény írásban is megmarad", copy: "A vásárló összefoglalót, tételes megjegyzéseket, képeket és dokumentumokat kap." },
  { label: "PARTNEREK", title: "Saját kezelőfelület", copy: "A szakértő itt állítja be a profilját, csomagjait, kiszállási területét és kezeli a munkáit." },
  { label: "FIZETÉS", title: "SimplePay és kredit", copy: "Külön folyamat készült a kreditfeltöltéshez, a lead díjhoz és a PRO-csomaghoz." },
  { label: "ADMIN", title: "Minden fontos adat elérhető", copy: "Külön oldalon kezelhetők a felhasználók, foglalások, pénzügyek, jelentések és ügyfélszolgálati kérések." }
];

const stack = ["Next.js 16", "React 19", "Supabase", "PostgreSQL", "Realtime", "Storage", "SimplePay", "Resend", "Leaflet"];

function ProductVisual({ step }: { step: number }) {
  if (step === 0) {
    return (
      <div className="checky-ui checky-search-ui" aria-hidden="true">
        <div className="checky-ui-bar"><span /><span /><span /><b>checky.hu / keresés</b></div>
        <div className="checky-search-field"><span>⌖</span><strong>Budapest</strong><i>KERESÉS</i></div>
        <div className="checky-map-grid">
          <div className="checky-result-card"><small>★ Értékelések · lezárt munkák</small><strong>Helyszíni autóvizsgálat</strong><span>Csomagár szerint</span></div>
          <div className="checky-map"><i /><i /><i /><i /></div>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="checky-ui checky-profile-ui" aria-hidden="true">
        <div className="checky-ui-bar"><span /><span /><span /><b>partnerprofil</b></div>
        <div className="checky-profile-head"><i>AV</i><div><strong>Autóvizsgáló partner</strong><span>★ Értékelések · partnerprofil</span></div><b>♡</b></div>
        <div className="checky-package-row"><div><small>ALAP</small><strong>Állapotfelmérés</strong></div><b>FIX ÁR</b></div>
        <div className="checky-package-row active"><div><small>TELJES</small><strong>Prémium átvizsgálás</strong></div><b>FIX ÁR</b></div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="checky-ui checky-booking-ui" aria-hidden="true">
        <div className="checky-ui-bar"><span /><span /><span /><b>foglalás és chat</b></div>
        <div className="checky-chat"><p>Szia! A hirdetés linkjét is elküldhetem?</p><p>Igen, utána egyeztetjük a helyszínt.</p></div>
        <div className="checky-booking-summary"><div><small>AUTÓ</small><strong>Volkswagen Golf VII</strong></div><div><small>MIKOR</small><strong>Ezen a héten</strong></div></div>
        <div className="checky-booking-status">FOGLALÁSI IGÉNY ELKÜLDVE <span>✓</span></div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="checky-ui checky-report-ui" aria-hidden="true">
        <div className="checky-ui-bar"><span /><span /><span /><b>átvizsgálási jelentés</b></div>
        <div className="checky-report-head"><div><small>ÖSSZEGZÉS</small><strong>Feltétellel ajánlott</strong></div><i>!</i></div>
        <ul><li><b>FUTÓMŰ</b><span>Első gumiperselyek kopottak.</span><em>FIGYELEM</em></li><li><b>MOTOR</b><span>Egyenletes járás, szivárgás nélkül.</span><em>RENDBEN</em></li><li><b>KAROSSZÉRIA</b><span>Korábbi javítás nyoma látható.</span><em>INFO</em></li></ul>
      </div>
    );
  }

  return (
    <div className="checky-ui checky-admin-ui" aria-hidden="true">
      <div className="checky-admin-nav"><strong>CHECKY / ADMIN</strong>{["Áttekintés", "Felhasználók", "Foglalások", "Pénzügyek", "Support"].map((item, index) => <span className={index === 0 ? "active" : ""} key={item}>{item}</span>)}</div>
      <div className="checky-admin-main"><small>MAI ÁTTEKINTÉS</small><div className="checky-admin-stats"><article><span>Aktív folyamatok</span><strong>—</strong></article><article><span>Nyitott ügyek</span><strong>—</strong></article></div><div className="checky-admin-chart"><i /><i /><i /><i /><i /><i /></div></div>
    </div>
  );
}

export default function CheckyProjectPage() {
  return (
    <main className="site-shell light-page checky-project-page">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: "Checky.hu full-stack projektbemutató",
        creator: { "@id": "https://www.projectedge.hu/#business" },
        url: "https://www.projectedge.hu/munkak/checky",
        mainEntityOfPage: "https://www.projectedge.hu/munkak/checky",
        description: "A Checky.hu felületeinek és működésének részletes bemutatása."
      }} />
      <SiteNav />

      <section className="checky-project-hero">
        <div className="checky-hero-orb orb-one" aria-hidden="true" />
        <div className="checky-hero-orb orb-two" aria-hidden="true" />
        <div className="checky-hero-copy">
          <p className="checky-kicker"><span>Éles digitális termék</span><i /> CHECKY.HU</p>
          <h1>Így készült<br /><em>a Checky.</em></h1>
          <p className="checky-hero-lead">A Checkyn azok találhatnak autóátvizsgáló szakértőt, akik használt autó vásárlása előtt állnak. Én készítettem az oldal felépítését, a megjelenését és a mögötte működő teljes technikai részt is.</p>
          <div className="checky-hero-actions">
            <a className="button primary" href="https://checky.hu" rel="noreferrer" target="_blank">Élő rendszer megnyitása ↗</a>
            <a className="checky-text-link" href="#hogyan-epult">Így működik <span>↓</span></a>
          </div>
          <div className="checky-hero-scope"><span>TERVEZÉS</span><span>MEGJELENÉS</span><span>FRONTEND</span><span>BACKEND</span><span>AUTOMATIZÁLÁS</span></div>
        </div>
        <div className="checky-hero-stage">
          <div className="checky-window-label"><span>01 / ÉLŐ FELÜLET</span><b>checky.hu</b></div>
          <div className="checky-browser-frame">
            <div className="checky-browser-top"><i /><i /><i /><span>checky.hu</span></div>
            <div className="checky-hero-image"><Image alt="A Checky.hu éles webes felülete" fetchPriority="high" fill loading="eager" sizes="(max-width: 900px) calc(100vw - 36px), 49vw" src="/work/checky.png" /></div>
          </div>
          <div className="checky-floating-note note-one"><span>01</span><strong>HELYALAPÚ<br />PARTNERKERESÉS</strong></div>
          <div className="checky-floating-note note-two"><i /><span>FULL-STACK<br />RENDSZER</span></div>
        </div>
      </section>

      <section className="checky-scope-strip" aria-label="A projekt terjedelme">
        <p>AMI ELKÉSZÜLT</p>
        <div><span>Vásárlói felület</span><i>→</i><span>Partneri munkatér</span><i>→</i><span>Adminisztráció</span><i>→</i><span>Fizetés és értesítés</span></div>
      </section>

      <section className="checky-project-context">
        <div><p className="micro-label">Az alapötlet</p><h2>Legyen könnyebb átvizsgálót választani.</h2></div>
        <div className="checky-context-copy"><p>Használt autó vásárlása előtt sokan külön-külön keresik fel a szakértőket, majd telefonon próbálják kideríteni az árakat és a szabad időpontokat. A Checky ezt teszi átláthatóbbá: egy helyen lehet keresni, összehasonlítani, írni a partnernek és foglalást indítani.</p><aside><span>EZ VOLT A FŐ CÉL</span><strong>A látogató gyorsan értse meg, kit választhat, mennyibe kerül a vizsgálat, és hogyan tud időpontot kérni.</strong></aside></div>
      </section>

      <section className="checky-journey" id="hogyan-epult">
        <header><p className="micro-label dark">Hogyan működik?</p><h2>A kereséstől<br /><span>a lezárt átvizsgálásig.</span></h2><p>Az alábbi öt lépésben végigmutatom, mit lát a vásárló, mit kezel a szakértő, és mi történik a háttérben.</p></header>
        <div className="checky-story-list">
          {productAreas.map((area, index) => (
            <article className="checky-story-step" key={area.number}>
              <div className="checky-story-copy"><span>{area.number}</span><p>FOLYAMAT</p><h3>{area.title}</h3><p>{area.copy}</p><ul>{area.items.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <ProductVisual step={index} />
            </article>
          ))}
        </div>
      </section>

      <section className="checky-product-tour">
        <div className="checky-tour-copy"><p className="micro-label">A háttérben</p><h2>A legtöbb munka nem látszik elsőre.</h2><p>A nyilvános oldalon egyszerű a folyamat, de ehhez külön vásárlói, partneri és admin jogosultságok, foglalási állapotok, fizetések és automatikus értesítések kellettek.</p><a className="checky-text-link dark" href="https://checky.hu" rel="noreferrer" target="_blank">Nézd meg az élő oldalt <span>↗</span></a></div>
        <div className="checky-tour-shot"><div className="checky-browser-top"><i /><i /><i /><span>Élő termékfelület</span></div><div><Image alt="Checky.hu felület részlete" fill sizes="(max-width: 900px) calc(100vw - 36px), 58vw" src="/work/checky.png" /></div></div>
      </section>

      <section className="checky-feature-section">
        <header><p className="micro-label dark">Főbb funkciók</p><h2>Ezeket tudja<br />a Checky.</h2></header>
        <div className="checky-feature-grid">{featureGroups.map((feature, index) => <article className="checky-feature-card" key={feature.title}><div><span>{String(index + 1).padStart(2, "0")}</span><i /></div><small>{feature.label}</small><h3>{feature.title}</h3><p>{feature.copy}</p></article>)}</div>
      </section>

      <section className="checky-architecture">
        <header><p className="micro-label">Technikai felépítés</p><h2>Így kapcsolódnak össze a részek.</h2><p>A vásárló által elküldött foglalást ugyanabban a rendszerben látja a szakértő és az admin is. Így mindenkinél ugyanaz az aktuális állapot jelenik meg.</p></header>
        <div className="checky-architecture-flow">
          <article><span>01</span><strong>Vásárló</strong><small>keres · választ · foglal</small></article><i>→</i>
          <article className="accent"><span>02</span><strong>Checky mag</strong><small>adat · jogosultság · állapot</small></article><i>→</i>
          <article><span>03</span><strong>Partner</strong><small>egyeztet · vizsgál · lezár</small></article><i>→</i>
          <article><span>04</span><strong>Admin</strong><small>felügyel · kezel · auditál</small></article>
        </div>
        <div className="checky-stack" aria-label="Használt technológiák">{stack.map((item) => <span key={item}>{item}</span>)}</div>
      </section>

      <section className="checky-evidence">
        <article className="checky-evidence-card large"><span>ÉLES OLDAL</span><h3>A Checky használható és nyilvánosan elérhető.</h3><p>Bejelentkezés, adatbázis, jogosultságok, üzenetek és fizetési folyamatok is működnek mögötte.</p></article>
        <article className="checky-evidence-card"><span>TELJES FOLYAMAT</span><h3>A foglalás után is folytatódik.</h3><p>A szakértő kezeli a munkát, elkészíti a jelentést, a vásárló pedig később értékelést írhat.</p></article>
        <article className="checky-evidence-card teal"><span>TOVÁBBFEJLESZTHETŐ</span><h3>Később is bővíthető.</h3><p>Új funkciókat és külső szolgáltatásokat úgy lehet hozzáadni, hogy a meglévő folyamatok megmaradnak.</p></article>
      </section>

      <section className="checky-final-cta">
        <p>HASONLÓ OLDALT SZERETNÉL?</p><h2>Írd le, mire<br /><span>lenne szükséged.</span></h2><p>Az ügyfélkapuban néhány lépésben el tudod küldeni az elképzelésedet. Telefonhívás nem kötelező, mindent meg tudunk beszélni írásban is.</p><div><Link className="button primary" href="/ugyfelkapu">Projekt indítása</Link><Link className="checky-text-link" href="/munkak">További munkák <span>→</span></Link></div>
      </section>
    </main>
  );
}
