import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, CLAUDE_MODEL, type ImageAttachment } from "@/lib/anthropic/client";
import { buildEditSystemPrompt, buildEditUserPrompt } from "@/lib/anthropic/prompts/edit-portfolio";
import { PortfolioJSONSchema, type ValidatedPortfolioJSON } from "@/lib/anthropic/schema";
import { EDIT_TOOLS } from "@/lib/anthropic/edit-tools";
import { applyEditTool, EditToolError, type DiffItem } from "@/lib/portfolio/apply-edit-tool";
import { migrateToGrid } from "@/lib/portfolio/grid";
import { generateDeveloperCode } from "@/lib/portfolio/code-generator";
import { writeSourceCode } from "@/lib/dev-storage";
import { keys } from "@/lib/r2/client";
import {
  getPortfolioById,
  createEdit,
  resolveEdit,
  updatePortfolioJsonAndCode,
  getRecentAppliedEdits,
  setPortfolioStatus,
  snapshotVersion,
  getUserSettings,
} from "@/lib/db/queries";
import { hasActiveAccess } from "@/lib/billing/access";

export const maxDuration = 120;

// Nombre max d'allers-retours avec Claude pour une instruction : le premier
// tour couvre le cas normal (Claude appelle tout ce qu'il faut d'un coup) ;
// les tours suivants ne servent qu'à la boucle d'auto-correction (un outil a
// échoué, Claude retente avec le message d'erreur reçu en tool_result).
const MAX_TURNS = 3;

