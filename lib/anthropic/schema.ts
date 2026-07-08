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
  github_url:   optionalUrl,
  linkedin_url: optionalUrl,
  twitter_url:  optionalUrl,
  avatar_url:   optionalUrl,
});

const ThemeSchema = z.object({
  primary_color:    z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  text_color:       z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent_color:     z.string().regex(/^#[0-9a-fA-F]{6}$/),
  font_heading: z.string(),
  font_body:    z.string(),
  style: z.enum(["dark-code", "minimal-gallery", "fullscreen-hero"]),
  hero_image_url:   optionalUrl,
  overlay_opacity:  z.number().min(0).max(1).optional().default(0.8),
  theme_preset_id:  z.string().optional(),
});

const HeroSectionSchema = z.object({
  type:     z.literal("hero"),
  title:    z.string(),
  subtitle: z.string(),
  cta_text: z.string(),
  cta_url:  z.string(),
});

const AboutSectionSchema = z.object({
  type:      z.literal("about"),
  content:   z.string(),
  highlight: z.string().optional().nullable(),
});

const SkillsSectionSchema = z.object({
  type: z.literal("skills"),
  items: z.array(z.object({
    name:     z.string(),
    level:    z.number().min(1).max(5),
    category: z.string(),
  })),
});

const ProjectsSectionSchema = z.object({
  type: z.literal("projects"),
  items: z.array(z.object({
    name:        z.string(),
    description: z.string(),
    tech_stack:  z.array(z.string()),
    github_url:  optionalUrl,
    live_url:    optionalUrl,
    stars:       z.number().optional().nullable(),
  })),
});

const ExperienceSectionSchema = z.object({
  type: z.literal("experience"),
  items: z.array(z.object({
    company:     z.string(),
    role:        z.string(),
    period:      z.string(),
    description: z.string(),
  })),
});

const ContactSectionSchema = z.object({
  type:    z.literal("contact"),
  email:   z.string().email(),
  message: z.string(),
  links: z.array(z.object({
    label: z.string(),
    url:   z.string().url(),
    icon:  z.string(),
  })),
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
