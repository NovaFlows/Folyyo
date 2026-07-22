import type { DeveloperInputData } from "@/types/portfolio";
import { getPresetsForProfile } from "@/lib/portfolio/themes";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";

export function buildGenerateSystemPrompt(): string {
  return `Tu es un expert en création de portfolios professionnels. Tu analyses le profil d'une personne et tu génères un portfolio JSON parfaitement adapté à son métier, ses objectifs et son secteur d'activité.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT avec un objet JSON valide. Aucun texte avant ou après.
- Respecte exactement le schéma fourni.
- Si une information est manquante, invente quelque chose de professionnel et plausible.
- Les couleurs : format hexadécimal #RRGGBB uniquement.
- Le tagline : percutant, court (max 12 mots), refléter la valeur unique de la personne. Évite les clichés ("passionné par", "expert en", "je m'appelle").
- ADAPTE le portfolio au vrai métier de la personne — ne génère pas 6 sections génériques.`;
}

export function buildGenerateUserPrompt(
  input: DeveloperInputData,
  profileType = "developer",
  themeOverride?: ValidatedPortfolioJSON["theme"],
  language: "fr" | "en" | "es" | "de" = "fr"
): string {
  const presets = getPresetsForProfile(profileType);
  // hero_image_url d'un portfolio featuré est SA photo (contenu, pas style) — et peut être
  // une image uploadée dans l'éditeur visuel, stockée en base64 inline (des dizaines de Ko
  // de bruit qui, une fois collées telles quelles dans le prompt, explosent le coût/la durée
  // et déstabilisent la génération). On ne réutilise donc jamais ce champ depuis un template.
  const preset = themeOverride ? { ...themeOverride, hero_image_url: null } : presets[Math.floor(Math.random() * presets.length)];
  // Le style d'un portfolio featuré n'a pas d'"id" de preset — on retombe sur son
  // theme_preset_id existant (ou "custom"), plutôt que sur preset.id qui n'existe pas dessus.
  const presetId = themeOverride
    ? (themeOverride.theme_preset_id ?? "custom")
    : (preset as { id: string }).id;
  const backgroundPattern = themeOverride?.background_pattern
    ?? ["none", "none", "none", "dots", "lines"][Math.floor(Math.random() * 5)];

  const githubBlock = input.github_data ? `
DONNÉES GITHUB (${input.github_username}) :
- Bio : ${input.github_data.bio ?? "—"}
- Repos publics : ${input.github_data.public_repos} | Followers : ${input.github_data.followers}
- Langages : ${JSON.stringify(input.github_data.top_languages)}
- Top projets :
${input.github_data.repos.slice(0, 6).map((r) =>
  `  • ${r.name} (${r.stargazers_count}★, ${r.language ?? "?"}) : ${r.description ?? "Sans description"} — ${r.html_url}`
).join("\n")}` : "";

  const youtubeBlock = input.youtube_data ? `
DONNÉES YOUTUBE (@${input.youtube_url?.replace("https://youtube.com/@", "") ?? ""}):
- Chaîne : ${input.youtube_data.channelName}
- Abonnés : ${input.youtube_data.subscriberCount.toLocaleString("fr-FR")} | Vidéos : ${input.youtube_data.videoCount}
${input.youtube_data.description ? `- Bio chaîne : ${input.youtube_data.description.slice(0, 300)}` : ""}
- Dernières vidéos (utilise ces VRAIS titres dans la discographie) :
${input.youtube_data.videos.map((v, i) =>
  `  ${i + 1}. "${v.title}" — ${v.viewCount ? Number(v.viewCount).toLocaleString("fr-FR") + " vues" : "?"} (${v.publishedAt?.slice(0, 10) ?? "?"})`
).join("\n")}` : "";

  const cvBlock   = input.cv_text ? `\nCONTENU DU CV :\n${input.cv_text.slice(0, 3500)}` : "";
  const igLine    = input.instagram_url ? `- Instagram : ${input.instagram_url}` : "";
  const ghLine    = input.github_username ? `- GitHub : https://github.com/${input.github_username}` : "";
  const ytLine    = input.youtube_url ? `- YouTube : ${input.youtube_url}` : "";
  const liLine    = input.linkedin_url ? `- LinkedIn : ${input.linkedin_url}` : "";
  const twLine    = input.twitter_url  ? `- Twitter  : ${input.twitter_url}` : "";

  const musicienRule = profileType === "musicien" ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÈGLE CRITIQUE — MUSICIEN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ne génère JAMAIS de titres de sons/albums/clips fictifs.
- Si des vidéos YouTube sont listées ci-dessous → utilise leurs VRAIS titres.
- Si aucune donnée YouTube n'est disponible → mets "[Titre à ajouter]" comme placeholder.
- Idem pour les dates de sortie : utilise publishedAt si disponible, sinon "[Date à compléter]".
- Ne réutilise jamais les titres d'autres artistes.` : "";

  const languageRule = language === "en" ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE — WRITE IN ENGLISH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Write ALL generated text content in English: tagline, about/bio, project
and experience descriptions, contact message, section titles, everything
except proper nouns (names, company names, technology names). The JSON
field names themselves stay in English as specified below (that part is
unrelated to this rule).` : language === "es" ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDIOMA — REDACTA EN ESPAÑOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Redacta TODO el contenido textual generado en español: eslogan, sobre mí,
descripciones de proyectos/experiencias, mensaje de contacto, títulos de
sección — excepto los nombres propios (personas, empresas, tecnologías).
Los nombres de los campos JSON permanecen en inglés tal como se especifica
más abajo (eso no tiene relación con esta regla).` : language === "de" ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRACHE — SCHREIBE AUF DEUTSCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Verfasse SÄMTLICHE generierten Textinhalte auf Deutsch: Slogan, Über-mich-
Text, Projekt- und Erfahrungsbeschreibungen, Kontaktnachricht, Abschnitts-
titel — außer Eigennamen (Personen, Unternehmen, Technologien). Die
JSON-Feldnamen selbst bleiben wie unten angegeben auf Englisch (das steht
in keinem Zusammenhang mit dieser Regel).` : `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUE — RÉDIGE EN FRANÇAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Rédige tout le contenu textuel généré en français : accroche, à propos,
descriptions de projets/expériences, message de contact, titres de
sections — à l'exception des noms propres (personnes, entreprises,
technologies).`;

  return `PROFIL À GÉNÉRER
