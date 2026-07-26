import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchRandomPhoto } from "./fetch";

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

const PHOTO = {
  urls: { regular: "https://images.unsplash.com/photo-abc" },
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
    expect(result).toEqual({
      url: "https://images.unsplash.com/photo-abc",
      credit: { name: "Jane Doe", profileUrl: "https://unsplash.com/@janedoe", photoUrl: "https://unsplash.com/photos/abc" },
    });
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/photos/random"), expect.objectContaining({ headers: { Authorization: "Client-ID test-key" } }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/download"));
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
