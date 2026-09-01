"use client";

import Image from "next/image";
import { useState } from "react";
import { DemoBar } from "@/components/demo/DemoBar";
import { useDemoNotice } from "@/components/demo/DemoNotice";
import { BookingFlow } from "./BookingFlow";
import { TreatmentPicker } from "./TreatmentPicker";
import type { Treatment } from "./TreatmentPicker";

/**
 * Liget Bőrstúdió — mintaprojekt.
 *
 * Vizuális irány: csendes, magazinos. Meleg homokszín, egyetlen agyagrózsa
 * akcens, lágy szórt fény minden fotón. A korábbi verzió négy szekcióból állt
 * és egyetlen fotó volt benne; a lap most a képekre épül, és a kezelésválasztó
 * meg a foglalás is végigkattintható.
 */

const TREATMENTS: Treatment[] = [
  {
    name: "Liget Rituálé",
    time: "75 perc",
    price: "28 900 Ft",
    copy: "Bőrdiagnosztika, személyre szabott arckezelés és mélyhidratálás. Ezzel szoktunk kezdeni.",
    image: "/demo/liget-borstudio/kezeles.webp",
    alt: "Kozmetikus keze a vendég halántékán arckezelés közben"
  },
  {
    name: "Nyugtató kúra",
    time: "55 perc",
    price: "22 900 Ft",
    copy: "Érzékeny, kipirosodásra hajlamos bőr csendesítése, barrier-támogató hatóanyagokkal.",
    image: "/demo/liget-borstudio/kezeloszoba.webp",
    alt: "A kezelőszoba lenvászonnal és gyertyával, lombárnyékkal a falon"
  },
  {
    name: "Emelés és ragyogás",
    time: "90 perc",
    price: "34 900 Ft",
    copy: "Manuális liftingmasszázs, enzimes megújítás és intenzív ragyogásfokozás egy menetben.",
    image: "/demo/liget-borstudio/hatoanyagok.webp",
    alt: "Hatóanyagok travertin felületen: pipettás üveg, kőtégely és lenvászon"
  }
];

const RHYTHM = [
  {
    title: "Bőrdiagnosztika",
    copy: "Nem kérdőívből találgatunk: megnézzük a bőröd aznapi állapotát, és elmondjuk, mit látunk."
  },
  {
    title: "Személyre szabott kezelés",
    copy: "A hatóanyagokat és a technikát az aznapi igényeidhez igazítjuk, nem egy protokollhoz."
  },
  {
    title: "Egyszerű otthoni terv",
    copy: "Három használható lépés. Nem adunk el hét terméket, ha kettő is elég."
  }
];

const GALLERY = [
  { src: "/demo/liget-borstudio/fogado.webp", alt: "A stúdió fogadótere íves fülkével", cls: "wide" },
  { src: "/demo/liget-borstudio/textura.webp", alt: "Gyűrött agyagrózsa lenvászon szárított ággal", cls: "tall" },
  { src: "/demo/liget-borstudio/reszlet.webp", alt: "Égő gyertya kőtartóban, lombárnyékkal a falon", cls: "" }
];

const VOICES = [
  {
    text: "Nem próbáltak rám sózni semmit. Ez volt az első kozmetika, ahonnan úgy jöttem el, hogy nem éreztem magam hülyének.",
    name: "Sz. Dóra",
    since: "másfél éve jár"
  },
  {
    text: "A bőröm nem lett más egyik napról a másikra. De három hónap alatt igen, és pontosan ezt ígérték.",
    name: "K. Móni",
    since: "2024 tavasza óta"
  },
  {
    text: "Csend van. Nem szól rádió, nem kérdezgetnek. Ezért járok ide.",
    name: "V. Eszter",
    since: "négy éve jár"
  }
];

