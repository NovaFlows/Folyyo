import { NextRequest, NextResponse } from "next/server";
import { getFeaturedPortfolios } from "@/lib/db/queries";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";

export async function GET(request: NextRequest) {
  const profileType = request.nextUrl.searchParams.get("profileType");
  const portfolios = await getFeaturedPortfolios();

  const items = portfolios
    .filter((p) => !profileType || p.profile_type === profileType)
    .map((p) => {
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
    .filter(Boolean);

  return NextResponse.json({ items });
}
