import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rawAnime = {
  mal_id: 1,
  title: "Cowboy Bebop",
  images: {},
  genres: [],
  studios: [],
  trailer: {},
};
beforeEach(() => vi.resetModules());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("public Tenrai fallback", () => {
  it("loads the Tenrai schema when the hosted backend returns the reported error", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          {
            error: "Não foi possível consultar o catálogo da Tenrai. Tente novamente em instantes.",
          },
          { status: 502 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ data: [rawAnime], pagination: { has_next_page: true } }),
      );
    vi.stubGlobal("fetch", fetch);
    const { fetchAnimeCatalog } = await import("../mangaverse/services/animeService");
    expect(await fetchAnimeCatalog("seasonal", "", 1)).toMatchObject({
      items: [{ id: 1, title: "Cowboy Bebop" }],
      hasNextPage: true,
    });
    const url = new URL(fetch.mock.calls[1][0]);
    expect(url.origin + url.pathname).toBe("https://api.tenrai.org/v1/seasons/now");
    expect(fetch.mock.calls[1][1].credentials).toBe("omit");
  });

  it("uses the backend only when it succeeds", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ items: [], hasNextPage: false }));
    vi.stubGlobal("fetch", fetch);
    const { fetchAnimeCatalog } = await import("../mangaverse/services/animeService");
    expect(await fetchAnimeCatalog("ranking", "", 1)).toEqual({ items: [], hasNextPage: false });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back for details when the backend connection fails", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(Response.json({ data: rawAnime }));
    vi.stubGlobal("fetch", fetch);
    const { fetchAnimeDetails } = await import("../mangaverse/services/animeService");
    expect(await fetchAnimeDetails(1)).toMatchObject({ id: 1, title: "Cowboy Bebop" });
    expect(fetch.mock.calls[1][0]).toBe("https://api.tenrai.org/v1/anime/1");
  });

  it("retains the episode page number in the public fallback", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(
        Response.json({
          data: [{ mal_id: 101, title: "Episode 101", aired: null }],
          pagination: { has_next_page: false },
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const { fetchAnimeEpisodes } = await import("../mangaverse/services/animeService");
    expect(await fetchAnimeEpisodes(1, 2)).toMatchObject({
      items: [{ id: 101 }],
      hasNextPage: false,
    });
    expect(fetch.mock.calls[1][0]).toBe("https://api.tenrai.org/v1/anime/1/episodes?page=2");
  });

  it.each([400, 404, 429])(
    "does not retry backend HTTP %s through another route",
    async (status) => {
      const fetch = vi.fn().mockResolvedValue(Response.json({ error: "Unavailable" }, { status }));
      vi.stubGlobal("fetch", fetch);
      const { fetchAnimeCatalog } = await import("../mangaverse/services/animeService");
      await expect(fetchAnimeCatalog("popular", "", 1)).rejects.toThrow("Unavailable");
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it("does not make a fallback request after navigation cancels the query", async () => {
    const controller = new AbortController();
    const fetch = vi.fn().mockImplementation(() => {
      controller.abort();
      return Promise.reject(new DOMException("Aborted", "AbortError"));
    });
    vi.stubGlobal("fetch", fetch);
    const { fetchAnimeCatalog } = await import("../mangaverse/services/animeService");
    await expect(fetchAnimeCatalog("popular", "", 1, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("respects a public rate limit instead of repeatedly hitting Tenrai", async () => {
    const fetch = vi
      .fn()
      .mockImplementation((url: string) =>
        Promise.resolve(
          url.startsWith("/api/")
            ? new Response(null, { status: 502 })
            : new Response(null, { status: 429, headers: { "Retry-After": "60" } }),
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const { fetchAnimeCatalog } = await import("../mangaverse/services/animeService");
    await expect(fetchAnimeCatalog("popular", "", 1)).rejects.toThrow("limitando");
    await expect(fetchAnimeCatalog("popular", "", 2)).rejects.toThrow("limitando");
    expect(
      fetch.mock.calls.filter(([url]) => url.startsWith("https://api.tenrai.org")),
    ).toHaveLength(1);
  });
});
