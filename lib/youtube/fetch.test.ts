import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// `YT_KEY` est capturé une seule fois au chargement du module (constante de
// haut niveau) — pour tester le cas "clé absente" ET le cas "clé présente"
// dans le même fichier, chaque test réimporte le module via `vi.resetModules`
// après avoir positionné `process.env.YOUTUBE_API_KEY`, plutôt qu'un import
// statique unique qui figerait la valeur au premier test exécuté.
async function loadWithKey(key: string | undefined) {
  vi.resetModules();
  if (key === undefined) delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY = key;
  return import("./fetch");
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

const CHANNEL_ITEM = {
  snippet: {
    title: "Mon Artiste",
    description: "Bio de la chaîne",
    thumbnails: { high: { url: "https://thumb.hi" }, medium: { url: "https://thumb.med" } },
  },
  statistics: { subscriberCount: "1300", videoCount: "14", viewCount: "8400" },
  contentDetails: { relatedPlaylists: { uploads: "UUuploads123" } },
};

const PLAYLIST_ITEMS = [
  { snippet: { resourceId: { videoId: "vid1" }, publishedAt: "2026-01-01T00:00:00Z" } },
  { snippet: { resourceId: { videoId: "vid2" }, publishedAt: "2026-01-02T00:00:00Z" } },
];

const VIDEOS_ITEMS = [
  { id: "vid1", snippet: { title: "Titre 1", description: "Desc 1", publishedAt: "2026-01-01T00:00:00Z", thumbnails: { medium: { url: "https://v1.jpg" } } }, statistics: { viewCount: "100" } },
  { id: "vid2", snippet: { title: "Titre 2", description: "Desc 2", publishedAt: "2026-01-02T00:00:00Z", thumbnails: { medium: { url: "https://v2.jpg" } } }, statistics: { viewCount: "200" } },
];

describe("fetchYouTubeData", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.YOUTUBE_API_KEY;
  });

  it("throws if YOUTUBE_API_KEY is not configured", async () => {
    const { fetchYouTubeData } = await loadWithKey(undefined);
    await expect(fetchYouTubeData("@someone")).rejects.toThrow("YOUTUBE_API_KEY non configurée");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("resolves a channel via forHandle and returns channel info + videos", async () => {
    const { fetchYouTubeData } = await loadWithKey("test-key");
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("forHandle")) return jsonResponse({ items: [CHANNEL_ITEM] });
      if (url.includes("playlistItems")) return jsonResponse({ items: PLAYLIST_ITEMS });
      if (url.includes("/videos?")) return jsonResponse({ items: VIDEOS_ITEMS });
      throw new Error(`unexpected url: ${url}`);
    });

    const data = await fetchYouTubeData("@someone");

    expect(data.channelName).toBe("Mon Artiste");
    expect(data.channelAvatarUrl).toBe("https://thumb.hi");
    expect(data.subscriberCount).toBe(1300);
    expect(data.videoCount).toBe(14);
    expect(data.viewCount).toBe(8400);
    expect(data.videos).toHaveLength(2);
    expect(data.videos[0]).toMatchObject({ videoId: "vid1", title: "Titre 1", viewCount: "100" });
  });

  it("falls back to forUsername when forHandle returns no results", async () => {
    const { fetchYouTubeData } = await loadWithKey("test-key");
    let forHandleCalls = 0;
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("forHandle")) { forHandleCalls++; return jsonResponse({ items: [] }); }
      if (url.includes("forUsername")) return jsonResponse({ items: [CHANNEL_ITEM] });
      if (url.includes("playlistItems")) return jsonResponse({ items: [] });
      throw new Error(`unexpected url: ${url}`);
    });

    const data = await fetchYouTubeData("legacyname");
    expect(forHandleCalls).toBe(1);
    expect(data.channelName).toBe("Mon Artiste");
  });

  it("throws a friendly error when no channel is found via either method", async () => {
    const { fetchYouTubeData } = await loadWithKey("test-key");
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => jsonResponse({ items: [] }));

    await expect(fetchYouTubeData("ghost")).rejects.toThrow("Chaîne YouTube introuvable");
  });

  it("returns an empty videos array without a third request if the uploads playlist is empty", async () => {
    const { fetchYouTubeData } = await loadWithKey("test-key");
    const calls: string[] = [];
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      calls.push(url);
      if (url.includes("forHandle")) return jsonResponse({ items: [CHANNEL_ITEM] });
      if (url.includes("playlistItems")) return jsonResponse({ items: [] });
      throw new Error(`unexpected url: ${url}`);
    });

    const data = await fetchYouTubeData("@someone");
    expect(data.videos).toEqual([]);
    expect(calls.some((u) => u.includes("/videos?"))).toBe(false);
  });

  it("clamps maxResults between 1 and 50", async () => {
    const { fetchYouTubeData } = await loadWithKey("test-key");
    let playlistUrl = "";
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("forHandle")) return jsonResponse({ items: [CHANNEL_ITEM] });
      if (url.includes("playlistItems")) { playlistUrl = url; return jsonResponse({ items: [] }); }
      throw new Error(`unexpected url: ${url}`);
    });

    await fetchYouTubeData("@someone", 500);
    expect(playlistUrl).toContain("maxResults=50");
  });
});
