import type { Metadata } from "next";
import Image from "next/image";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { EffectsRail } from "@/components/EffectsRail";

export const metadata: Metadata = {
  title: "Munkák és projektbemutatók | ProjectEdge",
  description: "Egyedi weboldalak és full-stack rendszerek bemutatása: probléma, megoldás és technikai megvalósítás.",
  alternates: { canonical: "/munkak" }
};

const capabilities = [
  {
    dark: true,
    fx: "fx-aurora",
    eyebrow: "Háttér / motion",
    title: "Aurora háttér",
    copy: "Mozgó háttér, ami nem vonja el a figyelmet a szövegről.",
    stage: null
  },
  {
    dark: false,
    fx: "fx-tilt",
    eyebrow: "Interakció",
    title: "3D mélység",
    copy: "Vidd fölé az egered: a kártya megdől.",
    stage: (
      <div className="tilt-card">
        <span className="tilt-chip" />
        <span className="tilt-bar" />
        <span className="tilt-bar short" />
      </div>
    )
  },
  {
    dark: true,
    fx: "fx-scan",
    eyebrow: "Felület",
    title: "Holografikus fény",
    copy: "Fényhatás a sötét felületen.",
    stage: null
  },
  {
    dark: false,
    fx: "fx-gtext",
    eyebrow: "Tipográfia",
    title: "Élő gradiens cím",
    copy: "Színátmenet a kiemelt szavakon.",
    stage: <span className="gword">Edge.</span>
  },
  {
    dark: true,
    fx: "fx-glow",
    eyebrow: "Hangsúly",
    title: "Fénygyűrűk",
    copy: "Kiemelés, ami a gombra viszi a szemet.",
    stage: (
      <div className="glow-wrap">
        <span className="glow-core" />
        <span className="glow-ring" />
        <span className="glow-ring" />
        <span className="glow-ring" />
      </div>
    )
  },
  {
    dark: true,
    fx: "fx-border",
    eyebrow: "Keret",
    title: "Forgó gradiens-keret",
    copy: "Forgó fénykeret a kártya körül.",
    stage: (
      <div className="bcard">
        <span>Edge</span>
      </div>
    )
  }
];

const voices = [
  {
    feature: true,
    quote:
      "Nem sablonból dolgozom, és nem kell írogatnod, hogy hol tart. Belépsz, és látod, mi készült el és mi jön ezután.",
    name: "Átlátható munka",
    role: "tervezéstől az indításig"
  },
  {
    feature: false,
    quote:
      "Aki rákeres a szolgáltatásodra, megtalálja az oldalad, és két koppintással ír neked. Telefonon is.",
    name: "Eredményre tervezve",
    role: "sebesség + ügyfélszerzés"
  },
  {
    feature: false,
    quote:
      "Kényelmes folyamat: az ügyfélkapun indítod a projektet, követed a haladást és fizetsz. Felesleges körök és kötelező értekezletek nélkül.",
    name: "Kényelmes folyamat",
    role: "minden egy helyen"
  }
];