// Les images jointes au chat n'ont pas d'URL hébergée (envoyées en base64 pour
// l'analyse visuelle de Claude) — exactement comme l'éditeur manuel, qui
// stocke lui aussi les images choisies en data-URL base64 inline dans le JSON
// (aucun upload R2 pour les images, voir VisualEditor.tsx/resizeImage). Claude
// référence donc une image jointe par "attachment:N" plutôt que par URL ; on
// résout cette référence en la vraie data-URL juste avant d'appliquer l'outil,
// pour ne jamais lui faire recopier un long base64 dans sa sortie.
function resolveAttachmentRefs(value: unknown, images: ImageAttachment[]): unknown {
  if (typeof value === "string") {
    const m = /^attachment:(\d+)$/.exec(value);
    if (!m) return value;
    const img = images[Number(m[1])];
    if (!img) {
      throw new EditToolError(
        `Référence "${value}" invalide : ${images.length} image(s) jointe(s) disponible(s) (indices 0 à ${images.length - 1}).`,
      );
    }
    return `data:${img.mediaType};base64,${img.data}`;
  }
  if (Array.isArray(value)) return value.map((v) => resolveAttachmentRefs(v, images));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveAttachmentRefs(v, images)]));
  }
  return value;
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { portfolioId, instruction, images } = await request.json() as {
    portfolioId: string;
    instruction: string;
    images?: ImageAttachment[];
  };
  if (!portfolioId || !instruction?.trim()) {
    return NextResponse.json({ error: "portfolioId et instruction requis" }, { status: 400 });
  }

  const portfolio = await getPortfolioById(portfolioId, userId);
  if (!portfolio) return NextResponse.json({ error: "Portfolio introuvable" }, { status: 404 });
  if (!portfolio.site_json) return NextResponse.json({ error: "Portfolio sans données JSON" }, { status: 400 });

  const settings = await getUserSettings(userId);
  if (!settings || !hasActiveAccess(settings)) {
    return NextResponse.json({ error: "Ton essai gratuit est terminé — abonne-toi pour continuer à éditer." }, { status: 403 });
  }

  // État de départ validé + migré (grille libre) AVANT que Claude ne le voie :
  // un vieux portfolio jamais ouvert dans l'éditeur peut ne pas avoir de champ
  // "grid"/"section_content", ce qui rendrait les outils de widgets incapables
  // de cibler quoi que ce soit.
  let state: ValidatedPortfolioJSON;
  try {
    state = migrateToGrid(PortfolioJSONSchema.parse(portfolio.site_json));
  } catch {
    return NextResponse.json({ error: "Données du portfolio invalides" }, { status: 400 });
  }

  const recentEdits = await getRecentAppliedEdits(portfolioId, 4).catch(() => []);

  const profileContext = {
    profileType:  portfolio.profile_type ?? "other",
    profileName:  state.meta.name,
    profileTitle: state.meta.title,
  };

  const editLog = await createEdit({ portfolio_id: portfolioId, instruction });

  // Filet de sécurité : on capture l'état ACTUEL (avant l'édition IA) pour pouvoir
  // revenir en arrière si l'IA casse le design.
  await snapshotVersion({
    portfolio_id: portfolioId,
    site_json: state,
    source_code_key: portfolio.source_code_key,
    edit_summary: `Avant : "${instruction.slice(0, 80)}"`,
  }).catch((e) => console.error("[edit] snapshot failed:", e));

  // Statut transitoire "editing" → affiché "En cours d'édition" sur le dashboard
  // et la page détail ; restauré à la fin (succès ou échec).
  const prevStatus = portfolio.status;
  await setPortfolioStatus(portfolioId, "editing").catch(() => {});

  try {
    const client = getAnthropicClient();
    const systemPrompt = buildEditSystemPrompt(profileContext, portfolio.language);
    const imagesNote = images?.length
      ? `\n\nIMAGES JOINTES (${images.length}) : analyse-les pour la palette/l'ambiance si l'instruction le demande. Si l'instruction demande explicitement d'UTILISER une de ces images comme visuel (photo de fond, image d'un widget, avatar…), référence-la EXACTEMENT par la chaîne "attachment:0" (première image jointe), "attachment:1" (deuxième), etc. dans le champ approprié — jamais une URL inventée, et jamais "attachment:N" si l'instruction ne demande qu'une analyse de palette/ambiance.`
      : "";
    const { contextBlock, instructionBlock } = buildEditUserPrompt(state, instruction, recentEdits);

    // Mise en cache (API beta prompt-caching, seule surface qui l'expose dans
    // cette version du SDK) du system prompt + des outils + du bloc JSON :
    // ces trois éléments restent identiques d'un tour à l'autre de la boucle
    // ci-dessous (MAX_TURNS, pour l'auto-correction) — seuls les tool_results
    // changent. Sans cache, chaque tour de retry refacture le plein tarif de
    // tout ce contexte ; avec, les tours 2/3 relisent le préfixe caché à
    // ~10% du prix. Le JSON est aussi son PROPRE bloc, séparé de
    // l'instruction (qui change à chaque appel et n'est donc jamais mise en
    // cache) : si une deuxième instruction arrive dans les 5 minutes sans que
    // l'état du portfolio ait changé entre-temps (ex: une instruction
    // refusée qui n'a rien modifié), le JSON déjà en cache est réutilisé même
    // si le texte de l'instruction, lui, diffère. Les images jointes (si il y
    // en a) viennent APRÈS le bloc JSON caché, jamais avant — sinon leur
    // contenu, toujours différent d'un appel à l'autre, invaliderait le cache.
    const ephemeral = { type: "ephemeral" as const };
    const cachedTools: Anthropic.Beta.PromptCaching.PromptCachingBetaTool[] = EDIT_TOOLS.map((t, i) =>
      i === EDIT_TOOLS.length - 1 ? { ...t, cache_control: ephemeral } : t
    );

    const initialContent: Anthropic.Beta.PromptCaching.PromptCachingBetaMessageParam["content"] = [
      { type: "text" as const, text: contextBlock, cache_control: ephemeral },
      ...(images?.length
        ? images.map((img) => ({ type: "image" as const, source: { type: "base64" as const, media_type: img.mediaType, data: img.data } }))
        : []),
      { type: "text" as const, text: instructionBlock + imagesNote },
    ];

    const messages: Anthropic.Beta.PromptCaching.PromptCachingBetaMessageParam[] = [{ role: "user", content: initialContent }];

    const diff: DiffItem[] = [];
    let anySuccess = false;
    let finalText = "";
    let turn = 0;

    while (turn < MAX_TURNS) {
      const resp = await client.beta.promptCaching.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: [{ type: "text", text: systemPrompt, cache_control: ephemeral }],
        messages,
        tools: cachedTools,
      });
      messages.push({ role: "assistant", content: resp.content });

      const toolUses = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const textBlocks = resp.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
      if (textBlocks.length) finalText = textBlocks.map((b) => b.text).join(" ").trim();

      if (toolUses.length === 0) break; // Claude a fini (ou n'a rien eu à faire)

      const toolResults: Anthropic.Beta.PromptCaching.PromptCachingBetaToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        try {
          const input = resolveAttachmentRefs(tu.input, images ?? []);
          const result = applyEditTool(state, tu.name, input, profileContext.profileType);
          state = result.state;
          diff.push(...result.diff);
          anySuccess = true;
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: result.resultForClaude });
        } catch (e) {
          const msg = e instanceof EditToolError || e instanceof Error ? e.message : "Erreur inconnue";
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: msg, is_error: true });
        }
      }
      messages.push({ role: "user", content: toolResults });
      turn++;
    }

    const summary = finalText || (diff.length ? diff.map((d) => d.label).join(", ") : instruction);

    if (anySuccess) {
      // Garde-fou final : les outils valident déjà chaque mutation individuellement,
      // mais on revalide l'état complet avant de le persister.
      const validated = PortfolioJSONSchema.parse(state);
      const newCode  = generateDeveloperCode(validated, portfolioId);
      const codeKey  = keys.sourceCode(portfolioId);
      const savedKey = await writeSourceCode(codeKey, newCode);

      await updatePortfolioJsonAndCode(portfolioId, validated, savedKey);
      await resolveEdit(editLog.id, "applied", { diffApplied: { summary, diff } });
    } else {
      // Aucune mutation (question, instruction déjà satisfaite, hors-sujet) :
      // succès gracieux, on ne touche ni la DB ni le code généré.
      await resolveEdit(editLog.id, "applied", { diffApplied: { summary, diff: [] } });
    }
    await setPortfolioStatus(portfolioId, prevStatus === "editing" ? "live" : prevStatus).catch(() => {});

    return NextResponse.json({ summary, diff, newUrl: null });
  } catch (err) {
    console.error("[edit] error:", err);
    await resolveEdit(editLog.id, "failed", { errorMessage: (err as Error).message });
    await setPortfolioStatus(portfolioId, prevStatus === "editing" ? "live" : prevStatus).catch(() => {});
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
