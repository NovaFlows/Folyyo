import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";

export interface RecentEdit {
  instruction: string;
  summary: string;
}

export interface ProfileContext {
  profileType: string;
  profileName: string;
  profileTitle: string;
}

const PROFILE_LABELS: Record<string, string> = {
  developer: "développeur / développeuse",
  artist: "artiste",
  fashion: "professionnel(le) de la mode",
  other: "créatif / créative",
};

// Prompt système allégé pour l'édition par outils (function calling) : le
// format de sortie (JSON, champs obligatoires, types) est désormais imposé
// structurellement par le schéma de chaque outil (lib/anthropic/edit-tools.ts),
// donc ce prompt ne porte plus que sur le jugement design et les conventions
// d'usage des outils — plus de section "format de réponse" à maintenir.
export function buildEditSystemPrompt(ctx?: ProfileContext, language: "fr" | "en" | "es" = "fr"): string {
  const profileLabel = ctx ? (PROFILE_LABELS[ctx.profileType] ?? "créatif / créative") : "professionnel(le)";
  const profileIntro = ctx
    ? `Ce portfolio appartient à **${ctx.profileName}**, ${profileLabel}${ctx.profileTitle ? ` (${ctx.profileTitle})` : ""}.`
    : "";
  const languageNote = language === "en"
    ? "Ce portfolio est rédigé en ANGLAIS : tout nouveau texte que tu écris (descriptions, accroches, titres…) doit être en anglais, même si cette instruction système est en français."
    : language === "es"
    ? "Ce portfolio est rédigé en ESPAGNOL : tout nouveau texte que tu écris (descriptions, accroches, titres…) doit être en espagnol, même si cette instruction système est en français."
    : "Ce portfolio est rédigé en français : tout nouveau texte que tu écris doit rester en français.";
  const languageWord = language === "en" ? "en anglais" : language === "es" ? "en espagnol" : "en français";

  return `Tu es un designer expert qui modifie un portfolio en appelant des outils. Tu penses toujours en termes de rendu visuel final : lisibilité, contraste, cohérence esthétique.
${profileIntro ? `\n${profileIntro}\n` : ""}
${languageNote}

Tu reçois l'état JSON actuel du portfolio (meta, theme, sections) en contexte, et une instruction en langage naturel. Applique l'instruction en appelant un ou plusieurs outils — n'en appelle jamais plus que nécessaire, mais n'hésite pas à en enchaîner plusieurs pour une instruction composée (ex: "ajoute un projet ET change la couleur d'accent" = deux appels).

CONVENTIONS D'IDENTIFICATION :
- Une section se cible par son "type" (about/skills/projects/experience/contact) — jamais par position.
- Le hero est fixe, toujours en première position : il n'existe qu'un seul hero, tu ne peux ni le supprimer ni le réordonner (aucun outil ne le permet).
- Une compétence/un projet/une expérience/un lien de contact se cible par son identité naturelle (le "name" exact, ou "company"+"role" pour une expérience, ou "label" pour un lien de contact) — recopie-la exactement telle qu'elle apparaît dans le JSON fourni.
- Un widget de grille se cible par son "id" exact, tel qu'il apparaît dans le JSON fourni (champ "id" de chaque item de la liste "grid" d'une section). Si tu viens d'en créer un dans ce même tour, réutilise l'id renvoyé par l'outil qui l'a créé.

IMAGES JOINTES : deux usages possibles selon l'instruction. (1) Analyser leur palette de couleurs ou leur ambiance pour l'appliquer au thème (couleurs, style) — c'est le cas par défaut si l'instruction ne précise pas. (2) Si l'instruction demande explicitement d'UTILISER l'image elle-même comme visuel (ex: "mets cette photo en fond", "utilise cette image pour ce widget"), le message utilisateur t'indique comment la référencer par une chaîne "attachment:N" à placer dans le champ URL approprié — jamais une URL inventée, et jamais de référence "attachment:N" si l'instruction ne demande qu'une analyse de palette/ambiance.

RÈGLES DE DESIGN :
- Quand tu changes background_color, précise toujours text_color dans le même appel à set_theme_colors pour garantir un bon contraste (fond clair → texte sombre, fond sombre → texte clair). Un filet de sécurité corrige automatiquement un contraste insuffisant si tu l'omets, mais un choix délibéré donne toujours un meilleur résultat.
- Style global / ambiance (ex: "minimaliste", "luxueux", "années 80", "zen japonais") → change cohéremment plusieurs leviers : couleurs, polices, motif de fond, style des widgets.
- Référence artistique (peinture, mouvement, style) → traduis en palette + motif + typographie qui l'évoquent. Sois audacieux sur les couleurs, discret sur le motif.
- Couleur précise demandée → change cette couleur (+ le contraste associé si besoin), ne touche pas aux polices ni au motif sauf si lié à la demande.
- Ne modifie jamais le nom ni l'email du compte — aucun outil ne le permet, ne cherche pas de contournement.
- N'invente jamais de contenu factuel (chiffres, expériences, projets) qui n'a pas été demandé ou fourni — pour du texte créatif (accroche, description), reste cohérent avec le profil.

Une fois tous les outils nécessaires appelés, termine TOUJOURS par une courte phrase (~10 mots, ${languageWord}) qui résume ce que tu as fait — c'est ce texte qui sera affiché à l'utilisateur. Si l'instruction ne nécessite aucun changement (question, demande hors-sujet, instruction déjà satisfaite), n'appelle aucun outil et explique-le brièvement dans ta réponse (${languageWord}).`;
}

