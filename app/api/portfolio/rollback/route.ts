import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPortfolioById, getVersionById, updatePortfolioJsonAndCode } from "@/lib/db/queries";
import { generateDeveloperCode } from "@/lib/portfolio/code-generator";
import { writeSourceCode } from "@/lib/dev-storage";
import { keys } from "@/lib/r2/client";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Accepte du JSON (fetch) comme du form-urlencoded (bouton <form>)
  let portfolioId: string | undefined;
  let versionId: string | undefined;
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    ({ portfolioId, versionId } = await request.json());
  } else {
    const form = await request.formData();
    portfolioId = form.get("portfolioId")?.toString();
    versionId   = form.get("versionId")?.toString();
  }
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

  const restoredJson = version.site_json as ValidatedPortfolioJSON | null;
  if (!restoredJson) {
    return NextResponse.json({ error: "Cette version ne contient pas de sauvegarde restaurable." }, { status: 400 });
  }

  // Régénère le code depuis le site_json restauré et écrase l'état courant
  // — /[slug] lit site_json directement, aucun redéploiement à déclencher.
  const newCode  = generateDeveloperCode(restoredJson, portfolioId);
  const codeKey  = keys.sourceCode(portfolioId);
  const savedKey = await writeSourceCode(codeKey, newCode);
  await updatePortfolioJsonAndCode(portfolioId, restoredJson, savedKey);

  // Form POST → on renvoie l'utilisateur sur la page détail (rafraîchie)
  if (!ct.includes("application/json")) {
    return NextResponse.redirect(new URL(`/portfolio/${portfolio.slug ?? portfolioId}`, request.url), 303);
  }
  return NextResponse.json({ ok: true });
}
