import { z } from "zod";
import { isSafeRichTextUrl } from "@/lib/portfolio/rich-text";

// Accepts a valid URL, an empty string, or null/undefined
const optionalUrl = z.string().optional().nullable().transform((v) => {
  if (!v || v.trim() === "") return undefined;
  return v;
}).pipe(z.string().url().optional());

// avatar_url spécifiquement : accepte aussi un chemin relatif (`/testimonials/x.png`,
// servi depuis /public) — utilisé par le seeding communauté (lib/seed/personas.ts).
// z.string().url() rejetterait ces valeurs légitimes, cassant toute sauvegarde
// ultérieure du portfolio dans l'éditeur (re-validation stricte à chaque PATCH).
const optionalAvatarUrl = z.string().optional().nullable().transform((v) => {
  if (!v || v.trim() === "") return undefined;
  return v;
}).pipe(z.string().refine((v) => isSafeRichTextUrl(v), "URL invalide").optional());

// ── Content blocks (widgets added inside sections) ────────────────────────────
// size : taille visuelle du widget, 1 (petit) à 5 (grand), 3 = normal — utilisé
// pour les dimensions physiques (image/carousel) ou en repli si fontSize absent.
const size = z.number().min(1).max(5).optional();
// fontSize/fontFamily : réglages typographiques explicites (style Word) pour les
// widgets à texte — remplacent le calcul par `size` quand ils sont définis.
const fontSize   = z.number().min(10).max(72).optional();
const fontFamily = z.string().optional();
// Alignement horizontal façon Word — texte/citation uniquement (les autres
// types n'ont pas de paragraphe libre à aligner).
const align = z.enum(["left", "center", "right"]).optional();
export const ContentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("image"),   url: z.string().default(""), caption: z.string().optional(), size }),
  z.object({ type: z.literal("text"),    content: z.string().default(""), style: z.enum(["normal", "lead"]).default("normal"), size, fontSize, fontFamily, align }),
  z.object({ type: z.literal("quote"),   text: z.string().default(""), author: z.string().optional(), size, fontSize, fontFamily, align }),
  z.object({ type: z.literal("stats"),   items: z.array(z.object({ label: z.string(), value: z.string() })).default([]), size, fontSize, fontFamily }),
  z.object({ type: z.literal("button"),  label: z.string().default("En savoir plus"), url: z.string().default("#"), variant: z.enum(["primary", "outline"]).default("primary"), size, fontSize, fontFamily }),
  z.object({ type: z.literal("divider"), size }),
  z.object({ type: z.literal("carousel"), images: z.array(z.object({ url: z.string().default(""), caption: z.string().optional(), description: z.string().max(500).optional(), linkUrl: optionalUrl })).default([]), size, fontSize, fontFamily, descriptionWidth: z.number().min(160).max(480).optional() }),
  z.object({ type: z.literal("links"), items: z.array(z.object({ label: z.string().default(""), url: z.string().default("") })).default([]), size, fontSize, fontFamily }),
  // Le contenu natif de la section (texte, compétences, projets…) placé dans la
  // grille comme n'importe quel widget — un seul par section, non supprimable.
  // fontFamily/fontSize s'appliquent à tout le bloc (aucun élément interne ne
  // fixe sa propre police, l'héritage CSS suffit à tout propager).
  z.object({ type: z.literal("section_content"), size, fontSize, fontFamily }),
  // Marqueur de position pour le titre de section (texte réel dans
  // section.section_title, pas ici) — un seul par section non-hero, non
  // supprimable, jamais ajoutable/modifiable via les outils d'édition IA
  // génériques (même traitement que section_content).
  z.object({ type: z.literal("section_title") }),
]);
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

// Each row holds 1 or 2 blocks displayed side-by-side
export const BlockRowSchema = z.object({
  id:      z.string().default(() => Math.random().toString(36).slice(2, 10)),
  columns: z.array(ContentBlockSchema).min(1).max(2),
});
export type BlockRow = z.infer<typeof BlockRowSchema>;

// ── Grille libre (bento) : 12 colonnes, unités entières ───────────────────────
export const GridItemSchema = z.object({
  id:    z.string().default(() => Math.random().toString(36).slice(2, 10)),
  block: ContentBlockSchema,
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1),
});
export type GridItem = z.infer<typeof GridItemSchema>;

// Widgets docked beside the section's native content (2-column layout).
// Legacy shape { block, side } is auto-migrated to { blocks: [block], side }.
export const ContentAsideSchema = z.preprocess(
  (v) => {
    if (v && typeof v === "object" && "block" in v && !("blocks" in v)) {
      const o = v as { block: unknown; side: unknown };
      return { blocks: [o.block], side: o.side };
    }
    return v;
  },
  z.object({
    blocks: z.array(ContentBlockSchema).min(1),
    side:   z.enum(["left", "right"]),
  })
);
export type ContentAside = z.infer<typeof ContentAsideSchema>;

const MetaSchema = z.object({
  name: z.string(),
  title: z.string(),
  tagline: z.string(),
  email: z.string().email(),
  github_url:    optionalUrl,
  instagram_url: optionalUrl,
  youtube_url:   optionalUrl,
  linkedin_url:  optionalUrl,
  twitter_url:   optionalUrl,
  avatar_url:    optionalAvatarUrl,
});

