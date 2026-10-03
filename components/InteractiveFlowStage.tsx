"use client";

import { useState, useRef, type ReactNode } from "react";
import { ShaderBackdrop } from "@/components/ShaderBackdrop";
import {
  IconMessageCircle,
  IconPackage,
  IconWrench,
  IconLock,
  IconZap,
  IconKey,
  IconCheck,
  IconCode,
  IconShield,
  IconGlobe,
  IconFileText,
  IconServer,
  IconChevronLeft,
  IconChevronRight
} from "@/components/icons";


interface StepDetail {
  number: string;
  title: string;
  shortDesc: string;
  badge: string;
  scene: ReactNode;
}

const BERLES_DATA: StepDetail[] = [
  {
    number: "01",
    title: "Csomagválasztás",
    shortDesc: "Kitöltöd a brief adatlapot, és kiválasztod a céljaidhoz illő konstrukciót.",
    badge: "15 perc",
    scene: (
      <div className="stage-hud-card">
        <div className="hud-header">
          <span className="hud-header-icon"><IconFileText size={18} /></span>
          <span className="hud-title">Adatlap és csomag</span>
          <span className="hud-badge">Online</span>
        </div>
        <div className="hud-body">
          <div className="hud-checklist">
            <div className="hud-check-row is-done">
              <span className="hud-check-box"><IconCheck size={13} /></span>
              <span>Weboldal célja: új megkeresések és ügyfélszerzés</span>
            </div>
            <div className="hud-check-row is-done">
              <span className="hud-check-box"><IconCheck size={13} /></span>
              <span>Választott forma: havidíjas bérlés</span>
            </div>
            <div className="hud-check-row">
              <span className="hud-check-box is-muted"><IconCheck size={13} /></span>
              <span>Meglévő anyagok, szövegek és logó átadása</span>
            </div>
          </div>
        </div>
        <div className="hud-footer">
          <span className="hud-metric-label">Átlagos időigény</span>
          <span className="hud-metric-val">15 perc kitöltés</span>
        </div>
      </div>
    )
  },
  {
    number: "02",
    title: "Digitális szerződés",
    shortDesc: "Elfogadod a szerződést az ügyfélkapun — ez indítja az építést, fizetés nélkül.",
    badge: "Ügyfélkapu",
    scene: (
      <div className="stage-hud-card">
        <div className="hud-header">
          <span className="hud-header-icon"><IconShield size={18} /></span>
          <span className="hud-title">Digitális szerződés</span>
          <span className="hud-badge">Online elfogadás</span>
        </div>
        <div className="hud-body">
          <div className="hud-seal-box">
            <div className="hud-seal-icon"><IconFileText size={24} /></div>
            <div className="hud-seal-text">
              <strong>ProjectEdge szolgáltatási szerződés</strong>
              <small>Átlátható havidíj és rögzített vételár. Ha megveszed, a befizetett havidíjad fele beszámít.</small>
            </div>
          </div>
          <div className="hud-tag-group">
            <span className="hud-pill hud-pill-ember">Nincs hűségidő</span>
            <span className="hud-pill hud-pill-aqua">Nincs előleg</span>
          </div>
        </div>
        <div className="hud-footer">
          <span className="hud-metric-label">Jóváhagyás</span>
          <span className="hud-metric-val">Online az ügyfélkapun</span>
        </div>
      </div>
    )
  },
  {
    number: "03",
    title: "Az oldal egyedi építése",
    shortDesc: "Megépítem mobilra tervezve, gyorsnak, és úgy, hogy könnyű legyen megkeresni téged.",
    badge: "Nem sablon",
    scene: (
      <div className="stage-hud-card">
        <div className="hud-header">
          <span className="hud-header-icon"><IconCode size={18} /></span>
          <span className="hud-title">Építés</span>
          <span className="hud-badge">Ügyfélkapun követhető</span>
        </div>
        <div className="hud-body">
          <div className="hud-code-box">
            <div className="hud-code-line"><IconCheck size={14} /> Egyedi, mobilra tervezett megjelenés, nem sablon</div>
            <div className="hud-code-line"><IconCheck size={14} /> Gyors betöltés és Google-barát felépítés</div>
            <div className="hud-code-line"><IconCheck size={14} /> Hívás- és ajánlatkérő gomb ott, ahol keresik</div>
            <div className="hud-code-line"><IconCheck size={14} /> Az ügyfélkapun végig látod, hol tartok</div>
          </div>
        </div>
        <div className="hud-footer">
          <span className="hud-metric-label">Időigény</span>
          <span className="hud-metric-val">2–14 munkanap, csomagtól függően</span>
        </div>
      </div>
    )
  },
  {
    number: "04",
    title: "Előnézet és jóváhagyás",
    shortDesc: "Privát linken megnézed a működő oldalt, elvégzem a kért módosításokat.",
    badge: "Te döntesz",
    scene: (
      <div className="stage-hud-card">
        <div className="hud-header">
          <span className="hud-header-icon"><IconGlobe size={18} /></span>
          <span className="hud-title">Privát előnézet</span>
          <span className="hud-badge">Csak neked</span>
        </div>
        <div className="hud-body">
          <div className="hud-preview-mockup">
            <div className="hud-browser-bar">
              <span className="hud-browser-badge"><IconShield size={13} /> Privát link</span>
              <span className="hud-browser-url">preview.projectedge.hu/demo</span>
            </div>
            <div className="hud-preview-content">
              <span className="hud-review-pin"><IconCheck size={14} /> Átnézed a kész, interaktív oldalt</span>
              <span className="hud-review-stamp">Csak a jóváhagyásoddal élesül</span>
            </div>
          </div>
        </div>
        <div className="hud-footer">
          <span className="hud-metric-label">Irányítás</span>
          <span className="hud-metric-val">Nálad a döntés</span>
        </div>
      </div>
    )
  },
  {
    number: "05",
    title: "Fizetés, ha tetszik",
    shortDesc: "Csak a kész, általad jóváhagyott oldalért fizetsz — előtte egy forintot sem.",
    badge: "0 Ft előleg",
    scene: (
      <div className="stage-hud-card">
        <div className="hud-header">
          <span className="hud-header-icon"><IconLock size={18} /></span>
          <span className="hud-title">Fizetés a végén</span>
          <span className="hud-badge">0 Ft előleg</span>
        </div>
        <div className="hud-body">
          <div className="hud-price-breakdown">
            <div className="hud-price-row">
              <span>Előleg, foglaló, belépési díj:</span>
              <span className="hud-free-pill">0 Ft</span>
            </div>
            <div className="hud-price-row is-highlight">
              <span>Első díj:</span>
              <span className="hud-highlight-text">Csak a jóváhagyásod után — utána élesítem</span>
            </div>
          </div>
        </div>
        <div className="hud-footer">
          <span className="hud-metric-label">Ha nem tetszik</span>
          <span className="hud-metric-val">Nem fizetsz</span>
        </div>
      </div>
    )
  },
  {
    number: "06",
    title: "Élesítés és üzemeltetés",
    shortDesc: "Élesbe állítom a domaineden. A havidíjban benne van a domain, a tárhely, a frissítések és a folyamatos felügyelet.",
    badge: "Élesben fut",
    scene: (
      <div className="stage-hud-card">
        <div className="hud-header">
          <span className="hud-header-icon"><IconServer size={18} /></span>
          <span className="hud-title">Élő oldal</span>
          <span className="hud-badge hud-badge-green">Aktív</span>
        </div>
        <div className="hud-body">
          <div className="hud-live-metrics">
            <div className="hud-live-metric">
              <span className="hud-lm-val">Napi</span>
              <span className="hud-lm-lbl">Működésfigyelés</span>
            </div>
            <div className="hud-live-metric">
              <span className="hud-lm-val">1 munkanap</span>
              <span className="hud-lm-lbl">Hibára reagálok</span>
            </div>
            <div className="hud-live-metric">
              <span className="hud-lm-val">Benne van</span>
              <span className="hud-lm-lbl">Domain, tárhely, SSL</span>
            </div>
          </div>
        </div>
        <div className="hud-footer">
          <span className="hud-metric-label">Hűségidő</span>
          <span className="hud-metric-val">Nincs, bármikor lemondható</span>
        </div>
      </div>
    )
  }
];

