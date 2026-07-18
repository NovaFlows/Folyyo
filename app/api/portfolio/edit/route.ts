import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callClaude, callClaudeWithImages, type ImageAttachment } from "@/lib/anthropic/client";
import { buildEditSystemPrompt, buildEditUserPrompt } from "@/lib/anthropic/prompts/edit-portfolio";
import { PortfolioJSONSchema, type ValidatedPortfolioJSON } from "@/lib/anthropic/schema";
import { generateDeveloperCode } from "@/lib/portfolio/code-generator";
import {
  getPortfolioById,
  createEdit,
  resolveEdit,
  updatePortfolioJsonAndCode,
  getRecentAppliedEdits,
  setPortfolioStatus,
  snapshotVersion,
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

// ── Diff computation ─────────────────────────────────────────────────────────

export interface DiffItem {
  label: string;
  oldValue: string;
  newValue: string;
  type: "color" | "text";
}

function computeDiff(oldJson: PortfolioJSON, newJson: ValidatedPortfolioJSON): DiffItem[] {
  const diffs: DiffItem[] = [];
  const oldTheme = oldJson.theme as unknown as Record<string, string | undefined>;
  const newTheme = newJson.theme as unknown as Record<string, string | undefined>;

  const colorFields = [
    { key: "background_color", label: "Couleur de fond" },
    { key: "primary_color",    label: "Couleur principale" },
    { key: "accent_color",     label: "Couleur d'accent" },
    { key: "text_color",       label: "Couleur du texte" },
  ];
  for (const { key, label } of colorFields) {
    const o = oldTheme[key];
    const n = newTheme[key];
    if (o && n && o.toLowerCase() !== n.toLowerCase()) {
      diffs.push({ label, oldValue: o, newValue: n, type: "color" });
    }
  }

  const textFields: { label: string; oldVal: string | undefined; newVal: string | undefined }[] = [
    { label: "Police titre",   oldVal: oldTheme.font_heading,       newVal: newTheme.font_heading },
    { label: "Police corps",   oldVal: oldTheme.font_body,          newVal: newTheme.font_body },
    { label: "Style",          oldVal: oldJson.theme.style,          newVal: newJson.theme.style },
    { label: "Motif de fond",  oldVal: oldTheme.background_pattern ?? "none", newVal: newJson.theme.background_pattern ?? "none" },
    { label: "Accroche",       oldVal: oldJson.meta.tagline,         newVal: newJson.meta.tagline },
    { label: "Titre pro",      oldVal: oldJson.meta.title,           newVal: newJson.meta.title },
  ];
  for (const { label, oldVal, newVal } of textFields) {
    if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
      diffs.push({ label, oldValue: oldVal, newValue: newVal, type: "text" });
    }
  }

  const oldHero = oldTheme.hero_image_url;
  const newHero = newJson.theme.hero_image_url;
  if (!oldHero && newHero) diffs.push({ label: "Photo de fond", oldValue: "Aucune", newValue: "Ajoutée", type: "text" });
  else if (oldHero && !newHero) diffs.push({ label: "Photo de fond", oldValue: "Présente", newValue: "Supprimée", type: "text" });

  const oldTypes = (oldJson.sections as { type: string }[]).map((s) => s.type);
  const newTypes = newJson.sections.map((s) => s.type as string);
  const added   = newTypes.filter((t) => !oldTypes.includes(t));
  const removed = oldTypes.filter((t) => !newTypes.includes(t));
  if (added.length)   diffs.push({ label: "Sections ajoutées",    oldValue: "", newValue: added.join(", "),   type: "text" });
  if (removed.length) diffs.push({ label: "Sections supprimées",  oldValue: removed.join(", "), newValue: "", type: "text" });

  return diffs;
}

// ── Field locking ────────────────────────────────────────────────────────────

