import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeAnime, youtubeId } from "../server/anime/normalize";

const fixture = {
  mal_id: 1,
  title: "Cowboy Bebop",
  images: { jpg: { large_image_url: "https://cdn.myanimelist.net/bebop.jpg" } },
  trailer: { youtube_id: "qig4KOK2R2g" },
  synopsis: null,
  score: 8.75,
  genres: [{ name: "Action" }],
  studios: [{ name: "Sunrise" }],
  year: 1998,
  status: "Finished Airing",
  episodes: 26,
};

beforeEach(() => vi.resetModules());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Tenrai backend integration", () => {
  it("revalidates expired catalog entries using the upstream ETag", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1_000_000);
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { data: [fixture], pagination: { has_next_page: false } },
          { headers: { ETag: "catalog-1" } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 304 }));
    vi.stubGlobal("fetch", fetch);
    const { handleAnimeApi } = await import("../server/anime/api");
    await handleAnimeApi(new Request("https://nipponbr.test/api/anime"));
    clock.mockReturnValue(1_400_000);
    const response = await handleAnimeApi(new Request("https://nipponbr.test/api/anime"));
    expect(response.status).toBe(200);
    expect(fetch.mock.calls[1][1].headers["If-None-Match"]).toBe("catalog-1");
    expect(await response.json()).toMatchObject({ items: [{ title: "Cowboy Bebop" }] });
  });

  it("proxies only MAL cover images and never arbitrary destinations", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([255, 216, 255]), {
        headers: { "Content-Type": "image/jpeg" },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const { handleAnimeApi } = await import("../server/anime/api");
    const allowed = new Request(
      "https://nipponbr.test/api/anime/cover?url=" +
        encodeURIComponent("https://cdn.myanimelist.net/images/anime/1.jpg"),
    );
    const response = await handleAnimeApi(allowed);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(fetch.mock.calls[0][1].redirect).toBe("error");
    for (const url of [
      "https://evil.test/image.jpg",
      "http://cdn.myanimelist.net/image.jpg",
      "https://cdn.myanimelist.net/file.svg",
      "https://cdn.myanimelist.net@127.0.0.1/image.jpg",
    ]) {
      expect(
        (
          await handleAnimeApi(
            new Request("https://nipponbr.test/api/anime/cover?url=" + encodeURIComponent(url)),
          )
        ).status,
      ).toBe(400);
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("uses the documented season endpoint and serves repeated requests from cache", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { data: [fixture], pagination: { has_next_page: true } },
          { headers: { ETag: "season-1" } },
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const { handleAnimeApi } = await import("../server/anime/api");
    const request = () => new Request("https://nipponbr.test/api/anime?collection=seasonal&page=2");
    const response = await handleAnimeApi(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      items: [{ id: 1, title: "Cowboy Bebop", synopsis: "", studios: ["Sunrise"] }],
      hasNextPage: true,
    });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://api.tenrai.org/v1/seasons/now");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.has("sfw")).toBe(true);
    expect(url.searchParams.has("year")).toBe(false);
    await handleAnimeApi(request());
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["popular", "bypopularity"],
    ["ranking", null],
  ])("loads %s using the ranking endpoint", async (collection, filter) => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ data: [fixture], pagination: { has_next_page: false } }));
    vi.stubGlobal("fetch", fetch);
    const { handleAnimeApi } = await import("../server/anime/api");
    await handleAnimeApi(new Request(`https://nipponbr.test/api/anime?collection=${collection}`));
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.pathname).toBe("/v1/top/anime");
    expect(url.searchParams.get("filter")).toBe(filter);
  });

  it("encodes title searches and preserves empty results as success", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({ data: [], pagination: { has_next_page: false } }));
    vi.stubGlobal("fetch", fetch);
    const { handleAnimeApi } = await import("../server/anime/api");
    const response = await handleAnimeApi(
      new Request("https://nipponbr.test/api/anime?q=Fate%20%26%20Zero"),
    );
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.pathname).toBe("/v1/anime");
    expect(url.searchParams.get("q")).toBe("Fate & Zero");
    expect(await response.json()).toEqual({ items: [], hasNextPage: false });
  });

  it("fetches paginated episode titles and dates without requesting video streams", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        data: [{ mal_id: 101, title: "Episode 101", aired: "2026-10-01T00:00:00Z" }],
        pagination: { has_next_page: true },
      }),
    );
    vi.stubGlobal("fetch", fetch);
    const { handleAnimeApi } = await import("../server/anime/api");
    const response = await handleAnimeApi(
      new Request("https://nipponbr.test/api/anime/1/episodes?page=2"),
    );
    expect(fetch.mock.calls[0][0]).toBe("https://api.tenrai.org/v1/anime/1/episodes?page=2");
    expect(await response.json()).toEqual({
      items: [{ id: 101, title: "Episode 101", aired: "2026-10-01T00:00:00Z" }],
      hasNextPage: true,
    });
  });

  it("propagates Retry-After and avoids immediately hitting the rate-limited upstream again", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(Response.json({}, { status: 429, headers: { "Retry-After": "12" } }));
    vi.stubGlobal("fetch", fetch);
    const { handleAnimeApi } = await import("../server/anime/api");
    const response = await handleAnimeApi(new Request("https://nipponbr.test/api/anime/1"));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("12");
    expect((await handleAnimeApi(new Request("https://nipponbr.test/api/anime/2"))).status).toBe(
      429,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid paths and pagination before making any external request", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { handleAnimeApi } = await import("../server/anime/api");
    expect(
      (await handleAnimeApi(new Request("https://nipponbr.test/api/anime/../../secrets"))).status,
    ).toBe(404);
    expect(
      (await handleAnimeApi(new Request("https://nipponbr.test/api/anime?page=-1"))).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports malformed upstream data as an error instead of silently displaying an empty catalog", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ unexpected: [] })));
    const { handleAnimeApi } = await import("../server/anime/api");
    const response = await handleAnimeApi(new Request("https://nipponbr.test/api/anime"));
    expect(response.status).toBe(502);
    expect(await response.json()).toHaveProperty("error");
  });
});

describe("Tenrai media normalization", () => {
  it("handles null MAL fields and accepts only YouTube IDs or official HTTPS YouTube URLs", () => {
    expect(
      normalizeAnime({
        ...fixture,
        images: {},
        trailer: null,
        year: null,
        score: null,
        episodes: null,
      }),
    ).toMatchObject({ coverUrl: "", trailerId: null, year: null, score: null, episodeCount: null });
    expect(youtubeId("https://www.youtube.com/watch?v=qig4KOK2R2g")).toBe("qig4KOK2R2g");
    expect(youtubeId("https://youtu.be/qig4KOK2R2g")).toBe("qig4KOK2R2g");
    expect(youtubeId("https://evil.test/embed/qig4KOK2R2g")).toBeNull();
    expect(youtubeId("javascript:alert(1)")).toBeNull();
  });
});