const VASARLAS_DATA: StepDetail[] = [
  { title: "Csomag és adatlap", description: "A Jelenlét, Üzleti vagy Egyedi csomagot választod, és leírod, mire van szükséged.", badge: "Egyszeri díj" },
  { title: "Ajánlat és szerződés", description: "Az ügyfélkapuban rögzítjük a tartalmat, a vételárat és a határidőt. A szerződés után 10 000 Ft foglaló indítja az építést; ez a vételár része.", badge: "Írásban rögzítve" },
  { title: "Elkészítés és jóváhagyás", description: "Privát előnézeti linken átnézed az oldalt, és jelzed a módosításokat. Csak a jóváhagyásod után élesítem.", badge: "Nálad a döntés" },
  { title: "Végső fizetés és átadás", description: "Jóváhagyás és élesítés után rendezed a fennmaradó vételárat. Ezután a forráskód és a hozzáférések a saját fiókjaidba kerülnek.", badge: "Saját tulajdon" },
  { title: "Indulás után", description: "Az átadás lezárásától 30 nap díjmentes technikai hibajavítás jár. A domain, a tárhely, a külső szolgáltatások és a későbbi karbantartás költsége külön tétel.", badge: "30 nap hibajavítás" }
].map((step, index) => ({
  number: `0${index + 1}`, title: step.title, shortDesc: step.description, badge: step.badge,
  scene: <div className="stage-hud-card"><div className="hud-header"><span className="hud-header-icon"><IconKey size={18} /></span><span className="hud-title">{step.title}</span><span className="hud-badge">{step.badge}</span></div><div className="hud-body"><p className="hud-statement">{step.description}</p></div><div className="hud-footer"><span className="hud-metric-label">Konstrukció</span><span className="hud-metric-val">Egyszeri vásárlás</span></div></div>
}));

