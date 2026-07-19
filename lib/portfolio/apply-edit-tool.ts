import type { ValidatedPortfolioJSON, GridItem, ContentBlock } from "@/lib/anthropic/schema";
import { EDIT_TOOL_SCHEMAS } from "@/lib/anthropic/edit-tools";
import { gridUid, getGrid, applyGrid, resolveNativeOverlap, validateGridBounds, DEFAULT_SIZE, nextY } from "@/lib/portfolio/grid";
import { createDefaultSection } from "@/lib/portfolio/section-factory";

type VSection = ValidatedPortfolioJSON["sections"][number];

export interface DiffItem {
  label: string;
  oldValue: string;
  newValue: string;
  type: "color" | "text";
}

export class EditToolError extends Error {}

export interface ApplyResult {
  state: ValidatedPortfolioJSON;
  diff: DiffItem[];
  resultForClaude: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function eqName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function textDiff(label: string, oldValue: string, newValue: string): DiffItem[] {
  if (oldValue === newValue) return [];
  return [{ label, oldValue, newValue, type: "text" }];
}

function colorDiff(label: string, oldValue: string, newValue: string): DiffItem[] {
  if (oldValue.toLowerCase() === newValue.toLowerCase()) return [];
  return [{ label, oldValue, newValue, type: "color" }];
}

function requireAnyField(input: Record<string, unknown>, toolName: string): void {
  if (Object.values(input).every((v) => v === undefined)) {
    throw new EditToolError(`${toolName} : aucun champ fourni, rien à modifier.`);
  }
}

function findSectionIdx(state: ValidatedPortfolioJSON, type: string): number {
  const idx = state.sections.findIndex((s) => s.type === type);
  if (idx === -1) {
    throw new EditToolError(`Aucune section de type "${type}" n'existe actuellement. Utilise add_section pour la créer d'abord.`);
  }
  return idx;
}

function replaceSection(state: ValidatedPortfolioJSON, idx: number, next: VSection): ValidatedPortfolioJSON {
  const sections = state.sections.map((s, i) => (i === idx ? next : s)) as ValidatedPortfolioJSON["sections"];
  return { ...state, sections };
}

// Contraste WCAG (luminance relative) — filet de sécurité pour set_theme_colors :
// si background_color change sans text_color fourni, on garantit un contraste
// minimal plutôt que de laisser Claude oublier (reprend en code la règle du
// prompt d'origine, plus fiable qu'une instruction en prose).
function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255, g = parseInt(c.slice(2, 4), 16) / 255, b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a) + 0.05, l2 = luminance(b) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

// ── Thème ────────────────────────────────────────────────────────────────────

function applySetThemeColors(state: ValidatedPortfolioJSON, input: { background_color?: string; primary_color?: string; text_color?: string; accent_color?: string }): ApplyResult {
  requireAnyField(input, "set_theme_colors");
  const theme = { ...state.theme };
  const diff: DiffItem[] = [];
  if (input.primary_color) { diff.push(...colorDiff("Couleur principale", state.theme.primary_color, input.primary_color)); theme.primary_color = input.primary_color; }
  if (input.accent_color)  { diff.push(...colorDiff("Couleur d'accent", state.theme.accent_color, input.accent_color)); theme.accent_color = input.accent_color; }
  if (input.background_color) { diff.push(...colorDiff("Couleur de fond", state.theme.background_color, input.background_color)); theme.background_color = input.background_color; }
  if (input.text_color) {
    diff.push(...colorDiff("Couleur du texte", state.theme.text_color, input.text_color));
    theme.text_color = input.text_color;
  } else if (input.background_color && contrastRatio(theme.background_color, theme.text_color) < 4.5) {
    const fixed = luminance(theme.background_color) > 0.5 ? "#111111" : "#f5f5f5";
    diff.push(...colorDiff("Couleur du texte (contraste ajusté)", state.theme.text_color, fixed));
    theme.text_color = fixed;
  }
  return { state: { ...state, theme }, diff, resultForClaude: "OK" };
}

function applySetThemeTypography(state: ValidatedPortfolioJSON, input: { font_heading?: string; font_body?: string }): ApplyResult {
  requireAnyField(input, "set_theme_typography");
  const diff: DiffItem[] = [];
  const theme = { ...state.theme };
  if (input.font_heading) { diff.push(...textDiff("Police titre", state.theme.font_heading, input.font_heading)); theme.font_heading = input.font_heading; }
  if (input.font_body)    { diff.push(...textDiff("Police corps", state.theme.font_body, input.font_body)); theme.font_body = input.font_body; }
  return { state: { ...state, theme }, diff, resultForClaude: "OK" };
}

