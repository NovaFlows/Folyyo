import type { ValidatedPortfolioJSON, ContentBlock } from "@/lib/anthropic/schema";
import { gridUid, applyGrid, nativeContentH } from "@/lib/portfolio/grid";

type VSection = ValidatedPortfolioJSON["sections"][number];

// Contenu par défaut d'un widget fraîchement ajouté à une section — partagé
// entre l'éditeur manuel (bouton "+") et l'exécuteur d'outils IA (add_widget).
export function createDefaultBlock(type: ContentBlock["type"]): ContentBlock {
  switch (type) {
    case "image":   return { type: "image",   url: "", caption: "" };
    case "text":    return { type: "text",    content: "Nouveau paragraphe…", style: "normal" };
    case "quote":   return { type: "quote",   text: "Une phrase qui marque les esprits.", author: "" };
    case "stats":   return { type: "stats",   items: [{ value: "0", label: "Stat 1" }, { value: "0", label: "Stat 2" }, { value: "0", label: "Stat 3" }] };
    case "button":  return { type: "button",  label: "En savoir plus", url: "#", variant: "primary" };
    case "divider": return { type: "divider" };
    case "carousel": return { type: "carousel", images: [] };
    case "links":   return { type: "links", items: [{ label: "Mon site", url: "https://" }] };
    case "section_content": return { type: "section_content" };
  }
}

// Section par défaut fraîchement ajoutée (nom de section adapté au métier) —
// partagée entre l'éditeur manuel et l'exécuteur d'outils IA (add_section).
export function createDefaultSection(type: VSection["type"], profileType: string): VSection {
  const L: Record<string, Record<string, string>> = {
    musicien: { projects: "Discographie", experience: "Scène & Lives", skills: "Instruments & Outils" },
    artist:   { projects: "Œuvres",       experience: "Expositions",   skills: "Techniques" },
    fashion:  { projects: "Campagnes",    experience: "Agences & Collabs", skills: "Spécialités" },
  };
  const lbl = L[profileType] ?? {};
  const base = ((): VSection => {
    switch (type) {
      case "hero":       return { type: "hero", title: "", subtitle: "", cta_text: "Voir mon travail", cta_url: "#projects" };
      case "about":      return { type: "about", section_title: "À propos", content: "Présente-toi ici…", highlight: undefined };
      case "skills":     return { type: "skills", section_title: lbl.skills ?? "Compétences", hide_level: false, items: [{ name: "Nouvelle compétence", level: 3, category: "Général" }] };
      case "projects":   return { type: "projects", section_title: lbl.projects ?? "Projets", items: [{ name: "Nouveau projet", description: "Description", tech_stack: [], github_url: undefined, live_url: undefined, stars: null, image_url: "" }] };
      case "experience": return { type: "experience", section_title: lbl.experience ?? "Expérience", items: [{ company: "Entreprise", role: "Poste", period: "2024 – présent", description: "" }] };
      case "contact":    return { type: "contact", section_title: "Contact", email: "contact@example.com", message: "N'hésitez pas à me contacter !", links: [] };
    }
  })();
  // Toute section hors hero embarque son contenu natif comme item de grille
  if (type !== "hero") {
    return applyGrid(base, [{ id: gridUid(), block: { type: "section_content" }, x: 0, y: 0, w: 12, h: nativeContentH(base as { type: string; items?: unknown[] }) }]);
  }
  return base;
}
