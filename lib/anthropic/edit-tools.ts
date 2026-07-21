import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type Anthropic from "@anthropic-ai/sdk";

// ── Catalogue d'outils pour l'édition IA du portfolio ──────────────────────────
// Chaque outil correspond à UN mutateur existant de VisualEditor.tsx (ou à sa
// décomposition naturelle) — voir lib/portfolio/apply-edit-tool.ts pour
// l'exécution. Un schéma Zod par outil sert à la fois de source pour le JSON
// Schema envoyé à l'API (input_schema) et de validateur runtime des arguments
// reçus de Claude, pour éviter toute dérive entre les deux.

const NON_HERO_TYPE = z.enum(["about", "skills", "projects", "experience", "contact"]);
const ANY_SECTION_TYPE = z.enum(["hero", "about", "skills", "projects", "experience", "contact"]);
const ALIGN = z.enum(["left", "center", "right"]);
const HEX = z.string().regex(/^#[0-9a-fA-F]{6}$/).describe("Couleur hexadécimale 6 chiffres, ex: #1c1917");

const size = z.number().min(1).max(5).optional().describe("Taille visuelle 1 (petit) à 5 (grand), 3 = normal");
const fontSize = z.number().min(10).max(72).optional().describe("Taille de police en pixels — remplace 'size' si précisé");
const fontFamily = z.string().optional().describe("Nom de police (Google Fonts)");

// Contenu d'un widget — miroir de ContentBlockSchema (lib/anthropic/schema.ts)
// SANS "section_content" ni "section_title" (contenu natif et marqueur de
// titre, jamais ajoutés/modifiés par cet outil — un seul de chaque par
// section, gérés par l'app elle-même).
const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("image"), url: z.string().describe("URL de l'image"), caption: z.string().optional(), size }),
  z.object({ type: z.literal("text"), content: z.string(), style: z.enum(["normal", "lead"]).default("normal"), size, fontSize, fontFamily, align: ALIGN.optional() }),
  z.object({ type: z.literal("quote"), text: z.string(), author: z.string().optional(), size, fontSize, fontFamily, align: ALIGN.optional() }),
  z.object({ type: z.literal("stats"), items: z.array(z.object({ label: z.string(), value: z.string() })), size, fontSize, fontFamily }),
  z.object({ type: z.literal("button"), label: z.string(), url: z.string(), variant: z.enum(["primary", "outline"]).default("primary"), size, fontSize, fontFamily }),
  z.object({ type: z.literal("divider"), size }),
  z.object({ type: z.literal("carousel"), images: z.array(z.object({ url: z.string(), caption: z.string().optional(), description: z.string().max(500).optional().describe("Texte long affiché à droite de la photo, 500 caractères max (bascule automatiquement le carrousel en mise en page 2 colonnes) — caption sert alors de titre en gras au-dessus"), linkUrl: z.string().optional() })), size, fontSize, fontFamily, descriptionWidth: z.number().min(160).max(480).optional().describe("Largeur en pixels du cadre description (160 à 480, défaut 240) — utile seulement si au moins une photo a une description") }),
  z.object({ type: z.literal("links"), items: z.array(z.object({ label: z.string(), url: z.string() })), size, fontSize, fontFamily }),
]).describe("Contenu du widget — le champ \"type\" détermine les autres champs valides.");

// ── Thème ────────────────────────────────────────────────────────────────────
const setThemeColorsSchema = z.object({
  background_color: HEX.optional(),
  primary_color: HEX.optional(),
  text_color: HEX.optional(),
  accent_color: HEX.optional(),
}).describe("Change une ou plusieurs couleurs du thème. Précise toujours text_color en même temps que background_color pour garantir un bon contraste — un filet de sécurité corrige automatiquement le contraste insuffisant si tu l'omets, mais un choix délibéré donne un meilleur résultat.");

const setThemeTypographySchema = z.object({
  font_heading: z.string().optional().describe("Police des titres"),
  font_body: z.string().optional().describe("Police du texte courant"),
});

const setThemeStyleSchema = z.object({
  style: z.enum(["dark-code", "minimal-gallery", "fullscreen-hero"]).optional(),
  background_pattern: z.enum(["none", "lines", "dots", "grid", "crosshatch"]).optional(),
  widget_style: z.enum(["strict", "soft", "glass"]).optional().describe("Rendu des widgets : plat (strict), cartes arrondies (soft), verre dépoli (glass)"),
});

