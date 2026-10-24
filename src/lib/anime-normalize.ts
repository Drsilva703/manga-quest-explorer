import { z } from "zod";
import type { Anime, AnimeEpisode } from "../mangaverse/types/anime";

const record = z.record(z.unknown());
const names = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap((item) =>
        typeof item === "string"
          ? [item]
          : item && typeof item.name === "string"
            ? [item.name]
            : [],
      )
    : [];
const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const text = (value: unknown) => (typeof value === "string" ? value : "");

export function youtubeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^[\w-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    let id: string | null = null;
    if (url.hostname === "youtu.be") id = url.pathname.slice(1);
    if (["www.youtube.com", "youtube.com", "www.youtube-nocookie.com"].includes(url.hostname)) {
      id =
        url.searchParams.get("v") ||
        url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})$/)?.[1] ||
        null;
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function normalizeAnime(value: unknown): Anime {
  const item = record.parse(value);
  const id = z
    .number()
    .int()
    .positive()
    .parse(item.mal_id ?? item.id);
  const title = z
    .string()
    .min(1)
    .parse(item.title ?? item.title_english);
  const images = item.images as
    { jpg?: { large_image_url?: string; image_url?: string } } | undefined;
  const trailer = item.trailer as
    { youtube_id?: string; url?: string; embed_url?: string } | undefined;
  const rawCover = text(
    images?.jpg?.large_image_url || images?.jpg?.image_url || item.cover_url || item.image_url,
  );
  let coverUrl = "";
  try {
    const url = new URL(rawCover);
    if (url.protocol === "https:") coverUrl = url.href;
  } catch {
    /* Render a placeholder. */
  }
  return {
    id,
    title,
    coverUrl,
    synopsis: text(item.synopsis),
    score: number(item.score),
    genres: names(item.genres),
    studios: names(item.studios),
    year: number(item.year),
    status:
      (
        {
          "Finished Airing": "Finalizado",
          "Currently Airing": "Em exibição",
          "Not yet aired": "Em breve",
        } as Record<string, string>
      )[text(item.status)] || text(item.status),
    episodeCount: number(item.episodes),
    trailerId: youtubeId(trailer?.youtube_id || trailer?.url || trailer?.embed_url),
  };
}

export function normalizeEpisode(value: unknown): AnimeEpisode {
  const item = record.parse(value);
  return {
    id: z
      .number()
      .int()
      .positive()
      .parse(item.mal_id ?? item.id ?? item.number),
    title: text(item.title) || text(item.title_romanji) || "Título não informado",
    aired: typeof item.aired === "string" ? item.aired : null,
  };
}

export function parsePage<T>(value: unknown, normalize: (item: unknown) => T) {
  const body = record.parse(value);
  const data = z.array(z.unknown()).parse(body.data);
  const pagination = body.pagination as { has_next_page?: boolean } | undefined;
  return { items: data.map(normalize), hasNextPage: pagination?.has_next_page === true };
}
