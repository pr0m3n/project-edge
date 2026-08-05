"use client";

import { useEffect, useState } from "react";
import { DemoBar } from "@/components/demo/DemoBar";
import { useDemoNotice } from "@/components/demo/DemoNotice";

const noticeText =
  "Ez egy bemutató oldal: a regisztráció és a belépés nincs élesítve.";

const appointments = [
  { time: "09:00", name: "Nóra", service: "Vágás", color: "coral" },
  { time: "10:30", name: "Júlia", service: "Festés", color: "lime" },
  { time: "12:00", name: "Ebédszünet", service: "", color: "quiet" },
  { time: "13:15", name: "Márk", service: "Vágás + szakáll", color: "blue" },
  { time: "15:00", name: "Anna", service: "Balayage", color: "coral" }
];

const faqs = [
  ["Mennyi idő alatt lehet elindulni?", "Egy átlagos szalon egy délután alatt beállítható. A szolgáltatásokat, nyitvatartást és a meglévő vendéglistát is segítünk áthozni."],
  ["Kell hozzá saját weboldal?", "Nem. Saját foglalási linket kapsz, amit kitehetsz Instagramra, Google-profilra vagy elküldhetsz üzenetben. Meglévő oldalba is beépíthető."],
  ["Működik a Google Naptárral?", "Igen, kétirányú szinkronnal. Ami az egyik naptárban foglalt, az a másikban sem jelenik meg szabad időpontként."],
  ["Mi történik, ha lemondom?", "Nincs hűségidő. Az adataid bármikor exportálhatók, a csomag pedig a számlázási időszak végéig használható marad."]
];

function Mark() {
  return <span className="vy-mark" aria-hidden="true"><i /><i /><i /></span>;
}

function Arrow() {
  return <span className="vy-arrow" aria-hidden="true">↗</span>;
}

