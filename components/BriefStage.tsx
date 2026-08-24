"use client";

import { useEffect, useRef, useState } from "react";
import { PublicBriefWizard } from "@/components/PublicBriefWizard";
import { PUBLIC_BRIEF_DRAFT_KEY, type BriefFormValues } from "@/lib/brief-draft";
import { trackEvent } from "@/lib/analytics";

/**
 * A főoldal egyetlen sötét szakasza: egy kérdés, és onnan indul a brief.
 *
 * Miért van erre szükség: a látogatók 95%-a a főoldalra érkezik, és átlagosan
 * 32 másodpercet tölt itt. A brief korábban a 13 szekcióból az 5. volt — tízből
 * nyolcan el sem görgettek odáig. Ez a szakasz a „Ezt kapod" lista után ül,
 * egyetlen, tényszerű kérdéssel, amit bárki meg tud válaszolni gondolkodás
 * nélkül. A válasz után a brief a MEGNYOMOTT GOMBBÓL nő ki, és a válasz már
 * be van jelölve benne. A heróból a `#projektbrief` link egy koppintással
 * idehoz, tehát a gyors út nem veszett el a lejjebb kerüléssel.
 */

const GATE_TEXTS = ["Új weboldalt indítasz, vagy a meglévőt újítanád fel?", "Kezdjük ott, ahol most tartasz."];

/* A szakadás-sávok helye és vastagsága. Dekoráció, `aria-hidden`. */
const TEARS = [
  { t: "20%", h: "13px" },
  { t: "47%", h: "6px" },
  { t: "72%", h: "16px" }
];

const GLITCH_MS = 420;

type GateChoice = "no" | "yes";

export function BriefStage() {
  const [choice, setChoice] = useState<GateChoice | null>(null);
  const [textIndex, setTextIndex] = useState(0);
  const [glitching, setGlitching] = useState(false);
  const [live, setLive] = useState(false);
  const [resumeForm, setResumeForm] = useState<Partial<BriefFormValues> | null>(null);
  const [resumeStep, setResumeStep] = useState(0);
  const [preselectedPlan, setPreselectedPlan] = useState<string | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const cardRect = useRef<DOMRect | null>(null);
  const morphed = useRef(false);
  const greeted = useRef(false);

  /* ── Csak akkor él a szakasz, amikor tényleg látszik ──────────────
        A derengés és a pásztázó csík animációja korábban akkor is futott, ha a
        látogató a lap legalján járt. Az `is-live` osztály állítja meg őket
        (CSS: `animation-play-state`), és ez kapcsolja ki a glitch-időzítőt is,
        hogy képernyőn kívül fölösleges újrarajzolás se legyen. ── */
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const timers: number[] = [];
    if (typeof IntersectionObserver === "undefined") {
      timers.push(window.setTimeout(() => setLive(true), 0));
      return () => timers.forEach((timer) => window.clearTimeout(timer));
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setLive(entry.isIntersecting);
        /* Egy glitch rögtön akkor is elsül, amikor a szakasz ELŐSZÖR
           képernyőre görög. Enélkül az 5,2 másodperces körre kellett várni —
           telefonon, ahol a látogató gyorsan görget, jó eséllyel sosem látta. */
        if (!entry.isIntersecting || greeted.current) return;
        greeted.current = true;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        setGlitching(true);
        timers.push(window.setTimeout(() => setGlitching(false), GLITCH_MS));
      },
      { rootMargin: "160px 0px" }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  /* ── Glitch: a két szöveg csak ÁTTŰNIK egymáson (mindkettő ugyanabban a
        rács-cellában ül), ezért a doboz magassága a hosszabbikhoz igazodik, és
        váltáskor semmi nem mozdul el alatta. ── */
  useEffect(() => {
    if (!live) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const id = window.setInterval(() => {
      setGlitching(true);
      timers.push(window.setTimeout(() => setTextIndex((value) => (value + 1) % GATE_TEXTS.length), 150));
      timers.push(window.setTimeout(() => setGlitching(false), GLITCH_MS));
    }, 5200);
    return () => {
      window.clearInterval(id);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [live]);

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
    <section
      className={`brief-stage${live ? " is-live" : ""}${glitching ? " glitching" : ""}`}
      id="projektbrief"
      ref={stageRef}
    >
      {/* A derengés: KÉT réteg, mindkettő egyetlen elem, több nagy radiális
          gradienssel a háttérképében. A lágyságot maguk a gradiensek adják,
          nem egy `filter:blur()` — korábban négy óriási elem animálódott egy
          elmosó szülőn belül, amit a böngészőnek képkockánként újra kellett
          raszterizálnia. Így a mozgás rétegenként egyetlen eltolás, amit a
          kompozitor visz. A markupban vannak, nem JS hozza létre őket: az első
          festéskor már ott kell lenniük, különben telefonon a szakasz feketén
          jelenik meg, és a fény késve „ugrik be". */}
      <div aria-hidden="true" className="brief-aurora one" />
      <div aria-hidden="true" className="brief-aurora two" />
      <div aria-hidden="true" className="brief-scan" />
      {TEARS.map((tear) => (
        <div
          aria-hidden="true"
          className="brief-tear"
          key={tear.t}
          style={{ "--t": tear.t, "--h": tear.h } as React.CSSProperties}
        />
      ))}

      <div className="brief-stage-inner">
        {choice === null ? (
          <div className="brief-gate">
            <h2 className="brief-gate-swap">
              {GATE_TEXTS.map((text, index) => (
                <span className={index === textIndex ? "on" : ""} key={text}>
                  {text}
                </span>
              ))}
              {/* A látható szöveg két elszínezett másolata. Nyugalomban
                  láthatatlanok; glitchkor ellentétes irányba csúsznak szét, és
                  mindkettő más-más vízszintes sávot mutat belőle. */}
              <span aria-hidden="true" className="brief-gate-ghost cyan">
                {GATE_TEXTS[textIndex]}
              </span>
              <span aria-hidden="true" className="brief-gate-ghost ember">
                {GATE_TEXTS[textIndex]}
              </span>
            </h2>
            <p className="brief-gate-sub">Nincs regisztráció, nincs telefonálás. Válassz, és innentől együtt rakjuk össze.</p>
            <div className="brief-gate-choices">
              <button className="brief-gate-choice" onClick={(event) => choose(event, "no")} type="button">
                <span className="brief-gate-n">01</span>
                <strong>Új weboldalt indítok</strong>
                <p>Még nincs oldalam, vagy a mostanit teljesen lecserélném.</p>
                <span className="brief-gate-cta">
                  Ezt választom
                  <span aria-hidden="true" className="brief-gate-arrow">
                    →
                  </span>
                </span>
              </button>
              <button className="brief-gate-choice" onClick={(event) => choose(event, "yes")} type="button">
                <span className="brief-gate-n">02</span>
                <strong>Meglévőt újítanék fel</strong>
                <p>Van már oldalam és domainem, de nem hozza, amit kéne.</p>
                <span className="brief-gate-cta">
                  Ezt választom
                  <span aria-hidden="true" className="brief-gate-arrow">
                    →
                  </span>
                </span>
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
