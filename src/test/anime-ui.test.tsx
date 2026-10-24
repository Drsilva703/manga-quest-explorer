import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimeView } from "../mangaverse/views/AnimeView";
import { AnimeDetailsView } from "../mangaverse/views/AnimeDetailsView";
import { AnimeLibrary } from "../mangaverse/components/AnimeLibrary";
import { getAnimeLibrary } from "../mangaverse/services/animeStorage";
import type { Anime } from "../mangaverse/types/anime";

const anime: Anime = {
  id: 1,
  title: "Cowboy Bebop",
  coverUrl: "",
  synopsis: "Uma tripulação de caçadores de recompensas.",
  score: 8.75,
  genres: ["Ação"],
  studios: ["Sunrise"],
  year: 1998,
  status: "Finalizado",
  episodeCount: 26,
  trailerId: "qig4KOK2R2g",
};
function mount(element: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("anime discovery and library", () => {
  it("searches by title, pages results and opens the selected anime", async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(Response.json({ items: [anime], hasNextPage: true })),
      );
    vi.stubGlobal("fetch", fetch);
    const onSelect = vi.fn();
    mount(<AnimeView onSelect={onSelect} />);
    await screen.findByRole("button", { name: "Ver detalhes de Cowboy Bebop" });
    fireEvent.change(screen.getByLabelText("Nome do anime"), { target: { value: "Cowboy" } });
    fireEvent.submit(screen.getByRole("search", { name: "Buscar animes" }));
    await screen.findByText("Resultados para “Cowboy”");
    expect(fetch.mock.calls.some(([url]) => url.includes("q=Cowboy"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Próxima página de animes" }));
    await screen.findByText("Página 2");
    expect(fetch.mock.calls.some(([url]) => url.includes("page=2"))).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Ver detalhes de Cowboy Bebop" }));
    expect(onSelect).toHaveBeenCalledWith(anime);
  });

  it("persists favorites and watched progress across remounts and removes only the anime", async () => {
    localStorage.setItem("mangaverse_library", '[{"mangaId":"existing"}]');
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) =>
        Promise.resolve(
          Response.json(
            url.includes("/episodes")
              ? {
                  items: [{ id: 1, title: "Asteroid Blues", aired: "1998-04-03T00:00:00Z" }],
                  hasNextPage: false,
                }
              : anime,
          ),
        ),
      ),
    );
    const details = mount(<AnimeDetailsView anime={anime} onBack={vi.fn()} />);
    await screen.findByText("Asteroid Blues", { exact: false });
    fireEvent.click(screen.getByRole("button", { name: "Favoritar" }));
    fireEvent.click(screen.getByRole("button", { name: "Marcar visto até aqui" }));
    expect(getAnimeLibrary()[0]).toMatchObject({
      anime: { id: 1 },
      favorite: true,
      watchedEpisodes: 1,
      status: "watching",
    });
    fireEvent.click(screen.getByRole("button", { name: "Ver trailer no YouTube" }));
    expect(screen.getByTitle("Trailer oficial de Cowboy Bebop")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/qig4KOK2R2g",
    );
    details.unmount();
    mount(<AnimeLibrary onSelect={vi.fn()} onExplore={vi.fn()} />);
    expect(screen.getByLabelText("Episódios vistos de Cowboy Bebop")).toHaveValue(1);
    expect(screen.getByLabelText("Favoritar Cowboy Bebop")).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByLabelText("Status de Cowboy Bebop"), {
      target: { value: "completed" },
    });
    expect(getAnimeLibrary()[0].status).toBe("completed");
    fireEvent.click(screen.getByLabelText("Remover Cowboy Bebop"));
    expect(getAnimeLibrary()).toEqual([]);
    expect(localStorage.getItem("mangaverse_library")).toBe('[{"mangaId":"existing"}]');
  });

  it("shows errors and allows retrying instead of inventing catalog entries", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ error: "Tenrai indisponível" }, { status: 502 }))
      .mockResolvedValueOnce(Response.json({ error: "Tenrai indisponível" }, { status: 502 }))
      .mockImplementation(() => Promise.resolve(Response.json({ items: [], hasNextPage: false })));
    vi.stubGlobal("fetch", fetch);
    mount(<AnimeView onSelect={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("A Tenrai está indisponível");
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(
      await screen.findByText("Nenhum anime encontrado. Tente outro nome."),
    ).toBeInTheDocument();
  });

  it("does not show a successful favorite when browser storage fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementation((url: string) =>
          Promise.resolve(
            Response.json(url.includes("/episodes") ? { items: [], hasNextPage: false } : anime),
          ),
        ),
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    mount(<AnimeDetailsView anime={anime} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Favoritar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar");
    expect(getAnimeLibrary()).toEqual([]);
    expect(screen.getByRole("button", { name: "Favoritar" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
