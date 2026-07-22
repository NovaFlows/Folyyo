import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchGitHubData } from "./fetch";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

function makeRepo(overrides: Partial<{
  id: number; name: string; stargazers_count: number; fork: boolean; language: string | null; topics: string[];
}>) {
  return {
    id: 1, name: "repo", description: "desc", html_url: "https://github.com/x/repo",
    homepage: null, stargazers_count: 0, language: null, topics: [], fork: false, pushed_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const USER = { bio: "Hello", avatar_url: "https://avatar", followers: 42, public_repos: 5 };

describe("fetchGitHubData", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns user info and top repos sorted by stars, forks excluded", async () => {
    const repos = [
      makeRepo({ id: 1, name: "low-star", stargazers_count: 5, language: "TypeScript" }),
      makeRepo({ id: 2, name: "forked", stargazers_count: 999, fork: true, language: "Go" }),
      makeRepo({ id: 3, name: "top-star", stargazers_count: 100, language: "TypeScript" }),
    ];
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("/repos")) return jsonResponse(repos);
      return jsonResponse(USER);
    });

    const data = await fetchGitHubData("someuser");

    expect(data.bio).toBe("Hello");
    expect(data.avatar_url).toBe("https://avatar");
    expect(data.followers).toBe(42);
    expect(data.public_repos).toBe(5);
    // Le fork (999 stars) est exclu malgré son score le plus élevé.
    expect(data.repos.map((r) => r.name)).toEqual(["top-star", "low-star"]);
  });

  it("respects the limit parameter after sorting", async () => {
    const repos = [1, 2, 3, 4].map((n) => makeRepo({ id: n, name: `r${n}`, stargazers_count: n }));
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("/repos")) return jsonResponse(repos);
      return jsonResponse(USER);
    });

    const data = await fetchGitHubData("someuser", 2);
    expect(data.repos).toHaveLength(2);
    expect(data.repos.map((r) => r.name)).toEqual(["r4", "r3"]);
  });

  it("counts languages across ALL repos, not just the top N kept", async () => {
    const repos = [
      makeRepo({ id: 1, name: "a", stargazers_count: 10, language: "TypeScript" }),
      makeRepo({ id: 2, name: "b", stargazers_count: 1, language: "TypeScript" }),
      makeRepo({ id: 3, name: "c", stargazers_count: 0, language: "Python" }),
    ];
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("/repos")) return jsonResponse(repos);
      return jsonResponse(USER);
    });

    // limit=1 ne garde qu'un seul repo dans `repos`, mais top_languages doit
    // quand même refléter les 3 repos d'origine.
    const data = await fetchGitHubData("someuser", 1);
    expect(data.repos).toHaveLength(1);
    expect(data.top_languages).toEqual({ TypeScript: 2, Python: 1 });
  });

  it("throws a friendly error when the user is not found (404)", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("/repos")) return jsonResponse([]);
      return jsonResponse({}, false, 404);
    });

    await expect(fetchGitHubData("ghost")).rejects.toThrow('Utilisateur GitHub "ghost" introuvable');
  });

  it("throws a generic error for other non-ok user statuses", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("/repos")) return jsonResponse([]);
      return jsonResponse({}, false, 500);
    });

    await expect(fetchGitHubData("someuser")).rejects.toThrow("GitHub API error: 500");
  });

  it("falls back to an empty repo list if the repos request fails, without throwing", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("/repos")) return jsonResponse({}, false, 403);
      return jsonResponse(USER);
    });

    const data = await fetchGitHubData("someuser");
    expect(data.repos).toEqual([]);
    expect(data.top_languages).toEqual({});
  });
});
