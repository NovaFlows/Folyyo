export type HeroDecorationVariant = "none" | "waves";

// Ruban de lignes fines qui ondulent dans un coin du hero (inspiré d'un
// visuel de référence transmis par l'utilisateur : plusieurs courbes fines
// parallèles façon vague/ruban) — jamais sur la colonne de texte centrale.
// Purement décoratif (aria-hidden), activé manuellement depuis l'éditeur —
// jamais généré par l'IA.
const LINE_COUNT = 6;
const BASE_PATH = (offset: number) =>
  `M-10,${70 + offset} C60,${10 + offset} 110,${140 + offset} 180,${60 + offset} C230,${10 + offset} 260,${90 + offset} 310,${45 + offset}`;

export default function HeroDecoration({ variant, color }: { variant?: HeroDecorationVariant; color: string }) {
  if (!variant || variant === "none") return null;
  return (
    <div aria-hidden="true" className="pf-hero-decoration" style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 2 }}>
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .pf-hero-decoration svg { animation: pf-hero-decoration-in 1.1s ease-out backwards; }
        }
        @keyframes pf-hero-decoration-in {
          from { opacity: 0; transform: translateX(16px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <svg width={260} height={170} viewBox="0 0 300 200" fill="none"
        style={{ position: "absolute", right: "-2%", bottom: "6%", opacity: 0.6 }}>
        {Array.from({ length: LINE_COUNT }, (_, i) => (
          <path key={i} d={BASE_PATH(i * 9)} stroke={color} strokeWidth={1.4} strokeLinecap="round"
            opacity={0.35 + (i / LINE_COUNT) * 0.5} />
        ))}
      </svg>
    </div>
  );
}
