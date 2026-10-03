"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Szövegmező, ami a mező elhagyásakor ment — de csak ha tényleg változott.
 *
 * A régi admin `defaultValue` + `onBlur` mezői két hibát hordoztak: minden
 * elhagyáskor mentettek (és értesítést küldtek az ügyfélnek akkor is, ha
 * semmi nem változott), és ha közben realtime frissítés jött, a mező a régi
 * értéket mutatta tovább. Ez a mező követi a külső értéket, amíg nem
 * szerkeszted, és csak a valódi változást menti.
 */
export function BlurField({
  label,
  value,
  onSave,
  placeholder,
  type = "text",
  multiline = false,
  hint,
  wide = false,
  rows
}: {
  label: string;
  value: string | number | null | undefined;
  onSave: (next: string) => void | Promise<unknown>;
  placeholder?: string;
  type?: "text" | "number" | "url" | "email";
  multiline?: boolean;
  hint?: string;
  wide?: boolean;
  rows?: number;
}) {
  const external = value === null || value === undefined ? "" : String(value);
  const [draft, setDraft] = useState(external);
  const [saving, setSaving] = useState(false);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(external);
  }, [external]);

  async function commit() {
    focused.current = false;
    if (draft.trim() === external.trim()) return;
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  }

  const common = {
    className: multiline ? "pa-textarea" : "pa-input",
    onBlur: () => void commit(),
    onChange: (event: { target: { value: string } }) => setDraft(event.target.value),
    onFocus: () => {
      focused.current = true;
    },
    placeholder,
    value: draft
  };

  return (
    <label className={`pa-field${wide ? " is-wide" : ""}`}>
      <span>
        {label}
        {saving ? <em className="pa-faint" style={{ fontStyle: "normal", marginLeft: 8 }}>mentés…</em> : null}
      </span>
      {multiline ? <textarea {...common} rows={rows ?? 4} /> : <input {...common} inputMode={type === "number" ? "numeric" : undefined} type={type} />}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}
