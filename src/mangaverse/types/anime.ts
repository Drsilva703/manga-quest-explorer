export interface Anime {
  id: number;
  title: string;
  coverUrl: string;
  synopsis: string;
  score: number | null;
  genres: string[];
  studios: string[];
  year: number | null;
  status: string;
  episodeCount: number | null;
  trailerId: string | null;
}

export interface AnimeEpisode {
  id: number;
  title: string;
  aired: string | null;
}

export type AnimeShelf = "watching" | "planned" | "completed" | "dropped";
export interface AnimeLibraryEntry {
  anime: Anime;
  status: AnimeShelf;
  favorite: boolean;
  watchedEpisodes: number;
}

export interface AnimePage {
  items: Anime[];
  hasNextPage: boolean;
}

export interface AnimeEpisodePage {
  items: AnimeEpisode[];
  hasNextPage: boolean;
}
