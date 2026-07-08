import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createVercelProject, deployToVercel, waitForDeployment } from "@/lib/vercel/deploy";
import { getJson } from "@/lib/r2/client";
import {
  getPortfolioById,
  setPortfolioDeploying,
  setPortfolioLive,
  setPortfolioError,
  setPortfolioStatus,
} from "@/lib/db/queries";
import type { SourceCode } from "@/types/portfolio";
import fs from "fs";
import path from "path";
import os from "os";

export const maxDuration = 120;

const IS_DEV = process.env.NODE_ENV === "development";

async function getSourceCode(sourceCodeKey: string): Promise<SourceCode> {
  if (sourceCodeKey.startsWith("local:")) {
    const key = sourceCodeKey.slice(6);
    const safeName = key.replace(/\//g, "_");
    const filePath = path.join(os.tmpdir(), "folyyo-source", safeName);
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as SourceCode;
  }
  return getJson<SourceCode>(sourceCodeKey);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const portfolioId = body?.portfolioId ?? new URL(request.url).searchParams.get("portfolioId");
  if (!portfolioId) return NextResponse.json({ error: "portfolioId manquant" }, { status: 400 });

  const portfolio = await getPortfolioById(portfolioId, userId);
  if (!portfolio) return NextResponse.json({ error: "Portfolio introuvable" }, { status: 404 });
  if (!portfolio.source_code_key) return NextResponse.json({ error: "Code source non généré" }, { status: 400 });

  // DEV mode: skip Vercel deploy, mark as live with a local URL
  if (IS_DEV) {
    console.log("[deploy] DEV: skipping Vercel deploy, marking portfolio as live");
    const slug = portfolio.slug ?? portfolioId;
    const devUrl = `http://localhost:3002/preview/${slug}`;
    await setPortfolioLive(portfolioId, devUrl, `dev-${portfolioId}`);
    return NextResponse.json({ deploymentId: "dev", url: devUrl });
  }

  let sourceCode: SourceCode;
  try {
    sourceCode = await getSourceCode(portfolio.source_code_key);
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
