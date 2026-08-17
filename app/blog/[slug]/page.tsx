import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { TransitionLink } from "@/components/TransitionLink";
import { JsonLd } from "@/components/JsonLd";
import { ArticleReader } from "@/components/blog/ArticleReader";
import { BlogCover } from "@/components/blog/BlogCover";
import { BLOG_POSTS, blogPost, formatBlogDate, relatedPosts } from "@/lib/blog";
import { PROVIDER } from "@/lib/legal";

type Params = { params: Promise<{ slug: string }> };

/** Minden cikk statikusan előrenderelődik — nincs futásidejű adatforrás. */
export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPost(slug);
  if (!post) return { title: "A cikk nem található | ProjectEdge" };

  return {
    title: `${post.title} | ProjectEdge blog`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      url: `https://www.projectedge.hu/blog/${post.slug}`,
      publishedTime: post.publishedAt
    }
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = blogPost(slug);
  if (!post) notFound();

  const related = relatedPosts(post.slug);

  return (
    <main className="site-shell light-page blog-article">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishedAt,
          dateModified: post.publishedAt,
          inLanguage: "hu-HU",
          author: { "@type": "Person", name: PROVIDER.contactName },
          publisher: { "@id": "https://www.projectedge.hu/#business" },
          mainEntityOfPage: `https://www.projectedge.hu/blog/${post.slug}`
        }}
      />
      <SiteNav />

      <article className="article-shell">
        <header className="article-head">
          <TransitionLink className="article-back" href="/blog">← Vissza a bloghoz</TransitionLink>
          <span className="article-cat">{post.category}</span>
          <h1>{post.title}</h1>
          <p className="article-audience">{post.audience}</p>
          <div className="article-meta">
            <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
            <span>{post.readingMinutes} perc olvasás</span>
            <span>{PROVIDER.contactName}</span>
          </div>
          <div className="article-art">
            <BlogCover slug={post.slug} />
          </div>
        </header>

        <ArticleReader post={post} />
      </article>

      {related.length ? (
        <section className="article-related">
          <div className="section-head">
            <p className="micro-label dark">Olvasd el ezt is</p>
            <h2>Kapcsolódó írások</h2>
          </div>
          <div className="blog-grid">
            {related.map((item) => (
              <TransitionLink className="blog-card" href={`/blog/${item.slug}`} key={item.slug}>
                <span className="blog-card-cat">{item.category}</span>
                <h3>{item.title}</h3>
                <p>{item.excerpt}</p>
                <div className="blog-card-meta">
                  <time dateTime={item.publishedAt}>{formatBlogDate(item.publishedAt)}</time>
                  <span>{item.readingMinutes} perc</span>
                </div>
                <strong className="blog-card-cta">Elolvasom →</strong>
              </TransitionLink>
            ))}
          </div>
        </section>
      ) : null}

      <section className="cta-band">
        <h2>Nézzük meg együtt, mit érdemes a te oldaladon változtatni.</h2>
        <TransitionLink className="button primary" href="/ingyenes-weboldal-audit">
          Ingyenes 3 pontos elemzés
        </TransitionLink>
      </section>
    </main>
  );
}
