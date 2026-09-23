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
import {
  buyoutCreditMonths,
  buyoutFloorPrice,
  formatHuf,
  PURCHASE_OPTION_PRICES,
  SUBSCRIPTION_PLANS
} from "@/lib/subscriptions";

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

const KIVASARLAS_DATA: StepDetail[] = [
  {
    number: "01",
    title: "Az oldalad már élesben termel",
    shortDesc: "Nem látatlanban veszel rendszert: az oldalad már működik és hozza az ügyfeleket.",
    badge: "Kockázatmentes",
    scene: (
      <div className="stage-hud-card">
        <div className="hud-header">
          <span className="hud-header-icon"><IconGlobe size={18} /></span>
          <span className="hud-title">Bizonyított működés</span>
          <span className="hud-badge hud-badge-aqua">Éles oldal</span>
        </div>
        <div className="hud-body">
          <p className="hud-statement">
            Nem ígéretek alapján vásárolsz weboldalt: a rendszer már a saját domaineden dolgozik,
            valós látogatókkal és működő konverziós útvonallal.
          </p>
        </div>
        <div className="hud-footer">
          <span className="hud-metric-label">Előny</span>
          <span className="hud-metric-val">Kipróbáltad, mielőtt megveszed</span>
        </div>
      </div>
    )
  },
  {
    number: "02",
    title: "Megvásárlás indítása",
    shortDesc: "Bármelyik hónapban elindítod az ügyfélkapun, egy gombnyomással.",
    badge: "Bármikor",
    scene: (
      <div className="stage-hud-card">
        <div className="hud-header">
          <span className="hud-header-icon"><IconKey size={18} /></span>
          <span className="hud-title">Kivásárlás indítása</span>
          <span className="hud-badge">Ügyfélkapu</span>
        </div>
        <div className="hud-body">
          <div className="hud-trigger-preview">
            <span className="hud-tp-btn"><IconKey size={16} /> Megvásárlás indítása</span>
            <small>Nincs kötelező várakozási idő: bármelyik hónapban élhetsz vele.</small>
          </div>
        </div>
        <div className="hud-footer">
          <span className="hud-metric-label">Időzítés</span>
          <span className="hud-metric-val">Teljesen szabad döntés</span>
        </div>
      </div>
    )
  },
  {
    number: "03",
    title: "Rögzített ár, beszámítással",
    shortDesc: "A vételár a szerződésben rögzített, és minden befizetett hónap után a havidíjad fele levonódik belőle, a vételár feléig.",
    badge: "Beszámítás",
    scene: (
      <div className="stage-hud-card">
        <div className="hud-header">
          <span className="hud-header-icon"><IconLock size={18} /></span>
          <span className="hud-title">Vételár csomagonként</span>
          <span className="hud-badge">Alku nélkül</span>
        </div>
        <div className="hud-body">
          <div className="hud-price-breakdown">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div className="hud-price-row" key={plan.key}>
                <span>{plan.name}: {formatHuf(PURCHASE_OPTION_PRICES[plan.key])}</span>
                <span className="hud-highlight-text">
                  {buyoutCreditMonths(plan.key)}. hónaptól {formatHuf(buyoutFloorPrice(plan.key))}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="hud-footer">
          <span className="hud-metric-label">Beszámítás</span>
          <span className="hud-metric-val">A havidíj fele, a vételár feléig</span>
        </div>
      </div>
    )
  },
  {
    number: "04",
    title: "Összefoglaló és számla",
    shortDesc: "Átadási összefoglalót kapsz a felhalmozott beszámítással és a fizetendő összeggel. A vételár beérkezése után indul az átadás.",
    badge: "Írásban",
    scene: (
      <div className="stage-hud-card">
        <div className="hud-header">
          <span className="hud-header-icon"><IconFileText size={18} /></span>
          <span className="hud-title">Tulajdonjog átruházása</span>
          <span className="hud-badge">Írásban</span>
        </div>
        <div className="hud-body">
          <div className="hud-legal-checklist">
            <div className="hud-code-line"><IconCheck size={14} /> A forráskód teljes felhasználási joga</div>
            <div className="hud-code-line"><IconCheck size={14} /> A design- és tartalmi anyagok átadása</div>
            <div className="hud-code-line"><IconCheck size={14} /> A domain és a fiókok átruházása a te nevedre</div>
          </div>
        </div>
        <div className="hud-footer">
          <span className="hud-metric-label">Jogi garancia</span>
          <span className="hud-metric-val">Tiszta tulajdonjog</span>
        </div>
      </div>
    )
  },
  {
    number: "05",
    title: "Vezetett technikai átadás",
    shortDesc: "Lépésről lépésre átadom az infrastruktúrát a saját fiókjaidba. Útmutatót kapsz.",
    badge: "Vezetett",
    scene: (
      <div className="stage-hud-card">
        <div className="hud-header">
          <span className="hud-header-icon"><IconCode size={18} /></span>
          <span className="hud-title">Technikai átadás</span>
          <span className="hud-badge">Vezetett</span>
        </div>
        <div className="hud-body">
          <div className="hud-migration-steps">
            <div className="hud-mig-item">
              <span className="hud-mig-step">1</span>
              <span>A forráskód átkerül a saját GitHub-fiókodba</span>
            </div>
            <div className="hud-mig-item">
              <span className="hud-mig-step">2</span>
              <span>A tárhely a saját fiókodba kerül</span>
            </div>
            <div className="hud-mig-item">
              <span className="hud-mig-step">3</span>
              <span>A domaint átíratom a te nevedre</span>
            </div>
          </div>
        </div>
        <div className="hud-footer">
          <span className="hud-metric-label">Biztonság</span>
          <span className="hud-metric-val">Jelszót egyikünk sem küld</span>
        </div>
      </div>
    )
  },
  {
    number: "06",
    title: "A kód, domain és fiókok a tieid",
    shortDesc: "Nincs több havidíj. Az átadás lezárásától 30 napig díjmentesen javítom a hibákat.",
    badge: "Nincs havidíj",
    scene: (
      <div className="stage-hud-card">
        <div className="hud-header">
          <span className="hud-header-icon"><IconKey size={18} /></span>
          <span className="hud-title">Teljes tulajdon</span>
          <span className="hud-badge hud-badge-aqua">100% a tiéd</span>
        </div>
        <div className="hud-body">
          <div className="hud-ownership-cert">
            <div className="hud-cert-row">
              <span>Forráskód:</span>
              <strong>Teljes Git-repó a neveden</strong>
            </div>
            <div className="hud-cert-row">
              <span>Domain és DNS:</span>
              <strong>Kizárólagos tulajdonod</strong>
            </div>
            <div className="hud-cert-row">
              <span>Utógarancia:</span>
              <strong className="text-emerald-400">30 nap díjmentes javítás</strong>
            </div>
          </div>
        </div>
        <div className="hud-footer">
          <span className="hud-metric-label">Utána</span>
          <span className="hud-metric-val">Nincs több havidíj</span>
        </div>
      </div>
    )
  }
];

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
    desc: "Folyamatos működésfigyelés és technikai frissítések, hibára 1 munkanapon belül reagálok.",
    icon: IconWrench,
  },
  {
    badge: "0 Ft előleg",
    title: "Fizetés a végén",
    desc: "Csak a kész, jóváhagyott oldalért fizetsz. Ha nem tetszik, nem fizetsz.",
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

  const currentData = activeTab === "berles" ? BERLES_DATA : KIVASARLAS_DATA;
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
            Bérléssel indulsz — és bármikor a sajátod lehet.
          </h2>
          <p className="stage-lead">
            Nem kell a nulladik napon nagy összeget kifizetned. Havidíjjal indulsz, és ha egyszer
            megtartanád, a befizetett havidíjad fele beszámít a vételárba.
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
                <strong>02. Kivásárlás</strong>
                <small>Bármikor megveheted · a havidíj fele beszámít</small>
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
