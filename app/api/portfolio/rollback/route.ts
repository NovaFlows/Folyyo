import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deployToVercel } from "@/lib/vercel/deploy";
import { getJson, putJson, keys } from "@/lib/r2/client";
import { getPortfolioById, getVersionById, updatePortfolioCode } from "@/lib/db/queries";
import type { SourceCode } from "@/types/portfolio";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { portfolioId, versionId } = await request.json();
  if (!portfolioId || !versionId) {
    return NextResponse.json({ error: "portfolioId et versionId requis" }, { status: 400 });
  }

  const [portfolio, version] = await Promise.all([
    getPortfolioById(portfolioId, userId),
    getVersionById(versionId, portfolioId),
  ]);

  if (!portfolio || !version) {
    return NextResponse.json({ error: "Portfolio ou version introuvable" }, { status: 404 });
  }

  const restoredCode = await getJson<SourceCode>(version.source_code_key);

  // Overwrite the live source_code key with the restored version
  const liveKey = keys.sourceCode(portfolioId);
  await putJson(liveKey, restoredCode);
  await updatePortfolioCode(portfolioId, liveKey);

  let newUrl: string | null = null;
  if (portfolio.vercel_project_id) {
    try {
      const { url } = await deployToVercel(portfolio.vercel_project_id, restoredCode);
      newUrl = url;
    } catch (err) {
      console.error("Rollback redeploy failed:", err);
    }
  }

  return NextResponse.json({ ok: true, newUrl });
}
