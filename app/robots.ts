import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Zones privées / techniques à ne pas indexer.
      // "/shot" : routes de capture d'écran locales — déjà 404 en production
      // (voir app/shot/config.ts), interdites ici par pure ceinture-bretelles.
      disallow: ["/dashboard", "/onboarding", "/portfolio", "/settings", "/billing", "/api", "/preview", "/sso-callback", "/shot"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
