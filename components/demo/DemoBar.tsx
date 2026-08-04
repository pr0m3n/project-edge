import Link from "next/link";

/**
 * Minden mintaprojekt tetején ott ül: egyértelműsíti, hogy a bemutatott márka
 * nem valós ügyfél, és visszavezet a ProjectEdge oldalra.
 */
export function DemoBar({ project }: { project: string }) {
  return (
    <div className="demo-bar">
      <div className="demo-bar-inner">
        <span className="demo-bar-tag">Mintaprojekt</span>
        <p className="demo-bar-text">
          Ez egy <strong>ProjectEdge demó</strong> — a(z) {project} kitalált márka, nem valós
          ügyfél. Az oldal minden eleme saját fejlesztés.
        </p>
        <Link className="demo-bar-link" href="/munkak">
          Vissza a munkákhoz
        </Link>
      </div>
    </div>
  );
}
