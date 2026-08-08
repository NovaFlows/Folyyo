import type { ContentBlock, BlockRow, GridItem } from "@/lib/anthropic/schema";
import { GRID_COLS, GRID_ROW_HEIGHT, GRID_MARGIN, HERO_MARKER_TYPES, sortGridItems } from "@/lib/portfolio/grid";
import Carousel from "./Carousel";
import RichText from "./RichText";
import { stripRichTags, isSafeRichTextUrl } from "@/lib/portfolio/rich-text";

export type WidgetStyle = "strict" | "soft" | "glass";

// Facteur d'échelle par taille (1 = petit … 5 = grand, 3 = normal)
const SIZE_SCALE = [0.75, 0.88, 1, 1.2, 1.45];
// Échelle typographique d'un bloc selon son `size` (partagé éditeur / public)
export function sizeScale(size?: number): number {
  return SIZE_SCALE[Math.min(5, Math.max(1, size ?? 3)) - 1];
}
// Zoom du contenu natif d'une section : priorité à fontSize (px, réglage
// explicite façon Word) sinon repli sur l'ancienne échelle 1-5. 16px = zoom 1.
export function nativeZoom(block: { size?: number; fontSize?: number }): number {
  return block.fontSize ? block.fontSize / 16 : sizeScale(block.size);
}
// Pour les images hors grille (aside/legacy) : largeur % et hauteur max par taille
const IMG_WIDTH  = [50, 70, 100, 100, 100];
const IMG_HEIGHT = [200, 270, 360, 470, 600];
// Largeurs (px) proposées pour le cadre description du carrousel (voir
// Carousel.tsx) — 5 étapes, exportées pour que VisualEditor.tsx affiche le
// même sélecteur −/points/+ que "Taille de l'image" tout en gardant les deux
// bouts (rendu + éditeur) synchronisés sur les mêmes valeurs.
export const DESCRIPTION_WIDTH_STEPS = [180, 220, 260, 320, 400];

