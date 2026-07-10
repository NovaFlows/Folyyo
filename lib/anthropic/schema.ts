import { z } from "zod";

// Accepts a valid URL, an empty string, or null/undefined
const optionalUrl = z.string().optional().nullable().transform((v) => {
  if (!v || v.trim() === "") return undefined;
  return v;
}).pipe(z.string().url().optional());

const MetaSchema = z.object({
  name: z.string(),
  title: z.string(),
  tagline: z.string(),
  email: z.string().email(),
  github_url:    optionalUrl,
  instagram_url: optionalUrl,
  linkedin_url:  optionalUrl,
  twitter_url:   optionalUrl,
  avatar_url:    optionalUrl,
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
  overlay_opacity:    z.number().min(0).max(1).optional().default(0.8),
  theme_preset_id:    z.string().optional(),
  background_pattern: z.enum(["none", "lines", "dots", "grid", "crosshatch"]).optional().default("none"),
});

const HeroSectionSchema = z.object({
  type:          z.literal("hero"),
  section_title: z.string().optional(),
  title:         z.string().default(""),
  subtitle:      z.string().default(""),
  cta_text:      z.string().default("Voir mes projets"),
  cta_url:       z.string().default("#projects"),
});

const AboutSectionSchema = z.object({
  type:          z.literal("about"),
  section_title: z.string().optional(),
  content:       z.string().default(""),
  highlight:     z.string().optional().nullable(),
});

const SkillsSectionSchema = z.object({
  type:          z.literal("skills"),
  section_title: z.string().optional(),
  hide_level:    z.boolean().optional(),
  items: z.array(z.object({
    name:     z.string(),
    level:    z.number().min(1).max(5),
    category: z.string(),
  })),
});

const ProjectsSectionSchema = z.object({
  type:          z.literal("projects"),
  section_title: z.string().optional(),
  items: z.array(z.object({
    name:        z.string(),
    description: z.string(),
    tech_stack:  z.array(z.string()),
    github_url:  optionalUrl,
    live_url:    optionalUrl,
    stars:       z.number().optional().nullable(),
    image_url:   z.string().optional(),
  })),
});

const ExperienceSectionSchema = z.object({
  type:          z.literal("experience"),
  section_title: z.string().optional(),
  items: z.array(z.object({
    company:     z.string(),
    role:        z.string(),
    period:      z.string(),
    description: z.string(),
  })),
});

const ContactSectionSchema = z.object({
  type:          z.literal("contact"),
  section_title: z.string().optional(),
  email:         z.string().email().catch("contact@example.com"),
  message:       z.string().default(""),
  links: z.array(z.object({
    label: z.string().default(""),
    url:   z.string().default(""),
    icon:  z.string().default(""),
  })).default([]),
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
