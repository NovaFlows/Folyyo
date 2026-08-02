import { callClaude } from "./client";
import { WIDGET_FONT_OPTIONS } from "@/components/portfolio/blocks";
import { assertPublicHttpUrl } from "@/lib/security/ssrf-guard";

// Polices réellement chargées sur le site (voir @import dans app/globals.css) —
// Claude DOIT choisir dedans, sinon la police tombe silencieusement en repli système.
const AVAILABLE_FONTS = WIDGET_FONT_OPTIONS.map((f) => f.label).filter((l) => l !== "Police du thème");

export interface UrlDerivedTheme {
  primary_color: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  font_heading: string;
  font_body: string;
  style: "dark-code" | "minimal-gallery" | "fullscreen-hero";
  overlay_opacity: number;
  reasoning: string;
}

const HEX_RE = /#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi;
const RGB_RE = /rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/gi;
const FONT_FAMILY_RE = /font-family\s*:\s*([^;{}]+)/gi;
const GOOGLE_FONT_RE = /fonts\.googleapis\.com\/css2?\?[^"')\s]*family=([^"'&)\s]+)/gi;
const GENERIC_FONT_TOKENS = new Set([
  "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui",
  "-apple-system", "blinkmacsystemfont", "segoe ui", "helvetica", "helvetica neue",
  "arial", "sans", "ui-sans-serif", "ui-serif", "ui-monospace", "roboto", "inherit", "initial",
]);

function toHex3or6(h: string): string {
  const s = h.replace("#", "").toLowerCase();
  if (s.length === 3) return "#" + s.split("").map((c) => c + c).join("");
  return "#" + s;
}
function rgbToHex(r: string, g: string, b: string): string {
  const n = (v: string) => Math.min(255, parseInt(v, 10)).toString(16).padStart(2, "0");
  return `#${n(r)}${n(g)}${n(b)}`;
}

function topByFrequency(items: string[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    await assertPublicHttpUrl(url); // SSRF : rejette IP privée/loopback/link-local
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        // Beaucoup de sites bloquent les requêtes sans UA "navigateur" (ex. 403 sur own.page vu en session)
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,text/css,*/*",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Extrait couleurs/polices dominantes d'une page (best-effort — jamais bloquant :
// si le site refuse le scraping ou time out, on redescend sur la seule connaissance
// de marque de Claude via le domaine, cf. generateThemeFromUrl).
async function scrapeSiteSignals(pageUrl: string): Promise<{
  title: string; colors: string[]; fonts: string[];
} | null> {
  const html = await fetchText(pageUrl, 8000);
  if (!html) return null;

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch?.[1]?.trim().slice(0, 120) ?? "";

  // CSS inline + jusqu'à 2 feuilles de style liées (best-effort, budget de temps/texte borné)
  let cssBlob = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) ?? []).join("\n");
  // rel="stylesheet" et href="…" apparaissent dans un ordre variable selon les sites/CMS —
  // on isole d'abord chaque balise <link>, puis on cherche les deux attributs dedans.
  const linkHrefs = Array.from(html.matchAll(/<link\s+[^>]*>/gi))
    .map((m) => m[0])
    .filter((tag) => /rel=["']stylesheet["']/i.test(tag))
    .map((tag) => tag.match(/href=["']([^"']+)["']/i)?.[1])
    .filter((h): h is string => Boolean(h))
    .slice(0, 2);
  for (const href of linkHrefs) {
    try {
      const abs = new URL(href, pageUrl).toString();
      const css = await fetchText(abs, 4000);
      if (css) cssBlob += "\n" + css.slice(0, 20000);
    } catch { /* URL relative invalide — ignoré */ }
  }
  cssBlob = cssBlob.slice(0, 60000);
  // Le HTML lui-même peut contenir des couleurs inline (style="...") et des <link> Google Fonts
  const searchBlob = cssBlob + "\n" + html.slice(0, 20000);

  const hexColors = (searchBlob.match(HEX_RE) ?? []).map(toHex3or6);
  const rgbColors = Array.from(searchBlob.matchAll(RGB_RE)).map((m) => rgbToHex(m[1], m[2], m[3]));
  const colors = topByFrequency([...hexColors, ...rgbColors], 12);

  const fontFamilies = Array.from(searchBlob.matchAll(FONT_FAMILY_RE))
    .flatMap((m) => m[1].split(","))
    .map((f) => f.trim().replace(/^["']|["']$/g, ""))
    .filter((f) => f && !GENERIC_FONT_TOKENS.has(f.toLowerCase()));
  const googleFonts = Array.from(searchBlob.matchAll(GOOGLE_FONT_RE))
    .map((m) => decodeURIComponent(m[1]).replace(/\+/g, " ").split(":")[0]);
  const fonts = topByFrequency([...fontFamilies, ...googleFonts], 5);

  return { title, colors, fonts };
}

// Génère un thème (couleurs/police/style) inspiré du style visuel d'un site donné
// par son URL. Ne copie jamais d'images/contenu du site source — uniquement
// l'identité visuelle (palette, typographie, ambiance). Retourne null si Claude
// échoue à produire un résultat exploitable ; les erreurs réseau du scraping,
// elles, dégradent silencieusement vers la seule connaissance de la marque par
// Claude plutôt que de faire échouer toute la génération.
export async function generateThemeFromUrl(rawUrl: string): Promise<UrlDerivedTheme | null> {
  let url: string;
  try {
    url = /^https?:\/\//i.test(rawUrl.trim()) ? rawUrl.trim() : `https://${rawUrl.trim()}`;
    new URL(url); // valide le format, lève sinon
  } catch {
    return null;
  }
  const domain = new URL(url).hostname.replace(/^www\./, "");

  const signals = await scrapeSiteSignals(url);
  const signalsBlock = signals && (signals.colors.length || signals.fonts.length)
    ? `SIGNAUX TECHNIQUES DÉTECTÉS SUR LA PAGE :
- Titre de page : ${signals.title || "—"}
- Couleurs dominantes trouvées dans le CSS : ${signals.colors.join(", ") || "aucune détectée"}
- Polices détectées : ${signals.fonts.join(", ") || "aucune détectée"}
(Ces couleurs incluent probablement du bruit — texte gris, bordures, etc. Utilise ton jugement pour isoler l'identité de marque : fond dominant, couleur d'accent caractéristique.)`
    : `Le site n'a pas pu être analysé techniquement (protection anti-bot, timeout…). Base-toi UNIQUEMENT sur ta connaissance de ce site/cette marque si tu la reconnais.`;

  const prompt = `Tu es un directeur artistique expert. Un utilisateur veut que son portfolio s'inspire du style visuel du site "${domain}".

${signalsBlock}

Ta mission : proposer un thème de portfolio qui capture l'ESPRIT visuel de ce site (ambiance, contraste, sophistication, minimalisme ou exubérance) — PAS une copie pixel-perfect, et surtout jamais leurs logos/images/textes réels. Pense "s'inspire de" et non "clone de".

CONTRAINTE STRICTE — polices : tu dois choisir font_heading et font_body UNIQUEMENT parmi cette liste (aucune autre police ne sera chargée sur le site) :
${AVAILABLE_FONTS.join(", ")}
Choisis la police de cette liste qui se rapproche le plus en esprit de ce que tu observes/sais du site.

Assure-toi que le texte reste LISIBLE sur le fond (contraste suffisant, ce n'est pas négociable même si le site source a un design audacieux).

Réponds UNIQUEMENT avec ce JSON, sans texte autour :
{
  "primary_color": "#RRGGBB",
  "background_color": "#RRGGBB",
  "text_color": "#RRGGBB",
  "accent_color": "#RRGGBB",
  "font_heading": "un nom exact de la liste ci-dessus",
  "font_body": "un nom exact de la liste ci-dessus",
  "style": "dark-code|minimal-gallery|fullscreen-hero",
  "overlay_opacity": 0.0,
  "reasoning": "1 phrase expliquant l'inspiration (ex: \\"Palette noir/blanc épurée et typographie géométrique inspirées de apple.com\\")"
}`;

  try {
    const raw = await callClaude("Tu es un directeur artistique expert en identité visuelle web.", prompt, 700);
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned) as UrlDerivedTheme;
    // Validation défensive : mieux vaut abandonner proprement (→ preset aléatoire côté
    // appelant) qu'empoisonner le thème avec une valeur non exploitable en aval.
    const hexOk = (v: unknown) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
    if (![parsed.primary_color, parsed.background_color, parsed.text_color, parsed.accent_color].every(hexOk)) return null;
    if (!AVAILABLE_FONTS.includes(parsed.font_heading) || !AVAILABLE_FONTS.includes(parsed.font_body)) return null;
    if (!["dark-code", "minimal-gallery", "fullscreen-hero"].includes(parsed.style)) return null;
    return parsed;
  } catch {
    return null;
  }
}
