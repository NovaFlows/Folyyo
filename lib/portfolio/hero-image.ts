// Recadrage + retouche de l'image de fond du hero.
//
// Ce traitement est appliqué AU RENDU, pas à la génération, et c'est le point
// important : l'URL enregistrée dans `site_json` reste celle d'origine, et la
// transformation est recalculée à chaque affichage. Deux conséquences utiles :
//
//   1. Les portfolios DÉJÀ générés en profitent immédiatement, sans migration
//      de base — leur URL stockée passe par cette fonction comme les autres.
//   2. Si on retouche les réglages plus tard, tout le parc suit d'un coup.
//
// La fonction est idempotente : elle réécrit les paramètres de dimension et de
// traitement plutôt que de les empiler, donc l'appliquer deux fois donne le
// même résultat.

// Paramètres de dimensionnement/traitement qu'on impose. Tout autre paramètre
// présent dans l'URL d'origine (notamment `ixid`/`ixlib`, qui servent au suivi
// côté Unsplash) est conservé tel quel.
// Tableau et non Set : la cible TypeScript du projet n'autorise pas
// l'itération directe d'un Set sans `downlevelIteration`.
const OWNED = [
  "w", "h", "fit", "crop", "auto", "q", "exp", "con", "sat", "usm", "cs", "dpr",
];

const HERO_W = 2000;
const HERO_H = 1200;

/**
 * Normalise une image de fond Unsplash vers le rendu attendu par le hero.
 * Les URLs qui ne viennent pas d'Unsplash (photo téléversée par l'utilisateur,
 * fichier sur R2…) sont renvoyées intactes.
 */
export function heroImageUrl(src: string | null | undefined): string | undefined {
  if (!src) return undefined;

  let u: URL;
  try {
    u = new URL(src);
  } catch {
    return src; // chemin relatif ou URL non parsable : on ne touche à rien
  }
  if (u.hostname !== "images.unsplash.com") return src;

  for (const k of OWNED) u.searchParams.delete(k);

  // crop=entropy : recadre vers la zone la plus dense de l'image. Sur un hero
  // aussi panoramique, un recadrage centré coupe le sujet une fois sur deux.
  u.searchParams.set("w", String(HERO_W));
  u.searchParams.set("h", String(HERO_H));
  u.searchParams.set("fit", "crop");
  u.searchParams.set("crop", "entropy");
  // WebP/AVIF pour les navigateurs qui les acceptent.
  u.searchParams.set("auto", "format");
  // 78 plutôt que 90 : sous un voile sombre et un titre, l'écart ne se voit
  // pas, le poids si (souvent moitié moins).
  u.searchParams.set("q", "78");
  // Rattrapage d'exposition et de contraste : le hero est toujours recouvert
  // d'un voile sombre (`overlay_opacity`), sans quoi les photos déjà sombres
  // deviennent une bouillie noire. Légère désaturation pour que la photo ne
  // concurrence pas la couleur d'accent du thème.
  u.searchParams.set("exp", "6");
  u.searchParams.set("con", "8");
  u.searchParams.set("sat", "-4");
  // Accentuation discrète : le redimensionnement ramollit les détails.
  u.searchParams.set("usm", "12");

  return u.toString();
}
