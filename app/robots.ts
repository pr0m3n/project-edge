import type { MetadataRoute } from "next";

const baseUrl = "https://www.projectedge.hu";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Privát / autentikált felületek kizárása az indexelésből.
      disallow: ["/admin", "/ugyfelkapu/dashboard"]
    },
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
