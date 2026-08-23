"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  initialBriefForm,
  PUBLIC_BRIEF_DRAFT_KEY,
  readPublicBriefDraft,
  type BriefFormValues,
  type PublicBriefDraft
} from "@/lib/brief-draft";
import {
  LOGO_DESIGN_PRICE,
  formatHuf,
  SUBSCRIPTION_PLANS,
  subscriptionPlan,
  recommendPlan,
  recommendationReason,
  SERVICE_COUNT_OPTIONS,
  VISITOR_TASK_OPTIONS
} from "@/lib/subscriptions";
import { trackEvent, trackLeadConversion } from "@/lib/analytics";

/**
 * A csomagválasztás szándékosan NEM az első lépés.
 *
 * Korábban azzal indult („Mekkora weboldalra van szükséged?"), és a mérés
 * szerint aki megnyitotta a briefet, annak a fele az első képernyőn kiszállt:
 * olyan döntést kértünk tőle, amit még nem tudott meghozni. Most a 2. lépés
 * két üzleti kérdéséből VEZETJÜK LE az ajánlást, és a 3. lépésen mutatjuk meg
 * — eredményként, nem kapuként. Felülbírálható marad.
 */
const steps = ["Rólad", "Mit csinálsz", "Ajánlás", "Megjelenés", "Mentés"];
const projectTypes = [
  ["premium-business-site", "Céges weboldal"],
  ["redesign", "Meglévő oldal megújítása"],
  ["web-app", "Webapp / admin rendszer"],
  ["client-portal", "Ügyfélkapu / dashboard"]
] as const;
const pageOptions = ["Főoldal", "Szolgáltatások", "Rólunk", "Referenciák", "Árak", "GYIK", "Kapcsolat", "Blog"];
const featureOptions = ["Ajánlatkérő", "Kapcsolati űrlap", "Időpontfoglalás", "Galéria", "Térkép", "Vélemények", "Analitika", "Többnyelvűség"];
const vibes = [
  ["premium", "Prémium", "Erős kontraszt és magasabb értékérzet."],
  ["clean", "Letisztult", "Sok levegő és gyorsan érthető tartalom."],
  ["bold", "Merész", "Nagy tipó és karakteres vizuális ritmus."],
  ["friendly", "Barátságos", "Közvetlen, emberi és könnyen megközelíthető."]
] as const;
const palettes = [
  ["edge", "ProjectEdge", ["#f5f5f5", "#76abae", "#303841", "#ff5722"]],
  ["mono", "Monokróm", ["#f7f7f2", "#d9e2df", "#20242a", "#111111"]],
  ["warm", "Meleg prémium", ["#fff7ef", "#e8c6a4", "#32302f", "#e6532e"]],
  ["fresh", "Friss", ["#f7fbf9", "#92d1c3", "#29353d", "#2f8f83"]]
] as const;

