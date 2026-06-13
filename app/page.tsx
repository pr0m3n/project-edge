import { QuoteForm } from "@/components/QuoteForm";

const services = [
  {
    title: "Prémium weboldal készítés",
    copy: "Egyedi, gyors és konverzióra tervezett weboldal, ami nem csak jól néz ki, hanem üzleti célhoz igazodik."
  },
  {
    title: "Ajánlatkérő és lead rendszer",
    copy: "Többlépcsős űrlap, Supabase adatbázis, státuszkezelés és admin nézet, hogy egy érdeklődő se vesszen el."
  },
  {
    title: "Admin felületek",
    copy: "Ügyfelek, projektek, státuszok és tartalmak kezelése egy zárt, letisztult dashboardból."
  },
  {
    title: "Redesign és növekedés",
    copy: "Meglévő weboldalak újrapozicionálása prémiumabb vizuális nyelvvel, jobb tartalommal és gyorsabb technológiával."
  }
];

const steps = [
  ["01", "Irány", "Megértjük, mit kell eladnia az oldalnak, kinek szól, és milyen bizalmi akadályokat kell lebontania."],
  ["02", "Rendszer", "Oldaltérkép, ajánlatkérő logika, lead státuszok és admin működés még design előtt."],
  ["03", "Élmény", "Egyedi vizuális irány, reszponzív komponensek, gyors betöltés és erős márkaérzet."],
  ["04", "Indítás", "Vercel deploy, Supabase bekötés, domain, analitika és finomhangolás az első leadek alapján."]
];

export default function Home() {
  return (
    <main className="site-shell">
      <nav className="nav">
        <a className="brand" href="#top" aria-label="ProjectEdge főoldal">
          <span className="brand-mark" />
          <span>ProjectEdge</span>
        </a>
        <div className="nav-links" aria-label="Fő navigáció">
          <a href="#services">Szolgáltatások</a>
          <a href="#process">Folyamat</a>
          <a href="#work">Munkák</a>
          <a href="#quote">Ajánlatkérés</a>
        </div>
        <div className="nav-actions">
          <a className="button ghost" href="/admin">Admin</a>
          <a className="button primary" href="#quote">Kezdjük el</a>
        </div>
      </nav>

      <section className="hero section" id="top">
        <div className="hero-inner">
          <div>
            <p className="eyebrow">Weboldalak komoly vállalkozói háttérrel</p>
            <h1>ProjectEdge építi a következő digitális előnyöd.</h1>
            <p className="hero-copy">
              Prémium weboldal, ajánlatkérő rendszer és lead-kezelő admin egyben. Nem csak
              arculatot kapsz, hanem egy működő ügyfélszerző rendszert, amit később tovább lehet
              automatizálni.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#quote">Ajánlatot kérek</a>
              <a className="button secondary" href="#services">Mit építünk?</a>
            </div>
          </div>
          <aside className="hero-proof" aria-label="ProjectEdge fókuszok">
            <div className="proof-row">
              <strong>01</strong>
              <span>Stratégia, design és fejlesztés egy kézben</span>
            </div>
            <div className="proof-row">
              <strong>48h</strong>
              <span>Átlátható első válasz és projektirány</span>
            </div>
            <div className="proof-row">
              <strong>CRM-ready</strong>
              <span>Supabase alapú lead és admin rendszer</span>
            </div>
          </aside>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <span>Weboldal készítés / Lead rendszer / Admin dashboard / Vercel / Supabase /</span>
        <span>Weboldal készítés / Lead rendszer / Admin dashboard / Vercel / Supabase /</span>
      </div>

      <section className="section" id="services">
        <div className="split">
          <div>
            <p className="section-kicker">Szolgáltatások</p>
            <h2 className="section-title">Nem weboldalt adok át, hanem üzleti felületet.</h2>
            <p className="section-copy">
              A ProjectEdge olyan vállalkozásoknak készül, akik nem egy olcsó sablont keresnek,
              hanem egy gyors, komoly, mérhető és később bővíthető digitális alapot.
            </p>
          </div>
          <div className="service-grid">
            {services.map((service, index) => (
              <article className="service-item" key={service.title}>
                <div className="service-top">
                  <h3>{service.title}</h3>
                  <span className="service-number">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <p>{service.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section dark-band" id="process">
        <div className="split">
          <div>
            <p className="section-kicker">Folyamat</p>
            <h2 className="section-title">Rendszerben gondolkodunk az első beszélgetéstől.</h2>
          </div>
          <p className="section-copy">
            A jó oldal nem a színeknél kezdődik. A jó oldal tudja, kit kell meggyőznie, milyen
            döntési pontokon, és mi történik azután, hogy valaki elküldi az ajánlatkérést.
          </p>
        </div>
        <div className="process">
          {steps.map(([number, title, copy]) => (
            <article className="process-step" key={number}>
              <strong>{number}</strong>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section portfolio-band" id="work">
        <div className="split">
          <div>
            <p className="section-kicker">Munkák</p>
            <h2 className="section-title">A régi ProjectEdge is portfólióértékké válhat.</h2>
          </div>
          <p className="section-copy">
            A korábbi trading platform nem vész el. Később esettanulmányként mutathatja meg, hogy
            tudsz komplexebb, adatvezérelt webes terméket is építeni.
          </p>
        </div>
        <div className="work-grid">
          <article className="work-feature">
            <p className="eyebrow">Kiemelt case study alap</p>
            <h3>ProjectEdge platformból prémium webes márka.</h3>
            <p>
              A domain új főszerepet kap, a korábbi termék pedig bizonyítékként megmarad:
              stratégia, adatbázis, felhasználói felület és éles deploy tapasztalat.
            </p>
          </article>
          <div className="work-list">
            <article className="work-mini">
              <span>Landing</span>
              <h3>Gyors kampányoldalak</h3>
              <p>Ajánlatra, szolgáltatásra vagy validációra optimalizált oldalak.</p>
            </article>
            <article className="work-mini">
              <span>Business</span>
              <h3>Céges weboldalak</h3>
              <p>Prémium első benyomás, bizalomépítő tartalom és tiszta CTA-k.</p>
            </article>
            <article className="work-mini">
              <span>System</span>
              <h3>Admin és CRM alapok</h3>
              <p>Leadek, ügyfelek, projektek és státuszok egy saját felületen.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="section quote-section" id="quote">
        <div className="quote-shell">
          <div>
            <p className="section-kicker">Ajánlatkérés</p>
            <h2 className="section-title">Írd le, mit építsünk. A rendszer már fogadja.</h2>
            <p className="section-copy">
              A beküldések Supabase-be kerülnek, az admin felületen státuszt kaphatnak, és később
              ügyféllé vagy projektté alakíthatók.
            </p>
          </div>
          <QuoteForm />
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <a className="brand" href="#top">
            <span className="brand-mark" />
            <span>ProjectEdge</span>
          </a>
          <p>Premium weboldalak, lead rendszerek és admin felületek.</p>
        </div>
      </footer>
    </main>
  );
}
