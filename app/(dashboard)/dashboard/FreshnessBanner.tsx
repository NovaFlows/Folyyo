"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GitHubRepo, YouTubeVideo } from "@/types/portfolio";

// Bannière "il y a du nouveau" — ne modifie jamais le portfolio sans accord
// explicite : "Oui" déclenche l'édition IA avec l'instruction suggérée
// (le portfolio passe en statut "en cours d'édition" pendant ce temps, comme
// pour toute édition depuis le chat), "Non" masque juste la bannière — le
// check de fraîcheur suivant ne re-proposera pas ces mêmes éléments (déjà
// marqués "connus" au moment du check, voir lib/freshness/check.ts).
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
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "dismissed" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  if (status === "dismissed" || status === "done") return null;

  const bits: string[] = [];
  if (newRepos.length) bits.push(`${newRepos.length} nouveau${newRepos.length > 1 ? "x" : ""} repo${newRepos.length > 1 ? "s" : ""} GitHub`);
  if (newVideos.length) bits.push(`${newVideos.length} nouvelle${newVideos.length > 1 ? "s" : ""} vidéo${newVideos.length > 1 ? "s" : ""} YouTube`);

  async function handleYes() {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/portfolio/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolioId, instruction: buildSuggestion(newRepos, newVideos) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur inconnue"); setStatus("error"); return; }
      setStatus("done");
      router.refresh();
    } catch {
      setError("Erreur réseau");
      setStatus("error");
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
      style={{ background: "rgba(201,169,110,0.08)", border: "1px solid rgba(201,169,110,0.2)" }}>
      <div>
        <p className="text-sm" style={{ color: "#1c1917" }}>
          🎉 <strong>{bits.join(" et ")}</strong> sur <strong>{portfolioName}</strong> depuis ta dernière visite.
          {status === "idle" && " Les ajouter à ton portfolio ?"}
          {status === "loading" && " Ajout en cours…"}
        </p>
        {error && <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
      </div>
      {status !== "loading" && (
        <div className="flex shrink-0 gap-2">
          <button onClick={handleYes}
            className="rounded-full px-4 py-2 text-xs font-medium transition hover:opacity-80"
            style={{ background: "#1c1917", color: "white" }}>
            {status === "error" ? "Réessayer" : "Oui →"}
          </button>
          <button onClick={() => setStatus("dismissed")}
            className="rounded-full px-4 py-2 text-xs font-medium transition hover:opacity-70"
            style={{ border: "1px solid rgba(0,0,0,0.1)", color: "#78716c" }}>
            Non
          </button>
        </div>
      )}
    </div>
  );
}
