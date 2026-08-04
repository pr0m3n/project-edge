import Link from "next/link";
import { BagArt } from "./BagArt";
import { Newsletter } from "./Newsletter";
import { ProductGrid, Stars } from "./ProductGrid";
import { findProduct } from "./data";

const usps = [
  { title: "Heti kétszeri pörkölés", copy: "Kedd és péntek. Amit rendelsz, napokon belül készült." },
  { title: "Ingyenes szállítás", copy: "15 000 Ft felett, országosan, 1–2 munkanap alatt." },
  { title: "Előfizetés −15%", copy: "Válaszd ki a ritmust, mi küldjük. Bármikor szüneteltethető." },
  { title: "Direct trade", copy: "Nyolc termelővel dolgozunk közvetlenül, tisztán fizetett áron." }
];

const reviews = [
  {
    name: "Bálint",
    city: "Szeged",
    rating: 5,
    text: "Két éve rendelek máshonnan, de itt éreztem először, hogy tényleg számít a pörkölési dátum. A Guji egyszerűen más liga."
  },
  {
    name: "Dóra",
    city: "Budapest",
    rating: 5,
    text: "Az előfizetést azért szeretem, mert nem kell gondolkodnom rajta. Jön, amikor kell, és mindig friss."
  },
  {
    name: "Ákos",
    city: "Győr",
    rating: 4,
    text: "A Cerrado a kedvencem espressóba. Egyedül azt hiányolom, hogy a nagyobb kiszerelés néha elfogy."
  }
];

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
    a: "Pörkölés után 2–4 héten belül a legjobb. Bontatlanul, hűvös helyen 3 hónapig tartja a karakterét."
  }
];

