import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { getAllLivePortfoliosForAdmin } from "@/lib/db/queries";

// Régénéré toutes les heures — les nouveaux portfolios apparaissent sans build.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,               changeFrequency: "weekly",  priority: 1.0 },
    { url: `${SITE_URL}/community`,       changeFrequency: "daily",   priority: 0.8 },
    { url: `${SITE_URL}/login`,           changeFrequency: "yearly",  priority: 0.3 },
    { url: `${SITE_URL}/signup`,          changeFrequency: "yearly",  priority: 0.4 },
    { url: `${SITE_URL}/cgu`,             changeFrequency: "yearly",  priority: 0.2 },
    { url: `${SITE_URL}/confidentialite`, changeFrequency: "yearly",  priority: 0.2 },
    { url: `${SITE_URL}/mentions-legales`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/contact`,         changeFrequency: "yearly",  priority: 0.3 },
  ];

  // Tous les portfolios publics — best-effort : si la base est indisponible,
  // on renvoie au moins les pages statiques plutôt que de casser le sitemap.
  let portfolios: MetadataRoute.Sitemap = [];
  try {
    const live = await getAllLivePortfoliosForAdmin();
    portfolios = live
      .filter((p) => p.slug)
      .map((p) => ({
        url: `${SITE_URL}/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      }));
  } catch (err) {
    console.error("[sitemap] portfolios error:", err);
  }

  return [...staticPages, ...portfolios];
}
