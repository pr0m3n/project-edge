"use client";

import { useMemo, useState } from "react";
import { TransitionLink } from "@/components/TransitionLink";
import { BlogCover } from "@/components/blog/BlogCover";
import { BLOG_CATEGORIES, formatBlogDate, type BlogPost } from "@/lib/blog";

const ALL = "Összes";

/**
 * A cikklista kategóriaszűrővel.
 *
 * A szűrés kliensoldali, mert a cikkek száma kicsi és így nincs oldalújratöltés
 * — de a lista szerveroldalon teljes egészében renderelődik, tehát a kereső és
 * a JS nélküli látogató is minden cikket lát.
 */
export function BlogList({ posts }: { posts: BlogPost[] }) {
  const [category, setCategory] = useState<string>(ALL);

  // Csak azok a kategóriák jelennek meg gombként, amelyekhez tényleg van cikk.
  const categories = useMemo(
    () => [ALL, ...BLOG_CATEGORIES.filter((item) => posts.some((post) => post.category === item))],
    [posts]
  );

  const visible = category === ALL ? posts : posts.filter((post) => post.category === category);

  return (
    <>
      <div className="blog-filter" role="group" aria-label="Szűrés téma szerint">
        {categories.map((item) => (
          <button
            aria-pressed={category === item}
            className={category === item ? "active" : ""}
            key={item}
            onClick={() => setCategory(item)}
            type="button"
          >
            {item}
            <em>{item === ALL ? posts.length : posts.filter((post) => post.category === item).length}</em>
          </button>
        ))}
      </div>

      <div className="blog-grid">
        {visible.map((post, index) => (
          <TransitionLink
            className={`blog-card${index === 0 && category === ALL ? " featured" : ""}`}
            href={`/blog/${post.slug}`}
            key={post.slug}
          >
            <span className="blog-card-art" aria-hidden="true">
              <BlogCover slug={post.slug} />
            </span>
            <span className="blog-card-cat">{post.category}</span>
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
            <div className="blog-card-meta">
              <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
              <span>{post.readingMinutes} perc olvasás</span>
            </div>
            <strong className="blog-card-cta">Elolvasom →</strong>
          </TransitionLink>
        ))}
      </div>
    </>
  );
}
