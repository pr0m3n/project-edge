"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  initialBriefForm,
  PUBLIC_BRIEF_DRAFT_KEY,
  readPublicBriefDraft,
  type BriefFormValues
} from "@/lib/brief-draft";
import { formatHuf, SUBSCRIPTION_PLANS, subscriptionPlan } from "@/lib/subscriptions";

const steps = ["Konstrukció", "Cél és ügyfél", "Tartalom", "Megjelenés", "Ellenőrzés"];
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
  }
  return "";
}

export function PublicBriefWizard() {
  const router = useRouter();
  const [form, setForm] = useState<BriefFormValues>(initialBriefForm);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const skipFirstAutosave = useRef(true);

  useEffect(() => {
    const saved = readPublicBriefDraft(window.localStorage.getItem(PUBLIC_BRIEF_DRAFT_KEY));
    if (saved) {
      setForm(saved.data);
      setSavedAt(saved.savedAt);
      setStep(saved.step);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (skipFirstAutosave.current) {
      skipFirstAutosave.current = false;
      return;
    }
    const now = new Date().toISOString();
    window.localStorage.setItem(PUBLIC_BRIEF_DRAFT_KEY, JSON.stringify({ data: form, savedAt: now, step, version: 1 }));
    setSavedAt(now);
  }, [form, ready, step]);

  const selectedPlan = subscriptionPlan(form.subscriptionPlan);
  const selectedVibe = vibes.find(([key]) => key === form.vibe) ?? vibes[1];
  const selectedPalette = palettes.find(([key]) => key === form.palette) ?? palettes[0];
  const progress = Math.round(((step + 1) / steps.length) * 100);
  const savedLabel = useMemo(() => {
    if (!savedAt) return "A válaszaid ezen az eszközön mentődnek";
    return `Automatikusan mentve · ${new Date(savedAt).toLocaleTimeString("hu-HU", { hour: "2-digit", minute: "2-digit" })}`;
  }, [savedAt]);

  function update(values: Partial<BriefFormValues>) {
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
  }

  function continueToAccount() {
    const paletteName = palettes.find(([key]) => key === form.palette)?.[1] ?? "Rátok bízom";
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
    router.push("/ugyfelkapu?brief=continue");
  }

  return (
    <section className="public-brief" id="projektbrief">
      <div className="public-brief-intro">
        <p className="micro-label">Projektindító adatlap</p>
        <h2>Rakjuk össze előbb a jó irányt.</h2>
        <p>Belépés nélkül elkezdheted. A végén létrehozod a fiókodat, a válaszaid pedig automatikusan átkerülnek az ügyfélkapuba.</p>
        <div className="public-brief-points">
          <span>01 · 5 rövid lépés</span>
          <span>02 · Automatikus mentés</span>
          <span>03 · Beküldés csak jóváhagyással</span>
        </div>
      </div>

      <div className="public-brief-shell">
        <div className="public-brief-windowbar"><span /><span /><span /><b>projectedge / brief</b><em>{progress}%</em></div>
        <div className="public-brief-progress"><i style={{ width: `${progress}%` }} /></div>
        <nav className="public-brief-steps" aria-label="Brief lépései">
          {steps.map((label, index) => (
            <button className={index === step ? "active" : index < step ? "done" : ""} key={label} onClick={() => index <= step && go(index)} type="button">
              <span>{index < step ? "✓" : index + 1}</span>{label}
            </button>
          ))}
        </nav>

        <div className="public-brief-layout">
          <form className="public-brief-form" onSubmit={(event) => event.preventDefault()}>
            {step === 0 ? <div className="public-brief-slide">
              <header><span>01 / Konstrukció</span><h3>Hogyan szeretnéd használni az oldalt?</h3><p>Választhatsz gondtalan havidíjas üzemeltetést vagy teljes tulajdonba kerülő projektet.</p></header>
              <div className="public-choice-grid two">
                <button className={form.commercialModel === "subscription" ? "selected" : ""} onClick={() => update({ commercialModel: "subscription", budget: "subscription", domainStatus: "need", hostingAccess: "managed" })} type="button"><small>INDULÓ DÍJ NÉLKÜL</small><strong>Weboldal-előfizetés</strong><p>Domain, tárhely és technikai felügyelet egy havidíjban.</p></button>
                <button className={form.commercialModel === "purchase" ? "selected" : ""} onClick={() => update({ commercialModel: "purchase", budget: "not-sure" })} type="button"><small>SAJÁT TULAJDON</small><strong>Weboldal-vásárlás</strong><p>Egyedi ajánlat, forráskód és teljes átadás.</p></button>
              </div>
              {form.commercialModel === "subscription" ? <div className="public-plan-grid">
                {SUBSCRIPTION_PLANS.map((plan) => <button className={form.subscriptionPlan === plan.key ? "selected" : ""} key={plan.key} onClick={() => update({ subscriptionPlan: plan.key })} type="button"><span>{plan.name}</span><strong>{formatHuf(plan.price)}<small>/hó</small></strong><p>{plan.short}</p></button>)}
              </div> : <div className="public-chip-grid">
                {projectTypes.map(([value, label]) => <button className={form.projectType === value ? "selected" : ""} key={value} onClick={() => update({ projectType: value })} type="button">{label}</button>)}
              </div>}
              <label className="public-field"><span>Vállalkozás vagy márka neve</span><input value={form.company} onChange={(event) => update({ company: event.target.value })} placeholder="Például: Kovács Épületgépészet" /></label>
              {form.commercialModel === "purchase" ? <div className="public-field"><span>Van már weboldalad?</span><div className="public-chip-grid"><button className={form.websiteStatus === "yes" ? "selected" : ""} onClick={() => update({ websiteStatus: "yes" })} type="button">Igen, megújítanám</button><button className={form.websiteStatus === "no" ? "selected" : ""} onClick={() => update({ websiteStatus: "no", website: "" })} type="button">Nincs, újat kérek</button></div>{form.websiteStatus === "yes" ? <input value={form.website} onChange={(event) => update({ website: event.target.value })} placeholder="https://regioldal.hu" /> : null}</div> : null}
            </div> : null}

            {step === 1 ? <div className="public-brief-slide">
              <header><span>02 / Cél és ügyfél</span><h3>Mit kell elérnie az oldalnak?</h3><p>Nem szakmai leírást kérünk. Mondd el egyszerűen, milyen eredménynek örülnél.</p></header>
              <label className="public-field"><span>Mi a legfontosabb cél?</span><textarea value={form.goals} onChange={(event) => update({ goals: event.target.value })} placeholder="Például: több minőségi ajánlatkérés, hitelesebb megjelenés és kevesebb ismétlődő kérdés…" /></label>
              <label className="public-field"><span>Kiknek készül?</span><textarea value={form.audience} onChange={(event) => update({ audience: event.target.value })} placeholder="Például: Veszprém környéki családok, akik megbízható szakembert keresnek…" /></label>
              <div className="public-field"><span>Mi legyen az elsődleges művelet?</span><div className="public-chip-grid">{["Ajánlatot kérek", "Kapcsolatfelvétel", "Telefonálok", "Időpontot foglalok"].map((item) => <button className={form.primaryAction === item ? "selected" : ""} key={item} onClick={() => update({ primaryAction: item })} type="button">{item}</button>)}</div></div>
            </div> : null}

            {step === 2 ? <div className="public-brief-slide">
              <header><span>03 / Tartalom</span><h3>Miből álljon össze az oldal?</h3><p>Jelöld a fontos részeket. A pontos szerkezetet később együtt finomítjuk.</p></header>
              <div className="public-field"><span>Oldalak vagy tartalmi blokkok</span><div className="public-chip-grid">{(form.commercialModel === "subscription" ? selectedPlan.pageOptions : pageOptions).map((item) => <button className={parts(form.pages).includes(item) ? "selected" : ""} key={item} onClick={() => update({ pages: toggle(form.pages, item) })} type="button">{item}</button>)}</div></div>
              <div className="public-field"><span>Szükséges funkciók</span><div className="public-chip-grid">{(form.commercialModel === "subscription" ? selectedPlan.featureOptions : featureOptions).map((item) => <button className={parts(form.features).includes(item) ? "selected" : ""} key={item} onClick={() => update({ features: toggle(form.features, item) })} type="button">{item}</button>)}</div></div>
              <label className="public-field"><span>Mesélj röviden a vállalkozásról és az ajánlatodról</span><textarea value={form.contentBrief} onChange={(event) => update({ contentBrief: event.target.value })} placeholder="Mivel foglalkoztok, mitől vagytok jók, miért választanak benneteket? Nem kell marketingesen fogalmazni." /></label>
            </div> : null}

            {step === 3 ? <div className="public-brief-slide">
              <header><span>04 / Megjelenés</span><h3>Milyen érzést adjon a márka?</h3><p>Nem kell színeket vagy szakmai kifejezéseket ismerned — válassz az irányok közül.</p></header>
              <div className="public-choice-grid two">{vibes.map(([value, label, copy]) => <button className={form.vibe === value ? "selected" : ""} key={value} onClick={() => update({ vibe: value })} type="button"><strong>{label}</strong><p>{copy}</p></button>)}</div>
              <div className="public-palette-grid">{palettes.map(([value, label, colors]) => <button className={form.palette === value ? "selected" : ""} key={value} onClick={() => update({ palette: value })} type="button"><span>{colors.map((color) => <i key={color} style={{ background: color }} />)}</span><strong>{label}</strong></button>)}</div>
              <div className="public-choice-grid two">
                <div><span className="public-question">Van már logód?</span><div className="public-chip-grid"><button className={form.logoStatus === "yes" ? "selected" : ""} onClick={() => update({ logoStatus: "yes" })} type="button">Igen</button><button className={form.logoStatus === "no" ? "selected" : ""} onClick={() => update({ logoStatus: "no" })} type="button">Még nincs</button></div></div>
                <div><span className="public-question">Vannak saját képeid?</span><div className="public-chip-grid"><button className={form.photoSource === "own" ? "selected" : ""} onClick={() => update({ photoSource: "own" })} type="button">Igen</button><button className={form.photoSource === "help" ? "selected" : ""} onClick={() => update({ photoSource: "help" })} type="button">Segítséget kérek</button></div></div>
              </div>
              <div className="public-secure-note"><span>↗</span><p><strong>A fájlokat még nem kérjük.</strong> A logót, képeket, hozzáféréseket és számlázási adatokat csak a védett ügyfélkapuban töltöd fel.</p></div>
            </div> : null}

            {step === 4 ? <div className="public-brief-slide public-summary">
              <header><span>05 / Ellenőrzés</span><h3>A projekted váza elkészült.</h3><p>Most még semmit nem küldtünk el. Belépés után kiegészítheted a privát anyagokkal, majd külön jóváhagyással küldheted be.</p></header>
              <div className="public-summary-grid">
                <div><span>Konstrukció</span><strong>{form.commercialModel === "subscription" ? `${selectedPlan.name} · ${formatHuf(selectedPlan.price)}/hó` : "Saját tulajdonú projekt"}</strong></div>
                <div><span>Márka</span><strong>{form.company}</strong></div>
                <div><span>Elsődleges cél</span><strong>{form.primaryAction}</strong></div>
                <div><span>Megjelenés</span><strong>{selectedVibe[1]} · {selectedPalette[1]}</strong></div>
              </div>
              <div className="public-auth-gate"><div><span>UTOLSÓ LÉPÉS</span><h4>Mentsd a saját ügyfélfiókodba.</h4><p>Ha már van fiókod, csak lépj be. Ha nincs, kevesebb mint egy perc alatt létrehozhatod.</p></div><button className="button primary" onClick={continueToAccount} type="button">Belépés vagy regisztráció →</button></div>
            </div> : null}

            {error ? <p className="public-brief-error" role="alert">{error}</p> : null}
            <div className="public-brief-actions">
              <button className="button secondary" disabled={step === 0} onClick={() => go(step - 1)} type="button">Vissza</button>
              {step < steps.length - 1 ? <button className="button primary" onClick={() => go(step + 1)} type="button">Következő</button> : null}
            </div>
            <small className="public-save-state">● {savedLabel}</small>
          </form>

          <aside className="public-brief-preview">
            <span>ÉLŐ ELŐNÉZET</span>
            <div style={{ background: selectedPalette[2][0], color: selectedPalette[2][2] }}>
              <small style={{ color: selectedPalette[2][1] }}>{selectedVibe[1]}</small>
              <strong>{form.company || "A márkád"}</strong>
              <p>{form.goals || "Ahogy válaszolsz, itt összeáll a projekted iránya."}</p>
              <b style={{ background: selectedPalette[2][3] }}>{form.primaryAction || "Ajánlatot kérek"}</b>
            </div>
            <dl><div><dt>Célközönség</dt><dd>{form.audience || "Még nincs megadva"}</dd></div><div><dt>Tartalom</dt><dd>{parts(form.pages).slice(0, 4).join(" · ") || "A következő lépésben választod ki"}</dd></div></dl>
          </aside>
        </div>
      </div>
    </section>
  );
}
