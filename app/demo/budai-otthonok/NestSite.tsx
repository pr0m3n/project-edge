"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DemoBar } from "@/components/demo/DemoBar";
import { useDemoNotice } from "@/components/demo/DemoNotice";
import { homes, type Home } from "./data";
import { MaquetteHero } from "./MaquetteHero";
import { compassLabel, formatDuration, livingIndex, sunMinutes, windowDirections } from "./plan";
import { PlanSketch } from "./PlanSketch";
import { PlanViewer } from "./PlanViewer";

const DISTRICTS = ["Mindegyik", "I. kerület", "II. kerület", "V. kerület", "XII. kerület"];

const sunOf = (home: Home) => {
  const directions = windowDirections(home.plan, livingIndex(home.plan));
  return { directions, minutes: sunMinutes(directions) };
};

const pricePerSqm = (home: Home) => Math.round((home.price * 1000) / home.size).toLocaleString("hu-HU");

function Mark() {
  return (
    <svg aria-hidden="true" className="bo-mark" viewBox="0 0 24 24">
      <path d="M3 21V9l9-6 9 6v12" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 15h18M9 21v-6M15 15V9" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function PropertyModal({ home, saved, onClose, onSave }: { home: Home; saved: boolean; onClose: () => void; onSave: () => void }) {
  const notice = useDemoNotice();
  const [downPayment, setDownPayment] = useState(35);
  const [years, setYears] = useState(20);
  const principal = home.price * 1_000_000 * (1 - downPayment / 100);
  const monthlyRate = 0.069 / 12;
  const months = years * 12;
  const monthly = Math.round((principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1));

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return (
    <div className="bo-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-label={`${home.title} részletes adatlap`} aria-modal="true" className="bo-modal" role="dialog">
        <header className="bo-modal-head">
          <div>
            <p className="bo-meta">
              {home.code} · {home.district}, {home.address} · frissítve {home.updated}
            </p>
            <h2>{home.title}</h2>
          </div>
          <div className="bo-modal-head-actions">
            <button className={`bo-button ghost${saved ? " is-saved" : ""}`} onClick={onSave} type="button">
              {saved ? "Mentve" : "Mentés"}
            </button>
            <button aria-label="Adatlap bezárása" className="bo-close" onClick={onClose} type="button">
              ×
            </button>
          </div>
        </header>

        <dl className="bo-facts">
          <div><dt>Irányár</dt><dd>{home.price} M Ft</dd></div>
          <div><dt>Alapterület</dt><dd>{home.size} m²</dd></div>
          <div><dt>Szobák</dt><dd>{home.rooms}</dd></div>
          <div><dt>Négyzetméterár</dt><dd>{pricePerSqm(home)} e Ft</dd></div>
          <div><dt>Belmagasság</dt><dd>{home.ceiling}</dd></div>
          <div><dt>Energia</dt><dd>{home.energy}</dd></div>
        </dl>

        <div className="bo-modal-body">
          <div className="bo-modal-main">
            <div className="bo-modal-photo">
              <Image alt={`${home.title} — fotó`} fill sizes="(max-width: 980px) 100vw, 62vw" src={home.image} style={{ objectFit: "cover" }} />
            </div>

            <section className="bo-block">
              <div className="bo-block-head">
                <h3>Alaprajz és napfény</h3>
                <p>{home.plan.level} · méretarányos makett, a valós tájolással</p>
              </div>
              <PlanViewer plan={home.plan} />
            </section>

            <section className="bo-block">
              <h3>Leírás</h3>
              <p className="bo-description">{home.description}</p>
              <dl className="bo-table">
                <div><dt>Emelet</dt><dd>{home.floor}</dd></div>
                <div><dt>Kültér</dt><dd>{home.terrace}</dd></div>
                <div><dt>Parkolás</dt><dd>{home.parking}</dd></div>
                <div><dt>Építés éve</dt><dd>{home.built}</dd></div>
              </dl>
              <ul className="bo-tags">
                {home.features.map((feature) => <li key={feature}>{feature}</li>)}
              </ul>
            </section>

            <section className="bo-block">
              <h3>Környék, gyalog</h3>
              <dl className="bo-table">
                {home.nearby.map(([place, time]) => <div key={place}><dt>{place}</dt><dd>{time}</dd></div>)}
              </dl>
            </section>

            <section className="bo-block bo-finance">
              <div>
                <h3>Havi törlesztő</h3>
                <p>Tájékoztató kalkuláció 6,9%-os kamattal. Nem banki ajánlat.</p>
              </div>
              <div className="bo-finance-controls">
                <label>
                  <span>Önerő <b>{downPayment}%</b></span>
                  <input max="70" min="20" onChange={(event) => setDownPayment(Number(event.target.value))} step="5" type="range" value={downPayment} />
                </label>
                <div className="bo-segment" role="group" aria-label="Futamidő">
                  {[10, 20, 30].map((value) => (
                    <button className={years === value ? "is-active" : ""} key={value} onClick={() => setYears(value)} type="button">
                      {value} év
                    </button>
                  ))}
                </div>
                <p className="bo-finance-result">
                  <b>{monthly.toLocaleString("hu-HU")} Ft</b>
                  <span>havonta · hitelösszeg {Math.round(principal / 1_000_000)} M Ft</span>
                </p>
              </div>
            </section>
          </div>

          <aside className="bo-contact">
            <div className="bo-agent">
              <span aria-hidden="true">KB</span>
              <div>
                <b>Kovács Borbála</b>
                <small>az ingatlan referense · +36 30 555 0148</small>
              </div>
            </div>
            <label>Név<input autoComplete="name" placeholder="Teljes név" /></label>
            <label>Email<input autoComplete="email" placeholder="nev@email.hu" type="email" /></label>
            <label>Üzenet<textarea defaultValue={`Érdekel a(z) „${home.title}” (${home.code}).`} /></label>
            <button className="bo-button" onClick={() => notice("Az érdeklődés nem került elküldésre — ez egy interaktív mintaprojekt.")} type="button">
              Megtekintést kérek
            </button>
            <small>Munkanapokon 2 órán belül visszahívunk.</small>
          </aside>
        </div>
      </section>
    </div>
  );
}

export function NestSite() {
  const notice = useDemoNotice();
  const [district, setDistrict] = useState("Mindegyik");
  const [max, setMax] = useState(500);
  const [minRooms, setMinRooms] = useState(0);
  const [sort, setSort] = useState("recommended");
  const [saved, setSaved] = useState<number[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState<Home | null>(null);

  const visible = useMemo(() => {
    const filtered = homes.filter(
      (home) =>
        (district === "Mindegyik" || home.district === district) &&
        home.price <= max &&
        home.rooms >= minRooms &&
        (!savedOnly || saved.includes(home.id))
    );
    return [...filtered].sort((a, b) =>
      sort === "price-asc" ? a.price - b.price : sort === "size-desc" ? b.size - a.size : sort === "sun" ? sunOf(b).minutes - sunOf(a).minutes : a.id - b.id
    );
  }, [district, max, minRooms, savedOnly, saved, sort]);

  const toggle = (id: number) => setSaved((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const toggleSavedView = () => {
    if (!saved.length) return notice("Még nincs mentett ingatlanod. A „Mentés” gombbal tudsz elmenteni egyet.");
    setSavedOnly((current) => !current);
  };
  const reset = () => {
    setDistrict("Mindegyik");
    setMax(500);
    setMinRooms(0);
    setSavedOnly(false);
  };

  return (
    <div className="bo-root" id="top">
      <DemoBar project="Budai Otthonok" />
      <header className="bo-nav">
        <a className="bo-logo" href="#top">
          <Mark />
          Budai Otthonok
        </a>
        <nav aria-label="Fő navigáció">
          <a href="#ingatlanok">Ingatlanok</a>
          <a href="#makett">Makett</a>
          <a href="#eladoknak">Eladóknak</a>
          <a href="#iroda">Iroda</a>
        </nav>
        <button className={`bo-saved${savedOnly ? " is-active" : ""}`} onClick={toggleSavedView} type="button">
          Mentett <span>{saved.length}</span>
        </button>
      </header>

      <main>
        <MaquetteHero homeCount={homes.length} onOpenFeatured={() => setSelected(homes[0])} plan={homes[0].plan} />

        <section className="bo-listings" id="ingatlanok">
          <div className="bo-section-head">
            <h2>{savedOnly ? "Mentett otthonok" : "Aktuális kínálat"}</h2>
            <p>
              Minden hirdetésünkhöz tartozik alaprajz, makett és napfény-számítás. Az adatokat a helyszínen mértük fel, nem az
              eladó becslése.
            </p>
          </div>

          <div className="bo-filters">
            <label>
              <span>Kerület</span>
              <select onChange={(event) => setDistrict(event.target.value)} value={district}>
                {DISTRICTS.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label>
              <span>Maximum ár</span>
              <select onChange={(event) => setMax(Number(event.target.value))} value={max}>
                <option value="200">200 M Ft</option>
                <option value="350">350 M Ft</option>
                <option value="500">500 M Ft</option>
              </select>
            </label>
            <label>
              <span>Szobák</span>
              <select onChange={(event) => setMinRooms(Number(event.target.value))} value={minRooms}>
                <option value="0">Mindegy</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
                <option value="5">5+</option>
              </select>
            </label>
            <label>
              <span>Rendezés</span>
              <select aria-label="Ingatlanok rendezése" onChange={(event) => setSort(event.target.value)} value={sort}>
                <option value="recommended">Ajánlott</option>
                <option value="price-asc">Ár szerint növekvő</option>
                <option value="size-desc">Méret szerint csökkenő</option>
                <option value="sun">Legtöbb napfény</option>
              </select>
            </label>
            <p className="bo-count">
              <b>{visible.length}</b> találat
            </p>
          </div>

          <ol className="bo-list">
            {visible.map((home) => {
              const sun = sunOf(home);
              const isSaved = saved.includes(home.id);
              return (
                <li className="bo-row" key={home.id}>
                  <button className="bo-row-photo" onClick={() => setSelected(home)} type="button" aria-label={`${home.title} adatlapja`}>
                    <Image alt="" fill sizes="(max-width: 860px) 100vw, 40vw" src={home.image} style={{ objectFit: "cover" }} />
                    <span>{home.type}</span>
                  </button>

                  <div className="bo-row-body">
                    <p className="bo-meta">
                      {home.code} · frissítve {home.updated}
                    </p>
                    <h3>
                      <button onClick={() => setSelected(home)} type="button">{home.title}</button>
                    </h3>
                    <p className="bo-row-place">{home.district}, {home.address}</p>
                    <p className="bo-row-desc">{home.description}</p>
                    <dl className="bo-row-facts">
                      <div><dt>Ár</dt><dd>{home.price} M Ft</dd></div>
                      <div><dt>Terület</dt><dd>{home.size} m²</dd></div>
                      <div><dt>Szoba</dt><dd>{home.rooms}</dd></div>
                      <div><dt>m²-ár</dt><dd>{pricePerSqm(home)} e Ft</dd></div>
                    </dl>
                    <p className="bo-row-sun">
                      <i aria-hidden="true" />
                      Nappali: {sun.directions.map(compassLabel).join(", ")} · {formatDuration(sun.minutes)} napsütés
                    </p>
                    <div className="bo-row-actions">
                      <button className="bo-button" onClick={() => setSelected(home)} type="button">Adatlap és 3D alaprajz</button>
                      <button
                        aria-pressed={isSaved}
                        className={`bo-button ghost${isSaved ? " is-saved" : ""}`}
                        onClick={() => toggle(home.id)}
                        type="button"
                      >
                        {isSaved ? "Mentve" : "Mentés"}
                      </button>
                    </div>
                  </div>

                  <figure className="bo-row-plan">
                    <PlanSketch plan={home.plan} />
                    <figcaption>{home.plan.level} · {home.terrace}</figcaption>
                  </figure>
                </li>
              );
            })}
          </ol>

          {visible.length === 0 && (
            <div className="bo-empty">
              <h3>Ezekkel a szűrőkkel nincs találat.</h3>
              <button className="bo-button" onClick={reset} type="button">Szűrők törlése</button>
            </div>
          )}
        </section>

        <section className="bo-sellers" id="eladoknak">
          <div className="bo-section-head">
            <h2>Eladnád az otthonod?</h2>
            <p>
              Ugyanígy dolgozunk az eladó oldalon is. A vevő a makettből már tudja, mit néz meg, ezért kevesebb, de komolyabb
              megtekintés lesz.
            </p>
          </div>
          <ol className="bo-process">
            <li><b>01</b><h3>Felmérés</h3><p>Lézeres felmérés egy délelőtt alatt. A meglévő tervekből dolgozunk, ha vannak.</p></li>
            <li><b>02</b><h3>Makett</h3><p>3D modell valós méretekkel, tájolással és bútorozással, két munkanapon belül.</p></li>
            <li><b>03</b><h3>Fotó a jó fényben</h3><p>A napfény-számításból tudjuk, melyik órában a legszebb a nappali. Akkor fotózunk.</p></li>
            <li><b>04</b><h3>Előszűrt megtekintés</h3><p>Csak az jön el, aki már látta az alaprajzot és a törlesztőt.</p></li>
          </ol>
          <dl className="bo-stats">
            <div><dt>Átlagos értékesítési idő, 2025</dt><dd>34 nap</dd></div>
            <div><dt>Záróár az irányárhoz képest</dt><dd>97,2%</dd></div>
            <div><dt>Megtekintés eladásonként</dt><dd>4,1</dd></div>
          </dl>
          <button className="bo-button light" onClick={() => notice("Az értékbecslés-kérés ezen a mintaprojekten nincs élesítve.")} type="button">
            Ingyenes értékbecslést kérek
          </button>
        </section>

        <section className="bo-office" id="iroda">
          <div>
            <h2>Iroda</h2>
            <p>Krisztina körút 27., 1013 Budapest</p>
            <p>Hétfő–péntek 9–18, szombaton előre egyeztetve</p>
          </div>
          <dl className="bo-table">
            <div><dt>Telefon</dt><dd>+36 1 555 0140</dd></div>
            <div><dt>Email</dt><dd>iroda@budaiotthonok.hu</dd></div>
            <div><dt>Referensek</dt><dd>6 fő, mind budai lakos</dd></div>
          </dl>
        </section>
      </main>

      <footer className="bo-footer">
        <a className="bo-logo" href="#top">
          <Mark />
          Budai Otthonok
        </a>
        <p>Kitalált márka · ProjectEdge mintaprojekt · a makettek és a napfény-számítás működő funkciók</p>
      </footer>

      {selected && <PropertyModal home={selected} onClose={() => setSelected(null)} onSave={() => toggle(selected.id)} saved={saved.includes(selected.id)} />}
    </div>
  );
}
