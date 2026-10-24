import type { AnimeShelf } from "../types/anime";

export const ANIME_STATUS_LABELS: Record<AnimeShelf, string> = {
  watching: "Assistindo",
  planned: "Quero assistir",
  completed: "Concluído",
  dropped: "Abandonado",
};
