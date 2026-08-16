"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DemoBar } from "@/components/demo/DemoBar";
import { useDemoNotice } from "@/components/demo/DemoNotice";

type Home = {
  id: number;
  district: string;
  type: string;
  title: string;
  price: number;
  size: number;
  rooms: number;
  image: string;
  address: string;
  floor: string;
  terrace: string;
  parking: string;
  energy: string;
  description: string;
  features: string[];
};

const homes: Home[] = [
  {
    id: 1,
    district: "I. kerület",
    type: "Penthouse",
    title: "Dunára nyíló csend",
    price: 329,
    size: 148,
    rooms: 4,
    image: "/demo/budai-otthonok/hero.webp",
    address: "Várkert rakpart",
    floor: "5. emelet / liftes",
    terrace: "46 m² panorámás terasz",
    parking: "2 teremgarázs-hely",
    energy: "A+",
    description: "A lakás teljes szélességében a Dunára fordul. A nappali és a konyha egyetlen, világos tér, a hálók pedig egy csendesebb, külön szárnyban kaptak helyet. Egyedi asztalosbútorok, természetes kő és árnyékolt üvegfelületek teszik nyugodttá az összhatást.",
    features: ["Dunai panoráma", "Saját lift", "Mennyezethűtés", "Okosotthon", "Borhűtő", "Portaszolgálat"]
  },
  {
    id: 2,
    district: "XII. kerület",
    type: "Villa",
    title: "Fenyők felett",
    price: 485,
    size: 236,
    rooms: 6,
    image: "/demo/budai-otthonok/villa.webp",
    address: "Mártonhegyi út",
    floor: "2 szint",
    terrace: "82 m² kert és terasz",
    parking: "2 állásos garázs",
    energy: "A++",
    description: "Önálló, kortárs villa egy védett, fás telken. A közösségi terek közvetlenül a kertre nyílnak, az emeleti hálókhoz pedig saját erkély tartozik. Hőszivattyú, napelem és rejtett árnyékolás gondoskodik az alacsony fenntartásról.",
    features: ["Önálló telek", "Panorámás kert", "Hőszivattyú", "Napelem", "Kandalló", "Szauna-előkészítés"]
  },
  {
    id: 3,
    district: "V. kerület",
    type: "Polgári lakás",
    title: "Kortárs klasszikus",
    price: 219,
    size: 112,
    rooms: 3,
    image: "/demo/budai-otthonok/polgari.webp",
    address: "Sas utca",
    floor: "3. emelet / liftes",
    terrace: "Franciaerkély",
    parking: "Utcai parkolás",
    energy: "B",
    description: "Felújított, századfordulós lakás eredeti parkettával, kétszárnyú ajtókkal és 3,8 méteres belmagassággal. A műszaki rendszer teljesen új, miközben minden menthető építészeti részlet megmaradt.",
    features: ["3,8 m belmagasság", "Eredeti parketta", "Központi lokáció", "Klíma", "Prémium gépek", "Tehermentes"]
  },
  {
    id: 4,
    district: "II. kerület",
    type: "Új építésű",
    title: "Reggeli fény",
    price: 178,
    size: 89,
    rooms: 3,
    image: "/demo/budai-otthonok/kert.webp",
    address: "Hűvösvölgyi út",
    floor: "Földszint",
    terrace: "31 m² saját kert",
    parking: "1 teremgarázs-hely",
    energy: "A++",
    description: "Kertkapcsolatos otthon egy alacsony lakásszámú, új budai társasházban. Keleti tájolású nappali, fedett terasz és jól használható saját kert. Azonnal költözhető, beépített konyhával és gardróbokkal.",
    features: ["Saját kert", "Új építés", "Hőszivattyú", "Elektromos töltő", "Tároló", "Akadálymentes"]
  }
];

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
    <div className="property-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-label={`${home.title} részletes adatlap`} aria-modal="true" className="property-modal" role="dialog">
        <button aria-label="Részletek bezárása" className="property-close" onClick={onClose} type="button">×</button>
        <div className="property-gallery">
          {/* A galéria cellája CSS-ből kap méretet (object-fit: cover), ezért
              `fill` — így a next/image is a viewporthoz illő változatot adja. */}
          <div className="property-gallery-main">
            <Image alt={`${home.title} ingatlan`} src={home.image} fill sizes="(max-width: 900px) 100vw, 60vw" style={{ objectFit: "cover" }} />
          </div>
          <div className="property-gallery-side">
            <div className="property-plan"><span>ALAPRAJZ</span><i /><i /><i /><i /></div>
            <div className="property-map"><span>KÖRNYÉK</span><b>●</b><i /><i /><i /></div>
          </div>
          <span className="property-photo-count">1 fotó · alaprajz · környék</span>
        </div>

        <div className="property-modal-body">
          <div className="property-main">
            <div className="property-title-row">
              <div><span>{home.district} · {home.address}</span><h2>{home.title}</h2></div>
              <button className={saved ? "saved" : ""} onClick={onSave} type="button">{saved ? "♥ Mentve" : "♡ Mentés"}</button>
            </div>
            <div className="property-facts"><strong>{home.price} M Ft</strong><span>{home.size} m²</span><span>{home.rooms} szoba</span><span>{home.energy} energia</span></div>
            <p className="property-description">{home.description}</p>

            <section className="property-details"><h3>A legfontosabb részletek</h3><div><span><small>Épületen belül</small>{home.floor}</span><span><small>Kültér</small>{home.terrace}</span><span><small>Parkolás</small>{home.parking}</span><span><small>Energetika</small>{home.energy}</span></div></section>
            <section className="property-features"><h3>Felszereltség</h3><div>{home.features.map((feature) => <span key={feature}>✓ {feature}</span>)}</div></section>

            <section className="property-finance">
              <div><span>FINANSZÍROZÁSI BECSLŐ</span><h3>Milyen havi összeggel számolhatsz?</h3><p>Tájékoztató kalkuláció 6,9%-os kamattal. Nem banki ajánlat.</p></div>
              <div className="finance-controls">
                <label><span>Önerő <strong>{downPayment}%</strong></span><input min="20" max="70" step="5" type="range" value={downPayment} onChange={(event) => setDownPayment(Number(event.target.value))} /></label>
                <div className="finance-years">{[10, 20, 30].map((value) => <button className={years === value ? "active" : ""} key={value} onClick={() => setYears(value)} type="button">{value} év</button>)}</div>
                <div className="finance-result"><span>Becsült havi törlesztő</span><strong>{monthly.toLocaleString("hu-HU")} Ft</strong><small>Hitelösszeg: {Math.round(principal / 1_000_000)} M Ft</small></div>
              </div>
            </section>
          </div>

          <aside className="property-contact">
            <span className="agent-avatar">KB</span><div><small>Az ingatlan szakértője</small><strong>Kovács Borbála</strong><span>+36 30 555 0148</span></div>
            <p>Kérj privát megtekintést vagy részletes dokumentációt.</p>
            <label>Név<input placeholder="Teljes név" /></label>
            <label>Email<input placeholder="nev@email.hu" type="email" /></label>
            <label>Üzenet<textarea defaultValue={`Érdekel a(z) „${home.title}” ingatlan.`} /></label>
            <button onClick={() => notice("Az érdeklődés nem került elküldésre — ez egy interaktív mintaprojekt.")} type="button">Megtekintést kérek →</button>
            <small>Általában 2 órán belül visszajelzünk.</small>
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
    const filtered = homes.filter((home) =>
      (district === "Mindegyik" || home.district === district) &&
      home.price <= max && home.rooms >= minRooms && (!savedOnly || saved.includes(home.id))
    );
    return [...filtered].sort((a, b) => sort === "price-asc" ? a.price - b.price : sort === "size-desc" ? b.size - a.size : a.id - b.id);
  }, [district, max, minRooms, savedOnly, saved, sort]);

  const toggle = (id: number) => setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleSavedView = () => {
    if (!saved.length) return notice("Még nincs mentett ingatlanod. A szív ikonra kattintva tudsz elmenteni egyet.");
    setSavedOnly((current) => !current);
  };

  return (
    <div className="nest-root" id="top">
      <DemoBar project="Budai Otthonok" />
      <header className="nest-nav"><a className="nest-logo" href="#top">BUDAI OTTHONOK<span>ingatlan</span></a><nav><a href="#ingatlanok">Ingatlanok</a><a href="#szolgaltatas">Eladóknak</a><a href="#rolunk">Rólunk</a></nav><button className={savedOnly ? "active" : ""} onClick={toggleSavedView} type="button">Mentett <span>{saved.length}</span></button></header>
      <main>
        <section className="nest-hero"><div className="nest-overlay"/><div className="nest-copy"><p>Válogatott budapesti otthonok</p><h1>Nem négyzetmétert.<br /><em>Életet választasz.</em></h1><span>Olyan ingatlanokat mutatunk, amelyeknek van aránya, fénye és története — és minden fontos részletet még a megtekintés előtt megismerhetsz.</span></div><div className="nest-search"><label><span>Hol keresel?</span><select value={district} onChange={(event) => setDistrict(event.target.value)}><option>Mindegyik</option><option>I. kerület</option><option>II. kerület</option><option>V. kerület</option><option>XII. kerület</option></select></label><label><span>Maximum ár</span><select value={max} onChange={(event) => setMax(Number(event.target.value))}><option value="200">200 M Ft</option><option value="350">350 M Ft</option><option value="500">500 M Ft</option></select></label><label><span>Minimum szobaszám</span><select value={minRooms} onChange={(event) => setMinRooms(Number(event.target.value))}><option value="0">Mindegy</option><option value="3">3 szoba</option><option value="4">4 szoba</option><option value="5">5+ szoba</option></select></label><a href="#ingatlanok">{visible.length} otthon mutatása →</a></div><div className="nest-featured"><span>KIEMELT</span><strong>Budai penthouse · 148 m²</strong><small>329 M Ft</small></div></section>

        <section className="nest-listings" id="ingatlanok"><div className="nest-heading"><div><p>{savedOnly ? "MENTETT OTTHONOK" : "AKTUÁLIS KÍNÁLAT"}</p><h2>Otthonok, amiket érdemes személyesen is látni.</h2></div><div className="listing-tools"><span>{visible.length} találat</span><select aria-label="Ingatlanok rendezése" value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Ajánlott sorrend</option><option value="price-asc">Ár szerint növekvő</option><option value="size-desc">Méret szerint csökkenő</option></select></div></div><div className="nest-grid">{visible.map((home) => <article key={home.id}><button className="nest-photo" onClick={() => setSelected(home)} style={{ backgroundImage: `url(${home.image})` }} type="button"><span>{home.type}</span><i>{home.district}</i></button><button className={`nest-save ${saved.includes(home.id) ? "saved" : ""}`} onClick={() => toggle(home.id)} aria-label={`${home.title} mentése`} type="button">♡</button><div className="nest-card-body"><small>{home.district} · {home.address}</small><h3>{home.title}</h3><p>{home.size} m² · {home.rooms} szoba · {home.energy}</p><strong>{home.price} M Ft</strong><button onClick={() => setSelected(home)} type="button">Részletek →</button></div></article>)}</div>{visible.length === 0 && <div className="nest-empty"><h3>Nincs ilyen találat.</h3><button onClick={() => { setDistrict("Mindegyik"); setMax(500); setMinRooms(0); setSavedOnly(false); }} type="button">Szűrők törlése</button></div>}</section>

        <section className="nest-service" id="szolgaltatas"><div><p>ELADÓKNAK</p><h2>Egy jó ingatlanhoz jó történet is kell.</h2><span>Fotózás, alaprajz, pozicionálás és előszűrt érdeklődők. Nem több megtekintést ígérünk, hanem jobbakat.</span></div><div className="nest-numbers"><article><strong>21</strong><span>napos átlagos értékesítési idő</span></article><article><strong>96%</strong><span>az irányárhoz viszonyított záróár</span></article><article><strong>1</strong><span>kapcsolattartó az egész folyamatban</span></article></div></section>

        <section className="nest-about" id="rolunk"><p>„Az otthonkeresés nem keresési feladat. Döntési helyzet — ezért minden információt úgy rendezünk el, hogy magabiztosan tudj választani.”</p><span>BUDAI OTTHONOK / Budapest</span><button onClick={() => notice("A konzultációkérés ezen a mintaprojekten nincs élesítve.")} type="button">Kérek egy személyes konzultációt →</button></section>
      </main>
      <footer className="nest-footer"><a className="nest-logo" href="#top">BUDAI OTTHONOK<span>ingatlan</span></a><p>Válogatott ingatlanok · Értékesítési tanácsadás</p><small>Mintaprojekt · ProjectEdge</small></footer>
      {selected && <PropertyModal home={selected} saved={saved.includes(selected.id)} onClose={() => setSelected(null)} onSave={() => toggle(selected.id)} />}
    </div>
  );
}
