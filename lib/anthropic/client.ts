import Anthropic from "@anthropic-ai/sdk";

// Modèle partagé par tous les appels Claude de l'app (génération, édition —
// boucle d'outils comprise) : une seule source de vérité pour l'upgrade.
export const CLAUDE_MODEL = "claude-sonnet-5";
// Modèle léger pour les tâches d'extraction bon marché (ex: teaser CV public,
// pas de jugement design requis) — coût et latence bien plus bas que Sonnet.
export const CLAUDE_MODEL_FAST = "claude-haiku-4-5-20251001";

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
  model: string = CLAUDE_MODEL
): Promise<string> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!block) throw new Error("Réponse Claude inattendue");
  return block.text;
}

export interface ImageAttachment {
  data: string;          // base64 sans le préfixe data:...
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
}

export async function callClaudeWithImages(
  systemPrompt: string,
  userPrompt: string,
  images: ImageAttachment[],
  maxTokens = 4096
): Promise<string> {
  const client = getAnthropicClient();

  const content: Anthropic.MessageParam["content"] = [
    ...images.map((img) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: img.mediaType, data: img.data },
    })),
    { type: "text" as const, text: userPrompt },
  ];

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content }],
  });

  const block = message.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  if (!block) throw new Error("Réponse Claude inattendue");
  return block.text;
}