const setThemeEffectsSchema = z.object({
  smooth_scroll: z.boolean().optional().describe("Défilement fluide au clic sur la nav/les boutons"),
  scroll_reveal: z.boolean().optional().describe("Chaque section apparaît en fondu à l'arrivée à l'écran"),
  scroll_reveal_intensity: z.number().min(0).max(100).optional().describe("Amplitude du glissement de l'apparition (0=fondu seul, 100=glissement prononcé). Sans effet si scroll_reveal=false."),
  hero_parallax: z.boolean().optional().describe("La photo de fond du hero défile plus lentement que le reste du contenu (nécessite une image de fond)"),
}).describe("Effets visuels du site publié — invisibles dans l'éditeur, qui reste volontairement statique pour faciliter la sélection/édition.");

const setHeroBackgroundSchema = z.object({
  hero_image_url: z.string().optional().describe("URL de l'image de fond du hero, chaîne vide pour la retirer"),
  hero_interval: z.number().min(2).max(15).optional().describe("Secondes entre chaque image si plusieurs images de fond"),
  overlay_opacity: z.number().min(0).max(1).optional().describe("Opacité du voile sombre sur l'image de fond, pour la lisibilité du texte par-dessus"),
});
const addHeroBackgroundImageSchema = z.object({ url: z.string().describe("URL de l'image à ajouter à la galerie de fond du hero") });
const removeHeroBackgroundImageSchema = z.object({ index: z.number().int().min(0).describe("Index (0 = première image) de l'image à retirer de la galerie de fond du hero") });

// ── Meta ─────────────────────────────────────────────────────────────────────
const updateMetaSchema = z.object({
  title: z.string().optional().describe("Titre professionnel affiché sous le nom"),
  tagline: z.string().optional().describe("Accroche courte et percutante"),
  github_url: z.string().optional(),
  instagram_url: z.string().optional(),
  youtube_url: z.string().optional(),
  linkedin_url: z.string().optional(),
  twitter_url: z.string().optional(),
  avatar_url: z.string().optional(),
}).describe("Met à jour les informations publiques du propriétaire. Ne permet PAS de changer le nom ni l'email du compte (verrouillés).");

// ── Sections ─────────────────────────────────────────────────────────────────
const addSectionSchema = z.object({
  section_type: NON_HERO_TYPE.describe("Type de la nouvelle section — le hero existe déjà et ne peut pas être ajouté"),
  position: z.number().int().min(0).optional().describe("Index d'insertion parmi les sections non-hero (0 = juste après le hero). Omis = ajoutée à la fin."),
});
const removeSectionSchema = z.object({ section_type: NON_HERO_TYPE });
const reorderSectionsSchema = z.object({
  order: z.array(NON_HERO_TYPE).describe("Ordre complet souhaité pour les sections non-hero (le hero reste toujours en premier) — doit contenir exactement les types de sections actuellement présents, chacun une fois."),
});
const setSectionTitleSchema = z.object({ section_type: NON_HERO_TYPE, section_title: z.string() });
const setSectionTitleAlignSchema = z.object({ section_type: NON_HERO_TYPE, title_align: ALIGN });

// ── Contenu natif : hero / about ────────────────────────────────────────────
const updateHeroSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  cta_text: z.string().optional().describe("Texte du bouton d'appel à l'action"),
  cta_url: z.string().optional().describe("Lien du bouton, ex: #projects ou une URL externe"),
});
const updateAboutSchema = z.object({
  content: z.string().optional().describe("Texte de présentation"),
  highlight: z.string().optional().describe("Phrase mise en avant/encadrée — chaîne vide pour la retirer"),
});

// ── Compétences ──────────────────────────────────────────────────────────────
const addSkillSchema = z.object({ name: z.string(), level: z.number().int().min(1).max(5), category: z.string() });
const updateSkillSchema = z.object({
  name: z.string().describe("Nom EXACT de la compétence à modifier, tel qu'il apparaît dans le JSON fourni"),
  new_name: z.string().optional(), level: z.number().int().min(1).max(5).optional(), category: z.string().optional(),
});
const removeSkillSchema = z.object({ name: z.string() });
const setSkillsHideLevelSchema = z.object({ hide_level: z.boolean().describe("true = n'affiche pas la barre de niveau, juste le nom des compétences") });

// ── Projets ──────────────────────────────────────────────────────────────────
const addProjectSchema = z.object({
  name: z.string(), description: z.string(),
  tech_stack: z.array(z.string()).default([]),
  github_url: z.string().optional(), live_url: z.string().optional(), image_url: z.string().optional(),
});
const updateProjectSchema = z.object({
  name: z.string().describe("Nom EXACT du projet à modifier"),
  new_name: z.string().optional(), description: z.string().optional(),
  tech_stack: z.array(z.string()).optional(),
  github_url: z.string().optional(), live_url: z.string().optional(), image_url: z.string().optional(),
});
const removeProjectSchema = z.object({ name: z.string() });

