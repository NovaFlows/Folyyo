import Link from "next/link";
import { getFeaturedPortfolios } from "@/lib/db/queries";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";
import type { TemplateCardData } from "@/components/portfolio/TemplateCard";
import CommunityGrid from "./CommunityGrid";

export default async function CommunityPage() {
  const portfolios = await getFeaturedPortfolios();

  const items: TemplateCardData[] = portfolios
    .map((p): TemplateCardData | null => {
      const json = p.site_json as ValidatedPortfolioJSON | null;
      if (!json) return null;
      return {
        id: p.id,
        profileType: p.profile_type,
        slug: p.slug,
        name: json.meta.name,
        title: json.meta.title,
        tagline: json.meta.tagline,
        theme: {
          primary_color: json.theme.primary_color,
          background_color: json.theme.background_color,
          accent_color: json.theme.accent_color,
          font_heading: json.theme.font_heading,
        },
      };
    })
    .filter((x): x is TemplateCardData => x !== null);

  return (
    <div className="min-h-screen" style={{ background: "#f8f5f0" }}>
      <header style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1c1917", fontSize: "1.25rem", fontWeight: 500 }}>
            folyyo
          </a>
          <Link href="/dashboard"
            className="text-sm font-medium transition hover:opacity-70"
            style={{ color: "#78716c" }}>
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-14">
        <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>communauté</p>
        <h1 className="mb-3 text-4xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          Les meilleurs portfolios Folyyo
        </h1>
        <p className="mb-10 max-w-xl text-sm" style={{ color: "#78716c" }}>
          Une sélection de portfolios créés avec Folyyo, pour t&apos;inspirer — et pour démarrer
          le tien avec le même style visuel.
        </p>

        <CommunityGrid items={items} />
      </div>
    </div>
  );
}
