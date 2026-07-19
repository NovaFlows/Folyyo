// pdf-parse has no ESM export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

// Extrait le texte brut d'un PDF, tronqué à `maxChars`. Partagé entre la
// génération complète (app/api/portfolio/generate/route.ts, cv déjà uploadé
// sur R2/local) et le teaser CV public (app/api/teaser/route.ts, fichier en
// mémoire, jamais stocké) — même logique d'extraction, contexte différent.
export async function parsePdfText(buffer: Buffer, maxChars = 4000): Promise<string> {
  const parsed = await pdfParse(buffer);
  return (parsed.text as string).slice(0, maxChars);
}