const ThemeSchema = z.object({
  primary_color:    z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  text_color:       z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent_color:     z.string().regex(/^#[0-9a-fA-F]{6}$/),
  font_heading: z.string(),
  font_body:    z.string(),
  style: z.enum(["dark-code", "minimal-gallery", "fullscreen-hero"]),
  hero_image_url:     optionalUrl,
  hero_images:        z.array(z.string()).optional(),
  hero_interval:      z.number().min(2).max(15).optional().default(5),
  // Jamais rempli par Claude (absent des instructions du prompt) — attaché
  // programmatiquement après validation quand la photo vient d'un appel
  // Unsplash réussi (voir lib/unsplash/fetch.ts), pour l'attribution requise
  // par les Unsplash API Guidelines.
  hero_image_credit: z.object({
    name: z.string(),
    profileUrl: z.string(),
    photoUrl: z.string(),
  }).optional(),
  overlay_opacity:    z.number().min(0).max(1).optional().default(0.8),
  theme_preset_id:    z.string().optional(),
  background_pattern: z.enum(["none", "lines", "dots", "grid", "crosshatch"]).optional().default("none"),
  widget_style:       z.enum(["strict", "soft", "glass"]).optional().default("strict"),
  // Effets visuels du portfolio public (n'affectent pas l'éditeur, où tout doit
  // rester visible/statique pour pouvoir cliquer et éditer sans surprise).
  smooth_scroll: z.boolean().optional().default(false), // nav/CTA : défilement fluide au lieu du saut instantané
  scroll_reveal: z.boolean().optional().default(false), // sections qui apparaissent en fondu au défilement
  scroll_reveal_intensity: z.number().min(0).max(100).optional().default(50), // amplitude du glissement de l'apparition (0 = fondu seul, 100 = glissement prononcé)
  hero_parallax: z.boolean().optional().default(false), // fond du hero qui défile plus lentement que le contenu
  // Ruban de lignes fines qui ondulent dans un coin du hero — jamais choisi
  // par Claude, purement manuel depuis l'éditeur (case à cocher dédiée dans
  // VisualEditor.tsx).
  hero_decoration: z.enum(["none", "waves"]).optional().default("none"),
});

const blocks        = z.array(BlockRowSchema).optional(); // legacy (lecture seule, migré vers grid)
const grid          = z.array(GridItemSchema).optional();
const content_aside = ContentAsideSchema.optional();
// Alignement du titre de section — par défaut à gauche, réglable pour que les
// sections restent visuellement cohérentes entre elles.
const title_align   = z.enum(["left", "center", "right"]).optional();

const HeroSectionSchema = z.object({
  type:          z.literal("hero"),
  section_title: z.string().optional(),
  title:         z.string().default(""),
  subtitle:      z.string().default(""),
  cta_text:      z.string().default("Voir mes projets"),
  cta_url:       z.string().default("#projects"),
  blocks,
  grid,
  content_aside,
});

const AboutSectionSchema = z.object({
  type:          z.literal("about"),
  section_title: z.string().optional(),
  title_align,
  content:       z.string().default(""),
  highlight:     z.string().optional().nullable(),
  blocks,
  grid,
  content_aside,
});

const SkillsSectionSchema = z.object({
  type:          z.literal("skills"),
  section_title: z.string().optional(),
  title_align,
  hide_level:    z.boolean().optional(),
  items: z.array(z.object({
    name:     z.string(),
    level:    z.number().min(1).max(5),
    category: z.string(),
  })),
  blocks,
  grid,
  content_aside,
});

const ProjectsSectionSchema = z.object({
  type:          z.literal("projects"),
  section_title: z.string().optional(),
  title_align,
  items: z.array(z.object({
    name:        z.string(),
    description: z.string(),
    tech_stack:  z.array(z.string()),
    github_url:  optionalUrl,
    live_url:    optionalUrl,
    stars:       z.number().optional().nullable(),
    image_url:   z.string().optional(),
  })),
  blocks,
  grid,
  content_aside,
});

const ExperienceSectionSchema = z.object({
  type:          z.literal("experience"),
  section_title: z.string().optional(),
  title_align,
  items: z.array(z.object({
    company:     z.string(),
    role:        z.string(),
    period:      z.string(),
    description: z.string(),
  })),
  blocks,
  grid,
  content_aside,
});

const ContactSectionSchema = z.object({
  type:          z.literal("contact"),
  section_title: z.string().optional(),
  title_align,
  email:         z.string().email().catch("contact@example.com"),
  message:       z.string().default(""),
  links: z.array(z.object({
    label: z.string().default(""),
    url:   z.string().default(""),
    icon:  z.string().default(""),
  })).default([]),
  blocks,
  grid,
  content_aside,
});

const SectionSchema = z.discriminatedUnion("type", [
  HeroSectionSchema,
  AboutSectionSchema,
  SkillsSectionSchema,
  ProjectsSectionSchema,
  ExperienceSectionSchema,
  ContactSectionSchema,
]);

export const PortfolioJSONSchema = z.object({
  meta:     MetaSchema,
  theme:    ThemeSchema,
  sections: z.array(SectionSchema).min(3).max(8),
});

export type ValidatedPortfolioJSON = z.infer<typeof PortfolioJSONSchema>;
