"use client";

import { useMemo, useState } from "react";
import { DemoBar } from "@/components/demo/DemoBar";
import { useDemoNotice } from "@/components/demo/DemoNotice";

const homes = [
  { id: 1, district: "I. kerület", type: "Penthouse", title: "Dunára nyíló csend", price: 329, size: 148, rooms: 4, tone: "river" },
  { id: 2, district: "XII. kerület", type: "Villa", title: "Fenyők felett", price: 485, size: 236, rooms: 6, tone: "hill" },
  { id: 3, district: "V. kerület", type: "Polgári lakás", title: "Kortárs klasszikus", price: 219, size: 112, rooms: 3, tone: "city" },
  { id: 4, district: "II. kerület", type: "Új építésű", title: "Reggeli fény", price: 178, size: 89, rooms: 3, tone: "garden" }
];

export function NestSite() {
  const notice = useDemoNotice();
  const [district, setDistrict] = useState("Mindegyik");
  const [max, setMax] = useState(500);
  const [saved, setSaved] = useState<number[]>([]);
  const visible = useMemo(() => homes.filter(home => (district === "Mindegyik" || home.district === district) && home.price <= max), [district, max]);
  const toggle = (id:number) => setSaved(current => current.includes(id) ? current.filter(item=>item!==id) : [...current,id]);

  return (
    <div className="nest-root" id="top">
      <DemoBar project="Budai Otthonok" />
      <header className="nest-nav"><a className="nest-logo" href="#top">BUDAI OTTHONOK<span>ingatlan</span></a><nav><a href="#ingatlanok">Ingatlanok</a><a href="#szolgaltatas">Eladóknak</a><a href="#rolunk">Rólunk</a></nav><button onClick={()=>notice("A mentett ingatlanok ezen a bemutató oldalon csak az aktuális munkamenetben maradnak meg.")} type="button">Mentett <span>{saved.length}</span></button></header>
      <main>
        <section className="nest-hero"><div className="nest-overlay"/><div className="nest-copy"><p>Válogatott budapesti otthonok</p><h1>Nem négyzetmétert.<br /><em>Életet választasz.</em></h1><span>Olyan ingatlanokat mutatunk, amelyeknek van aránya, fénye és története — és minden fontos részletet még a megtekintés előtt megismerhetsz.</span></div><div className="nest-search"><label><span>Hol keresel?</span><select value={district} onChange={e=>setDistrict(e.target.value)}><option>Mindegyik</option><option>I. kerület</option><option>II. kerület</option><option>V. kerület</option><option>XII. kerület</option></select></label><label><span>Maximum ár</span><select value={max} onChange={e=>setMax(Number(e.target.value))}><option value="200">200 M Ft</option><option value="350">350 M Ft</option><option value="500">500 M Ft</option></select></label><a href="#ingatlanok">{visible.length} otthon mutatása →</a></div><div className="nest-featured"><span>KIEMELT</span><strong>Budai penthouse · 148 m²</strong><small>329 M Ft</small></div></section>

        <section className="nest-listings" id="ingatlanok"><div className="nest-heading"><div><p>AKTUÁLIS KÍNÁLAT</p><h2>Otthonok, amiket érdemes személyesen is látni.</h2></div><span>{visible.length} találat</span></div><div className="nest-grid">{visible.map(home=><article key={home.id}><div className={`nest-photo ${home.tone}`}><span>{home.type}</span><button className={saved.includes(home.id)?"saved":""} onClick={()=>toggle(home.id)} aria-label="Ingatlan mentése" type="button">♡</button></div><div className="nest-card-body"><small>{home.district}</small><h3>{home.title}</h3><p>{home.size} m² · {home.rooms} szoba · panoráma</p><strong>{home.price} M Ft</strong><button onClick={()=>notice(`${home.title}: a részletes adatlap és kapcsolatfelvétel ezen a mintaprojekten nincs élesítve.`)} type="button">Részletek →</button></div></article>)}</div>{visible.length===0&&<div className="nest-empty"><h3>Nincs ilyen találat.</h3><button onClick={()=>{setDistrict("Mindegyik");setMax(500)}} type="button">Szűrők törlése</button></div>}</section>

        <section className="nest-service" id="szolgaltatas"><div><p>ELADÓKNAK</p><h2>Egy jó ingatlanhoz jó történet is kell.</h2><span>Fotózás, alaprajz, pozicionálás és előszűrt érdeklődők. Nem több megtekintést ígérünk, hanem jobbakat.</span></div><div className="nest-numbers"><article><strong>21</strong><span>napos átlagos értékesítési idő</span></article><article><strong>96%</strong><span>az irányárhoz viszonyított záróár</span></article><article><strong>1</strong><span>kapcsolattartó az egész folyamatban</span></article></div></section>

        <section className="nest-about" id="rolunk"><p>„Az otthonkeresés nem keresési feladat. Döntési helyzet — ezért minden információt úgy rendezünk el, hogy magabiztosan tudj választani.”</p><span>BUDAI OTTHONOK / Budapest</span><button onClick={()=>notice("A konzultációkérés ezen a mintaprojekten nincs élesítve.")} type="button">Kérek egy személyes konzultációt →</button></section>
      </main>
      <footer className="nest-footer"><a className="nest-logo" href="#top">BUDAI OTTHONOK<span>ingatlan</span></a><p>Válogatott ingatlanok · Értékesítési tanácsadás</p><small>Mintaprojekt · ProjectEdge</small></footer>
    </div>
  );
}
