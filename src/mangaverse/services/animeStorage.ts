import type { Anime, AnimeLibraryEntry } from "../types/anime";

// Keep the manga keys unchanged so the rebrand does not erase existing libraries.
const KEY = "nipponbr_anime_library_v1";
export const ANIME_LIBRARY_EVENT = "nipponbr:anime-library";

export function getAnimeLibrary(): AnimeLibraryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is AnimeLibraryEntry =>
        item &&
        Number.isSafeInteger(item.anime?.id) &&
        typeof item.anime?.title === "string" &&
        ["watching", "planned", "completed", "dropped"].includes(item.status) &&
        typeof item.favorite === "boolean" &&
        Number.isSafeInteger(item.watchedEpisodes) &&
        item.watchedEpisodes >= 0,
    );
  } catch {
    return [];
  }
}

export function saveAnime(anime: Anime, patch: Partial<Omit<AnimeLibraryEntry, "anime">>) {
  const items = getAnimeLibrary();
  const previous = items.find((item) => item.anime.id === anime.id);
  const entry: AnimeLibraryEntry = {
    status: "planned",
    favorite: false,
    watchedEpisodes: 0,
    ...previous,
    ...patch,
    anime,
  };
  entry.watchedEpisodes = Math.max(0, Math.trunc(entry.watchedEpisodes) || 0);
  if (anime.episodeCount !== null)
    entry.watchedEpisodes = Math.min(entry.watchedEpisodes, anime.episodeCount);
  // A failed write must be visible to the caller; do not report a saved favorite.
  window.localStorage.setItem(
    KEY,
    JSON.stringify([entry, ...items.filter((item) => item.anime.id !== anime.id)]),
  );
  window.dispatchEvent(new Event(ANIME_LIBRARY_EVENT));
  return entry;
}

export function removeAnime(id: number) {
  window.localStorage.setItem(
    KEY,
    JSON.stringify(getAnimeLibrary().filter((item) => item.anime.id !== id)),
  );
  window.dispatchEvent(new Event(ANIME_LIBRARY_EVENT));
}
