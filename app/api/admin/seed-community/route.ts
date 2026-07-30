import { NextRequest, NextResponse } from "next/server";
import { callClaude } from "@/lib/anthropic/client";
import { buildGenerateSystemPrompt, buildGenerateUserPrompt } from "@/lib/anthropic/prompts/generate-portfolio";
import { PortfolioJSONSchema } from "@/lib/anthropic/schema";
import { generateDeveloperCode } from "@/lib/portfolio/code-generator";
import { keys } from "@/lib/r2/client";
import { writeSourceCode } from "@/lib/dev-storage";
import { createPortfolio, setPortfolioReady, setPortfolioFeatured, upsertUserSettings, grantLifetimeAccess } from "@/lib/db/queries";
import { contrastRatio, luminance } from "@/lib/portfolio/contrast";
import { SEED_PERSONAS } from "@/lib/seed/personas";
import type { DeveloperInputData } from "@/types/portfolio";

export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────────────────────
// Outil de peuplement de la galerie Communauté — RÉSERVÉ AU DÉVELOPPEMENT LOCAL
// (renvoie 404 en production). Génère un portfolio par persona en réutilisant
// exactement la logique de /api/portfolio/generate (prompt → Claude → schéma →
// code → base), l'attribue au compte admin fourni et le met en avant.
//
// À lancer en local (`npm run dev`), le `.env.local` pointant sur la base Neon
// de prod (cas par défaut) + ANTHROPIC_API_KEY + UNSPLASH_ACCESS_KEY :
//
//   curl -X POST http://localhost:3000/api/admin/seed-community \
//     -H "Content-Type: application/json" -d '{}'
//
// Options du body : { userId?, only?: "designer"|…, feature?: false }.
// Par défaut, propriétaire = compte "showcase" virtuel (pas besoin d'un vrai
// compte Clerk : ce sont des modèles publics de la Communauté). Fournir un
// userId réel seulement si on veut gérer les démos depuis l'UI.
// Idempotent : un slug déjà présent échoue proprement (23505) et est listé
// dans `failed`, les autres passent.
// ─────────────────────────────────────────────────────────────────────────────
const SHOWCASE_USER_ID = "folyo-showcase";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const userId: string = body.userId || SHOWCASE_USER_ID;
  const only: string | undefined = body.only;
  const feature: boolean = body.feature !== false;

  // Garantit l'existence de la ligne users, puis passe le compte en "lifetime"
  // pour que les pages publiques des démos ne soient pas mises en pause.
  await upsertUserSettings(userId, {}).catch(() => {});
  await grantLifetimeAccess(userId).catch(() => {});

  const personas = only ? SEED_PERSONAS.filter((p) => p.profileType === only) : SEED_PERSONAS;
  const created: Array<{ slug: string; id: string }> = [];
  const failed: Array<{ slug: string; error: string }> = [];

  for (const p of personas) {
    try {
      const inputData: DeveloperInputData = {
        name: p.name, title: p.title, email: p.email,
        cv_storage_path: "", cv_text: p.background, website_text: p.website,
      };
      const portfolio = await createPortfolio({
        user_id: userId, name: p.name, profile_type: p.profileType,
        slug: p.slug, country: p.country, language: p.language,
      });

      const { prompt, heroCredit } = await buildGenerateUserPrompt(inputData, p.profileType, undefined, p.language);
      const raw = await callClaude(buildGenerateSystemPrompt(), prompt, 8192);
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
      const siteJson = PortfolioJSONSchema.parse(JSON.parse(cleaned));

      if (heroCredit) siteJson.theme.hero_image_credit = heroCredit;
      if (contrastRatio(siteJson.theme.background_color, siteJson.theme.text_color) < 4.5) {
        siteJson.theme.text_color = luminance(siteJson.theme.background_color) > 0.5 ? "#111111" : "#f5f5f5";
      }
      // Photo du témoignage réutilisée comme avatar → cohérence avis ↔ portfolio.
      if (p.avatarUrl) siteJson.meta.avatar_url = p.avatarUrl;

      const sourceCode = generateDeveloperCode(siteJson, portfolio.id);
      const sourceCodeKey = await writeSourceCode(keys.sourceCode(portfolio.id), sourceCode);
      await setPortfolioReady(portfolio.id, { siteJson, inputData, sourceCodeKey });
      if (feature) await setPortfolioFeatured(portfolio.id, true);

      created.push({ slug: p.slug, id: portfolio.id });
      console.log(`[seed] ✓ ${p.slug} (${p.profileType})`);
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      failed.push({ slug: p.slug, error: msg });
      console.error(`[seed] ✗ ${p.slug}: ${msg}`);
    }
  }

  return NextResponse.json({ total: personas.length, created, failed });
}