function applySetThemeStyle(state: ValidatedPortfolioJSON, input: { style?: string; background_pattern?: string; widget_style?: string }): ApplyResult {
  requireAnyField(input, "set_theme_style");
  const diff: DiffItem[] = [];
  const theme = { ...state.theme } as Record<string, unknown> & typeof state.theme;
  if (input.style) { diff.push(...textDiff("Style", state.theme.style, input.style)); theme.style = input.style as typeof state.theme.style; }
  if (input.background_pattern) { diff.push(...textDiff("Motif de fond", state.theme.background_pattern ?? "none", input.background_pattern)); theme.background_pattern = input.background_pattern as typeof state.theme.background_pattern; }
  if (input.widget_style) { diff.push(...textDiff("Style des widgets", (state.theme as { widget_style?: string }).widget_style ?? "strict", input.widget_style)); theme.widget_style = input.widget_style as typeof state.theme.widget_style; }
  return { state: { ...state, theme }, diff, resultForClaude: "OK" };
}

function applySetThemeEffects(state: ValidatedPortfolioJSON, input: { smooth_scroll?: boolean; scroll_reveal?: boolean; scroll_reveal_intensity?: number; hero_parallax?: boolean }): ApplyResult {
  requireAnyField(input, "set_theme_effects");
  const t = state.theme as Record<string, unknown>;
  const diff: DiffItem[] = [];
  const theme = { ...state.theme } as Record<string, unknown> & typeof state.theme;
  if (input.smooth_scroll !== undefined) { diff.push(...textDiff("Défilement fluide", String(t.smooth_scroll ?? false), String(input.smooth_scroll))); theme.smooth_scroll = input.smooth_scroll; }
  if (input.scroll_reveal !== undefined) { diff.push(...textDiff("Apparition au défilement", String(t.scroll_reveal ?? false), String(input.scroll_reveal))); theme.scroll_reveal = input.scroll_reveal; }
  if (input.scroll_reveal_intensity !== undefined) { diff.push(...textDiff("Intensité de l'apparition", String(t.scroll_reveal_intensity ?? 50), String(input.scroll_reveal_intensity))); theme.scroll_reveal_intensity = input.scroll_reveal_intensity; }
  if (input.hero_parallax !== undefined) { diff.push(...textDiff("Parallaxe sur le fond", String(t.hero_parallax ?? false), String(input.hero_parallax))); theme.hero_parallax = input.hero_parallax; }
  return { state: { ...state, theme }, diff, resultForClaude: "OK" };
}

function applySetHeroBackground(state: ValidatedPortfolioJSON, input: { hero_image_url?: string; hero_interval?: number; overlay_opacity?: number }): ApplyResult {
  requireAnyField(input, "set_hero_background");
  const diff: DiffItem[] = [];
  const theme = { ...state.theme };
  if (input.hero_image_url !== undefined) {
    diff.push(...textDiff("Photo de fond", state.theme.hero_image_url ? "Présente" : "Aucune", input.hero_image_url ? "Présente" : "Aucune"));
    theme.hero_image_url = input.hero_image_url || undefined;
  }
  if (input.hero_interval !== undefined) { diff.push(...textDiff("Intervalle diaporama", String(state.theme.hero_interval ?? 5), String(input.hero_interval))); theme.hero_interval = input.hero_interval; }
  if (input.overlay_opacity !== undefined) { diff.push(...textDiff("Opacité du voile", String(state.theme.overlay_opacity ?? 0.8), String(input.overlay_opacity))); theme.overlay_opacity = input.overlay_opacity; }
  return { state: { ...state, theme }, diff, resultForClaude: "OK" };
}

function applyAddHeroBackgroundImage(state: ValidatedPortfolioJSON, input: { url: string }): ApplyResult {
  const images = [...(state.theme.hero_images ?? []), input.url];
  const theme = { ...state.theme, hero_images: images, hero_image_url: undefined };
  return { state: { ...state, theme }, diff: [{ label: "Photo de fond", oldValue: "", newValue: "Ajoutée", type: "text" }], resultForClaude: `OK, galerie de ${images.length} image(s).` };
}

function applyRemoveHeroBackgroundImage(state: ValidatedPortfolioJSON, input: { index: number }): ApplyResult {
  const images = state.theme.hero_images ?? [];
  if (input.index < 0 || input.index >= images.length) {
    throw new EditToolError(`Index invalide : la galerie contient ${images.length} image(s) (index 0 à ${images.length - 1}).`);
  }
  const next = images.filter((_, i) => i !== input.index);
  const theme = { ...state.theme, hero_images: next };
  return { state: { ...state, theme }, diff: [{ label: "Photo de fond", oldValue: "Présente", newValue: next.length ? "Mise à jour" : "Supprimée", type: "text" }], resultForClaude: "OK" };
}

// ── Meta ─────────────────────────────────────────────────────────────────────

