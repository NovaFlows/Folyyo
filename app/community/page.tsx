import Link from "next/link";
import { getFeaturedPortfolios } from "@/lib/db/queries";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";
import type { TemplateCardData } from "@/components/portfolio/TemplateCard";
import CommunityGrid from "./CommunityGrid";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import LanguageToggle from "@/components/i18n/LanguageToggle";

export default async function CommunityPage() {
  const locale = getLocale();
  const t = getDictionary(locale);
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
          <div className="flex items-center gap-4">
            <LanguageToggle locale={locale} />
            <Link href="/dashboard"
              className="text-sm font-medium transition hover:opacity-70"
              style={{ color: "#78716c" }}>
              {t.community.backDashboard}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-14">
        <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>{t.community.kicker}</p>
        <h1 className="mb-3 text-4xl serif" style={{ fontWeight: 500, color: "#1c1917" }}>
          {t.community.title}
        </h1>
        <p className="mb-10 max-w-xl text-sm" style={{ color: "#78716c" }}>
          {t.community.subtitle}
        </p>

        <CommunityGrid items={items} t={t.community} templateCardT={t.templateCard} />
      </div>
    </div>
  );
}
