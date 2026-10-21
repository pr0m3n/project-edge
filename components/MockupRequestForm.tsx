"use client";

import { useEffect, useRef, useState } from "react";
import { ContactButton } from "@/components/ContactButton";
import { trackEvent, trackLeadConversion } from "@/lib/analytics";
import { MOCKUP_DIRECT_EVENT, MOCKUP_DIRECT_REQUEST_KEY } from "@/lib/pricing-model-request";
import { type CommercialModel, SUBSCRIPTION_PLANS } from "@/lib/subscriptions";

/**
 * Az ingyenes látványterv-kérés: a főoldal fő ajánlata.
 *
 * A nyitókép kéz-ceruzája itt folytatódik: egy papírlap, rajta balra egy LEVÉL
 * Patriknak, kitölthető mondatokkal (nem űrlap-mezőkkel), jobbra pedig a
 * látogató leendő főoldalának ceruzavázlata. A vázlat címsorába gépelés közben
 * a saját domainje vagy vállalkozása kerül, beküldéskor pedig kiszíneződik.
 *
 * Miért nem „rendes” űrlap: két korábbi változat (üveges kártyák, majd sima
 * mezők + PDF-borító) is sablonosnak hatott. A levél az, ami a hideg
 * kampányban is működik — egy ember ír egy embernek —, a vázlat pedig
 * megmutatja, mit kér, magyarázat nélkül.
 *
 * Aki egy árkártyáról jön, már döntött: neki a levél egy mondata felajánlja,
 * hogy a látványtervet kihagyva egyből ajánlatot kérjen (`skipMockup`).
 */

type Props = {
  /** Az árkártyáról érkező csomagválasztás; a beküldésben tájékoztató adat. */
  plan: string | null;
  model: CommercialModel;
  onClearPlan: () => void;
};

/* ── Ceruzavonalak ───────────────────────────────────────────────────────
   Determinisztikus (seedelt) remegés, hogy a szerver és a böngésző ugyanazt a
   path-ot rajzolja — különben hidratálási eltérés lenne. Minden vonal kétszer
   megy rá, kicsit eltolva: ettől lesz ceruzás, nem vektoros. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function roughLine(x1: number, y1: number, x2: number, y2: number, seed: number) {
  const r = rng(seed);
  const j = (amount: number) => (r() - 0.5) * amount;
  const pass = () => {
    const mx = (x1 + x2) / 2 + j(2.2);
    const my = (y1 + y2) / 2 + j(2.2);
    return `M${(x1 + j(1.6)).toFixed(1)} ${(y1 + j(1.6)).toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${(x2 + j(1.6)).toFixed(1)} ${(y2 + j(1.6)).toFixed(1)}`;
  };
  return `${pass()} ${pass()}`;
}

function roughRect(x: number, y: number, w: number, h: number, seed: number) {
  return [
    roughLine(x, y, x + w, y, seed),
    roughLine(x + w, y, x + w, y + h, seed + 1),
    roughLine(x + w, y + h, x, y + h, seed + 2),
    roughLine(x, y + h, x, y, seed + 3)
  ].join(" ");
}

type Stroke = { d: string; delay: number; tone?: "soft" | "ember" };

/* A vázlat elemei egyszer, modulszinten épülnek fel (seedelt, tehát stabil). */
const SKETCH: Stroke[] = (() => {
  const s: Stroke[] = [];
  let seed = 11;
  let delay = 0;
  const add = (d: string, tone?: Stroke["tone"]) => {
    s.push({ d, delay, tone });
    delay += 0.07;
    seed += 7;
  };
  // böngészőkeret
  add(roughRect(14, 14, 470, 318, seed));
  add(roughLine(14, 42, 484, 42, seed));
  // címsor-sáv: logó + menüpontok
  add(roughRect(30, 52, 34, 14, seed), "soft");
  [300, 340, 380, 420].forEach((x) => add(roughLine(x, 60, x + 26, 60, seed), "soft"));
  // alcím két sora
  add(roughLine(30, 132, 236, 132, seed), "soft");
  add(roughLine(30, 146, 196, 146, seed), "soft");
  // gomb
  add(roughRect(30, 164, 112, 30, seed));
  // kép helye: keret + átló
  add(roughRect(262, 82, 204, 128, seed));
  add(roughLine(262, 82, 466, 210, seed), "soft");
  add(roughLine(466, 82, 262, 210, seed), "soft");
  // három szolgáltatás-kártya
  [30, 182, 334].forEach((x) => {
    add(roughRect(x, 232, 132, 76, seed));
    add(roughLine(x + 12, 254, x + 92, 254, seed), "soft");
    add(roughLine(x + 12, 268, x + 112, 268, seed), "soft");
  });
  return s;
})();