function applyUpdateMeta(state: ValidatedPortfolioJSON, input: Record<string, string | undefined>): ApplyResult {
  requireAnyField(input, "update_meta");
  const diff: DiffItem[] = [];
  const meta = { ...state.meta };
  if (input.title !== undefined)   { diff.push(...textDiff("Titre pro", state.meta.title, input.title)); meta.title = input.title; }
  if (input.tagline !== undefined) { diff.push(...textDiff("Accroche", state.meta.tagline, input.tagline)); meta.tagline = input.tagline; }
  if (input.github_url !== undefined)    meta.github_url = input.github_url || undefined;
  if (input.instagram_url !== undefined) meta.instagram_url = input.instagram_url || undefined;
  if (input.youtube_url !== undefined)   meta.youtube_url = input.youtube_url || undefined;
  if (input.linkedin_url !== undefined)  meta.linkedin_url = input.linkedin_url || undefined;
  if (input.twitter_url !== undefined)   meta.twitter_url = input.twitter_url || undefined;
  if (input.avatar_url !== undefined)    meta.avatar_url = input.avatar_url || undefined;
  return { state: { ...state, meta }, diff, resultForClaude: "OK" };
}

// ── Sections ─────────────────────────────────────────────────────────────────

function applyAddSection(state: ValidatedPortfolioJSON, input: { section_type: string; position?: number }, profileType: string): ApplyResult {
  if (state.sections.some((s) => s.type === input.section_type)) {
    throw new EditToolError(`Une section de type "${input.section_type}" existe déjà — un seul type de section à la fois.`);
  }
  const newSection = createDefaultSection(input.section_type as VSection["type"], profileType);
  const hero = state.sections.filter((s) => s.type === "hero");
  const rest = state.sections.filter((s) => s.type !== "hero");
  const at = input.position !== undefined ? Math.min(Math.max(input.position, 0), rest.length) : rest.length;
  const nextRest = [...rest.slice(0, at), newSection, ...rest.slice(at)];
  const sections = [...hero, ...nextRest] as ValidatedPortfolioJSON["sections"];
  return { state: { ...state, sections }, diff: [{ label: "Section ajoutée", oldValue: "", newValue: input.section_type, type: "text" }], resultForClaude: "OK" };
}

function applyRemoveSection(state: ValidatedPortfolioJSON, input: { section_type: string }): ApplyResult {
  if (state.sections.length <= 3) throw new EditToolError("Impossible de supprimer : il faut garder au moins 3 sections.");
  const idx = state.sections.findIndex((s) => s.type === input.section_type);
  if (idx === -1) throw new EditToolError(`Aucune section de type "${input.section_type}" à supprimer.`);
  const sections = state.sections.filter((_, i) => i !== idx) as ValidatedPortfolioJSON["sections"];
  return { state: { ...state, sections }, diff: [{ label: "Section supprimée", oldValue: input.section_type, newValue: "", type: "text" }], resultForClaude: "OK" };
}

function applyReorderSections(state: ValidatedPortfolioJSON, input: { order: string[] }): ApplyResult {
  const hero = state.sections.filter((s) => s.type === "hero");
  const rest = state.sections.filter((s) => s.type !== "hero");
  const current = rest.map((s) => s.type).slice().sort();
  const wanted = [...input.order].slice().sort();
  if (JSON.stringify(current) !== JSON.stringify(wanted)) {
    throw new EditToolError(`L'ordre fourni (${input.order.join(", ")}) ne correspond pas exactement aux sections existantes (${rest.map((s) => s.type).join(", ")}).`);
  }
  const byType = new Map<string, VSection>(rest.map((s) => [s.type, s]));
  const reordered = input.order.map((t) => byType.get(t)!);
  const sections = [...hero, ...reordered] as ValidatedPortfolioJSON["sections"];
  return { state: { ...state, sections }, diff: [{ label: "Sections réordonnées", oldValue: "", newValue: input.order.join(" → "), type: "text" }], resultForClaude: "OK" };
}

function applySetSectionTitle(state: ValidatedPortfolioJSON, input: { section_type: string; section_title: string }): ApplyResult {
  const idx = findSectionIdx(state, input.section_type);
  const old = (state.sections[idx] as { section_title?: string }).section_title ?? "";
  const next = { ...state.sections[idx], section_title: input.section_title } as VSection;
  return { state: replaceSection(state, idx, next), diff: textDiff("Titre de section", old, input.section_title), resultForClaude: "OK" };
}

function applySetSectionTitleAlign(state: ValidatedPortfolioJSON, input: { section_type: string; title_align: "left" | "center" | "right" }): ApplyResult {
  const idx = findSectionIdx(state, input.section_type);
  const old = (state.sections[idx] as { title_align?: string }).title_align ?? "left";
  const next = { ...state.sections[idx], title_align: input.title_align } as VSection;
  return { state: replaceSection(state, idx, next), diff: textDiff("Alignement du titre", old, input.title_align), resultForClaude: "OK" };
}

// ── Contenu natif : hero / about ────────────────────────────────────────────

