"use client";

import { useMemo, useState } from "react";
import { DemoBar } from "@/components/demo/DemoBar";
import { useDemoNotice } from "@/components/demo/DemoNotice";

const services = [
  { icon: "⌁", title: "Hibafeltárás", copy: "Zárlat, leverő biztosíték vagy ismeretlen hiba — műszeres beméréssel." },
  { icon: "↯", title: "Felújítás", copy: "Teljes vagy részleges hálózatcsere, dokumentált átadással." },
  { icon: "◉", title: "Okosotthon", copy: "Világítás, árnyékolás és energiafigyelés egy könnyen kezelhető rendszerben." }
];

const prices: Record<string, number> = { hiba: 28000, felujitas: 180000, okos: 95000 };

export function FixoraSite() {
  const notice = useDemoNotice();
  const [service, setService] = useState("hiba");
  const [size, setSize] = useState(50);
  const [postcode, setPostcode] = useState("");
  const [areaStatus, setAreaStatus] = useState<"idle" | "inside" | "outside">("idle");
  const estimate = useMemo(() => prices[service] + Math.max(size - 30, 0) * (service === "felujitas" ? 3200 : 850), [service, size]);

  const send = () => notice("A kalkulátor működik, de ez egy mintaprojekt: az ajánlatkérés nem kerül elküldésre.");
  const checkArea = () => setAreaStatus(/^1\d{3}$/.test(postcode.trim()) ? "inside" : "outside");

  return (
    <div className="fxr-root" id="top">
      <DemoBar project="Varga Villanyszerelés" />
      <header className="fxr-nav">
        <a className="fxr-brand" href="#top"><span>V</span> VARGA VILLANY</a>
        <nav aria-label="Varga Villanyszerelés navigáció"><a href="#szolgaltatasok">Szolgáltatások</a><a href="#munka">Munkáink</a><a href="#ajanlat">Árbecslő</a></nav>
        <a className="fxr-call" href="tel:+3615550182">+36 1 555 0182</a>
      </header>

      <main>
        <section className="fxr-hero">
          <div className="fxr-hero-shade" />
          <div className="fxr-hero-copy">
            <p className="fxr-kicker"><span /> Budapest és 30 km-es körzete</p>
            <h1>Áram legyen.<br /><em>Meglepetés ne.</em></h1>
            <p>Precíz villanyszerelés előre tisztázott költségekkel. Fotózd le a problémát, kérj becslést, és 2 órán belül visszahívunk.</p>
            <div className="fxr-actions"><a className="fxr-btn" href="#ajanlat">Gyors árbecslés <b>→</b></a><a className="fxr-link" href="#munka">Megnézem a munkákat</a></div>
          </div>
          <div className="fxr-proof"><strong>4,9</strong><span>★★★★★<br />126 ellenőrzött értékelés</span></div>
          <div className="fxr-open"><i /> Ma még 2 kiszállás elérhető</div>
        </section>

        <section className="fxr-strip"><span>Fix munkadíj egyeztetés után</span><span>2 év garancia</span><span>Fotós munkanapló</span><span>Tiszta átadás</span></section>

        <section className="fxr-services" id="szolgaltatasok">
          <div className="fxr-head"><p>AMIBEN SEGÍTÜNK</p><h2>Nem csak megjavítjuk.<br />Rendbe is tesszük.</h2></div>
          <div className="fxr-service-grid">{services.map((item, index) => <article key={item.title}><span>{item.icon}</span><small>0{index + 1}</small><h3>{item.title}</h3><p>{item.copy}</p><a href="#ajanlat">Árat számolok →</a></article>)}</div>
        </section>

        <section className="fxr-work" id="munka">
          <div><p className="fxr-kicker dark">ESETTANULMÁNY / II. KERÜLET</p><h2>Egy 1987-es lakás, újragondolva.</h2><p>68 m² teljes hálózatcseréje, okos világítás-előkészítéssel. A lakás végig lakható maradt, a munka öt ütemben készült el.</p></div>
          <div className="fxr-work-card"><span>68 m²</span><span>9 nap</span><span>42 kör</span><span>0 rejtett költség</span></div>
        </section>

        <section className="fxr-estimator" id="ajanlat">
          <div className="fxr-est-copy"><p>60 MÁSODPERCES BECSLÉS</p><h2>Mivel kapcsolatban keresel?</h2><span>Ez egy tájékoztató ársáv. A végleges ajánlatot fotók vagy helyszíni felmérés után rögzítjük.</span></div>
          <div className="fxr-form">
            <div className="fxr-options">{[["hiba","Hibafeltárás"],["felujitas","Hálózatfelújítás"],["okos","Okosotthon"]].map(([value,label]) => <button className={service === value ? "active" : ""} key={value} onClick={() => setService(value)} type="button">{label}</button>)}</div>
            <label><span>Ingatlan mérete</span><strong>{size} m²</strong><input min="30" max="180" onChange={(e) => setSize(Number(e.target.value))} type="range" value={size} /></label>
            <div className="fxr-area-check">
              <div><span>Kiszállási terület ellenőrzése</span><strong>Add meg az irányítószámot</strong></div>
              <div><input aria-label="Irányítószám" inputMode="numeric" maxLength={4} onChange={(event) => { setPostcode(event.target.value); setAreaStatus("idle"); }} placeholder="pl. 1024" value={postcode} /><button onClick={checkArea} type="button">Ellenőrzés</button></div>
              {areaStatus !== "idle" && <p className={areaStatus}>{areaStatus === "inside" ? "✓ A címed a kiszállási területünkön belül van." : "Ez a körzet egyedi egyeztetést igényel — kérj visszahívást."}</p>}
            </div>
            <div className="fxr-result"><span>Várható induló költség</span><strong>{estimate.toLocaleString("hu-HU")} Ft-tól</strong><small>Kiszállással és alapanyaggal becsülve</small></div>
            <button className="fxr-submit" onClick={send} type="button">Kérek pontos ajánlatot <span>→</span></button>
          </div>
        </section>
      </main>
      <footer className="fxr-footer"><a className="fxr-brand" href="#top"><span>V</span> VARGA VILLANY</a><p>Villanyszerelés · Budapest és környéke</p><small>Mintaprojekt · ProjectEdge</small></footer>
    </div>
  );
}
