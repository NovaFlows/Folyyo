import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRandomPhoto } from "./fetch";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

// On part de `raw` (l'original) et non de `regular` : c'est `raw` qui accepte
// les paramètres de recadrage et de retouche.
const PHOTO = {
  urls: { raw: "https://images.unsplash.com/photo-abc?ixid=xyz" },
  user: { name: "Jane Doe", links: { html: "https://unsplash.com/@janedoe" } },
  links: { html: "https://unsplash.com/photos/abc", download_location: "https://api.unsplash.com/photos/abc/download" },
};

describe("fetchRandomPhoto", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.UNSPLASH_ACCESS_KEY;
  });

  it("returns null without UNSPLASH_ACCESS_KEY configured, without calling fetch", async () => {
    delete process.env.UNSPLASH_ACCESS_KEY;
    const result = await fetchRandomPhoto("developer");
    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns the photo url and credit on success, and pings download_location", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("/download")) return jsonResponse({});
      return jsonResponse(PHOTO);
    });

    const result = await fetchRandomPhoto("developer workspace");
    expect(result?.credit).toEqual({
      name: "Jane Doe",
      profileUrl: "https://unsplash.com/@janedoe",
      photoUrl: "https://unsplash.com/photos/abc",
    });
    // L'URL doit repartir de l'original ET porter le recadrage + la retouche.
    // `crop=entropy` est le point important : un recadrage centré coupe le
    // sujet une fois sur deux sur un format aussi panoramique que le hero.
    expect(result?.url).toContain("https://images.unsplash.com/photo-abc");
    expect(result?.url).toContain("fit=crop");
    expect(result?.url).toContain("crop=entropy");
    expect(result?.url).toContain("auto=format");
    // Le paramètre ixid d'origine est conservé, et on enchaîne avec « & »
    // plutôt que d'ouvrir une seconde query string.
    expect(result?.url).toContain("ixid=xyz&");
    expect(result?.url).not.toContain("??");

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/photos/random"), expect.objectContaining({ headers: { Authorization: "Client-ID test-key" } }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/download"));
  });

  it("ouvre une query string quand l'URL d'origine n'en a pas", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("/download")) return jsonResponse({});
      return jsonResponse({ ...PHOTO, urls: { raw: "https://images.unsplash.com/photo-nq" } });
    });
    const result = await fetchRandomPhoto("designer");
    expect(result?.url).toContain("photo-nq?w=");
    expect(result?.url).not.toContain("??");
  });

  it("returns null when the API responds with a non-ok status", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}, false));
    const result = await fetchRandomPhoto("developer");
    expect(result).toBeNull();
  });

  it("returns null instead of throwing on a network error", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network down"));
    const result = await fetchRandomPhoto("developer");
    expect(result).toBeNull();
  });

  it("returns null if the response is missing expected fields", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key";
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({ urls: {} }));
    const result = await fetchRandomPhoto("developer");
    expect(result).toBeNull();
  });
});
