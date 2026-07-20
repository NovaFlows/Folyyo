export interface SummarizeProjectInput {
  name: string;
  kind: "github" | "youtube";
  description?: string | null;
  language?: string | null;
  topics?: string[];
}

export function buildSummarizeSystemPrompt(): string {
  return `Tu écris des descriptions courtes pour des cartes de projet dans un portfolio professionnel.

RÈGLES ABSOLUES :
- Pour chaque élément fourni, rédige 1 à 2 phrases en français, concrètes et engageantes.
- Si la description brute est vague, absente ou juste un nom de dépôt technique, invente quelque chose de plausible et professionnel cohérent avec le nom et le contexte — n'écris jamais "aucune information" ou équivalent.
- Ne mentionne jamais que tu inventes ou que l'information est manquante.
- Réponds UNIQUEMENT avec un tableau JSON de chaînes de caractères, dans le MÊME ORDRE que les éléments fournis, un élément du tableau par élément fourni. Aucun texte avant ou après.`;
}

export function buildSummarizeUserPrompt(items: SummarizeProjectInput[]): string {
  const lines = items.map((it, i) => {
    const type = it.kind === "github" ? "projet de code (dépôt GitHub)" : "vidéo YouTube";
    const lang = it.language ? ` | Langage principal : ${it.language}` : "";
    const topics = it.topics?.length ? ` | Sujets/tags : ${it.topics.join(", ")}` : "";
    const raw = it.description?.trim() || "aucune";
    return `${i + 1}. Nom : "${it.name}" | Type : ${type}${lang}${topics} | Description brute : ${raw}`;
  });
  return `Éléments à décrire :\n${lines.join("\n")}`;
}
