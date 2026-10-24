import type { Anime, AnimePage, AnimeEpisodePage } from "../types/anime";
import { normalizeAnime, normalizeEpisode, parsePage } from "../../lib/anime-normalize";
import { animeCatalogPath, type AnimeCollection } from "../../lib/tenrai-paths";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";

export type { AnimeCollection } from "../../lib/tenrai-paths";

const TENRAI_ORIGIN = "https://api.tenrai.org";
let publicBlockedUntil = 0;
let nextPublicRequest = 0;
class PublicTenraiError extends Error {}

async function publicRequest<T>(
  path: string,
  parse: (value: unknown) => T,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
  const now = Date.now();
  if (publicBlockedUntil > now)
    throw new Error("A Tenrai está limitando as consultas. Aguarde um momento e tente novamente.");
  const delay = Math.max(0, nextPublicRequest - now);
  if (delay > 5_000) throw new Error("Há muitas consultas em andamento. Aguarde alguns segundos.");
  nextPublicRequest = now + delay + 550;
  if (delay)
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new DOMException("Request aborted", "AbortError"));
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, delay);
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
    });
  try {
    // Tenrai explicitly supports public, anonymous cross-origin browser requests.
    const response = await fetchWithTimeout(`${TENRAI_ORIGIN}${path}`, {
      signal,
      headers: { Accept: "application/json" },
      credentials: "omit",
    });
    if (response.status === 429) {
      const seconds = Math.max(
        1,
        Math.min(3600, Number(response.headers.get("Retry-After")) || 60),
      );
      publicBlockedUntil = Date.now() + seconds * 1000;
      throw new PublicTenraiError(
        "A Tenrai está limitando as consultas. Aguarde um momento e tente novamente.",
      );
    }
    if (!response.ok)
      throw new PublicTenraiError(
        response.status === 404
          ? "Anime não encontrado na Tenrai."
          : "A Tenrai está indisponível no momento. Tente novamente.",
      );
    return parse(await response.json());
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
    if (error instanceof PublicTenraiError) throw error;
    throw new Error(
      "Não foi possível acessar a Tenrai pelo servidor ou pelo navegador. Tente novamente em instantes.",
    );
  }
}

async function request<T>(
  path: string,
  directPath: string,
  parse: (value: unknown) => T,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchWithTimeout(`/api/anime${path}`, { signal });
  } catch {
    if (signal?.aborted) throw new DOMException("Request aborted", "AbortError");
    return publicRequest(directPath, parse, signal);
  }
  // Do not mask validation, not-found or rate-limit responses with another request.
  if (response.status >= 500) return publicRequest(directPath, parse, signal);
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
  return request<AnimePage>(
    `?${params}`,
    animeCatalogPath(collection, query, page),
    (body) => parsePage(body, normalizeAnime),
    signal,
  );
}

export function fetchAnimeDetails(id: number, signal?: AbortSignal) {
  return request<Anime>(
    `/${id}`,
    `/v1/anime/${id}`,
    (body) => normalizeAnime((body as { data: unknown }).data),
    signal,
  );
}

export function fetchAnimeEpisodes(id: number, page: number, signal?: AbortSignal) {
  return request<AnimeEpisodePage>(
    `/${id}/episodes?page=${page}`,
    `/v1/anime/${id}/episodes?page=${page}`,
    (body) => parsePage(body, normalizeEpisode),
    signal,
  );
}
