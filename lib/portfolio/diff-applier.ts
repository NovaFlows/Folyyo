import type { SourceCode } from "@/types/portfolio";
import { callClaude } from "@/lib/anthropic/client";
import {
  buildEditSystemPrompt,
  buildEditUserPrompt,
} from "@/lib/anthropic/prompts/edit-portfolio";

interface EditResponse {
  summary: string;
  files: Record<string, string>;
}

export async function applyEdit(
  currentCode: SourceCode,
  instruction: string,
  maxRetries = 2
): Promise<{ newCode: SourceCode; summary: string }> {
  let lastError: string | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const systemPrompt = buildEditSystemPrompt();
    const userPrompt =
      attempt === 0
        ? buildEditUserPrompt(currentCode, instruction)
        : buildEditUserPrompt(
            currentCode,
            `${instruction}\n\n[RETRY ${attempt}] La tentative précédente a produit une erreur: ${lastError}. Corrige le code.`
          );

    const raw = await callClaude(systemPrompt, userPrompt, 8192);

    let parsed: EditResponse;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      lastError = "Réponse non-JSON de Claude";
      continue;
    }

    if (!parsed.files || typeof parsed.files !== "object") {
      lastError = 'Champ "files" manquant dans la réponse';
      continue;
    }

    // Merge changed files into current code
    const newCode: SourceCode = { ...currentCode, ...parsed.files };

    // Basic syntax check: look for obviously broken JSX (unmatched braces at top level)
    const syntaxError = checkBasicSyntax(parsed.files);
    if (syntaxError) {
      lastError = syntaxError;
      continue;
    }

    return { newCode, summary: parsed.summary ?? instruction };
  }

  throw new Error(`Édition impossible après ${maxRetries + 1} tentatives: ${lastError}`);
}

function checkBasicSyntax(files: Record<string, string>): string | null {
  for (const [path, content] of Object.entries(files)) {
    if (!path.endsWith(".tsx") && !path.endsWith(".ts")) continue;

    // Count braces
    let depth = 0;
    for (const char of content) {
      if (char === "{") depth++;
      if (char === "}") depth--;
      if (depth < 0) return `Accolade fermante non appariée dans ${path}`;
    }
    if (depth !== 0) return `Accolade non fermée dans ${path}`;

    // Check for obvious import errors
    if (content.includes("import {") && !content.includes("from ")) {
      return `Import sans 'from' dans ${path}`;
    }
  }
  return null;
}
