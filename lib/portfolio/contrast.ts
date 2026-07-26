// Contraste WCAG (luminance relative) — partagé entre l'édition par outils
// (apply-edit-tool.ts) et la génération initiale (app/api/portfolio/generate),
// qui laisse maintenant Claude choisir librement sa palette et a donc besoin
// du même filet de sécurité plutôt que de compter uniquement sur le prompt.
export function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16) / 255, g = parseInt(c.slice(2, 4), 16) / 255, b = parseInt(c.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a) + 0.05, l2 = luminance(b) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}
