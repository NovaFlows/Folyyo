import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { callClaude, CLAUDE_MODEL_FAST } from "@/lib/anthropic/client";
import { buildTeaserSystemPrompt, buildTeaserUserPrompt } from "@/lib/anthropic/prompts/teaser";
import { parsePdfText } from "@/lib/pdf-parse";
import { countRecentTeaserRequests, logTeaserRequest } from "@/lib/db/queries";

// Route PUBLIQUE (pas de auth() — voir middleware.ts, seuls /dashboard,
// /onboarding et /portfolio sont protégés) : aperçu léger du CV pour la
// landing page, sans compte. Volontairement bon marché — modèle Haiku, peu
// de tokens — et protégée par un rate limit par IP (DB Neon, pas de service
// externe) pour borner le coût exposé à des visiteurs anonymes.
export const maxDuration = 30;

const RATE_LIMIT_PER_HOUR = 5;

const teaserSchema = z.object({
  name: z.string().default(""),
  title: z.string().default(""),
  tagline: z.string().default(""),
  skills: z.array(z.string()).max(6).default([]),
});

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const recentCount = await countRecentTeaserRequests(ip, 1).catch(() => 0);
  if (recentCount >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json({ error: "Trop de tentatives, réessaie dans une heure." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const cvFile = formData.get("cv") as File | null;
  if (!cvFile) return NextResponse.json({ error: "Fichier CV manquant" }, { status: 400 });
  if (cvFile.type !== "application/pdf") return NextResponse.json({ error: "Format PDF requis" }, { status: 400 });
  if (cvFile.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Fichier trop grand (max 10 MB)" }, { status: 400 });

  // Log AVANT l'appel Claude — une requête qui échoue ensuite (parsing raté,
  // réponse invalide) compte quand même dans la limite, pour ne pas laisser
  // un contournement en spammant des CV volontairement illisibles.
  await logTeaserRequest(ip).catch(() => {});

  try {
    const buffer = Buffer.from(await cvFile.arrayBuffer());
    const cvText = await parsePdfText(buffer, 2500);

    const raw = await callClaude(buildTeaserSystemPrompt(), buildTeaserUserPrompt(cvText), 300, CLAUDE_MODEL_FAST);
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

    const parsed = teaserSchema.safeParse(JSON.parse(cleaned));
    if (!parsed.success) {
      return NextResponse.json({ error: "CV illisible, réessaie avec un autre fichier." }, { status: 400 });
    }

    return NextResponse.json(parsed.data);
  } catch (err) {
    console.error("[teaser] error:", err);
    return NextResponse.json({ error: "Analyse impossible, réessaie." }, { status: 500 });
  }
}