function AppPreview() {
  return (
    <div className="vy-app" aria-label="Veyra napi naptár előnézet">
      <div className="vy-app-top">
        <span><Mark /> veyra</span>
        <div className="vy-app-person">BK</div>
      </div>
      <div className="vy-app-head">
        <div><small>2026. augusztus 4.</small><strong>Jó reggelt, Bori.</strong></div>
        <button type="button" tabIndex={-1}>+ Új időpont</button>
      </div>
      <div className="vy-app-body">
        <aside>
          <span className="active">Ma</span><span>Naptár</span><span>Vendégek</span><span>Bevételek</span>
          <div className="vy-today"><small>Mai bevétel</small><strong>84 500 Ft</strong><em>+18% tegnaphoz képest</em></div>
        </aside>
        <div className="vy-agenda">
          <div className="vy-agenda-title"><strong>Kedd</strong><span>5 időpont · 1 szabad hely</span></div>
          {appointments.map((item) => (
            <div className="vy-appointment" key={item.time}>
              <time>{item.time}</time>
              <span className={item.color} />
              <div><strong>{item.name}</strong>{item.service && <small>{item.service}</small>}</div>
              {item.service && <b>•••</b>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function VeyraSite() {
  const notice = useDemoNotice();
  const [menu, setMenu] = useState(false);
  const [yearly, setYearly] = useState(true);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const close = () => setMenu(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  const act = () => notice(noticeText);

  return (
    <div className="vy-root" id="top">
      <DemoBar project="Veyra" />
      <header className="vy-nav">
        <a className="vy-logo" href="#top"><Mark /> <span>veyra</span></a>
        <nav className={menu ? "is-open" : ""} aria-label="Fő navigáció">
          <a href="#miert" onClick={() => setMenu(false)}>Miért Veyra?</a>
          <a href="#funkciok" onClick={() => setMenu(false)}>Funkciók</a>
          <a href="#arak" onClick={() => setMenu(false)}>Árak</a>
        </nav>
        <div className="vy-nav-actions">
          <button className="vy-login" onClick={act} type="button">Belépés</button>
          <button className="vy-primary small" onClick={act} type="button">Kipróbálom <Arrow /></button>
          <button className="vy-menu" aria-expanded={menu} aria-label="Menü" onClick={() => setMenu(!menu)} type="button"><i /><i /></button>
        </div>
      </header>

      <main>
        <section className="vy-hero">
          <div className="vy-hero-copy">
            <p className="vy-eyebrow"><span /> Foglalás, ami nem kér figyelmet</p>
            <h1>Tele a naptár.<br /><em>Tiszta a fejed.</em></h1>
            <p className="vy-lead">A Veyra fogadja a foglalásokat, emlékezteti a vendégeket és rendezi a fizetést. Te pedig végre a munkáddal foglalkozol.</p>
            <div className="vy-hero-actions">
              <button className="vy-primary" onClick={act} type="button">14 napig ingyen <Arrow /></button>
              <a className="vy-text-link" href="#funkciok">Mutasd, hogyan működik <span>↓</span></a>
            </div>
            <div className="vy-trust"><div className="vy-faces"><span>RA</span><span>BK</span><span>NS</span></div><p><strong>4,9 / 5</strong><br />több mint 800 szolgáltatótól</p></div>
          </div>
          <div className="vy-hero-visual">
            <div className="vy-sticker">6,5 óra<br /><small>vissza hetente</small></div>
            <AppPreview />
            <div className="vy-booking-pop"><span>✓</span><div><strong>Új online foglalás</strong><small>Anna · Balayage · 15:00</small></div></div>
          </div>
        </section>

        <div className="vy-proof"><p>Azoknak, akik emberekkel dolgoznak</p><div><span>FODRÁSZAT</span><span>BARBER</span><span>KOZMETIKA</span><span>MASSZÁZS</span><span>STÚDIÓ</span></div></div>

        <section className="vy-problem" id="miert">
          <div className="vy-section-intro"><p className="vy-eyebrow"><span /> Ismerős helyzet?</p><h2>Nem a munkád fáraszt el.<br />Hanem minden <em>körülötte.</em></h2></div>
          <div className="vy-problem-grid">
            <article className="paper"><span>01</span><h3>„Mikor van szabad időpont?”</h3><p>Üzenetek reggel, este és munka közben. Ugyanaz a kérdés, újra és újra.</p><i>23 olvasatlan üzenet</i></article>
            <article className="ink"><span>02</span><h3>A Veyra válaszol helyetted.</h3><p>A vendég a valós szabad időpontokból választ, akár éjfélkor is.</p><i>0 perc adminisztráció</i></article>
            <article className="lime"><span>03</span><h3>És tényleg el is jön.</h3><p>Automatikus emlékeztető és opcionális előleg: kevesebb üres szék, biztosabb napok.</p><i>−72% meg nem jelenés</i></article>
          </div>
        </section>

        <section className="vy-features" id="funkciok">
          <div className="vy-feature-copy">
            <p className="vy-eyebrow light"><span /> Egy helyen minden</p>
            <h2>A rendszer, ami<br /><em>csendben dolgozik.</em></h2>
            <p>Nem még egy alkalmazás, amit menedzselned kell. Egy nyugodt háttér, ami leveszi rólad az ismétlődő feladatokat.</p>
            <ul><li><b>01</b><span><strong>Online foglalás</strong><small>Valós idejű szabad időpontok, a nap 24 órájában.</small></span></li><li><b>02</b><span><strong>Okos emlékeztetők</strong><small>SMS és email a saját hangodon.</small></span></li><li><b>03</b><span><strong>Előleg és fizetés</strong><small>Kevesebb lemondás, kiszámíthatóbb bevétel.</small></span></li><li><b>04</b><span><strong>Vendégkartonok</strong><small>Minden fontos részlet, mielőtt belép az ajtón.</small></span></li></ul>
          </div>
          <div className="vy-phone-wrap">
            <div className="vy-phone">
              <div className="vy-phone-top"><Mark /><span>15:42</span></div>
              <p>Következő vendéged</p><div className="vy-next"><span>16:00</span><strong>Kata</strong><small>Festés · 2 óra</small><i>Visszatérő vendég</i></div>
              <div className="vy-note"><small>Vendégjegyzet</small><p>Meleg tónusokat kedvel. Legutóbb: 7.13 árnyalat.</p></div>
              <div className="vy-week"><span>H<strong>3</strong></span><span>K<strong>5</strong></span><span>SZE<strong>4</strong></span><span className="now">CS<strong>6</strong></span><span>P<strong>5</strong></span></div>
            </div>
            <div className="vy-float-card"><small>Heti bevétel</small><strong>412 800 Ft</strong><span>↗ 12,4%</span></div>
          </div>
        </section>

        <section className="vy-quote"><blockquote>„Már az első héten úgy éreztem, mintha lenne egy asszisztensem. Csak ő nem megy szabadságra.”</blockquote><div><span>KG</span><p><strong>Kiss Gréta</strong><br />Gréta Hair Studio · fiktív szereplő</p></div></section>

        <section className="vy-pricing" id="arak">
          <div className="vy-pricing-head"><div><p className="vy-eyebrow"><span /> Egyszerű árazás</p><h2>Csak annyit fizetsz,<br />amennyire <em>szükséged van.</em></h2></div><div className="vy-toggle"><button className={!yearly ? "active" : ""} onClick={() => setYearly(false)} type="button">Havi</button><button className={yearly ? "active" : ""} onClick={() => setYearly(true)} type="button">Éves <small>−20%</small></button></div></div>
          <div className="vy-plans">
            <article><p>EGYÉNI</p><h3>{yearly ? "7 900" : "9 900"} Ft<small>/ hó</small></h3><span>Egyedül dolgozó szakembereknek.</span><ul><li>1 naptár</li><li>Korlátlan foglalás</li><li>Email emlékeztetők</li><li>Vendégkartonok</li></ul><button onClick={act} type="button">Kipróbálom <Arrow /></button></article>
            <article className="featured"><div className="vy-popular">Legnépszerűbb</div><p>CSAPAT</p><h3>{yearly ? "14 900" : "18 900"} Ft<small>/ hó</small></h3><span>Növekvő szalonoknak és stúdióknak.</span><ul><li>5 munkatársig</li><li>SMS + email emlékeztetők</li><li>Online fizetés és előleg</li><li>Bevételi riportok</li><li>Elsőbbségi segítség</li></ul><button onClick={act} type="button">14 napig ingyen <Arrow /></button></article>
            <article><p>STÚDIÓ</p><h3>{yearly ? "24 900" : "30 900"} Ft<small>/ hó</small></h3><span>Több helyszínnel működő csapatoknak.</span><ul><li>Korlátlan munkatárs</li><li>Több telephely</li><li>Jogosultságok</li><li>Egyedi bevezetés</li></ul><button onClick={act} type="button">Beszéljünk <Arrow /></button></article>
          </div>
          <p className="vy-price-note">Minden csomag tartalmaz 14 napos próbaidőszakot. Bankkártya nélkül.</p>
        </section>

        <section className="vy-faq" id="gyik"><div><p className="vy-eyebrow"><span /> Kérdések</p><h2>Mielőtt<br /><em>belevágsz.</em></h2><p>Nem találtad meg a választ? Írj nekünk, és egy munkanapon belül válaszolunk.</p></div><div className="vy-faq-list">{faqs.map(([q,a],i)=><article className={openFaq === i ? "open" : ""} key={q}><button onClick={() => setOpenFaq(openFaq === i ? -1 : i)} type="button"><span>0{i+1}</span>{q}<i>+</i></button><div><p>{a}</p></div></article>)}</div></section>

        <section className="vy-final"><Mark /><p>Készen állsz egy nyugodtabb hétre?</p><h2>A következő foglalásod<br /><em>már magától érkezhet.</em></h2><button className="vy-primary" onClick={act} type="button">Elindítom ingyen <Arrow /></button><small>14 nap · bankkártya nélkül · bármikor lemondható</small></section>
      </main>

      <footer className="vy-footer"><a className="vy-logo" href="#top"><Mark /> <span>veyra</span></a><p>Foglalás, vendégek és bevétel.<br />Egy nyugodtabb munkanapért.</p><div><a href="#funkciok">Funkciók</a><a href="#arak">Árak</a><a href="#gyik">GYIK</a></div><div><a href="#top">Adatkezelés</a><a href="#top">ÁSZF</a><a href="https://www.projectedge.hu">Készítette: ProjectEdge ↗</a></div><small>© 2026 Veyra · kitalált márka</small></footer>
    </div>
  );
}