${languageRule}

Type : ${profileType}
Nom : ${input.name}
Titre / Poste : ${input.title}
Email : ${input.email}
${ghLine}${ytLine ? "\n" + ytLine : ""}${igLine ? "\n" + igLine : ""}${liLine ? "\n" + liLine : ""}${twLine ? "\n" + twLine : ""}
${githubBlock}${youtubeBlock}${cvBlock}${musicienRule}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INTELLIGENCE DE SÉLECTION DES SECTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyse le titre et le type pour choisir 3 à 6 sections adaptées. Utilise TOUJOURS "section_title" pour nommer les sections de façon pertinente (sauf si le titre standard convient parfaitement).

DÉVELOPPEUR / INGÉNIEUR / DATA SCIENTIST :
  sections : hero → about → skills → projects → experience → contact
  section_title : standard (pas besoin de le préciser)
  image_url : "" sur les projets si c'est une app web ou mobile (pour screenshots futurs)
  tech_stack : technologies réelles utilisées

ARTISTE / ILLUSTRATEUR / GRAPHISTE / PEINTRE / SCULPTEUR :
  sections : hero → about → projects → [experience si pertinent] → contact
  projects section_title : "Œuvres" ou "Portfolio" ou "Créations"
  experience section_title : "Expositions & Distinctions" ou "Clients"
  image_url : "" sur CHAQUE item de projects (l'utilisateur ajoutera ses photos d'œuvres)
  tech_stack : matériaux / techniques ("Huile sur toile", "Aquarelle", "Sculpture bois")
  NE PAS inclure skills avec niveaux sauf si très pertinent (instruments, logiciels)
  github_url / stars / live_url : laisser vides

