import { normalizeAnime, normalizeEpisode, parsePage } from "../../lib/anime-normalize";
import { handleAnimeCover } from "./cover";
import { handleAnimeStreaming } from "./streaming";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";
import { animeCatalogPath, type AnimeCollection } from "../../lib/tenrai-paths";

const ORIGIN = "https://api.tenrai.org";
const cache = new Map<string, { expires: number; value: unknown; etag: string | null }>();
let nextRequestAt = 0;
let blockedUntil = 0;

async function tenrai<T>(
  path: string,
  signal: AbortSignal,
  parse: (body: unknown) => T,
): Promise<T> {
  const key = path;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value as T;
  const now = Date.now();
  if (blockedUntil > now)
    throw new AnimeApiError(
      429,
      "Aguarde um momento antes de consultar a Tenrai novamente.",
      Math.ceil((blockedUntil - now) / 1000),
    );
  const delay = Math.max(0, nextRequestAt - now);
  if (delay > 5_000)
    throw new AnimeApiError(
      429,
      "Há muitas consultas em andamento. Tente novamente em alguns segundos.",
      5,
    );
  // Public quota: 4/s and 120/min per IP. Space this worker's requests below both.
  nextRequestAt = now + delay + 550;
  if (delay)
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new Error("Request aborted"));
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, delay);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  const response = await fetchWithTimeout(`${ORIGIN}${path}`, {
    headers: { Accept: "application/json", ...(hit?.etag ? { "If-None-Match": hit.etag } : {}) },
    signal,
    redirect: "error",
  });
  if (response.status === 304 && hit) {
    hit.expires = Date.now() + 5 * 60_000;
    return hit.value as T;
  }
  if (!response.ok) {
    if (response.status === 404) throw new AnimeApiError(404, "Anime não encontrado na Tenrai.");
    if (response.status === 429) {
      const seconds = Math.max(
        1,
        Math.min(3600, Number(response.headers.get("Retry-After")) || 60),
      );
      blockedUntil = Date.now() + seconds * 1000;
      throw new AnimeApiError(
        429,
        "A Tenrai recebeu muitas consultas. Aguarde um momento e tente novamente.",
        seconds,
      );
    }
    throw new AnimeApiError(502, "A Tenrai está indisponível no momento. Tente novamente.");
  }
  const value = parse(await response.json());
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: Date.now() + 5 * 60_000, value, etag: response.headers.get("ETag") });
  return value;
}

class AnimeApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
  }
}

export async function handleAnimeApi(request: Request): Promise<Response> {
  if (request.method !== "GET")
    return Response.json(
      { error: "Método não permitido." },
      { status: 405, headers: { Allow: "GET" } },
    );
  const url = new URL(request.url);
  if (/^\/api\/anime\/stream\//.test(url.pathname)) return handleAnimeStreaming(request);
  if (url.pathname === "/api/anime/cover") return handleAnimeCover(request);
  const match = url.pathname.match(/^\/api\/anime(?:\/([1-9]\d{0,8})(\/episodes)?)?\/?$/);
  if (!match) return Response.json({ error: "Rota de anime não encontrada." }, { status: 404 });
  const page = url.searchParams.get("page") || "1";
  if (!/^[1-9]\d{0,3}$/.test(page))
    return Response.json({ error: "Página inválida." }, { status: 400 });
  let path = "/v1/anime";
  try {
    if (match[1]) {
      path += `/${match[1]}`;
      if (match[2]) path += `/episodes?page=${page}`;
      if (match[2])
        return Response.json(
          await tenrai(path, request.signal, (body) => parsePage(body, normalizeEpisode)),
        );
      return Response.json(
        await tenrai(path, request.signal, (body) =>
          normalizeAnime((body as { data: unknown }).data),
        ),
      );
    }
    const query = (url.searchParams.get("q") || "").trim();
    if (query.length > 200)
      return Response.json({ error: "A busca deve ter até 200 caracteres." }, { status: 400 });
    const collection = url.searchParams.get("collection") || "popular";
    if (!["popular", "seasonal", "ranking"].includes(collection))
      return Response.json({ error: "Catálogo inválido." }, { status: 400 });
    return Response.json(
      await tenrai(
        animeCatalogPath(collection as AnimeCollection, query, Number(page)),
        request.signal,
        (body) => parsePage(body, normalizeAnime),
      ),
    );
  } catch (error) {
    if (error instanceof AnimeApiError)
      return Response.json(
        { error: error.message },
        {
          status: error.status,
          headers: error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {},
        },
      );
    console.warn("[Tenrai] Request failed", {
      route: url.pathname,
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown failure",
    });
    return Response.json(
      { error: "Não foi possível consultar o catálogo da Tenrai. Tente novamente em instantes." },
      { status: 502 },
    );
  }
}
