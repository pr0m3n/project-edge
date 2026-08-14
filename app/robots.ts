import type { MetadataRoute } from "next";

const baseUrl = "https://www.projectedge.hu";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // A privát oldalak saját noindex metát kapnak. Az /api nem tartalmi oldal.
      disallow: ["/api/"]
    },
    sitemap: `${baseUrl}/sitemap.xml`
  };
}
