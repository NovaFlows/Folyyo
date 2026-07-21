// Détection best-effort de plateforme Apple (macOS/iOS) — sert à ne proposer
// "Continuer avec Apple" qu'aux visiteurs susceptibles d'avoir un identifiant
// Apple, plutôt qu'à tout le monde. Safari sur iPadOS (mode desktop) renvoie
// le même user-agent qu'un vrai Mac ("Macintosh"), donc une seule regex
// suffit à couvrir Mac/iPhone/iPad/iPod.
export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
}
