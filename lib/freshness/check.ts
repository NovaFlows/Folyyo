import { fetchGitHubData } from "@/lib/github/fetch";
import { fetchYouTubeData } from "@/lib/youtube/fetch";
import { getSyncState, upsertSyncState } from "@/lib/db/queries";
import type { DeveloperInputData, GitHubRepo, YouTubeVideo } from "@/types/portfolio";
import type { Portfolio } from "@/types";

// Ne re-vérifie pas plus d'une fois par 24h par portfolio, pour ne pas
// re-frapper les API GitHub/YouTube à chaque chargement du dashboard.
const THROTTLE_MS = 24 * 60 * 60 * 1000;

export interface FreshnessResult {
  newRepos: GitHubRepo[];
  newVideos: YouTubeVideo[];
}

function extractYoutubeHandle(youtubeUrl?: string): string | undefined {
  const m = youtubeUrl?.match(/youtube\.com\/@([^/?]+)/i);
  return m?.[1];
}

// Vérifie si le profil GitHub/YouTube connecté à un portfolio a du nouveau
// contenu depuis le dernier check. Retourne null si le portfolio n'est pas
// concerné (aucun profil connecté) ou si le throttle 24h n'est pas écoulé.
// Au tout premier check, enregistre l'état actuel comme référence SANS
// remonter d'alerte (sinon tout le monde verrait "N nouveautés" au lancement
// de la fonctionnalité).
export async function checkFreshness(portfolio: Portfolio): Promise<FreshnessResult | null> {
  const inputData = portfolio.input_data as DeveloperInputData | null;
  const githubUsername = inputData?.github_username;
  const youtubeHandle = extractYoutubeHandle(inputData?.youtube_url);
  if (!githubUsername && !youtubeHandle) return null;

  const syncState = await getSyncState(portfolio.id);
  const isFirstCheck = !syncState;
  if (syncState && Date.now() - new Date(syncState.last_checked_at).getTime() < THROTTLE_MS) {
    return null;
  }

  const [githubData, youtubeData] = await Promise.all([
    githubUsername ? fetchGitHubData(githubUsername).catch(() => null) : Promise.resolve(null),
    youtubeHandle ? fetchYouTubeData(youtubeHandle).catch(() => null) : Promise.resolve(null),
  ]);

  const currentRepoIds = githubData?.repos.map((r) => r.id) ?? [];
  const currentVideoIds = youtubeData?.videos.map((v) => v.videoId) ?? [];

  const knownRepoIds = new Set(syncState?.known_repo_ids ?? []);
  const knownVideoIds = new Set(syncState?.known_video_ids ?? []);

  await upsertSyncState(portfolio.id, { knownRepoIds: currentRepoIds, knownVideoIds: currentVideoIds });

  if (isFirstCheck) return { newRepos: [], newVideos: [] };

  return {
    newRepos: (githubData?.repos ?? []).filter((r) => !knownRepoIds.has(r.id)),
    newVideos: (youtubeData?.videos ?? []).filter((v) => !knownVideoIds.has(v.videoId)),
  };
}
