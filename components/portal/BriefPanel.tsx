import { FormEvent } from "react";
import type { Project, BriefFormValues } from "@/components/ClientPortal";
import { parseBrief, paletteByName } from "@/components/ClientPortal";

type BriefPanelProps = {
  project: Project;
  isEditing: boolean;
  editForm: BriefFormValues;
  onEditFormChange: (value: BriefFormValues) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (event: FormEvent<HTMLFormElement>) => void;
};

export function BriefPanel({
  project,
  isEditing,
  editForm,
  onEditFormChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit
}: BriefPanelProps) {
  const brief = parseBrief(project.goals);
  const palette =
    project.brief_data?.palette === "custom"
      ? [
          project.brief_data.customBg,
          project.brief_data.customAccent,
          project.brief_data.customText,
          project.brief_data.customCta
        ].filter((color): color is string => Boolean(color))
      : paletteByName(brief["Színirány"]);
  const briefFields = [
    ["Cél", brief["Cél"]],
    ["Célközönség", brief["Célközönség / vásárlók"]],
    ["Oldalak", brief["Fontos oldalak"]],
    ["Funkciók", brief["Kért funkciók"]],
    ["Stílus", brief["Stílus / hangulat"]],
    ["Karakter", brief["Vizuális karakter"]],
    ["Prioritás", brief["Prioritás"]]
  ].filter(([, value]) => Boolean(value));

  if (isEditing) {
    return (
      <form
        onSubmit={onSaveEdit}
        style={{
          display: "grid",
          gap: "16px",
          marginTop: "16px",
          background: "rgba(0,0,0,0.02)",
          padding: "18px",
          borderRadius: "22px",
          border: "1px solid rgba(0,0,0,0.06)"
        }}
      >
        <h4 style={{ margin: 0, fontSize: "18px" }}>Brief Szerkesztése</h4>
        <div className="field">
          <label htmlFor="edit-title">Projekt neve</label>
          <input id="edit-title" required value={editForm.title} onChange={(e) => onEditFormChange({ ...editForm, title: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="edit-company">Cég / márka</label>
          <input id="edit-company" value={editForm.company} onChange={(e) => onEditFormChange({ ...editForm, company: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="edit-website">Weboldal</label>
          <input id="edit-website" value={editForm.website} onChange={(e) => onEditFormChange({ ...editForm, website: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="edit-goals">Mit érjen el az oldal?</label>
          <textarea id="edit-goals" required value={editForm.goals} onChange={(e) => onEditFormChange({ ...editForm, goals: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="edit-audience">Célközönség</label>
          <textarea id="edit-audience" value={editForm.audience} onChange={(e) => onEditFormChange({ ...editForm, audience: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="edit-pages">Milyen oldalak kellenek?</label>
          <textarea id="edit-pages" value={editForm.pages} onChange={(e) => onEditFormChange({ ...editForm, pages: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="edit-features">Kért funkciók</label>
          <textarea id="edit-features" value={editForm.features} onChange={(e) => onEditFormChange({ ...editForm, features: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="edit-style">Stílus / hangulat</label>
          <textarea id="edit-style" value={editForm.style} onChange={(e) => onEditFormChange({ ...editForm, style: e.target.value })} />
        </div>
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button className="button secondary" type="button" onClick={onCancelEdit}>Mégse</button>
          <button className="button primary" type="submit">Módosítások mentése</button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="project-brief-visual">
        <div className="project-brief-main">
          <span>Beküldött terv</span>
          <strong>{brief["Cél"] || project.goals}</strong>
        </div>
        <div className="project-brief-palette">
          <span>{brief["Színirány"] || "Színirány"}</span>
          <div>
            {palette.map((color) => (
              <i key={color} style={{ background: color }} />
            ))}
          </div>
        </div>
      </div>
      <details className="disclosure">
        <summary>Beküldött terv részletei</summary>
        <div className="disclosure-body project-brief-grid">
          {briefFields.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </details>

      {(project.status === "request_received" || project.status === "planning") && !project.delete_requested && (
        <button className="button secondary" style={{ width: "fit-content", marginTop: "4px" }} type="button" onClick={onStartEdit}>
          Brief szerkesztése
        </button>
      )}
    </>
  );
}
