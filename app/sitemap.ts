import type { MetadataRoute } from "next";
import { BLOG_POSTS } from "@/lib/blog";

const baseUrl = "https://www.projectedge.hu";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1 },
    { path: "/szolgaltatasok", priority: 0.8 },
    { path: "/folyamat", priority: 0.8 },
    { path: "/munkak", priority: 0.8 },
    { path: "/munkak/checky", priority: 0.85 },
    { path: "/blog", priority: 0.75 },
    { path: "/weboldal-keszites", priority: 0.9 },
    { path: "/havidijas-weboldal", priority: 0.9 },
    { path: "/weboldal-kisvallalkozasoknak", priority: 0.85 },
    { path: "/ingyenes-weboldal-audit", priority: 0.85 },
    { path: "/wordpress-weboldal-ujratervezes", priority: 0.8 },
    // A /demo oldalak szándékosan kimaradnak: kitalált márkákat mutatnak be,
    // és `noindex`-esek (app/demo/layout.tsx).
    { path: "/impresszum", priority: 0.3 },
    { path: "/adatkezeles", priority: 0.3 },
    { path: "/aszf", priority: 0.3 }
  ];

  const staticRoutes: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    changeFrequency: "monthly",
    priority: route.priority
  }));

  // A cikkek a `lib/blog.ts`-ből jönnek, tehát új poszttal a sitemap magától
  // bővül — nem lehet elfelejteni felvenni ide.
  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.publishedAt),
    changeFrequency: "yearly",
    priority: 0.7
  }));

  return [...staticRoutes, ...blogRoutes];
}
