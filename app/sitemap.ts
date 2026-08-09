import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { getPortfoliosForSitemap } from "@/lib/db/queries";
import { hasActiveAccess } from "@/lib/billing/access";
import { getAllPosts } from "@/lib/blog/posts";

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
    { url: `${SITE_URL}/blog`,            changeFrequency: "weekly",  priority: 0.7 },
  ];

  const blogPosts: MetadataRoute.Sitemap = getAllPosts().map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: new Date(p.updated ?? p.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Portfolios publics — uniquement ceux réellement indexables.
  //
  // Le filtre passe par `hasActiveAccess`, la MÊME fonction que celle utilisée
  // par app/[slug]/page.tsx pour décider du `noindex`. C'est volontaire : si la
  // règle d'accès change un jour, les deux suivent ensemble. Réécrire la
  // condition ici (en SQL ou à la main) les ferait diverger silencieusement, et
  // on se retrouverait à nouveau à déclarer à Google des pages qu'on lui
  // interdit d'indexer — ce que la Search Console signale comme une erreur.
  //
  // Best-effort : si la base est indisponible, on renvoie au moins les pages
  // statiques plutôt que de casser le sitemap entier.
  let portfolios: MetadataRoute.Sitemap = [];
  try {
    const live = await getPortfoliosForSitemap();
    portfolios = live
      .filter((p) =>
        hasActiveAccess({
          subscription_status: p.owner_subscription_status,
          trial_ends_at: p.owner_trial_ends_at,
        } as Parameters<typeof hasActiveAccess>[0])
      )
      .map((p) => ({
        url: `${SITE_URL}/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
        changeFrequency: "weekly",
        priority: 0.7,
      }));
  } catch (err) {
    console.error("[sitemap] portfolios error:", err);
  }

  return [...staticPages, ...blogPosts, ...portfolios];
}
