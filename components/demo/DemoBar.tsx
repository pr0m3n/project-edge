"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WORK_CAROUSEL_ANCHOR } from "@/components/WorkCarousel";
import { WORKS } from "@/lib/works";

/**
 * Minden mintaprojekt tetején végig ott ül (sticky): egyértelműsíti, hogy a
 * bemutatott márka nem valós ügyfél, és bárhonnan visszavezet a ProjectEdge
 * oldalra — az oldal aljáról is.
 *
 * A visszalink UGYANARRA a munkára visz vissza a karusszelben, ahonnan a
 * látogató jött (`?munka=…#munka-valaszto`), nem az oldal tetejére és az 1.
 * munkára — különben minden bemutató után újra végig kellene lapoznia.
 */
export function DemoBar({ project }: { project: string }) {
  const pathname = usePathname();
  const work = WORKS.find((item) => !item.external && (pathname === item.href || pathname.startsWith(`${item.href}/`)));
  const href = work ? `/munkak?munka=${work.id}#${WORK_CAROUSEL_ANCHOR}` : "/munkak";

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
        <Link className="demo-bar-link" href={href}>
          <span className="demo-bar-arrow" aria-hidden="true" />
          <span className="demo-bar-link-long">Vissza a munkákhoz</span>
          <span className="demo-bar-link-short">Munkák</span>
        </Link>
      </div>
    </div>
  );
}
