import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimeWatchDialog } from "../mangaverse/components/AnimeWatchDialog";
import type { Anime } from "../mangaverse/types/anime";

const anime: Anime = {
  id: 1,
  title: "Cowboy Bebop",
  coverUrl: "",
  synopsis: "",
  score: null,
  genres: [],
  studios: [],
  year: 1998,
  status: "",
  episodeCount: 26,
  trailerId: null,
};
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function mount(onWatched = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <AnimeWatchDialog
        anime={anime}
        requestedEpisode={1}
        onClose={vi.fn()}
        onWatched={onWatched}
      />
    </QueryClientProvider>,
  );
  return onWatched;
}
describe("episode playback", () => {
  it("selects an actual provider episode, opens its video and only marks watched on end", async () => {
    const fetch = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        Response.json(
          url.includes("/search?")
            ? { results: [{ id: "provider-season-1", title: "Cowboy Bebop (Legendado)" }] }
            : url.includes("/info?")
              ? {
                  title: "Cowboy Bebop",
                  episodes: [
                    { id: "provider-ep-100", number: 1, title: "Asteroid Blues" },
                    { id: "provider-ep-101", number: 2, title: "Stray Dog Strut" },
                  ],
                }
              : {
                  sources: [
                    { url: "https://media.example/test.mp4", type: "video", quality: "720p" },
                  ],
                },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const watched = mount();
    fireEvent.click(await screen.findByRole("button", { name: "Cowboy Bebop (Legendado)" }));
    fireEvent.change(await screen.findByLabelText("Episódio para assistir"), {
      target: { value: "provider-ep-100" },
    });
    const video = await screen.findByLabelText("Cowboy Bebop · Episódio 1");
    await waitFor(() => expect(video).toHaveAttribute("src", "https://media.example/test.mp4"));
    expect(fetch.mock.calls.some(([url]) => url.includes("watch?id=provider-ep-100"))).toBe(true);
    expect(watched).not.toHaveBeenCalled();
    fireEvent.ended(video);
    expect(watched).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Próximo episódio →" }));
    await screen.findByLabelText("Cowboy Bebop · Episódio 2");
    expect(fetch.mock.calls.some(([url]) => url.includes("watch?id=provider-ep-101"))).toBe(true);
  });
  it("shows an unavailable source without a fake video", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "A reprodução ainda não está disponível." }, { status: 503 }),
        ),
    );
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A reprodução ainda não está disponível.",
    );
    expect(document.querySelector("video")).toBeNull();
  });
});
