import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { isReservedSlug } from "@/lib/portfolio/reserved-slugs";

export async function GET(request: NextRequest) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return NextResponse.json({ available: false });
  if (isReservedSlug(slug)) return NextResponse.json({ available: false });

  const rows = await sql`SELECT id FROM portfolios WHERE slug = ${slug} LIMIT 1`;
  return NextResponse.json({ available: rows.length === 0 });
}
