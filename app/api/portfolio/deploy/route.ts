import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createVercelProject, deployToVercel, waitForDeployment } from "@/lib/vercel/deploy";
import { readSourceCode, IS_DEV } from "@/lib/dev-storage";
import {
  getPortfolioById,
  setPortfolioDeploying,
  setPortfolioLive,
  setPortfolioError,
  setPortfolioStatus,
} from "@/lib/db/queries";
import type { SourceCode } from "@/types/portfolio";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  // Accepte du JSON (fetch) comme du form-urlencoded (le <form> natif de
  // DeployButton) — même pattern que rollback/route.ts.
  let portfolioId: string | null | undefined;
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    portfolioId = (await request.json().catch(() => null))?.portfolioId;
  } else if (ct.includes("form")) {
    const form = await request.formData();
    portfolioId = form.get("portfolioId")?.toString();
  }
  portfolioId ??= new URL(request.url).searchParams.get("portfolioId");
  if (!portfolioId) return NextResponse.json({ error: "portfolioId manquant" }, { status: 400 });

  const portfolio = await getPortfolioById(portfolioId, userId);
  if (!portfolio) return NextResponse.json({ error: "Portfolio introuvable" }, { status: 404 });
  if (!portfolio.source_code_key) return NextResponse.json({ error: "Code source non généré" }, { status: 400 });

  // DEV mode: skip Vercel deploy, mark as live with a local URL sur le MÊME
  // hôte/port que celui utilisé par le navigateur (pas de port codé en dur).
  if (IS_DEV) {
    console.log("[deploy] DEV: skipping Vercel deploy, marking portfolio as live");
    const slug = portfolio.slug ?? portfolioId;
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const host  = request.headers.get("host") ?? "localhost:3000";
    const devUrl = `${proto}://${host}/preview/${slug}`;
    await setPortfolioLive(portfolioId, devUrl, `dev-${portfolioId}`);
    return NextResponse.json({ deploymentId: "dev", url: devUrl });
  }

  let sourceCode: SourceCode;
  try {
    sourceCode = await readSourceCode<SourceCode>(portfolio.source_code_key);
  } catch (err) {
    console.error("[deploy] failed to load source code:", err);
    return NextResponse.json({ error: "Impossible de charger le code source" }, { status: 500 });
  }

  await setPortfolioDeploying(portfolioId);

  try {
    let vercelProjectId = portfolio.vercel_project_id;
    if (!vercelProjectId) {
      const projectName = `folyyo-${portfolioId.slice(0, 8)}`;
      vercelProjectId = await createVercelProject(projectName);
      await setPortfolioStatus(portfolioId, "deploying");
    }

    const { deploymentId, url } = await deployToVercel(vercelProjectId, sourceCode);

    waitForDeployment(deploymentId).then(async (liveUrl) => {
      await setPortfolioLive(portfolioId, liveUrl, vercelProjectId);
    }).catch(async (err: Error) => {
      await setPortfolioError(portfolioId, err.message);
    });

    return NextResponse.json({ deploymentId, url });
  } catch (err) {
    console.error("[deploy] error:", err);
    await setPortfolioError(portfolioId, (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