// Polices proposées dans le menu déroulant des widgets texte — chaque valeur
// est la pile CSS complète, prête à poser en `fontFamily`. Toutes chargées via
// le @import Google Fonts de globals.css.
export const WIDGET_FONT_OPTIONS: { label: string; value: string }[] = [
  { label: "Police du thème", value: "" },
  { label: "Inter", value: "'Inter', system-ui, sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', Georgia, serif" },
  { label: "Poppins", value: "'Poppins', system-ui, sans-serif" },
  { label: "Space Grotesk", value: "'Space Grotesk', system-ui, sans-serif" },
  { label: "Merriweather", value: "'Merriweather', Georgia, serif" },
  { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
  { label: "Fira Code", value: "'Fira Code', monospace" },
  { label: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
  { label: "Caveat", value: "'Caveat', cursive" },
  { label: "Yellowtail", value: "'Yellowtail', cursive" },
];
// Tailles proposées dans le menu déroulant (px) — façon Word.
export const WIDGET_FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 60, 72];

// Pure block renderer — shared between the visual editor and the public page.
// No hooks, server-component safe. `fill` : le média remplit son conteneur
// (mode grille / carte soft) au lieu de dicter sa propre hauteur.
export function BlockContent({ block, pri, txt, hFont, editMode = false, fill = false }: {
  block: ContentBlock; pri: string; txt: string; hFont: string; editMode?: boolean; fill?: boolean;
}) {
  const s  = Math.min(5, Math.max(1, ("size" in block ? block.size : undefined) ?? 3));
  const sc = SIZE_SCALE[s - 1];
  switch (block.type) {
    case "image": return (
      <div style={fill ? { height: "100%", display: "flex", flexDirection: "column" } : undefined}>
        {block.url
          ? <img src={block.url} alt={block.caption ? stripRichTags(block.caption) : ""}
              style={fill
                ? { width: "100%", flex: 1, minHeight: 0, objectFit: "cover", display: "block", borderRadius: block.caption ? "0.625rem" : 0 }
                : { width: `${IMG_WIDTH[s-1]}%`, margin: "0 auto", borderRadius: "0.625rem", display: "block", maxHeight: IMG_HEIGHT[s-1], objectFit: "cover" }} />
          : editMode
            ? <div style={{ width: "100%", height: fill ? "100%" : 100, minHeight: 80, background: `${txt}06`, borderRadius: "0.625rem", display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${txt}20` }}><span style={{ color: `${txt}25`, fontSize: "0.7rem" }}>Image · clic pour ajouter</span></div>
            : null
        }
        {block.caption && <p style={{ fontSize: "0.8rem", color: `${txt}45`, textAlign: "center", marginTop: "0.4rem", marginBottom: fill ? "0.4rem" : 0, fontStyle: "italic" }}><RichText html={block.caption}/></p>}
      </div>
    );
    case "text": {
      const fs = block.fontSize ? `${block.fontSize}px` : `${(block.style === "lead" ? 1.0625 : 0.9375) * sc}rem`;
      return <p style={{ fontSize: fs, fontFamily: block.fontFamily || undefined, textAlign: block.align || undefined, color: `${txt}cc`, lineHeight: 1.75, margin: 0 }}><RichText html={block.content}/></p>;
    }
    case "quote": {
      const fs = block.fontSize ? `${block.fontSize}px` : `${1.0625 * sc}rem`;
      const authorFs = block.fontSize ? `${Math.max(10, Math.round(block.fontSize * 0.72))}px` : `${0.8125 * sc}rem`;
      // Centrer/aligner à droite retire le filet gauche (il n'a de sens qu'en
      // alignement naturel à gauche, façon citation classique).
      const centered = block.align === "center" || block.align === "right";
      return (
        <blockquote style={{ borderLeft: centered ? "none" : `3px solid ${pri}`, paddingLeft: centered ? 0 : "1.25rem", textAlign: block.align || undefined, margin: 0 }}>
          <p style={{ fontSize: fs, color: txt, fontStyle: "italic", fontFamily: block.fontFamily || hFont, lineHeight: 1.6, margin: 0 }}>{block.text ? <RichText html={block.text}/> : "Citation…"}</p>
          {block.author && <cite style={{ fontSize: authorFs, color: `${txt}50`, fontFamily: block.fontFamily || undefined, display: "block", marginTop: "0.5rem", fontStyle: "normal" }}>— <RichText html={block.author}/></cite>}
        </blockquote>
      );
    }
    case "stats": {
      const valueFs = block.fontSize ? `${block.fontSize}px` : `${1.75 * sc}rem`;
      const labelFs = block.fontSize ? `${Math.max(10, Math.round(block.fontSize * 0.4))}px` : `${0.7 * sc}rem`;
      return (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${block.items.length || 3},1fr)`, gap: `${0.75 * sc}rem`, ...(fill ? { height: "100%", alignContent: "center" } : {}) }}>
          {block.items.map((st, i) => (
            <div key={i} style={{ padding: `${0.875 * sc}rem ${0.5 * sc}rem`, background: `${pri}0a`, borderRadius: "0.75rem", textAlign: "center" }}>
              <p style={{ fontSize: valueFs, fontWeight: 700, color: pri, fontFamily: block.fontFamily || hFont, margin: 0, lineHeight: 1 }}>{st.value || "0"}</p>
              <p style={{ fontSize: labelFs, color: `${txt}55`, fontFamily: block.fontFamily || undefined, margin: 0, marginTop: "0.3rem" }}><RichText html={st.label}/></p>
            </div>
          ))}
        </div>
      );
    }
    case "button": {
      const fs = block.fontSize ? `${block.fontSize}px` : `${0.875 * sc}rem`;
      return (
        <span style={fill
          ? { height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }
          : undefined}>
          <span style={{ display: "inline-block", padding: `${0.75 * sc}rem ${1.75 * sc}rem`, borderRadius: "0.75rem", fontWeight: 600, fontSize: fs, fontFamily: block.fontFamily || undefined, cursor: "pointer", background: block.variant === "outline" ? "transparent" : pri, color: block.variant === "outline" ? pri : "#fff", border: block.variant === "outline" ? `1.5px solid ${pri}` : "none" }}>{block.label ? <RichText html={block.label}/> : "Bouton"}</span>
        </span>
      );
    }
    case "links": {
      if (block.items.length === 0) {
        return editMode
          ? <div style={{ padding: "0.75rem", borderRadius: "0.625rem", border: `1px dashed ${txt}20`, textAlign: "center" }}><span style={{ color: `${txt}25`, fontSize: "0.7rem" }}>Liens · ajoute des sites</span></div>
          : null;
      }
      const fs = block.fontSize ? `${block.fontSize}px` : `${0.875 * sc}rem`;
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: `${0.5 * sc}rem`, ...(fill ? { height: "100%", justifyContent: "center" } : {}) }}>
          {block.items.filter((lk) => isSafeRichTextUrl(lk.url || "#")).map((lk, i) => (
            <a key={i} href={lk.url || "#"} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: `${0.625 * sc}rem ${0.875 * sc}rem`, borderRadius: "0.625rem", background: `${pri}0d`, border: `1px solid ${pri}22`, color: txt, textDecoration: "none", fontSize: fs, fontFamily: block.fontFamily || undefined, fontWeight: 500 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lk.label ? <RichText html={lk.label}/> : (lk.url || "Lien")}</span>
              <span style={{ color: pri, flexShrink: 0 }}>↗</span>
            </a>
          ))}
        </div>
      );
    }
    case "divider": return <div style={fill ? { height: "100%", display: "flex", alignItems: "center" } : undefined}><div style={{ height: 1, width: "100%", background: `${txt}10`, borderRadius: 1, margin: fill ? 0 : "0.5rem 0" }} /></div>;
    case "carousel":
      return block.images.length > 0
        ? <Carousel images={block.images} pri={pri} txt={txt} fill={fill}
            fontFamily={block.fontFamily} fontSize={block.fontSize} descriptionWidth={block.descriptionWidth} />
        : editMode
          ? <div style={{ width: "100%", height: fill ? "100%" : 140, minHeight: 100, background: `${txt}06`, borderRadius: "0.625rem", display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${txt}20` }}><span style={{ color: `${txt}25`, fontSize: "0.7rem" }}>Carrousel · ajoute des photos</span></div>
          : null;
    // Le contenu natif, le titre de section et les 4 textes du hero sont
    // rendus par le parent (GridStatic renderNative/renderTitle/renderHero,
    // ou l'éditeur) — jamais via BlockContent.
    case "section_content": return null;
    case "section_title": return null;
    case "hero_title": return null;
    case "hero_tagline": return null;
    case "hero_subtitle": return null;
    case "hero_cta": return null;
    default: return null;
  }
}

// ── Cadre de widget : "strict" (plat), "soft" (carte arrondie) ou "glass"
// (verre dépoli translucide). Les effets hover vivent dans globals.css
// (.widget-soft / .widget-glass), donc fonctionnent sans JS sur la page publique.
export function WidgetFrame({ widgetStyle, block, bg, txt, children }: {
  widgetStyle: WidgetStyle; block: ContentBlock; bg: string; txt: string; children: React.ReactNode;
}) {
  if (widgetStyle === "strict" || block.type === "divider") return <>{children}</>;
  const isMedia = (block.type === "image" || block.type === "carousel");
  const isNative = block.type === "section_content";
  const base: React.CSSProperties = {
    height: "100%",
    borderRadius: 24,
    padding: isMedia ? 0 : "1.25rem",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: isMedia ? "stretch" : isNative ? "flex-start" : "center",
  };
  if (widgetStyle === "glass") {
    // Verre dépoli façon iOS. Trois ingrédients, et il faut les trois :
    //
    //  1. Un vrai FLOU D'ARRIÈRE-PLAN (44px) avec forte saturation. La
    //     saturation est ce qui donne l'impression que la lumière traverse :
    //     sans elle, on obtient du plexiglas gris.
    //  2. Une TEINTE BLANCHE en dégradé, pas une couleur plate. Du verre
    //     dépoli diffuse la lumière, donc il paraît plus clair que ce qu'il y a
    //     derrière — et le dégradé simule l'angle d'incidence.
    //  3. Des ARÊTES ÉCLAIRÉES : un liseré vif en haut (la lumière accroche le
    //     bord), plus sombre en bas. C'est ce détail qui donne l'épaisseur ;
    //     sans lui la carte reste un rectangle translucide.
    //
    // La teinte est blanche et non `txt` : sur un thème clair, un voile sombre
    // donnerait du verre fumé au lieu du givre attendu. `txt` ne sert qu'à
    // dessiner le contour, pour que la carte reste délimitée sur fond clair.
    const glass = "blur(52px) saturate(200%) brightness(1.06)";
    return (
      <div className="widget-soft widget-glass" style={{
        ...base,
        background:
          `linear-gradient(148deg, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.11) 46%, rgba(255,255,255,0.20) 100%), ${txt}12`,
        backdropFilter: glass,
        WebkitBackdropFilter: glass,
        border: `1px solid ${txt}26`,
        boxShadow: [
          "inset 0 1px 0 rgba(255,255,255,0.55)",   // arête haute éclairée
          "inset 0 -1px 0 rgba(255,255,255,0.12)",  // arête basse, plus discrète
          `inset 0 0 0 1px ${txt}0a`,               // épaisseur du verre
          "0 14px 44px rgba(0,0,0,0.22)",
          "0 2px 8px rgba(0,0,0,0.10)",
        ].join(", "),
      }}>
        {children}
      </div>
    );
  }
  return (
    <div className="widget-soft" style={{
      ...base,
      background: bg,
      border: `1px solid ${txt}12`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06)",
    }}>
      {children}
    </div>
  );
}

// ── Grille libre — rendu statique public (CSS grid pur, même géométrie que
// l'éditeur react-grid-layout : 12 colonnes, rowHeight 32, gap 14) ─────────────
export function GridStatic({ items, widgetStyle, pri, txt, bg, hFont, renderNative, renderTitle, renderHero }: {
  items: GridItem[] | undefined; widgetStyle: WidgetStyle;
  pri: string; txt: string; bg: string; hFont: string;
  renderNative?: () => React.ReactNode;
  renderTitle?: () => React.ReactNode;
  // Un des 4 marqueurs hero_title/hero_tagline/hero_subtitle/hero_cta — reçoit
  // le bloc (pas juste le type) pour pouvoir lire son fontSize/fontFamily.
  renderHero?: (block: ContentBlock) => React.ReactNode;
}) {
  if (!items || items.length === 0) return null;
  const sorted = sortGridItems(items);
  const framed = widgetStyle !== "strict";
  return (
    <div className="folyo-grid" style={{
      marginTop: "1.5rem",
      display: "grid",
      gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
      gridAutoRows: GRID_ROW_HEIGHT,
      gap: GRID_MARGIN,
    }}>
      {sorted.map((it) => {
        const isHero = HERO_MARKER_TYPES.has(it.block.type);
        return (
        <div key={it.id} className="folyo-grid-item" style={{
          gridColumn: `${it.x + 1} / span ${it.w}`,
          gridRow: `${it.y + 1} / span ${it.h}`,
          minWidth: 0,
          // Les 4 textes du hero débordent volontairement de leur case plutôt
          // que d'être coupés (h1 pouvant wrapper sur plusieurs lignes selon
          // le nom/la largeur d'écran) — pas de carte à préserver derrière,
          // contrairement aux widgets ordinaires.
          overflow: isHero ? "visible" : "hidden",
        }}>
          {it.block.type === "section_title"
            // Pas de WidgetFrame (pas de carte/cadre) : le titre reste un
            // simple texte, comme avant son passage en item de grille.
            ? <div style={{ height: "100%", display: "flex", alignItems: "center" }}>{renderTitle?.()}</div>
            : isHero
              // Idem : pas de WidgetFrame, le hero garde son apparence de
              // simple texte sur fond/image, jamais de carte par-dessus.
              ? <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>{renderHero?.(it.block)}</div>
              : (
                <WidgetFrame widgetStyle={widgetStyle} block={it.block} bg={bg} txt={txt}>
                  {it.block.type === "section_content"
                    // overflowY auto (pas hidden) : un widget "projets" rétréci fait
                    // reflow ses colonnes (CSS grid interne, largeur réelle du
                    // conteneur) mais peut avoir besoin de plus de hauteur que la
                    // taille du widget — avec hidden, les projets en trop devenaient
                    // invisibles ; avec auto, ils restent accessibles au scroll.
                    ? <div style={{ height: "100%", overflowY: "auto", overflowX: "hidden", zoom: nativeZoom(it.block), fontFamily: it.block.fontFamily || undefined }}>{renderNative?.()}</div>
                    : <BlockContent block={it.block} pri={pri} txt={txt} hFont={hFont} fill={framed} />}
                </WidgetFrame>
              )}
        </div>
        );
      })}
    </div>
  );
}

// Static stack of block rows (legacy — portfolios jamais re-sauvés depuis la grille)
export function BlockRowsStatic({ rows, pri, txt, hFont, widgetStyle = "strict", bg = "#ffffff" }: {
  rows: BlockRow[] | undefined; pri: string; txt: string; hFont: string;
  widgetStyle?: WidgetStyle; bg?: string;
}) {
  if (!rows || rows.length === 0) return null;
  return (
    <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {rows.map((r) => (
        <div key={r.id} style={{ display: "flex", gap: "1.5rem", alignItems: "stretch" }}>
          {r.columns.map((c, i) => (
            <div key={i} style={{ flex: 1, minWidth: 0 }}>
              <WidgetFrame widgetStyle={widgetStyle} block={c} bg={bg} txt={txt}>
                <BlockContent block={c} pri={pri} txt={txt} hFont={hFont} />
              </WidgetFrame>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
