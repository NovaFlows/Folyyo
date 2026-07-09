import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
import { auth } from "@clerk/nextjs/server";
import { callClaude } from "@/lib/anthropic/client";
import { buildGenerateSystemPrompt, buildGenerateUserPrompt } from "@/lib/anthropic/prompts/generate-portfolio";
import { PortfolioJSONSchema } from "@/lib/anthropic/schema";
import { generateDeveloperCode } from "@/lib/portfolio/code-generator";
import { getFileBuffer, putJson, keys } from "@/lib/r2/client";
import { createPortfolio, setPortfolioReady, setPortfolioError } from "@/lib/db/queries";
import type { DeveloperInputData } from "@/types/portfolio";
import fs from "fs";
import path from "path";
import os from "os";
// pdf-parse has no ESM export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

const IS_DEV = process.env.NODE_ENV === "development";

async function getCvBuffer(cvStoragePath: string): Promise<Buffer | null> {
  // Local dev: CV stored in temp filesystem
  if (cvStoragePath.startsWith("local:")) {
    const key = cvStoragePath.slice(6);
    const safeName = key.replace(/\//g, "_");
    const filePath = path.join(os.tmpdir(), "folyyo-cvs", safeName);
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
    return null;
  }
  // Production: fetch from R2
  return getFileBuffer(cvStoragePath);
}

async function storeSourceCode(portfolioId: string, sourceCode: unknown): Promise<string> {
  const sourceCodeKey = keys.sourceCode(portfolioId);
  if (IS_DEV) {
    // Local dev: write source code to temp filesystem
    const tmpDir = path.join(os.tmpdir(), "folyyo-source");
    fs.mkdirSync(tmpDir, { recursive: true });
    const safeName = sourceCodeKey.replace(/\//g, "_");
    fs.writeFileSync(path.join(tmpDir, safeName), JSON.stringify(sourceCode));
    console.log(`[generate] DEV: saved source code to temp file`);
    return `local:${sourceCodeKey}`;
  }
  await putJson(sourceCodeKey, sourceCode);
  return sourceCodeKey;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { profileType, slug, name, title, email, githubUsername, instagramHandle, linkedinUrl, twitterUrl, cvStoragePath, githubData } = body;

  const requiresCv = profileType === "developer";
  if (!profileType || !name || !email || (requiresCv && !cvStoragePath)) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  let portfolio;
  try {
    portfolio = await createPortfolio({ user_id: userId, name, profile_type: profileType, slug: slug || undefined });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "23505") {
      return NextResponse.json({ error: "Ce slug est déjà pris, choisis-en un autre." }, { status: 409 });
    }
    throw err;
  }

  try {
    let cvText = "";
    try {
      const cvBuffer = await getCvBuffer(cvStoragePath);
      if (cvBuffer) {
        const parsed = await pdfParse(cvBuffer);
        cvText = parsed.text.slice(0, 4000);
      }
    } catch { /* CV parsing optional */ }

    const inputData: DeveloperInputData = {
      name, title, email,
      github_username: githubUsername || undefined,
      instagram_url:   instagramHandle ? `https://instagram.com/${instagramHandle}` : undefined,
      linkedin_url:    linkedinUrl || undefined,
      twitter_url:     twitterUrl  || undefined,
      cv_storage_path: cvStoragePath,
      cv_text:         cvText,
      github_data:     githubData  || undefined,
    };

    const rawJson = await callClaude(buildGenerateSystemPrompt(), buildGenerateUserPrompt(inputData, profileType), 8192);
    const cleaned = rawJson.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

    let siteJson;
    try {
      siteJson = PortfolioJSONSchema.parse(JSON.parse(cleaned));
    } catch (parseErr) {
      console.error("[generate] schema parse error:", parseErr);
      console.error("[generate] raw Claude response (first 500 chars):", cleaned.slice(0, 500));
      await setPortfolioError(portfolio.id, "Réponse Claude invalide");
      return NextResponse.json({ error: "Erreur parsing réponse Claude" }, { status: 500 });
    }

    const sourceCode = generateDeveloperCode(siteJson);
    const sourceCodeKey = await storeSourceCode(portfolio.id, sourceCode);

    await setPortfolioReady(portfolio.id, { siteJson, inputData, sourceCodeKey });

    return NextResponse.json({ portfolioId: portfolio.id });
  } catch (err) {
    console.error("[generate] error:", err);
    await setPortfolioError(portfolio.id, (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