const GUARANTEES = [
  {
    badge: "Ügyfélkapu",
    title: "Folyamatos kapcsolat",
    desc: "Minden egyeztetés az ügyfélkapun él. Nem vész el semmi emailben.",
    icon: IconMessageCircle,
  },
  {
    badge: "Forráskód",
    title: "Kétféle befejezés",
    desc: "Bérlésnél én kezelem tovább, vételkor a teljes forráskód és domain a tiéd.",
    icon: IconPackage,
  },
  {
    badge: "Felügyelet",
    title: "Indulás után is",
    desc: "Havidíjnál folyamatos felügyelet; vásárlásnál az átadástól 30 nap technikai hibajavítás.",
    icon: IconWrench,
  },
  {
    badge: "Átlátható fizetés",
    title: "Előre rögzített feltételek",
    desc: "Havidíjnál csak a jóváhagyott oldalért fizetsz. Vásárlásnál 10 000 Ft foglalóval indul az építés.",
    icon: IconLock,
  },
];

export function InteractiveFlowStage() {
  const [activeTab, setActiveTab] = useState<"berles" | "kivasarlas">("berles");
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWheelTime = useRef(0);

  /* Itt korábban egy `scrollIntoView` futott az aktív lépéskártyára. Két oka
     volt, hogy ki kellett venni:

     1. Már az első rendereléskor lefutott (`activeStepIndex` 0-ról indul), és
        a `block: "nearest"` is elgörgeti az OLDALT, ha a lépéssáv a hajtás
        alatt van — ezért ugrott le magától a /folyamat oldal betöltéskor.
     2. Az `inline: "center"` amúgy sem csinált semmit: a `.stage-steps-list`
        függőleges oszlop (`flex-direction: column`), nem vízszintes sáv, és
        mobilon a `.stage-stepper-track` teljesen rejtett.

     Ráadásul a görgős lépésváltással (`handleWheel`) harcolt: a kerék
     léptetett egyet, az effekt meg visszarántotta az oldalt. A kártyák
     desktopon amúgy is a bal oszlopban állnak, tehát nincs mit láthatóvá
     tenni. */

  const currentData = activeTab === "berles" ? BERLES_DATA : VASARLAS_DATA;
  const currentStep = currentData[activeStepIndex] || currentData[0];

  const handleTabChange = (tab: "berles" | "kivasarlas") => {
    setActiveTab(tab);
    setActiveStepIndex(0);
  };

  const goToStep = (idx: number) => {
    if (idx >= 0 && idx < currentData.length) {
      setActiveStepIndex(idx);
    }
  };

  const handlePrev = () => {
    if (activeStepIndex > 0) {
      goToStep(activeStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeStepIndex < currentData.length - 1) {
      goToStep(activeStepIndex + 1);
    }
  };

  // Finom, smooth görgetési élmény a komponens felett
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTime.current < 420) return;

    if (e.deltaY > 38) {
      if (activeStepIndex < currentData.length - 1) {
        goToStep(activeStepIndex + 1);
        lastWheelTime.current = now;
      }
    } else if (e.deltaY < -38) {
      if (activeStepIndex > 0) {
        goToStep(activeStepIndex - 1);
        lastWheelTime.current = now;
      }
    }
  };

  // Touch swipe gesztusok kezelése mobilon
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    // Vízszintes lapozás érzékelése
    if (Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      handleNext();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      handlePrev();
    }
  };

  return (
    <section 
      className={`interactive-stage-section is-tab-${activeTab}`} 
      ref={containerRef}
      onWheel={handleWheel}
    >
      {/* Művészi WebGL Shader háttér */}
      <ShaderBackdrop variant="mesh" />
      <div className="stage-shader-vignette" aria-hidden="true" />

      <div className="stage-container">
        {/* Fejléc: Tiszta, hiteles ProjectEdge stílus */}
        <header className="stage-head">
          <p className="micro-label">Két útvonal</p>
          <h2 className="stage-main-title">
            Havidíjjal vagy saját weboldallal indulsz.
          </h2>
          <p className="stage-lead">
            Havidíjnál én kezelem a működtetést. Egyszeri vásárlásnál a kész oldal a saját
            fiókjaidba kerül. A havidíjas oldal később is kivásárolható, a befizetett díjak részbeni beszámításával.
          </p>

          {/* Útvonal Kapcsoló Lucide ikonokkal */}
          <div className="stage-switcher-wrap" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "berles"}
              className={`stage-switch-btn switch-berles ${activeTab === "berles" ? "is-active" : ""}`}
              onClick={() => handleTabChange("berles")}
            >
              <span className="switch-icon"><IconZap size={18} /></span>
              <div className="switch-text">
                <strong>01. Havidíjas bérlés</strong>
                <small>0 Ft előleg · folyamatos üzemeltetés</small>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "kivasarlas"}
              className={`stage-switch-btn switch-kivasarlas ${activeTab === "kivasarlas" ? "is-active" : ""}`}
              onClick={() => handleTabChange("kivasarlas")}
            >
              <span className="switch-icon"><IconKey size={18} /></span>
              <div className="switch-text">
                <strong>02. Egyszeri vásárlás</strong>
                <small>Saját tulajdon · forráskód és hozzáférések</small>
              </div>
            </button>
          </div>
        </header>

        {/* Interaktív Kétoszlopos Mag: Lépéskártyák + Vizuális Színpad */}
        <div className="stage-interactive-core">
          {/* Bal oszlop: Letisztult Lépéskártyák (Asztali nézetben) */}
          <div className="stage-stepper-track">
            <div className="stage-steps-list" role="tablist">
              {currentData.map((step, idx) => {
                const isActive = idx === activeStepIndex;

                return (
                  <button
                    key={step.number}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`stage-step-card ${isActive ? "is-active" : ""}`}
                    onClick={() => goToStep(idx)}
                  >
                    <div className="stage-step-card-lead">
                      <span className="stage-step-num-pill">{step.number}</span>
                      <span className="stage-step-badge">{step.badge}</span>
                    </div>

                    <div className="stage-step-card-main">
                      <span className="stage-step-title">{step.title}</span>
                      <p className="stage-step-short">{step.shortDesc}</p>
                    </div>

                    {isActive && (
                      <div className="stage-step-active-accent" aria-hidden="true" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Jobb oszlop: Vizuális Vászon érintéses húzással és stabil magassággal */}
          <div 
            className="stage-visual-canvas"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            role="region"
            aria-label="Lépés vizuális részletei"
          >
            <div className="stage-canvas-top-bar">
              <div className="stage-canvas-progress-track">
                <div 
                  className="stage-canvas-progress-fill" 
                  style={{ width: `${((activeStepIndex + 1) / currentData.length) * 100}%` }}
                />
              </div>
              <div className="stage-canvas-meta-row">
                <span>{activeTab === "berles" ? "Bérlés" : "Kivásárlás"}</span>
                <span className="stage-swipe-hint">Ujjal húzva is lapozható</span>
                <span className="stage-canvas-counter">
                  {currentStep.number} / 0{currentData.length}
                </span>
              </div>
            </div>

            <div className="stage-canvas-content" key={`${activeTab}-${activeStepIndex}`}>
              {/* Mobilon közvetlenül a vászonban mutatjuk a címet és leírást */}
              <div className="stage-mobile-step-banner">
                <div className="stage-mobile-banner-top">
                  <span className="stage-step-num-pill">{currentStep.number}</span>
                  <h3 className="stage-mobile-step-title">{currentStep.title}</h3>
                  <span className="stage-step-badge">{currentStep.badge}</span>
                </div>
                <p className="stage-mobile-step-desc">{currentStep.shortDesc}</p>
              </div>

              {currentStep.scene}
            </div>

            <div className="stage-canvas-footer-nav">
              <button
                type="button"
                className="stage-nav-arrow-btn"
                onClick={handlePrev}
                disabled={activeStepIndex === 0}
                aria-label="Előző lépés"
              >
                <IconChevronLeft size={16} />
                <span>Előző</span>
              </button>

              <div className="stage-canvas-quick-pills" role="tablist" aria-label="Lépés választó">
                {currentData.map((s, i) => (
                  <button
                    key={s.number}
                    type="button"
                    role="tab"
                    aria-selected={i === activeStepIndex}
                    className={`stage-mini-pill ${i === activeStepIndex ? "is-active" : ""}`}
                    onClick={() => goToStep(i)}
                    aria-label={`Ugrás a(z) ${s.number}. lépésre`}
                  />
                ))}
              </div>

              <button
                type="button"
                className="stage-nav-arrow-btn is-next"
                onClick={handleNext}
                disabled={activeStepIndex === currentData.length - 1}
                aria-label="Következő lépés"
              >
                <span>Következő</span>
                <IconChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 21st.dev stílusú Folyamatos Garancia Szalag (Smooth Marquee) a 4 statikus kártya helyett */}
        <div className="stage-guarantee-ribbon" aria-label="Szolgáltatási garanciák">
          <div className="stage-marquee-window">
            <div className="stage-marquee-track">
              {[...GUARANTEES, ...GUARANTEES].map((item, idx) => {
                const ItemIcon = item.icon;
                return (
                  <div 
                    className="stage-marquee-card" 
                    key={`${item.badge}-${idx}`}
                    aria-hidden={idx >= GUARANTEES.length ? "true" : undefined}
                  >
                    <span className="marquee-badge">{item.badge}</span>
                    <span className="marquee-icon"><ItemIcon size={14} /></span>
                    <strong className="marquee-title">{item.title}</strong>
                    <span className="marquee-sep" aria-hidden="true">·</span>
                    <span className="marquee-desc">{item.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
