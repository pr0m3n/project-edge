"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { TransitionLink } from "@/components/TransitionLink";
import type { Work } from "@/lib/works";

type Props = { works: Work[] };

/** A karusszel horgonya: a demók „Vissza a munkákhoz" linkje ide görget. */
export const WORK_CAROUSEL_ANCHOR = "munka-valaszto";
const PARAM = "munka";

export function WorkCarousel({ works }: Props) {
  // Az első elemmel indul (lib/works.ts sorrendje) — ugyanaz a sorrend,
  // amivel a főoldali pakli is kezd.
  const [active, setActive] = useState(0);
  /** Visszatéréskor az első képkockán kikapcsoljuk az átmenetet, különben a
   *  kártyák az 1. munkától „végiggurulnának" a visszaállítottig. */
  const [restoring, setRestoring] = useState(false);
  const tabsRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // A `scrollIntoView()` Safariban a belső fülsor mellett a teljes oldalt is
  // vízszintesen eltolhatja. Csak a ténylegesen túlcsorduló fülsort mozgatjuk.
  const revealTab = useCallback((index: number, behavior: ScrollBehavior) => {
    const tabs = tabsRef.current;
    const tab = tabRefs.current[index];
    if (!tabs || !tab || tabs.scrollWidth <= tabs.clientWidth) return;

    const left = tab.offsetLeft - (tabs.clientWidth - tab.offsetWidth) / 2;
    tabs.scrollTo({ left: Math.max(0, left), behavior });
  }, []);

  const select = useCallback((index: number) => {
    const next = (index + works.length) % works.length;
    setActive(next);

    // A választás az URL-be kerül (újratöltés nélkül). Így ha a látogató
    // megnyit egy bemutatót, és visszalép — a böngésző gombjával vagy a
    // demósáv linkjével —, ugyanitt folytatja, nem az 1. munkánál.
    const url = new URL(window.location.href);
    url.searchParams.set(PARAM, works[next].id);
    window.history.replaceState(window.history.state, "", url);

    revealTab(next, "smooth");
  }, [works, revealTab]);

  // `useSearchParams` helyett a `location`: az oldal statikusan renderelt, és
  // a paraméter csak a kiinduló kártyát dönti el — ehhez nem kell Suspense.
  useLayoutEffect(() => {
    const id = new URLSearchParams(window.location.search).get(PARAM);
    const index = works.findIndex((work) => work.id === id);
    if (index <= 0) return;
    // Szándékos: az URL külső állapot, csak a csatolás után olvasható ki
    // (a szerver nem látja), és festés ELŐTT kell átállni rá.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRestoring(true);
    setActive(index);
    revealTab(index, "instant");
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setRestoring(false)));
    return () => cancelAnimationFrame(frame);
  }, [works, revealTab]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") select(active - 1);
      if (event.key === "ArrowRight") select(active + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, select]);

  return (
    <div className={`work-carousel${restoring ? " is-restoring" : ""}`} id={WORK_CAROUSEL_ANCHOR}>
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