const PHONE: Stroke[] = (() => {
  const s: Stroke[] = [];
  let seed = 401;
  let delay = 1.4;
  const add = (d: string, tone?: Stroke["tone"]) => {
    s.push({ d, delay, tone });
    delay += 0.08;
    seed += 7;
  };
  add(roughRect(392, 178, 104, 200, seed));
  add(roughLine(430, 188, 458, 188, seed), "soft");
  add(roughLine(404, 248, 470, 248, seed), "soft");
  add(roughRect(404, 262, 56, 18, seed));
  add(roughRect(404, 292, 80, 52, seed), "soft");
  return s;
})();

/* A kézírásos megjegyzések nyilai. */
const ARROWS: Stroke[] = [
  { d: "M196 92 C 214 84, 232 90, 246 78", delay: 2.0, tone: "ember" },
  { d: "M150 214 C 162 206, 160 196, 150 190", delay: 2.2, tone: "ember" },
  { d: "M372 368 C 382 360, 388 356, 396 350", delay: 2.4, tone: "ember" }
];

function domainOf(url: string) {
  return url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0];
}

/** Egy beíró mező a mondat közepén, ami a tartalmához nő. */
function Blank(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  disabled?: boolean;
  min?: number;
}) {
  const width = Math.max(props.min ?? 6, props.value.length || props.placeholder.length) + 1.5;
  return (
    <input
      aria-label={props.label}
      autoComplete={props.autoComplete}
      className="letter-blank"
      disabled={props.disabled}
      inputMode={props.inputMode}
      onChange={(event) => props.onChange(event.target.value)}
      placeholder={props.placeholder}
      style={{ width: `${width}ch` }}
      type={props.type ?? "text"}
      value={props.value}
    />
  );
}

