import type { BlockRow, ContentBlock, GridItem, ValidatedPortfolioJSON } from "@/lib/anthropic/schema";

// ── Grille libre : constantes partagées éditeur / rendu public ────────────────
// La page publique rend la MÊME géométrie en CSS grid pur (grid-auto-rows =
// GRID_ROW_HEIGHT, gap = GRID_MARGIN) — toute modification ici doit rester
// synchronisée avec GridStatic (components/portfolio/blocks.tsx).
export const GRID_COLS = 12;
export const GRID_ROW_HEIGHT = 32; // px par unité de hauteur
export const GRID_MARGIN = 14;     // px de gouttière

export function gridUid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Encombrement par défaut d'un widget fraîchement ajouté (unités de grille)
// Largeurs par défaut ≤ 6 colonnes (sauf séparateur / contenu natif) pour qu'un
// nouveau widget puisse toujours se poser À CÔTÉ d'un existant, pas seulement
// au-dessus/en dessous.
export const DEFAULT_SIZE: Record<ContentBlock["type"], { w: number; h: number }> = {
  image:    { w: 6,  h: 8 },
  carousel: { w: 6,  h: 8 },
  text:     { w: 6,  h: 4 },
  quote:    { w: 6,  h: 4 },
  stats:    { w: 6,  h: 4 },
  button:   { w: 3,  h: 2 },
  links:    { w: 6,  h: 4 },
  divider:  { w: 12, h: 1 },
  section_content: { w: 12, h: 8 },
};

// En-dessous, le contenu devient illisible ou les poignées inutilisables
export const MIN_SIZE: Record<ContentBlock["type"], { w: number; h: number }> = {
  image:    { w: 2, h: 3 },
  carousel: { w: 4, h: 5 },
  text:     { w: 3, h: 2 },
  quote:    { w: 4, h: 2 },
  stats:    { w: 4, h: 2 },
  button:   { w: 2, h: 2 },
  links:    { w: 3, h: 2 },
  divider:  { w: 2, h: 1 },
  section_content: { w: 4, h: 3 },
};

// Lecture/écriture de la grille d'une section (le champ `grid` est optionnel
// dans le schéma tant qu'une section n'a jamais été migrée/éditée).
export function getGrid(section: { grid?: GridItem[] }): GridItem[] {
  return section.grid ?? [];
}
export function applyGrid<S extends { grid?: GridItem[] }>(section: S, grid: GridItem[]): S {
  return { ...section, grid };
}

// Rejette (plutôt que de clamper silencieusement) tout placement/redimension-
// nement hors bornes — utilisé par les outils d'édition IA (add_widget,
// move_widget) : un message d'erreur explicite laisse Claude se corriger au
// tour suivant, un clamp silencieux produirait un résultat qui ne correspond
// pas à ce qu'il a demandé.
export function validateGridBounds(
  item: { x: number; y: number; w: number; h: number },
  blockType: ContentBlock["type"],
): void {
  const min = MIN_SIZE[blockType];
  if (item.w < min.w || item.h < min.h) {
    throw new Error(`Taille trop petite pour "${blockType}" : minimum ${min.w}×${min.h} (largeur×hauteur en colonnes/lignes de grille), reçu ${item.w}×${item.h}.`);
  }
  if (item.x < 0 || item.x + item.w > GRID_COLS) {
    throw new Error(`Position horizontale invalide : x=${item.x}, w=${item.w} dépasse la grille de ${GRID_COLS} colonnes.`);
  }
  if (item.y < 0) {
    throw new Error(`Position verticale invalide : y=${item.y} ne peut pas être négatif.`);
  }
}

// Hauteur estimée du contenu natif d'une section, selon son type et le nombre
// d'items — approximation généreuse, l'utilisateur ajuste ensuite à la poignée.
export function nativeContentH(section: { type: string; items?: unknown[]; highlight?: string | null }): number {
  const n = section.items?.length ?? 0;
  switch (section.type) {
    case "about":      return section.highlight ? 7 : 6;
    case "skills":     return Math.max(5, Math.ceil(n / 4) * 3 + 1);
    case "projects":   return Math.max(8, Math.ceil(n / 3) * 9);
    case "experience": return Math.max(6, n * 3 + 1);
    case "contact":    return 7;
    default:           return 8;
  }
}

// Migration de l'ancien format en lignes : ligne 1 colonne → pleine largeur,
// ligne 2 colonnes → deux items 6+6 côte à côte.
export function rowsToGrid(rows: BlockRow[]): GridItem[] {
  const items: GridItem[] = [];
  let y = 0;
  for (const row of rows) {
    if (row.columns.length === 2) {
      const h = Math.max(DEFAULT_SIZE[row.columns[0].type].h, DEFAULT_SIZE[row.columns[1].type].h);
      items.push({ id: gridUid(), block: row.columns[0], x: 0, y, w: 6, h });
      items.push({ id: gridUid(), block: row.columns[1], x: 6, y, w: 6, h });
      y += h;
    } else if (row.columns.length === 1) {
      const block = row.columns[0];
      const h = DEFAULT_SIZE[block.type].h;
      items.push({ id: gridUid(), block, x: 0, y, w: 12, h });
      y += h;
    }
  }
  return items;
}

