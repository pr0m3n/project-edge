import Link from "next/link";

/**
 * Minden mintaprojekt tetején végig ott ül (sticky): egyértelműsíti, hogy a
 * bemutatott márka nem valós ügyfél, és bárhonnan visszavezet a ProjectEdge
 * oldalra — az oldal aljáról is.
 */
export function DemoBar({ project }: { project: string }) {
  return (
    <div className="demo-bar">
      <div className="demo-bar-inner">
        <span className="demo-bar-tag">Mintaprojekt</span>
        <p className="demo-bar-text">
          <strong>ProjectEdge demó</strong> — a(z) {project} kitalált márka, nem valós ügyfél.
        </p>
        <p className="demo-bar-text short">
          <strong>ProjectEdge demó</strong> — kitalált márka
        </p>
        <Link className="demo-bar-link" href="/munkak">
          <span className="demo-bar-arrow" aria-hidden="true" />
          <span className="demo-bar-link-long">Vissza a munkákhoz</span>
          <span className="demo-bar-link-short">Munkák</span>
        </Link>
      </div>
    </div>
  );
}
