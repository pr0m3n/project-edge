import Link from "next/link";
import { Newsletter } from "./Newsletter";
import { ProductGrid } from "./ProductGrid";
import { ZamatHero } from "./ZamatHero";
import { RoastLog } from "./RoastLog";
import { COMMODITY_PRICE, formatFt, products } from "./data";

const faqs = [
  {
    q: "Mennyi idő alatt érkezik?",
    a: "A pörkölést követő munkanapon adjuk fel, 1–2 munkanap a kézbesítés. 15 000 Ft felett ingyenes."
  },
  {
    q: "Szemes vagy őrölt?",
    a: "Ha van darálód, mindig szemest válassz. Ha nincs, a rendelésnél megadhatod, milyen főzési módhoz őröljük."
  },
  {
    q: "Meddig friss a kávé?",
    a: "A pörkölés utáni 4–20. napon a legjobb. Bontatlanul, hűvös helyen 3 hónapig tartja a karakterét."
  },
  {
    q: "Mit jelent a „kivétel” a zacskón?",
    a: "Azt, hogy a pörkölés hányadik percében és milyen babhőmérsékletnél öntöttük ki a kávét a dobból. Minél később, annál sötétebb és testesebb."
  }
];

const producers = products.filter((product) => product.paid);
const maxPaid = Math.max(...producers.map((product) => product.paid ?? 0));

export default function ZamatHome() {
  return (
    <main>
      <ZamatHero />

      <section className="zm-section" id="kavek">
        <div className="zm-section-head">
          <h2>Most kapható</h2>
          <p>
            Hat tétel, mind az elmúlt két hétben pörkölve. A kivétel ideje és hőmérséklete ott van minden zacskón, ahogy a
            termelő neve is.
          </p>
        </div>
        <ProductGrid />
      </section>

      <section className="zm-subscribe" id="elofizetes">
        <div className="zm-subscribe-inner">
          <div>
            <h2>Két hetente friss zacskó, 15%-kal olcsóbban.</h2>
            <p>
              Megmondod, milyen sűrűn és milyen pörkölésűt kérsz, mi pedig a pörkölés napján feladjuk. A szállítás
              ingyenes, és bármikor kihagyhatsz egy kört.
            </p>
            <ul>
              <li>2, 4 vagy 6 hetente</li>
              <li>Fix kedvenc, vagy mindig az aktuális tétel</li>
              <li>Kihagyás és lemondás egy kattintással</li>
            </ul>
            <Link className="zm-btn lg" href="#kavek">
              Előfizetést indítok
            </Link>
          </div>
          <div className="zm-subscribe-card">
            <div className="zm-sub-row">
              <span>Havi csomag · 2 × 250 g</span>
              <strong>8 990 Ft</strong>
            </div>
            <div className="zm-sub-row muted">
              <span>Előfizetői kedvezmény</span>
              <span className="zm-sub-off">−15%</span>
            </div>
            <div className="zm-sub-row muted">
              <span>Szállítás</span>
              <span>Ingyenes</span>
            </div>
            <div className="zm-sub-row total">
              <span>Havonta</span>
              <strong>7 640 Ft</strong>
            </div>
            <p className="zm-sub-note">Nincs kötelező futamidő.</p>
          </div>
        </div>
      </section>

      <section className="zm-section" id="termelok">
        <div className="zm-section-head">
          <h2>Kitől vesszük, és mennyit fizetünk érte.</h2>
          <p>
            A zöld kávé tőzsdei ára ma nagyjából {formatFt(COMMODITY_PRICE)} kilónként. Mi közvetlenül a termelőtől
            vásárolunk, és ennek két-háromszorosát fizetjük. Ez a különbség a csészében is érződik.
          </p>
        </div>
        <ol className="zm-producers">
          {producers.map((product) => (
            <li key={product.slug}>
              <div className="zm-producer-name">
                <strong>{product.producer}</strong>
                <span>
                  {product.farm} · {product.origin.split("·")[0].trim()}
                </span>
              </div>
              <div className="zm-producer-bar" aria-hidden="true">
                <span style={{ width: `${((product.paid ?? 0) / maxPaid) * 100}%` }} />
                <i style={{ left: `${(COMMODITY_PRICE / maxPaid) * 100}%` }} />
              </div>
              <div className="zm-producer-price">
                <strong>{formatFt(product.paid ?? 0)}/kg</strong>
                <span>{((product.paid ?? 0) / COMMODITY_PRICE).toFixed(1).replace(".", ",")}× tőzsdei ár</span>
              </div>
            </li>
          ))}
        </ol>
        <p className="zm-producers-note">
          A függőleges vonal a tőzsdei ár. Kapcsolatban vagyunk minden termelővel, és évente legalább egyiküket
          meglátogatjuk.
        </p>
      </section>

      <section className="zm-section zm-log-section" id="naplo">
        <div className="zm-section-head">
          <h2>Pörkölési napló</h2>
          <p>Az utolsó három pörkölési nap, adagonként. Ha egy tétel elfogy, a következő keddig várni kell rá.</p>
        </div>
        <RoastLog />
      </section>

      <section className="zm-bottom" id="gyik">
        <div className="zm-faq">
          <h2>Gyakori kérdések</h2>
          {faqs.map((faq) => (
            <details key={faq.q}>
              <summary>{faq.q}</summary>
              <p>{faq.a}</p>
            </details>
          ))}
        </div>
        <div className="zm-newsletter">
          <h2>Szólunk, ha új tétel jön.</h2>
          <p>Havonta legfeljebb kétszer írunk. Az első rendelésből 10% jár érte.</p>
          <Newsletter />
        </div>
      </section>
    </main>
  );
}
