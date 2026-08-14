import type { MetadataRoute } from "next";

const baseUrl = "https://www.projectedge.hu";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    { path: "/", priority: 1 },
    { path: "/szolgaltatasok", priority: 0.8 },
    { path: "/folyamat", priority: 0.8 },
    { path: "/munkak", priority: 0.8 },
    { path: "/munkak/checky", priority: 0.85 },
    { path: "/weboldal-keszites", priority: 0.9 },
    { path: "/havidijas-weboldal", priority: 0.9 },
    { path: "/weboldal-kisvallalkozasoknak", priority: 0.85 },
    { path: "/wordpress-weboldal-ujratervezes", priority: 0.8 },
    // A /demo oldalak szándékosan kimaradnak: kitalált márkákat mutatnak be,
    // és `noindex`-esek (app/demo/layout.tsx).
    { path: "/impresszum", priority: 0.3 },
    { path: "/adatkezeles", priority: 0.3 },
    { path: "/aszf", priority: 0.3 }
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    changeFrequency: "monthly",
    priority: route.priority
  }));
}
