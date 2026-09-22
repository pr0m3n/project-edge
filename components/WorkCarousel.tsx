"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { TransitionLink } from "@/components/TransitionLink";
import type { Work } from "@/lib/works";

type Props = { works: Work[] };

export function WorkCarousel({ works }: Props) {
  // Az első elemmel indul: az a valódi, élesben futó ügyfélmunka (Auto
  // Aesthetik) — ugyanaz a sorrend, amivel a főoldali pakli is kezd.
  const [active, setActive] = useState(0);
  const tabsRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = useCallback((index: number) => {
    const next = (index + works.length) % works.length;
    setActive(next);

    // A `scrollIntoView()` Safariban a belső fülsor mellett a teljes oldalt is
    // vízszintesen eltolhatja. Csak a ténylegesen túlcsorduló fülsort mozgatjuk.
    const tabs = tabsRef.current;
    const tab = tabRefs.current[next];
    if (!tabs || !tab || tabs.scrollWidth <= tabs.clientWidth) return;

    const left = tab.offsetLeft - (tabs.clientWidth - tab.offsetWidth) / 2;
    tabs.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [works.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") select(active - 1);
      if (event.key === "ArrowRight") select(active + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, select]);

  return (
    <div className="work-carousel">
      <div aria-live="polite" className="work-carousel-viewport">
        {works.map((work, index) => {
          const offset = index - active;
          const isActive = offset === 0;
          const isNear = Math.abs(offset) <= 1;
          const linkLabel = work.external ? "Élő oldal megnyitása" : "Bemutató megnyitása";

          return (
            <article
              aria-hidden={!isActive}
              className={`work-carousel-card${isActive ? " is-active" : ""}${isNear ? " is-near" : ""}`}
              inert={!isActive}
              key={work.id}
              style={{ "--offset": offset } as React.CSSProperties}
            >
              <div className="work-carousel-card-copy">
                <span className="work-carousel-kicker">
                  {String(index + 1).padStart(2, "0")} <i /> {work.goal}
                </span>
                <h3>{work.name}</h3>
                <p className="work-carousel-tagline">{work.copy}</p>
                <span className="work-carousel-industry">{work.industry}</span>
                {work.external ? (
                  <a className="work-carousel-link" href={work.href} rel="noreferrer" target="_blank">
                    {linkLabel} <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <TransitionLink className="work-carousel-link" href={work.href}>
                    {linkLabel} <span aria-hidden="true">↗</span>
                  </TransitionLink>
                )}
              </div>

              <div className="work-carousel-browser">
                <span className="work-carousel-browserbar" aria-hidden="true"><i /><i /><i /></span>
                <Image
                  alt={`${work.name} — ${work.goal}`}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 720px) 88vw, (max-width: 1100px) 70vw, 54vw"
                  src={work.src}
                />
              </div>
            </article>
          );
        })}
      </div>

      <div className="work-carousel-controls">
        <button aria-label="Előző referencia" className="work-carousel-arrow" onClick={() => select(active - 1)} type="button">←</button>
        <span className="work-carousel-count"><b>{String(active + 1).padStart(2, "0")}</b> / {String(works.length).padStart(2, "0")}</span>
        <button aria-label="Következő referencia" className="work-carousel-arrow is-next" onClick={() => select(active + 1)} type="button">→</button>
      </div>

      <nav aria-label="Referencia kiválasztása" className="work-carousel-tabs" ref={tabsRef} role="tablist">
        {works.map((work, index) => (
          <button
            aria-selected={index === active}
            className={index === active ? "is-active" : ""}
            key={work.id}
            onClick={() => select(index)}
            ref={(node) => { tabRefs.current[index] = node; }}
            role="tab"
            type="button"
          >
            {work.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