export function MockupRequestForm({ plan, model, onClearPlan }: Props) {
  const [hasSite, setHasSite] = useState(true);
  const [skipMockup, setSkipMockup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [business, setBusiness] = useState("");
  const [note, setNote] = useState("");
  const [honeypot, setHoneypot] = useState("");
  /* A kitöltés kezdete: a szerver a túl gyors (robot) beküldést eldobja. */
  const startedAt = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  /* A chat „Egyből ajánlatot kérek” gombja: helyben eseménnyel, másik
     oldalról a sessionStorage-on át kapcsolja át a levelet. */
  useEffect(() => {
    function pickUp() {
      let wanted = false;
      try {
        wanted = window.sessionStorage.getItem(MOCKUP_DIRECT_REQUEST_KEY) === "1";
        window.sessionStorage.removeItem(MOCKUP_DIRECT_REQUEST_KEY);
      } catch {
        /* privát módban az esemény is elég */
      }
      if (wanted) setSkipMockup(true);
    }
    function onRequest() {
      pickUp();
      setSkipMockup(true);
    }
    pickUp();
    window.addEventListener(MOCKUP_DIRECT_EVENT, onRequest);
    return () => window.removeEventListener(MOCKUP_DIRECT_EVENT, onRequest);
  }, []);

  /* A vázlat akkor rajzolódik ki, amikor a lap képernyőre ér — egyszer. */
  useEffect(() => {
    const node = sheetRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setDrawn(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setDrawn(true);
        observer.disconnect();
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const planName = SUBSCRIPTION_PLANS.find((item) => item.key === plan)?.name ?? null;
  /* Látványterv nélkül, egyből ajánlat — csomagválasztással vagy anélkül. */
  const direct = skipMockup;
  const title = (hasSite ? domainOf(website) : business.trim()) || "A te vállalkozásod";
  const titleSize = Math.max(15, Math.min(30, (30 * 15) / Math.max(15, title.length)));
  const firstName = name.trim().split(/\s+/).slice(-1)[0] || "";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || (hasSite ? !website.trim() : !business.trim())) {
      setError(hasSite ? "Még hiányzik a neved, a weboldalad címe vagy az e-mail-címed." : "Még hiányzik a neved, hogy mivel foglalkozol, vagy az e-mail-címed.");
      return;
    }
    setLoading(true);
    trackEvent("mockup_request_started", { has_site: hasSite, plan: plan ?? "none", direct });
    try {
      const response = await fetch("/api/latvanyterv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, hasSite, website, business, note, plan, model,
          skipMockup: direct, startedAt: startedAt.current, honeypot
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Hiba történt a küldés közben.");
      setSent(true);
      trackEvent("mockup_request_completed", { has_site: hasSite, plan: plan ?? "none", direct });
      trackLeadConversion("brief");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Váratlan hiba történt. Kérlek, próbáld újra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`letter-sheet${drawn ? " is-drawn" : ""}${sent ? " is-sent" : ""}`} ref={sheetRef}>
      <span aria-hidden="true" className="letter-sheet-under" />
      <div className="letter-paper">
        <span aria-hidden="true" className={`letter-stamp${direct ? " is-off" : ""}`}>
          <b>Ingyenes</b>
          <i>24 órán<br />belül</i>
        </span>
        <div className="letter-col">
          {sent ? (
            <div className="letter-reply" role="status">
              <p className="letter-hello">Szia{firstName ? ` ${firstName}` : ""}!</p>
              <p className="letter-body">
                {direct
                  ? <>Megkaptam. 24 órán belül küldöm az ajánlatot{planName ? <> a(z) {planName} csomagra</> : null}, ide: <strong>{email}</strong>.</>
                  : <>Megkaptam. 24 órán belül küldöm a kész látványtervet PDF-ben, ide: <strong>{email}</strong>.</>}
              </p>
              <p className="letter-body small">Ha közben eszedbe jut valami — egy fotó, egy oldal, ami tetszik —, a visszaigazoló levélre válaszolva elküldheted.</p>
              <p className="letter-sign">Patrik</p>
              <ContactButton className="letter-ghost">Addig is kérdeznék valamit</ContactButton>
            </div>
          ) : (
            <form noValidate onSubmit={submit}>
              <p className="letter-hello">Szia Patrik!</p>

              <p className="letter-body">
                A nevem{" "}
                <Blank autoComplete="name" disabled={loading} label="Neved" min={10} onChange={setName} placeholder="Kovács Anna" value={name} />
                {hasSite ? (
                  <>
                    , és a(z){" "}
                    <Blank autoComplete="url" disabled={loading} inputMode="url" label="A weboldalad címe" min={12} onChange={setWebsite} placeholder="vallalkozasom.hu" value={website} />{" "}
                    oldalamhoz kérnék {direct ? "egy árajánlatot, és indulnék" : "egy ingyenes látványtervet"}.{" "}
                    <button className="letter-switch" onClick={() => setHasSite(false)} type="button">Még nincs weboldalam</button>
                  </>
                ) : (
                  <>
                    , ezzel foglalkozom:{" "}
                    <Blank disabled={loading} label="Mivel foglalkozol, és hol?" min={14} onChange={setBusiness} placeholder="fodrászat Győrben" value={business} />
                    , és kérnék {direct ? "egy árajánlatot, és indulnék" : "egy ingyenes látványtervet"}.{" "}
                    <button className="letter-switch" onClick={() => setHasSite(true)} type="button">Van már weboldalam</button>
                  </>
                )}
              </p>

              {/* Aki már tudja, mit akar, annak nem kell előbb az árakhoz görgetnie:
                  innen is átválthat egyből ajánlatkérésre. Csomag esetén a lenti
                  mondat kapcsolója ugyanezt az állapotot váltja. */}
              {!planName ? (
                <p className="letter-mode">
                  <button aria-pressed={skipMockup} className="letter-mode-btn" onClick={() => setSkipMockup((value) => !value)} type="button">
                    {skipMockup ? "← Mégis kérek ingyenes látványtervet" : "Látványterv nélkül, egyből indulnék →"}
                  </button>
                </p>
              ) : null}

              {planName ? (
                <p className="letter-body">
                  A(z) <strong>{planName}</strong> csomag érdekel ({model === "purchase" ? "egyszeri vásárlással" : "havidíjjal"}),{" "}
                  {/* Szövegközi kapcsoló: <span>, nem <button>, mert a gomb dobozként
                      tördel, és telefonon a mondat közepén középre ugrott. */}
                  <span
                    aria-pressed={skipMockup}
                    className="letter-toggle"
                    onClick={() => setSkipMockup((value) => !value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSkipMockup((value) => !value);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    {skipMockup ? "de nem kell látványterv, egyből ajánlatot kérek." : "és előbb látni szeretném, milyen lenne."}
                  </span>{" "}
                  <button className="letter-switch" onClick={() => { setSkipMockup(false); onClearPlan(); }} type="button">Mégsem ez a csomag</button>
                </p>
              ) : null}

              <p className="letter-body">
                {direct ? "Az ajánlatot" : "A tervet"} ide küldd:{" "}
                <Blank autoComplete="email" disabled={loading} inputMode="email" label="E-mail-címed" min={18} onChange={setEmail} placeholder="anna@vallalkozasom.hu" type="email" value={email} />
              </p>

              <p className="letter-body soft">
                Még annyit:{" "}
                <Blank disabled={loading} label="Megjegyzés (nem kötelező)" min={22} onChange={setNote} placeholder="nem kötelező" value={note} />
              </p>

              {/* Csapda a robotoknak: ember nem látja és nem tölti ki. */}
              <input aria-hidden="true" autoComplete="off" className="letter-trap" onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} type="text" value={honeypot} />

              {error ? <p className="letter-error" role="alert">{error}</p> : null}

              <div className="letter-send">
                <button className="letter-submit" disabled={loading} type="submit">
                  {loading ? "Küldés…" : "Elküldöm"}
                  <svg aria-hidden="true" className="letter-submit-scribble" viewBox="0 0 160 14" preserveAspectRatio="none">
                    <path d="M3 9 C 40 3, 90 13, 157 5" />
                  </svg>
                </button>
                <p className="letter-fine">
                  {direct ? "24 órán belül válaszolok." : "24 órán belül, PDF-ben. Ingyenes, és nem kötelez semmire."}
                </p>
              </div>
            </form>
          )}
        </div>

        {/* A vázlat dekoráció: a látogató leendő főoldala ceruzával. */}
        <div aria-hidden="true" className="letter-sketch">
          <svg viewBox="0 0 510 392">
            <g className="sk-fill">
              <rect height="30" rx="3" width="112" x="30" y="164" />
              <rect className="aqua" height="128" width="204" x="262" y="82" />
              <rect className="aqua" height="52" width="80" x="404" y="292" />
              <rect height="18" rx="2" width="56" x="404" y="262" />
            </g>
            {[...SKETCH, ...ARROWS].map((stroke, index) => (
              <path
                className={`sk-line${stroke.tone ? ` ${stroke.tone}` : ""}`}
                d={stroke.d}
                key={index}
                pathLength={1}
                style={{ "--d": `${stroke.delay}s` } as React.CSSProperties}
              />
            ))}
            <rect className="sk-phone-mask" height="198" width="102" x="393" y="179" />
            {PHONE.map((stroke, index) => (
              <path className={`sk-line${stroke.tone ? ` ${stroke.tone}` : ""}`} d={stroke.d} key={`p${index}`} pathLength={1} style={{ "--d": `${stroke.delay}s` } as React.CSSProperties} />
            ))}
            <text className="sk-title" fontSize={titleSize} x="30" y="112">{title}</text>
            <text className="sk-btn" x="86" y="184">Ajánlatkérés</text>
            <text className="sk-title small" x="404" y="232">{title.length > 12 ? `${title.slice(0, 11)}…` : title}</text>
            <text className="sk-note" x="250" y="72">a neved, nagyban</text>
            <text className="sk-note" x="96" y="222">egy gomb, mindig kéznél</text>
            <text className="sk-note" x="250" y="380">és telefonon is</text>
          </svg>
          <p className="letter-sketch-cap">{sent ? "Ezt rajzolom meg rendesen." : "Így kezdődik a terved."}</p>
        </div>
      </div>
    </div>
  );
}
