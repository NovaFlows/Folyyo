import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callClaude } from "@/lib/anthropic/client";
import { buildEditSystemPrompt, buildEditUserPrompt } from "@/lib/anthropic/prompts/edit-portfolio";
import { PortfolioJSONSchema } from "@/lib/anthropic/schema";
import { generateDeveloperCode } from "@/lib/portfolio/code-generator";
import {
  getPortfolioById,
  createEdit,
  resolveEdit,
  updatePortfolioJsonAndCode,
} from "@/lib/db/queries";
import type { PortfolioJSON } from "@/types/portfolio";
import fs from "fs";
import path from "path";
import os from "os";

export const maxDuration = 120;

const IS_DEV = process.env.NODE_ENV === "development";

function localPath(key: string) {
  return path.join(os.tmpdir(), "folyyo-source", key.replace(/\//g, "_"));
}

async function writeCode(key: string, code: unknown): Promise<string> {
  if (IS_DEV) {
    const dir = path.join(os.tmpdir(), "folyyo-source");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localPath(key), JSON.stringify(code));
    return `local:${key}`;
  }
  const { putJson } = await import("@/lib/r2/client");
  await putJson(key, code);
  return key;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { portfolioId, instruction } = await request.json();
  if (!portfolioId || !instruction?.trim()) {
    return NextResponse.json({ error: "portfolioId et instruction requis" }, { status: 400 });
  }

  const portfolio = await getPortfolioById(portfolioId, userId);
  if (!portfolio) return NextResponse.json({ error: "Portfolio introuvable" }, { status: 404 });

  const siteJson = portfolio.site_json as PortfolioJSON | null;
  if (!siteJson) return NextResponse.json({ error: "Portfolio sans données JSON" }, { status: 400 });

  const editLog = await createEdit({ portfolio_id: portfolioId, instruction });

  try {
    const systemPrompt = buildEditSystemPrompt();
    let raw = await callClaude(systemPrompt, buildEditUserPrompt(siteJson, instruction), 4096);
    let cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: PortfolioJSON & { _summary?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Retry once with a stricter correction prompt
      const retryPrompt = `Ta réponse précédente n'était pas du JSON valide. Voici ce que tu as retourné :\n\n${raw.slice(0, 400)}\n\nRetourne UNIQUEMENT le JSON complet du portfolio, sans aucun texte autour.`;
      raw = await callClaude(systemPrompt, retryPrompt, 4096);
      cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error("Réponse non-JSON de Claude");
      }
    }

    const summary = parsed._summary ?? instruction;
    const { _summary: _s, ...jsonWithoutSummary } = parsed;
    void _s;

    const validated = PortfolioJSONSchema.parse(jsonWithoutSummary);
    const newCode = generateDeveloperCode(validated);

    const codeKey = `source-code/${portfolioId}/portfolio.json`;
    const savedKey = await writeCode(codeKey, newCode);

    await updatePortfolioJsonAndCode(portfolioId, validated, savedKey);
    await resolveEdit(editLog.id, "applied", { diffApplied: summary });

    return NextResponse.json({ summary, newUrl: null });
  } catch (err) {
    console.error("[edit] error:", err);
    await resolveEdit(editLog.id, "failed", { errorMessage: (err as Error).message });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
