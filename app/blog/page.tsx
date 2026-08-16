import type { Metadata } from "next";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { JsonLd } from "@/components/JsonLd";
import { BlogList } from "@/components/blog/BlogList";
import { BLOG_POSTS } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — weboldal, konverzió és technikai alapok | ProjectEdge",
  description:
    "Érthető, gyakorlati írások vállalkozóknak: miért nem hoz ügyfelet a weboldalad, mennyibe kerül egy oldal, mit jelent a domain és a tárhely, és hogyan találjon meg a Google helyben.",
  alternates: { canonical: "/blog" }
};

export default function BlogIndexPage() {
  return (
    <main className="site-shell light-page blog-page">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "ProjectEdge blog",
          url: "https://www.projectedge.hu/blog",
          publisher: { "@id": "https://www.projectedge.hu/#business" },
          blogPost: BLOG_POSTS.map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            description: post.excerpt,
            datePublished: post.publishedAt,
            url: `https://www.projectedge.hu/blog/${post.slug}`
          }))
        }}
      />
      <SiteNav />

      <section className="page-hero compact">
        <p className="micro-label dark">Blog</p>
        <h1>Amit tudni érdemes, mielőtt weboldalt csináltatsz.</h1>
        <p>
          Nem szakmai szócséplés, hanem az a néhány dolog, ami tényleg számít: miért nem hoz
          megkeresést egy szép oldal, mennyibe kerül mindez valójában, és mit jelentenek azok a
          technikai szavak, amiket minden ajánlatban látsz.
        </p>
      </section>

      <section className="blog-index">
        <BlogList posts={BLOG_POSTS} />
      </section>

      <section className="cta-band">
        <h2>Inkább megnézetnéd valakivel a saját oldaladat?</h2>
        <TransitionLink className="button primary" href="/ingyenes-weboldal-audit">
          Kérek egy ingyenes elemzést
        </TransitionLink>
      </section>
    </main>
  );
}