function applyUpdateHero(state: ValidatedPortfolioJSON, input: { title?: string; subtitle?: string; cta_text?: string; cta_url?: string }): ApplyResult {
  requireAnyField(input, "update_hero");
  const idx = state.sections.findIndex((s) => s.type === "hero");
  if (idx === -1) throw new EditToolError("Section hero introuvable.");
  const hero = state.sections[idx] as Extract<VSection, { type: "hero" }>;
  const diff: DiffItem[] = [];
  const next = { ...hero };
  if (input.title !== undefined)    { diff.push(...textDiff("Titre du hero", hero.title, input.title)); next.title = input.title; }
  if (input.subtitle !== undefined) { diff.push(...textDiff("Sous-titre", hero.subtitle, input.subtitle)); next.subtitle = input.subtitle; }
  if (input.cta_text !== undefined) { diff.push(...textDiff("Texte du bouton", hero.cta_text, input.cta_text)); next.cta_text = input.cta_text; }
  if (input.cta_url !== undefined) next.cta_url = input.cta_url;
  return { state: replaceSection(state, idx, next), diff, resultForClaude: "OK" };
}

function applyUpdateAbout(state: ValidatedPortfolioJSON, input: { content?: string; highlight?: string }): ApplyResult {
  requireAnyField(input, "update_about");
  const idx = findSectionIdx(state, "about");
  const about = state.sections[idx] as Extract<VSection, { type: "about" }>;
  const diff: DiffItem[] = [];
  const next = { ...about };
  if (input.content !== undefined) { diff.push(...textDiff("Texte de présentation", about.content, input.content)); next.content = input.content; }
  if (input.highlight !== undefined) { next.highlight = input.highlight || undefined; }
  return { state: replaceSection(state, idx, next), diff, resultForClaude: "OK" };
}

// ── Compétences ──────────────────────────────────────────────────────────────

type SkillsSection = Extract<VSection, { type: "skills" }>;

function applyAddSkill(state: ValidatedPortfolioJSON, input: { name: string; level: number; category: string }): ApplyResult {
  const idx = findSectionIdx(state, "skills");
  const sec = state.sections[idx] as SkillsSection;
  if (sec.items.some((it) => eqName(it.name, input.name))) throw new EditToolError(`Une compétence "${input.name}" existe déjà — utilise update_skill pour la modifier.`);
  const items = [...sec.items, { name: input.name, level: input.level, category: input.category }];
  return { state: replaceSection(state, idx, { ...sec, items }), diff: [{ label: "Compétence ajoutée", oldValue: "", newValue: input.name, type: "text" }], resultForClaude: "OK" };
}

function applyUpdateSkill(state: ValidatedPortfolioJSON, input: { name: string; new_name?: string; level?: number; category?: string }): ApplyResult {
  requireAnyField({ new_name: input.new_name, level: input.level, category: input.category }, "update_skill");
  const idx = findSectionIdx(state, "skills");
  const sec = state.sections[idx] as SkillsSection;
  const i = sec.items.findIndex((it) => eqName(it.name, input.name));
  if (i === -1) throw new EditToolError(`Aucune compétence nommée "${input.name}". Compétences actuelles : ${sec.items.map((x) => x.name).join(", ") || "aucune"}.`);
  const old = sec.items[i];
  const updated = { name: input.new_name ?? old.name, level: input.level ?? old.level, category: input.category ?? old.category };
  const items = sec.items.map((it, ix) => (ix === i ? updated : it));
  const diff: DiffItem[] = [];
  if (input.new_name && input.new_name !== old.name) diff.push({ label: "Compétence renommée", oldValue: old.name, newValue: input.new_name, type: "text" });
  if (input.level !== undefined && input.level !== old.level) diff.push({ label: `Niveau de ${old.name}`, oldValue: String(old.level), newValue: String(input.level), type: "text" });
  if (input.category && input.category !== old.category) diff.push({ label: `Catégorie de ${old.name}`, oldValue: old.category, newValue: input.category, type: "text" });
  return { state: replaceSection(state, idx, { ...sec, items }), diff, resultForClaude: "OK" };
}

function applyRemoveSkill(state: ValidatedPortfolioJSON, input: { name: string }): ApplyResult {
  const idx = findSectionIdx(state, "skills");
  const sec = state.sections[idx] as SkillsSection;
  const i = sec.items.findIndex((it) => eqName(it.name, input.name));
  if (i === -1) throw new EditToolError(`Aucune compétence nommée "${input.name}".`);
  const items = sec.items.filter((_, ix) => ix !== i);
  return { state: replaceSection(state, idx, { ...sec, items }), diff: [{ label: "Compétence supprimée", oldValue: sec.items[i].name, newValue: "", type: "text" }], resultForClaude: "OK" };
}

