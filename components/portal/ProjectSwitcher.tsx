import type { Project } from "@/components/ClientPortal";

const switcherStatusLabels: Record<string, string> = {
  request_received: "Brief",
  planning: "Tervezés",
  offer_sent: "Ajánlat",
  contract_pending: "Szerződés",
  deposit_pending: "Foglaló",
  in_progress: "Épül",
  review: "Átnézés",
  launched: "Élesítve",
  paused: "Szünetel",
  deletion_pending: "Törlésre vár"
};

type ProjectSwitcherProps = {
  projects: Project[];
  selectedId: string;
  onSelect: (id: string) => void;
};

// Only rendered when the client has more than one active project — the
// common single-project case skips this entirely.
export function ProjectSwitcher({ projects, selectedId, onSelect }: ProjectSwitcherProps) {
  return (
    <div className="project-switcher" role="tablist" aria-label="Projektek">
      {projects.map((project) => (
        <button
          key={project.id}
          type="button"
          role="tab"
          aria-selected={project.id === selectedId}
          className={`project-switcher-pill ${project.id === selectedId ? "active" : ""}`}
          onClick={() => onSelect(project.id)}
        >
          <strong>{project.title}</strong>
          <span>{switcherStatusLabels[project.status] ?? project.status}</span>
        </button>
      ))}
    </div>
  );
}
