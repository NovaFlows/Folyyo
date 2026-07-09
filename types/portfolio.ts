// ─── Input data collected during onboarding ───────────────────────────────────

export interface DeveloperInputData {
  name: string;
  title: string;
  email: string;
  github_username?: string;
  instagram_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  cv_storage_path: string;
  cv_text?: string;
  github_data?: GitHubData;
}

export interface GitHubData {
  bio: string | null;
  avatar_url: string;
  followers: number;
  public_repos: number;
  repos: GitHubRepo[];
  top_languages: Record<string, number>;
}

export interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  fork: boolean;
}

// ─── Structured JSON produced by Claude ───────────────────────────────────────

export interface PortfolioJSON {
  meta: PortfolioMeta;
  theme: PortfolioTheme;
  sections: PortfolioSection[];
}

export interface PortfolioMeta {
  name: string;
  title: string;
  tagline: string;
  email: string;
  github_url?: string;
  instagram_url?: string;
  linkedin_url?: string;
  twitter_url?: string;
  avatar_url?: string;
}

export interface PortfolioTheme {
  primary_color: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
  style: "dark-code" | "minimal-gallery" | "fullscreen-hero";
}

export type PortfolioSection =
  | HeroSection
  | AboutSection
  | SkillsSection
  | ProjectsSection
  | ExperienceSection
  | ContactSection;

export interface HeroSection {
  type: "hero";
  title: string;
  subtitle: string;
  cta_text: string;
  cta_url: string;
}

export interface AboutSection {
  type: "about";
  content: string;
  highlight?: string;
}

export interface SkillsSection {
  type: "skills";
  items: { name: string; level: number; category: string }[];
}

export interface ProjectsSection {
  type: "projects";
  items: {
    name: string;
    description: string;
    tech_stack: string[];
    github_url?: string;
    live_url?: string;
    stars?: number;
  }[];
}

export interface ExperienceSection {
  type: "experience";
  items: {
    company: string;
    role: string;
    period: string;
    description: string;
  }[];
}

export interface ContactSection {
  type: "contact";
  email: string;
  message: string;
  links: { label: string; url: string; icon: string }[];
}

// ─── Generated source code (filename → content) ───────────────────────────────

export type SourceCode = Record<string, string>;