function applySetSkillsHideLevel(state: ValidatedPortfolioJSON, input: { hide_level: boolean }): ApplyResult {
  const idx = findSectionIdx(state, "skills");
  const sec = state.sections[idx] as SkillsSection;
  const label = (v?: boolean) => (v ? "Masqué" : "Affiché");
  return { state: replaceSection(state, idx, { ...sec, hide_level: input.hide_level }), diff: [{ label: "Niveau des compétences", oldValue: label(sec.hide_level), newValue: label(input.hide_level), type: "text" }], resultForClaude: "OK" };
}

// ── Projets ──────────────────────────────────────────────────────────────────

type ProjectsSection = Extract<VSection, { type: "projects" }>;

function applyAddProject(state: ValidatedPortfolioJSON, input: { name: string; description: string; tech_stack: string[]; github_url?: string; live_url?: string; image_url?: string }): ApplyResult {
  const idx = findSectionIdx(state, "projects");
  const sec = state.sections[idx] as ProjectsSection;
  if (sec.items.some((it) => eqName(it.name, input.name))) throw new EditToolError(`Un projet "${input.name}" existe déjà — utilise update_project pour le modifier.`);
  const items = [...sec.items, { name: input.name, description: input.description, tech_stack: input.tech_stack, github_url: input.github_url, live_url: input.live_url, image_url: input.image_url, stars: null }];
  return { state: replaceSection(state, idx, { ...sec, items }), diff: [{ label: "Projet ajouté", oldValue: "", newValue: input.name, type: "text" }], resultForClaude: "OK" };
}

function applyUpdateProject(state: ValidatedPortfolioJSON, input: { name: string; new_name?: string; description?: string; tech_stack?: string[]; github_url?: string; live_url?: string; image_url?: string }): ApplyResult {
  requireAnyField({ new_name: input.new_name, description: input.description, tech_stack: input.tech_stack, github_url: input.github_url, live_url: input.live_url, image_url: input.image_url }, "update_project");
  const idx = findSectionIdx(state, "projects");
  const sec = state.sections[idx] as ProjectsSection;
  const i = sec.items.findIndex((it) => eqName(it.name, input.name));
  if (i === -1) throw new EditToolError(`Aucun projet nommé "${input.name}". Projets actuels : ${sec.items.map((x) => x.name).join(", ") || "aucun"}.`);
  const old = sec.items[i];
  const updated = {
    ...old,
    name: input.new_name ?? old.name,
    description: input.description ?? old.description,
    tech_stack: input.tech_stack ?? old.tech_stack,
    github_url: input.github_url ?? old.github_url,
    live_url: input.live_url ?? old.live_url,
    image_url: input.image_url ?? old.image_url,
  };
  const items = sec.items.map((it, ix) => (ix === i ? updated : it));
  const diff: DiffItem[] = [];
  if (input.new_name && input.new_name !== old.name) diff.push({ label: "Projet renommé", oldValue: old.name, newValue: input.new_name, type: "text" });
  if (input.description && input.description !== old.description) diff.push({ label: `Description de ${old.name}`, oldValue: old.description, newValue: input.description, type: "text" });
  return { state: replaceSection(state, idx, { ...sec, items }), diff, resultForClaude: "OK" };
}

function applyRemoveProject(state: ValidatedPortfolioJSON, input: { name: string }): ApplyResult {
  const idx = findSectionIdx(state, "projects");
  const sec = state.sections[idx] as ProjectsSection;
  const i = sec.items.findIndex((it) => eqName(it.name, input.name));
  if (i === -1) throw new EditToolError(`Aucun projet nommé "${input.name}".`);
  const items = sec.items.filter((_, ix) => ix !== i);
  return { state: replaceSection(state, idx, { ...sec, items }), diff: [{ label: "Projet supprimé", oldValue: sec.items[i].name, newValue: "", type: "text" }], resultForClaude: "OK" };
}

// ── Expérience ───────────────────────────────────────────────────────────────

type ExperienceSection = Extract<VSection, { type: "experience" }>;

function applyAddExperience(state: ValidatedPortfolioJSON, input: { company: string; role: string; period: string; description: string }): ApplyResult {
  const idx = findSectionIdx(state, "experience");
  const sec = state.sections[idx] as ExperienceSection;
  if (sec.items.some((it) => eqName(it.company, input.company) && eqName(it.role, input.role))) {
    throw new EditToolError(`Une expérience "${input.role}" chez "${input.company}" existe déjà — utilise update_experience pour la modifier.`);
  }
  const items = [...sec.items, { company: input.company, role: input.role, period: input.period, description: input.description }];
  return { state: replaceSection(state, idx, { ...sec, items }), diff: [{ label: "Expérience ajoutée", oldValue: "", newValue: `${input.role} — ${input.company}`, type: "text" }], resultForClaude: "OK" };
}