export function NomaSite({ fontClass = "" }: { fontClass?: string }) {
  const notice = useDemoNotice();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const openBooking = (index: number) => {
    setStartIndex(index);
    setBookingOpen(true);
  };

  const finish = (summary: string) => {
    setBookingOpen(false);
    notice(`A ${summary} időpontot nem foglaltuk le — ez egy interaktív mintaprojekt.`);
  };

  return (
    <div className={`noma-root ${fontClass}`} id="top">
      <DemoBar project="Liget Bőrstúdió" />

      <header className="noma-nav">
        <a className="noma-logo" href="#top">
          Liget
          <span>bőrstúdió</span>
        </a>
        <nav aria-label="Liget Bőrstúdió navigáció">
          <a href="#kezelesek">Kezelések</a>
          <a href="#studio">A stúdió</a>
          <a href="#szakember">Aki fogad</a>
          <a href="#hol">Hol vagyunk</a>
        </nav>
        <button className="noma-btn small" onClick={() => openBooking(0)} type="button">
          Időpontot foglalok
        </button>
      </header>

      <main>
        {/* ── hero ─────────────────────────────────────────────────────── */}
        <section className="noma-hero">
          <div className="noma-hero-media">
            <Image
              alt="A Liget Bőrstúdió kezelőágya meszelt falú térben"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 52vw"
              src="/demo/liget-borstudio/hero.webp"
            />
          </div>
          <div className="noma-hero-copy">
            <p className="noma-eyebrow">Budapest · II. kerület</p>
            <h1>
              A bőröd nem trend.
              <em>Történet.</em>
            </h1>
            <p className="noma-lede">
              Személyre szabott kezelések csendes, figyelmes térben. Kevesebb ígéret, több megértés
              — és egy rutin, amit valóban tudsz követni.
            </p>
            <button className="noma-btn" onClick={() => openBooking(0)} type="button">
              Kezdjük egy konzultációval
            </button>
            <p className="noma-rating">
              <strong>4,9</strong>
              <span>
                98 vendégvélemény
                <br />
                Google értékelések
              </span>
            </p>
          </div>
        </section>

        {/* ── manifesztó ───────────────────────────────────────────────── */}
        <section className="noma-manifest">
          <p className="noma-eyebrow light">Nem ugyanazt adjuk mindenkinek</p>
          <h2>
            Megnézzük. Meghallgatjuk.
            <br />
            Aztán csak azt tesszük, amire a bőrödnek szüksége van.
          </h2>
        </section>

        {/* ── kezelések ────────────────────────────────────────────────── */}
        <section className="noma-treatments" id="kezelesek">
          <div className="noma-head">
            <p className="noma-eyebrow">Kezelések</p>
            <h2>
              Három út.
              <br />
              Egy nyugodtabb bőr.
            </h2>
          </div>
          <TreatmentPicker onBook={openBooking} treatments={TREATMENTS} />
        </section>

        {/* ── stúdió ───────────────────────────────────────────────────── */}
        <section className="noma-studio" id="studio">
          <div className="noma-head">
            <p className="noma-eyebrow">A stúdió</p>
            <h2>Egy lakás, nem egy rendelő.</h2>
            <p className="noma-lede">
              Egy budai villa földszintjén, meszelt falak és nappali fény között. Egyszerre egy
              vendég van bent — nincs várakozás és nincs átfedés.
            </p>
          </div>
          <div className="noma-gallery">
            {GALLERY.map((shot) => (
              <figure className={`noma-shot ${shot.cls}`} key={shot.src}>
                <Image alt={shot.alt} fill sizes="(max-width: 900px) 92vw, 40vw" src={shot.src} />
              </figure>
            ))}
          </div>
        </section>

        {/* ── aki fogad ────────────────────────────────────────────────── */}
        <section className="noma-person" id="szakember">
          <div className="noma-person-media">
            <Image
              alt="Halász Bori kozmetikus a stúdió ablakánál"
              fill
              sizes="(max-width: 900px) 100vw, 58vw"
              src="/demo/liget-borstudio/kozmetikus.webp"
            />
          </div>
          <div className="noma-person-copy">
            <p className="noma-eyebrow">Aki fogad</p>
            <h2>Halász Bori</h2>
            <p>
              Tizenegy éve dolgozom bőrrel, hatodik éve itt. Nem hiszek a gyors eredményben, és nem
              is ígérem — az első kezelés inkább megismerés, mint csoda.
            </p>
            <p>
              Amit nem tudok megoldani kozmetikusként, arra megmondom, hogy bőrgyógyász kell hozzá.
              Ez ritkán szokott jólesni, de ettől lesz működő a rutinod.
            </p>
            <dl className="noma-person-facts">
              <div>
                <dt>11 év</dt>
                <dd>a szakmában</dd>
              </div>
              <div>
                <dt>1 vendég</dt>
                <dd>egyszerre a stúdióban</dd>
              </div>
              <div>
                <dt>Dermokozmetikus</dt>
                <dd>szakvizsga</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ── a Liget ritmusa ──────────────────────────────────────────── */}
        <section className="noma-rhythm">
          <div className="noma-head">
            <p className="noma-eyebrow light">A Liget ritmusa</p>
            <h2>90 perc, amikor nem kell sietned.</h2>
          </div>
          <ol className="noma-steps-list">
            {RHYTHM.map((item, index) => (
              <li key={item.title}>
                <span>{`0${index + 1}`}</span>
                <strong>{item.title}</strong>
                <p>{item.copy}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── vélemények ───────────────────────────────────────────────── */}
        <section className="noma-voices">
          <div className="noma-head center">
            <p className="noma-eyebrow">Vendégeink</p>
            <h2>98 értékelés, 4,9 átlag.</h2>
          </div>
          <div className="noma-voice-grid">
            {VOICES.map((voice) => (
              <blockquote key={voice.name}>
                <p>{voice.text}</p>
                <cite>
                  <strong>{voice.name}</strong>
                  <span>{voice.since}</span>
                </cite>
              </blockquote>
            ))}
          </div>
        </section>

        {/* ── hol vagyunk ──────────────────────────────────────────────── */}
        <section className="noma-where" id="hol">
          <div className="noma-where-media">
            <Image
              alt="A stúdió bejárata egy budai villa utcafrontján"
              fill
              sizes="(max-width: 900px) 100vw, 52vw"
              src="/demo/liget-borstudio/bejarat.webp"
            />
          </div>
          <div className="noma-where-copy">
            <p className="noma-eyebrow">Hol vagyunk</p>
            <h2>Keleti Károly utca 18.</h2>
            <dl>
              <div>
                <dt>Nyitvatartás</dt>
                <dd>
                  Kedd–péntek 9:00–19:00
                  <br />
                  Szombat 9:00–14:00
                  <br />
                  Vasárnap és hétfő zárva
                </dd>
              </div>
              <div>
                <dt>Megközelítés</dt>
                <dd>
                  Széll Kálmán tértől 6 perc séta
                  <br />
                  4-es, 6-os villamos: Széna tér
                </dd>
              </div>
              <div>
                <dt>Parkolás</dt>
                <dd>
                  Az utcában fizetős, de a kapu előtt
                  <br />
                  két hely a vendégeinké
                </dd>
              </div>
            </dl>
            <button className="noma-btn" onClick={() => openBooking(0)} type="button">
              Szabad időpontok
            </button>
          </div>
        </section>
      </main>

      <footer className="noma-footer">
        <a className="noma-logo" href="#top">
          Liget
          <span>bőrstúdió</span>
        </a>
        <p>1024 Budapest · Keleti Károly utca 18. · +36 1 555 0294</p>
        <small>Mintaprojekt · ProjectEdge</small>
      </footer>

      {bookingOpen && (
        <BookingFlow
          onClose={() => setBookingOpen(false)}
          onFinish={finish}
          startIndex={startIndex}
          treatments={TREATMENTS}
        />
      )}
    </div>
  );
}