// Toutes les images du portfolio (avatar, fond du hero, photos de projet, de
// carrousel…) sont stockées en data-URL base64 INLINE dans le JSON (pas
// d'upload R2, voir le commentaire dans app/api/portfolio/edit/route.ts) —
// sans ce nettoyage, chaque appel à Claude réenverrait intégralement TOUS ces
// octets en tokens de texte, même pour une instruction sans aucun rapport
// avec les images (ex: une simple animation de chiffres), gonflant le coût
// de façon spectaculaire (constaté : ~1$ pour une seule instruction refusée).
// Claude n'a jamais besoin de relire ces octets pour éditer — les outils
// prennent toujours une NOUVELLE valeur à poser (couleur, texte, nouvelle
// image via attachment:N…), jamais une copie d'une image déjà en place.
const DATA_URL_RE = /^data:image\/[a-zA-Z0-9+.-]+;base64,/;
const IMAGE_PLACEHOLDER = "(image déjà définie — laisse ce champ inchangé si l'instruction ne porte pas dessus)";

function stripImageData(value: unknown): unknown {
  if (typeof value === "string") {
    return DATA_URL_RE.test(value) ? IMAGE_PLACEHOLDER : value;
  }
  if (Array.isArray(value)) return value.map(stripImageData);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, stripImageData(v)]));
  }
  return value;
}

// Séparé en 2 blocs (au lieu d'une seule chaîne) pour la mise en cache
// (app/api/portfolio/edit/route.ts) : `contextBlock` (le JSON, souvent
// identique d'une instruction à l'autre côté du MÊME portfolio tant qu'aucune
// modification n'a été appliquée entre-temps) est marqué cache_control ;
// `instructionBlock` (historique + instruction, qui change à chaque appel)
// ne l'est jamais — le séparer permet à une DEUXIÈME instruction, envoyée
// dans les 5 minutes suivant la première sans que l'état ait changé (ex:
// une instruction refusée n'ayant rien modifié), de retrouver le JSON déjà
// en cache même si le texte de l'instruction, lui, diffère.
export function buildEditUserPrompt(
  siteJson: ValidatedPortfolioJSON,
  instruction: string,
  recentEdits?: RecentEdit[],
): { contextBlock: string; instructionBlock: string } {
  const historyBlock = recentEdits?.length
    ? `HISTORIQUE DES DERNIÈRES MODIFICATIONS (déjà appliquées) :
${recentEdits.map((e, i) => `${i + 1}. "${e.instruction}" → ${e.summary}`).join("\n")}
Ne les annule pas sauf si l'instruction le demande explicitement.

`
    : "";

  return {
    contextBlock: `JSON ACTUEL (contexte en lecture — utilise les outils pour le modifier, ne le renvoie pas) :
${JSON.stringify(stripImageData(siteJson), null, 2)}`,
    instructionBlock: `${historyBlock}INSTRUCTION : "${instruction}"`,
  };
}
