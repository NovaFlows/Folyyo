import type { GitHubData, GitHubRepo } from "@/types/portfolio";

const BASE = "https://api.github.com";

function headers() {
  return {
    Accept: "application/vnd.github+json",
    ...(process.env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
      : {}),
  };
}

// limit=6 par défaut (utilisé à la génération/rafraîchissement, on ne veut
// que les meilleurs) ; le picker de l'éditeur ("parcourir tous mes repos")
// passe une limite plus large pour lister tout le catalogue.
export async function fetchGitHubData(username: string, limit = 6): Promise<GitHubData> {
  const [userRes, reposRes] = await Promise.all([
    fetch(`${BASE}/users/${username}`, { headers: headers() }),
    fetch(`${BASE}/users/${username}/repos?per_page=100&sort=updated`, {
      headers: headers(),
    }),
  ]);

  if (!userRes.ok) {
    if (userRes.status === 404) throw new Error(`Utilisateur GitHub "${username}" introuvable`);
    throw new Error(`GitHub API error: ${userRes.status}`);
  }

  const user = await userRes.json();
  const allRepos: GitHubRepo[] = reposRes.ok ? await reposRes.json() : [];

  // Filter out forks, keep top N by stars
  const ownRepos = allRepos
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, limit)
    .map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      html_url: r.html_url,
      homepage: r.homepage,
      stargazers_count: r.stargazers_count,
      language: r.language,
      topics: r.topics ?? [],
      fork: r.fork,
      pushed_at: r.pushed_at,
    }));

  // Count languages across all repos
  const languageCount: Record<string, number> = {};
  for (const repo of allRepos) {
    if (repo.language) {
      languageCount[repo.language] = (languageCount[repo.language] ?? 0) + 1;
    }
  }

  return {
    bio: user.bio ?? null,
    avatar_url: user.avatar_url,
    followers: user.followers,
    public_repos: user.public_repos,
    repos: ownRepos,
    top_languages: languageCount,
  };
}