// Tri en ordre de lecture (haut→bas puis gauche→droite) — l'ordre DOM du rendu
// public en dépend pour que la pile mobile soit correcte.
export function sortGridItems(items: GridItem[]): GridItem[] {
  return [...items].sort((a, b) => a.y - b.y || a.x - b.x);
}

// Première ligne libre sous tous les items (pour ajouter en bas de grille)
export function nextY(items: GridItem[]): number {
  return items.reduce((max, it) => Math.max(max, it.y + it.h), 0);
}

// Corrige, APRÈS un glissement/redimensionnement (jamais pendant — modifier le
// layout en cours de geste casse le drag), tout widget qui se retrouve
// mélangé aux rangées du contenu natif. react-grid-layout ne gère pas bien la
// collision entre un item beaucoup plus grand qu'un autre : au lieu de
// repousser proprement le petit de l'autre côté, il le laisse chevaucher sans
// jamais franchir le milieu du grand.
//
// Règle purement géométrique (aucun suivi de souris nécessaire) : on mesure le
// chevauchement HORIZONTAL restant entre les deux items, en % de la largeur du
// contenu natif. Sous 50%, le widget déplacé est considéré comme suffisamment
// "sorti" de l'emprise du natif pour passer en dessous ; au-dessus de 50%, il
// est encore trop dans son emprise horizontale, on le garde au-dessus (et le
// natif descend d'autant). Partagée entre l'éditeur manuel (VisualEditor.tsx,
// après un drag RGL) et l'exécuteur d'outils IA (après move_widget/add_widget).
export function resolveNativeOverlap(items: GridItem[]): GridItem[] {
  let result = items;
  let guard = 0;
  while (guard++ < 10) {
    const native = result.find(it => it.block.type === "section_content");
    if (!native) return result;
    const nativeTop = native.y, nativeBottom = native.y + native.h;
    const overlapping = result.find(it => it.id !== native.id && it.y < nativeBottom && it.y + it.h > nativeTop);
    if (!overlapping) return result;

    const overlapStart = Math.max(overlapping.x, native.x);
    const overlapEnd = Math.min(overlapping.x + overlapping.w, native.x + native.w);
    const overlapWidth = Math.max(0, overlapEnd - overlapStart);
    const overlapFraction = native.w > 0 ? overlapWidth / native.w : 1;
    const pushBelow = overlapFraction < 0.5;

    if (pushBelow) {
      result = result.map(it => it.id === overlapping.id ? { ...it, y: nativeBottom } : it);
    } else {
      // Passe au-dessus, le contenu natif descend d'autant
      result = result.map(it => {
        if (it.id === overlapping.id) return { ...it, y: nativeTop };
        if (it.id === native.id) return { ...it, y: nativeTop + overlapping.h };
        return it;
      });
    }
  }
  return result;
}

// Migration en mémoire au montage de l'éditeur, rien n'est persisté avant save :
// 1. blocks (lignes legacy) → items de grille
// 2. sections hors hero : le contenu natif devient un item "section_content"
//    déplaçable ; l'ancienne pile "accolée au contenu" (content_aside) est
//    convertie en items posés à côté du contenu natif.
type LegacyAside = { blocks?: ContentBlock[]; block?: ContentBlock; side: "left" | "right" };

export function migrateToGrid(data: ValidatedPortfolioJSON): ValidatedPortfolioJSON {
  let changed = false;
  const sections = data.sections.map((section) => {
    const s = section as { type: string; grid?: GridItem[]; blocks?: BlockRow[]; content_aside?: LegacyAside };
    let grid = s.grid;
    let mutated = false;

    if (!grid && s.blocks && s.blocks.length > 0) {
      grid = rowsToGrid(s.blocks);
      mutated = true;
    }
    grid = grid ?? [];

    if (s.type !== "hero" && !grid.some((it) => it.block.type === "section_content")) {
      const nativeH = nativeContentH(s as { type: string; items?: unknown[] });
      const asideBlocks: ContentBlock[] = s.content_aside
        ? (s.content_aside.blocks ?? (s.content_aside.block ? [s.content_aside.block] : []))
        : [];
      const side = s.content_aside?.side ?? "right";

      const items: GridItem[] = [];
      if (asideBlocks.length > 0) {
        // Contenu natif sur 8 colonnes, pile aside sur les 4 restantes
        const nativeX = side === "left" ? 4 : 0;
        const asideX  = side === "left" ? 0 : 8;
        items.push({ id: gridUid(), block: { type: "section_content" }, x: nativeX, y: 0, w: 8, h: nativeH });
        let ay = 0;
        for (const b of asideBlocks) {
          const h = DEFAULT_SIZE[b.type].h;
          items.push({ id: gridUid(), block: b, x: asideX, y: ay, w: 4, h });
          ay += h;
        }
      } else {
        items.push({ id: gridUid(), block: { type: "section_content" }, x: 0, y: 0, w: 12, h: nativeH });
      }
      // Les widgets existants passent sous le contenu natif
      const shifted = grid.map((it) => ({ ...it, y: it.y + nativeH }));
      grid = [...items, ...shifted];
      mutated = true;
    }

    if (mutated || s.blocks !== undefined || s.content_aside !== undefined) {
      changed = true;
      return { ...section, grid, blocks: undefined, content_aside: undefined } as typeof section;
    }
    return section;
  });
  return changed ? { ...data, sections: sections as ValidatedPortfolioJSON["sections"] } : data;
}