function applyUpdateExperience(state: ValidatedPortfolioJSON, input: { company: string; role: string; new_company?: string; new_role?: string; period?: string; description?: string }): ApplyResult {
  requireAnyField({ new_company: input.new_company, new_role: input.new_role, period: input.period, description: input.description }, "update_experience");
  const idx = findSectionIdx(state, "experience");
  const sec = state.sections[idx] as ExperienceSection;
  const i = sec.items.findIndex((it) => eqName(it.company, input.company) && eqName(it.role, input.role));
  if (i === -1) throw new EditToolError(`Aucune expérience "${input.role}" chez "${input.company}". Expériences actuelles : ${sec.items.map((x) => `${x.role} — ${x.company}`).join(", ") || "aucune"}.`);
  const old = sec.items[i];
  const updated = { company: input.new_company ?? old.company, role: input.new_role ?? old.role, period: input.period ?? old.period, description: input.description ?? old.description };
  const items = sec.items.map((it, ix) => (ix === i ? updated : it));
  return { state: replaceSection(state, idx, { ...sec, items }), diff: [{ label: "Expérience modifiée", oldValue: `${old.role} — ${old.company}`, newValue: `${updated.role} — ${updated.company}`, type: "text" }], resultForClaude: "OK" };
}

function applyRemoveExperience(state: ValidatedPortfolioJSON, input: { company: string; role: string }): ApplyResult {
  const idx = findSectionIdx(state, "experience");
  const sec = state.sections[idx] as ExperienceSection;
  const i = sec.items.findIndex((it) => eqName(it.company, input.company) && eqName(it.role, input.role));
  if (i === -1) throw new EditToolError(`Aucune expérience "${input.role}" chez "${input.company}".`);
  const items = sec.items.filter((_, ix) => ix !== i);
  return { state: replaceSection(state, idx, { ...sec, items }), diff: [{ label: "Expérience supprimée", oldValue: `${sec.items[i].role} — ${sec.items[i].company}`, newValue: "", type: "text" }], resultForClaude: "OK" };
}

// ── Contact ──────────────────────────────────────────────────────────────────

type ContactSection = Extract<VSection, { type: "contact" }>;

function applyUpdateContact(state: ValidatedPortfolioJSON, input: { email?: string; message?: string }): ApplyResult {
  requireAnyField(input, "update_contact");
  const idx = findSectionIdx(state, "contact");
  const sec = state.sections[idx] as ContactSection;
  const diff: DiffItem[] = [];
  const next = { ...sec };
  if (input.email !== undefined)   { diff.push(...textDiff("Email de contact", sec.email, input.email)); next.email = input.email; }
  if (input.message !== undefined) { diff.push(...textDiff("Message de contact", sec.message, input.message)); next.message = input.message; }
  return { state: replaceSection(state, idx, next), diff, resultForClaude: "OK" };
}

function applyAddContactLink(state: ValidatedPortfolioJSON, input: { label: string; url: string; icon: string }): ApplyResult {
  const idx = findSectionIdx(state, "contact");
  const sec = state.sections[idx] as ContactSection;
  if (sec.links.some((l) => eqName(l.label, input.label))) throw new EditToolError(`Un lien "${input.label}" existe déjà — utilise update_contact_link pour le modifier.`);
  const links = [...sec.links, { label: input.label, url: input.url, icon: input.icon }];
  return { state: replaceSection(state, idx, { ...sec, links }), diff: [{ label: "Lien ajouté", oldValue: "", newValue: input.label, type: "text" }], resultForClaude: "OK" };
}

function applyUpdateContactLink(state: ValidatedPortfolioJSON, input: { label: string; new_label?: string; url?: string; icon?: string }): ApplyResult {
  requireAnyField({ new_label: input.new_label, url: input.url, icon: input.icon }, "update_contact_link");
  const idx = findSectionIdx(state, "contact");
  const sec = state.sections[idx] as ContactSection;
  const i = sec.links.findIndex((l) => eqName(l.label, input.label));
  if (i === -1) throw new EditToolError(`Aucun lien nommé "${input.label}".`);
  const old = sec.links[i];
  const updated = { label: input.new_label ?? old.label, url: input.url ?? old.url, icon: input.icon ?? old.icon };
  const links = sec.links.map((l, ix) => (ix === i ? updated : l));
  const diff: DiffItem[] = [];
  if (input.url && input.url !== old.url) diff.push({ label: `Lien ${old.label}`, oldValue: old.url, newValue: input.url, type: "text" });
  return { state: replaceSection(state, idx, { ...sec, links }), diff, resultForClaude: "OK" };
}

function applyRemoveContactLink(state: ValidatedPortfolioJSON, input: { label: string }): ApplyResult {
  const idx = findSectionIdx(state, "contact");
  const sec = state.sections[idx] as ContactSection;
  const i = sec.links.findIndex((l) => eqName(l.label, input.label));
  if (i === -1) throw new EditToolError(`Aucun lien nommé "${input.label}".`);
  const links = sec.links.filter((_, ix) => ix !== i);
  return { state: replaceSection(state, idx, { ...sec, links }), diff: [{ label: "Lien supprimé", oldValue: sec.links[i].label, newValue: "", type: "text" }], resultForClaude: "OK" };
}

