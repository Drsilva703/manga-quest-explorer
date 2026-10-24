import { useEffect, useState } from "react";
import { ANIME_LIBRARY_EVENT, getAnimeLibrary } from "../services/animeStorage";
import type { AnimeLibraryEntry } from "../types/anime";

export function useAnimeLibrary() {
  const [items, setItems] = useState<AnimeLibraryEntry[]>([]);
  useEffect(() => {
    const refresh = () => setItems(getAnimeLibrary());
    refresh();
    window.addEventListener(ANIME_LIBRARY_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ANIME_LIBRARY_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return items;
}
