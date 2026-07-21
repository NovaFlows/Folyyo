// Affiché sur /[slug] à la place du site quand l'essai/abonnement du
// propriétaire n'est plus actif — le slug n'est jamais supprimé, juste
// masqué : ce composant remplace le rendu public, pas un notFound().
export default function PortfolioPausedNotice({ t }: { t: { title: string; desc: string } }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem 1.5rem", textAlign: "center", background: "#f8f5f0", fontFamily: "system-ui,sans-serif" }}>
      <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "1.375rem", color: "#1c1917", marginBottom: "1.5rem" }}>folyyo</span>
      <h1 style={{ color: "#1c1917", fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.625rem" }}>{t.title}</h1>
      <p style={{ color: "#78716c", fontSize: "0.875rem", lineHeight: 1.6, maxWidth: 420 }}>{t.desc}</p>
    </div>
  );
}
