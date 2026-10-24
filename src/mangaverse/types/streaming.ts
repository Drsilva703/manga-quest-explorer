export interface StreamAnime {
  id: string;
  title: string;
  image: string | null;
}
export interface StreamEpisode {
  id: string;
  number: number;
  title: string;
}
export interface StreamInfo {
  title: string;
  episodes: StreamEpisode[];
}
export interface StreamSource {
  url: string;
  type: "hls" | "video" | "embed";
  quality: string;
}
export interface StreamPlayback {
  sources: StreamSource[];
  subtitles?: { url: string; label: string }[];
}
