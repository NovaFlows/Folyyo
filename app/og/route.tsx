import { ImageResponse } from "next/og";

export const runtime = "edge";

// Image de partage (Open Graph) de la landing — 1200×630, générée à la volée,
// aux couleurs de Folyo. Référencée dans app/page.tsx (openGraph.images / twitter).
// Le chargement de la police serif est best-effort : en cas d'échec réseau, on
// retombe sur la police par défaut plutôt que de casser l'image.
async function loadSerif(): Promise<ArrayBuffer | null> {
  const urls = [
    "https://cdn.jsdelivr.net/fontsource/fonts/playfair-display@latest/latin-600-normal.ttf",
    "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display/files/playfair-display-latin-600-normal.woff",
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.arrayBuffer();
    } catch { /* essaie l'URL suivante */ }
  }
  return null;
}

export async function GET() {
  const serifData = await loadSerif();
  const serif = serifData ? "Playfair" : "serif";
  const fonts = serifData ? [{ name: "Playfair", data: serifData, style: "normal" as const, weight: 600 as const }] : undefined;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#f8f5f0", padding: "70px 80px", position: "relative" }}>
        {/* Barre d'accent dorée à gauche */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 14, background: "#c9a96e" }} />

        {/* Wordmark */}
        <div style={{ display: "flex" }}>
          <span style={{ fontFamily: serif, fontSize: 60, fontWeight: 600, color: "#1c1917" }}>folyo</span>
        </div>

        {/* Titre */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: serif, fontSize: 74, fontWeight: 600, color: "#1c1917", lineHeight: 1.1 }}>
            Ton portfolio professionnel,
          </span>
          <span style={{ fontFamily: serif, fontSize: 74, fontWeight: 600, fontStyle: "italic", color: "#c9a96e", lineHeight: 1.1 }}>
            généré par l&apos;IA.
          </span>
        </div>

        {/* Bas : sous-titre + URL */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <span style={{ fontSize: 28, color: "#78716c", maxWidth: 780 }}>
            Import CV, GitHub ou YouTube · éditeur visuel · prêt en 60 secondes
          </span>
          <span style={{ fontSize: 28, color: "#a09a94", fontFamily: "monospace" }}>folyo.page</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
