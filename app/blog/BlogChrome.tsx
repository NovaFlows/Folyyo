import Link from "next/link";

// En-tête public du blog — logo + CTA de conversion. Sobre, aux couleurs Folyo.
export function BlogHeader() {
  return (
    <header style={{ borderBottom: "1px solid rgba(0,0,0,0.07)", background: "#f8f5f0" }}>
      <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: "#1c1917", fontSize: "1.25rem", fontWeight: 500 }}>
          folyo
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/blog" className="text-sm font-medium transition hover:opacity-70" style={{ color: "#78716c" }}>Blog</Link>
          <Link href="/signup"
            className="rounded-full px-5 py-2 text-sm font-medium text-white transition hover:opacity-80"
            style={{ background: "#1c1917" }}>
            Créer mon portfolio
          </Link>
        </div>
      </div>
    </header>
  );
}

// Encart d'appel à l'action réutilisé (fin d'article + bas de l'index).
export function BlogCta() {
  return (
    <div className="rounded-2xl p-8 text-center" style={{ background: "#1c1917" }}>
      <p className="mb-1 text-xl serif" style={{ color: "white", fontWeight: 500 }}>
        Crée ton portfolio pro en 60 secondes
      </p>
      <p className="mb-5 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
        Import CV, GitHub ou YouTube · éditeur visuel · essai gratuit de 3 jours, sans carte.
      </p>
      <Link href="/signup"
        className="inline-block rounded-full px-7 py-3 text-sm font-semibold transition hover:opacity-90"
        style={{ background: "#c9a96e", color: "#1c1917" }}>
        Commencer gratuitement →
      </Link>
    </div>
  );
}

export function formatBlogDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}
