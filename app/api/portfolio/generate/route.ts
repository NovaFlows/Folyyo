import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
import { auth } from "@clerk/nextjs/server";
import { callClaude } from "@/lib/anthropic/client";
import { buildGenerateSystemPrompt, buildGenerateUserPrompt } from "@/lib/anthropic/prompts/generate-portfolio";
import { generateThemeFromUrl } from "@/lib/anthropic/style-from-url";
import { PortfolioJSONSchema } from "@/lib/anthropic/schema";
import { generateDeveloperCode } from "@/lib/portfolio/code-generator";
import { keys } from "@/lib/r2/client";
import { readCvBuffer, writeSourceCode } from "@/lib/dev-storage";
import { createPortfolio, setPortfolioReady, setPortfolioError, getFeaturedPortfolioById } from "@/lib/db/queries";
import { parsePdfText } from "@/lib/pdf-parse";
import type { DeveloperInputData } from "@/types/portfolio";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";

async function storeSourceCode(portfolioId: string, sourceCode: unknown): Promise<string> {
  return writeSourceCode(keys.sourceCode(portfolioId), sourceCode);
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { profileType, slug, name, title, email, githubUsername, instagramHandle, youtubeHandle, linkedinUrl, twitterUrl, cvStoragePath, githubData, youtubeData, templateId, styleUrl } = body;

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
      const cvBuffer = await readCvBuffer(cvStoragePath);
      if (cvBuffer) cvText = await parsePdfText(cvBuffer, 4000);
    } catch { /* CV parsing optional */ }

    const inputData: DeveloperInputData = {
      name, title, email,
      github_username: githubUsername || undefined,
      instagram_url:   instagramHandle ? `https://instagram.com/${instagramHandle}` : undefined,
      youtube_url:     youtubeHandle  ? `https://youtube.com/@${youtubeHandle}` : undefined,
      linkedin_url:    linkedinUrl || undefined,
      twitter_url:     twitterUrl  || undefined,
      cv_storage_path: cvStoragePath,
      cv_text:         cvText,
      github_data:     githubData  || undefined,
      youtube_data:    youtubeData || undefined,
    };

    // Style visuel de départ : soit repris d'un template communauté (jamais son
    // contenu, re-vérifié serveur), soit analysé depuis l'URL d'un site externe
    // ("copier le style de ce site") — l'URL a priorité si les deux sont fournis.
    let themeOverride: ValidatedPortfolioJSON["theme"] | undefined;
    if (styleUrl) {
      const urlTheme = await generateThemeFromUrl(styleUrl);
      if (urlTheme) {
        themeOverride = {
          primary_color: urlTheme.primary_color,
          background_color: urlTheme.background_color,
          text_color: urlTheme.text_color,
          accent_color: urlTheme.accent_color,
          font_heading: urlTheme.font_heading,
          font_body: urlTheme.font_body,
          style: urlTheme.style,
          overlay_opacity: urlTheme.overlay_opacity,
          theme_preset_id: "style-url",
        } as ValidatedPortfolioJSON["theme"];
      }
    }
    if (!themeOverride && templateId) {
      const templatePortfolio = await getFeaturedPortfolioById(templateId);
      const templateJson = templatePortfolio?.site_json as ValidatedPortfolioJSON | undefined;
      themeOverride = templateJson?.theme;
    }

    const rawJson = await callClaude(buildGenerateSystemPrompt(), buildGenerateUserPrompt(inputData, profileType, themeOverride), 8192);
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

    // Photo de profil : priorité à une vraie source déjà vérifiée plutôt qu'à ce que Claude devine —
    // YouTube (avatar de chaîne) d'abord, sinon GitHub (avatar réel) pour un profil développeur.
    const realAvatarUrl = youtubeData?.channelAvatarUrl
      ?? (profileType === "developer" ? githubData?.avatar_url : undefined);
    if (realAvatarUrl) siteJson.meta.avatar_url = realAvatarUrl;

    const sourceCode = generateDeveloperCode(siteJson, portfolio.id);
    const sourceCodeKey = await storeSourceCode(portfolio.id, sourceCode);

    await setPortfolioReady(portfolio.id, { siteJson, inputData, sourceCodeKey });

    return NextResponse.json({ portfolioId: portfolio.id });
  } catch (err) {
    console.error("[generate] error:", err);
    await setPortfolioError(portfolio.id, (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
