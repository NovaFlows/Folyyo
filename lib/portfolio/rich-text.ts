// Mise en forme minimale (gras/italique/souligné/surligné/couleur/lien)
// autorisée dans les champs texte du portfolio — stockée directement comme un
// minuscule sous-ensemble de HTML dans les mêmes champs `string` existants
// (aucun changement de schéma).
//
// sanitizeRichText NE dépend d'aucune API navigateur (pas de DOMParser) pour
// pouvoir tourner aussi bien côté client (éditeur, à chaque frappe) que côté
// serveur (rendu public, Server Component). Elle reconnaît UNIQUEMENT nos
// balises autorisées (repérées par une regex stricte à groupes nommés) et
// échappe tout le reste — y compris un chevron isolé qui traînerait dans une
// ancienne valeur en texte brut (jamais échappée avant cette fonctionnalité)
// ou un texte généré par l'IA. <b>/<i>/<u>/<br> n'acceptent aucun attribut ;
// <a> n'accepte QUE href (schéma sûr) ; les <span style="color:…"> / <span
// style="background-color:…"> (couleur/surlignage, produits par
// document.execCommand après styleWithCSS) n'acceptent QUE une valeur de
// couleur bien formée (hex ou rgb/rgba) — jamais une déclaration CSS libre.
// Un seul pattern générique pour le style du span (pas un par propriété) :
// appliquer couleur ET surlignage à la même sélection fait parfois produire
// par le navigateur UN SEUL span combinant "color:…;background-color:…" —
// un pattern par propriété isolée ne matchait jamais ce cas, et le span
// entier tombait dans l'échappement générique (balise affichée en texte
// brut). Le contenu du style est reparsé propriété par propriété ci-dessous.
// <font color="…"> (ancien format que certains navigateurs utilisent encore
// pour foreColor) est normalisé vers le même <span style="color:…">.
const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(,\s*[\d.]+\s*)?\))$/;

const TAG_RE = new RegExp(
  [
    String.raw`<\/(?<closeTag>b|i|u|strong|em|a|font|span)>`,
    String.raw`<(?<simpleTag>b|i|u|strong|em)\s*>`,
    String.raw`<br\s*\/?>`,
    String.raw`<a\s+href="(?<href>[^"]*)"[^>]*>`,
    String.raw`<font[^>]*color="(?<fontColor>[^"]+)"[^>]*>`,
    String.raw`<span\s+style="(?<spanStyle>[^"]*)"[^>]*>`,
  ].join("|"),
  "gi"
);

// Extrait color/background-color d'un style de span, dans n'importe quel
// ordre et combinaison — reconstruit un style sûr ne gardant que ces deux
// propriétés avec une valeur couleur valide (hex/rgb/rgba), tout le reste
// (déclaration CSS libre, valeur non reconnue) est silencieusement ignoré.
function safeSpanStyle(style: string): string {
  const props: string[] = [];
  for (const decl of style.split(";")) {
    const m = /^\s*(color|background-color)\s*:\s*(.+?)\s*$/.exec(decl);
    if (!m) continue;
    const value = m[2].trim();
    if (COLOR_RE.test(value)) props.push(`${m[1]}:${value}`);
  }
  return props.length ? `<span style="${props.join(";")}">` : "<span>";
}

function escapeText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// http(s)/mailto, ou une URL relative (commence par / ou #) — rejette tout le
// reste (javascript:, data:, vbscript:, etc.).
export function isSafeRichTextUrl(url: string): boolean {
  const trimmed = url.trim();
  return /^(https?:|mailto:)/i.test(trimmed) || /^[/#]/.test(trimmed);
}

export function sanitizeRichText(input: string): string {
  let result = "";
  let last = 0;
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG_RE.exec(input))) {
    result += escapeText(input.slice(last, m.index));
    const g = m.groups!;
    if (g.closeTag) {
      const raw = g.closeTag.toLowerCase();
      result += raw === "font" || raw === "span" ? "</span>" : raw === "a" ? "</a>" : `</${raw === "strong" ? "b" : raw === "em" ? "i" : raw}>`;
    } else if (g.simpleTag) {
      const raw = g.simpleTag.toLowerCase();
      result += `<${raw === "strong" ? "b" : raw === "em" ? "i" : raw}>`;
    } else if (m[0].toLowerCase().startsWith("<br")) {
      result += "<br>";
    } else if (g.href !== undefined) {
      result += isSafeRichTextUrl(g.href)
        ? `<a href="${escapeAttr(g.href.trim())}" target="_blank" rel="noopener noreferrer" class="rt-link">`
        : ""; // URL non sûre : la balise est retirée, le texte entre les balises reste (juste sans lien)
    } else if (g.fontColor !== undefined) {
      const c = g.fontColor.trim();
      result += COLOR_RE.test(c) ? `<span style="color:${c}">` : "<span>";
    } else if (g.spanStyle !== undefined) {
      result += safeSpanStyle(g.spanStyle);
    }
    last = TAG_RE.lastIndex;
  }
  result += escapeText(input.slice(last));
  return result;
}

// Texte visible sans les balises — pour les limites de caractères (compter le
// HTML brut pénaliserait un texte formaté) et pour les attributs `alt`/`title`
// qui doivent rester du texte brut, jamais des balises littérales.
export function stripRichTags(input: string): string {
  return input
    .replace(/<a\s+href="[^"]*"[^>]*>/gi, "")
    .replace(/<font[^>]*>/gi, "")
    .replace(/<span[^>]*>/gi, "")
    .replace(/<\/?(b|i|u|strong|em|br|a|font|span)\s*\/?>/gi, "");
}
export function richTextLength(input: string): number {
  return stripRichTags(input).length;
}

// Pour les champs riches optionnels stockés en `string | undefined` : quand la
// personne vide le champ, contentEditable laisse parfois des balises
// résiduelles sans texte visible (ex. "<br>" après un retour à la ligne puis
// suppression) — un simple `v || undefined` ne les détecte pas (chaîne non
// vide) et le champ reste considéré comme "rempli" par le reste du code (ex.
// bascule de mise en page du carrousel qui ne repasse jamais en dessous).
export function richOrUndefined(input: string): string | undefined {
  return richTextLength(input) > 0 ? input : undefined;
}