// ── Réordonnancement générique de listes ────────────────────────────────────

function applyReorderItems(state: ValidatedPortfolioJSON, input: { section_type: "skills" | "projects" | "experience"; order: string[] }): ApplyResult {
  const idx = findSectionIdx(state, input.section_type);
  const sec = state.sections[idx] as unknown as { items: Array<{ name?: string; company?: string; role?: string }> };
  const keyOf = (it: { name?: string; company?: string; role?: string }) =>
    input.section_type === "experience" ? `${it.company} — ${it.role}` : (it.name ?? "");
  const currentKeys = sec.items.map(keyOf);
  const norm = (s: string) => s.trim().toLowerCase();
  if (JSON.stringify(input.order.map(norm).slice().sort()) !== JSON.stringify(currentKeys.map(norm).slice().sort())) {
    throw new EditToolError(`L'ordre fourni ne correspond pas exactement aux items actuels (${currentKeys.join(", ")}).`);
  }
  const byKey = new Map(sec.items.map((it) => [norm(keyOf(it)), it]));
  const items = input.order.map((k) => byKey.get(norm(k)));
  return { state: replaceSection(state, idx, { ...(state.sections[idx] as VSection), items } as VSection), diff: [{ label: "Ordre modifié", oldValue: "", newValue: input.order.join(" → "), type: "text" }], resultForClaude: "OK" };
}

// ── Widgets de grille ────────────────────────────────────────────────────────

function findWidget(state: ValidatedPortfolioJSON, sectionType: string, widgetId: string): { sectionIdx: number; section: VSection; grid: GridItem[]; item: GridItem } {
  const sectionIdx = findSectionIdx(state, sectionType);
  const section = state.sections[sectionIdx];
  const grid = getGrid(section);
  const item = grid.find((it) => it.id === widgetId);
  if (!item) {
    throw new EditToolError(`Aucun widget avec l'id "${widgetId}" dans la section "${sectionType}". Vérifie le champ "id" dans le JSON fourni.`);
  }
  return { sectionIdx, section, grid, item };
}

function applyAddWidget(state: ValidatedPortfolioJSON, input: { section_type: string; block: ContentBlock; x?: number; y?: number; w?: number; h?: number }): ApplyResult {
  const idx = findSectionIdx(state, input.section_type);
  const section = state.sections[idx];
  const grid = getGrid(section);
  const def = DEFAULT_SIZE[input.block.type];
  const item: GridItem = {
    id: gridUid(),
    block: input.block,
    x: input.x ?? 0,
    y: input.y ?? nextY(grid),
    w: input.w ?? def.w,
    h: input.h ?? def.h,
  };
  validateGridBounds(item, input.block.type);
  const nextGrid = resolveNativeOverlap([...grid, item]);
  const nextSection = applyGrid(section, nextGrid);
  return { state: replaceSection(state, idx, nextSection), diff: [{ label: "Widget ajouté", oldValue: "", newValue: `${input.block.type} dans ${input.section_type}`, type: "text" }], resultForClaude: `OK, id="${item.id}".` };
}

function applyUpdateWidget(state: ValidatedPortfolioJSON, input: { section_type: string; widget_id: string; block: ContentBlock }): ApplyResult {
  const { sectionIdx, section, grid, item } = findWidget(state, input.section_type, input.widget_id);
  if (item.block.type === "section_content") throw new EditToolError("Ce widget est le contenu natif de la section, non modifiable via update_widget.");
  const nextGrid = grid.map((it) => (it.id === input.widget_id ? { ...it, block: input.block } : it));
  const nextSection = applyGrid(section, nextGrid);
  return { state: replaceSection(state, sectionIdx, nextSection), diff: [{ label: "Widget modifié", oldValue: item.block.type, newValue: input.block.type, type: "text" }], resultForClaude: "OK" };
}

function applyRemoveWidget(state: ValidatedPortfolioJSON, input: { section_type: string; widget_id: string }): ApplyResult {
  const { sectionIdx, section, grid, item } = findWidget(state, input.section_type, input.widget_id);
  if (item.block.type === "section_content") throw new EditToolError("Impossible de supprimer le contenu natif d'une section avec remove_widget — utilise remove_section pour supprimer la section entière.");
  const nextGrid = grid.filter((it) => it.id !== input.widget_id);
  const nextSection = applyGrid(section, nextGrid);
  return { state: replaceSection(state, sectionIdx, nextSection), diff: [{ label: "Widget supprimé", oldValue: item.block.type, newValue: "", type: "text" }], resultForClaude: "OK" };
}

