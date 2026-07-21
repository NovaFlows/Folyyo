import Link from "next/link";

// Affiché à la place de <VisualEditor> quand l'essai du propriétaire est
// terminé et qu'aucun abonnement actif ne le remplace — même style que
// l'écran de repli mobile de VisualEditor.tsx (fond sombre, centré).
export default function TrialExpiredNotice({ t, portfolioId }: {
  t: { title: string; desc: string; cta: string; backToManage: string };
  portfolioId: string;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem", textAlign: "center", background: "#1c1917", fontFamily: "system-ui,sans-serif" }}>
      <h1 style={{ color: "white", fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.625rem" }}>{t.title}</h1>
      <p style={{ color: "#a8a29e", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "2rem", maxWidth: 360 }}>{t.desc}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", maxWidth: 280 }}>
        <Link href="/billing" style={{ background: "#c9a96e", color: "#1c1917", padding: "0.75rem 1.5rem", borderRadius: "0.75rem", fontWeight: 700, fontSize: "0.875rem", textDecoration: "none" }}>
          {t.cta}
        </Link>
        <Link href={`/portfolio/${portfolioId}`} style={{ background: "transparent", color: "#c8c4bf", border: "1px solid rgba(255,255,255,0.15)", padding: "0.75rem 1.5rem", borderRadius: "0.75rem", fontSize: "0.875rem", textDecoration: "none" }}>
          {t.backToManage}
        </Link>
      </div>
    </div>
  );
}
