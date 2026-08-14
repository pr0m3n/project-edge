"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AI_PROMPT_SECTIONS,
  buildAiBuildPrompt,
  defaultAiPromptOptions,
  estimatePromptTokens,
  promptFileName,
  type AiPromptOptions,
  type AiPromptProject,
  type PromptDepth,
  type PromptSectionKey,
  type PromptStack
} from "@/lib/ai-build-prompt";

/**
 * „AI build prompt" — a beérkezett briefből egyetlen, beilleszthető utasítás.
 *
 * A beállítások globálisan (nem projektenként) maradnak meg: a stúdió
 * munkamódszere ugyanaz minden projektnél, csak a tartalom más. Így a második
 * projektnél már nulla kattintással jó a prompt.
 */

const OPTIONS_KEY = "projectedge-ai-prompt-options-v1";

const stackOptions: Array<[PromptStack, string]> = [
  ["nextjs", "Next.js (App Router)"],
  ["static", "Statikus HTML + CSS"],
  ["astro", "Astro"]
];

const depthOptions: Array<[PromptDepth, string]> = [
  ["full", "Részletes — teljes szabálykészlet"],
  ["compact", "Tömör — rövidebb kontextusablakhoz"]
];

function readStoredOptions(): AiPromptOptions {
  if (typeof window === "undefined") return defaultAiPromptOptions;
  try {
    const raw = window.localStorage.getItem(OPTIONS_KEY);
    if (!raw) return defaultAiPromptOptions;
    const parsed = JSON.parse(raw) as Partial<AiPromptOptions>;
    return {
      ...defaultAiPromptOptions,
      ...parsed,
      sections: { ...defaultAiPromptOptions.sections, ...(parsed.sections ?? {}) },
      // A szabad szöveg projektfüggő, ezért soha nem hozzuk át a előzőből.
      extraInstructions: ""
    };
  } catch {
    return defaultAiPromptOptions;
  }
}

type AiBuildPromptPanelProps = {
  project: AiPromptProject;
  onNotify?: (message: string) => void;
};

export function AiBuildPromptPanel({ project, onNotify }: AiBuildPromptPanelProps) {
  const [options, setOptions] = useState<AiPromptOptions>(defaultAiPromptOptions);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOptions(readStoredOptions());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(OPTIONS_KEY, JSON.stringify({ ...options, extraInstructions: "" }));
    } catch {
      /* privát böngészésben nincs tárolás — a beállítás ilyenkor csak a munkamenetre él */
    }
  }, [options]);

  const prompt = useMemo(() => buildAiBuildPrompt(project, options), [project, options]);
  const tokens = estimatePromptTokens(prompt);
  const activeSections = AI_PROMPT_SECTIONS.filter((section) => options.sections[section.key]).length;

  const update = (patch: Partial<AiPromptOptions>) => setOptions((current) => ({ ...current, ...patch }));
  const toggleSection = (key: PromptSectionKey) =>
    setOptions((current) => ({ ...current, sections: { ...current.sections, [key]: !current.sections[key] } }));

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
      onNotify?.("A prompt a vágólapra másolva.");
    } catch {
      onNotify?.("A másolás nem sikerült — jelöld ki a szöveget és másold kézzel.");
    }
  }

  function downloadPrompt() {
    const blob = new Blob([prompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = promptFileName(project);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="ai-prompt-panel">
      <header className="ai-prompt-head">
        <div>
          <span>AI ÉPÍTÉSI PROMPT</span>
          <h4>Kész utasítás a brief alapján</h4>
          <p>
            A prompt az ügyfél válaszaiból áll össze. Állítsd be, mi kerüljön bele, másold ki, és illeszd be az
            AI-nak — kérdés nélkül fel tudja építeni az oldalt.
          </p>
        </div>
        <div className="ai-prompt-metrics">
          <div>
            <span>Blokkok</span>
            <strong>{activeSections}/{AI_PROMPT_SECTIONS.length}</strong>
          </div>
          <div>
            <span>Hossz</span>
            <strong>{prompt.length.toLocaleString("hu-HU")} kar.</strong>
          </div>
          <div>
            <span>Token (becslés)</span>
            <strong>~{tokens.toLocaleString("hu-HU")}</strong>
          </div>
        </div>
      </header>

      <div className="ai-prompt-controls">
        <label className="admin-field">
          <span>Technológia</span>
          <select value={options.stack} onChange={(event) => update({ stack: event.target.value as PromptStack })}>
            {stackOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>Részletesség</span>
          <select value={options.depth} onChange={(event) => update({ depth: event.target.value as PromptDepth })}>
            {depthOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="ai-prompt-sections">
        {AI_PROMPT_SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            className={options.sections[section.key] ? "selected" : ""}
            onClick={() => toggleSection(section.key)}
            title={section.hint}
          >
            <b>{options.sections[section.key] ? "✓" : "+"}</b>
            <span>{section.label}</span>
            <small>{section.hint}</small>
          </button>
        ))}
      </div>

      <div className="ai-prompt-switches">
        <label>
          <input
            type="checkbox"
            checked={options.includeAssetUrls}
            onChange={(event) => update({ includeAssetUrls: event.target.checked })}
          />
          <span>Feltöltött fájlok linkjei is kerüljenek bele</span>
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.includeContact}
            onChange={(event) => update({ includeContact: event.target.checked })}
          />
          <span>Kapcsolattartó neve és e-mailje is kerüljön bele</span>
        </label>
      </div>

      <label className="admin-field">
        <span>Saját kiegészítés a prompt végére</span>
        <textarea
          value={options.extraInstructions}
          onChange={(event) => update({ extraInstructions: event.target.value })}
          placeholder="Pl.: A hero alá kerüljön egy 3 lépéses folyamatábra. A galéria legyen szűrhető."
        />
      </label>

      <div className="ai-prompt-actions">
        <button className="button primary" type="button" onClick={copyPrompt}>
          {copied ? "Kimásolva ✓" : "Prompt másolása"}
        </button>
        <button className="button secondary" type="button" onClick={downloadPrompt}>
          Letöltés .md fájlként
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => setOptions({ ...defaultAiPromptOptions, extraInstructions: options.extraInstructions })}
        >
          Alapbeállítás
        </button>
      </div>

      <details className="admin-collapse">
        <summary>Prompt előnézete</summary>
        <pre className="ai-prompt-preview">{prompt}</pre>
      </details>
    </section>
  );
}