function parts(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function toggle(value: string, item: string) {
  const values = parts(value);
  return values.includes(item) ? values.filter((entry) => entry !== item).join(", ") : [...values, item].join(", ");
}

function validate(step: number, form: BriefFormValues) {
  if (step === 0) {
    if (form.company.trim().length < 2) return "Add meg a vállalkozásod vagy márkád nevét.";
    if (form.commercialModel === "purchase" && !form.projectType) return "Válaszd ki, milyen projektet szeretnél.";
  }
  if (step === 1) {
    if (!form.serviceCount) return "Jelöld, hány szolgáltatást vagy terméket árulsz.";
    if (!form.visitorTask) return "Jelöld, kell-e a látogatónak csinálnia valamit az oldalon.";
    if (form.goals.trim().length < 10) return "Írd le legalább egy mondatban, mit szeretnél elérni.";
    if (form.audience.trim().length < 5) return "Írd le röviden, kiknek készül az oldal.";
    if (!form.primaryAction.trim()) return "Válaszd ki a legfontosabb látogatói műveletet.";
  }
  if (step === 2) {
    if (!parts(form.pages).length) return "Válassz legalább egy fontos oldalt vagy tartalmi blokkot.";
    if (!parts(form.features).length) return "Válassz legalább egy szükséges funkciót.";
    if (form.contentBrief.trim().length < 30) return "Írj legalább néhány mondatot a vállalkozásodról és az ajánlatodról.";
  }
  if (step === 3) {
    if (!form.vibe || !form.palette) return "Válassz hangulatot és színirányt.";
    if (!form.logoStatus || !form.photoSource) return "Jelöld, hogy vannak-e logód és saját képeid.";
    if (form.logoStatus === "no" && !form.wantLogoDesign) return "Jelöld, hogy szeretnél-e logót terveztetni.";
  }
  return "";
}

export type PublicBriefWizardProps = {
  /** A heró kapujából érkező válasz — előtölti az 1. lépést. */
  initialWebsiteStatus?: "no" | "yes";
  /** Melyik lépésen induljon (árkártyáról érkezve a 3.: Ajánlás). */
  initialStep?: number;
  /** Előre kiválasztott csomag (árkártyáról érkezve). */
  initialPlan?: string;
  /** A folyadék-színpadon belül a saját bevezető fejléc elmarad. */
  bare?: boolean;
};

export function PublicBriefWizard({
  initialWebsiteStatus,
  initialStep = 0,
  initialPlan,
  bare = false
}: PublicBriefWizardProps = {}) {
  const router = useRouter();
  const [form, setForm] = useState<BriefFormValues>(() => ({
    ...initialBriefForm,
    ...(initialWebsiteStatus === "yes"
      ? { websiteStatus: "yes", domainStatus: "keep" }
      : initialWebsiteStatus === "no"
        ? { websiteStatus: "no", domainStatus: "new" }
        : {}),
    ...(initialPlan ? { subscriptionPlan: initialPlan as BriefFormValues["subscriptionPlan"] } : {})
  }));
  const [step, setStep] = useState(initialStep);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [resumeDraft, setResumeDraft] = useState<PublicBriefDraft | null>(null);
  const skipFirstAutosave = useRef(true);
  const briefStarted = useRef(false);
  /** Igaz, ha a látogató KÉZZEL írta felül az ajánlott csomagot.
      Állapot, nem ref: a 3. lépés felirata is ebből olvas renderelés közben. */
  const [manualPlan, setManualPlan] = useState(Boolean(initialPlan));
  /** Nyitva van-e a „másik csomagot választok" panel. */
  const [showPlans, setShowPlans] = useState(false);
  /** A piszkozat-link email küldés állapota. */
  const [linkEmail, setLinkEmail] = useState("");
  const [linkState, setLinkState] = useState<"idle" | "open" | "sending" | "sent" | "error">("idle");
  const [linkError, setLinkError] = useState("");
  /** Mikor nyílt meg az űrlap — a bot-szűréshez kell a szerveren.
      Renderelés közben nem hívunk `Date.now()`-ot (tisztaság), csak mount után. */
  const openedAt = useRef(0);

  useEffect(() => {
    openedAt.current = Date.now();
    const saved = readPublicBriefDraft(window.localStorage.getItem(PUBLIC_BRIEF_DRAFT_KEY));
    if (saved && (saved.data.company || saved.step > 0)) setResumeDraft(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || resumeDraft) return;
    if (skipFirstAutosave.current) {
      skipFirstAutosave.current = false;
      return;
    }
    const now = new Date().toISOString();
    window.localStorage.setItem(PUBLIC_BRIEF_DRAFT_KEY, JSON.stringify({ data: form, savedAt: now, step, version: 1 }));
    setSavedAt(now);
  }, [form, ready, resumeDraft, step]);

  /**
   * A két üzleti kérdésből levezetett ajánlás. Csak akkor írja felül a kiválasztott
   * csomagot, ha a látogató nem választott kézzel mást — a felülbírálás mindig nyer.
   */
  const recommended = recommendPlan(form.serviceCount, form.visitorTask);
  useEffect(() => {
    if (!recommended || manualPlan) return;
    setForm((current) => (current.subscriptionPlan === recommended ? current : { ...current, subscriptionPlan: recommended }));
  }, [recommended, manualPlan]);

  const selectedPlan = subscriptionPlan(form.subscriptionPlan);
  const selectedVibe = vibes.find(([key]) => key === form.vibe) ?? vibes[1];
  const selectedPalette = palettes.find(([key]) => key === form.palette) ?? palettes[0];
  const previewColors = form.palette === "custom"
    ? [form.customBg, form.customAccent, form.customText, form.customCta]
    : selectedPalette[2];
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const savedLabel = useMemo(() => {
    if (!savedAt) return "A válaszaid ezen az eszközön mentődnek";
    return `Automatikusan mentve · ${new Date(savedAt).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}`;
  }, [savedAt]);

  function update(values: Partial<BriefFormValues>) {
    if (!briefStarted.current) {
      briefStarted.current = true;
      trackEvent("brief_started", { source: "homepage" });
    }
    setError("");
    setForm((current) => ({ ...current, ...values }));
  }

  function go(next: number) {
    if (next > step) {
      const message = validate(step, form);
      if (message) {
        setError(message);
        return;
      }
    }
    setError("");
    setStep(Math.max(0, Math.min(steps.length - 1, next)));
    trackEvent("brief_step_viewed", { step: next + 1, label: steps[next] });
  }

  function continueToAccount() {
    const paletteName = form.palette === "custom"
      ? "Egyedi paletta"
      : palettes.find(([key]) => key === form.palette)?.[1] ?? "Rátok bízom";
    const prepared: BriefFormValues = {
      ...form,
      title: form.title || `${form.company} weboldal`,
      budget: form.commercialModel === "subscription" ? "subscription" : form.budget || "not-sure",
      priority: form.priority || "conversion",
      brandColors: form.brandColors || paletteName,
      fontPreference: form.fontPreference || "Nincs preferencia — bízom a stúdióra",
      contentSource: form.contentSource || "studio"
    };
    window.localStorage.setItem(PUBLIC_BRIEF_DRAFT_KEY, JSON.stringify({ data: prepared, savedAt: new Date().toISOString(), step: 4, version: 1 }));
    trackEvent("brief_completed", { model: prepared.commercialModel, source: "homepage" });
    trackLeadConversion();
    router.push("/ugyfelkapu?brief=continue");
  }

  /**
   * A piszkozat elküldése emailben — fiók nélkül.
   *
   * Ez a második kimenet a regisztráció mellett. A mérés szerint aki eddig
   * eljutott és nem regisztrált, arról NYOMTALANUL elveszett a kitöltött brief:
   * a localStorage az ő gépén maradt, a rendszer nem tudott róla. Innentől
   * ticket készül belőle, ő pedig kap egy folytatás-linket.
   */
  async function sendDraftLink() {
    const email = linkEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLinkError("Adj meg egy érvényes email címet.");
      return;
    }
    setLinkState("sending");
    setLinkError("");
    try {
      const response = await fetch("/api/briefs/public-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, form, step, startedAt: openedAt.current, honeypot: "" })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setLinkState("error");
        setLinkError(payload?.error || "Nem sikerült elküldeni. Próbáld újra.");
        return;
      }
      setLinkState("sent");
      trackEvent("brief_link_sent", { step: step + 1 });
      trackLeadConversion();
    } catch {
      setLinkState("error");
      setLinkError("Hálózati hiba. Próbáld újra.");
    }
  }

  function continueDraft() {
    if (!resumeDraft) return;
    setForm(resumeDraft.data);
    setSavedAt(resumeDraft.savedAt);
    setStep(resumeDraft.step);
    setResumeDraft(null);
    briefStarted.current = true;
    trackEvent("brief_resumed", { step: resumeDraft.step + 1 });
  }

  function restartDraft() {
    window.localStorage.removeItem(PUBLIC_BRIEF_DRAFT_KEY);
    setForm(initialBriefForm);
    setStep(0);
    setSavedAt("");
    setResumeDraft(null);
    skipFirstAutosave.current = true;
    trackEvent("brief_restarted");
  }

  return (
    /* A színpadon belül a `#projektbrief` horgony a külső szekcióé — itt nem
       ismételjük meg, mert két azonos id törné a lapon belüli ugrásokat. */
    <section className={`public-brief${bare ? " bare" : ""}`} id={bare ? undefined : "projektbrief"}>
      {bare ? null : (
        <div className="public-brief-intro">
          <p className="micro-label">Projektindító adatlap</p>
          <h2>Rakjuk össze előbb a jó irányt.</h2>
          <p>Belépés nélkül elkezdheted. A végén eldöntöd, hogy fiókot hozol létre, vagy csak emailben kéred a folytatás linkjét.</p>
          <div className="public-brief-points">
            <span>01 · 5 rövid lépés</span>
            <span>02 · Automatikus mentés</span>
            <span>03 · Beküldés csak jóváhagyással</span>
          </div>
        </div>
      )}

      {resumeDraft ? (
        <div className="public-draft-choice" role="status">
          <div><span>MENTETT PISZKOZAT</span><strong>Folytatod a korábbi projektbriefet?</strong><p>Utoljára mentve: {new Date(resumeDraft.savedAt).toLocaleString("hu-HU")}</p></div>
          <div><button className="button primary" onClick={continueDraft} type="button">Folytatás</button><button className="button spectral" onClick={restartDraft} type="button">Újrakezdés</button></div>
        </div>
      ) : null}

      <div className="public-brief-shell">
        <div className="public-brief-windowbar"><span /><span /><span /><b>projectedge / brief</b><em>{progress}%</em></div>
        <div className="public-brief-progress"><i style={{ width: `${progress}%` }} /></div>
        <nav className="public-brief-steps" aria-label="Brief lépései">
          {steps.map((label, index) => (
            <button aria-disabled={index > step} className={index === step ? "active" : index < step ? "done" : ""} disabled={index > step} key={label} onClick={() => go(index)} type="button">
              <span>{index < step ? "✓" : index + 1}</span>{label}
            </button>
          ))}
        </nav>

        <div className="public-brief-layout">
          <form className="public-brief-form" onSubmit={(event) => event.preventDefault()}>
            {step === 0 ? <div className="public-brief-slide">
              {/* Nincs konstrukcióválasztás: a weboldal bérelhető, és ha később
                  a sajátod lenne, a bérlésből hívod le a vételi opciót. Új
                  weboldalt teljes áron megvenni sehol nem lehet.
                  A webapp / ügyfélkapu / meglévő oldal átalakítása külön út,
                  a /szolgaltatasok „Egyedi projekt indítása" gombjáról indul
                  (`/ugyfelkapu?model=purchase`) — ide szándékosan nem kerül be.
                  A `purchase` ágak lentebb megmaradnak a régi, még be nem
                  küldött piszkozatok miatt. */}
              <header><span>01 / Rólad</span><h3>Kezdjük veled.</h3><p>Csomagot most nem kell választanod — azt a következő lépés válaszaiból ajánlom majd. Külön belépési díj nincs: az első havidíj indítja a munkát.</p></header>
              {form.commercialModel === "purchase" ? <div className="public-chip-grid">
                {projectTypes.map(([value, label]) => <button className={form.projectType === value ? "selected" : ""} key={value} onClick={() => update({ projectType: value })} type="button">{label}</button>)}
              </div> : null}
              <label className="public-field"><span>Vállalkozás vagy márka neve</span><input value={form.company} onChange={(event) => update({ company: event.target.value })} placeholder="Például: Kovács Épületgépészet" /></label>
              <div className="public-field">
                <span>Milyen projektről van szó?</span>
                <div className="public-chip-grid">
                  <button
                    className={form.websiteStatus !== "yes" ? "selected" : ""}
                    onClick={() => update({ websiteStatus: "no", website: "", domainStatus: "new" })}
                    type="button"
                  >
                    Új weboldalt indítok
                  </button>
                  <button
                    className={form.websiteStatus === "yes" ? "selected" : ""}
                    onClick={() => update({ websiteStatus: "yes", domainStatus: "keep" })}
                    type="button"
                  >
                    Meglévő weboldal felújítása
                  </button>
                </div>
              </div>
              {form.websiteStatus === "yes" ? (
                <div className="public-field">
                  <span>Jelenlegi weboldalad címe</span>
                  <input
                    value={form.website}
                    onChange={(event) => update({ website: event.target.value })}
                    placeholder="https://kovacsklima.hu"
                  />
                  <div style={{ marginTop: "10px" }}>
                    <span style={{ fontSize: "13px", color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                      Mi történjen a meglévő domainnel?
                    </span>
                    <div className="public-chip-grid">
                      <button
                        className={form.domainStatus === "keep" ? "selected" : ""}
                        onClick={() => update({ domainStatus: "keep" })}
                        type="button"
                      >
                        Megtartom a jelenlegi domaint
                      </button>
                      <button
                        className={form.domainStatus === "need-new" ? "selected" : ""}
                        onClick={() => update({ domainStatus: "need-new" })}
                        type="button"
                      >
                        Új domaint szeretnék az új oldalhoz
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div> : null}

            {step === 1 ? <div className="public-brief-slide">
              <header><span>02 / Mit csinálsz</span><h3>Mit árulsz, és mit csináljon a látogató?</h3><p>Két kérdés a vállalkozásodról — ebből megmondom, melyik csomag elég neked. Az oldalak számát nem kell megbecsülnöd.</p></header>
              <div className="public-field">
                <span>Hány különböző szolgáltatást vagy terméket árulsz?</span>
                <div className="public-chip-grid">
                  {SERVICE_COUNT_OPTIONS.map(([value, label]) => <button
                    className={form.serviceCount === value ? "selected" : ""}
                    key={value}
                    onClick={() => { setManualPlan(false); update({ serviceCount: value }); }}
                    type="button"
                  >{label}</button>)}
                </div>
              </div>
              <div className="public-field">
                <span>Kell, hogy a látogató csináljon valamit az oldalon?</span>
                <div className="public-chip-grid">
                  {VISITOR_TASK_OPTIONS.map(([value, label]) => <button
                    className={form.visitorTask === value ? "selected" : ""}
                    key={value}
                    onClick={() => { setManualPlan(false); update({ visitorTask: value }); }}
                    type="button"
                  >{label}</button>)}
                </div>
                <small className="public-field-hint">Az oldalak számát soha nem kérdezem — azt a válaszaidból rakom össze.</small>
              </div>
              <label className="public-field"><span>Mi a legfontosabb cél?</span><textarea value={form.goals} onChange={(event) => update({ goals: event.target.value })} placeholder="Például: több minőségi ajánlatkérés, hitelesebb megjelenés és kevesebb ismétlődő kérdés…" /></label>
              <label className="public-field"><span>Kiknek készül?</span><textarea value={form.audience} onChange={(event) => update({ audience: event.target.value })} placeholder="Például: Veszprém környéki családok, akik megbízható szakembert keresnek…" /></label>
              <div className="public-field"><span>Mi legyen az elsődleges művelet?</span><div className="public-chip-grid">{["Ajánlatot kérek", "Kapcsolatfelvétel", "Telefonálok", "Időpontot foglalok"].map((item) => <button className={form.primaryAction === item ? "selected" : ""} key={item} onClick={() => update({ primaryAction: item })} type="button">{item}</button>)}</div></div>
            </div> : null}

            {step === 2 ? <div className="public-brief-slide">
              <header><span>03 / Ajánlás</span><h3>Ez a csomag elég neked.</h3><p>Nem a legdrágábbat ajánlom, hanem a legolcsóbbat, amiben elfér, amit mondtál. Felülbírálhatod.</p></header>

              {form.commercialModel === "subscription" ? <div className="brief-recommend">
                <div className="brief-recommend-head">
                  <div>
                    <span>{manualPlan ? "A VÁLASZTÁSOD" : "A VÁLASZAID ALAPJÁN"}</span>
                    <strong>{selectedPlan.name}</strong>
                  </div>
                  <b>{formatHuf(selectedPlan.price)}<small>/hó</small></b>
                </div>
                <p className="brief-recommend-why">{recommendationReason(form.serviceCount, form.visitorTask)}</p>
                <p className="brief-recommend-scope">{selectedPlan.pages} · {selectedPlan.buildTime.replace("Jellemzően ", "elkészül ")}</p>
                <button className="brief-recommend-toggle" onClick={() => setShowPlans((value) => !value)} type="button">
                  {showPlans ? "Rendben, maradjon ez" : "Inkább másik csomagot választok"}
                </button>
                {showPlans ? <div className="public-plan-grid">
                  {SUBSCRIPTION_PLANS.map((plan) => <button
                    className={form.subscriptionPlan === plan.key ? "selected" : ""}
                    key={plan.key}
                    onClick={() => { setManualPlan(true); update({ subscriptionPlan: plan.key }); }}
                    type="button"
                  >
                    <span>{plan.name}</span>
                    <strong>{formatHuf(plan.price)}<small>/hó</small></strong>
                    <p>{plan.short}</p>
                  </button>)}
                </div> : null}
              </div> : null}
              <div className="public-field"><span>Oldalak vagy tartalmi blokkok</span><div className="public-chip-grid">{(form.commercialModel === "subscription" ? selectedPlan.pageOptions : pageOptions).map((item) => <button className={parts(form.pages).includes(item) ? "selected" : ""} key={item} onClick={() => update({ pages: toggle(form.pages, item) })} type="button">{item}</button>)}</div></div>
              <div className="public-field"><span>Szükséges funkciók</span><div className="public-chip-grid">{(form.commercialModel === "subscription" ? selectedPlan.featureOptions : featureOptions).map((item) => <button className={parts(form.features).includes(item) ? "selected" : ""} key={item} onClick={() => update({ features: toggle(form.features, item) })} type="button">{item}</button>)}</div></div>
              <label className="public-field"><span>Mesélj röviden a vállalkozásról és az ajánlatodról</span><textarea value={form.contentBrief} onChange={(event) => update({ contentBrief: event.target.value })} placeholder="Mivel foglalkoztok, mitől vagytok jók, miért választanak benneteket? Nem kell marketingesen fogalmazni." /></label>
            </div> : null}

            {step === 3 ? <div className="public-brief-slide">
              <header><span>04 / Megjelenés</span><h3>Milyen érzést adjon a márka?</h3><p>Nem kell színeket vagy szakmai kifejezéseket ismerned — válassz az irányok közül.</p></header>
              <div className="public-choice-grid two">{vibes.map(([value, label, copy]) => <button className={form.vibe === value ? "selected" : ""} key={value} onClick={() => update({ vibe: value })} type="button"><strong>{label}</strong><p>{copy}</p></button>)}</div>
              <div className="public-palette-grid">{palettes.map(([value, label, colors]) => <button className={form.palette === value ? "selected" : ""} key={value} onClick={() => update({ palette: value })} type="button"><span>{colors.map((color) => <i key={color} style={{ background: color }} />)}</span><strong>{label}</strong></button>)}</div>
              <button className={`public-custom-palette-option ${form.palette === "custom" ? "selected" : ""}`} onClick={() => update({ palette: "custom" })} type="button">
                <span>{[form.customBg, form.customAccent, form.customText, form.customCta].map((color, index) => <i key={`${color}-${index}`} style={{ background: color }} />)}</span>
                <div><strong>Saját színpaletta</strong><small>Állítsd be pontosan a márkád színeit.</small></div>
              </button>
              {form.palette === "custom" ? <div className="public-custom-palette-picker">
                {([
                  ["customBg", "Háttér"],
                  ["customAccent", "Kiemelő szín"],
                  ["customText", "Szöveg"],
                  ["customCta", "Gomb (CTA)"]
                ] as Array<["customBg" | "customAccent" | "customText" | "customCta", string]>).map(([field, label]) => <label key={field}>
                  <input aria-label={label} type="color" value={form[field]} onChange={(event) => update({ [field]: event.target.value })} />
                  <span><b>{label}</b><small>{form[field].toUpperCase()}</small></span>
                </label>)}
              </div> : null}
              <div className="public-choice-grid two">
                <div><span className="public-question">Van már logód?</span><div className="public-chip-grid"><button className={form.logoStatus === "yes" ? "selected" : ""} onClick={() => update({ logoStatus: "yes", wantLogoDesign: "" })} type="button">Igen</button><button className={form.logoStatus === "no" ? "selected" : ""} onClick={() => update({ logoStatus: "no" })} type="button">Még nincs</button></div></div>
                <div><span className="public-question">Vannak saját képeid?</span><div className="public-chip-grid"><button className={form.photoSource === "own" ? "selected" : ""} onClick={() => update({ photoSource: "own" })} type="button">Igen</button><button className={form.photoSource === "help" ? "selected" : ""} onClick={() => update({ photoSource: "help" })} type="button">Segítséget kérek</button></div></div>
              </div>
              {/* Aki azt mondja „még nincs", annak itt kell tudnia jelezni, hogy
                  szeretne — a részleteket (típus, szín, leírás) az ügyfélkapun
                  kérdezzük meg, hogy ez a lépés rövid maradjon. */}
              {form.logoStatus === "no" ? <div className="public-field"><span>Szeretnél logót terveztetni?</span><div className="public-chip-grid"><button className={form.wantLogoDesign === "yes" ? "selected" : ""} onClick={() => update({ wantLogoDesign: "yes" })} type="button">Igen, kérek ({formatHuf(LOGO_DESIGN_PRICE)})</button><button className={form.wantLogoDesign === "no" ? "selected" : ""} onClick={() => update({ wantLogoDesign: "no" })} type="button">Nem, elég a szöveges márkanév</button></div><small className="public-field-hint">Ha igent választasz, a belépés után megkérdezem a típust, a színeket és azt, mit jelenítsen meg. Fizetni csak a projekt indításakor kell.</small></div> : null}
              <div className="public-secure-note"><span>↗</span><p><strong>A fájlokat még nem kérjük.</strong> A logót, képeket, hozzáféréseket és számlázási adatokat csak a védett ügyfélkapuban töltöd fel.</p></div>
            </div> : null}

            {step === 4 ? <div className="public-brief-slide public-summary">
              <header><span>05 / Mentés</span><h3>A projekted váza elkészült.</h3><p>Most még semmit nem küldtünk el. Válaszd ki, hogyan mented — fiókkal vagy anélkül.</p></header>
              <div className="public-summary-grid">
                <div><span>Konstrukció</span><strong>{form.commercialModel === "subscription" ? `${selectedPlan.name} · ${formatHuf(selectedPlan.price)}/hó` : "Egyedi projekt · egyszeri fejlesztés"}</strong></div>
                <div><span>Márka</span><strong>{form.company}</strong></div>
                <div><span>Elsődleges cél</span><strong>{form.primaryAction}</strong></div>
                <div><span>Megjelenés</span><strong>{selectedVibe[1]} · {form.palette === "custom" ? "Egyedi paletta" : selectedPalette[1]}</strong></div>
              </div>
              <div className="public-auth-gate"><div><span>AJÁNLOTT</span><h4>Mentsd a saját ügyfélfiókodba.</h4><p>Itt tudod feltölteni a logót, a képeket és a hozzáféréseket, és innen indul a szerződés is. Ha már van fiókod, csak lépj be.</p></div><button className="button primary" onClick={continueToAccount} type="button">Belépés vagy regisztráció →</button></div>

              {/* Második kimenet fiók nélkül: enélkül a nem regisztrálók
                  kitöltött briefje nyomtalanul elveszett. */}
              <div className="public-link-gate">
                {linkState === "sent" ? (
                  <div className="public-link-done" role="status">
                    <span aria-hidden="true">✓</span>
                    <div>
                      <strong>Elküldtem a linket.</strong>
                      <p>Nézd meg a(z) <b>{linkEmail.trim().toLowerCase()}</b> postafiókot — a levélben lévő gombbal bármelyik gépen folytathatod. Én is látom, hogy itt jártál, szóval ha elakadsz, tudok segíteni.</p>
                    </div>
                  </div>
                ) : linkState === "open" || linkState === "sending" || linkState === "error" ? (
                  <div className="public-link-form">
                    <label>
                      <span>Hova küldjem a folytatás linkjét?</span>
                      <input
                        autoComplete="email"
                        inputMode="email"
                        onChange={(event) => { setLinkEmail(event.target.value); setLinkError(""); }}
                        placeholder="nev@ceged.hu"
                        type="email"
                        value={linkEmail}
                      />
                    </label>
                    <div className="public-link-actions">
                      <button className="button primary" disabled={linkState === "sending"} onClick={sendDraftLink} type="button">
                        {linkState === "sending" ? "Küldés…" : "Küldés"}
                      </button>
                      <button className="button spectral" onClick={() => { setLinkState("idle"); setLinkError(""); }} type="button">Mégse</button>
                    </div>
                    {linkError ? <p className="public-brief-error" role="alert">{linkError}</p> : null}
                    <small>Nem iratkozol fel semmire. Ezt az egy levelet küldöm el, a benne lévő linkkel folytathatod.</small>
                  </div>
                ) : (
                  <button className="public-link-trigger" onClick={() => setLinkState("open")} type="button">
                    <span aria-hidden="true">✉</span>
                    <div>
                      <strong>Vagy küldd el magadnak emailben</strong>
                      <small>Fiók nélkül. Kapsz egy linket, amivel bármikor, bármelyik gépen folytathatod.</small>
                    </div>
                    <i aria-hidden="true">→</i>
                  </button>
                )}
              </div>
            </div> : null}

            {error ? <p className="public-brief-error" role="alert">{error}</p> : null}
            <div className="public-brief-actions">
              <button className="button secondary" disabled={step === 0} onClick={() => go(step - 1)} type="button">Vissza</button>
              {step < steps.length - 1 ? <button className="button primary" onClick={() => go(step + 1)} type="button">Következő</button> : null}
            </div>
            <div className="public-save-row">
              <small className="public-save-state">● {savedLabel}</small>
              {/* Bármelyik lépésről kimenthető: aki itt hagyja abba, ne vesszen el. */}
              {step > 0 && step < steps.length - 1 && linkState !== "sent" ? (
                <button className="public-save-link" onClick={() => { setStep(steps.length - 1); setLinkState("open"); }} type="button">
                  küldjem emailben?
                </button>
              ) : null}
            </div>
          </form>

          <aside className="public-brief-preview">
            <span>ÉLŐ ELŐNÉZET</span>
            <div className="public-preview-canvas" style={{ background: previewColors[0], color: previewColors[2] }}>
              <header><small style={{ color: previewColors[1] }}>{selectedVibe[1]}</small><i style={{ background: previewColors[1] }} /></header>
              <div className="public-preview-hero">
                <strong>{form.company || "A márkád"}</strong>
                <p>{form.goals || "Ahogy válaszolsz, itt összeáll a projekted iránya."}</p>
                <b style={{ background: previewColors[3] }}>{form.primaryAction || "Ajánlatot kérek"}</b>
              </div>
            </div>
            <dl><div><dt>Célközönség</dt><dd>{form.audience || "Még nincs megadva"}</dd></div><div><dt>Tartalom</dt><dd>{parts(form.pages).slice(0, 4).join(" · ") || "A következő lépésben választod ki"}</dd></div></dl>
          </aside>
        </div>
      </div>
    </section>
  );
}
