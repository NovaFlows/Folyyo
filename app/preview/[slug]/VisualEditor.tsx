"use client";

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import RGL from "react-grid-layout";
import type { ValidatedPortfolioJSON, ContentBlock, GridItem } from "@/lib/anthropic/schema";
import type { GitHubRepo, YouTubeVideo } from "@/types/portfolio";
import { THEME_PRESETS } from "@/lib/portfolio/themes";
import { BlockContent, WidgetFrame, nativeZoom, WIDGET_FONT_OPTIONS, WIDGET_FONT_SIZES, DESCRIPTION_WIDTH_STEPS, type WidgetStyle } from "@/components/portfolio/blocks";
import RichText from "@/components/portfolio/RichText";
import { RichTextField, RichTextArea } from "@/components/portfolio/RichTextEditable";
import { stripRichTags, richOrUndefined } from "@/lib/portfolio/rich-text";
import { GRID_COLS, GRID_ROW_HEIGHT, GRID_MARGIN, DEFAULT_SIZE, MIN_SIZE, gridUid, sortGridItems, nextY, migrateToGrid, nativeContentH, getGrid, applyGrid, resolveNativeOverlap } from "@/lib/portfolio/grid";
import { createDefaultBlock, createDefaultSection } from "@/lib/portfolio/section-factory";
import HeroBackgroundCarousel from "@/components/portfolio/HeroBackgroundCarousel";
import { useLocale } from "@/lib/i18n/useLocale";
import { getDictionary } from "@/lib/i18n/dictionaries";
import LanguageToggle from "@/components/i18n/LanguageToggle";

const ReactGridLayout = RGL.WidthProvider(RGL);
type Layout = RGL.Layout;

type VSection = ValidatedPortfolioJSON["sections"][number];
type VMeta    = ValidatedPortfolioJSON["meta"];
type VTheme   = ValidatedPortfolioJSON["theme"];
type ProjectItem = Extract<VSection, { type: "projects" }>["items"][number];

// Item retourné par /api/community/featured — portfolios vedettes utilisables
// comme style de départ depuis l'éditeur (cf. panneau "Communauté" du thème).
type CommunityItem = {
  id: string; profileType: string; slug: string|null;
  name: string; title: string; tagline: string;
  theme: { primary_color:string; background_color:string; accent_color:string; font_heading:string };
};

const MAX_HISTORY = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────
// Blanc ou noir selon la luminosité du fond, pour que le "+" reste lisible
// quel que soit le thème (fond clair ou sombre).
function contrastColor(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255;
  return lum > 0.55 ? "#000000" : "#ffffff";
}

// Extrait le handle YouTube ("@xyz" ou URL complète) → "xyz"
function extractYoutubeHandle(raw: string): string {
  raw = raw.trim();
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0]?.startsWith("@")) return parts[0].slice(1);
    if (parts[0]) return parts[0].replace(/^@/, "");
  } catch { /* pas une URL */ }
  return raw.replace(/^@/, "").replace(/\s/g, "");
}
// Extrait le nom d'utilisateur GitHub depuis une URL de profil
function extractGithubUsername(raw: string): string {
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return url.pathname.split("/").filter(Boolean)[0] ?? raw;
  } catch { return raw.replace(/^@/, "").trim(); }
}

function getSectionSuggestions(profileType: string) {
  const ov: Record<string, Partial<Record<string, { label: string; desc: string }>>> = {
    musicien: { projects: { label: "Discographie", desc: "Tes sons, albums et clips" }, experience: { label: "Scène & Lives", desc: "Tes concerts et performances" } },
    artist:   { projects: { label: "Œuvres",       desc: "Ta galerie de créations" },  experience: { label: "Expositions",   desc: "Tes expositions et collabs" } },
    fashion:  { projects: { label: "Campagnes",    desc: "Tes shootings et éditos" },  experience: { label: "Agences",       desc: "Tes collabs et agences" } },
  };
  const o = ov[profileType] ?? {};
  return [
    { type: "about"      as const, icon: "✍", label: o.about?.label ?? "À propos",       desc: o.about?.desc ?? "Présente-toi en quelques phrases" },
    { type: "skills"     as const, icon: "⚡", label: o.skills?.label ?? "Compétences",   desc: "Tes compétences ou services" },
    { type: "projects"   as const, icon: "◈",  label: o.projects?.label ?? "Projets",     desc: o.projects?.desc ?? "Tes créations et réalisations" },
    { type: "experience" as const, icon: "◷",  label: o.experience?.label ?? "Expérience",desc: o.experience?.desc ?? "Ton parcours" },
    { type: "contact"    as const, icon: "✉",  label: "Contact",                           desc: "Comment te joindre" },
  ];
}

// ── Idées de contenu par type de widget, adaptées au métier ────────────────────
function getStatsSuggestions(profileType: string): string[] {
  const map: Record<string, string[]> = {
    musicien:    ["Vues YouTube", "Abonnés", "Titres sortis", "Featurings", "Concerts joués", "Streams Spotify"],
    artist:      ["Œuvres créées", "Expositions", "Années de pratique", "Pièces vendues"],
    fashion:     ["Défilés", "Campagnes", "Marques collaborées", "Followers"],
    photographe: ["Shootings réalisés", "Clients", "Publications", "Années d'expérience"],
    developer:   ["Projets livrés", "Repos GitHub", "Années d'expérience", "Stars GitHub"],
  };
  return map[profileType] ?? ["Projets réalisés", "Clients satisfaits", "Années d'expérience", "Récompenses"];
}
function getImageCaptionSuggestions(profileType: string): string[] {
  const map: Record<string, string[]> = {
    musicien:    ["Session studio", "Backstage", "Pochette du single", "Live au concert"],
    artist:      ["Huile sur toile, 2024", "Détail de l'œuvre", "Vue de l'exposition", "Dans l'atelier"],
    fashion:     ["Look du jour", "Backstage défilé", "Collection capsule"],
    photographe: ["Séance portrait", "Reportage", "Argentique", "En studio"],
  };
  return map[profileType] ?? ["Note personnelle", "Coulisses", "En cours de réalisation"];
}
function getQuoteSuggestions(profileType: string): string[] {
  const map: Record<string, string[]> = {
    musicien: ["La musique est mon langage universel.", "Chaque son raconte une histoire vécue."],
    artist:   ["L'art est la seule vérité qui ne ment jamais.", "Je peins ce que les mots ne peuvent dire."],
    fashion:  ["Le style, c'est dire qui on est sans un mot.", "La mode passe, le style reste."],
  };
  return map[profileType] ?? ["La qualité n'est jamais un accident.", "Le détail fait la différence."];
}
function getTextSuggestions(profileType: string): string[] {
  const map: Record<string, string[]> = {
    musicien: ["Mon parcours a commencé par…", "Ce qui m'inspire au quotidien, c'est…"],
    artist:   ["Ma démarche artistique explore…", "Je travaille principalement avec…"],
  };
  return map[profileType] ?? ["Ce qui me motive au quotidien, c'est…", "Mon approche se résume en trois mots…"];
}
function getButtonSuggestions(profileType: string, meta: VMeta): { label:string; url:string }[] {
  const social: { label:string; url:string }[] = [];
  if (meta.youtube_url)   social.push({ label:"Voir sur YouTube",    url:meta.youtube_url });
  if (meta.instagram_url) social.push({ label:"Suivre sur Instagram",url:meta.instagram_url });
  if (meta.github_url)    social.push({ label:"Voir sur GitHub",     url:meta.github_url });
  const map: Record<string, string[]> = {
    musicien:    ["Écouter sur Spotify", "Réserver une date"],
    artist:      ["Voir la galerie", "Commander une œuvre"],
    fashion:     ["Voir le book", "Réserver une séance"],
    photographe: ["Voir le book", "Réserver une séance"],
  };
  const generic = (map[profileType] ?? ["Me contacter", "En savoir plus"]).map(label=>({label,url:"#"}));
  return [...social, ...generic];
}

