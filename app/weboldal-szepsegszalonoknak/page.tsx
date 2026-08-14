import type { Metadata } from "next";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { PriceEstimator } from "@/components/PriceEstimator";
import { JsonLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Weboldal készítés kozmetikusoknak és szépségszalonoknak | ProjectEdge",
  description:
    "Elegáns weboldal és automatikus időpontfoglaló szépségipari szakembereknek. Nem kell többé este a Messengeren egyeztetned — a vendégeid maguk foglalnak.",
  alternates: { canonical: "/weboldal-szepsegszalonoknak" }
};

export default function SzepsegiparPage() {
  return (
    <main className="site-shell light-page industry-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Weboldal készítés szépségszalonoknak és kozmetikusoknak",
          description:
            "Prémium weboldal és online időpontfoglaló kozmetikáknak, szépségszalonoknak és esztétikai szakembereknek.",
          provider: { "@id": "https://www.projectedge.hu/#business" },
          areaServed: { "@type": "Country", name: "Magyarország" },
          url: "https://www.projectedge.hu/weboldal-szepsegszalonoknak"
        }}
      />
      <SiteNav />

      {/* Hero */}
      <section className="industry-hero">
        <div className="industry-hero-copy">
          <p className="micro-label dark">Szépségipar & Kozmetika · Weboldal és foglaló</p>
          <h1>A vendégeid maguk foglalnak. Te a munkádra figyelsz.</h1>
          <p className="industry-hero-lead">
            Nem kell többé este 10-kor vagy vasárnap ebéd közben üzenetekben sakkoznod a szabad
            időpontokkal. Olyan elegáns, letisztult oldalt építek neked, ahol a vendég megnézi a
            szolgáltatásaidat, az áraidat, és 1 perc alatt lefoglalja a szabad időpontot.
          </p>
          <div className="hero-command">
            <a className="button primary" href="#arak">Csomagok és árak</a>
            <TransitionLink className="button spectral" href="/demo/liget-borstudio">
              Kattints bele az élő demóba →
            </TransitionLink>
          </div>
        </div>

        <div className="industry-hero-stage">
          <div className="industry-mockup-window">
            <div className="industry-window-bar">
              <span /><span /><span />
              <b>liget-borstudio / online foglalás</b>
            </div>
            <div className="industry-mockup-media">
              <Image
                alt="Liget Bőrstúdió online időpontfoglaló felület"
                height={780}
                priority
                sizes="(max-width: 900px) calc(100vw - 36px), 48vw"
                src="/work/demos/liget-borstudio.webp"
                width={1280}
              />
            </div>
            <div className="industry-stage-badge">
              <small>MŰKÖDŐ MINTAPROJEKT</small>
              <strong>Liget Bőrstúdió</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Pain points vs Solutions */}
      <section className="industry-reality">
        <div className="section-head">
          <p className="micro-label dark">Valós mindennapok</p>
          <h2>Ismerős helyzetek a szalonból?</h2>
          <p>
            A legtöbb szépségipari szakember rengeteg energiát veszít az adminisztrációval. Így tesszük
            ezt rendbe:
          </p>
        </div>

        <div className="reality-grid">
          <article className="reality-card">
            <span className="reality-tag bad">A PROBLÉMA</span>
            <h3>„Mikor érsz rá jövő héten?”</h3>
            <p>
              Öt üzenetváltás oda-vissza, mire sikerül közös időpontot találni. Munka közben csörög a
              telefon, este pedig órák mennek el a naptár egyeztetésével.
            </p>
            <div className="reality-fix">
              <strong>A megoldás:</strong>
              <span>A naptárad automatikusan frissül, a vendég csak a valóban szabad helyek közül választhat.</span>
            </div>
          </article>

          <article className="reality-card">
            <span className="reality-tag bad">A PROBLÉMA</span>
            <h3>Az utolsó pillanatban lemondott időpontok</h3>
            <p>
              A vendég elfelejti, vagy fél órával előtte szól. Kiesik a bevételed, a felszabadult helyre
              pedig már nem tudsz mást behívni.
            </p>
            <div className="reality-fix">
              <strong>A megoldás:</strong>
              <span>Automatikus visszaigazoló email és naptáresemény, pontos lemondási szabályokkal.</span>
            </div>
          </article>

          <article className="reality-card">
            <span className="reality-tag bad">A PROBLÉMA</span>
            <h3>„Mennyibe kerül a kezelés?”</h3>
            <p>
              Nincs egy helyen elérhető, egyértelmű árlista és kezelési leírás, ezért minden érdeklődőnek
              külön kell elmagyarázni a részleteket.
            </p>
            <div className="reality-fix">
              <strong>A megoldás:</strong>
              <span>Áttekinthető szolgáltatás-menü, időtartamokkal, árakkal és kezelési folyamatleírással.</span>
            </div>
          </article>
        </div>
      </section>

      {/* Demo callout */}
      <section className="industry-demo-banner">
        <div className="demo-banner-content">
          <span className="demo-banner-kicker">PRÉMIUM ÉLMÉNY · KIPRÓBÁLHATÓ</span>
          <h2>Nézd meg a Liget Bőrstúdió működő mintaprojektet!</h2>
          <p>
            Nem csak egy kép: a felületen végig tudod kattintani a teljes kezelésválasztást, a naptári
            időpontfoglalást és a vendégadatok megadását.
          </p>
          <TransitionLink className="button primary" href="/demo/liget-borstudio">
            Élő időpontfoglaló kipróbálása →
          </TransitionLink>
        </div>
      </section>

      {/* Feature pillars */}
      <section className="industry-pillars">
        <div className="section-head">
          <p className="micro-label dark">Amit kapsz</p>
          <h2>Minden részlet a te márkádat építi.</h2>
        </div>

        <div className="pillars-grid">
          <article className="pillar-card">
            <span>01 / DESIGN</span>
            <h3>Prémium vizuális világ</h3>
            <p>
              Meleg, elegáns tipográfia és letisztult térközök. Nem olcsó sablon kinézet: olyan
              megjelenés, ami azonnal tükrözi a munkád minőségét.
            </p>
          </article>

          <article className="pillar-card">
            <span>02 / MOBIL</span>
            <h3>100% mobilra tervezve</h3>
            <p>
              A vendégeid 90%-a telefonról fogja megnyitni az oldalt (pl. Instagram bióból). A foglalás
              mobil képernyőn is gyors, kényelmes és egyértelmű.
            </p>
          </article>

          <article className="pillar-card">
            <span>03 / GONDOSKODÁS</span>
            <h3>Nincs technikai teendőd</h3>
            <p>
              Bérlés esetén a domaint, a biztonságot, a frissítéseket és a felügyeletet is én intézem.
              Ha változik egy árad vagy új szolgáltatásod van, megcsinálom neked.
            </p>
          </article>
        </div>
      </section>

      {/* Pricing */}
      <section className="industry-pricing-wrap">
        <div className="section-head">
          <p className="micro-label dark">Árak & Csomagok</p>
          <h2>Béreld induló díj nélkül, vagy vedd meg egyszeri díjért.</h2>
          <p>
            Válaszd a havidíjas menedzselt modellt (ahol minden terhet leveszek a válladról), vagy
            kérj egyszeri saját tulajdonú weboldalt.
          </p>
        </div>
        <PriceEstimator />
      </section>

      {/* FAQ */}
      <section className="faq-section">
        <div className="section-head">
          <p className="micro-label dark">Gyakori kérdések</p>
          <h2>Kérdések szépségipari weboldalakhoz.</h2>
        </div>
        <div className="faq-list">
          <details className="faq-item">
            <summary>Össze tudjuk kötni a meglévő naptárammal vagy Instagramommal?</summary>
            <p>
              Igen. Az oldal linkjét közvetlenül kiteheted az Instagram, Facebook vagy TikTok profilodba,
              és a foglalási folyamat közvetlenül a te email címedre vagy naptáradba küldi az értesítéseket.
            </p>
          </details>
          <details className="faq-item">
            <summary>Mi van, ha még nincsenek profi fotóim?</summary>
            <p>
              Segítek kiválasztani a hangulathoz illő minőségi képi elemeket, és ha később készíttetsz
              saját fotókat a szalonról vagy a munkáidról, díjmentesen kicserélem őket az oldalon.
            </p>
          </details>
          <details className="faq-item">
            <summary>Mennyi idő alatt készül el az oldal?</summary>
            <p>
              A választott csomagtól és a tartalomtól függően jellemzően 3–7 munkanapon belül elkészül
              az éles, működő weboldalad.
            </p>
          </details>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band">
        <h2>Szeretnél egy olyan oldalt, ami önállóan gyűjti az időpontokat?</h2>
        <TransitionLink className="button primary" href="/#projektbrief">
          Projekt indítása az online briefből
        </TransitionLink>
      </section>
    </main>
  );
}
