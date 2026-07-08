export interface ThemePreset {
  id: string;
  name: string;
  profile_types: string[];
  primary_color: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
  style: "dark-code" | "minimal-gallery" | "fullscreen-hero";
  hero_image_url: string | null;
  overlay_opacity: number; // 0-1, over hero image
}

export const THEME_PRESETS: ThemePreset[] = [
  // ── Developer ─────────────────────────────────────────────────────────────
  {
    id: "terminal-dark",
    name: "Terminal Dark",
    profile_types: ["developer"],
    primary_color: "#00ff88",
    background_color: "#0a0e1a",
    text_color: "#e2e8f0",
    accent_color: "#7c3aed",
    font_heading: "Fira Code",
    font_body: "Inter",
    style: "dark-code",
    hero_image_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1920&q=80",
    overlay_opacity: 0.82,
  },
  {
    id: "ocean-night",
    name: "Ocean Night",
    profile_types: ["developer"],
    primary_color: "#38bdf8",
    background_color: "#0c1a2e",
    text_color: "#e0f2fe",
    accent_color: "#818cf8",
    font_heading: "Inter",
    font_body: "Inter",
    style: "dark-code",
    hero_image_url: "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?auto=format&fit=crop&w=1920&q=80",
    overlay_opacity: 0.85,
  },
  {
    id: "synthwave",
    name: "Synthwave",
    profile_types: ["developer"],
    primary_color: "#f0abfc",
    background_color: "#0f0a1e",
    text_color: "#f5f3ff",
    accent_color: "#34d399",
    font_heading: "Space Grotesk",
    font_body: "Inter",
    style: "dark-code",
    hero_image_url: "https://images.unsplash.com/photo-1534972195531-d236914979bd?auto=format&fit=crop&w=1920&q=80",
    overlay_opacity: 0.80,
  },
  {
    id: "minimal-pro",
    name: "Minimal Pro",
    profile_types: ["developer", "other"],
    primary_color: "#2563eb",
    background_color: "#ffffff",
    text_color: "#0f172a",
    accent_color: "#7c3aed",
    font_heading: "Inter",
    font_body: "Inter",
    style: "minimal-gallery",
    hero_image_url: null,
    overlay_opacity: 0,
  },
  {
    id: "slate-clean",
    name: "Slate Clean",
    profile_types: ["developer", "other"],
    primary_color: "#6366f1",
    background_color: "#0f172a",
    text_color: "#f1f5f9",
    accent_color: "#22d3ee",
    font_heading: "Space Grotesk",
    font_body: "Inter",
    style: "dark-code",
    hero_image_url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80",
    overlay_opacity: 0.88,
  },

  // ── Artist ────────────────────────────────────────────────────────────────
  {
    id: "dark-atelier",
    name: "Dark Atelier",
    profile_types: ["artist"],
    primary_color: "#d4a853",
    background_color: "#0e0c0a",
    text_color: "#f5f0e8",
    accent_color: "#c9a96e",
    font_heading: "Playfair Display",
    font_body: "Inter",
    style: "fullscreen-hero",
    hero_image_url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1920&q=80",
    overlay_opacity: 0.78,
  },
  {
    id: "gallery-blanc",
    name: "Gallery Blanc",
    profile_types: ["artist"],
    primary_color: "#1a1a1a",
    background_color: "#f9f9f7",
    text_color: "#1a1a1a",
    accent_color: "#c9a96e",
    font_heading: "Playfair Display",
    font_body: "Inter",
    style: "minimal-gallery",
    hero_image_url: null,
    overlay_opacity: 0,
  },
  {
    id: "editorial-bold",
    name: "Éditorial Bold",
    profile_types: ["artist"],
    primary_color: "#e11d48",
    background_color: "#111111",
    text_color: "#fafafa",
    accent_color: "#fbbf24",
    font_heading: "Playfair Display",
    font_body: "Inter",
    style: "fullscreen-hero",
    hero_image_url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1920&q=80",
    overlay_opacity: 0.75,
  },

  // ── Fashion ───────────────────────────────────────────────────────────────
  {
    id: "editorial-luxe",
    name: "Éditorial Luxe",
    profile_types: ["fashion"],
    primary_color: "#c9a96e",
    background_color: "#faf8f5",
    text_color: "#1c1917",
    accent_color: "#78716c",
    font_heading: "Playfair Display",
    font_body: "Inter",
    style: "minimal-gallery",
    hero_image_url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80",
    overlay_opacity: 0.15,
  },
  {
    id: "noir-mode",
    name: "Noir Mode",
    profile_types: ["fashion"],
    primary_color: "#ffffff",
    background_color: "#080808",
    text_color: "#f5f5f5",
    accent_color: "#c9a96e",
    font_heading: "Playfair Display",
    font_body: "Inter",
    style: "fullscreen-hero",
    hero_image_url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1920&q=80",
    overlay_opacity: 0.65,
  },
  {
    id: "rose-editorial",
    name: "Rose Éditorial",
    profile_types: ["fashion"],
    primary_color: "#be185d",
    background_color: "#fdf2f8",
    text_color: "#1e1b4b",
    accent_color: "#9d174d",
    font_heading: "Playfair Display",
    font_body: "Inter",
    style: "minimal-gallery",
    hero_image_url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1920&q=80",
    overlay_opacity: 0.12,
  },

  // ── Other / Polyvalent ────────────────────────────────────────────────────
  {
    id: "forest-deep",
    name: "Forest Deep",
    profile_types: ["other"],
    primary_color: "#4ade80",
    background_color: "#052e16",
    text_color: "#f0fdf4",
    accent_color: "#86efac",
    font_heading: "Space Grotesk",
    font_body: "Inter",
    style: "dark-code",
    hero_image_url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80",
    overlay_opacity: 0.80,
  },
  {
    id: "warm-editorial",
    name: "Warm Éditorial",
    profile_types: ["other"],
    primary_color: "#c9a96e",
    background_color: "#1c1917",
    text_color: "#f5f0e8",
    accent_color: "#d97706",
    font_heading: "Playfair Display",
    font_body: "Inter",
    style: "fullscreen-hero",
    hero_image_url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1920&q=80",
    overlay_opacity: 0.82,
  },
];

export function getPresetsForProfile(profileType: string): ThemePreset[] {
  return THEME_PRESETS.filter((p) => p.profile_types.includes(profileType));
}

export function getPresetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}

export function buildThemePresetsBlock(profileType: string): string {
  const presets = getPresetsForProfile(profileType);
  return presets
    .map((p) => `  - "${p.id}" → ${p.name} (bg: ${p.background_color}, texte: ${p.text_color}, primaire: ${p.primary_color})`)
    .join("\n");
}