function applyMoveWidget(state: ValidatedPortfolioJSON, input: { section_type: string; widget_id: string; x?: number; y?: number; w?: number; h?: number }): ApplyResult {
  const { sectionIdx, section, grid, item } = findWidget(state, input.section_type, input.widget_id);
  const moved: GridItem = { ...item, x: input.x ?? item.x, y: input.y ?? item.y, w: input.w ?? item.w, h: input.h ?? item.h };
  validateGridBounds(moved, moved.block.type);
  const nextGrid = resolveNativeOverlap(grid.map((it) => (it.id === input.widget_id ? moved : it)));
  const nextSection = applyGrid(section, nextGrid);
  return { state: replaceSection(state, sectionIdx, nextSection), diff: [{ label: "Widget déplacé", oldValue: "", newValue: `position (${moved.x},${moved.y}) taille ${moved.w}×${moved.h}`, type: "text" }], resultForClaude: "OK" };
}

function applyMoveWidgetAcrossNative(state: ValidatedPortfolioJSON, input: { section_type: string; widget_id: string; direction: "above" | "below" }): ApplyResult {
  const { sectionIdx, section, grid, item } = findWidget(state, input.section_type, input.widget_id);
  const native = grid.find((it) => it.block.type === "section_content");
  if (!native) throw new EditToolError("Cette section n'a pas de contenu natif.");
  if (native.id === item.id) throw new EditToolError("Impossible de déplacer le contenu natif par rapport à lui-même.");
  let nextGrid: GridItem[];
  if (input.direction === "below") {
    nextGrid = grid.map((it) => (it.id === item.id ? { ...it, y: native.y + native.h } : it));
  } else {
    nextGrid = grid.map((it) => {
      if (it.id === item.id) return { ...it, y: native.y };
      if (it.id === native.id) return { ...it, y: native.y + item.h };
      return it;
    });
  }
  const nextSection = applyGrid(section, nextGrid);
  const newValue = input.direction === "below" ? "Sous le contenu principal" : "Au-dessus du contenu principal";
  return { state: replaceSection(state, sectionIdx, nextSection), diff: [{ label: "Widget déplacé", oldValue: "", newValue, type: "text" }], resultForClaude: "OK" };
}

// ── Dispatch ─────────────────────────────────────────────────────────────────

export function applyEditTool(state: ValidatedPortfolioJSON, name: string, rawInput: unknown, profileType: string): ApplyResult {
  const schema = EDIT_TOOL_SCHEMAS[name];
  if (!schema) throw new EditToolError(`Outil inconnu : "${name}".`);
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".") || "(racine)"}: ${i.message}`).join("; ");
    throw new EditToolError(`Arguments invalides pour ${name} : ${msg}`);
  }
  const input = parsed.data as never;

  switch (name) {
    case "set_theme_colors": return applySetThemeColors(state, input);
    case "set_theme_typography": return applySetThemeTypography(state, input);
    case "set_theme_style": return applySetThemeStyle(state, input);
    case "set_theme_effects": return applySetThemeEffects(state, input);
    case "set_hero_background": return applySetHeroBackground(state, input);
    case "add_hero_background_image": return applyAddHeroBackgroundImage(state, input);
    case "remove_hero_background_image": return applyRemoveHeroBackgroundImage(state, input);

    case "update_meta": return applyUpdateMeta(state, input);

    case "add_section": return applyAddSection(state, input, profileType);
    case "remove_section": return applyRemoveSection(state, input);
    case "reorder_sections": return applyReorderSections(state, input);
    case "set_section_title": return applySetSectionTitle(state, input);
    case "set_section_title_align": return applySetSectionTitleAlign(state, input);

    case "update_hero": return applyUpdateHero(state, input);
    case "update_about": return applyUpdateAbout(state, input);

    case "add_skill": return applyAddSkill(state, input);
    case "update_skill": return applyUpdateSkill(state, input);
    case "remove_skill": return applyRemoveSkill(state, input);
    case "set_skills_hide_level": return applySetSkillsHideLevel(state, input);

    case "add_project": return applyAddProject(state, input);
    case "update_project": return applyUpdateProject(state, input);
    case "remove_project": return applyRemoveProject(state, input);

    case "add_experience": return applyAddExperience(state, input);
    case "update_experience": return applyUpdateExperience(state, input);
    case "remove_experience": return applyRemoveExperience(state, input);

    case "update_contact": return applyUpdateContact(state, input);
    case "add_contact_link": return applyAddContactLink(state, input);
    case "update_contact_link": return applyUpdateContactLink(state, input);
    case "remove_contact_link": return applyRemoveContactLink(state, input);

    case "reorder_items": return applyReorderItems(state, input);

    case "add_widget": return applyAddWidget(state, input);
    case "update_widget": return applyUpdateWidget(state, input);
    case "remove_widget": return applyRemoveWidget(state, input);
    case "move_widget": return applyMoveWidget(state, input);
    case "move_widget_across_native": return applyMoveWidgetAcrossNative(state, input);

    default:
      throw new EditToolError(`Outil non implémenté : "${name}".`);
  }
}