// ── Expérience ───────────────────────────────────────────────────────────────
const addExperienceSchema = z.object({ company: z.string(), role: z.string(), period: z.string(), description: z.string() });
const updateExperienceSchema = z.object({
  company: z.string().describe("Entreprise EXACTE de l'expérience à modifier"),
  role: z.string().describe("Poste EXACT de l'expérience à modifier — identifie l'entrée avec company"),
  new_company: z.string().optional(), new_role: z.string().optional(),
  period: z.string().optional(), description: z.string().optional(),
});
const removeExperienceSchema = z.object({ company: z.string(), role: z.string() });

// ── Contact ──────────────────────────────────────────────────────────────────
const updateContactSchema = z.object({
  email: z.string().email().optional().describe("Email de contact PUBLIC affiché sur le site — différent de l'email du compte, jamais verrouillé"),
  message: z.string().optional(),
});
const addContactLinkSchema = z.object({ label: z.string(), url: z.string(), icon: z.string().default("") });
const updateContactLinkSchema = z.object({
  label: z.string().describe("Libellé EXACT du lien à modifier"),
  new_label: z.string().optional(), url: z.string().optional(), icon: z.string().optional(),
});
const removeContactLinkSchema = z.object({ label: z.string() });

// ── Réordonnancement générique de listes ────────────────────────────────────
const reorderItemsSchema = z.object({
  section_type: z.enum(["skills", "projects", "experience"]),
  order: z.array(z.string()).describe("Ordre complet souhaité, par clé naturelle : \"name\" pour skills/projects, \"company — role\" pour experience — doit contenir exactement les items actuellement présents"),
});

// ── Widgets de grille ────────────────────────────────────────────────────────
const addWidgetSchema = z.object({
  section_type: ANY_SECTION_TYPE,
  block: blockSchema,
  x: z.number().int().min(0).max(11).optional().describe("Colonne de départ (0-11). Omis = placé automatiquement."),
  y: z.number().int().min(0).optional().describe("Ligne de départ. Omis = placé automatiquement sous le contenu existant."),
  w: z.number().int().min(1).max(12).optional().describe("Largeur en colonnes. Omis = taille par défaut du type de widget."),
  h: z.number().int().min(1).optional().describe("Hauteur en lignes. Omis = taille par défaut du type de widget."),
});
const updateWidgetSchema = z.object({
  section_type: ANY_SECTION_TYPE,
  widget_id: z.string().describe("Id EXACT du widget (champ \"id\" de l'item de grille dans le JSON fourni)"),
  block: blockSchema.describe("Nouveau contenu complet du widget"),
});
const removeWidgetSchema = z.object({ section_type: ANY_SECTION_TYPE, widget_id: z.string() });
const moveWidgetSchema = z.object({
  section_type: ANY_SECTION_TYPE,
  widget_id: z.string(),
  x: z.number().int().min(0).max(11).optional(),
  y: z.number().int().min(0).optional(),
  w: z.number().int().min(1).max(12).optional(),
  h: z.number().int().min(1).optional(),
}).describe("Patch partiel de position/taille — seuls les champs fournis changent.");
const moveWidgetAcrossNativeSchema = z.object({
  section_type: ANY_SECTION_TYPE,
  widget_id: z.string(),
  direction: z.enum(["above", "below"]).describe("Place le widget juste au-dessus ou en dessous du contenu natif de la section, en un geste — préférable à move_widget quand tu veux juste \"avant/après le contenu principal\" sans calculer de coordonnées"),
});

// ── Catalogue ────────────────────────────────────────────────────────────────
interface ToolDef { name: string; description: string; schema: z.ZodTypeAny }

