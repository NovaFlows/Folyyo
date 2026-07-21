import { sanitizeRichText } from "@/lib/portfolio/rich-text";

// Rendu en lecture seule d'un champ texte pouvant contenir du gras/italique
// (voir lib/portfolio/rich-text.ts) — pas de "use client" : safe aussi bien
// dans un Server Component (rendu public, app/[slug]/page.tsx) que dans
// l'éditeur. `as` choisit la balise conteneur (span par défaut, pour pouvoir
// s'insérer dans un <p>/<h2>/<button>… existant sans imbriquer un bloc dedans).
export default function RichText({ html, as: As = "span", style, className }: {
  html: string; as?: keyof JSX.IntrinsicElements; style?: React.CSSProperties; className?: string;
}) {
  if (!html) return null;
  return <As style={style} className={className} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />;
}
