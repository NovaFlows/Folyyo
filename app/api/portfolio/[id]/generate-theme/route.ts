import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getPortfolioById, getUserSettings } from "@/lib/db/queries";
import { callClaude } from "@/lib/anthropic/client";
import { generateThemeFromUrl } from "@/lib/anthropic/style-from-url";
import type { ValidatedPortfolioJSON } from "@/lib/anthropic/schema";
import { hasActiveAccess } from "@/lib/billing/access";
import { stripRichTags } from "@/lib/portfolio/rich-text";

export const maxDuration = 60;

// Curated Unsplash images Claude can pick from, organised by mood/domain
const IMAGE_LIBRARY = [
  // Tech / Developer
  { id: "tech-code-dark",    url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1920&q=80", tags: ["developer","code","terminal","dark","programming"] },
  { id: "tech-blue",         url: "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?auto=format&fit=crop&w=1920&q=80", tags: ["developer","tech","blue","data","network"] },
  { id: "tech-purple",       url: "https://images.unsplash.com/photo-1534972195531-d236914979bd?auto=format&fit=crop&w=1920&q=80", tags: ["developer","synthwave","purple","neon","creative"] },
  { id: "tech-space",        url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1920&q=80", tags: ["developer","space","dark","minimal","stars"] },
  { id: "tech-server",       url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1920&q=80", tags: ["developer","server","infrastructure","dark","tech"] },
  { id: "tech-minimal-desk", url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1920&q=80", tags: ["developer","desk","laptop","minimal","light","clean"] },
  // Art / Creative
  { id: "art-studio-dark",   url: "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=1920&q=80", tags: ["artist","studio","dark","creative","paint"] },
  { id: "art-gallery",       url: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1920&q=80", tags: ["artist","gallery","white","exhibition","minimal"] },
  { id: "art-bold",          url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80", tags: ["artist","bold","colour","abstract","creative"] },
  { id: "art-photography",   url: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?auto=format&fit=crop&w=1920&q=80", tags: ["artist","photography","camera","dark","moody"] },
  // Fashion
  { id: "fashion-luxe",      url: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1920&q=80", tags: ["fashion","luxury","editorial","light","elegant"] },
  { id: "fashion-noir",      url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1920&q=80", tags: ["fashion","dark","noir","editorial","dramatic"] },
  { id: "fashion-rose",      url: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1920&q=80", tags: ["fashion","pink","rose","feminine","editorial"] },
  { id: "fashion-street",    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1920&q=80", tags: ["fashion","street","urban","modern","cool"] },
  // Nature / Other
  { id: "nature-forest",     url: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1920&q=80", tags: ["nature","forest","green","calm","organic"] },
  { id: "nature-mountains",  url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80", tags: ["nature","mountains","adventure","epic","travel"] },
  { id: "office-warm",       url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1920&q=80", tags: ["office","warm","professional","editorial","light"] },
  { id: "abstract-dark",     url: "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=1920&q=80", tags: ["abstract","dark","geometric","modern","bold"] },
];

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const portfolio = await getPortfolioById(params.id, userId);
  if (!portfolio?.site_json) return NextResponse.json({ error: "Portfolio introuvable" }, { status: 404 });

  const settings = await getUserSettings(userId);
  if (!settings || !hasActiveAccess(settings)) {
    return NextResponse.json({ error: "Ton essai gratuit est terminé — abonne-toi pour continuer à éditer." }, { status: 403 });
  }

  const siteJson = portfolio.site_json as ValidatedPortfolioJSON;
  const profileType = portfolio.profile_type;

  // "Copier le style d'un site" — chemin dédié, ne touche pas au reste du thème
  // (aucune hero_image_url renvoyée : le client merge en partiel et garde la photo actuelle).
  const body = await request.json().catch(() => ({}));
  const styleUrl = typeof body?.styleUrl === "string" ? body.styleUrl.trim() : "";
  // Titre/sous-titre hero tels qu'édités côté client (potentiellement non
  // sauvegardés) — priment sur ceux figés en base pour que la génération IA
  // colle à ce que l'utilisateur voit réellement dans l'éditeur. Bornés en
  // longueur : ce texte part directement dans le prompt Claude.
  const heroTitle = typeof body?.heroTitle === "string" ? body.heroTitle.trim().slice(0, 300) : "";
  const heroSubtitle = typeof body?.heroSubtitle === "string" ? body.heroSubtitle.trim().slice(0, 500) : "";
  const heroProfession = typeof body?.heroProfession === "string" ? body.heroProfession.trim().slice(0, 200) : "";
  if (styleUrl) {
    const urlTheme = await generateThemeFromUrl(styleUrl);
    if (!urlTheme) {
      return NextResponse.json({ error: "Impossible d'analyser le style de ce site. Vérifie l'URL et réessaie." }, { status: 422 });
    }
    return NextResponse.json({
      theme: {
        primary_color: urlTheme.primary_color,
        background_color: urlTheme.background_color,
        text_color: urlTheme.text_color,
        accent_color: urlTheme.accent_color,
        font_heading: urlTheme.font_heading,
        font_body: urlTheme.font_body,
        style: urlTheme.style,
        overlay_opacity: urlTheme.overlay_opacity,
        theme_preset_id: "style-url",
      },
      reasoning: urlTheme.reasoning,
    });
  }

  const imageLibraryBlock = IMAGE_LIBRARY
    .map((img) => `  { "id": "${img.id}", "tags": [${img.tags.map(t => `"${t}"`).join(", ")}] }`)
    .join("\n");

  // Texte hero réellement affiché au visiteur (H1 + sous-titre) — signal
  // principal pour le choix d'image/ton, distinct de meta.title (le poste,
  // ex. "Développeur Full-Stack"). Priorité au texte envoyé par le client
  // (édité en mémoire, pas forcément enregistré) puis à la valeur en base.
  const heroSectionJson = siteJson.sections.find((s) => s.type === "hero");
  const dbHeroTitle = heroSectionJson?.type === "hero" ? stripRichTags(heroSectionJson.title) : "";
  const dbHeroSubtitle = heroSectionJson?.type === "hero" ? stripRichTags(heroSectionJson.subtitle) : "";
  const effectiveHeroTitle = heroTitle || dbHeroTitle || siteJson.meta.name;
  const effectiveHeroSubtitle = heroSubtitle || dbHeroSubtitle || siteJson.meta.tagline;
  // meta.title (le métier, ex. "Ingénieur Data / IA") édité en mémoire dans le
  // panneau hero de l'éditeur — même priorité que heroTitle/heroSubtitle
  // ci-dessus sur la valeur figée en base.
  const effectiveHeroProfession = heroProfession || siteJson.meta.title;

  const prompt = `Tu es un directeur artistique expert. Analyse ce portfolio et génère un thème visuel parfaitement adapté.

PROFIL : ${profileType}
NOM : ${siteJson.meta.name}
TITRE PROFESSIONNEL : ${effectiveHeroProfession}
TEXTE HERO AFFICHÉ AU VISITEUR (H1) : ${effectiveHeroTitle}
SOUS-TITRE HERO AFFICHÉ AU VISITEUR : ${effectiveHeroSubtitle}
SECTIONS : ${siteJson.sections.map(s => s.type).join(", ")}
THÈME ACTUEL : fond ${siteJson.theme.background_color}, texte ${siteJson.theme.text_color}, primaire ${siteJson.theme.primary_color}

BIBLIOTHÈQUE D'IMAGES DISPONIBLES (choisis le meilleur match) :
${imageLibraryBlock}

Génère un thème cohérent, élégant et professionnel pour ce portfolio.
Assure-toi que le texte est toujours LISIBLE sur le fond (contraste suffisant).
Si une image de fond est utilisée, l'overlay doit être entre 0.65 et 0.90.

Réponds UNIQUEMENT avec ce JSON :
{
  "primary_color": "#RRGGBB",
  "background_color": "#RRGGBB",
  "text_color": "#RRGGBB",
  "accent_color": "#RRGGBB",
  "font_heading": "string",
  "font_body": "Inter",
  "style": "dark-code|minimal-gallery|fullscreen-hero",
  "image_id": "id depuis la bibliothèque ou null",
  "overlay_opacity": 0.0,
  "reasoning": "1 phrase expliquant le choix"
}`;

  const raw = await callClaude(
    "Tu es un directeur artistique expert en design de portfolios web.",
    prompt,
    1024
  );

  let parsed: {
    primary_color: string;
    background_color: string;
    text_color: string;
    accent_color: string;
    font_heading: string;
    font_body: string;
    style: "dark-code" | "minimal-gallery" | "fullscreen-hero";
    image_id: string | null;
    overlay_opacity: number;
    reasoning: string;
  };

  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "Réponse IA invalide" }, { status: 500 });
  }

  const selectedImage = parsed.image_id ? IMAGE_LIBRARY.find(img => img.id === parsed.image_id) : null;

  return NextResponse.json({
    theme: {
      primary_color:    parsed.primary_color,
      background_color: parsed.background_color,
      text_color:       parsed.text_color,
      accent_color:     parsed.accent_color,
      font_heading:     parsed.font_heading,
      font_body:        parsed.font_body,
      style:            parsed.style,
      hero_image_url:   selectedImage?.url ?? null,
      overlay_opacity:  parsed.overlay_opacity,
      theme_preset_id:  "ai-generated",
    },
    reasoning: parsed.reasoning,
  });
}
