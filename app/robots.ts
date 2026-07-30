import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Zones privées / techniques à ne pas indexer.
      disallow: ["/dashboard", "/onboarding", "/portfolio", "/settings", "/billing", "/api", "/preview", "/sso-callback"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
