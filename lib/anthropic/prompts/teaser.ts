// Prompt minimal pour le teaser CV public (landing page, sans compte) — une
// extraction bon marché (modèle Haiku, peu de tokens), pas une génération de
// portfolio. Contrairement à generate-portfolio.ts, aucune interprétation
// créative ni structure de sections : juste 4 champs factuels courts.

export function buildTeaserSystemPrompt(): string {
  return `Tu extrais 4 informations courtes d'un texte de CV, pour un aperçu rapide. Réponds TOUJOURS et UNIQUEMENT avec un objet JSON valide, sans aucun texte avant ou après, sans bloc markdown.

FORMAT EXACT :
{
  "name": "prénom + nom probable, déduit du CV (chaîne vide si introuvable)",
  "title": "titre/rôle professionnel court, ex: Développeur full-stack",
  "tagline": "une phrase accrocheuse (~10 mots) qui résume le profil, ton engageant",
  "skills": ["3 à 5 compétences ou technologies clés, courtes"]
}

Ne jamais inventer d'informations factuelles absentes du texte (expériences, diplômes) — la tagline peut être formulée avec punch, mais doit rester fidèle au contenu réel.`;
}

export function buildTeaserUserPrompt(cvText: string): string {
  return `CONTENU DU CV :\n${cvText || "(vide ou illisible)"}`;
}