PHOTOGRAPHE / VIDÉASTE / RÉALISATEUR :
  sections : hero → about → projects → [skills si pertinent] → contact
  projects section_title : "Portfolio" ou "Galerie" ou "Réalisations"
  image_url : "" sur CHAQUE item (l'utilisateur ajoutera ses meilleures photos)
  tech_stack : style / sujet / matériel ("Portrait", "Reportage", "Sony A7", "Studio")
  skills section_title : "Spécialités" ou "Prestations", hide_level : true ou false

MANNEQUIN / MODÈLE / STYLISTE / DIRECTEUR ARTISTIQUE MODE :
  sections : hero → about → projects → experience → contact
  projects section_title : "Campagnes & Éditos" ou "Portfolio" ou "Shootings"
  image_url : "" sur CHAQUE item campagne
  experience section_title : "Agences & Collaborations"
  tech_stack : marque / magazine / photographe ("Vogue", "Lacoste", "Annie Leibovitz")
  skills : optionnel — si inclus : section_title : "Spécialités", hide_level : true

BOUTIQUE DE MODE / MARQUE / COMMERCE :
  sections : hero → about → skills → projects → contact (PAS d'experience sauf si pertinent)
  skills section_title : "Marques distribuées" ou "Notre sélection", hide_level : true
  skills items : chaque marque = un item, level : 3 (caché), category : segment (Femme, Homme, Accessoires…)
  projects section_title : "Collections" ou "Nouvelles Arrivées"
  image_url : "" sur chaque collection (pour photos de produits)
  tech_stack : saison / style ("Printemps 2024", "Streetwear", "Minimaliste")

MUSICIEN / DJ / COMPOSITEUR / BEATMAKER :
  sections : hero → about → projects → experience → contact
  projects section_title : "Discographie" ou "Releases" ou "Projets musicaux"
  image_url : "" sur chaque album/single (pour pochettes)
  experience section_title : "Scène & Lives" ou "Collaborations"
  tech_stack : genre / instruments / ambiance ("R&B", "Afro-beat", "Piano", "Ableton")
  skills : optionnel — instruments / logiciels si pertinent

CONSULTANT / COACH / FORMATEUR / THÉRAPEUTE :
  sections : hero → about → skills → experience → contact
  skills section_title : "Services proposés" ou "Mes accompagnements", hide_level : true
  skills items : chaque service = un item, category = format (Individuel, Groupe, En ligne…)
  experience section_title : "Parcours & Clients" ou "Formations suivies"
  NE PAS inclure projects si peu pertinent

ARCHITECTE / DESIGNER INTÉRIEUR / DESIGNER PRODUIT :
  sections : hero → about → projects → skills → contact
  projects section_title : "Réalisations" ou "Projets", image_url : "" sur chaque item
  skills section_title : "Expertises" ou "Savoir-faire", hide_level : false
  tech_stack : style / logiciels / matériaux ("Minimalisme", "AutoCAD", "Béton brut")

AUTRE / POLYVALENT :
  Déduis la configuration la plus proche depuis les exemples ci-dessus.
  Priorité : bien nommer les sections + mettre image_url : "" là où des visuels sont attendus.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THÈME (utilise EXACTEMENT ces valeurs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "primary_color":    "${preset.primary_color}",
  "background_color": "${preset.background_color}",
  "text_color":       "${preset.text_color}",
  "accent_color":     "${preset.accent_color}",
  "font_heading":     "${preset.font_heading}",
  "font_body":        "${preset.font_body}",
  "style":            "${preset.style}",
  "hero_image_url":   ${preset.hero_image_url ? `"${preset.hero_image_url}"` : "null"},
  "overlay_opacity":  ${preset.overlay_opacity},
  "theme_preset_id":  "${presetId}",
  "background_pattern": "${backgroundPattern}"
}

En plus de ces valeurs fixes, choisis ces 5 réglages selon ton jugement (pas de
valeur imposée — adapte au profil/style demandé) :
  "widget_style"            : "strict" | "soft" | "glass" — rendu des widgets (plat / cartes arrondies / verre dépoli). "strict" par défaut sauf ambiance qui appelle explicitement l'un des deux autres.
  "smooth_scroll"           : bool — défilement fluide au clic sur la nav. true par défaut, sobre et sans risque.
  "scroll_reveal"           : bool — chaque section apparaît en fondu à l'arrivée à l'écran. true si l'ambiance demandée est dynamique/moderne, sinon false.
  "scroll_reveal_intensity" : 0-100 — amplitude du glissement de cette apparition (ignoré si scroll_reveal=false). 50 par défaut.
  "hero_parallax"           : bool — la photo de fond du hero défile plus lentement que le contenu. true seulement s'il y a une hero_image_url/hero_images.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SCHÉMA JSON ATTENDU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "meta": {
    "name": "string",
    "title": "string",
    "tagline": "string — accroche courte, percutante, unique",
    "email": "string (email valide)",
    "github_url":    "string (URL ou vide)",
    "instagram_url": "string (URL ou vide)",
    "youtube_url":   "string (URL ou vide)",
    "linkedin_url":  "string (URL ou vide)",
    "twitter_url":   "string (URL ou vide)",
    "avatar_url":    "string (avatar GitHub si disponible, sinon vide)"
  },
  "theme": { ... (valeurs fixes du bloc THÈME ci-dessus + les 5 réglages widget_style/smooth_scroll/scroll_reveal/scroll_reveal_intensity/hero_parallax choisis selon ton jugement) },
  "sections": [
    {
      "type": "hero",
      "section_title": "optionnel",
      "title": "string",
      "subtitle": "string",
      "cta_text": "string",
      "cta_url": "#projets-ou-section-pertinente"
    },
    {
      "type": "about",
      "section_title": "optionnel — ex: 'Mon histoire', 'La boutique', 'Notre vision'",
      "content": "string — 2-4 phrases riches, personnalisées, qui reflètent le vrai métier",
      "highlight": "string optionnel — citation forte ou fait marquant"
    },
    {
      "type": "skills",
      "section_title": "string — ex: 'Compétences', 'Marques distribuées', 'Services proposés'",
      "hide_level": false,
      "items": [{ "name": "string", "level": 1-5, "category": "string" }]
    },
    {
      "type": "projects",
      "section_title": "string — ex: 'Projets', 'Œuvres', 'Campagnes', 'Collections'",
      "items": [{
        "name": "string",
        "description": "string",
        "tech_stack": ["string — tags adaptés au métier"],
        "github_url": "string ou vide",
        "live_url": "string ou vide",
        "stars": null,
        "image_url": "string vide si des photos visuelles sont attendues, omis sinon"
      }]
    },
    {
      "type": "experience",
      "section_title": "string — ex: 'Expérience', 'Expositions', 'Agences', 'Scène & Lives'",
      "items": [{ "company": "string", "role": "string", "period": "string", "description": "string" }]
    },
    {
      "type": "contact",
      "section_title": "optionnel — 'Contact', 'Me contacter', 'Collaborons'",
      "email": "string",
      "message": "string — message d'invitation adapté au profil",
      "links": [{ "label": "string", "url": "string", "icon": "string" }]
    }
  ]
}

Produis uniquement le JSON, rien d'autre.`;
}
