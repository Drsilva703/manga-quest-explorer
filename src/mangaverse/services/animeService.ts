import type { Anime, AnimePage, AnimeEpisodePage } from "../types/anime";

export type AnimeCollection = "popular" | "seasonal" | "ranking";

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/anime${path}`, { signal });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || "Não foi possível carregar os animes. Tente novamente.");
  }
  return response.json();
}

export function fetchAnimeCatalog(
  collection: AnimeCollection,
  query: string,
  page: number,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ collection, page: String(page) });
  if (query.trim()) params.set("q", query.trim());
  return request<AnimePage>(`?${params}`, signal);
}

export function fetchAnimeDetails(id: number, signal?: AbortSignal) {
  return request<Anime>(`/${id}`, signal);
}

export function fetchAnimeEpisodes(id: number, page: number, signal?: AbortSignal) {
  return request<AnimeEpisodePage>(`/${id}/episodes?page=${page}`, signal);
}