// ── Illustrations décoratives (dessin au trait) pour le widget image ──────────
// Alternative à une vraie photo : une petite icône illustrée, colorée avec le
// thème du portfolio, encodée directement en data URI SVG.
type Illustration = { id:string; label:string; icon:(pri:string)=>string };
function svgIcon(inner: string): (pri: string) => string {
  return (pri: string) => `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${inner.replace(/\{pri\}/g, pri)}</svg>`
  )}`;
}
const ILLUSTRATION_SETS: Record<string, Illustration[]> = {
  musicien: [
    { id:"note", label:"Note", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <circle cx="40" cy="68" r="9" fill="none" stroke="{pri}" stroke-width="4"/>
      <line x1="49" y1="68" x2="49" y2="26" stroke="{pri}" stroke-width="4" stroke-linecap="round"/>
      <path d="M49 26 Q66 30 62 46" fill="none" stroke="{pri}" stroke-width="4" stroke-linecap="round"/>
    `) },
    { id:"vinyl", label:"Vinyle", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <circle cx="50" cy="50" r="34" fill="none" stroke="{pri}" stroke-width="3"/>
      <circle cx="50" cy="50" r="22" fill="none" stroke="{pri}" stroke-width="2" opacity="0.55"/>
      <circle cx="50" cy="50" r="6" fill="{pri}"/>
    `) },
    { id:"mic", label:"Micro", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <rect x="38" y="18" width="24" height="38" rx="12" fill="none" stroke="{pri}" stroke-width="4"/>
      <path d="M28 46 a22 22 0 0 0 44 0" fill="none" stroke="{pri}" stroke-width="4" stroke-linecap="round"/>
      <line x1="50" y1="68" x2="50" y2="82" stroke="{pri}" stroke-width="4" stroke-linecap="round"/>
      <line x1="36" y1="82" x2="64" y2="82" stroke="{pri}" stroke-width="4" stroke-linecap="round"/>
    `) },
    { id:"headphones", label:"Casque", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <path d="M22 55 v-8 a28 28 0 0 1 56 0 v8" fill="none" stroke="{pri}" stroke-width="4" stroke-linecap="round"/>
      <rect x="16" y="52" width="14" height="22" rx="6" fill="none" stroke="{pri}" stroke-width="4"/>
      <rect x="70" y="52" width="14" height="22" rx="6" fill="none" stroke="{pri}" stroke-width="4"/>
    `) },
  ],
  artist: [
    { id:"palette", label:"Palette", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <path d="M50 15 C26 15 12 31 12 48 C12 60 21 63 28 63 C32 63 33 60 31 57 C28 53 32 49 37 49 H47 C62 49 70 40 70 29 C70 21 62 15 50 15 Z" fill="none" stroke="{pri}" stroke-width="3.5" stroke-linejoin="round"/>
      <circle cx="38" cy="38" r="3.5" fill="{pri}"/>
      <circle cx="52" cy="30" r="3.5" fill="{pri}"/>
      <circle cx="64" cy="38" r="3.5" fill="{pri}"/>
    `) },
    { id:"brush", label:"Pinceau", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <path d="M66 20 L80 34 L46 68 L34 70 L36 58 Z" fill="none" stroke="{pri}" stroke-width="4" stroke-linejoin="round"/>
      <line x1="34" y1="70" x2="24" y2="80" stroke="{pri}" stroke-width="4" stroke-linecap="round"/>
    `) },
    { id:"frame", label:"Tableau", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <rect x="24" y="24" width="52" height="42" rx="2" fill="none" stroke="{pri}" stroke-width="4"/>
      <path d="M24 58 L40 42 L52 54 L64 40 L76 58" fill="none" stroke="{pri}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="60" cy="34" r="4" fill="{pri}"/>
      <line x1="50" y1="66" x2="50" y2="78" stroke="{pri}" stroke-width="3"/>
      <line x1="38" y1="78" x2="62" y2="78" stroke="{pri}" stroke-width="3"/>
    `) },
  ],
  fashion: [
    { id:"hanger", label:"Cintre", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <circle cx="50" cy="26" r="5" fill="none" stroke="{pri}" stroke-width="3"/>
      <path d="M50 31 L50 38 C50 38 20 45 20 62 C20 68 30 70 50 70 C70 70 80 68 80 62 C80 45 50 38 50 38" fill="none" stroke="{pri}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    `) },
    { id:"dress", label:"Silhouette", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <path d="M42 20 H58 L62 34 L76 80 H24 L38 34 Z" fill="none" stroke="{pri}" stroke-width="4" stroke-linejoin="round"/>
    `) },
  ],
  photographe: [
    { id:"camera", label:"Appareil photo", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <rect x="18" y="34" width="64" height="42" rx="6" fill="none" stroke="{pri}" stroke-width="4"/>
      <rect x="38" y="24" width="24" height="12" rx="3" fill="none" stroke="{pri}" stroke-width="4"/>
      <circle cx="50" cy="56" r="14" fill="none" stroke="{pri}" stroke-width="4"/>
      <circle cx="50" cy="56" r="5" fill="{pri}"/>
    `) },
    { id:"aperture", label:"Diaphragme", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <circle cx="50" cy="50" r="32" fill="none" stroke="{pri}" stroke-width="3"/>
      <path d="M50 22 L58 42 L38 42 Z" fill="{pri}" opacity="0.85"/>
      <path d="M78 50 L58 58 L58 38 Z" fill="{pri}" opacity="0.85"/>
      <path d="M50 78 L42 58 L62 58 Z" fill="{pri}" opacity="0.85"/>
      <path d="M22 50 L42 42 L42 62 Z" fill="{pri}" opacity="0.85"/>
    `) },
  ],
  default: [
    { id:"star", label:"Étoile", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <path d="M50 20 L58 42 L82 42 L62 56 L70 78 L50 64 L30 78 L38 56 L18 42 L42 42 Z" fill="none" stroke="{pri}" stroke-width="3.5" stroke-linejoin="round"/>
    `) },
    { id:"heart", label:"Cœur", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <path d="M50 78 C20 58 20 34 38 28 C46 25 50 34 50 34 C50 34 54 25 62 28 C80 34 80 58 50 78 Z" fill="none" stroke="{pri}" stroke-width="4" stroke-linejoin="round"/>
    `) },
    { id:"sparkle", label:"Étincelle", icon:svgIcon(`
      <circle cx="50" cy="50" r="47" fill="{pri}0f"/>
      <path d="M50 18 C52 38 54 46 78 50 C54 54 52 62 50 82 C48 62 46 54 22 50 C46 46 48 38 50 18 Z" fill="none" stroke="{pri}" stroke-width="3.5" stroke-linejoin="round"/>
    `) },
  ],
};
function getIllustrations(profileType: string): Illustration[] {
  return [...(ILLUSTRATION_SETS[profileType] ?? []), ...ILLUSTRATION_SETS.default];
}

const BLOCK_SUGGESTIONS: { type: ContentBlock["type"]; icon: string }[] = [
  { type: "image",    icon: "🖼" },
  { type: "carousel", icon: "▤"  },
  { type: "text",     icon: "¶"  },
  { type: "quote",    icon: "❝"  },
  { type: "stats",    icon: "◫"  },
  { type: "button",   icon: "⇒"  },
  { type: "links",    icon: "🔗" },
  { type: "divider",  icon: "─"  },
];
type BlockLabels = ReturnType<typeof getDictionary>["editor"]["blockLabels"];
function blockLabel(t: BlockLabels, type: ContentBlock["type"]): string {
  return (t as Record<string, string>)[type] ?? type;
}
type SectionLabels = ReturnType<typeof getDictionary>["editor"]["sectionLabels"];
function sectionLabel(t: SectionLabels, type: string): string {
  return (t as Record<string, string>)[type] ?? type;
}

// ── Main editor ───────────────────────────────────────────────────────────────
export default function VisualEditor({ initialData, portfolioId, slug, profileType }: {
  initialData: ValidatedPortfolioJSON; portfolioId: string; slug: string; profileType: string;
}) {
  const router = useRouter();
  const [locale, setLocale] = useLocale();
  const t = getDictionary(locale).editor;
  // L'éditeur (glisser/redimensionner des widgets) est pensé pour souris + grand
  // écran. Sous 768px on affiche un écran de repli plutôt que le panneau latéral
  // fixe de 320px qui écrase l'aperçu sur un téléphone.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  // Migration en mémoire : blocks (lignes legacy) → grid, persisté à la 1ère sauvegarde
  const [data, setData]               = useState<ValidatedPortfolioJSON>(() => migrateToGrid(initialData));
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  // Id de l'item de grille sélectionné (null = panneau section/thème)
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  // Sélection multiple (glisser-rectangle façon bureau Windows) — 2+ ids d'une
  // même section ; toujours vidée dès qu'une action de sélection simple a
  // lieu ailleurs (voir tous les setSelectedBlock ci-dessous), pour ne jamais
  // laisser un surlignage de groupe périmé.
  const [multiSelectedIds, setMultiSelectedIds] = useState<string[]>([]);
  const [saveStatus, setSaveStatus]   = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [canUndo, setCanUndo]         = useState(false);
  const historyRef                    = useRef<ValidatedPortfolioJSON[]>([]);

  // Section drag (reorder sections)
  const [secDragSrc, setSecDragSrc]   = useState<number | null>(null);
  const [secDragOver, setSecDragOver] = useState<number | null>(null);
  // Auto-scroll pendant le drag d'une section : le panneau preview a sa
  // propre zone de scroll (pas la fenêtre), donc le navigateur ne scrolle
  // jamais tout seul en approchant du bord pendant un drag natif HTML5.
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const dragYRef          = useRef<number | null>(null);
  useEffect(() => {
    if (secDragSrc === null) return;
    const EDGE = 90, MAX_SPEED = 18;
    let raf = 0;
    const tick = () => {
      const el = previewScrollRef.current;
      const y = dragYRef.current;
      if (el && y !== null) {
        const rect = el.getBoundingClientRect();
        if (y < rect.top + EDGE) {
          el.scrollTop -= MAX_SPEED * (1 - Math.max(0, y - rect.top) / EDGE);
        } else if (y > rect.bottom - EDGE) {
          el.scrollTop += MAX_SPEED * (1 - Math.max(0, rect.bottom - y) / EDGE);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [secDragSrc]);
  // Vrai pendant un drag/resize react-grid-layout : le click de fin de geste
  // remonte au wrapper de section (ancêtre commun mousedown/mouseup) et ne doit
  // pas sélectionner la section.
  const gridDragRef = useRef(false);

  const snapshot = (d: ValidatedPortfolioJSON) => {
    historyRef.current = [...historyRef.current.slice(-MAX_HISTORY + 1), d];
    setCanUndo(true);
  };
  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setData(prev); setSaveStatus("idle"); setCanUndo(historyRef.current.length > 0);
  }, []);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); } };
    window.addEventListener("keydown", fn); return () => window.removeEventListener("keydown", fn);
  }, [undo]);

  // ── Core mutator ──────────────────────────────────────────────────────────
  const mutate = (fn: (prev: ValidatedPortfolioJSON) => ValidatedPortfolioJSON) => {
    setData(d => { snapshot(d); return fn(d); }); setSaveStatus("idle");
  };
  const updateMeta    = (u: Partial<VMeta>)  => mutate(d => ({ ...d, meta: { ...d.meta, ...u } }));
  const updateTheme   = (u: Partial<VTheme>) => mutate(d => ({ ...d, theme: { ...d.theme, ...u } }));
  const updateSection = (idx: number, s: VSection) => mutate(d => { const ss=[...d.sections]; ss[idx]=s; return {...d,sections:ss}; });
  const removeSection = (idx: number) => { mutate(d => ({ ...d, sections: d.sections.filter((_,i)=>i!==idx) })); setSelectedIdx(null); setSelectedBlock(null); setMultiSelectedIds([]); };
  const reorderSection = (from: number, to: number) => { if(from===to) return; mutate(d => { const ss=[...d.sections]; const [m]=ss.splice(from,1); ss.splice(to,0,m); return {...d,sections:ss}; }); setSelectedIdx(to); };
  const addSection = (type: VSection["type"], at: number) => {
    const s = createDefaultSection(type, profileType);
    mutate(d => { const ss=[...d.sections]; ss.splice(at,0,s); return {...d,sections:ss}; });
    setSelectedIdx(at); setSelectedBlock(null); setMultiSelectedIds([]);
  };

  // ── Grille libre : mutateurs ──────────────────────────────────────────────
  const mutateGrid = (sectionIdx: number, fn: (items: GridItem[]) => GridItem[]) => {
    mutate(d => {
      const ss = [...d.sections];
      ss[sectionIdx] = applyGrid(ss[sectionIdx], fn(getGrid(ss[sectionIdx])));
      return { ...d, sections: ss };
    });
  };

  const addBlock = (sectionIdx: number, type: ContentBlock["type"]) => {
    const id = gridUid();
    mutateGrid(sectionIdx, items => [
      ...items,
      { id, block: createDefaultBlock(type), x: 0, y: nextY(items), ...DEFAULT_SIZE[type] },
    ]);
    setSelectedIdx(sectionIdx);
    setSelectedBlock(id);
    setMultiSelectedIds([]);
  };

  // Un carrousel dont une photo reçoit une description bascule cette photo en
  // 2 colonnes (voir Carousel.tsx) — pour que l'image garde exactement sa
  // taille/son cadrage d'avant (au lieu d'être écrasée pour faire de la place
  // au texte), le widget s'élargit lui-même de quelques colonnes dès qu'AU
  // MOINS une photo du carrousel a une description, et reprend sa largeur
  // d'origine si elles sont toutes vidées. L'élargissement suit aussi
  // "Largeur de la description" (descriptionWidth) : plus le cadre texte
  // choisi est large, plus le widget grandit en proportion — approximatif
  // (on ne connaît pas le colWidth réel hors resize), mais un widget un peu
  // trop large vaut mieux qu'une image recadrée. Peut chevaucher un widget
  // voisin (pas de réagencement automatique) — à réajuster manuellement.
  const CAROUSEL_DESCRIPTION_BASE_COLS = 5; // pour la largeur par défaut (240px)
  const CAROUSEL_DESCRIPTION_BASE_PX = 240;
  const carouselExtraCols = (b: ContentBlock): number => {
    if (b.type !== "carousel" || !b.images.some(img => img.description)) return 0;
    const width = b.descriptionWidth ?? CAROUSEL_DESCRIPTION_BASE_PX;
    return Math.max(3, Math.round(CAROUSEL_DESCRIPTION_BASE_COLS * (width / CAROUSEL_DESCRIPTION_BASE_PX)));
  };
  const updateBlock = (sectionIdx: number, id: string, block: ContentBlock) => {
    mutateGrid(sectionIdx, items => items.map(it => {
      if (it.id !== id) return it;
      if (it.block.type === "carousel" && block.type === "carousel") {
        const delta = carouselExtraCols(block) - carouselExtraCols(it.block);
        if (delta !== 0) {
          const w = Math.max(MIN_SIZE.carousel.w, Math.min(GRID_COLS - it.x, it.w + delta));
          return { ...it, block, w };
        }
      }
      return { ...it, block };
    }));
  };

  // Contenu natif ET titre : un seul par section, jamais supprimables ni
  // duplicables (que ce soit un par un ou en groupe) — seule la suppression
  // de la section entière les retire.
  const isProtected = (b: ContentBlock) => b.type === "section_content" || b.type === "section_title";

  const removeBlock = (sectionIdx: number, id: string) => {
    mutateGrid(sectionIdx, items => items.filter(it => it.id !== id || isProtected(it.block)));
    setSelectedBlock(null);
    setMultiSelectedIds([]);
  };

  // ── Sélection multiple (glisser-rectangle) : actions groupées ──────────────
  const removeBlocks = (sectionIdx: number, ids: string[]) => {
    const idSet = new Set(ids);
    mutateGrid(sectionIdx, items => items.filter(it => !idSet.has(it.id) || isProtected(it.block)));
    setMultiSelectedIds([]);
  };
  const duplicateBlocks = (sectionIdx: number, ids: string[]) => {
    // idMap généré AVANT le setState : la fonction passée à mutateGrid doit
    // rester pure (React StrictMode l'appelle 2x en dev) — impossible si elle
    // générait elle-même de nouveaux ids à chaque appel.
    const idMap = new Map(ids.map(id => [id, gridUid()]));
    mutateGrid(sectionIdx, items => [
      ...items,
      ...items
        .filter(it => idMap.has(it.id) && !isProtected(it.block))
        .map(it => ({ ...it, id: idMap.get(it.id)!, y: it.y + it.h })),
    ]);
    setMultiSelectedIds(Array.from(idMap.values()));
  };
  const nudgeBlocks = (sectionIdx: number, ids: string[], dx: number, dy: number) => {
    const idSet = new Set(ids);
    mutateGrid(sectionIdx, items => items.map(it => {
      if (!idSet.has(it.id)) return it;
      const x = Math.max(0, Math.min(GRID_COLS - it.w, it.x + dx));
      const y = Math.max(0, it.y + dy);
      return { ...it, x, y };
    }));
  };
  // Sélection issue du rectangle : 0 id → désélectionne, 1 id → comme un clic
  // normal (ouvre l'éditeur de widget unique), 2+ → panneau de groupe.
  const onSelectMany = (sectionIdx: number, ids: string[]) => {
    if (ids.length === 0) { setMultiSelectedIds([]); return; }
    if (ids.length === 1) { setSelectedIdx(sectionIdx); setSelectedBlock(ids[0]); setMultiSelectedIds([]); return; }
    setSelectedIdx(sectionIdx); setSelectedBlock(null); setMultiSelectedIds(ids);
  };

  // ── Copier/coller (Ctrl+C / Ctrl+V) ─────────────────────────────────────────
  // Presse-papier en mémoire (pas l'API Clipboard système) : positions
  // normalisées (top-left du groupe copié ramené à 0,0) pour préserver la
  // disposition relative entre widgets copiés ensemble.
  const clipboardRef = useRef<{ block: ContentBlock; x: number; y: number; w: number; h: number }[] | null>(null);
  const copySelection = () => {
    if (selectedIdx === null) return;
    const ids = multiSelectedIds.length >= 2 ? multiSelectedIds : selectedBlock ? [selectedBlock] : [];
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const picked = getGrid(data.sections[selectedIdx]).filter(it => idSet.has(it.id) && it.block.type !== "section_content" && it.block.type !== "section_title");
    if (picked.length === 0) return;
    const minX = Math.min(...picked.map(it => it.x)), minY = Math.min(...picked.map(it => it.y));
    clipboardRef.current = picked.map(it => ({ block: it.block, x: it.x - minX, y: it.y - minY, w: it.w, h: it.h }));
  };
  const pasteClipboard = () => {
    if (selectedIdx === null) return;
    const clip = clipboardRef.current;
    if (!clip || clip.length === 0) return;
    const sectionIdx = selectedIdx;
    const newIds = clip.map(() => gridUid());
    mutateGrid(sectionIdx, items => {
      const baseY = nextY(items);
      return [...items, ...clip.map((c, i) => ({ id: newIds[i], block: c.block, x: c.x, y: baseY + c.y, w: c.w, h: c.h }))];
    });
    if (newIds.length === 1) { setSelectedBlock(newIds[0]); setMultiSelectedIds([]); }
    else { setSelectedBlock(null); setMultiSelectedIds(newIds); }
  };
  useEffect(() => {
    const isTextContext = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };
    const fn = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || isTextContext(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === "c") { copySelection(); }
      else if (key === "v") { if (clipboardRef.current) { e.preventDefault(); pasteClipboard(); } }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [selectedIdx, selectedBlock, multiSelectedIds, data]);

  // Passer un widget au-dessus/en dessous du contenu natif d'un simple clic.
  // Le contenu natif peut être très haut (ex. une section projets avec beaucoup
  // d'items dépasse largement l'écran) : glisser un widget par-dessus à la
  // souris est alors physiquement impossible sans auto-scroll. On repositionne
  // directement les coordonnées et on laisse la compaction verticale de
  // react-grid-layout résoudre le reste au prochain rendu.
  const moveAcrossNative = (sectionIdx: number, id: string, dir: "above"|"below") => {
    mutateGrid(sectionIdx, items => {
      const native = items.find(it => it.block.type === "section_content");
      const target = items.find(it => it.id === id);
      if (!native || !target || native.id === target.id) return items;
      if (dir === "below") {
        return items.map(it => it.id === target.id ? { ...it, y: native.y + native.h } : it);
      }
      return items.map(it => {
        if (it.id === target.id) return { ...it, y: native.y };
        if (it.id === native.id) return { ...it, y: native.y + target.h };
        return it;
      });
    });
  };

  // Fin de drag/resize RGL : fusionne les nouvelles coordonnées par id.
  // Skip si rien n'a bougé pour ne pas polluer l'historique Ctrl+Z.
  const commitLayout = (sectionIdx: number, layout: Layout[]) => {
    const items = getGrid(data.sections[sectionIdx]);
    const byId = new Map(layout.map(l => [l.i, l]));
    const changed = items.some(it => {
      const l = byId.get(it.id);
      return l && (l.x !== it.x || l.y !== it.y || l.w !== it.w || l.h !== it.h);
    });
    if (!changed) return;
    mutateGrid(sectionIdx, its => resolveNativeOverlap(its.map(it => {
      const l = byId.get(it.id);
      return l ? { ...it, x: l.x, y: l.y, w: l.w, h: l.h } : it;
    })));
  };

  const save = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/portfolio/${portfolioId}`, { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({siteJson:data}) });
      setSaveStatus(res.ok ? "saved" : "error");
    } catch { setSaveStatus("error"); }
  };

  const btnBg    = saveStatus==="saved"?"#16a34a":saveStatus==="error"?"#dc2626":"#c9a96e";
  const btnLabel = saveStatus==="saving"?t.topbar.saving:saveStatus==="saved"?t.topbar.saved:saveStatus==="error"?t.topbar.saveError:t.topbar.save;
  const showBlockEditor   = selectedIdx !== null && selectedBlock !== null;
  const showGroupEditor   = selectedIdx !== null && multiSelectedIds.length >= 2;
  const showSectionEditor = selectedIdx !== null && selectedBlock === null && !showGroupEditor;

  if (isMobile) {
    return (
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"2rem 1.5rem", textAlign:"center", background:"#1c1917", fontFamily:"system-ui,sans-serif" }}>
        <span style={{ fontSize:"2rem", marginBottom:"1rem" }}>💻</span>
        <h1 style={{ color:"white", fontSize:"1.125rem", fontWeight:600, marginBottom:"0.625rem" }}>{t.mobile.title}</h1>
        <p style={{ color:"#a8a29e", fontSize:"0.875rem", lineHeight:1.6, marginBottom:"2rem", maxWidth:340 }}>
          {t.mobile.desc}
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem", width:"100%", maxWidth:280 }}>
          <a href={`/${slug}`}
            style={{ background:"#c9a96e", color:"#1c1917", padding:"0.75rem 1.5rem", borderRadius:"0.75rem", fontWeight:700, fontSize:"0.875rem", textDecoration:"none" }}>
            {t.mobile.viewPortfolio}
          </a>
          <button onClick={() => router.push(`/portfolio/${portfolioId}`)}
            style={{ background:"transparent", color:"#c8c4bf", border:"1px solid rgba(255,255,255,0.15)", padding:"0.75rem 1.5rem", borderRadius:"0.75rem", fontSize:"0.875rem", cursor:"pointer" }}>
            {t.mobile.backToManage}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", fontFamily:"system-ui,sans-serif" }}>
      {/* ── LEFT ── */}
      <div ref={previewScrollRef} style={{ flex:1, overflowY:"auto", minWidth:0 }}
        onDragOver={e => { if (secDragSrc !== null) dragYRef.current = e.clientY; }}
        onDragEnd={() => { dragYRef.current = null; }}>
        <div style={{ position:"sticky", top:0, zIndex:100, background:"#1c1917", height:52, display:"flex", alignItems:"center", padding:"0 1.25rem", gap:"0.75rem" }}>
          <button onClick={() => router.push(`/portfolio/${portfolioId}`)} style={{ color:"#c9a96e", background:"none", border:"none", cursor:"pointer", fontSize:"0.875rem", whiteSpace:"nowrap" }}>{t.topbar.back}</button>
          <span style={{ flex:1, fontSize:"0.7rem", color:"#6b7280" }}>
            {t.topbar.hintPrefix}<kbd style={{ background:"#2d2d2d", padding:"1px 4px", borderRadius:3, fontSize:"0.65rem", color:"#9ca3af" }}>Ctrl Z</kbd> {t.topbar.hintUndo}
          </span>
          <LanguageToggle locale={locale} onChange={setLocale} dark />
          <button onClick={undo} disabled={!canUndo}
            style={{ background:canUndo?"rgba(255,255,255,0.08)":"transparent", color:canUndo?"#c8c4bf":"#3f3f3f", border:"1px solid rgba(255,255,255,0.1)", padding:"0.35rem 0.75rem", borderRadius:"0.5rem", cursor:canUndo?"pointer":"default", fontSize:"0.75rem", whiteSpace:"nowrap" }}>
            {t.topbar.undo}
          </button>
          <a href={`/${slug}`} target="_blank" rel="noopener noreferrer"
            style={{ fontSize:"0.75rem", color:"#9ca3af", border:"1px solid rgba(255,255,255,0.12)", padding:"0.35rem 0.75rem", borderRadius:"0.5rem", textDecoration:"none", whiteSpace:"nowrap" }}>{t.topbar.preview}</a>
          <button onClick={save} disabled={saveStatus==="saving"}
            style={{ background:btnBg, color:"#1c1917", border:"none", padding:"0.45rem 1.1rem", borderRadius:"0.6rem", fontSize:"0.8125rem", fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
            {btnLabel}
          </button>
        </div>

        <PortfolioPreview
          data={data} selectedIdx={selectedIdx} selectedBlock={selectedBlock} profileType={profileType}
          secDragSrc={secDragSrc} secDragOver={secDragOver}
          onSelectSection={i => { if (gridDragRef.current) return; setSelectedIdx(i===selectedIdx?null:i); setSelectedBlock(null); setMultiSelectedIds([]); }}
          onSelectBlock={(si,id) => { setSelectedIdx(si); setSelectedBlock(id); setMultiSelectedIds([]); }}
          onSelectNative={i => { setSelectedIdx(i); setSelectedBlock(null); setMultiSelectedIds([]); }}
          onRemoveSection={removeSection}
          onReorderSection={reorderSection}
          onAddSection={addSection}
          onAddBlock={addBlock}
          onRemoveBlock={removeBlock}
          onSecDragStart={setSecDragSrc}
          onSecDragOver={setSecDragOver}
          onSecDrop={(f,t) => { reorderSection(f,t); setSecDragSrc(null); setSecDragOver(null); }}
          onCommitLayout={commitLayout}
          onGridDragChange={v => { gridDragRef.current = v; }}
          sectionLabels={t.sectionLabels} blockLabels={t.blockLabels}
          duplicateLabel={t.contextMenuDuplicate}
          multiSelectedIds={multiSelectedIds}
          onSelectMany={onSelectMany}
          onDuplicateRequest={duplicateBlocks}
          previewScrollRef={previewScrollRef}
        />
      </div>

      {/* ── RIGHT ── */}
      <div style={{ width:320, flexShrink:0, borderLeft:"1px solid rgba(0,0,0,0.08)", background:"#fafaf9", overflowY:"auto" }}>
        {showBlockEditor ? (
          (() => {
            const item = getGrid(data.sections[selectedIdx!]).find(it => it.id === selectedBlock);
            // L'item peut avoir disparu après un undo → rien à éditer
            if (!item || item.block.type === "section_content" || item.block.type === "section_title") { return null; }
            return (
              <BlockEditor
                block={item.block}
                pri={data.theme.primary_color} profileType={profileType} meta={data.meta}
                onUpdate={b => updateBlock(selectedIdx!, selectedBlock!, b)}
                onRemove={() => removeBlock(selectedIdx!, selectedBlock!)}
                onBack={() => { setSelectedBlock(null); setMultiSelectedIds([]); }}
                onMoveAcrossNative={dir => moveAcrossNative(selectedIdx!, selectedBlock!, dir)}
                blockLabels={t.blockLabels}
              />
            );
          })()
        ) : showGroupEditor ? (
          <GroupEditor
            count={multiSelectedIds.length}
            onDeselect={() => setMultiSelectedIds([])}
            onDelete={() => removeBlocks(selectedIdx!, multiSelectedIds)}
            onDuplicate={() => duplicateBlocks(selectedIdx!, multiSelectedIds)}
            onNudge={(dx,dy) => nudgeBlocks(selectedIdx!, multiSelectedIds, dx, dy)}
            t={t.groupEditor}
          />
        ) : showSectionEditor ? (
          <SectionEditor
            section={data.sections[selectedIdx!]} idx={selectedIdx!}
            updateSection={updateSection} removeSection={removeSection}
            onClose={() => { setSelectedIdx(null); setSelectedBlock(null); setMultiSelectedIds([]); }}
            meta={data.meta} updateMeta={updateMeta}
            onAddBlock={type => addBlock(selectedIdx!, type)}
            onSelectBlock={id => { setSelectedBlock(id); setMultiSelectedIds([]); }}
            onRemoveBlock={id => removeBlock(selectedIdx!, id)}
            t={getDictionary(locale).editor}
          />
        ) : (
          <ThemeEditor meta={data.meta} theme={data.theme} updateMeta={updateMeta} updateTheme={updateTheme} profileType={profileType} portfolioId={portfolioId} t={getDictionary(locale).editor.theme} tShared={getDictionary(locale).editor.shared} />
        )}
      </div>
    </div>
  );
}

// ── Background pattern ────────────────────────────────────────────────────────
function BackgroundPattern({ pattern, color }: { pattern: string; color: string }) {
  if (!pattern || pattern==="none") return null;
  const s = (i:number,o=0) => Math.abs(Math.sin(i*127.1+o*311.7));
  if (pattern==="lines") { const l=Array.from({length:28},(_,i)=>({x1:s(i,0)*100,y1:s(i,1)*100,x2:s(i,0)*100+(s(i,2)-0.5)*40,y2:s(i,1)*100+(s(i,3)-0.5)*60,o:0.06+s(i,4)*0.1,w:0.3+s(i,5)*0.5})); return <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}>{l.map((d,i)=><line key={i} x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke={color} strokeWidth={d.w} opacity={d.o}/>)}</svg>; }
  if (pattern==="dots")  { const d=Array.from({length:80},(_,i)=>({cx:s(i,0)*100,cy:s(i,1)*100,r:0.15+s(i,2)*0.3,o:0.05+s(i,3)*0.12})); return <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0}}>{d.map((p,i)=><circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill={color} opacity={p.o}/>)}</svg>; }
  return null;
}