export default function ZamatHome() {
  const hero = findProduct("etiopia-guji");
  const second = findProduct("kenya-nyeri");

  return (
    <main>
      {/* ── hero ── */}
      <section className="zm-hero">
        <div className="zm-hero-copy">
          <span className="zm-eyebrow">Budapesti kis tételes pörkölő</span>
          <h1>
            A kávé, amit <em>megjegyzel.</em>
          </h1>
          <p>
            Nyolc termelő, öt származási hely, heti kétszeri pörkölés. Nem tömegárut árulunk, hanem
            konkrét tételeket, konkrét ízekkel — és megmondjuk, mit fogsz érezni a csészében.
          </p>
          <div className="zm-hero-actions">
            <Link className="zm-btn lg" href="#kavek">
              Kávék megnézése
            </Link>
            <Link className="zm-btn ghost lg" href="#elofizetes">
              Előfizetés −15%
            </Link>
          </div>
          <div className="zm-hero-meta">
            <div>
              <Stars value={4.9} />
              <span>4,9 · 638 értékelés</span>
            </div>
            <span className="zm-hero-sep" aria-hidden="true" />
            <span>Ingyenes szállítás 15 000 Ft felett</span>
          </div>
        </div>

        <div className="zm-hero-art">
          <span className="zm-hero-disc" aria-hidden="true" />
          {hero && (
            <Link className="zm-hero-bag main" href={`/demo/zamat/termek/${hero.slug}`}>
              <BagArt product={hero} />
            </Link>
          )}
          {second && (
            <Link className="zm-hero-bag side" href={`/demo/zamat/termek/${second.slug}`}>
              <BagArt product={second} />
            </Link>
          )}
          <div className="zm-hero-tag">
            <strong>Pörkölve</strong>
            <span>2 napja</span>
          </div>
        </div>
      </section>

      {/* ── USP sáv ── */}
      <section className="zm-usps">
        {usps.map((u) => (
          <div className="zm-usp" key={u.title}>
            <strong>{u.title}</strong>
            <span>{u.copy}</span>
          </div>
        ))}
      </section>

      {/* ── termékek ── */}
      <section className="zm-section" id="kavek">
        <div className="zm-section-head">
          <span className="zm-eyebrow">A kínálat</span>
          <h2>Aktuális tételek</h2>
          <p>
            Minden csomagon ott a pörkölési dátum, a származási hely és a főzési ajánlás. Ha
            bizonytalan vagy, kezdd a kóstoló csomaggal.
          </p>
        </div>
        <ProductGrid />
      </section>

      {/* ── előfizetés ── */}
      <section className="zm-subscribe" id="elofizetes">
        <div className="zm-subscribe-inner">
          <div>
            <span className="zm-eyebrow light">Előfizetés</span>
            <h2>Sose fogyj ki a jóból.</h2>
            <p>
              Megmondod, milyen gyakran és milyen karaktert szeretsz — a többit ránk bízod. Minden
              szállítmány 15%-kal olcsóbb, a szállítás ingyenes, és bármikor szüneteltetheted.
            </p>
            <ul>
              <li>2, 4 vagy 6 hetente</li>
              <li>Meglepetés tétel vagy fix kedvenc</li>
              <li>Kihagyás és lemondás egy kattintással</li>
            </ul>
            <Link className="zm-btn light lg" href="#kavek">
              Előfizetés indítása
            </Link>
          </div>
          <div className="zm-subscribe-card">
            <div className="zm-sub-row">
              <span>Havi csomag · 2 × 250 g</span>
              <strong>8990 Ft</strong>
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
              <strong>7640 Ft</strong>
            </div>
            <p className="zm-sub-note">Kötelező futamidő nincs. Bármikor szüneteltethető.</p>
          </div>
        </div>
      </section>

      {/* ── történet ── */}
      <section className="zm-story" id="tortenet">
        <div className="zm-story-copy">
          <span className="zm-eyebrow">A pörkölő</span>
          <h2>Egy 12 kilós dobpörkölő és nagyon sok jegyzetfüzet.</h2>
          <p>
            2019-ben egy garázsban kezdtük, egy használt pörkölővel és azzal a makacs meggyőződéssel,
            hogy a jó kávéhoz nem kell misztikum — csak tiszta alapanyag és következetes munka.
          </p>
          <p>
            Ma nyolc termelővel dolgozunk közvetlenül. Minden tételről leírjuk, kitől érkezett, mit
            fizettünk érte, és hogyan pörköltük. Nem mindenki kíváncsi rá — de aki igen, annak ott
            van.
          </p>
        </div>
        <div className="zm-story-stats">
          <div>
            <strong>2019</strong>
            <span>az első pörkölés</span>
          </div>
          <div>
            <strong>8</strong>
            <span>közvetlen termelő partner</span>
          </div>
          <div>
            <strong>2×</strong>
            <span>pörkölés hetente</span>
          </div>
          <div>
            <strong>14 t</strong>
            <span>kávé tavaly</span>
          </div>
        </div>
      </section>

      {/* ── vélemények ── */}
      <section className="zm-section" id="velemenyek">
        <div className="zm-section-head">
          <span className="zm-eyebrow">Vélemények</span>
          <h2>Mit mondanak a vendégeink</h2>
        </div>
        <div className="zm-reviews">
          {reviews.map((r) => (
            <article className="zm-review" key={r.name}>
              <Stars value={r.rating} />
              <p>{r.text}</p>
              <footer>
                <strong>{r.name}</strong>
                <span>{r.city}</span>
              </footer>
            </article>
          ))}
        </div>
      </section>

      {/* ── GYIK + hírlevél ── */}
      <section className="zm-bottom" id="gyik">
        <div className="zm-faq">
          <h2>Gyakori kérdések</h2>
          {faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <div className="zm-newsletter">
          <h2>10% az első rendelésre</h2>
          <p>
            Iratkozz fel, és szólunk, ha új tétel érkezik. Havonta legfeljebb kétszer írunk, spam
            nélkül.
          </p>
          <Newsletter />
        </div>
      </section>
    </main>
  );
}
