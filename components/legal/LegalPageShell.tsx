import Link from "next/link";
import type { ReactNode } from "react";

// Coquille commune aux 3 pages légales (mentions-legales, confidentialite,
// cgu) — même en-tête/pied que /contact, contenu 100% français (ces pages ne
// suivent pas le sélecteur FR/EN/ES : traduire un texte juridique multiplie
// le risque d'erreur plus qu'il n'aide, et /contact suit déjà cette
// convention dans ce repo).
export default function LegalPageShell({ kicker, title, updated, children }: { kicker: string; title: string; updated: string; children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#f8f5f0", color: "#1c1917", fontFamily: "Inter, system-ui, sans-serif" }}>
      <header style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1c1917", fontSize: "1.25rem", fontWeight: 500 }}>
            folyo
          </Link>
          <Link href="/" className="text-sm transition hover:opacity-70" style={{ color: "#78716c" }}>
            ← Accueil
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-20">
        <p className="mono text-xs tracking-widest uppercase mb-3" style={{ color: "#a09a94", letterSpacing: "0.12em" }}>{kicker}</p>
        <h1 className="mb-2 text-4xl serif" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 500, color: "#1c1917" }}>
          {title}
        </h1>
        <p className="mb-10 text-xs" style={{ color: "#c8c4bf" }}>Dernière mise à jour : {updated}</p>

        <div className="legal-content flex flex-col gap-6 text-sm leading-relaxed" style={{ color: "#44403c" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
