import type { DeveloperInputData } from "@/types/portfolio";
import { buildThemePresetsBlock, getPresetsForProfile } from "@/lib/portfolio/themes";

export function buildGenerateSystemPrompt(): string {
  return `Tu es un expert en création de portfolios professionnels visuellement distinctifs. Tu reçois des informations sur un profil et tu produis un objet JSON strict décrivant la structure et le contenu de son portfolio.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT avec un objet JSON valide. Aucun texte avant ou après, aucun bloc markdown, aucun commentaire.
- Respecte exactement le schéma fourni dans le message utilisateur.
- Si une information est manquante, invente quelque chose de professionnel et plausible.
- Les couleurs doivent être en format hexadécimal #RRGGBB.
- Le tagline doit être percutant, court (max 12 mots), et refléter la valeur unique de la personne.
- Les sections doivent être dans cet ordre : hero, about, skills, projects, experience (si dispo), contact.
- Pour les skills, déduis les niveaux (1-5) depuis le CV et les informations disponibles.
- Pour les projets (développeurs) : prends les plus impressionnants du GitHub, maximum 4.
- Pour les créatifs (artistes, mode) : les "projets" sont des travaux/réalisations marquants déduits du CV.
- CHOISIS UN THÈME depuis la liste fournie — c'est crucial pour que chaque portfolio soit visuellement unique.`;
}

export function buildGenerateUserPrompt(input: DeveloperInputData, profileType = "developer"): string {
  const presets = getPresetsForProfile(profileType);
  const presetsBlock = buildThemePresetsBlock(profileType);

  const githubSummary = input.github_data
    ? `
DONNÉES GITHUB (username: ${input.github_username}):
- Bio: ${input.github_data.bio ?? "Non renseignée"}
- Repos publics: ${input.github_data.public_repos}
- Followers: ${input.github_data.followers}
- Langages les plus utilisés: ${JSON.stringify(input.github_data.top_languages)}
- Top projets:
${input.github_data.repos
  .map((r) => `  • ${r.name} (${r.stargazers_count}★, ${r.language ?? "?"}): ${r.description ?? "Sans description"} — ${r.html_url}`)
  .join("\n")}
`
    : "";

  const instagramLine = input.instagram_url ? `- Instagram: ${input.instagram_url}` : "";

  const cvSummary = input.cv_text
    ? `\nCONTENU DU CV (extrait):\n${input.cv_text.slice(0, 3000)}`
    : "";

  // Pick a random preset to vary across generations
  const randomPreset = presets[Math.floor(Math.random() * presets.length)];

  const profileLabel = profileType === "artist" ? "Créatif / Artiste"
    : profileType === "fashion" ? "Mode / Mannequin / Styliste"
    : profileType === "other"   ? "Profil divers"
    : "Développeur";

  return `Génère le portfolio JSON pour ce profil.

TYPE DE PROFIL : ${profileLabel}

INFORMATIONS DE BASE :
- Nom: ${input.name}
- Titre/Poste: ${input.title}
- Email: ${input.email}
${input.github_username ? `- GitHub: https://github.com/${input.github_username}` : ""}
${instagramLine}
${input.linkedin_url ? `- LinkedIn: ${input.linkedin_url}` : ""}
${input.twitter_url ? `- Twitter: ${input.twitter_url}` : ""}
${githubSummary}${cvSummary}

THÈMES DISPONIBLES (choisis le plus adapté à ce profil) :
${presetsBlock}

THÈME SUGGÉRÉ POUR CETTE GÉNÉRATION : "${randomPreset.id}"
Tu peux choisir un autre thème si tu juges qu'il correspond mieux au profil et à sa personnalité.

SCHÉMA JSON ATTENDU (respecte-le exactement) :
{
  "meta": {
    "name": "string",
    "title": "string",
    "tagline": "string (accroche courte et percutante)",
    "email": "string (email valide)",
    "github_url": "string (URL optionnelle)",
    "instagram_url": "string (URL optionnelle)",
    "linkedin_url": "string (URL optionnelle)",
    "twitter_url": "string (URL optionnelle)",
    "avatar_url": "string (URL GitHub avatar si disponible)"
  },
  "theme": {
    "primary_color": "${randomPreset.primary_color}",
    "background_color": "${randomPreset.background_color}",
    "text_color": "${randomPreset.text_color}",
    "accent_color": "${randomPreset.accent_color}",
    "font_heading": "${randomPreset.font_heading}",
    "font_body": "${randomPreset.font_body}",
    "style": "${randomPreset.style}",
    "hero_image_url": ${randomPreset.hero_image_url ? `"${randomPreset.hero_image_url}"` : "null"},
    "overlay_opacity": ${randomPreset.overlay_opacity},
    "theme_preset_id": "${randomPreset.id}"
  },
  "sections": [
    { "type": "hero", "title": "string", "subtitle": "string", "cta_text": "string", "cta_url": "#projects" },
    { "type": "about", "content": "string (2-3 phrases personnalisées)", "highlight": "string optionnel (citation ou fait marquant)" },
    { "type": "skills", "items": [{ "name": "string", "level": 1, "category": "string" }] },
    { "type": "projects", "items": [{ "name": "string", "description": "string", "tech_stack": ["string"], "github_url": "string", "live_url": "string optionnel", "stars": 0 }] },
    { "type": "experience", "items": [{ "company": "string", "role": "string", "period": "string", "description": "string" }] },
    { "type": "contact", "email": "string", "message": "string", "links": [{ "label": "string", "url": "string", "icon": "string" }] }
  ]
}

Produis uniquement le JSON, rien d'autre.`;
}
