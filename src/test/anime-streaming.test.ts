import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { handleAnimeStreaming, parseStreamPlayback } from "../server/anime/streaming";

beforeEach(() => {
  vi.stubEnv("ANIME_STREAM_API_URL", "https://stream-provider.example");
  vi.stubEnv("ANIME_STREAM_PROVIDER", "gogoanime");
  vi.stubEnv("ANIME_STREAM_API_KEY", "");
  for (const name of ["SEARCH", "INFO", "WATCH"]) vi.stubEnv(`ANIME_STREAM_${name}_PATH`, "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("anime streaming adapter", () => {
  it("uses the verified public AniVault default with explicit MAL identities and no private API key", async () => {
    vi.stubEnv("ANIME_STREAM_API_URL", undefined);
    vi.stubEnv("ANIME_STREAM_PROVIDER", "");
    vi.stubEnv("ANIME_STREAM_API_STYLE", "");
    vi.stubEnv("ANIME_STREAM_API_KEY", "test-private-key");
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json({ results: [{ id: 999, malId: 1, title: "Cowboy Bebop" }] }),
      );
    vi.stubGlobal("fetch", fetch);
    const response = await handleAnimeStreaming(
      new Request("https://site.example/api/anime/stream/search?q=Cowboy"),
    );
    expect(await response.json()).toMatchObject({
      results: [{ id: "mal-1/sub" }, { id: "mal-1/dub" }],
    });
    expect(fetch.mock.calls[0][0]).toBe(
      "https://anivault-scraper-test.vercel.app/api/search?q=Cowboy",
    );
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty("X-RapidAPI-Key");
  });
  it("adapts AniVault episode numbers and proxy sources without guessing AniList/MAL IDs", async () => {
    vi.stubEnv("ANIME_STREAM_API_URL", "https://anivault.example");
    vi.stubEnv("ANIME_STREAM_API_STYLE", "anivault");
    vi.stubEnv("ANIME_STREAM_PROVIDER", "anikoto");
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          title: "Cowboy Bebop",
          episodes: [{ num: 1, id: "opaque-provider-token", title: "Episode 1" }],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          hlsProxyUrl: "https://anivault.example/api/proxy/hls?url=test",
          embedUrl: "https://player.example/embed/1",
          server: "HD-1",
          subtitles: [{ url: "https://captions.example/en.vtt", lang: "English" }],
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const info = await handleAnimeStreaming(
      new Request("https://site.example/api/anime/stream/info?id=mal-1%2Fsub"),
    );
    expect(await info.json()).toMatchObject({ episodes: [{ id: "mal-1/sub/1", number: 1 }] });
    expect(fetch.mock.calls[0][0]).toBe(
      "https://anivault.example/api/episodes?malId=1&source=anikoto",
    );
    const watch = await handleAnimeStreaming(
      new Request("https://site.example/api/anime/stream/watch?id=mal-1%2Fsub%2F1"),
    );
    expect(await watch.json()).toMatchObject({
      sources: [{ type: "hls" }, { type: "embed" }],
      subtitles: [{ label: "English" }],
    });
    expect(fetch.mock.calls[1][0]).toBe("https://anivault.example/api/watch/anikoto/mal-1/1/sub");
  });
  it("reports missing configuration instead of inventing playable links", async () => {
    vi.stubEnv("ANIME_STREAM_API_URL", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await handleAnimeStreaming(
      new Request("https://site.example/api/anime/stream/search?q=Cowboy"),
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ code: "STREAM_NOT_CONFIGURED" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("searches the configured provider and uses its opaque IDs for info/watch", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ results: [{ id: "cowboy-dub", title: "Cowboy Bebop (Dub)" }] }),
      )
      .mockResolvedValueOnce(
        Response.json({ title: "Cowboy Bebop", episodes: [{ id: "opaque-episode-1", number: 1 }] }),
      )
      .mockResolvedValueOnce(
        Response.json({
          sources: [{ url: "https://media.example/episode.m3u8", isM3U8: true, quality: "1080p" }],
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const search = await handleAnimeStreaming(
      new Request("https://site.example/api/anime/stream/search?q=Cowboy%20Bebop"),
    );
    expect(await search.json()).toMatchObject({ results: [{ id: "cowboy-dub" }] });
    expect(fetch.mock.calls[0][0]).toBe(
      "https://stream-provider.example/anime/gogoanime/search/Cowboy%20Bebop",
    );
    const info = await handleAnimeStreaming(
      new Request("https://site.example/api/anime/stream/info?id=cowboy-dub"),
    );
    expect(await info.json()).toMatchObject({ episodes: [{ id: "opaque-episode-1", number: 1 }] });
    const watch = await handleAnimeStreaming(
      new Request("https://site.example/api/anime/stream/watch?id=opaque-episode-1"),
    );
    expect(await watch.json()).toEqual({
      sources: [{ url: "https://media.example/episode.m3u8", type: "hls", quality: "1080p" }],
    });
    expect(fetch.mock.calls[2][0]).toContain("/watch/opaque-episode-1");
    expect(watch.headers.get("Cache-Control")).toBe("no-store");
  });
  it("supports instances with query-string routes and keeps RapidAPI keys on the server", async () => {
    vi.stubEnv("ANIME_STREAM_INFO_PATH", "/anime/{provider}/info?id={id}");
    vi.stubEnv("ANIME_STREAM_API_KEY", "test-only-placeholder");
    const fetch = vi.fn().mockResolvedValue(Response.json({ episodes: [] }));
    vi.stubGlobal("fetch", fetch);
    const response = await handleAnimeStreaming(
      new Request("https://site.example/api/anime/stream/info?id=show%2Fseason-2"),
    );
    expect(response.status).toBe(200);
    expect(fetch.mock.calls[0][0]).toBe(
      "https://stream-provider.example/anime/gogoanime/info?id=show%2Fseason-2",
    );
    expect(fetch.mock.calls[0][1].headers["X-RapidAPI-Key"]).toBe("test-only-placeholder");
    expect(JSON.stringify(await response.json())).not.toContain("placeholder");
  });
  it("propagates quota errors without repeatedly retrying the upstream", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 429, headers: { "Retry-After": "30" } }));
    vi.stubGlobal("fetch", fetch);
    const response = await handleAnimeStreaming(
      new Request("https://site.example/api/anime/stream/watch?id=ep-1"),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([
    "http://provider.example",
    "https://127.0.0.1",
    "https://localhost",
    "https://user:pass@provider.example",
  ])("rejects unsafe provider configuration %s", async (base) => {
    vi.stubEnv("ANIME_STREAM_API_URL", base);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(
      (
        await handleAnimeStreaming(
          new Request("https://site.example/api/anime/stream/search?q=anime"),
        )
      ).status,
    ).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rejects script URLs and unsupported media instead of injecting HTML", () => {
    expect(() =>
      parseStreamPlayback({ sources: [{ url: "javascript:alert(1)", type: "iframe" }] }),
    ).toThrow();
    expect(() =>
      parseStreamPlayback({ sources: [{ url: "https://media.example/unknown" }] }),
    ).toThrow();
    expect(() =>
      parseStreamPlayback({
        headers: { Referer: "https://provider.example" },
        sources: [{ url: "https://media.example/video.mp4" }],
      }),
    ).toThrow();
    expect(parseStreamPlayback({ embed: "https://player.example/embed/ep-1" })).toMatchObject({
      sources: [{ type: "embed" }],
    });
  });
});
