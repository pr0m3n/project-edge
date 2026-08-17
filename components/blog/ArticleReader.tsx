"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RichText } from "@/components/blog/RichText";
import { headingId, type BlogBlock, type BlogPost } from "@/lib/blog";

/**
 * A cikk törzse és az olvasást segítő interakciók.
 *
 * Három dolog kliensoldali: az olvasási haladásjelző, a tartalomjegyzék
 * görgetéskövetése, és a kipipálható ellenőrzőlisták. A pipák a böngészőben
 * maradnak (localStorage), tehát az olvasó a saját tempójában végigmehet a
 * listán, és visszatérve ott folytatja.
 */
export function ArticleReader({ post }: { post: BlogPost }) {
  const articleRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState("");

  const headings = useMemo(
    () =>
      post.blocks
        .filter((block): block is Extract<BlogBlock, { type: "h2" }> => block.type === "h2")
        .map((block) => ({ id: headingId(block.text), text: block.text })),
    [post.blocks]
  );

  /**
   * Olvasási haladás ÉS a tartalomjegyzék kiemelése — egyetlen görgetés-figyelőből.
   *
   * A kiemelés korábban IntersectionObserverrel ment, de annak két gyengéje van
   * itt: két cím között egyik sem metszi a sávot (így „lyukak” keletkeznek), az
   * utolsó szakasz pedig a lap alján sosem kerül a sávba. A pozícióalapú
   * számítás ehelyett minden görgetési állásra egyértelmű választ ad.
   */
  useEffect(() => {
    function update() {
      const article = articleRef.current;
      if (!article) return;

      const viewport = window.innerHeight;
      const readable = article.offsetHeight - viewport * 0.5;
      const scrolled = window.scrollY - article.offsetTop + viewport * 0.5;
      setProgress(readable <= 0 ? 100 : Math.max(0, Math.min(100, (scrolled / readable) * 100)));

      // Az a szakasz aktív, amelyik címe már átlépte a viewport felső
      // harmadát — az utolsó ilyen, tehát ahol az olvasó épp tart.
      const line = viewport * 0.3;
      let current = "";
      for (const { id } of headings) {
        const element = document.getElementById(id);
        if (element && element.getBoundingClientRect().top <= line) current = id;
      }
      setActiveHeading(current);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [headings]);

  return (
    <div className="article-layout">
      <div aria-hidden="true" className="article-progress">
        <i style={{ width: `${progress}%` }} />
      </div>

      {headings.length > 1 ? (
        <aside className="article-toc">
          <span className="article-toc-title">Ebben a cikkben</span>
          <nav aria-label="Tartalomjegyzék">
            {headings.map((heading) => (
              <a
                className={activeHeading === heading.id ? "active" : ""}
                href={`#${heading.id}`}
                key={heading.id}
              >
                {heading.text}
              </a>
            ))}
          </nav>
        </aside>
      ) : null}

      <div className="article-body" ref={articleRef}>
        {post.blocks.map((block, index) => (
          <Block block={block} key={index} storageKey={`${post.slug}-${index}`} />
        ))}
      </div>
    </div>
  );
}

function Block({ block, storageKey }: { block: BlogBlock; storageKey: string }) {
  switch (block.type) {
    case "h2":
      return <h2 id={headingId(block.text)}>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "p":
      return <p><RichText text={block.text} /></p>;
    case "ul":
      return (
        <ul className="article-list">
          {block.items.map((item) => <li key={item}><RichText text={item} /></li>)}
        </ul>
      );
    case "ol":
      return (
        <ol className="article-list ordered">
          {block.items.map((item) => <li key={item}><RichText text={item} /></li>)}
        </ol>
      );
    case "callout":
      return (
        <aside className="article-callout">
          <strong>{block.title}</strong>
          <p><RichText text={block.text} /></p>
        </aside>
      );
    case "compare":
      return <CompareBlock block={block} />;
    case "checklist":
      return <ChecklistBlock block={block} storageKey={storageKey} />;
    case "stat":
      return (
        <aside className="article-stat">
          <strong>{block.value}</strong>
          <span>{block.label}</span>
          {block.note ? <small>{block.note}</small> : null}
        </aside>
      );
    case "quote":
      return (
        <blockquote className="article-pullquote">
          <p><RichText text={block.text} /></p>
        </blockquote>
      );
  }
}

function CompareBlock({ block }: { block: Extract<BlogBlock, { type: "compare" }> }) {
  return (
    <section className="article-compare">
      <h4>{block.title}</h4>
      <div className="article-compare-head" aria-hidden="true">
        <span>Gyakori</span>
        <span>Ami működik</span>
      </div>
      <div className="article-compare-rows">
        {block.rows.map((row) => (
          <article key={row.label}>
            <span className="compare-label">{row.label}</span>
            <div className="compare-bad"><RichText text={row.bad} /></div>
            <div className="compare-good"><RichText text={row.good} /></div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChecklistBlock({
  block,
  storageKey
}: {
  block: Extract<BlogBlock, { type: "checklist" }>;
  storageKey: string;
}) {
  const key = `projectedge-blog-check-${storageKey}`;
  const [checked, setChecked] = useState<string[]>([]);
  /**
   * A visszatöltés megtörténtét ÁLLAPOT jelzi, nem ref.
   *
   * Reffel a mentő effekt még ugyanabban a mountolási körben lefutott, amikor a
   * `checked` értéke a visszatöltés ellenére még az üres kezdőérték volt — és
   * azzal írta felül a tárolót. Így minden újratöltés kinullázta a pipákat.
   * Állapottal a mentés csak a visszatöltést követő renderben indul.
   */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored) setChecked(JSON.parse(stored) as string[]);
    } catch {
      /* privát böngészésben nincs tárolás — a lista így is használható */
    }
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(checked));
    } catch {
      /* lásd fent */
    }
  }, [checked, hydrated, key]);

  function toggle(item: string) {
    setChecked((current) =>
      current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]
    );
  }

  const done = block.items.filter((item) => checked.includes(item)).length;
  const ratio = Math.round((done / block.items.length) * 100);

  return (
    <section className="article-checklist">
      <header>
        <div>
          <h4>{block.title}</h4>
          {block.intro ? <p><RichText text={block.intro} /></p> : null}
        </div>
        <div className="checklist-score" aria-live="polite">
          <strong>{done}<small>/{block.items.length}</small></strong>
          <span>kipipálva</span>
        </div>
      </header>
      <div className="checklist-progress" aria-hidden="true"><i style={{ width: `${ratio}%` }} /></div>
      <ul>
        {block.items.map((item) => {
          const isChecked = checked.includes(item);
          return (
            <li key={item}>
              <button
                aria-pressed={isChecked}
                className={isChecked ? "checked" : ""}
                onClick={() => toggle(item)}
                type="button"
              >
                <span className="checklist-box" aria-hidden="true">{isChecked ? "✓" : ""}</span>
                <span className="checklist-text"><RichText text={item} /></span>
              </button>
            </li>
          );
        })}
      </ul>
      {done === block.items.length ? (
        <p className="checklist-done">Mind megvan — ez már egy jól felépített oldal.</p>
      ) : null}
    </section>
  );
}
