"use client";

import { useEffect, useRef, useState } from "react";
import { PublicBriefWizard } from "@/components/PublicBriefWizard";
import { PUBLIC_BRIEF_DRAFT_KEY, type BriefFormValues } from "@/lib/brief-draft";
import { trackEvent } from "@/lib/analytics";

/**
 * A heró alatti belépő: egyetlen kérdés, és onnan indul a brief.
 *
 * Miért van erre szükség: a látogatók 95%-a a főoldalra érkezik, és átlagosan
 * 32 másodpercet tölt itt. A brief korábban a 13 szekcióból az 5. volt — tízből
 * nyolcan el sem görgettek odáig. Ez a szakasz közvetlenül a heró alatt ül,
 * egyetlen, tényszerű kérdéssel, amit bárki meg tud válaszolni gondolkodás
 * nélkül. A válasz után a brief a MEGNYOMOTT GOMBBÓL nő ki, és a válasz már
 * be van jelölve benne.
 */

const GATE_TEXTS = ["Új weboldalt indítasz, vagy a meglévőt újítanád fel?", "Kezdjük ott, ahol most tartasz."];

type GateChoice = "no" | "yes";

export function BriefStage() {
  const [choice, setChoice] = useState<GateChoice | null>(null);
  const [textIndex, setTextIndex] = useState(0);
  const [glitching, setGlitching] = useState(false);
  const [resumeForm, setResumeForm] = useState<Partial<BriefFormValues> | null>(null);
  const [resumeStep, setResumeStep] = useState(0);
  const [preselectedPlan, setPreselectedPlan] = useState<string | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const flowRef = useRef<HTMLDivElement>(null);
  const cardRect = useRef<DOMRect | null>(null);
  const morphed = useRef(false);

  /* ── A folyadék: EGY üstökös — vastag fej, utána elvékonyodó hosszú farok.
        Sok szegmens szorosan egymás mögött ugyanazon a zárt pályán; a `goo`
        SVG-szűrő egyetlen összefüggő, elnyúló csíkká olvasztja őket. Nincs
        futó JS-ciklus: a böngésző animálja az `offset-distance`-t. ── */
  useEffect(() => {
    const flow = flowRef.current;
    if (!flow || flow.childElementCount) return;
    // Sűrűbb és jobban átfedő szegmensek, mint korábban: a CSS-blur csak akkor
    // olvasztja őket folytonos csíkká, ha nincs köztük rés.
    const SEGMENTS = 44;
    const DURATION = 27;
    const HEAD = 132;
    const TAIL = 14;
    const GAP = 0.0058;
    for (let index = 0; index < SEGMENTS; index += 1) {
      const ratio = index / (SEGMENTS - 1);
      const radius = HEAD + (TAIL - HEAD) * Math.pow(ratio, 0.7);
      const drop = document.createElement("span");
      drop.style.width = `${radius}px`;
      drop.style.height = `${radius}px`;
      drop.style.marginLeft = `${-radius / 2}px`;
      drop.style.marginTop = `${-radius / 2}px`;
      // A farok vége halkan elfogy, hogy ne legyen levágott vége a csíknak.
      drop.style.opacity = `${Math.max(0.16, 1 - Math.pow(ratio, 1.9))}`;
      drop.style.setProperty("--dur", `${DURATION}s`);
      drop.style.setProperty("--del", `${-DURATION * GAP * index}s`);
      flow.appendChild(drop);
    }
  }, []);

  /* ── Glitch: a két szöveg csak ÁTTŰNIK egymáson (mindkettő ugyanabban a
        rács-cellában ül), ezért a doboz magassága a hosszabbikhoz igazodik, és
        váltáskor semmi nem mozdul el alatta. ── */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const id = window.setInterval(() => {
      setGlitching(true);
      timers.push(window.setTimeout(() => setTextIndex((value) => (value + 1) % GATE_TEXTS.length), 150));
      timers.push(window.setTimeout(() => setGlitching(false), 400));
    }, 5200);
    return () => {
      window.clearInterval(id);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  /* ── Folytatás emailből: `?brief=<id>~<token>`. A letöltött adatlapot a
        megszokott localStorage-kulcsra írjuk, így a wizard saját „Folytatod a
        korábbi projektbriefet?" képernyője kezeli — nem kell külön ág. ── */
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("brief");
    if (!raw || !raw.includes("~")) return;
    const [id, token] = raw.split("~");
    if (!id || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/briefs/public-link?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`);
        if (!response.ok) return;
        const payload = await response.json();
        if (cancelled || !payload?.form) return;
        // A localStorage-ba is beírjuk, hogy a következő látogatáskor is
        // meglegyen — de a wizardnak közvetlenül adjuk át, hogy ne kelljen
        // még egyszer rákérdeznie, folytatja-e.
        window.localStorage.setItem(
          PUBLIC_BRIEF_DRAFT_KEY,
          JSON.stringify({ data: payload.form, savedAt: new Date().toISOString(), step: payload.step ?? 0, version: 1 })
        );
        setResumeForm(payload.form);
        setResumeStep(Math.max(0, Math.min(4, Number(payload.step) || 0)));
        setChoice(payload.form?.websiteStatus === "yes" ? "yes" : "no");
        trackEvent("brief_link_resumed", { step: (payload.step ?? 0) + 1 });
      } catch {
        /* A link hibája ne akadályozza meg a normál használatot. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Az árkártyáról érkező látogatónak már van csomagja — neki a kaput
     átugorjuk, és egyből az Ajánlás lépésen nyílik meg a brief. */
  useEffect(() => {
    function pickUp() {
      let stored: string | null = null;
      try {
        stored = window.sessionStorage.getItem("pe-preselect-plan");
      } catch {
        return;
      }
      if (!stored) return;
      try {
        window.sessionStorage.removeItem("pe-preselect-plan");
      } catch {
        /* nem baj, ha nem törölhető */
      }
      setPreselectedPlan(stored);
      setChoice((current) => current ?? "no");
    }
    pickUp();
    window.addEventListener("projectedge:plan-preselected", pickUp);
    return () => window.removeEventListener("projectedge:plan-preselected", pickUp);
  }, []);

  function choose(event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>, value: GateChoice) {
    cardRect.current = event.currentTarget.getBoundingClientRect();
    morphed.current = false;
    trackEvent("brief_gate_answered", { answer: value === "yes" ? "existing" : "new" });
    setChoice(value);
  }

  /* ── A brief a megnyomott gombból nő ki: lemérjük a gomb helyét és méretét,
        és a doboz ONNAN tágul a végleges helyére. ── */
  useEffect(() => {
    if (!choice || morphed.current || resumeForm) return;
    const from = cardRect.current;
    const shell = stageRef.current?.querySelector<HTMLElement>(".public-brief-shell");
    if (!shell) return;
    morphed.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const to = shell.getBoundingClientRect();
    if (from) {
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const sx = from.width / to.width;
      const sy = from.height / to.height;
      shell.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.6, filter: "blur(3px)" },
          {
            transform: `translate(${dx * 0.18}px, ${dy * 0.18}px) scale(${sx + (1 - sx) * 0.86}, ${sy + (1 - sy) * 0.86})`,
            opacity: 1,
            filter: "blur(0px)",
            offset: 0.62
          },
          { transform: "none", opacity: 1, filter: "blur(0px)" }
        ],
        { duration: 880, easing: "cubic-bezier(.19,.9,.24,1)", fill: "both" }
      );
    }

    const rows = [".public-brief-windowbar", ".public-brief-progress", ".public-brief-steps", ".public-brief-form", ".public-brief-preview"];
    rows.forEach((selector, index) => {
      const node = shell.querySelector<HTMLElement>(selector) ?? stageRef.current?.querySelector<HTMLElement>(selector);
      node?.animate([{ opacity: 0, transform: "translateY(14px)" }, { opacity: 1, transform: "none" }], {
        duration: 460,
        delay: 330 + index * 85,
        easing: "cubic-bezier(.2,.9,.3,1)",
        fill: "both"
      });
    });
    shell.querySelectorAll<HTMLElement>(".public-brief-steps button").forEach((button, index) => {
      button.animate([{ opacity: 0, transform: "translateY(10px) scale(.9)" }, { opacity: 1, transform: "none" }], {
        duration: 380,
        delay: 520 + index * 70,
        easing: "cubic-bezier(.2,1.1,.35,1.12)",
        fill: "both"
      });
    });
    shell.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [choice, resumeForm]);

  return (
    <section className={`brief-stage${glitching ? " glitching" : ""}`} id="projektbrief" ref={stageRef}>
      <svg aria-hidden="true" className="brief-stage-defs" focusable="false">
        <defs>
          {/* A folyadék összeolvasztása CSS-blurral történik, nem itt: egy 0x0
              méretű defs-konténerben definiált SVG-szűrő Safariban némán nem
              érvényesül, és a csík különálló karikákra esett szét. */}
          <filter id="brief-grain">
            <feTurbulence baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" type="fractalNoise" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      <div aria-hidden="true" className="brief-flowwrap">
        <div className="brief-flow" ref={flowRef} />
      </div>
      <div aria-hidden="true" className="brief-veil" />
      <svg aria-hidden="true" className="brief-grain" focusable="false">
        <rect filter="url(#brief-grain)" height="100%" width="100%" />
      </svg>
      <div aria-hidden="true" className="brief-scan" />
      <div aria-hidden="true" className="brief-slice" style={{ "--t": "20%", "--h": "13px" } as React.CSSProperties} />
      <div aria-hidden="true" className="brief-slice" style={{ "--t": "47%", "--h": "6px" } as React.CSSProperties} />
      <div aria-hidden="true" className="brief-slice" style={{ "--t": "72%", "--h": "16px" } as React.CSSProperties} />

      <div className="brief-stage-inner">
        {choice === null ? (
          <div className="brief-gate">
            <h2 className="brief-gate-swap">
              {GATE_TEXTS.map((text, index) => (
                <span className={index === textIndex ? "on" : ""} key={text}>
                  {text}
                </span>
              ))}
            </h2>
            <p className="brief-gate-sub">Nincs regisztráció, nincs telefonálás. Válassz, és innentől együtt rakjuk össze.</p>
            <div className="brief-gate-choices">
              <button className="brief-gate-choice" onClick={(event) => choose(event, "no")} type="button">
                <span className="brief-gate-n">01</span>
                <strong>Új weboldalt indítok</strong>
                <p>Még nincs oldalam, vagy a mostanit teljesen lecserélném.</p>
                <span aria-hidden="true" className="brief-gate-arrow">→</span>
              </button>
              <button className="brief-gate-choice" onClick={(event) => choose(event, "yes")} type="button">
                <span className="brief-gate-n">02</span>
                <strong>Meglévőt újítanék fel</strong>
                <p>Van már oldalam és domainem, de nem hozza, amit kéne.</p>
                <span aria-hidden="true" className="brief-gate-arrow">→</span>
              </button>
            </div>
          </div>
        ) : (
          <PublicBriefWizard
            bare
            initialForm={resumeForm ?? undefined}
            initialPlan={preselectedPlan ?? undefined}
            initialStep={resumeForm ? resumeStep : preselectedPlan ? 2 : 1}
            initialWebsiteStatus={choice}
          />
        )}
      </div>
    </section>
  );
}
