import type { MetadataRoute } from "next";

const baseUrl = "https://www.projectedge.hu";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes = [
    { path: "/", priority: 1 },
    { path: "/szolgaltatasok", priority: 0.8 },
    { path: "/folyamat", priority: 0.8 },
    { path: "/munkak", priority: 0.8 },
    { path: "/ugyfelkapu", priority: 0.6 },
    { path: "/impresszum", priority: 0.3 },
    { path: "/adatkezeles", priority: 0.3 },
    { path: "/aszf", priority: 0.3 }
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: route.priority
  }));
}