export default function WorkPage() {
  return (
    <main className="site-shell light-page">
      <SiteNav />

      <section className="page-hero compact">
        <p className="micro-label dark">Munkák</p>
        <h1>Nézd meg, mit építettem.</h1>
        <p>
          Egy éles full-stack rendszer és öt végigkattintható mintaprojekt — öt különböző üzleti célra.
        </p>
      </section>

      <section className="case-study">
        <div className="case-title-row">
          <div>
            <p className="micro-label dark">Éles full-stack rendszer / Checky.hu</p>
            <h2>Nem látványterv. Naponta használt rendszer.</h2>
          </div>
          <a className="case-live-link" href="https://checky.hu" rel="noreferrer" target="_blank">Élő oldal megnyitása ↗</a>
        </div>
        <a href="https://checky.hu" rel="noreferrer" target="_blank">
          <Image
            alt="Checky.hu weboldal referencia"
            className="case-shot"
            height={1662}
            sizes="(max-width: 1100px) calc(100vw - 36px), 1040px"
            src="/work/checky.png"
            width={2940}
          />
        </a>
        {/* Három különálló doboz helyett egy összefüggő, számozott narratíva:
            helyzet → megoldás → eredmény, összekötve. */}
        <div className="case-grid case-story">
          <article className="case-block">
            <span>A helyzet</span>
            <p>
              Nem bemutatkozó oldal kellett, hanem olyan felület, ahol a felhasználói folyamatok,
              az adatok és az üzleti logika egy rendszerben működnek.
            </p>
          </article>
          <article className="case-block">
            <span>A megoldás</span>
            <p>
              A felhasználói felülettől az adatkezelésig és a háttérfolyamatokig teljes egészében
              én terveztem és fejlesztettem a rendszert.
            </p>
          </article>
          <article className="case-block">
            <span>Az eredmény</span>
            <p>
              Egy élesben elérhető, bővíthető termék született — nem különálló oldalak, hanem
              egymásra épülő, végigvezetett folyamatok.
            </p>
          </article>
        </div>
        {/* Korábban három nagy színes tábla volt, köztük egy türkiz — kilógott
            a lap színvilágából. Most egy sáv, függőleges elválasztókkal. */}
        <div className="case-facts">
          <div className="case-fact">
            <strong>Éles</strong>
            <span>valós felhasználóknak készült rendszer</span>
          </div>
          <div className="case-fact">
            <strong>Full-stack</strong>
            <span>felület, adat és háttérfolyamat együtt</span>
          </div>
          <div className="case-fact">
            <strong>End-to-end</strong>
            <span>tervezéstől az éles indulásig</span>
          </div>
        </div>
        <div className="case-project-link-row"><TransitionLink className="button primary" href="/munkak/checky">Így épült a Checky</TransitionLink></div>
      </section>

      <section className="demos-section">
        <div className="section-head">
          <p className="micro-label dark">Mintaprojektek</p>
          <h2>Öt teljes oldal, végigkattintható.</h2>
          <p>
            A márkák kitaláltak, a felületek és az interakciók viszont működnek. Válaszd azt, amelyik
            a te üzleti célodhoz áll a legközelebb.
          </p>
        </div>

        <div className="demo-role-map">
          <article><span>01 / SaaS</span><strong>Veyra</strong><p>Termékbemutatás, dashboard UI, interaktív árazás és mozgás.</p></article>
          <article><span>02 / Webshop</span><strong>Zamat</strong><p>Termékvariánsok, kosár, termékoldalak és megőrzött állapot.</p></article>
          <article><span>03 / Lead</span><strong>Varga Villany</strong><p>Helyi ügyfélszerzés, árkalkulátor, körzetellenőrzés és gyors ajánlatkérés.</p></article>
          <article><span>04 / Foglalás</span><strong>Liget</strong><p>Prémium márka és teljes, több lépéses időpontfoglalási folyamat.</p></article>
          <article><span>05 / Katalógus</span><strong>Budai Otthonok</strong><p>Szűrés, mentés, részletes adatlap, hitelbecslés és érdeklődés.</p></article>
        </div>

        <div className="demos-grid">
          <article className="demo-card">
            <TransitionLink className="demo-preview veyra" href="/demo/veyra">
              <span className="demo-tag">Mintaprojekt</span>
              <span className="demo-goal">SAAS + DASHBOARD</span>
              <Image alt="Veyra SaaS termékoldal előnézete" height={900} sizes="(max-width: 760px) calc(100vw - 36px), 50vw" src="/work/demos/veyra.webp" width={1440} />
            </TransitionLink>
            <div className="demo-body">
              <span className="demo-kind">Landing page</span>
              <h3>Veyra — SaaS termékoldal</h3>
              <p>
                Egy foglalórendszer bemutatkozó oldala. Sötét, mozgalmas, de a szöveg marad a
                főszereplő.
              </p>
              <ul className="demo-points">
                <li>Termékstratégia és dashboard felület</li>
                <li>Interaktív árazás, állapotkezelés és GYIK</li>
                <li>Animációk és összetett, kódból rajzolt UI</li>
              </ul>
              <TransitionLink className="button ghost" href="/demo/veyra">
                Megnézem élőben
              </TransitionLink>
            </div>
          </article>

          <article className="demo-card">
            <TransitionLink className="demo-preview zamat" href="/demo/zamat">
              <span className="demo-tag">Mintaprojekt</span>
              <span className="demo-goal">WEBSHOP + KOSÁR</span>
              <Image alt="Zamat kávéwebshop előnézete" height={900} sizes="(max-width: 760px) calc(100vw - 36px), 50vw" src="/work/demos/zamat.webp" width={1440} />
            </TransitionLink>
            <div className="demo-body">
              <span className="demo-kind">Webáruház</span>
              <h3>Zamat — kávépörkölő webshop</h3>
              <p>
                Teljes vásárlási út: terméklista, termékoldal és működő kosár. A kosár tartalma az
                újratöltést is túléli.
              </p>
              <ul className="demo-points">
                <li>Valódi kosárlogika, variánsokkal és mennyiséggel</li>
                <li>Külön termékoldalak, kapcsolódó termékekkel</li>
                <li>Újratöltés után is megmaradó kosár és előfizetés</li>
              </ul>
              <TransitionLink className="button ghost" href="/demo/zamat">
                Megnézem élőben
              </TransitionLink>
            </div>
          </article>

          <article className="demo-card">
            <TransitionLink className="demo-preview fixora" href="/demo/varga-villany">
              <span className="demo-tag">Mintaprojekt</span>
              <span className="demo-goal">ÉRDEKLŐDŐSZERZÉS</span>
              <Image alt="Varga Villanyszerelés oldal előnézete" height={900} sizes="(max-width: 760px) calc(100vw - 36px), 50vw" src="/work/demos/varga-villany.webp" width={1440} />
            </TransitionLink>
            <div className="demo-body">
              <span className="demo-kind">Helyi szolgáltató + ajánlatkérés</span>
              <h3>Varga Villanyszerelés</h3>
              <p>Bizalomépítő szolgáltatói oldal, ami a látogatót egy perc alatt konkrét ajánlatkérésig vezeti.</p>
              <ul className="demo-points"><li>Működő, szolgáltatásalapú árbecslő</li><li>Irányítószámos kiszállási körzetellenőrzés</li><li>Helyi bizalmi elemek és projektbemutató</li></ul>
              <TransitionLink className="button ghost" href="/demo/varga-villany">Megnézem élőben</TransitionLink>
            </div>
          </article>

          <article className="demo-card">
            <TransitionLink className="demo-preview noma" href="/demo/liget-borstudio">
              <span className="demo-tag">Mintaprojekt</span>
              <span className="demo-goal">IDŐPONTFOGLALÁS</span>
              <Image alt="Liget Bőrstúdió oldal előnézete" height={900} sizes="(max-width: 760px) calc(100vw - 36px), 50vw" src="/work/demos/liget-borstudio.webp" width={1440} />
            </TransitionLink>
            <div className="demo-body">
              <span className="demo-kind">Szépségstúdió + online foglalás</span>
              <h3>Liget Bőrstúdió</h3>
              <p>Nyugodt, magazinos márkaoldal valódi, több lépéses szolgáltatás- és időpontválasztással.</p>
              <ul className="demo-points"><li>Kezelés-, nap-, időpont- és szakemberválasztás</li><li>Kapcsolati adatokkal záruló foglalási folyamat</li><li>Prémium arculat saját vizuális világgal</li></ul>
              <TransitionLink className="button ghost" href="/demo/liget-borstudio">Megnézem élőben</TransitionLink>
            </div>
          </article>

          <article className="demo-card demo-card-wide">
            <TransitionLink className="demo-preview nest" href="/demo/budai-otthonok">
              <span className="demo-tag">Mintaprojekt</span>
              <span className="demo-goal">KERESÉS + KATALÓGUS</span>
              <Image alt="Budai Otthonok ingatlankatalógus előnézete" height={900} sizes="(max-width: 760px) calc(100vw - 36px), 100vw" src="/work/demos/budai-otthonok.webp" width={1440} />
            </TransitionLink>
            <div className="demo-body">
              <span className="demo-kind">Ingatlankatalógus + mentés</span>
              <h3>Budai Otthonok</h3>
              <p>Kereshető prémium kínálat külön ingatlanfotókkal és teljes, felugró részletes adatlappal.</p>
              <ul className="demo-points"><li>Összetett szűrés, rendezés és mentett nézet</li><li>Részletmodal alaprajzzal és felszereltséggel</li><li>Hitelbecslő és megtekintési érdeklődés</li></ul>
              <TransitionLink className="button ghost" href="/demo/budai-otthonok">Megnézem élőben</TransitionLink>
            </div>
          </article>
        </div>

        <p className="cap-note">
          A fizetés és az adatküldés a demókban nincs élesítve — a te oldaladon természetesen lehet.
        </p>
      </section>

      <section className="cap-section">
        <div className="section-head">
          <p className="micro-label dark">Vizuális részletek</p>
          <h2>A működés mellé karakter is jár.</h2>
          <p>
            A jó felület először használható, aztán emlékezetes. Ezekből a finom, élő részletekből
            csak annyit használok, amennyi a márkádat erősíti.
          </p>
        </div>
        <EffectsRail capabilities={capabilities} />
        <p className="cap-note">
          Ezek példák. A tiédhez a márkádhoz illőt építek.
        </p>
      </section>

      <section className="voices-section">
        <div className="section-head">
          <p className="micro-label dark">Így dolgozom</p>
          <h2>Három vállalásom minden projektnél.</h2>
        </div>
        <div className="voices-grid">
          {voices.map((voice) => (
            <article className={`voice-card ${voice.feature ? "feature" : ""}`} key={voice.name}>
              <blockquote>{voice.quote}</blockquote>
              <div className="voice-author">
                <div>
                  <strong>{voice.name}</strong>
                  <span>{voice.role}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <h2>Van egy ötleted vagy egy meglévő oldalad? Abból el lehet indulni.</h2>
        <TransitionLink className="button primary" href="/ugyfelkapu">
          Beszéljünk róla
        </TransitionLink>
      </section>
    </main>
  );
}