const TOOL_DEFS: ToolDef[] = [
  { name: "set_theme_colors", description: "Change une ou plusieurs couleurs du thème (fond, principale, texte, accent).", schema: setThemeColorsSchema },
  { name: "set_theme_typography", description: "Change les polices (titres et/ou texte courant).", schema: setThemeTypographySchema },
  { name: "set_theme_style", description: "Change le style visuel global, le motif de fond, et/ou le rendu des widgets.", schema: setThemeStyleSchema },
  { name: "set_theme_effects", description: "Active/règle les effets visuels du site publié (défilement fluide, apparition au scroll, parallaxe).", schema: setThemeEffectsSchema },
  { name: "set_hero_background", description: "Change l'image de fond du hero, l'intervalle de diaporama, et/ou l'opacité du voile.", schema: setHeroBackgroundSchema },
  { name: "add_hero_background_image", description: "Ajoute une image à la galerie de fond du hero (diaporama).", schema: addHeroBackgroundImageSchema },
  { name: "remove_hero_background_image", description: "Retire une image de la galerie de fond du hero par son index.", schema: removeHeroBackgroundImageSchema },

  { name: "update_meta", description: "Met à jour titre, accroche, réseaux sociaux ou avatar du propriétaire.", schema: updateMetaSchema },

  { name: "add_section", description: "Ajoute une nouvelle section (about/skills/projects/experience/contact).", schema: addSectionSchema },
  { name: "remove_section", description: "Supprime une section existante (impossible de descendre sous 3 sections au total).", schema: removeSectionSchema },
  { name: "reorder_sections", description: "Réordonne les sections non-hero.", schema: reorderSectionsSchema },
  { name: "set_section_title", description: "Change le titre affiché d'une section.", schema: setSectionTitleSchema },
  { name: "set_section_title_align", description: "Change l'alignement du titre d'une section.", schema: setSectionTitleAlignSchema },

  { name: "update_hero", description: "Met à jour le titre, sous-titre et/ou bouton d'appel à l'action du hero.", schema: updateHeroSchema },
  { name: "update_about", description: "Met à jour le texte de présentation et/ou la phrase mise en avant de la section À propos.", schema: updateAboutSchema },

  { name: "add_skill", description: "Ajoute une compétence à la section Compétences.", schema: addSkillSchema },
  { name: "update_skill", description: "Modifie une compétence existante (identifiée par son nom actuel).", schema: updateSkillSchema },
  { name: "remove_skill", description: "Retire une compétence par son nom.", schema: removeSkillSchema },
  { name: "set_skills_hide_level", description: "Affiche ou masque la barre de niveau des compétences.", schema: setSkillsHideLevelSchema },

  { name: "add_project", description: "Ajoute un projet à la section Projets.", schema: addProjectSchema },
  { name: "update_project", description: "Modifie un projet existant (identifié par son nom actuel).", schema: updateProjectSchema },
  { name: "remove_project", description: "Retire un projet par son nom.", schema: removeProjectSchema },

  { name: "add_experience", description: "Ajoute une expérience à la section Expérience.", schema: addExperienceSchema },
  { name: "update_experience", description: "Modifie une expérience existante (identifiée par entreprise + poste actuels).", schema: updateExperienceSchema },
  { name: "remove_experience", description: "Retire une expérience par entreprise + poste.", schema: removeExperienceSchema },

  { name: "update_contact", description: "Met à jour l'email de contact public et/ou le message de la section Contact.", schema: updateContactSchema },
  { name: "add_contact_link", description: "Ajoute un lien à la section Contact.", schema: addContactLinkSchema },
  { name: "update_contact_link", description: "Modifie un lien existant (identifié par son libellé actuel).", schema: updateContactLinkSchema },
  { name: "remove_contact_link", description: "Retire un lien de contact par son libellé.", schema: removeContactLinkSchema },

  { name: "reorder_items", description: "Réordonne les items d'une liste (skills/projects/experience) par clé naturelle.", schema: reorderItemsSchema },

  { name: "add_widget", description: "Ajoute un widget (image, texte, citation, stats, bouton, séparateur, carrousel, liens) à une section.", schema: addWidgetSchema },
  { name: "update_widget", description: "Remplace le contenu d'un widget existant, identifié par son id.", schema: updateWidgetSchema },
  { name: "remove_widget", description: "Supprime un widget par son id (impossible sur le contenu natif — supprime la section entière pour ça).", schema: removeWidgetSchema },
  { name: "move_widget", description: "Déplace et/ou redimensionne un widget dans la grille (patch partiel x/y/w/h).", schema: moveWidgetSchema },
  { name: "move_widget_across_native", description: "Place un widget juste au-dessus ou en dessous du contenu natif de sa section, sans calcul de coordonnées.", schema: moveWidgetAcrossNativeSchema },
];

function toInputSchema(schema: z.ZodTypeAny): Anthropic.Tool.InputSchema {
  const json = zodToJsonSchema(schema, { $refStrategy: "none" }) as Record<string, unknown>;
  delete json.$schema;
  return json as Anthropic.Tool.InputSchema;
}

export const EDIT_TOOLS: Anthropic.Tool[] = TOOL_DEFS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: toInputSchema(t.schema),
}));

export const EDIT_TOOL_SCHEMAS: Record<string, z.ZodTypeAny> = Object.fromEntries(
  TOOL_DEFS.map((t) => [t.name, t.schema]),
);

export type EditToolName = (typeof TOOL_DEFS)[number]["name"];
