import Link from "next/link";
import type { GitHubRepo, YouTubeVideo } from "@/types/portfolio";

// Bannière "il y a du nouveau" — le lien pré-remplit (sans envoyer) le champ
// d'instruction du chat d'édition IA sur la page du portfolio concerné,
// plutôt que d'inventer un mécanisme d'ajout dédié.
function buildSuggestion(newRepos: GitHubRepo[], newVideos: YouTubeVideo[]): string {
  const parts: string[] = [];
  if (newRepos.length) parts.push(`Ajoute ces projets GitHub à mon portfolio : ${newRepos.map((r) => r.name).join(", ")}`);
  if (newVideos.length) parts.push(`Ajoute ces vidéos YouTube : ${newVideos.map((v) => v.title).join(", ")}`);
  return parts.join(". ");
}

export default function FreshnessBanner({
  portfolioId,
  portfolioName,
  newRepos,
  newVideos,
}: {
  portfolioId: string;
  portfolioName: string;
  newRepos: GitHubRepo[];
  newVideos: YouTubeVideo[];
}) {
  const bits: string[] = [];
  if (newRepos.length) bits.push(`${newRepos.length} nouveau${newRepos.length > 1 ? "x" : ""} repo${newRepos.length > 1 ? "s" : ""} GitHub`);
  if (newVideos.length) bits.push(`${newVideos.length} nouvelle${newVideos.length > 1 ? "s" : ""} vidéo${newVideos.length > 1 ? "s" : ""} YouTube`);

  const suggest = buildSuggestion(newRepos, newVideos);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
      style={{ background: "rgba(201,169,110,0.08)", border: "1px solid rgba(201,169,110,0.2)" }}>
      <p className="text-sm" style={{ color: "#1c1917" }}>
        🎉 <strong>{bits.join(" et ")}</strong> sur <strong>{portfolioName}</strong> depuis ta dernière visite.
      </p>
      <Link href={`/portfolio/${portfolioId}?suggest=${encodeURIComponent(suggest)}`}
        className="shrink-0 rounded-full px-4 py-2 text-xs font-medium transition hover:opacity-80"
        style={{ background: "#1c1917", color: "white" }}>
        Ajouter à mon portfolio →
      </Link>
    </div>
  );
}
