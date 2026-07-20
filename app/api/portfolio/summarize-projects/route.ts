import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callClaude, CLAUDE_MODEL_FAST } from "@/lib/anthropic/client";
import { buildSummarizeSystemPrompt, buildSummarizeUserPrompt, type SummarizeProjectInput } from "@/lib/anthropic/prompts/summarize-projects";

// Rédige une description courte et professionnelle pour un lot de projets
// (repos GitHub / vidéos YouTube) importés depuis le picker de l'éditeur —
// la description brute GitHub/YouTube est souvent vide ou trop technique,
// contrairement à celles écrites par Claude à la génération initiale.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { items } = await request.json() as { items?: SummarizeProjectInput[] };
  if (!items?.length) return NextResponse.json({ error: "items requis" }, { status: 400 });
  if (items.length > 20) return NextResponse.json({ error: "Trop d'éléments (max 20)" }, { status: 400 });

  try {
    const raw = await callClaude(
      buildSummarizeSystemPrompt(),
      buildSummarizeUserPrompt(items),
      1024,
      CLAUDE_MODEL_FAST,
    );
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    const descriptions = JSON.parse(cleaned);
    if (!Array.isArray(descriptions) || descriptions.length !== items.length) {
      throw new Error("Réponse Claude mal formée");
    }
    return NextResponse.json({ descriptions });
  } catch (err) {
    console.error("[summarize-projects] error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