// ── Section gap ───────────────────────────────────────────────────────────────
function SectionGap({ insertAt, profileType, pri, onAdd }: { insertAt:number; profileType:string; pri:string; onAdd:(t:VSection["type"],i:number)=>void }) {
  const [open, setOpen] = useState(false);
  const [hov, setHov]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};
    document.addEventListener("mousedown",h); return ()=>document.removeEventListener("mousedown",h);
  },[open]);
  return (
    <div ref={ref} style={{position:"relative",zIndex:30}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{if(!open)setHov(false);}}>
      <div style={{position:"relative",height:32,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",left:0,right:0,top:"50%",height:1,background:(hov||open)?`${pri}55`:"transparent",transition:"background 0.2s"}}/>
        <button onClick={e=>{e.stopPropagation();setOpen(v=>!v);}}
          style={{position:"relative",width:26,height:26,borderRadius:"50%",background:(hov||open)?pri:"transparent",border:"none",color:(hov||open)?"#1c1917":"transparent",fontSize:"1rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.18s",boxShadow:(hov||open)?"0 2px 8px rgba(0,0,0,0.2)":"none"}}>+</button>
      </div>
      {open&&(
        <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",top:38,zIndex:50,width:340,background:"white",borderRadius:"1rem",boxShadow:"0 8px 32px rgba(0,0,0,0.18)",border:"1px solid rgba(0,0,0,0.08)",padding:"0.875rem",animation:"fadeIn 0.15s ease"}} onClick={e=>e.stopPropagation()}>
          <p style={{fontSize:"0.7rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#a09a94",marginBottom:"0.625rem"}}>Ajouter une section</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
            {getSectionSuggestions(profileType).map(s=>(
              <button key={s.type} onClick={()=>{onAdd(s.type,insertAt);setOpen(false);setHov(false);}}
                style={{display:"flex",alignItems:"flex-start",gap:"0.5rem",padding:"0.625rem 0.75rem",background:"#f8f5f0",border:"1px solid rgba(0,0,0,0.07)",borderRadius:"0.625rem",cursor:"pointer",textAlign:"left"}}
                onMouseEnter={e=>(e.currentTarget.style.background=`${pri}12`)} onMouseLeave={e=>(e.currentTarget.style.background="#f8f5f0")}>
                <span style={{fontSize:"1rem",flexShrink:0}}>{s.icon}</span>
                <div><p style={{fontSize:"0.7875rem",fontWeight:600,color:"#1c1917",margin:0}}>{s.label}</p><p style={{fontSize:"0.675rem",color:"#78716c",margin:0,lineHeight:1.4}}>{s.desc}</p></div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bouton "+" sous la grille : ouvre le sélecteur de widget ──────────────────
function AddWidgetButton({ pri, bg, onAdd, blockLabels }: {
  pri:string; bg:string; onAdd:(t:ContentBlock["type"])=>void; blockLabels:BlockLabels;
}) {
  const [open, setOpen] = useState(false);
  const [hov, setHov]   = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cc = contrastColor(bg);
  const active = hov || open;
  useEffect(()=>{
    if(!open) return;
    const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};
    document.addEventListener("mousedown",h); return()=>document.removeEventListener("mousedown",h);
  },[open]);
  return (
    <div ref={ref} style={{position:"relative",zIndex:20,margin:"0.5rem 0 0"}} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{if(!open)setHov(false);}}>
      <button onClick={e=>{e.stopPropagation();setOpen(v=>!v);}}
        style={{width:"100%",height:28,borderRadius:"0.625rem",border:`1.5px dashed ${cc}${active?"70":"28"}`,background:active?`${cc}0d`:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
        <span style={{fontSize:active?"1.1rem":"0.9rem",fontWeight:700,color:`${cc}${active?"ff":"55"}`,lineHeight:1,transition:"all 0.15s"}}>+</span>
      </button>
      {open&&(
        <div style={{position:"absolute",left:"50%",transform:"translateX(-50%)",top:36,zIndex:50,background:"white",borderRadius:"0.875rem",boxShadow:"0 8px 32px rgba(0,0,0,0.18)",border:"1px solid rgba(0,0,0,0.08)",padding:"0.625rem",animation:"fadeIn 0.12s ease",width:240}} onClick={e=>e.stopPropagation()}>
          <p style={{fontSize:"0.625rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#a09a94",marginBottom:"0.4rem"}}>Ajouter un widget</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.3rem"}}>
            {BLOCK_SUGGESTIONS.map(s=>(
              <button key={s.type} onClick={()=>{onAdd(s.type);setOpen(false);setHov(false);}}
                style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.2rem",padding:"0.4rem 0.25rem",background:"#f8f5f0",border:"1px solid rgba(0,0,0,0.07)",borderRadius:"0.4rem",cursor:"pointer"}}
                onMouseEnter={e=>(e.currentTarget.style.background=`${pri}12`)} onMouseLeave={e=>(e.currentTarget.style.background="#f8f5f0")}>
                <span style={{fontSize:"1rem"}}>{s.icon}</span>
                <span style={{fontSize:"0.575rem",color:"#78716c",fontWeight:500}}>{blockLabel(blockLabels,s.type)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Single block item wrapper ─────────────────────────────────────────────────
function BlockItemWrapper({ children, selected, pri, onSelect, onRemove }: {
  children:React.ReactNode; selected:boolean; pri:string; onSelect:()=>void; onRemove:()=>void;
}) {
  const [hov, setHov] = useState(false);
  const show = hov || selected;
  return (
    <div
      style={{outline:selected?`2px solid ${pri}`:hov?`1px dashed ${pri}55`:"none",outlineOffset:3,borderRadius:"0.4rem",cursor:"pointer",position:"relative",padding:"2px"}}
      onClick={e=>{e.stopPropagation();onSelect();}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      {show&&(
        <div style={{position:"absolute",top:-14,right:0,zIndex:20,display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
          <span onClick={onSelect} style={{background:pri,color:"#1c1917",borderRadius:4,padding:"0 7px",fontSize:"0.6rem",fontWeight:700,cursor:"pointer",letterSpacing:"0.05em",textTransform:"uppercase",lineHeight:"18px"}}>Éditer</span>
          <button onClick={onRemove} style={{background:"#dc2626",color:"#fff",border:"none",borderRadius:4,width:18,height:18,cursor:"pointer",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      )}
      {children}
    </div>
  );
}

// Délai (ms) qu'il faut rester appuyé avant qu'un widget devienne "prenable".
// En dessous : un clic gauche, même avec un minuscule tremblement, sélectionne
// et ouvre l'édition — jamais de glissement accidentel.
const HOLD_TO_DRAG_MS = 180;

// ── Chrome d'un item de grille : outline sélection + toolbar Éditer/✕ ─────────
// Le contenu natif d'une section (removable=false) n'a pas de croix : on le
// déplace/redimensionne mais on ne le supprime qu'en supprimant la section.
// Le widget porte la classe "no-drag" (exclue via draggableCancel dans
// GridBlocksArea) TANT QUE le clic n'a pas été maintenu HOLD_TO_DRAG_MS ms.
// react-grid-layout n'évalue draggableCancel qu'UNE SEULE FOIS, au moment du
// mousedown — trop tôt pour un délai. On retire donc la classe puis on
// réinjecte nous-même un mousedown natif à la position courante une fois le
// délai écoulé (si le bouton est toujours enfoncé) : react-grid-layout le
// reçoit comme un vrai mousedown et démarre son suivi de glissement à partir
// de là. Un relâchement avant le délai annule le timer → simple clic.
function GridItemChrome({ children, selected, pri, label, removable, onSelect, onRemove, onMouseDown }: {
  children:React.ReactNode; selected:boolean; pri:string; label?:string; removable:boolean;
  onSelect:()=>void; onRemove:()=>void; onMouseDown?:()=>void;
}) {
  const [hov, setHov] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<number|null>(null);
  const show = hov || selected;

  const clearPressTimer = () => {
    if (pressTimer.current != null) { window.clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    onMouseDown?.();
    if (e.button !== 0) return; // clic gauche uniquement
    const { clientX, clientY } = e;
    clearPressTimer();
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      const el = rootRef.current;
      el?.classList.remove("no-drag");
      el?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX, clientY, button: 0 }));
    }, HOLD_TO_DRAG_MS);
  };

  const releasePress = () => {
    clearPressTimer();
    rootRef.current?.classList.add("no-drag"); // reverrouille pour le prochain geste
  };

  return (
    <div
      ref={rootRef}
      className="no-drag"
      style={{height:"100%",position:"relative",outline:selected?"2px solid #ffffff":hov?"1px dashed rgba(255,255,255,0.75)":"none",outlineOffset:2,
        // Halo sombre autour du liseré blanc pour qu'il reste visible sur fond clair
        boxShadow:selected?"0 0 0 4px rgba(0,0,0,0.28)":"none",
        borderRadius:"0.5rem",cursor:"grab"}}
      onMouseDown={handleMouseDown}
      onMouseUp={releasePress}
      onClick={e=>{e.stopPropagation();onSelect();}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);releasePress();}}>
      {show&&(
        <div className="widget-ui" style={{position:"absolute",top:-12,right:0,zIndex:20,display:"flex",gap:3}} onClick={e=>e.stopPropagation()}>
          <span onClick={onSelect} style={{background:pri,color:"#1c1917",borderRadius:4,padding:"0 7px",fontSize:"0.6rem",fontWeight:700,cursor:"pointer",letterSpacing:"0.05em",textTransform:"uppercase",lineHeight:"18px"}}>{label??"Éditer"}</span>
          {removable&&<button onClick={onRemove} style={{background:"#dc2626",color:"#fff",border:"none",borderRadius:4,width:18,height:18,cursor:"pointer",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
        </div>
      )}
      <div style={{height:"100%",overflow:"hidden"}}>{children}</div>
    </div>
  );
}

// ── Conversion px <-> unités de grille (colonnes/lignes), pour verrouiller le
// ratio d'un widget image pendant son redimensionnement (voir onResize plus
// bas) — reproduit le calcul interne de react-grid-layout (colWidth déduit de
// la largeur du conteneur, GRID_COLS colonnes, GRID_MARGIN de gouttière).
function colWidthPx(containerWidth: number): number {
  return (containerWidth - GRID_MARGIN * (GRID_COLS - 1)) / GRID_COLS;
}
function gridWToPx(w: number, containerWidth: number): number {
  const cw = colWidthPx(containerWidth);
  return w * cw + (w - 1) * GRID_MARGIN;
}
function pxToGridW(px: number, containerWidth: number): number {
  const cw = colWidthPx(containerWidth);
  return (px + GRID_MARGIN) / (cw + GRID_MARGIN);
}
function gridHToPx(h: number): number {
  return h * GRID_ROW_HEIGHT + (h - 1) * GRID_MARGIN;
}
function pxToGridH(px: number): number {
  return (px + GRID_MARGIN) / (GRID_ROW_HEIGHT + GRID_MARGIN);
}

// ── Menu contextuel (clic droit) : "Dupliquer" ────────────────────────────────
function WidgetContextMenu({ x, y, duplicateLabel, onDuplicate, onClose }: {
  x:number; y:number; duplicateLabel:string; onDuplicate:()=>void; onClose:()=>void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onEsc); };
  }, [onClose]);
  return (
    <div ref={ref} onClick={e=>e.stopPropagation()} onMouseDown={e=>e.stopPropagation()}
      style={{position:"fixed",left:x,top:y,zIndex:200,background:"white",borderRadius:"0.625rem",boxShadow:"0 8px 32px rgba(0,0,0,0.18)",border:"1px solid rgba(0,0,0,0.08)",padding:"0.3rem",minWidth:140}}>
      <button onClick={()=>{onDuplicate();onClose();}}
        style={{width:"100%",textAlign:"left",padding:"0.5rem 0.75rem",fontSize:"0.8125rem",fontWeight:500,color:"#1c1917",background:"none",border:"none",borderRadius:"0.4rem",cursor:"pointer"}}
        onMouseEnter={e=>(e.currentTarget.style.background="#f0ece6")} onMouseLeave={e=>(e.currentTarget.style.background="none")}>
        {duplicateLabel}
      </button>
    </div>
  );
}

// ── Grille libre (react-grid-layout) — zone de widgets d'une section ──────────
// Exposé au parent (SectionRender) pour que le rectangle de sélection puisse
// aussi démarrer depuis la marge de centrage de la section (en dehors de la
// colonne 960px où vit gridWrapRef) — voir l'attache sur <section> plus bas.
export type GridBlocksAreaHandle = { onSectionMouseDown: (e: React.MouseEvent) => void };

const GridBlocksArea = forwardRef<GridBlocksAreaHandle, {
  items:GridItem[]; editMode:boolean; selectedId:string|null;
  widgetStyle:WidgetStyle; pri:string; bg:string; txt:string; hFont:string;
  renderNative?:()=>React.ReactNode;
  renderTitle?:()=>React.ReactNode;
  onSelect:(id:string)=>void; onSelectNative:()=>void; onRemove:(id:string)=>void;
  onAddBlock:(type:ContentBlock["type"])=>void;
  onCommitLayout:(layout:Layout[])=>void;
  onGridDragChange:(active:boolean)=>void;
  blockLabels:BlockLabels; duplicateLabel:string;
  multiSelectedIds:string[]; onSelectMany:(ids:string[])=>void;
  onDuplicateRequest:(ids:string[])=>void;
  previewScrollRef:React.RefObject<HTMLDivElement>;
}>(({ items, editMode, selectedId, widgetStyle, pri, bg, txt, hFont, renderNative, renderTitle, onSelect, onSelectNative, onRemove, onAddBlock, onCommitLayout, onGridDragChange, blockLabels, duplicateLabel, multiSelectedIds, onSelectMany, onDuplicateRequest, previewScrollRef }, forwardedRef) => {
  // Un simple clic ne doit pas commit ni supprimer la sélection : on ne commit
  // qu'après un vrai déplacement (dragMoved), et on avale le click de fin de drag.
  const dragMoved = useRef(false);
  // NB : un défilement automatique pendant le drag, puis un "figeage" du contenu
  // natif via layout[].static pendant qu'on déplace un autre widget, ont été
  // essayés puis retirés — les deux cassaient le drag/resize normal (RGL ne
  // supporte pas bien un changement de layout[] réactif en cours de geste).
  // Pour déplacer un widget au-delà d'un bloc plus grand que l'écran, utiliser
  // les boutons "Au-dessus / En dessous du contenu" du panneau de droite.
  //
  // Position de départ brute de la souris (indépendante de tout calcul de
  // grille), utilisée uniquement pour le seuil clic/glissement ci-dessous —
  // la décision "au-dessus/en dessous" du contenu natif, elle, est purement
  // géométrique (voir resolveNativeOverlap).
  const dragStartClientY = useRef<number|null>(null);
  const dragStartClientX = useRef<number|null>(null);
  // Seuil de tolérance avant de considérer que c'est un vrai glissement (et
  // non un clic, voire un double-clic — où la souris peut bouger de 1-2px
  // entre les deux clics sans que ce soit une intention de glisser). Sans ce
  // seuil, `onDrag` de react-grid-layout se déclenche au moindre frémissement
  // et bloquait à tort la sélection au clic.
  const DRAG_THRESHOLD_PX = 6;

  // Ratio naturel (largeur/hauteur) de chaque widget image, préchargé pour
  // verrouiller les proportions pendant le redimensionnement (onResize
  // ci-dessous) — sans ça, tirer une seule poignée (largeur OU hauteur, pas
  // les deux à la fois) déforme le cadre et object-fit:cover recadre
  // l'image de façon disproportionnée (perte de contenu visible).
  const imgRatioRef = useRef<Record<string, { url:string; ratio:number }>>({});
  const gridWrapRef = useRef<HTMLDivElement>(null);
  // Poignée utilisée pour le redimensionnement en cours ("e"/"s"/"se"),
  // capturée une seule fois au mousedown (event.target y est fiablement la
  // poignée elle-même — react-resizable lui pose la classe
  // react-resizable-handle-<axe>). Pendant le drag (onResize), event.target
  // suit le curseur et n'est plus la poignée, donc on ne peut pas la relire
  // à chaque frame ; RGL ne rafraîchit pas non plus `oldItem` à chaque
  // frame (figé au début du geste), donc comparer newItem à oldItem pour
  // deviner l'axe échoue dès la 2e frame une fois qu'on a nous-même modifié
  // l'autre dimension. D'où cette capture ponctuelle.
  const resizeAxisRef = useRef<string|null>(null);
  useEffect(() => {
    for (const it of items) {
      if (it.block.type !== "image" || !it.block.url) continue;
      if (imgRatioRef.current[it.id]?.url === it.block.url) continue;
      const url = it.block.url;
      const img = new Image();
      img.onload = () => { imgRatioRef.current[it.id] = { url, ratio: img.naturalWidth / img.naturalHeight }; };
      img.src = url;
    }
  }, [items]);

  if (!editMode && items.length===0) return null;

  if (items.length===0) {
    return (
      <div style={{marginTop:"0.875rem"}}>
        <div style={{border:`1px dashed ${pri}30`,borderRadius:"0.625rem",padding:"1rem",textAlign:"center"}}>
          <p style={{fontSize:"0.7rem",color:`${pri}55`,margin:"0 0 0.5rem"}}>Aucun widget · ajoute le premier</p>
          <div style={{display:"flex",justifyContent:"center",flexWrap:"wrap",gap:"0.375rem"}}>
            {BLOCK_SUGGESTIONS.map(s=>(
              <button key={s.type} onClick={e=>{e.stopPropagation();onAddBlock(s.type);}}
                style={{display:"flex",alignItems:"center",gap:"0.25rem",padding:"0.3rem 0.6rem",background:`${pri}10`,border:"none",borderRadius:"0.375rem",cursor:"pointer",fontSize:"0.7rem",color:pri,fontWeight:600}}>
                {s.icon} {blockLabel(blockLabels,s.type)}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const layout: Layout[] = items.map(it => ({
    i: it.id, x: it.x, y: it.y, w: it.w, h: it.h,
    minW: MIN_SIZE[it.block.type].w, minH: MIN_SIZE[it.block.type].h,
  }));

  const startGesture = () => { dragMoved.current = false; onGridDragChange(true); };
  const endGesture = (l: Layout[], commit: boolean) => {
    // Le click de fin de geste part APRÈS le mouseup : on laisse gridDrag actif
    // jusqu'au prochain tick pour que la sélection de section soit ignorée.
    setTimeout(() => onGridDragChange(false), 0);
    if (commit) onCommitLayout(l);
  };

  // ── Sélection multiple par glisser-rectangle (façon icônes de bureau) ──────
  // Démarre uniquement si le mousedown n'a pas déjà été capté par un widget
  // (react-grid-layout pose "react-grid-item" sur chaque enfant direct) —
  // sinon un simple drag de widget déclencherait aussi un rectangle dessous.
  const RECT_DRAG_THRESHOLD_PX = 2;
  const rectStartRef = useRef<{x:number;y:number}|null>(null);
  const rectContainerWidthRef = useRef(0);
  const rectShiftRef = useRef(false);
  const rectMovedRef = useRef(false);
  const [rectBox, setRectBox] = useState<{x0:number;y0:number;x1:number;y1:number}|null>(null);
  // Aperçu en direct (pendant onDrag, pas seulement au dépôt) des positions où
  // atterriront les AUTRES widgets du groupe — RGL ne fait vivre son propre
  // "placeholder" que sur l'item réellement glissé.
  const [groupDragPreview, setGroupDragPreview] = useState<{id:string;x:number;y:number;w:number;h:number}[]|null>(null);
  // Clic droit sur un widget → menu "Dupliquer" (le groupe entier si le
  // widget cliqué fait partie de la sélection multiple active).
  const [contextMenuFor, setContextMenuFor] = useState<{id:string;x:number;y:number}|null>(null);

  const itemPixelRect = (it: {x:number;y:number;w:number;h:number}, containerWidth: number) => {
    const colW = colWidthPx(containerWidth);
    const left = it.x * (colW + GRID_MARGIN);
    const top = it.y * (GRID_ROW_HEIGHT + GRID_MARGIN);
    return { left, top, right: left + gridWToPx(it.w, containerWidth), bottom: top + gridHToPx(it.h) };
  };
  const hitTestRect = (x0:number, y0:number, x1:number, y1:number, containerWidth:number): string[] => {
    // Le contenu natif (généré par l'IA) EST inclus ici — sélectionnable et
    // déplaçable comme les autres ; removeBlocks/duplicateBlocks l'excluent
    // déjà explicitement de leurs actions (voir plus haut), donc l'inclure
    // dans la sélection/le déplacement groupé est sans risque.
    const selLeft = Math.min(x0,x1), selRight = Math.max(x0,x1);
    const selTop = Math.min(y0,y1), selBottom = Math.max(y0,y1);
    return items
      .filter(it => {
        const r = itemPixelRect(it, containerWidth);
        return r.left < selRight && r.right > selLeft && r.top < selBottom && r.bottom > selTop;
      })
      .map(it => it.id);
  };

  // Dernière position brute (viewport) de la souris pendant le glissement —
  // relue en continu par la boucle de défilement auto ci-dessous, puisque la
  // souris peut rester immobile (près du bord) pendant que la page défile.
  const lastClientRef = useRef<{x:number;y:number}|null>(null);
  const scrollRafRef = useRef<number|null>(null);

  const updateRectFromClient = (clientX: number, clientY: number) => {
    const cur = gridWrapRef.current;
    if (!cur || !rectStartRef.current) return;
    const r = cur.getBoundingClientRect();
    const x1 = clientX - r.left, y1 = clientY - r.top;
    if (!rectMovedRef.current && Math.hypot(x1-rectStartRef.current.x, y1-rectStartRef.current.y) > RECT_DRAG_THRESHOLD_PX) {
      rectMovedRef.current = true;
    }
    setRectBox({ x0:rectStartRef.current.x, y0:rectStartRef.current.y, x1, y1 });
    if (rectMovedRef.current) {
      const hits = hitTestRect(rectStartRef.current.x, rectStartRef.current.y, x1, y1, rectContainerWidthRef.current);
      onSelectMany(rectShiftRef.current ? Array.from(new Set([...multiSelectedIds, ...hits])) : hits);
    }
  };

  const handleWrapMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editMode || e.button !== 0) return;
    const wrap = gridWrapRef.current;
    if (!wrap) return;
    const bounds = wrap.getBoundingClientRect();
    const start = { x: e.clientX - bounds.left, y: e.clientY - bounds.top };
    // Test géométrique (mêmes coordonnées x/y/w/h que le positionnement réel
    // des widgets) plutôt qu'un test DOM (`.closest(".react-grid-item")`) —
    // ce dernier ratait souvent les fines gouttières entre deux widgets
    // (GRID_MARGIN = 14px, une cible difficile à cliquer précisément) et
    // pouvait rater selon la structure DOM exacte de react-grid-layout.
    // "Sur un widget" = strictement dans son rectangle : on n'y dessine pas
    // de rectangle (le clic doit sélectionner/glisser CE widget à la place).
    const containerWidth = wrap.clientWidth;
    const onAnItem = items.some(it => {
      const r = itemPixelRect(it, containerWidth);
      return start.x >= r.left && start.x <= r.right && start.y >= r.top && start.y <= r.bottom;
    });
    if (onAnItem) return;
    rectStartRef.current = start;
    rectContainerWidthRef.current = containerWidth;
    rectShiftRef.current = e.shiftKey;
    rectMovedRef.current = false;
    lastClientRef.current = { x: e.clientX, y: e.clientY };
    setRectBox({ x0:start.x, y0:start.y, x1:start.x, y1:start.y });

    // Défilement auto de la zone d'aperçu (previewScrollRef) quand on
    // approche un de ses bords pendant le glissement — même mécanisme que
    // pour le glissement de section (dragYRef plus haut dans ce fichier),
    // nécessaire ici car la souris peut être immobile près du bord tout en
    // continuant de vouloir étendre la sélection.
    const EDGE = 90, MAX_SPEED = 18;
    const scrollTick = () => {
      const el = previewScrollRef.current;
      const c = lastClientRef.current;
      if (el && c) {
        const rect = el.getBoundingClientRect();
        if (c.y < rect.top + EDGE) {
          el.scrollTop -= MAX_SPEED * (1 - Math.max(0, c.y - rect.top) / EDGE);
          updateRectFromClient(c.x, c.y);
        } else if (c.y > rect.bottom - EDGE) {
          el.scrollTop += MAX_SPEED * (1 - Math.max(0, rect.bottom - c.y) / EDGE);
          updateRectFromClient(c.x, c.y);
        }
      }
      scrollRafRef.current = requestAnimationFrame(scrollTick);
    };
    scrollRafRef.current = requestAnimationFrame(scrollTick);

    const handleMove = (ev: MouseEvent) => {
      lastClientRef.current = { x: ev.clientX, y: ev.clientY };
      updateRectFromClient(ev.clientX, ev.clientY);
    };
    const handleUp = () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      if (scrollRafRef.current != null) { cancelAnimationFrame(scrollRafRef.current); scrollRafRef.current = null; }
      if (!rectMovedRef.current) onSelectMany([]); // simple clic sur le vide : désélectionne
      setRectBox(null);
      rectStartRef.current = null;
      lastClientRef.current = null;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  };

  // handleWrapMouseDown calcule tout relativement à gridWrapRef (jamais à
  // l'élément qui a reçu le mousedown) — l'exposer ainsi permet à SectionRender
  // de l'appeler depuis <section> (toute la largeur, y compris la marge de
  // centrage) sans dupliquer la logique de rectangle/hit-test.
  useImperativeHandle(forwardedRef, () => ({ onSectionMouseDown: handleWrapMouseDown }));

  return (
    <div ref={gridWrapRef} draggable={false} style={{marginTop:"0.875rem",position:"relative"}} onClick={e=>e.stopPropagation()} onMouseDown={handleWrapMouseDown}>
      {/* Pas de isBounded : ça confine le glissement à la hauteur ACTUELLE du
          conteneur, or celle-ci s'arrête au bas de l'item le plus haut (souvent
          le contenu natif) — impossible de glisser un widget en dessous. */}
      <ReactGridLayout
        cols={GRID_COLS} rowHeight={GRID_ROW_HEIGHT} margin={[GRID_MARGIN,GRID_MARGIN]}
        containerPadding={[0,0]}
        // La compaction verticale "aspire" tout item vers le haut dès qu'un
        // espace libre existe au-dessus de lui, à CHAQUE mise à jour du
        // layout (pas seulement pendant un geste live — react-grid-layout la
        // relance sur tout changement de prop `layout`, donc aussi après un
        // simple commit de données). Ça annulait silencieusement le décalage
        // appliqué aux AUTRES widgets du groupe dans onDragStop. Désactivée
        // uniquement pendant qu'un groupe de 2+ est sélectionné : le
        // déplacement groupé veut préserver les positions relatives exactes,
        // ce qui est justement incompatible avec l'aspiration automatique.
        compactType={multiSelectedIds.length>=2?null:"vertical"}
        isDraggable={editMode} isResizable={editMode}
        resizeHandles={["se","e","s"]} draggableCancel=".widget-ui, .no-drag"
        layout={layout}
        onDragStart={(l,oldItem,ni,ph,e)=>{
          startGesture();
          const ev = e as unknown as MouseEvent;
          dragStartClientY.current = ev.clientY;
          dragStartClientX.current = ev.clientX;
          setGroupDragPreview(null);
        }}
        onDrag={(l,oldItem,ni,ph,e)=>{
          const ev = e as unknown as MouseEvent;
          const dx = dragStartClientX.current!=null ? ev.clientX-dragStartClientX.current : 0;
          const dy = dragStartClientY.current!=null ? ev.clientY-dragStartClientY.current : 0;
          if (Math.hypot(dx,dy) > DRAG_THRESHOLD_PX) dragMoved.current = true;
          // Aperçu live des AUTRES widgets sélectionnés (RGL n'anime que
          // celui qu'on glisse réellement) — même delta que onDragStop,
          // recalculé à chaque frame de la souris.
          if (multiSelectedIds.length >= 2 && multiSelectedIds.includes(ni.i)) {
            const gx = ni.x - oldItem.x, gy = ni.y - oldItem.y;
            setGroupDragPreview(gx===0 && gy===0 ? null : items
              .filter(it => it.id !== ni.i && multiSelectedIds.includes(it.id))
              .map(it => ({
                id: it.id,
                x: Math.max(0, Math.min(GRID_COLS - it.w, it.x + gx)),
                y: Math.max(0, it.y + gy),
                w: it.w, h: it.h,
              })));
          }
        }}
        onDragStop={(l,oldItem,newItem)=>{
          // Sélection de groupe : les AUTRES widgets sélectionnés suivent le
          // même delta que celui qu'on vient de glisser (RGL ne bouge que
          // l'item glissé lui-même ; on applique nous-mêmes le même
          // déplacement aux autres avant de commit).
          let finalLayout = l;
          if (multiSelectedIds.length >= 2 && multiSelectedIds.includes(newItem.i)) {
            const dx = newItem.x - oldItem.x, dy = newItem.y - oldItem.y;
            if (dx !== 0 || dy !== 0) {
              finalLayout = l.map(li => {
                if (li.i === newItem.i || !multiSelectedIds.includes(li.i)) return li;
                const x = Math.max(0, Math.min(GRID_COLS - li.w, li.x + dx));
                const y = Math.max(0, li.y + dy);
                return { ...li, x, y };
              });
            }
          }
          setGroupDragPreview(null);
          endGesture(finalLayout, dragMoved.current);
        }}
        onResizeStart={(l,oldItem,newItem,placeholder,e)=>{
          startGesture();
          const target = (e as unknown as MouseEvent)?.target as HTMLElement | null;
          const cls = typeof target?.className === "string" ? target.className : "";
          resizeAxisRef.current = cls.match(/react-resizable-handle-(\w+)/)?.[1] ?? null;
        }}
        onResize={(l,oldItem,newItem,placeholder)=>{
          const it = items.find(x=>x.id===newItem.i);
          if (!it || it.block.type!=="image") return;
          const ratio = imgRatioRef.current[it.id]?.ratio;
          const containerWidth = gridWrapRef.current?.clientWidth;
          if (!ratio || !containerWidth) return;

          // Poignée hauteur seule (s) : la largeur suit la hauteur. Dans
          // tous les autres cas (largeur seule "e", ou coin "se" qui change
          // les deux), la largeur reste "maîtresse" et la hauteur suit —
          // choix arbitraire mais cohérent, qui garantit que l'image ne
          // soit jamais recadrée de façon disproportionnée quelle que soit
          // la poignée utilisée.
          if (resizeAxisRef.current === "s") {
            const pxH = gridHToPx(newItem.h);
            const pxW = pxH * ratio;
            newItem.w = Math.max(MIN_SIZE.image.w, Math.min(GRID_COLS, Math.round(pxToGridW(pxW, containerWidth))));
          } else {
            const pxW = gridWToPx(newItem.w, containerWidth);
            const pxH = pxW / ratio;
            newItem.h = Math.max(MIN_SIZE.image.h, Math.round(pxToGridH(pxH)));
          }
          placeholder.w = newItem.w;
          placeholder.h = newItem.h;
        }}
        onResizeStop={l=>endGesture(l, true)}
      >
        {items.map(it=>{
          const isNative = it.block.type==="section_content";
          const isTitle  = it.block.type==="section_title";
          return (
            <div key={it.id} onContextMenu={e=>{
              if (isNative || isTitle) return; // pas de duplication pour ceux-là
              e.preventDefault();
              setContextMenuFor({ id: it.id, x: e.clientX, y: e.clientY });
            }}>
              <GridItemChrome selected={selectedId===it.id || multiSelectedIds.includes(it.id)} pri={pri}
                label={isNative?"Contenu →":isTitle?"Titre →":undefined} removable={!isNative && !isTitle}
                onMouseDown={()=>{ dragMoved.current = false; }}
                // Le titre n'a pas d'éditeur dédié : il ouvre le même panneau
                // que le contenu natif (SectionEditor, qui porte déjà le champ
                // "Titre de la section" + l'alignement).
                onSelect={()=>{ if(dragMoved.current) return; if(isNative||isTitle) onSelectNative(); else onSelect(it.id); }}
                onRemove={()=>onRemove(it.id)}>
                {isTitle
                  // Pas de WidgetFrame (pas de carte) : un simple texte, comme
                  // avant son passage en item de grille.
                  ? <div style={{height:"100%",display:"flex",alignItems:"center"}}>{renderTitle?.()}</div>
                  : (
                    <WidgetFrame widgetStyle={widgetStyle} block={it.block} bg={bg} txt={txt}>
                      {it.block.type==="section_content"
                        // overflowY auto (pas hidden) : même correctif que le rendu
                        // public (blocks.tsx/GridStatic) — un widget "projets"
                        // rétréci reflow ses colonnes mais peut manquer de hauteur ;
                        // avec hidden les projets en trop devenaient invisibles.
                        ? <div style={{height:"100%",overflowY:"auto",overflowX:"hidden",zoom:nativeZoom(it.block),fontFamily:it.block.fontFamily||undefined}}>{renderNative?.()}</div>
                        : <BlockContent block={it.block} pri={pri} txt={txt} hFont={hFont} editMode fill={widgetStyle!=="strict"}/>}
                    </WidgetFrame>
                  )}
              </GridItemChrome>
            </div>
          );
        })}
      </ReactGridLayout>
      {rectBox&&rectMovedRef.current&&(
        <div style={{
          position:"absolute", pointerEvents:"none", zIndex:30, borderRadius:4,
          left:Math.min(rectBox.x0,rectBox.x1), top:Math.min(rectBox.y0,rectBox.y1),
          width:Math.abs(rectBox.x1-rectBox.x0), height:Math.abs(rectBox.y1-rectBox.y0),
          border:`1.5px dashed ${pri}`, background:`${pri}14`,
        }}/>
      )}
      {groupDragPreview&&gridWrapRef.current&&groupDragPreview.map(p=>{
        const r = itemPixelRect(p, gridWrapRef.current!.clientWidth);
        return (
          <div key={p.id} style={{
            position:"absolute", pointerEvents:"none", zIndex:25, borderRadius:8,
            left:r.left, top:r.top, width:r.right-r.left, height:r.bottom-r.top,
            border:`2px dashed ${pri}`, background:`${pri}14`,
          }}/>
        );
      })}
      {editMode&&<AddWidgetButton pri={pri} bg={bg} onAdd={onAddBlock} blockLabels={blockLabels}/>}
      {contextMenuFor&&(
        <WidgetContextMenu
          x={contextMenuFor.x} y={contextMenuFor.y} duplicateLabel={duplicateLabel}
          onDuplicate={()=>{
            const ids = multiSelectedIds.length>=2 && multiSelectedIds.includes(contextMenuFor.id) ? multiSelectedIds : [contextMenuFor.id];
            onDuplicateRequest(ids);
          }}
          onClose={()=>setContextMenuFor(null)}
        />
      )}
    </div>
  );
});
GridBlocksArea.displayName = "GridBlocksArea";

// ── Portfolio preview ──────────────────────────────────────────────────────────
function PortfolioPreview({ data, selectedIdx, selectedBlock, profileType, secDragSrc, secDragOver, onSelectSection, onSelectBlock, onSelectNative, onRemoveSection, onReorderSection, onAddSection, onAddBlock, onRemoveBlock, onSecDragStart, onSecDragOver, onSecDrop, onCommitLayout, onGridDragChange, sectionLabels, blockLabels, duplicateLabel, multiSelectedIds, onSelectMany, onDuplicateRequest, previewScrollRef }: {
  data:ValidatedPortfolioJSON; selectedIdx:number|null; selectedBlock:string|null; profileType:string;
  secDragSrc:number|null; secDragOver:number|null;
  onSelectSection:(i:number)=>void; onSelectBlock:(si:number,id:string)=>void;
  onSelectNative:(i:number)=>void;
  onRemoveSection:(i:number)=>void; onReorderSection:(f:number,t:number)=>void;
  onAddSection:(t:VSection["type"],i:number)=>void;
  onAddBlock:(si:number,type:ContentBlock["type"])=>void;
  onRemoveBlock:(si:number,id:string)=>void;
  onSecDragStart:(i:number)=>void; onSecDragOver:(i:number)=>void;
  onSecDrop:(f:number,t:number)=>void;
  onCommitLayout:(si:number,layout:Layout[])=>void;
  onGridDragChange:(active:boolean)=>void;
  sectionLabels:SectionLabels; blockLabels:BlockLabels; duplicateLabel:string;
  multiSelectedIds:string[]; onSelectMany:(si:number,ids:string[])=>void;
  onDuplicateRequest:(si:number,ids:string[])=>void;
  previewScrollRef:React.RefObject<HTMLDivElement>;
}) {
  const {meta,theme,sections}=data;
  const {background_color:bg,text_color:txt,primary_color:pri,accent_color:acc,font_heading,font_body}=theme;
  const widgetStyle:WidgetStyle=(theme as {widget_style?:WidgetStyle}).widget_style??"strict";
  const hFont=`'${font_heading}',Georgia,serif`;
  const bFont=`'${font_body}',system-ui,sans-serif`;

  return (
    <div style={{fontFamily:bFont,background:bg,color:txt,minHeight:"100vh",position:"relative"}}>
      <BackgroundPattern pattern={theme.background_pattern??"none"} color={txt}/>
      <nav style={{position:"sticky",top:52,zIndex:40,borderBottom:`1px solid ${txt}10`,background:`${bg}e8`,backdropFilter:"blur(12px)"}}>
        <div style={{maxWidth:960,margin:"0 auto",padding:"0.875rem 1.5rem",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontWeight:700,color:pri,fontFamily:hFont,fontSize:"1rem"}}>{meta.name}</span>
          <div style={{display:"flex",gap:"1.25rem",fontSize:"0.8125rem",color:`${txt}70`}}>
            {sections.filter(s=>s.type!=="hero").map(s=><span key={s.type}>{(s as {section_title?:string}).section_title??sectionLabel(sectionLabels,s.type)}</span>)}
          </div>
        </div>
      </nav>

      {sections.map((section,i)=>(
        <div key={`${section.type}-${i}`}>
          {secDragSrc!==null&&secDragOver===i&&secDragSrc!==i&&<div style={{height:4,background:pri,margin:"0 1rem",borderRadius:2,opacity:0.8}}/>}
          <SectionWrapper
            section={section} selected={selectedIdx===i} isDragging={secDragSrc===i} pri={pri}
            draggable={section.type!=="hero"}
            onClick={()=>onSelectSection(i)}
            onRemove={section.type!=="hero"?()=>onRemoveSection(i):undefined}
            onDragStart={()=>onSecDragStart(i)}
            onDragEnd={()=>onSecDragOver(-1)}
            onDragOver={()=>onSecDragOver(i)}
            onDrop={()=>{ if(secDragSrc!==null&&secDragSrc!==i)onSecDrop(secDragSrc,i); }}>
            <SectionRender
              section={section} meta={meta} theme={theme} bg={bg} txt={txt} pri={pri} acc={acc} hFont={hFont}
              sectionIdx={i} editMode widgetStyle={widgetStyle}
              selectedBlock={selectedIdx===i?selectedBlock:null}
              onSelectBlock={id=>onSelectBlock(i,id)}
              onSelectNative={()=>onSelectNative(i)}
              onRemoveBlock={id=>onRemoveBlock(i,id)}
              onAddBlock={type=>onAddBlock(i,type)}
              onCommitLayout={layout=>onCommitLayout(i,layout)}
              onGridDragChange={onGridDragChange}
              blockLabels={blockLabels} duplicateLabel={duplicateLabel}
              multiSelectedIds={selectedIdx===i?multiSelectedIds:[]}
              onSelectMany={ids=>onSelectMany(i,ids)}
              onDuplicateRequest={ids=>onDuplicateRequest(i,ids)}
              previewScrollRef={previewScrollRef}
            />
          </SectionWrapper>
          {secDragSrc===null&&<SectionGap insertAt={i+1} profileType={profileType} pri={pri} onAdd={onAddSection}/>}
        </div>
      ))}
      <footer style={{padding:"2rem",textAlign:"center",fontSize:"0.75rem",color:`${txt}30`,background:bg}}>Créé avec <span style={{color:pri}}>Folyo</span></footer>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function SectionWrapper({ children, section, selected, isDragging, onClick, onRemove, pri, draggable: isDraggable, onDragStart, onDragEnd, onDragOver, onDrop }: {
  children:React.ReactNode; section:VSection;
  selected:boolean; isDragging:boolean; onClick:()=>void; onRemove?:()=>void; pri:string;
  draggable:boolean; onDragStart:()=>void; onDragEnd:()=>void; onDragOver:()=>void; onDrop:()=>void;
}) {
  const [hov, setHov] = useState(false);
  // useRef = synchrone : mis à true au mousedown sur le handle, vérifié dans onDragStart.
  // draggable reste toujours true ; si le drag ne vient pas du handle, on l'annule.
  const handleHeld = useRef(false);
  const show = hov||selected;
  return (
    <div
      draggable={isDraggable}
      onDragStart={e=>{
        if (!handleHeld.current) { e.preventDefault(); return; }
        e.dataTransfer.effectAllowed="move"; onDragStart();
      }}
      onDragEnd={()=>{ handleHeld.current=false; onDragEnd(); }}
      onDragOver={e=>{e.preventDefault();onDragOver();}}
      onDrop={e=>{e.preventDefault();onDrop();}}
      style={{position:"relative",cursor:"default",outline:selected?`2px solid ${pri}`:hov?`2px dashed ${pri}55`:"none",outlineOffset:-2,opacity:isDragging?0.45:1,transition:"opacity 0.15s"}}
      onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}>
      {show&&(
        <div style={{position:"absolute",top:10,right:10,zIndex:20,display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
          {isDraggable&&(
            <span
              title="Glisser la section"
              onMouseDown={e=>{ e.stopPropagation(); handleHeld.current=true; }}
              onMouseUp={()=>{ handleHeld.current=false; }}
              style={{background:`${pri}22`,color:pri,borderRadius:6,width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,cursor:"grab",userSelect:"none"}}>
              ⠿
            </span>
          )}
          <span style={{background:pri,color:"#1c1917",borderRadius:6,padding:"0 8px",height:28,display:"flex",alignItems:"center",fontSize:"0.65rem",fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase",cursor:"pointer"}} onClick={onClick}>Éditer →</span>
          {onRemove&&<button onClick={onRemove} style={{background:"#dc2626",color:"#fff",border:"none",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
        </div>
      )}
      {show&&(
        <div style={{position:"absolute",top:10,left:10,zIndex:20,background:`${pri}22`,borderRadius:6,padding:"3px 8px"}}>
          <span style={{fontSize:"0.625rem",fontWeight:700,color:pri,textTransform:"uppercase",letterSpacing:"0.08em"}}>{(section as {section_title?:string}).section_title??section.type}</span>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Contenu natif d'une section (partagé éditeur : rendu dans l'item de grille) ─
function NativeSectionContent({ section, bg, txt, pri, hFont }: {
  section:VSection; bg:string; txt:string; pri:string; hFont:string;
}) {
  switch (section.type) {
    case "about": return (
      <>
        <p style={{fontSize:"1rem",lineHeight:1.75,color:`${txt}cc`}}><RichText html={section.content}/></p>
        {section.highlight&&<p style={{marginTop:"1rem",borderLeft:`3px solid ${pri}`,paddingLeft:"1rem",color:pri,fontStyle:"italic"}}><RichText html={section.highlight}/></p>}
      </>
    );
    case "skills": {
      const hide=(section as {hide_level?:boolean}).hide_level===true;
      return hide
        ? <div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem"}}>{section.items.map(s=><div key={s.name} style={{border:`1px solid ${pri}30`,borderRadius:"2rem",padding:"0.4rem 1rem",background:`${pri}0a`}}><span style={{fontWeight:600,fontSize:"0.8125rem",color:txt}}><RichText html={s.name}/></span>{s.category&&<span style={{fontSize:"0.7rem",color:`${txt}50`,marginLeft:"0.375rem"}}><RichText html={s.category}/></span>}</div>)}</div>
        : <div style={{display:"grid",gap:"0.625rem",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))"}}>{section.items.map(s=><div key={s.name} style={{border:`1px solid ${txt}12`,borderRadius:"0.75rem",padding:"0.875rem",background:`${txt}04`}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.375rem"}}><span style={{fontWeight:600,fontSize:"0.8125rem",color:txt}}><RichText html={s.name}/></span><span style={{fontSize:"0.7rem",color:pri}}>{s.level}/5</span></div><div style={{height:3,borderRadius:2,background:`${txt}15`}}><div style={{height:"100%",width:`${(s.level/5)*100}%`,background:pri,borderRadius:2}}/></div><span style={{fontSize:"0.7rem",color:`${txt}50`,marginTop:"0.25rem",display:"block"}}><RichText html={s.category}/></span></div>)}</div>;
    }
    case "projects": return (
      <div style={{display:"grid",gap:"1.25rem",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))"}}>
        {section.items.map(p=>{const img=(p as {image_url?:string}).image_url;return(<div key={p.name} style={{border:`1px solid ${txt}12`,borderRadius:"1rem",overflow:"hidden",background:`${txt}03`}}>{img?<img src={img} alt={stripRichTags(p.name)} style={{width:"100%",height:180,objectFit:"cover",display:"block"}}/>:null}<div style={{padding:"1.25rem"}}><h3 style={{fontWeight:600,color:txt,fontSize:"0.9375rem",marginBottom:"0.5rem"}}><RichText html={p.name}/></h3><p style={{fontSize:"0.8125rem",color:`${txt}80`,marginBottom:"0.625rem",lineHeight:1.6}}><RichText html={p.description}/></p><div style={{display:"flex",flexWrap:"wrap",gap:"0.375rem"}}>{p.tech_stack.map(t=><span key={t} style={{fontSize:"0.7rem",padding:"0.2rem 0.5rem",borderRadius:"0.3rem",background:`${pri}18`,color:pri}}>{t}</span>)}</div></div></div>);})}
      </div>
    );
    case "experience": return (
      <div style={{display:"flex",flexDirection:"column",gap:"1.75rem"}}>
        {section.items.map(exp=><div key={exp.company} style={{borderLeft:`2px solid ${pri}30`,paddingLeft:"1.25rem",position:"relative"}}><div style={{position:"absolute",left:-5,top:4,width:8,height:8,borderRadius:"50%",background:pri}}/><div style={{display:"flex",flexWrap:"wrap",gap:"0.5rem",marginBottom:"0.2rem"}}><span style={{fontWeight:600,color:txt,fontSize:"0.9375rem"}}><RichText html={exp.role}/></span><span style={{color:pri,fontWeight:500,fontSize:"0.9375rem"}}><RichText html={exp.company}/></span></div><p style={{fontSize:"0.75rem",color:`${txt}40`,marginBottom:"0.4rem"}}><RichText html={exp.period}/></p><p style={{fontSize:"0.8125rem",color:`${txt}80`,lineHeight:1.6}}><RichText html={exp.description}/></p></div>)}
      </div>
    );
    case "contact": return (
      <div style={{textAlign:"center"}}>
        <p style={{color:`${txt}80`,marginBottom:"1.75rem",lineHeight:1.6}}><RichText html={section.message}/></p>
        <div style={{display:"inline-block",background:pri,color:"#fff",padding:"0.875rem 2rem",borderRadius:"0.75rem",fontWeight:600,marginBottom:"1.75rem"}}>{section.email}</div>
        <div style={{display:"flex",justifyContent:"center",gap:"1.5rem"}}>{section.links.map(l=><span key={l.label} style={{fontSize:"0.875rem",color:`${txt}60`}}>{l.label}</span>)}</div>
      </div>
    );
    default: return null;
  }
}

const SECTION_TITLE_FALLBACK: Record<string,string> = { about:"À propos", skills:"Compétences", projects:"Projets", experience:"Expérience", contact:"Contact" };
// ── Titre d'une section (item de grille "section_title") — texte réel dans
// section.section_title, avec repli par type + alignement (section.title_align).
function SectionTitleContent({ section, hFont, txt }: { section:VSection; hFont:string; txt:string }) {
  const s = section as { section_title?:string; title_align?:"left"|"center"|"right" };
  return (
    <h2 style={{fontFamily:hFont,fontSize:"1.75rem",fontWeight:700,color:txt,width:"100%",textAlign:s.title_align??(section.type==="contact"?"center":"left")}}>
      {s.section_title?<RichText html={s.section_title}/>:(SECTION_TITLE_FALLBACK[section.type]??section.type)}
    </h2>
  );
}

// ── Section render ─────────────────────────────────────────────────────────────
function SectionRender({ section, meta, theme, bg, txt, pri, acc, hFont, sectionIdx, editMode, widgetStyle, selectedBlock, onSelectBlock, onSelectNative, onRemoveBlock, onAddBlock, onCommitLayout, onGridDragChange, blockLabels, duplicateLabel, multiSelectedIds, onSelectMany, onDuplicateRequest, previewScrollRef }: {
  section:VSection; meta:VMeta; theme:VTheme;
  bg:string; txt:string; pri:string; acc:string; hFont:string;
  sectionIdx:number; editMode:boolean; widgetStyle:WidgetStyle; selectedBlock:string|null;
  onSelectBlock:(id:string)=>void; onSelectNative:()=>void; onRemoveBlock:(id:string)=>void;
  onAddBlock:(type:ContentBlock["type"])=>void;
  onCommitLayout:(layout:Layout[])=>void;
  onGridDragChange:(active:boolean)=>void;
  blockLabels:BlockLabels; duplicateLabel:string;
  multiSelectedIds:string[]; onSelectMany:(ids:string[])=>void;
  onDuplicateRequest:(ids:string[])=>void;
  previewScrollRef:React.RefObject<HTMLDivElement>;
}) {
  // Le rectangle de sélection doit pouvoir démarrer depuis n'importe où dans
  // la section visible, y compris la marge de centrage autour de la colonne
  // 960px (où gridWrapRef, dans GridBlocksArea, ne s'étend pas) — on attache
  // donc AUSSI le mousedown sur <section> (pleine largeur), relayé au même
  // handler via ce ref. draggable={false} évite que ce mousedown plus large
  // ne relance le drag HTML natif de réordonnancement de section (même
  // correctif que sur gridWrapRef).
  const gridBlocksRef = useRef<GridBlocksAreaHandle>(null);
  const onSectionMouseDown = (e: React.MouseEvent) => gridBlocksRef.current?.onSectionMouseDown(e);

  const blocksArea = (
    <GridBlocksArea
      ref={gridBlocksRef}
      items={getGrid(section)} editMode={editMode}
      selectedId={selectedBlock}
      widgetStyle={widgetStyle}
      pri={pri} bg={bg} txt={txt} hFont={hFont}
      renderNative={()=> <NativeSectionContent section={section} bg={bg} txt={txt} pri={pri} hFont={hFont}/>}
      renderTitle={()=> <SectionTitleContent section={section} hFont={hFont} txt={txt}/>}
      onSelect={onSelectBlock}
      onSelectNative={onSelectNative}
      onRemove={onRemoveBlock}
      onAddBlock={onAddBlock}
      onCommitLayout={onCommitLayout}
      onGridDragChange={onGridDragChange}
      blockLabels={blockLabels} duplicateLabel={duplicateLabel}
      multiSelectedIds={multiSelectedIds}
      onSelectMany={onSelectMany}
      onDuplicateRequest={onDuplicateRequest}
      previewScrollRef={previewScrollRef}
    />
  );

  switch (section.type) {
    case "hero": {
      const heroImg=theme.hero_image_url, overlay=theme.overlay_opacity??0.8;
      const heroImages=theme.hero_images??[];
      const hasCarousel=heroImages.length>0;
      return (
        <section draggable={false} onMouseDown={onSectionMouseDown} onClick={e=>e.stopPropagation()} style={{position:"relative",minHeight:"90vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"6rem 1.5rem 3rem",textAlign:"center",backgroundImage:!hasCarousel&&heroImg?`url(${heroImg})`:undefined,backgroundSize:"cover",backgroundPosition:"center"}}>
          {hasCarousel&&<HeroBackgroundCarousel images={heroImages} intervalSeconds={theme.hero_interval??5}/>}
          {(hasCarousel||heroImg)&&<div style={{position:"absolute",inset:0,background:bg,opacity:overlay}}/>}
          <div style={{position:"relative",zIndex:1,display:"flex",flexDirection:"column",alignItems:"center",maxWidth:640,width:"100%"}}>
            {meta.avatar_url&&<img src={meta.avatar_url} alt={stripRichTags(meta.name)} width={88} height={88} style={{borderRadius:"50%",marginBottom:"1.5rem",border:`2px solid ${pri}`,objectFit:"cover"}}/>}
            <h1 style={{fontSize:"clamp(2rem,5vw,3.5rem)",fontWeight:700,fontFamily:hFont,color:txt,marginBottom:"0.75rem",lineHeight:1.1}}><RichText html={section.title||meta.name}/></h1>
            <p style={{fontSize:"1.0625rem",fontWeight:500,color:pri,marginBottom:"0.5rem"}}><RichText html={meta.title}/></p>
            <p style={{fontSize:"1rem",color:`${txt}70`,maxWidth:520,marginBottom:"2.5rem",lineHeight:1.6}}><RichText html={section.subtitle||meta.tagline}/></p>
            <div style={{display:"flex",gap:"0.875rem",flexWrap:"wrap",justifyContent:"center"}}>
              <span style={{background:pri,color:"#fff",padding:"0.75rem 1.75rem",borderRadius:"0.75rem",fontWeight:600,fontSize:"0.875rem"}}><RichText html={section.cta_text}/></span>
              {meta.github_url&&<span style={{border:`1px solid ${txt}20`,color:`${txt}80`,padding:"0.75rem 1.75rem",borderRadius:"0.75rem",fontSize:"0.875rem"}}>GitHub →</span>}
            </div>
            {blocksArea}
          </div>
        </section>
      );
    }
    case "about": return (
      <section draggable={false} onMouseDown={onSectionMouseDown} onClick={e=>e.stopPropagation()} style={{padding:"5rem 1.5rem",background:`${bg}f0`}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          {blocksArea}
        </div>
      </section>
    );
    case "skills": return (
      <section draggable={false} onMouseDown={onSectionMouseDown} onClick={e=>e.stopPropagation()} style={{padding:"5rem 1.5rem",background:bg}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          {blocksArea}
        </div>
      </section>
    );
    case "projects": return (
      <section draggable={false} onMouseDown={onSectionMouseDown} onClick={e=>e.stopPropagation()} style={{padding:"5rem 1.5rem",background:`${bg}f0`}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          {blocksArea}
        </div>
      </section>
    );
    case "experience": return (
      <section draggable={false} onMouseDown={onSectionMouseDown} onClick={e=>e.stopPropagation()} style={{padding:"5rem 1.5rem",background:bg}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          {blocksArea}
        </div>
      </section>
    );
    case "contact": return (
      <section draggable={false} onMouseDown={onSectionMouseDown} onClick={e=>e.stopPropagation()} style={{padding:"5rem 1.5rem",background:`${bg}f0`}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          {blocksArea}
        </div>
      </section>
    );
    default: return null;
  }
}

// ── Image resize ──────────────────────────────────────────────────────────────
function resizeImage(file:File,maxPx=400,quality=0.85):Promise<string> {
  return new Promise(r=>{const fr=new FileReader();fr.onload=e=>{const img=new Image();img.onload=()=>{const sc=Math.min(maxPx/img.width,maxPx/img.height,1);const c=document.createElement("canvas");c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);c.getContext("2d")!.drawImage(img,0,0,c.width,c.height);r(c.toDataURL("image/jpeg",quality));};img.src=e.target?.result as string;};fr.readAsDataURL(file);});
}

// ── Chips de suggestions contextuelles ─────────────────────────────────────────
function SuggestionChips({ label, items, pri, onPick }: { label:string; items:string[]; pri:string; onPick:(v:string)=>void }) {
  if (items.length===0) return null;
  return (
    <div style={{marginBottom:"0.875rem"}}>
      <p style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"#a09a94",marginBottom:"0.375rem"}}>💡 {label}</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:"0.3rem"}}>
        {items.map((s,i)=>(
          <button key={i} onClick={()=>onPick(s)}
            style={{padding:"0.25rem 0.55rem",fontSize:"0.6875rem",background:`${pri}0d`,border:`1px solid ${pri}30`,borderRadius:"1rem",color:pri,cursor:"pointer",fontWeight:500}}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Sélecteur d'illustrations décoratives (alternative à une vraie photo) ──────
function IllustrationPicker({ items, pri, onPick }: { items:Illustration[]; pri:string; onPick:(url:string)=>void }) {
  return (
    <div style={{marginBottom:"0.875rem"}}>
      <p style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:"#a09a94",marginBottom:"0.375rem"}}>🎨 Illustrations (sans photo)</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.375rem"}}>
        {items.map(ill=>(
          <button key={ill.id} onClick={()=>onPick(ill.icon(pri))}
            style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.2rem",padding:"0.375rem",background:"white",border:"1px solid rgba(0,0,0,0.08)",borderRadius:"0.4rem",cursor:"pointer"}}>
            <img src={ill.icon(pri)} alt={ill.label} width={30} height={30}/>
            <span style={{fontSize:"0.55rem",color:"#78716c",fontWeight:500}}>{ill.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Block editor (right panel) ─────────────────────────────────────────────────
function BlockEditor({ block, pri, profileType, meta, onUpdate, onRemove, onBack, onMoveAcrossNative, blockLabels }: {
  block:ContentBlock;
  pri:string; profileType:string; meta:VMeta; onUpdate:(b:ContentBlock)=>void; onRemove:()=>void;
  onBack:()=>void;
  onMoveAcrossNative?:(dir:"above"|"below")=>void;
  blockLabels:BlockLabels;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scrapeState, setScrapeState] = useState<{loading:"yt"|"gh"|null; error:string|null}>({loading:null, error:null});
  if (!block) return null;

  const fmt = (n:number) => n.toLocaleString("fr-FR");
  async function fetchYoutubeStats() {
    if (block.type!=="stats" || !meta.youtube_url) return;
    setScrapeState({loading:"yt", error:null});
    try {
      const handle = extractYoutubeHandle(meta.youtube_url);
      const res = await fetch(`/api/youtube/fetch?handle=${encodeURIComponent(handle)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de récupérer la chaîne YouTube");
      const yt = data.youtubeData as { subscriberCount:number; videoCount:number; viewCount?:number };
      const scraped = [
        { label:"Abonnés", value:fmt(yt.subscriberCount) },
        { label:"Titres sortis", value:fmt(yt.videoCount) },
        ...(yt.viewCount ? [{ label:"Vues YouTube", value:fmt(yt.viewCount) }] : []),
      ];
      const kept = block.items.filter(it=>!scraped.some(s=>s.label===it.label));
      onUpdate({ ...block, items:[...scraped, ...kept].slice(0,6) });
      setScrapeState({loading:null, error:null});
    } catch (e) {
      setScrapeState({loading:null, error:(e as Error).message});
    }
  }
  async function fetchGithubStats() {
    if (block.type!=="stats" || !meta.github_url) return;
    setScrapeState({loading:"gh", error:null});
    try {
      const username = extractGithubUsername(meta.github_url);
      const res = await fetch(`/api/github/fetch?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de récupérer le profil GitHub");
      const gh = data.githubData as { followers:number; public_repos:number; repos:{stargazers_count:number}[] };
      const stars = gh.repos.reduce((s,r)=>s+r.stargazers_count,0);
      const scraped = [
        { label:"Abonnés", value:fmt(gh.followers) },
        { label:"Repos GitHub", value:fmt(gh.public_repos) },
        { label:"Stars GitHub", value:fmt(stars) },
      ];
      const kept = block.items.filter(it=>!scraped.some(s=>s.label===it.label));
      onUpdate({ ...block, items:[...scraped, ...kept].slice(0,6) });
      setScrapeState({loading:null, error:null});
    } catch (e) {
      setScrapeState({loading:null, error:(e as Error).message});
    }
  }
  return (
    <div style={{padding:"1.25rem"}}>
      <button onClick={onBack} style={{color:"#a09a94",background:"none",border:"none",cursor:"pointer",fontSize:"0.8rem",marginBottom:"1rem",display:"flex",alignItems:"center",gap:"0.375rem"}}>← Section</button>
      <h2 style={{fontSize:"0.8125rem",fontWeight:600,color:"#1c1917",marginBottom:"1rem"}}>{blockLabel(blockLabels,block.type)}</h2>

      {/* Layout hint + repositionnement rapide vs. le contenu natif */}
      <div style={{marginBottom:"1.25rem",padding:"0.625rem",background:"#f0ece6",borderRadius:"0.625rem"}}>
        <p style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#a09a94",marginBottom:"0.5rem"}}>Disposition</p>
        <p style={{fontSize:"0.675rem",color:"#a09a94",margin:0}}>💡 Glisse le widget pour le déplacer (même à côté du contenu), tire les poignées (bord droit, bas, coin) pour le redimensionner</p>
        {onMoveAcrossNative&&(
          <>
            <p style={{fontSize:"0.625rem",color:"#a09a94",margin:"0.5rem 0 0.375rem"}}>Le contenu principal peut être trop grand pour glisser par-dessus à la souris — utilise ces boutons :</p>
            <div style={{display:"flex",gap:"0.375rem"}}>
              <button onClick={()=>onMoveAcrossNative("above")}
                style={{flex:1,padding:"0.4rem",fontSize:"0.7rem",borderRadius:"0.4rem",border:"1px solid rgba(0,0,0,0.1)",background:"white",color:"#1c1917",cursor:"pointer",fontWeight:600}}>
                ↑ Au-dessus du contenu
              </button>
              <button onClick={()=>onMoveAcrossNative("below")}
                style={{flex:1,padding:"0.4rem",fontSize:"0.7rem",borderRadius:"0.4rem",border:"1px solid rgba(0,0,0,0.1)",background:"white",color:"#1c1917",cursor:"pointer",fontWeight:600}}>
                ↓ En dessous du contenu
              </button>
            </div>
          </>
        )}
      </div>

      {/* Taille du widget — dimensions physiques (image/carousel uniquement) */}
      {(block.type==="image"||block.type==="carousel")&&(()=>{
        const sz = Math.min(5, Math.max(1, block.size ?? 3));
        const setSz = (v:number) => onUpdate({ ...block, size: Math.min(5, Math.max(1, v)) });
        const btn = (dis:boolean):React.CSSProperties => ({width:30,height:30,borderRadius:"0.5rem",border:"1px solid rgba(0,0,0,0.12)",background:dis?"#f0ece6":"white",color:dis?"#c4beb6":"#1c1917",fontSize:"1rem",fontWeight:700,cursor:dis?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center"});
        return (
          <div style={{marginBottom:"1.25rem"}}>
            <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.5rem"}}>Taille de l&apos;image</label>
            <div style={{display:"flex",alignItems:"center",gap:"0.625rem"}}>
              <button onClick={()=>setSz(sz-1)} disabled={sz<=1} style={btn(sz<=1)}>−</button>
              <div style={{flex:1,display:"flex",gap:4,alignItems:"center"}}>
                {[1,2,3,4,5].map(v=>(
                  <div key={v} onClick={()=>setSz(v)}
                    style={{flex:1,height:6,borderRadius:3,background:v<=sz?pri:"rgba(0,0,0,0.08)",cursor:"pointer",transition:"background 0.15s"}}/>
                ))}
              </div>
              <button onClick={()=>setSz(sz+1)} disabled={sz>=5} style={btn(sz>=5)}>+</button>
            </div>
            <p style={{fontSize:"0.625rem",color:"#c8c4bf",marginTop:"0.3rem",marginBottom:0}}>L&apos;encombrement se règle en redimensionnant dans la grille</p>
          </div>
        );
      })()}

      {/* Largeur du cadre description du carrousel — n'a d'effet que si au
          moins une photo a une description (voir Carousel.tsx). Élargit
          aussi automatiquement le widget d'autant (VisualEditor.tsx/updateBlock),
          pour que l'image garde sa taille au lieu de rétrécir. */}
      {block.type==="carousel"&&(()=>{
        const steps = DESCRIPTION_WIDTH_STEPS;
        const current = block.descriptionWidth ?? 240;
        const idx = steps.reduce((best,v,i)=>Math.abs(v-current)<Math.abs(steps[best]-current)?i:best, 0);
        const setStep = (i:number) => onUpdate({ ...block, descriptionWidth: steps[Math.min(steps.length-1,Math.max(0,i))] });
        const btn = (dis:boolean):React.CSSProperties => ({width:30,height:30,borderRadius:"0.5rem",border:"1px solid rgba(0,0,0,0.12)",background:dis?"#f0ece6":"white",color:dis?"#c4beb6":"#1c1917",fontSize:"1rem",fontWeight:700,cursor:dis?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center"});
        return (
          <div style={{marginBottom:"1.25rem"}}>
            <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.5rem"}}>Largeur de la description</label>
            <div style={{display:"flex",alignItems:"center",gap:"0.625rem"}}>
              <button onClick={()=>setStep(idx-1)} disabled={idx<=0} style={btn(idx<=0)}>−</button>
              <div style={{flex:1,display:"flex",gap:4,alignItems:"center"}}>
                {steps.map((_,i)=>(
                  <div key={i} onClick={()=>setStep(i)}
                    style={{flex:1,height:6,borderRadius:3,background:i<=idx?pri:"rgba(0,0,0,0.08)",cursor:"pointer",transition:"background 0.15s"}}/>
                ))}
              </div>
              <button onClick={()=>setStep(idx+1)} disabled={idx>=steps.length-1} style={btn(idx>=steps.length-1)}>+</button>
            </div>
            <p style={{fontSize:"0.625rem",color:"#c8c4bf",marginTop:"0.3rem",marginBottom:0}}>Utile seulement si une photo a une description — le widget s&apos;élargit d&apos;autant</p>
          </div>
        );
      })()}

      {/* Police & taille du texte — widgets textuels (menus déroulants façon Word).
          Pour le carrousel : régit la description + la légende (proportionnelle), voir Carousel.tsx. */}
      {(block.type==="text"||block.type==="quote"||block.type==="stats"||block.type==="button"||block.type==="links"||block.type==="carousel")&&(
        <div style={{marginBottom:"1.25rem",display:"flex",gap:"0.5rem"}}>
          <div style={{flex:2}}>
            <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.375rem"}}>Police</label>
            <select value={block.fontFamily??""} onChange={e=>onUpdate({...block,fontFamily:e.target.value||undefined})}
              style={{width:"100%",padding:"0.4rem 0.5rem",fontSize:"0.7875rem",color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",outline:"none",boxSizing:"border-box"}}>
              {WIDGET_FONT_OPTIONS.map(f=><option key={f.label} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.375rem"}}>Taille</label>
            <select value={block.fontSize??""} onChange={e=>onUpdate({...block,fontSize:e.target.value?Number(e.target.value):undefined})}
              style={{width:"100%",padding:"0.4rem 0.5rem",fontSize:"0.7875rem",color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",outline:"none",boxSizing:"border-box"}}>
              <option value="">Auto</option>
              {WIDGET_FONT_SIZES.map(sz=><option key={sz} value={sz}>{sz}px</option>)}
            </select>
          </div>
        </div>
      )}

      {(block.type==="text"||block.type==="quote")&&(
        <div style={{marginBottom:"1.25rem"}}>
          <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.375rem"}}>Alignement</label>
          <div style={{display:"flex",gap:"0.375rem"}}>
            {([["left","Gauche"],["center","Centre"],["right","Droite"]] as const).map(([val,label])=>{
              const active=(block.align??"left")===val;
              const widths=val==="left"?[70,50,60]:val==="center"?[60,45,55]:[55,40,50];
              return (
                <button key={val} title={label} onClick={()=>onUpdate({...block,align:val})}
                  style={{flex:1,padding:"0.45rem 0.3rem",borderRadius:"0.4rem",border:`1px solid ${active?pri:"rgba(0,0,0,0.1)"}`,background:active?`${pri}12`:"white",cursor:"pointer",display:"flex",flexDirection:"column",gap:3,alignItems:val==="left"?"flex-start":val==="center"?"center":"flex-end"}}>
                  {widths.map((w,i)=><span key={i} style={{display:"block",height:2,width:`${w}%`,background:active?pri:"#a09a94",borderRadius:1}}/>)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {block.type==="image"&&(
        <div>
          <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.5rem"}}>Photo</label>
          {block.url&&<div style={{position:"relative",borderRadius:"0.5rem",overflow:"hidden",marginBottom:"0.5rem",height:100}}><img src={block.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/><button onClick={()=>onUpdate({...block,url:""})} style={{position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",background:"rgba(0,0,0,0.55)",color:"white",border:"none",cursor:"pointer",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div>}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{display:"none"}}
            onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const url=await resizeImage(f,1200,0.8);onUpdate({...block,url});e.target.value="";}}/>
          <button onClick={()=>fileRef.current?.click()} style={{width:"100%",padding:"0.4rem 0.625rem",fontSize:"0.7375rem",color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",cursor:"pointer",textAlign:"center",fontWeight:500,marginBottom:"0.625rem"}}>{block.url?"Changer la photo":"Choisir une photo"}</button>
          <PanelField label="Légende (optionnel)" value={block.caption??""} onChange={v=>onUpdate({...block,caption:richOrUndefined(v)})} rich/>
          <SuggestionChips label="Idées de légende" items={getImageCaptionSuggestions(profileType)} pri={pri}
            onPick={v=>onUpdate({...block,caption:v})}/>
          <IllustrationPicker items={getIllustrations(profileType)} pri={pri}
            onPick={url=>onUpdate({...block,url})}/>
        </div>
      )}
      {block.type==="carousel"&&(
        <div>
          <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.5rem"}}>Photos ({block.images.length})</label>
          {block.images.map((img,i)=>(
            <div key={i} style={{marginBottom:"0.625rem",padding:"0.5rem",background:"white",borderRadius:"0.5rem",border:"1px solid rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.5rem"}}>
                <img src={img.url} alt="" style={{width:56,height:56,borderRadius:"0.4rem",objectFit:"cover",flexShrink:0}}/>
                <button onClick={()=>onUpdate({...block,images:block.images.filter((_,j)=>j!==i)})}
                  style={{marginLeft:"auto",width:20,height:20,alignSelf:"flex-start",background:"rgba(220,38,38,0.06)",color:"#dc2626",border:"none",borderRadius:"0.3rem",cursor:"pointer",fontSize:9,fontWeight:700}}>✕</button>
              </div>
              <RichTextField value={img.caption??""}
                onChange={v=>{const imgs=block.images.map((x,j)=>j===i?{...x,caption:richOrUndefined(v)}:x);onUpdate({...block,images:imgs});}}
                placeholder="Légende (optionnel) — sert de titre si une description est ajoutée"/>
              <RichTextArea value={img.description??""} rows={3} maxLength={500}
                onChange={v=>{const imgs=block.images.map((x,j)=>j===i?{...x,description:richOrUndefined(v)}:x);onUpdate({...block,images:imgs});}}
                placeholder="Description (optionnel) — si rempli, la photo passe en 2 colonnes avec ce texte à droite"/>
              <input type="text" value={img.linkUrl??""}
                onChange={e=>{const imgs=block.images.map((x,j)=>j===i?{...x,linkUrl:e.target.value||undefined}:x);onUpdate({...block,images:imgs});}}
                placeholder="Lien cliquable (optionnel) — https://…"
                style={{width:"100%",padding:"0.4rem 0.5rem",fontSize:"0.7875rem",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{display:"none"}}
            onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const url=await resizeImage(f,1200,0.8);onUpdate({...block,images:[...block.images,{url}]});e.target.value="";}}/>
          <button onClick={()=>fileRef.current?.click()} style={{width:"100%",padding:"0.4rem 0.625rem",fontSize:"0.7375rem",color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",cursor:"pointer",textAlign:"center",fontWeight:500}}>+ Ajouter une photo</button>
        </div>
      )}
      {block.type==="text"&&(
        <div>
          <div style={{marginBottom:"0.625rem"}}>
            <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.375rem"}}>Style</label>
            <div style={{display:"flex",gap:"0.375rem"}}>
              {(["normal","lead"] as const).map(s=>(
                <button key={s} onClick={()=>onUpdate({...block,style:s})}
                  style={{flex:1,padding:"0.35rem",fontSize:"0.7rem",borderRadius:"0.4rem",border:`1px solid ${block.style===s?pri:"rgba(0,0,0,0.1)"}`,background:block.style===s?`${pri}12`:"white",color:block.style===s?pri:"#78716c",cursor:"pointer",fontWeight:block.style===s?700:400}}>
                  {s==="normal"?"Normal":"Grand (lead)"}
                </button>
              ))}
            </div>
          </div>
          <PanelTextarea label="Contenu" value={block.content} onChange={v=>onUpdate({...block,content:v})} rows={5} rich/>
          <SuggestionChips label="Idées pour démarrer" items={getTextSuggestions(profileType)} pri={pri}
            onPick={v=>onUpdate({...block,content:v})}/>
        </div>
      )}
      {block.type==="quote"&&(
        <div>
          <PanelTextarea label="Citation" value={block.text} onChange={v=>onUpdate({...block,text:v})} rows={4} rich/>
          <PanelField label="Auteur (optionnel)" value={block.author??""} onChange={v=>onUpdate({...block,author:richOrUndefined(v)})} rich/>
          <SuggestionChips label="Idées de citation" items={getQuoteSuggestions(profileType)} pri={pri}
            onPick={v=>onUpdate({...block,text:v})}/>
        </div>
      )}
      {block.type==="stats"&&(
        <div>
          <p style={{fontSize:"0.7rem",color:"#a09a94",marginBottom:"0.75rem"}}>Affichés côte à côte</p>
          {(meta.youtube_url||meta.github_url)&&(
            <div style={{marginBottom:"0.875rem",padding:"0.625rem",background:`${pri}0a`,borderRadius:"0.5rem"}}>
              <p style={{fontSize:"0.6rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",color:`${pri}`,marginBottom:"0.5rem"}}>📡 Récupérer les vraies stats</p>
              <div style={{display:"flex",gap:"0.375rem"}}>
                {meta.youtube_url&&(
                  <button onClick={fetchYoutubeStats} disabled={scrapeState.loading!==null}
                    style={{flex:1,padding:"0.4rem 0.5rem",fontSize:"0.7rem",fontWeight:600,color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.12)",borderRadius:"0.4rem",cursor:scrapeState.loading?"default":"pointer",opacity:scrapeState.loading&&scrapeState.loading!=="yt"?0.5:1}}>
                    {scrapeState.loading==="yt"?"…":"▶ YouTube"}
                  </button>
                )}
                {meta.github_url&&(
                  <button onClick={fetchGithubStats} disabled={scrapeState.loading!==null}
                    style={{flex:1,padding:"0.4rem 0.5rem",fontSize:"0.7rem",fontWeight:600,color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.12)",borderRadius:"0.4rem",cursor:scrapeState.loading?"default":"pointer",opacity:scrapeState.loading&&scrapeState.loading!=="gh"?0.5:1}}>
                    {scrapeState.loading==="gh"?"…":"⌥ GitHub"}
                  </button>
                )}
              </div>
              {scrapeState.error&&<p style={{fontSize:"0.675rem",color:"#dc2626",marginTop:"0.4rem",marginBottom:0}}>{scrapeState.error}</p>}
            </div>
          )}
          {block.items.map((item,i)=>(
            <div key={i} style={{marginBottom:"0.5rem",padding:"0.4rem",background:"white",borderRadius:"0.4rem",border:"1px solid rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",gap:"0.375rem",marginBottom:"0.375rem"}}>
                <input type="text" value={item.value} onChange={e=>{const it=[...block.items];it[i]={...item,value:e.target.value};onUpdate({...block,items:it});}}
                  placeholder="10K" style={{flex:"0 0 70px",padding:"0.4rem 0.5rem",fontSize:"0.7875rem",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",outline:"none",textAlign:"center",fontWeight:700}}/>
                <button onClick={()=>onUpdate({...block,items:block.items.filter((_,j)=>j!==i)})}
                  style={{marginLeft:"auto",width:26,height:26,flexShrink:0,background:"rgba(220,38,38,0.06)",color:"#dc2626",border:"none",borderRadius:"0.35rem",cursor:"pointer",fontSize:11,fontWeight:700}}>✕</button>
              </div>
              <RichTextField value={item.label} onChange={v=>{const it=[...block.items];it[i]={...item,label:v};onUpdate({...block,items:it});}} placeholder="Abonnés"/>
            </div>
          ))}
          {block.items.length<6&&(
            <button onClick={()=>onUpdate({...block,items:[...block.items,{value:"0",label:""}]})}
              style={{width:"100%",padding:"0.35rem",fontSize:"0.7rem",color:pri,background:`${pri}0d`,border:`1px dashed ${pri}40`,borderRadius:"0.4rem",cursor:"pointer",fontWeight:600,marginBottom:"0.75rem"}}>
              + Ajouter une stat
            </button>
          )}
          <SuggestionChips label={`Idées pour ${profileType==="musicien"?"musicien":"ton profil"}`} items={getStatsSuggestions(profileType)} pri={pri}
            onPick={label=>{
              const emptyIdx = block.items.findIndex(it=>!it.label);
              if (emptyIdx>=0) { const it=[...block.items]; it[emptyIdx]={...it[emptyIdx],label}; onUpdate({...block,items:it}); }
              else if (block.items.length<6) onUpdate({...block,items:[...block.items,{value:"0",label}]});
            }}/>
        </div>
      )}
      {block.type==="button"&&(
        <div>
          <PanelField label="Texte du bouton" value={block.label} onChange={v=>onUpdate({...block,label:v})} rich/>
          <PanelField label="Lien (URL)" value={block.url} onChange={v=>onUpdate({...block,url:v})}/>
          <div style={{marginBottom:"0.625rem"}}>
            <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.375rem"}}>Style</label>
            <div style={{display:"flex",gap:"0.375rem"}}>
              {(["primary","outline"] as const).map(s=>(
                <button key={s} onClick={()=>onUpdate({...block,variant:s})}
                  style={{flex:1,padding:"0.35rem",fontSize:"0.7rem",borderRadius:"0.4rem",border:`1px solid ${block.variant===s?pri:"rgba(0,0,0,0.1)"}`,background:block.variant===s?`${pri}12`:"white",color:block.variant===s?pri:"#78716c",cursor:"pointer",fontWeight:block.variant===s?700:400}}>
                  {s==="primary"?"Plein":"Contour"}
                </button>
              ))}
            </div>
          </div>
          <SuggestionChips label="Idées de bouton" items={getButtonSuggestions(profileType,meta).map(b=>b.label)} pri={pri}
            onPick={label=>{
              const match = getButtonSuggestions(profileType,meta).find(b=>b.label===label);
              onUpdate({...block,label,url:match&&match.url!=="#"?match.url:block.url});
            }}/>
        </div>
      )}
      {block.type==="links"&&(
        <div>
          <p style={{fontSize:"0.7rem",color:"#a09a94",marginBottom:"0.75rem"}}>Liste de liens cliquables (sites, réseaux, boutique…)</p>
          {block.items.map((lk,i)=>(
            <div key={i} style={{marginBottom:"0.625rem",padding:"0.5rem",background:"white",borderRadius:"0.5rem",border:"1px solid rgba(0,0,0,0.06)"}}>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"0.25rem"}}>
                <button onClick={()=>onUpdate({...block,items:block.items.filter((_,j)=>j!==i)})}
                  style={{width:18,height:18,background:"rgba(220,38,38,0.06)",color:"#dc2626",border:"none",borderRadius:"0.3rem",cursor:"pointer",fontSize:9,fontWeight:700}}>✕</button>
              </div>
              <RichTextField value={lk.label} onChange={v=>{const it=block.items.map((x,j)=>j===i?{...x,label:v}:x);onUpdate({...block,items:it});}}
                placeholder="Nom du lien (ex : Mon portfolio)"/>
              <input type="text" value={lk.url} onChange={e=>{const it=block.items.map((x,j)=>j===i?{...x,url:e.target.value}:x);onUpdate({...block,items:it});}}
                placeholder="https://…" style={{width:"100%",padding:"0.4rem 0.5rem",fontSize:"0.7875rem",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",outline:"none",boxSizing:"border-box"}}/>
            </div>
          ))}
          <button onClick={()=>onUpdate({...block,items:[...block.items,{label:"",url:"https://"}]})}
            style={{width:"100%",padding:"0.4rem",fontSize:"0.75rem",color:pri,background:`${pri}0d`,border:`1px dashed ${pri}40`,borderRadius:"0.5rem",cursor:"pointer",fontWeight:600}}>+ Ajouter un lien</button>
        </div>
      )}
      {block.type==="divider"&&<p style={{fontSize:"0.7875rem",color:"#a09a94",textAlign:"center",padding:"1rem 0"}}>Ligne de séparation — pas de configuration</p>}

      <div style={{marginTop:"1.5rem",paddingTop:"1rem",borderTop:"1px solid rgba(0,0,0,0.06)"}}>
        <button onClick={onRemove} style={{width:"100%",padding:"0.5rem",fontSize:"0.75rem",color:"#dc2626",background:"rgba(220,38,38,0.05)",border:"1px solid rgba(220,38,38,0.15)",borderRadius:"0.5rem",cursor:"pointer"}}>
          Supprimer ce widget
        </button>
      </div>
    </div>
  );
}

// ── Theme editor ───────────────────────────────────────────────────────────────
function ThemeEditor({ meta, theme, updateMeta, updateTheme, profileType, portfolioId, t, tShared }: {
  meta:VMeta; theme:VTheme; updateMeta:(u:Partial<VMeta>)=>void; updateTheme:(u:Partial<VTheme>)=>void;
  profileType:string; portfolioId:string; t:ReturnType<typeof getDictionary>["editor"]["theme"];
  tShared:ReturnType<typeof getDictionary>["editor"]["shared"];
}) {
  const [aiStatus, setAiStatus] = useState<"idle"|"loading"|"done"|"error">("idle");
  const [aiReason, setAiReason] = useState("");
  const [aiError, setAiError] = useState("");
  const [styleUrl, setStyleUrl] = useState("");
  const filtered = THEME_PRESETS.filter(p=>p.profile_types.includes(profileType));

  // Portfolios vedettes de la communauté (même profil) — utilisables comme style
  // de départ directement depuis l'éditeur, avec un lien pour les visiter.
  const [featured, setFeatured] = useState<CommunityItem[]|null>(null);
  const [applyingId, setApplyingId] = useState<string|null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/community/featured?profileType=${encodeURIComponent(profileType)}`)
      .then(r=>r.json()).then(d=>{ if(!cancelled) setFeatured((d.items ?? []).filter((it:CommunityItem)=>it.id!==portfolioId)); })
      .catch(()=>{ if(!cancelled) setFeatured([]); });
    return ()=>{ cancelled=true; };
  }, [profileType, portfolioId]);
  async function useCommunityStyle(id:string) {
    setApplyingId(id); setAiError("");
    try{
      const res = await fetch(`/api/community/template/${id}`);
      if(!res.ok) throw new Error();
      const { theme:t } = await res.json();
      updateTheme({ ...t, theme_preset_id: t.theme_preset_id ?? "custom" });
    } catch { setAiError(t.communityError); }
    finally { setApplyingId(null); }
  }

  async function genAiTheme() {
    setAiStatus("loading"); setAiReason(""); setAiError("");
    try{const res=await fetch(`/api/portfolio/${portfolioId}/generate-theme`,{method:"POST"});if(!res.ok)throw new Error();const{theme:t,reasoning}=await res.json();updateTheme(t);setAiReason(reasoning);setAiStatus("done");}
    catch{setAiStatus("error");}
  }
  async function genThemeFromUrl() {
    if (!styleUrl.trim()) return;
    setAiStatus("loading"); setAiReason(""); setAiError("");
    try{
      const res=await fetch(`/api/portfolio/${portfolioId}/generate-theme`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({styleUrl})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error||"Erreur");
      updateTheme(data.theme); setAiReason(data.reasoning); setAiStatus("done");
    } catch(e) { setAiStatus("error"); setAiError((e as Error).message||t.copyStyleError); }
  }
  return (
    <div style={{padding:"1.25rem"}}>
      <h2 style={{fontSize:"0.8125rem",fontWeight:600,color:"#1c1917",marginBottom:"0.25rem"}}>{t.title}</h2>
      <p style={{fontSize:"0.725rem",color:"#a09a94",marginBottom:"1.25rem"}}>{t.subtitle}</p>
      <PanelSection title={t.changeTheme}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
          <button onClick={genAiTheme} disabled={aiStatus==="loading"}
            style={{gridColumn:"1/-1",border:theme.theme_preset_id==="ai-generated"?"2px solid #c9a96e":"1px solid rgba(201,169,110,0.4)",borderRadius:"0.5rem",overflow:"hidden",cursor:aiStatus==="loading"?"wait":"pointer",background:"none",padding:0,textAlign:"left",opacity:aiStatus==="loading"?0.7:1}}>
            <div style={{height:44,background:"linear-gradient(135deg,#1c1917,#3b1f0a,#1c1917)",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem"}}>
              {aiStatus==="loading"?<span style={{fontSize:"0.75rem",color:"#c9a96e"}}>{t.aiGenerating}</span>:<><span style={{fontSize:"0.9rem"}}>✦</span><span style={{fontSize:"0.75rem",fontWeight:700,color:"#c9a96e"}}>{t.aiGenerate}</span></>}
            </div>
            <div style={{padding:"0.3rem 0.5rem",background:"white"}}><p style={{fontSize:"0.675rem",color:"#78716c",margin:0}}>{aiStatus==="done"&&aiReason?aiReason:t.aiDefaultDesc}</p></div>
          </button>

          <div style={{gridColumn:"1/-1",border:theme.theme_preset_id==="style-url"?"2px solid #c9a96e":"1px solid rgba(0,0,0,0.1)",borderRadius:"0.5rem",padding:"0.625rem",background:"#faf9f7"}}>
            <p style={{fontSize:"0.675rem",fontWeight:700,color:"#1c1917",margin:"0 0 0.375rem"}}>{t.copyStyleTitle}</p>
            <div style={{display:"flex",gap:"0.375rem"}}>
              <input type="text" value={styleUrl} onChange={e=>setStyleUrl(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();genThemeFromUrl();}}}
                placeholder={t.copyStylePlaceholder} disabled={aiStatus==="loading"}
                style={{flex:1,padding:"0.4rem 0.5rem",fontSize:"0.7375rem",color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",outline:"none",minWidth:0}}/>
              <button onClick={genThemeFromUrl} disabled={aiStatus==="loading"||!styleUrl.trim()}
                style={{padding:"0.4rem 0.75rem",fontSize:"0.7rem",fontWeight:700,color:"#1c1917",background:"#c9a96e",border:"none",borderRadius:"0.4rem",cursor:aiStatus==="loading"||!styleUrl.trim()?"default":"pointer",opacity:aiStatus==="loading"||!styleUrl.trim()?0.5:1,flexShrink:0}}>
                {aiStatus==="loading"?"…":t.copyStyleBtn}
              </button>
            </div>
            {theme.theme_preset_id==="style-url"&&aiStatus==="done"&&aiReason&&<p style={{fontSize:"0.65rem",color:"#78716c",margin:"0.375rem 0 0"}}>{aiReason}</p>}
            {aiStatus==="error"&&aiError&&<p style={{fontSize:"0.65rem",color:"#dc2626",margin:"0.375rem 0 0"}}>{aiError}</p>}
            <p style={{fontSize:"0.6rem",color:"#a09a94",margin:"0.375rem 0 0"}}>{t.copyStyleHint}</p>
          </div>

          {filtered.map(preset=>(
            <button key={preset.id}
              onClick={()=>updateTheme({primary_color:preset.primary_color,background_color:preset.background_color,text_color:preset.text_color,accent_color:preset.accent_color,font_heading:preset.font_heading,font_body:preset.font_body,style:preset.style,hero_image_url:preset.hero_image_url??undefined,overlay_opacity:preset.overlay_opacity,theme_preset_id:preset.id})}
              style={{border:theme.theme_preset_id===preset.id?"2px solid #c9a96e":"1px solid rgba(0,0,0,0.1)",borderRadius:"0.5rem",overflow:"hidden",cursor:"pointer",background:"none",padding:0,textAlign:"left"}}>
              <div style={{height:36,background:preset.background_color,display:"flex",alignItems:"center",justifyContent:"center",gap:4,padding:"0 8px"}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:preset.primary_color,flexShrink:0}}/><span style={{width:10,height:10,borderRadius:"50%",background:preset.accent_color,flexShrink:0}}/>
              </div>
              <div style={{padding:"0.3rem 0.5rem",background:"white"}}><p style={{fontSize:"0.675rem",fontWeight:600,color:"#1c1917",margin:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{preset.name}</p></div>
            </button>
          ))}
        </div>
      </PanelSection>
      {featured&&featured.length>0&&(
        <PanelSection title={t.communityTitle}>
          <p style={{fontSize:"0.675rem",color:"#a09a94",marginBottom:"0.75rem",marginTop:"-0.375rem"}}>{t.communityDesc}</p>
          <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
            {featured.map(item=>(
              <div key={item.id} style={{border:"1px solid rgba(0,0,0,0.08)",borderRadius:"0.625rem",padding:"0.625rem",background:"white"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem"}}>
                  <div style={{minWidth:0}}>
                    <p style={{fontSize:"0.75rem",fontWeight:600,color:"#1c1917",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.name}</p>
                    {item.title&&<p style={{fontSize:"0.675rem",color:"#a09a94",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</p>}
                  </div>
                  <div style={{display:"flex",gap:3,flexShrink:0,marginLeft:"0.5rem"}}>
                    {[item.theme.primary_color,item.theme.background_color,item.theme.accent_color].map((c,i)=>(
                      <span key={i} style={{width:12,height:12,borderRadius:"50%",background:c,border:"1px solid rgba(0,0,0,0.1)"}}/>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",gap:"0.375rem"}}>
                  {item.slug&&(
                    <a href={`/${item.slug}`} target="_blank" rel="noopener noreferrer"
                      style={{flex:1,padding:"0.35rem",fontSize:"0.7rem",textAlign:"center",borderRadius:"0.4rem",border:"1px solid rgba(0,0,0,0.1)",color:"#78716c",textDecoration:"none",fontWeight:500}}>
                      {t.view}
                    </a>
                  )}
                  <button onClick={()=>useCommunityStyle(item.id)} disabled={applyingId===item.id}
                    style={{flex:1,padding:"0.35rem",fontSize:"0.7rem",borderRadius:"0.4rem",border:"none",background:"rgba(201,169,110,0.12)",color:"#c9a96e",cursor:applyingId===item.id?"wait":"pointer",fontWeight:600}}>
                    {applyingId===item.id?"…":t.useStyle}
                  </button>
                </div>
              </div>
            ))}
          </div>
          {aiError&&<p style={{fontSize:"0.65rem",color:"#dc2626",marginTop:"0.5rem"}}>{aiError}</p>}
        </PanelSection>
      )}
      <PanelSection title={t.widgetStyleTitle}>
        <div style={{display:"flex",gap:"0.5rem"}}>
          {([["strict",t.widgetStyleStrict],["soft",t.widgetStyleSoft],["glass",t.widgetStyleGlass]] as const).map(([val,label])=>{
            const active=((theme as {widget_style?:WidgetStyle}).widget_style??"strict")===val;
            return (
              <button key={val} onClick={()=>updateTheme({widget_style:val} as Partial<VTheme>)}
                style={{flex:1,border:active?"2px solid #c9a96e":"1px solid rgba(0,0,0,0.1)",borderRadius:"0.5rem",overflow:"hidden",cursor:"pointer",background:"none",padding:0}}>
                <div style={{height:40,background:val==="glass"?"linear-gradient(135deg,#6d5a8f,#2d2440)":"#f8f5f0",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {val==="strict"&&<div style={{width:34,height:20,background:"white",border:"1px solid rgba(0,0,0,0.2)"}}/>}
                  {val==="soft"&&<div style={{width:34,height:20,background:"white",border:"1px solid rgba(0,0,0,0.08)",borderRadius:8,boxShadow:"0 2px 6px rgba(0,0,0,0.15)"}}/>}
                  {val==="glass"&&<div style={{width:34,height:20,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.35)",borderRadius:8,backdropFilter:"blur(4px)",boxShadow:"inset 0 1px 0 rgba(255,255,255,0.3)"}}/>}
                </div>
                <div style={{padding:"0.3rem 0.5rem",background:"white"}}><p style={{fontSize:"0.675rem",fontWeight:600,color:"#1c1917",margin:0}}>{label}</p></div>
              </button>
            );
          })}
        </div>
      </PanelSection>
      <PanelSection title={t.effectsTitle}>
        {([
          ["smooth_scroll", t.smoothScrollLabel, t.smoothScrollDesc],
          ["scroll_reveal", t.scrollRevealLabel, t.scrollRevealDesc],
          ["hero_parallax", t.heroParallaxLabel, t.heroParallaxDesc],
        ] as const).map(([key,label,desc])=>{
          const checked = (theme as unknown as Record<string,boolean|undefined>)[key] ?? false;
          const intensity = (theme as {scroll_reveal_intensity?:number}).scroll_reveal_intensity ?? 50;
          return (
            <div key={key}>
              <label style={{display:"flex",gap:"0.625rem",alignItems:"flex-start",padding:"0.5rem 0",cursor:"pointer"}}>
                <input type="checkbox" checked={checked}
                  onChange={e=>updateTheme({[key]:e.target.checked} as Partial<VTheme>)}
                  style={{marginTop:2,accentColor:"#c9a96e",width:15,height:15,cursor:"pointer",flexShrink:0}}/>
                <span>
                  <span style={{display:"block",fontSize:"0.775rem",fontWeight:600,color:"#1c1917"}}>{label}</span>
                  <span style={{display:"block",fontSize:"0.675rem",color:"#a09a94",marginTop:"0.125rem",lineHeight:1.4}}>{desc}</span>
                </span>
              </label>
              {key==="scroll_reveal"&&checked&&(
                <div style={{margin:"0 0 0.5rem 1.625rem",display:"flex",alignItems:"center",gap:"0.5rem"}}>
                  <span style={{fontSize:"0.65rem",color:"#a09a94"}}>{t.subtle}</span>
                  <input type="range" min={0} max={100} value={intensity}
                    onChange={e=>updateTheme({scroll_reveal_intensity:Number(e.target.value)} as Partial<VTheme>)}
                    style={{flex:1,accentColor:"#c9a96e",cursor:"pointer"}}/>
                  <span style={{fontSize:"0.65rem",color:"#a09a94"}}>{t.pronounced}</span>
                </div>
              )}
            </div>
          );
        })}
        <p style={{fontSize:"0.625rem",color:"#c8c4bf",marginTop:"0.375rem"}}>{t.effectsHint}</p>
      </PanelSection>
      <PanelSection title={t.customColorsTitle}>
        <ColorRow label={t.colorBg}      value={theme.background_color} onChange={v=>updateTheme({background_color:v})}/>
        <ColorRow label={t.colorText}    value={theme.text_color}       onChange={v=>updateTheme({text_color:v})}/>
        <ColorRow label={t.colorPrimary} value={theme.primary_color}    onChange={v=>updateTheme({primary_color:v})}/>
        <ColorRow label={t.colorAccent}  value={theme.accent_color}     onChange={v=>updateTheme({accent_color:v})}/>
      </PanelSection>
      <PanelSection title={t.bgImageTitle}>
        <BgImageUpload heroImageUrl={theme.hero_image_url} heroImages={theme.hero_images??[]} heroInterval={theme.hero_interval??5}
          overlayOpacity={theme.overlay_opacity??0.8} onUpdate={u=>updateTheme(u)} t={tShared}/>
      </PanelSection>
      <PanelSection title={t.identityTitle}>
        <AvatarUpload avatarUrl={meta.avatar_url} onUpdate={url=>updateMeta({avatar_url:url})} t={tShared}/>
        <PanelField label={t.fieldName}    value={meta.name}             onChange={v=>updateMeta({name:v})} rich/>
        <PanelField label={t.fieldTitle}   value={meta.title}            onChange={v=>updateMeta({title:v})} rich/>
        <PanelField label={t.fieldTagline} value={meta.tagline}          onChange={v=>updateMeta({tagline:v})} rich/>
        <PanelField label={t.fieldEmail}   value={meta.email}            onChange={v=>updateMeta({email:v})}/>
        <PanelField label={t.fieldGithub}  value={meta.github_url??""}   onChange={v=>updateMeta({github_url:v||undefined})}/>
        <PanelField label={t.fieldLinkedin} value={meta.linkedin_url??""} onChange={v=>updateMeta({linkedin_url:v||undefined})}/>
      </PanelSection>
    </div>
  );
}

// ── Panneau de sélection multiple (glisser-rectangle façon bureau) ────────────
type GroupEditorDict = ReturnType<typeof getDictionary>["editor"]["groupEditor"];
function NudgeBtn({ onClick, children }: { onClick:()=>void; children:React.ReactNode }) {
  return (
    <button onClick={onClick}
      style={{width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.5rem",cursor:"pointer",fontSize:"0.9rem",color:"#1c1917"}}>
      {children}
    </button>
  );
}
function GroupEditor({ count, onDeselect, onDelete, onDuplicate, onNudge, t }: {
  count:number; onDeselect:()=>void; onDelete:()=>void; onDuplicate:()=>void;
  onNudge:(dx:number,dy:number)=>void; t:GroupEditorDict;
}) {
  return (
    <div style={{padding:"1.25rem"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem"}}>
        <h2 style={{fontSize:"0.8125rem",fontWeight:600,color:"#1c1917"}}>{t.title(count)}</h2>
        <button onClick={onDeselect} style={{color:"#a09a94",background:"none",border:"none",cursor:"pointer",fontSize:"1rem"}}>✕</button>
      </div>
      <p style={{fontSize:"0.75rem",color:"#78716c",marginBottom:"1.25rem",lineHeight:1.5}}>{t.hint}</p>

      <div style={{marginBottom:"1.25rem"}}>
        <p style={{fontSize:"0.7rem",fontWeight:600,color:"#a09a94",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:"0.5rem"}}>{t.moveLabel}</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,32px)",gridTemplateRows:"repeat(2,32px)",gap:"0.3rem",justifyContent:"center"}}>
          <span/><NudgeBtn onClick={()=>onNudge(0,-1)}>↑</NudgeBtn><span/>
          <NudgeBtn onClick={()=>onNudge(-1,0)}>←</NudgeBtn>
          <NudgeBtn onClick={()=>onNudge(0,1)}>↓</NudgeBtn>
          <NudgeBtn onClick={()=>onNudge(1,0)}>→</NudgeBtn>
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:"0.5rem"}}>
        <button onClick={onDuplicate}
          style={{borderRadius:"0.625rem",padding:"0.6rem 1rem",fontSize:"0.8125rem",fontWeight:600,color:"#1c1917",background:"#f0ece6",border:"1px solid rgba(0,0,0,0.08)",cursor:"pointer"}}>
          {t.duplicate}
        </button>
        <button onClick={()=>{ if(confirm(t.deleteConfirm(count))) onDelete(); }}
          style={{borderRadius:"0.625rem",padding:"0.6rem 1rem",fontSize:"0.8125rem",fontWeight:600,color:"#dc2626",background:"rgba(220,38,38,0.06)",border:"1px solid rgba(220,38,38,0.15)",cursor:"pointer"}}>
          {t.delete}
        </button>
      </div>
    </div>
  );
}

// ── Section editor ─────────────────────────────────────────────────────────────

// ── Picker "parcourir tous mes repos/vidéos" (façon import Vercel) ────────────
// Le fetch de génération/rafraîchissement ne garde que le top 6 repos / 10
// vidéos ; ce picker demande la liste complète (limit=50) pour laisser le
// client choisir lui-même quoi mettre en avant, plutôt que de subir le tri
// automatique.
function repoToProject(r: GitHubRepo): ProjectItem {
  return {
    name: r.name,
    description: r.description ?? "",
    tech_stack: r.language ? [r.language] : [],
    github_url: r.html_url,
    live_url: r.homepage || undefined,
    stars: r.stargazers_count,
    image_url: "",
  };
}
function videoToProject(v: YouTubeVideo): ProjectItem {
  return {
    name: v.title,
    description: v.description ?? "",
    tech_stack: [],
    github_url: undefined,
    live_url: `https://www.youtube.com/watch?v=${v.videoId}`,
    stars: null,
    image_url: v.thumbnail ?? "",
  };
}

// Sélection à deux sens : coché = présent dans le portfolio à la validation,
// décoché = absent — pas juste un "importeur" à sens unique. Les éléments déjà
// dans le portfolio apparaissent pré-cochés (décocher les retire) ; les
// nouveaux se cochent pour les ajouter. `onApply` reçoit les items à ajouter
// et les clés (github_url / URL YouTube) des items désormais décochés à retirer.
function ProjectPicker({ kind, usernameOrHandle, existing, onClose, onApply }: {
  kind: "github" | "youtube";
  usernameOrHandle: string;
  existing: ProjectItem[];
  onClose: () => void;
  onApply: (added: ProjectItem[], removedKeys: string[]) => void;
}) {
  const [repos, setRepos]     = useState<GitHubRepo[] | null>(null);
  const [videos, setVideos]   = useState<YouTubeVideo[] | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const existingKeys = new Set(
    existing.map((p) => (kind === "github" ? p.github_url : p.live_url)).filter(Boolean) as string[]
  );
  // Pré-coché avec ce qui est déjà dans le portfolio ; décocher = retirer.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(existingKeys));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (kind === "github") {
          const res = await fetch(`/api/github/fetch?username=${encodeURIComponent(usernameOrHandle)}&limit=50`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Impossible de récupérer tes repos GitHub");
          if (!cancelled) setRepos((data.githubData?.repos ?? []) as GitHubRepo[]);
        } else {
          const res = await fetch(`/api/youtube/fetch?handle=${encodeURIComponent(usernameOrHandle)}&limit=50`);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Impossible de récupérer tes vidéos YouTube");
          if (!cancelled) setVideos((data.youtubeData?.videos ?? []) as YouTubeVideo[]);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [kind, usernameOrHandle]);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleApply() {
    const addedRepos: GitHubRepo[] = [];
    const addedVideos: YouTubeVideo[] = [];
    if (kind === "github" && repos) for (const r of repos) if (selected.has(r.html_url) && !existingKeys.has(r.html_url)) addedRepos.push(r);
    if (kind === "youtube" && videos) for (const v of videos) {
      const url = `https://www.youtube.com/watch?v=${v.videoId}`;
      if (selected.has(url) && !existingKeys.has(url)) addedVideos.push(v);
    }
    const removedKeys = Array.from(existingKeys).filter((k) => !selected.has(k));
    const added: ProjectItem[] = [...addedRepos.map(repoToProject), ...addedVideos.map(videoToProject)];

    if (!added.length && !removedKeys.length) { onClose(); return; }

    // Résumé rédigé par l'IA pour chaque nouvel élément — la description brute
    // GitHub/YouTube est souvent vide ou trop technique, contrairement aux
    // descriptions écrites par Claude à la génération initiale du portfolio.
    if (added.length) {
      setApplying(true);
      try {
        const items = [
          ...addedRepos.map((r) => ({ name: r.name, kind: "github" as const, description: r.description, language: r.language, topics: r.topics })),
          ...addedVideos.map((v) => ({ name: v.title, kind: "youtube" as const, description: v.description })),
        ];
        const res = await fetch("/api/portfolio/summarize-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.descriptions)) {
          data.descriptions.forEach((d: string, i: number) => { if (d) added[i] = { ...added[i], description: d }; });
        }
      } catch { /* best-effort — garde la description brute en repli */ }
      setApplying(false);
    }
    onApply(added, removedKeys);
  }

  const loading = kind === "github" ? repos === null : videos === null;
  const changed = selected.size !== existingKeys.size || Array.from(selected).some((k) => !existingKeys.has(k));
  const rowStyle: React.CSSProperties = { display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.5rem 0", borderBottom: "1px solid rgba(0,0,0,0.04)", cursor: "pointer" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }} onClick={onClose}>
      <div style={{ background: "white", borderRadius: "1rem", width: "100%", maxWidth: 480, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1c1917", margin: 0 }}>
              {kind === "github" ? "Tes repos GitHub" : "Tes vidéos YouTube"}
            </h3>
            <p style={{ fontSize: "0.675rem", color: "#a09a94", margin: "0.15rem 0 0" }}>Coche ce que tu veux garder dans ton portfolio, décoche le reste</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "#a09a94" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "0.25rem 1.25rem" }}>
          {error && <p style={{ fontSize: "0.75rem", color: "#dc2626", padding: "0.75rem 0" }}>{error}</p>}
          {!error && loading && <p style={{ fontSize: "0.75rem", color: "#a09a94", padding: "0.75rem 0" }}>Chargement…</p>}
          {!error && !loading && kind === "github" && repos?.length === 0 && <p style={{ fontSize: "0.75rem", color: "#a09a94", padding: "0.75rem 0" }}>Aucun repo public trouvé.</p>}
          {!error && !loading && kind === "youtube" && videos?.length === 0 && <p style={{ fontSize: "0.75rem", color: "#a09a94", padding: "0.75rem 0" }}>Aucune vidéo trouvée.</p>}
          {kind === "github" && repos?.map((r) => {
            const checked = selected.has(r.html_url);
            return (
              <label key={r.id} style={rowStyle}>
                <input type="checkbox" checked={checked} onChange={() => toggle(r.html_url)} style={{ marginTop: 3, accentColor: "#c9a96e" }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1c1917", margin: 0 }}>{r.name}</p>
                  {r.description && <p style={{ fontSize: "0.7rem", color: "#78716c", margin: "0.15rem 0 0" }}>{r.description}</p>}
                  <p style={{ fontSize: "0.65rem", color: "#a09a94", margin: "0.15rem 0 0" }}>{r.language ?? "—"}{r.stargazers_count > 0 ? ` · ★ ${r.stargazers_count}` : ""}</p>
                </div>
              </label>
            );
          })}
          {kind === "youtube" && videos?.map((v) => {
            const url = `https://www.youtube.com/watch?v=${v.videoId}`;
            const checked = selected.has(url);
            return (
              <label key={v.videoId} style={rowStyle}>
                <input type="checkbox" checked={checked} onChange={() => toggle(url)} style={{ marginTop: 3, accentColor: "#c9a96e" }} />
                {v.thumbnail && <img src={v.thumbnail} alt="" style={{ width: 56, height: 32, objectFit: "cover", borderRadius: "0.25rem", flexShrink: 0 }} />}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1c1917", margin: 0 }}>{v.title}</p>
                </div>
              </label>
            );
          })}
        </div>
        <div style={{ padding: "0.875rem 1.25rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <button onClick={handleApply} disabled={!changed || applying}
            style={{ width: "100%", padding: "0.6rem", fontSize: "0.8rem", fontWeight: 600, borderRadius: "0.5rem", border: "none", cursor: (!changed || applying) ? "default" : "pointer", background: (!changed || applying) ? "#f0ece6" : "#1c1917", color: (!changed || applying) ? "#a09a94" : "white" }}>
            {applying ? "Rédaction des résumés…" : changed ? "Appliquer la sélection" : "Aucun changement"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionEditor({ section, idx, updateSection, removeSection, onClose, meta, updateMeta, onAddBlock, onSelectBlock, onRemoveBlock, t }: {
  section:VSection; idx:number;
  updateSection:(i:number,s:VSection)=>void; removeSection:(i:number)=>void;
  onClose:()=>void; meta:VMeta; updateMeta:(u:Partial<VMeta>)=>void;
  onAddBlock:(type:ContentBlock["type"])=>void;
  onSelectBlock:(id:string)=>void;
  onRemoveBlock:(id:string)=>void;
  t:ReturnType<typeof getDictionary>["editor"];
}) {
  const update=(s:VSection)=>updateSection(idx,s);
  const [picker,setPicker]=useState<"github"|"youtube"|null>(null);
  const gridItems=sortGridItems(getGrid(section)).filter(it=>it.block.type!=="section_content"&&it.block.type!=="section_title");
  const tl:Record<string,string> = Object.fromEntries(BLOCK_SUGGESTIONS.map(s=>[s.type,`${s.icon} ${blockLabel(t.blockLabels,s.type)}`]));
  // Police & taille du contenu natif (bloc "section_content" de la grille) —
  // mêmes menus déroulants que pour les widgets ordinaires.
  const nativeItem = getGrid(section).find(it=>it.block.type==="section_content");
  const updateNativeBlock = (patch:Partial<{fontFamily:string; fontSize:number}>) => {
    if (!nativeItem) return;
    const g = getGrid(section).map(it=>it.id===nativeItem.id?{...it,block:{...it.block,...patch}}:it);
    update(applyGrid(section,g));
  };

  return (
    <div style={{padding:"1.25rem"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.25rem"}}>
        <h2 style={{fontSize:"0.8125rem",fontWeight:600,color:"#1c1917"}}>{sectionLabel(t.sectionLabels,section.type)}</h2>
        <button onClick={onClose} style={{color:"#a09a94",background:"none",border:"none",cursor:"pointer",fontSize:"1rem"}}>✕</button>
      </div>

      {section.type==="hero"&&<>
        <AvatarUpload avatarUrl={meta.avatar_url} onUpdate={url=>updateMeta({avatar_url:url})} t={t.shared}/>
        <div style={{height:1,background:"rgba(0,0,0,0.06)",margin:"0.75rem 0 1rem"}}/>
        <PanelField label={t.section.heroTitle}    value={section.title}    onChange={v=>update({...section,title:v})} rich/>
        <PanelTextarea label={t.section.heroSubtitle} value={section.subtitle} onChange={v=>update({...section,subtitle:v})} rich/>
        <PanelField label={t.section.ctaText} value={section.cta_text} onChange={v=>update({...section,cta_text:v})} rich/>
        <PanelField label={t.section.ctaUrl}  value={section.cta_url}  onChange={v=>update({...section,cta_url:v})}/>
      </>}
      {section.type!=="hero"&&<PanelField label={t.section.sectionTitle} value={(section as {section_title?:string}).section_title??""} onChange={v=>update({...section,section_title:richOrUndefined(v)} as VSection)} rich/>}
      {section.type!=="hero"&&(()=>{
        const curAlign=(section as {title_align?:"left"|"center"|"right"}).title_align??"left";
        return (
          <div style={{marginBottom:"1.25rem"}}>
            <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.375rem"}}>{t.section.titleAlign}</label>
            <div style={{display:"flex",gap:"0.375rem"}}>
              {([["left",t.section.alignLeft],["center",t.section.alignCenter],["right",t.section.alignRight]] as const).map(([val,label])=>{
                const active=curAlign===val;
                const widths=val==="left"?[70,50,60]:val==="center"?[60,45,55]:[55,40,50];
                return (
                  <button key={val} title={label} onClick={()=>update({...section,title_align:val} as VSection)}
                    style={{flex:1,padding:"0.45rem 0.3rem",borderRadius:"0.4rem",border:`1px solid ${active?"#c9a96e":"rgba(0,0,0,0.1)"}`,background:active?"rgba(201,169,110,0.08)":"white",cursor:"pointer",display:"flex",flexDirection:"column",gap:3,alignItems:val==="left"?"flex-start":val==="center"?"center":"flex-end"}}>
                    {widths.map((w,i)=><span key={i} style={{display:"block",height:2,width:`${w}%`,background:active?"#c9a96e":"#a09a94",borderRadius:1}}/>)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
      {nativeItem&&(()=>{
        const nb = nativeItem.block as {fontFamily?:string; fontSize?:number};
        return (
          <div style={{marginBottom:"1.25rem"}}>
            <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.5rem"}}>{t.section.contentFont}</label>
            <div style={{display:"flex",gap:"0.5rem"}}>
              <div style={{flex:2}}>
                <select value={nb.fontFamily??""} onChange={e=>updateNativeBlock({fontFamily:e.target.value||undefined})}
                  style={{width:"100%",padding:"0.4rem 0.5rem",fontSize:"0.7875rem",color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",outline:"none",boxSizing:"border-box"}}>
                  {WIDGET_FONT_OPTIONS.map(f=><option key={f.label} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <select value={nb.fontSize??""} onChange={e=>updateNativeBlock({fontSize:e.target.value?Number(e.target.value):undefined})}
                  style={{width:"100%",padding:"0.4rem 0.5rem",fontSize:"0.7875rem",color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",outline:"none",boxSizing:"border-box"}}>
                  <option value="">{t.section.auto}</option>
                  {WIDGET_FONT_SIZES.map(sz=><option key={sz} value={sz}>{sz}px</option>)}
                </select>
              </div>
            </div>
          </div>
        );
      })()}
      {section.type==="about"&&<>
        <PanelTextarea label={t.section.aboutContent} value={section.content}       onChange={v=>update({...section,content:v})} rows={5} rich/>
        <PanelTextarea label={t.section.aboutQuote}   value={section.highlight??""} onChange={v=>update({...section,highlight:richOrUndefined(v)})} rich/>
      </>}
      {section.type==="skills"&&<div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.875rem"}}>
          <p style={{fontSize:"0.725rem",color:"#a09a94"}}>{t.section.skillsCount(section.items.length)}</p>
          <label style={{display:"flex",alignItems:"center",gap:"0.375rem",fontSize:"0.7rem",color:"#78716c",cursor:"pointer"}}>
            <input type="checkbox" checked={(section as {hide_level?:boolean}).hide_level===true} onChange={e=>update({...section,hide_level:e.target.checked} as VSection)} style={{accentColor:"#c9a96e"}}/>{t.section.hideLevels}
          </label>
        </div>
        {section.items.map((sk,si)=>(
          <div key={si} style={{marginBottom:"0.75rem",padding:"0.75rem",background:"white",borderRadius:"0.5rem",border:"1px solid rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"0.375rem"}}>
              <button onClick={()=>update({...section,items:section.items.filter((_,j)=>j!==si)})}
                style={{width:20,height:20,background:"rgba(220,38,38,0.06)",color:"#dc2626",border:"none",borderRadius:"0.3rem",cursor:"pointer",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <PanelField label={t.section.fieldName} value={sk.name} onChange={v=>{const it=section.items.map((x,j)=>j===si?{...x,name:v}:x);update({...section,items:it});}} rich/>
            {!(section as {hide_level?:boolean}).hide_level&&<div style={{marginBottom:"0.625rem"}}><label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.2rem"}}>{t.section.levelLabel(sk.level)}</label><input type="range" min={1} max={5} value={sk.level} onChange={e=>{const it=section.items.map((x,j)=>j===si?{...x,level:Number(e.target.value)}:x);update({...section,items:it});}} style={{width:"100%",accentColor:"#c9a96e"}}/></div>}
            <PanelField label={t.section.category} value={sk.category} onChange={v=>{const it=section.items.map((x,j)=>j===si?{...x,category:v}:x);update({...section,items:it});}} rich/>
          </div>
        ))}
        <button onClick={()=>{const it=[...section.items,{name:t.section.newSkillDefault,level:3,category:t.section.newSkillCategoryDefault}];update({...section,items:it});}} style={{width:"100%",padding:"0.4rem",fontSize:"0.75rem",color:"#c9a96e",background:"rgba(201,169,110,0.08)",border:"1px dashed rgba(201,169,110,0.4)",borderRadius:"0.5rem",cursor:"pointer"}}>{t.section.addBtn}</button>
      </div>}
      {section.type==="projects"&&<div>
        {(meta.github_url||meta.youtube_url)&&(
          <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.75rem",flexWrap:"wrap"}}>
            {meta.github_url&&<button onClick={()=>setPicker("github")} style={{flex:1,minWidth:140,padding:"0.4rem 0.5rem",fontSize:"0.7rem",fontWeight:600,color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.5rem",cursor:"pointer"}}>{t.section.browseGithub}</button>}
            {meta.youtube_url&&<button onClick={()=>setPicker("youtube")} style={{flex:1,minWidth:140,padding:"0.4rem 0.5rem",fontSize:"0.7rem",fontWeight:600,color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.5rem",cursor:"pointer"}}>{t.section.browseYoutube}</button>}
          </div>
        )}
        {section.items.map((p,pi)=>{const img=(p as {image_url?:string}).image_url;return(
          <div key={pi} style={{marginBottom:"0.75rem",padding:"0.75rem",background:"white",borderRadius:"0.5rem",border:"1px solid rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem"}}>
              <p style={{fontSize:"0.7rem",fontWeight:600,color:"#a09a94",textTransform:"uppercase",letterSpacing:"0.05em",margin:0}}>{(section as {section_title?:string}).section_title??t.section.itemFallback} {pi+1}</p>
              <button onClick={()=>update({...section,items:section.items.filter((_,j)=>j!==pi)})}
                style={{width:20,height:20,background:"rgba(220,38,38,0.06)",color:"#dc2626",border:"none",borderRadius:"0.3rem",cursor:"pointer",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <ItemImageUpload imageUrl={img} onUpdate={url=>{const it=section.items.map((x,j)=>j===pi?{...x,image_url:url}:x);update({...section,items:it});}} t={t.shared}/>
            <PanelField label={t.section.fieldName} value={p.name} onChange={v=>{const it=section.items.map((x,j)=>j===pi?{...x,name:v}:x);update({...section,items:it});}} rich/>
            <PanelTextarea label={t.section.description} value={p.description} onChange={v=>{const it=section.items.map((x,j)=>j===pi?{...x,description:v}:x);update({...section,items:it});}} rich/>
            <PanelField label={t.section.tagsCsv} value={p.tech_stack.join(", ")} onChange={v=>{const it=section.items.map((x,j)=>j===pi?{...x,tech_stack:v.split(",").map(s=>s.trim()).filter(Boolean)}:x);update({...section,items:it});}}/>
          </div>
        );})}
        <button onClick={()=>{const it=[...section.items,{name:t.section.newProjectDefault,description:"",tech_stack:[],github_url:undefined,live_url:undefined,stars:null,image_url:""}];update({...section,items:it});}} style={{width:"100%",padding:"0.4rem",fontSize:"0.75rem",color:"#c9a96e",background:"rgba(201,169,110,0.08)",border:"1px dashed rgba(201,169,110,0.4)",borderRadius:"0.5rem",cursor:"pointer"}}>{t.section.addBtn}</button>
        {picker&&(()=>{
          const raw = picker==="github"?meta.github_url:meta.youtube_url;
          if (!raw) return null;
          const usernameOrHandle = picker==="github"?extractGithubUsername(raw):extractYoutubeHandle(raw);
          return (
            <ProjectPicker kind={picker} usernameOrHandle={usernameOrHandle} existing={section.items}
              onClose={()=>setPicker(null)}
              onApply={(added,removedKeys)=>{
                const keyOf = (p:ProjectItem)=>picker==="github"?p.github_url:p.live_url;
                const kept = section.items.filter(p=>{const k=keyOf(p);return !k||!removedKeys.includes(k);});
                update({...section,items:[...kept,...added]});
                setPicker(null);
              }}/>
          );
        })()}
      </div>}
      {section.type==="experience"&&<div>
        {section.items.map((exp,ei)=>(
          <div key={ei} style={{marginBottom:"0.75rem",padding:"0.75rem",background:"white",borderRadius:"0.5rem",border:"1px solid rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"0.5rem"}}>
              <p style={{fontSize:"0.7rem",fontWeight:600,color:"#a09a94",textTransform:"uppercase",letterSpacing:"0.05em",margin:0}}>{t.section.positionLabel(ei+1)}</p>
              <button onClick={()=>update({...section,items:section.items.filter((_,j)=>j!==ei)})}
                style={{width:20,height:20,background:"rgba(220,38,38,0.06)",color:"#dc2626",border:"none",borderRadius:"0.3rem",cursor:"pointer",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <PanelField label={t.section.roleLabel}    value={exp.role}        onChange={v=>{const it=section.items.map((x,j)=>j===ei?{...x,role:v}:x);update({...section,items:it});}} rich/>
            <PanelField label={t.section.companyLabel} value={exp.company}     onChange={v=>{const it=section.items.map((x,j)=>j===ei?{...x,company:v}:x);update({...section,items:it});}} rich/>
            <PanelField label={t.section.periodLabel}  value={exp.period}      onChange={v=>{const it=section.items.map((x,j)=>j===ei?{...x,period:v}:x);update({...section,items:it});}} rich/>
            <PanelTextarea label={t.section.description} value={exp.description} onChange={v=>{const it=section.items.map((x,j)=>j===ei?{...x,description:v}:x);update({...section,items:it});}} rich/>
          </div>
        ))}
        <button onClick={()=>{const it=[...section.items,{company:t.section.newCompanyDefault,role:t.section.newRoleDefault,period:t.section.newPeriodDefault,description:""}];update({...section,items:it});}} style={{width:"100%",padding:"0.4rem",fontSize:"0.75rem",color:"#c9a96e",background:"rgba(201,169,110,0.08)",border:"1px dashed rgba(201,169,110,0.4)",borderRadius:"0.5rem",cursor:"pointer"}}>{t.section.addBtn}</button>
      </div>}
      {section.type==="contact"&&<>
        <PanelField    label={t.section.contactEmail}   value={section.email}   onChange={v=>update({...section,email:v})}/>
        <PanelTextarea label={t.section.contactMessage} value={section.message} onChange={v=>update({...section,message:v})} rich/>
      </>}

      {/* ── Widgets panel ── */}
      <div style={{marginTop:"1.5rem",paddingTop:"1rem",borderTop:"1px solid rgba(0,0,0,0.06)"}}>
        <p style={{fontSize:"0.675rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#a09a94",marginBottom:"0.625rem"}}>{t.section.widgetsHeader(gridItems.length)}</p>
        {gridItems.length>0&&(
          <div style={{marginBottom:"0.5rem"}}>
            {gridItems.map(it=>(
              <div key={it.id} style={{display:"flex",alignItems:"center",gap:"0.375rem",padding:"0.35rem 0.5rem",background:"white",borderRadius:"0.5rem",border:"1px solid rgba(0,0,0,0.07)",cursor:"pointer",marginBottom:"0.3rem"}} onClick={()=>onSelectBlock(it.id)}>
                <span style={{fontSize:"0.7rem",flex:1,color:"#1c1917",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tl[it.block.type]??it.block.type}</span>
                <span style={{fontSize:"0.6rem",color:"#c8c4bf",flexShrink:0}}>{it.w}×{it.h}</span>
                <button onClick={e=>{e.stopPropagation();onRemoveBlock(it.id);}}
                  style={{width:20,height:20,border:"none",borderRadius:3,background:"rgba(220,38,38,0.08)",cursor:"pointer",fontSize:9,color:"#dc2626",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
            ))}
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.375rem"}}>
          {BLOCK_SUGGESTIONS.map(s=>(
            <button key={s.type} onClick={()=>onAddBlock(s.type)}
              style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.2rem",padding:"0.5rem 0.25rem",background:"#f8f5f0",border:"1px solid rgba(0,0,0,0.07)",borderRadius:"0.5rem",cursor:"pointer"}}
              onMouseEnter={e=>(e.currentTarget.style.background="#f0ece6")} onMouseLeave={e=>(e.currentTarget.style.background="#f8f5f0")}>
              <span style={{fontSize:"1rem"}}>{s.icon}</span>
              <span style={{fontSize:"0.6rem",color:"#78716c",fontWeight:500}}>{blockLabel(t.blockLabels,s.type)}</span>
            </button>
          ))}
        </div>
      </div>

      {section.type!=="hero"&&(
        <div style={{marginTop:"1.25rem",paddingTop:"1rem",borderTop:"1px solid rgba(0,0,0,0.06)"}}>
          <button onClick={()=>{if(confirm(t.section.deleteSectionConfirm(sectionLabel(t.sectionLabels,section.type))))removeSection(idx);}}
            style={{width:"100%",padding:"0.5rem",fontSize:"0.75rem",color:"#dc2626",background:"rgba(220,38,38,0.05)",border:"1px solid rgba(220,38,38,0.15)",borderRadius:"0.5rem",cursor:"pointer"}}>
            {t.section.deleteSectionBtn}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function AvatarUpload({ avatarUrl, onUpdate, t }: { avatarUrl?:string; onUpdate:(url:string|undefined)=>void; t:ReturnType<typeof getDictionary>["editor"]["shared"] }) {
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{marginBottom:"0.875rem"}}>
      <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.5rem"}}>{t.mainPhoto}</label>
      <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
        <div style={{width:56,height:56,borderRadius:"50%",background:"#f0ece6",border:"1px solid rgba(0,0,0,0.1)",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {avatarUrl?<img src={avatarUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:"1.375rem",color:"#c8c4bf"}}>+</span>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" style={{display:"none"}}
            onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setUp(true);try{onUpdate(await resizeImage(f));}finally{setUp(false);e.target.value="";}}}/>
          <button onClick={()=>ref.current?.click()} disabled={up}
            style={{display:"block",width:"100%",padding:"0.45rem 0.625rem",fontSize:"0.7375rem",color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",cursor:up?"wait":"pointer",marginBottom:"0.3rem",textAlign:"center",fontWeight:500}}>
            {up?t.loading:avatarUrl?t.changePhoto:t.addPhoto}
          </button>
          {avatarUrl&&<button onClick={()=>onUpdate(undefined)} style={{fontSize:"0.675rem",color:"#a09a94",background:"none",border:"none",cursor:"pointer",padding:0,width:"100%",textAlign:"center"}}>{t.removeBtn}</button>}
        </div>
      </div>
    </div>
  );
}
function BgImageUpload({ heroImageUrl, heroImages, heroInterval, overlayOpacity, onUpdate, t }: {
  heroImageUrl?:string; heroImages:string[]; heroInterval:number; overlayOpacity:number;
  onUpdate:(u:{hero_image_url?:string;hero_images?:string[];hero_interval?:number;overlay_opacity?:number})=>void;
  t:ReturnType<typeof getDictionary>["editor"]["shared"];
}) {
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  // Rétrocompatibilité : une ancienne photo de fond unique compte comme 1ère image de la galerie
  const gallery = heroImages.length>0 ? heroImages : (heroImageUrl ? [heroImageUrl] : []);
  const hasImages = gallery.length>0;

  const addImage = (url:string) => onUpdate({ hero_images:[...gallery,url], hero_image_url:undefined });
  const removeImage = (i:number) => {
    const next = gallery.filter((_,j)=>j!==i);
    onUpdate({ hero_images:next, hero_image_url:undefined });
  };

  return (
    <div style={{marginBottom:"0.875rem"}}>
      {hasImages ? (
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.4rem",marginBottom:"0.5rem"}}>
          {gallery.map((url,i)=>(
            <div key={i} style={{position:"relative",borderRadius:"0.4rem",overflow:"hidden",height:64,background:"#f0ece6"}}>
              <img src={url} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
              <button onClick={()=>removeImage(i)}
                style={{position:"absolute",top:2,right:2,width:16,height:16,borderRadius:"50%",background:"rgba(0,0,0,0.6)",color:"white",border:"none",cursor:"pointer",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{width:"100%",height:80,borderRadius:"0.5rem",background:"#f0ece6",border:"1px solid rgba(0,0,0,0.1)",marginBottom:"0.5rem",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:"0.75rem",color:"#c8c4bf"}}>{t.noBgPhoto}</span>
        </div>
      )}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" style={{display:"none"}}
        onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setUp(true);try{addImage(await resizeImage(f,1920,0.75));}finally{setUp(false);e.target.value="";}}}/>
      <button onClick={()=>ref.current?.click()} disabled={up}
        style={{width:"100%",padding:"0.4rem 0.625rem",fontSize:"0.7375rem",color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",cursor:up?"wait":"pointer",textAlign:"center",fontWeight:500,marginBottom:"0.625rem"}}>
        {up?t.loading:hasImages?t.addPhotoPlus:t.chooseFromDevice}
      </button>
      {gallery.length>1&&(
        <div style={{marginBottom:"0.625rem"}}>
          <p style={{fontSize:"0.675rem",color:"#a09a94",margin:"0 0 0.4rem"}}>{t.galleryHint(gallery.length)}</p>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.2rem"}}>
            <label style={{fontSize:"0.7rem",color:"#78716c"}}>{t.scrollSpeed}</label>
            <span style={{fontSize:"0.7rem",color:"#a09a94"}}>{heroInterval}s</span>
          </div>
          <input type="range" min={2} max={15} step={1} value={heroInterval}
            onChange={e=>onUpdate({hero_interval:Number(e.target.value)})} style={{width:"100%",accentColor:"#c9a96e"}}/>
        </div>
      )}
      {hasImages&&<div><div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.2rem"}}><label style={{fontSize:"0.7rem",color:"#78716c"}}>{t.bgOpacity}</label><span style={{fontSize:"0.7rem",color:"#a09a94"}}>{Math.round(overlayOpacity*100)}%</span></div><input type="range" min={0} max={1} step={0.05} value={overlayOpacity} onChange={e=>onUpdate({overlay_opacity:Number(e.target.value)})} style={{width:"100%",accentColor:"#c9a96e"}}/><p style={{fontSize:"0.625rem",color:"#c8c4bf",marginTop:"0.2rem"}}>{t.opacityHint}</p></div>}
    </div>
  );
}
function ItemImageUpload({ imageUrl, onUpdate, t }: { imageUrl?:string; onUpdate:(url:string|undefined)=>void; t:ReturnType<typeof getDictionary>["editor"]["shared"] }) {
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{marginBottom:"0.75rem"}}>
      <label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.375rem"}}>{t.photoLabel}</label>
      {imageUrl&&<div style={{position:"relative",borderRadius:"0.5rem",overflow:"hidden",marginBottom:"0.375rem",height:100}}><img src={imageUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/><button onClick={()=>onUpdate(undefined)} style={{position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",background:"rgba(0,0,0,0.55)",color:"white",border:"none",cursor:"pointer",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button></div>}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" style={{display:"none"}}
        onChange={async e=>{const f=e.target.files?.[0];if(!f)return;setUp(true);try{onUpdate(await resizeImage(f,800,0.75));}finally{setUp(false);e.target.value="";}}}/>
      <button onClick={()=>ref.current?.click()} disabled={up}
        style={{width:"100%",padding:"0.35rem 0.5rem",fontSize:"0.7rem",color:"#1c1917",background:"white",border:"1px dashed rgba(0,0,0,0.2)",borderRadius:"0.4rem",cursor:up?"wait":"pointer",textAlign:"center"}}>
        {up?t.loading:imageUrl?t.changePhoto:t.addPhotoPlus}
      </button>
    </div>
  );
}
function PanelSection({ title, children }: { title:string; children:React.ReactNode }) {
  return <div style={{marginBottom:"1.25rem"}}><p style={{fontSize:"0.675rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.08em",color:"#a09a94",marginBottom:"0.625rem"}}>{title}</p>{children}</div>;
}
function ColorRow({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.4rem 0",borderBottom:"1px solid rgba(0,0,0,0.045)"}}><label style={{fontSize:"0.7875rem",color:"#78716c"}}>{label}</label><div style={{display:"flex",alignItems:"center",gap:"0.5rem"}}><span style={{fontSize:"0.7rem",fontFamily:"monospace",color:"#a09a94"}}>{value}</span><input type="color" value={value} onChange={e=>onChange(e.target.value)} style={{width:26,height:26,border:"none",borderRadius:6,padding:0,cursor:"pointer",background:"none"}}/></div></div>;
}
// `rich` : bascule vers un champ contentEditable gras/italique
// (RichTextEditable.tsx) — réservé aux champs de prose affichée sur le
// portfolio (titres, descriptions, légendes…), jamais aux URLs/emails/listes
// structurées (ceux-là gardent le champ simple, rich=false par défaut).
function PanelField({ label, value, onChange, rich=false, maxLength }: { label:string; value:string; onChange:(v:string)=>void; rich?:boolean; maxLength?:number }) {
  if (rich) return <RichTextField label={label} value={value} onChange={onChange} maxLength={maxLength}/>;
  return <div style={{marginBottom:"0.625rem"}}><label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.2rem"}}>{label}</label><input type="text" value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"0.4rem 0.625rem",fontSize:"0.7875rem",color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",outline:"none",boxSizing:"border-box"}}/></div>;
}
function PanelTextarea({ label, value, onChange, rows=3, rich=false, maxLength }: { label:string; value:string; onChange:(v:string)=>void; rows?:number; rich?:boolean; maxLength?:number }) {
  if (rich) return <RichTextArea label={label} value={value} onChange={onChange} rows={rows} maxLength={maxLength}/>;
  return <div style={{marginBottom:"0.625rem"}}><label style={{display:"block",fontSize:"0.7rem",color:"#78716c",marginBottom:"0.2rem"}}>{label}</label><textarea value={value} onChange={e=>onChange(e.target.value)} rows={rows} style={{width:"100%",padding:"0.4rem 0.625rem",fontSize:"0.7875rem",color:"#1c1917",background:"white",border:"1px solid rgba(0,0,0,0.1)",borderRadius:"0.4rem",outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/></div>;
}
