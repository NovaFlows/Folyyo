import { NextRequest, NextResponse } from "next/server";
import { getFeaturedPortfolioById } from "@/lib/db/queries";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const portfolio = await getFeaturedPortfolioById(params.id);
  if (!portfolio || !portfolio.site_json) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const { theme } = portfolio.site_json as ValidatedPortfolioJSON;
  // hero_image_url/hero_images sont le CONTENU (la vraie photo) de ce portfolio,
  // jamais son style — on ne les recopie jamais chez un autre client.
  const { hero_image_url: _h1, hero_images: _h2, ...styleOnlyTheme } = theme;
  void _h1; void _h2;
  return NextResponse.json({ profileType: portfolio.profile_type, theme: styleOnlyTheme });
}
