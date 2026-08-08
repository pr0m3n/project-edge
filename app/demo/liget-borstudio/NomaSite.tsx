"use client";

import { useState } from "react";
import { DemoBar } from "@/components/demo/DemoBar";
import { useDemoNotice } from "@/components/demo/DemoNotice";

const treatments = [
  { name: "Liget Rituálé", time: "75 perc", price: "28 900 Ft", copy: "Személyre szabott arckezelés bőrdiagnosztikával és mélyhidratálással." },
  { name: "Calm Reset", time: "55 perc", price: "22 900 Ft", copy: "Érzékeny, kipirosodásra hajlamos bőr nyugtató, barrier-támogató kezelése." },
  { name: "Sculpt & Glow", time: "90 perc", price: "34 900 Ft", copy: "Manuális liftingmasszázs, enzimes megújítás és intenzív ragyogásfokozás." }
];

const slots = ["09:30", "11:00", "13:30", "16:00", "17:30"];

export function NomaSite() {
  const notice = useDemoNotice();
  const [treatment, setTreatment] = useState(0);
  const [day, setDay] = useState(1);
  const [slot, setSlot] = useState("13:30");
  const [bookingOpen, setBookingOpen] = useState(false);
  const finish = () => notice(`A ${treatments[treatment].name} · ${slot} időpontot nem foglaltuk le — ez egy interaktív mintaprojekt.`);

  return (
    <div className="noma-root" id="top">
      <DemoBar project="Liget Bőrstúdió" />
      <header className="noma-nav"><a className="noma-logo" href="#top">LIGET<span>bőrstúdió</span></a><nav><a href="#kezelesek">Kezelések</a><a href="#studio">A stúdió</a><a href="#foglalas">Foglalás</a></nav><button onClick={() => setBookingOpen(true)} type="button">Időpontot foglalok</button></header>
      <main>
        <section className="noma-hero">
          <div className="noma-hero-image" />
          <div className="noma-hero-copy"><p>Budapest · II. kerület</p><h1>A bőröd nem trend.<br /><em>Történet.</em></h1><span>Személyre szabott kezelések csendes, figyelmes térben. Kevesebb ígéret, több megértés — és egy rutin, amit valóban tudsz követni.</span><button onClick={() => setBookingOpen(true)} type="button">Kezdjük egy konzultációval <b>↗</b></button></div>
          <div className="noma-rating"><strong>4.9</strong><span>98 vendégvélemény<br />Google értékelések</span></div>
        </section>

        <section className="noma-manifest"><p>Nem ugyanazt adjuk mindenkinek.</p><h2>Megnézzük. Meghallgatjuk.<br />Aztán csak azt tesszük,<br />amire a bőrödnek szüksége van.</h2></section>

        <section className="noma-treatments" id="kezelesek"><div className="noma-heading"><p>Kezelések</p><h2>Három út.<br />Egy nyugodtabb bőr.</h2></div><div className="noma-list">{treatments.map((item,index)=><article key={item.name}><span>0{index+1}</span><div><h3>{item.name}</h3><p>{item.copy}</p></div><div><strong>{item.price}</strong><small>{item.time}</small><button onClick={()=>{setTreatment(index);setBookingOpen(true)}} type="button">Foglalás →</button></div></article>)}</div></section>

        <section className="noma-studio" id="studio"><div><p>A Liget ritmusa</p><h2>90 perc, amikor nem kell sietned.</h2></div><ol><li><span>01</span><strong>Bőrdiagnosztika</strong><p>Nem kérdőívből találgatunk: megnézzük a bőröd aktuális állapotát.</p></li><li><span>02</span><strong>Személyre szabott kezelés</strong><p>A hatóanyagokat és technikát aznapi igényeidhez igazítjuk.</p></li><li><span>03</span><strong>Egyszerű otthoni terv</strong><p>Három használható lépés, felesleges termékek nélkül.</p></li></ol></section>

        <section className="noma-book" id="foglalas"><div><p>ONLINE FOGLALÁS</p><h2>A következő nyugodt órád itt kezdődik.</h2><span>Válassz kezelést és időpontot. A teljes folyamat kipróbálható ebben a demóban.</span></div><button onClick={() => setBookingOpen(true)} type="button">Szabad időpontok <b>→</b></button></section>
      </main>

      {bookingOpen && <div className="noma-modal" role="dialog" aria-modal="true" aria-label="Időpontfoglalás"><button className="noma-close" onClick={()=>setBookingOpen(false)} aria-label="Bezárás" type="button">×</button><div className="noma-booking-head"><span>01 / 03</span><h2>Válassz kezelést</h2></div><div className="noma-treatment-pills">{treatments.map((item,index)=><button className={treatment===index?"active":""} onClick={()=>setTreatment(index)} key={item.name} type="button"><strong>{item.name}</strong><span>{item.time} · {item.price}</span></button>)}</div><div className="noma-booking-head"><span>02 / 03</span><h2>Nap és időpont</h2></div><div className="noma-days">{["H 10","K 11","SZE 12","CS 13"].map((item,index)=><button className={day===index?"active":""} onClick={()=>setDay(index)} key={item} type="button">{item}</button>)}</div><div className="noma-slots">{slots.map(item=><button className={slot===item?"active":""} onClick={()=>setSlot(item)} key={item} type="button">{item}</button>)}</div><div className="noma-summary"><div><span>Kiválasztva</span><strong>{treatments[treatment].name} · {slot}</strong></div><button onClick={finish} type="button">Foglalás megerősítése →</button></div></div>}
      <footer className="noma-footer"><a className="noma-logo" href="#top">LIGET<span>bőrstúdió</span></a><p>1024 Budapest · Keleti Károly utca 18.</p><small>Mintaprojekt · ProjectEdge</small></footer>
    </div>
  );
}