function applyFieldLock(
  validated: ValidatedPortfolioJSON,
  original: PortfolioJSON,
  instruction: string,
): ValidatedPortfolioJSON {
  const lower = instruction.toLowerCase();
  const mentionsName  = /\b(nom|name|prénom|prenom)\b/.test(lower);
  const mentionsEmail = /\b(email|mail|courriel)\b/.test(lower);

  return {
    ...validated,
    meta: {
      ...validated.meta,
      name:  mentionsName  ? validated.meta.name  : original.meta.name,
      email: mentionsEmail ? validated.meta.email : original.meta.email,
    },
  };
}

// ── Route handler ────────────────────────────────────────────────────────────

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

  const siteJson = portfolio.site_json as PortfolioJSON | null;
  if (!siteJson) return NextResponse.json({ error: "Portfolio sans données JSON" }, { status: 400 });

  // Fetch recent edits for conversation memory (#2)
  const recentEdits = await getRecentAppliedEdits(portfolioId, 4).catch(() => []);

  // Build profile context (#1)
  const profileContext = {
    profileType:  portfolio.profile_type ?? "other",
    profileName:  siteJson.meta.name,
    profileTitle: siteJson.meta.title,
  };

  const editLog = await createEdit({ portfolio_id: portfolioId, instruction });

  // Filet de sécurité : on capture l'état ACTUEL (avant l'édition IA) pour pouvoir
  // revenir en arrière si l'IA casse le design.
  await snapshotVersion({
    portfolio_id: portfolioId,
    site_json: siteJson,
    source_code_key: portfolio.source_code_key,
    edit_summary: `Avant : "${instruction.slice(0, 80)}"`,
  }).catch((e) => console.error("[edit] snapshot failed:", e));

  // Statut transitoire "editing" → affiché "En cours d'édition" sur le dashboard
  // et la page détail ; restauré à la fin (succès ou échec).
  const prevStatus = portfolio.status;
  await setPortfolioStatus(portfolioId, "editing").catch(() => {});

  try {
    const systemPrompt = buildEditSystemPrompt(profileContext);
    const userPrompt   = buildEditUserPrompt(siteJson, instruction, recentEdits);

    const callWithOrWithout = (prompt: string) =>
      images?.length
        ? callClaudeWithImages(systemPrompt, prompt, images, 8192)
        : callClaude(systemPrompt, prompt, 8192);

    let raw = await callWithOrWithout(userPrompt);
    let cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: PortfolioJSON & { _summary?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const retryPrompt = `Ta réponse précédente n'était pas du JSON valide. Voici ce que tu as retourné :\n\n${raw.slice(0, 600)}\n\nRetourne UNIQUEMENT le JSON complet du portfolio, sans aucun texte autour.`;
      raw = await callWithOrWithout(retryPrompt);
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

    let validated: ValidatedPortfolioJSON;
    try {
      validated = PortfolioJSONSchema.parse(jsonWithoutSummary);
    } catch (zodErr) {
      const msg = zodErr instanceof Error ? zodErr.message : "Schéma invalide";
      console.error("[edit] zod error:", msg);
      throw new Error(`Données invalides générées par Claude : ${msg.slice(0, 200)}`);
    }

    // Field locking (#3): restore name/email unless explicitly mentioned
    const locked = applyFieldLock(validated, siteJson, instruction);

    // Compute diff (#5)
    const diff = computeDiff(siteJson, locked);

    const newCode  = generateDeveloperCode(locked);
    const codeKey  = `source-code/${portfolioId}/portfolio.json`;
    const savedKey = await writeCode(codeKey, newCode);

    await updatePortfolioJsonAndCode(portfolioId, locked, savedKey);
    await resolveEdit(editLog.id, "applied", { diffApplied: { summary, diff } });
    await setPortfolioStatus(portfolioId, prevStatus === "editing" ? "live" : prevStatus).catch(() => {});

    return NextResponse.json({ summary, diff, newUrl: null });
  } catch (err) {
    console.error("[edit] error:", err);
    await resolveEdit(editLog.id, "failed", { errorMessage: (err as Error).message });
    await setPortfolioStatus(portfolioId, prevStatus === "editing" ? "live" : prevStatus).catch(() => {});
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
