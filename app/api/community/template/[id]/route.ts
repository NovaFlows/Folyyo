import { NextRequest, NextResponse } from "next/server";
import { getFeaturedPortfolioById } from "@/lib/db/queries";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const portfolio = await getFeaturedPortfolioById(params.id);
  if (!portfolio || !portfolio.site_json) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const { theme } = portfolio.site_json as ValidatedPortfolioJSON;
  return NextResponse.json({ profileType: portfolio.profile_type, theme });
}
