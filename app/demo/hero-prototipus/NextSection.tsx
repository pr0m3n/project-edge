"use client";
import { DeliverStack } from "@/components/DeliverStack";

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


export function NextSection() {
return <div>
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


</div>;
}

