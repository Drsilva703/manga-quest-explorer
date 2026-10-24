import type { StreamAnime, StreamInfo, StreamPlayback } from "../types/streaming";

async function get<T>(
  action: string,
  name: string,
  value: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(
    `/api/anime/stream/${action}?${new URLSearchParams({ [name]: value })}`,
    { signal },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Não foi possível carregar a reprodução.");
  return body;
}
export const searchStreamAnime = (query: string, signal?: AbortSignal) =>
  get<{ results: StreamAnime[] }>("search", "q", query, signal);
export const fetchStreamInfo = (id: string, signal?: AbortSignal) =>
  get<StreamInfo>("info", "id", id, signal);
export const fetchStreamPlayback = (id: string, signal?: AbortSignal) =>
  get<StreamPlayback>("watch", "id", id, signal);
