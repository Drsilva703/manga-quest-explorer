import { z } from "zod";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout";
import { anivaultPath, anivaultResponse } from "./anivault";
import type {
  StreamAnime,
  StreamInfo,
  StreamPlayback,
  StreamSource,
} from "../../mangaverse/types/streaming";

class StreamError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "STREAM_UNAVAILABLE",
    public retryAfter?: string,
  ) {
    super(message);
  }
}

function publicUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      host === "localhost" ||
      !host.includes(".") ||
      host.endsWith(".local") ||
      /^[\d.]+$/.test(host) ||
      host.includes(":")
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}

function config() {
  const usePublicDefault = process.env.ANIME_STREAM_API_URL === undefined;
  const base = publicUrl(
    usePublicDefault
      ? "https://anivault-scraper-test.vercel.app"
      : process.env.ANIME_STREAM_API_URL,
  );
  if (!base)
    throw new StreamError(
      503,
      "A reprodução ainda não está disponível. Tente novamente mais tarde.",
      "STREAM_NOT_CONFIGURED",
    );
  const url = new URL(base);
  if (url.search || url.hash)
    throw new StreamError(503, "Serviço de reprodução indisponível.", "STREAM_NOT_CONFIGURED");
  const style = process.env.ANIME_STREAM_API_STYLE || (usePublicDefault ? "anivault" : "consumet");
  if (!["anivault", "consumet"].includes(style))
    throw new StreamError(503, "Serviço de reprodução indisponível.", "STREAM_NOT_CONFIGURED");
  const provider =
    process.env.ANIME_STREAM_PROVIDER || (style === "anivault" ? "anikoto" : "gogoanime");
  if (!/^[a-zA-Z0-9_-]{1,50}$/.test(provider))
    throw new StreamError(503, "Serviço de reprodução indisponível.", "STREAM_NOT_CONFIGURED");
  return { base: base.replace(/\/$/, ""), provider, style };
}

const record = z.record(z.unknown());
const title = (value: unknown): string =>
  typeof value === "string"
    ? value
    : value && typeof value === "object"
      ? String(
          (value as Record<string, unknown>).romaji ||
            (value as Record<string, unknown>).english ||
            "",
        )
      : "";

export function parseStreamSearch(value: unknown): StreamAnime[] {
  const items = z.array(record).parse(record.parse(value).results);
  return items.slice(0, 50).map((item) => ({
    id: z.string().min(1).max(1000).parse(item.id),
    title: z.string().min(1).parse(title(item.title)),
    image: publicUrl(item.image),
  }));
}

export function parseStreamInfo(value: unknown): StreamInfo {
  const item = record.parse(value);
  return {
    title: title(item.title),
    episodes: z
      .array(record)
      .max(10000)
      .parse(item.episodes)
      .map((episode) => ({
        id: z.string().min(1).max(1000).parse(episode.id),
        number: z.coerce.number().finite().positive().parse(episode.number),
        title: typeof episode.title === "string" ? episode.title : "",
      })),
  };
}

export function parseStreamPlayback(value: unknown): StreamPlayback {
  const item = record.parse(value);
  const sources: StreamSource[] = [];
  const headers = item.headers && typeof item.headers === "object" ? Object.keys(item.headers) : [];
  for (const source of z.array(record).parse(item.sources || [])) {
    const url = publicUrl(source.url);
    if (!url) continue;
    let type: StreamSource["type"] | undefined;
    if (source.type === "iframe" || source.type === "embed") type = "embed";
    else if (source.isM3U8 === true || source.type === "hls" || /\.m3u8(?:[?#]|$)/i.test(url))
      type = "hls";
    else if (
      source.type === "video" ||
      source.type === "mp4" ||
      /\.(mp4|webm)(?:[?#]|$)/i.test(url)
    )
      type = "video";
    // Browsers cannot attach a provider's Referer/Origin to a video tag. Never
    // pretend those sources work, or turn this endpoint into an open media proxy.
    if (!type || (type !== "embed" && headers.length)) continue;
    sources.push({
      url,
      type,
      quality: typeof source.quality === "string" ? source.quality : "Padrão",
    });
  }
  const embed = publicUrl(item.embed || item.embedURL);
  if (embed) sources.push({ url: embed, type: "embed", quality: "Player externo" });
  if (!sources.length)
    throw new StreamError(
      404,
      "Nenhuma fonte compatível encontrada para este episódio. Selecione outra opção.",
      "STREAM_SOURCE_NOT_FOUND",
    );
  const subtitles = Array.isArray(item.subtitles)
    ? item.subtitles.flatMap((value) => {
        const subtitle = record.parse(value);
        const url = publicUrl(subtitle.url);
        return url
          ? [{ url, label: typeof subtitle.label === "string" ? subtitle.label : "Legenda" }]
          : [];
      })
    : [];
  return { sources, ...(subtitles.length ? { subtitles } : {}) };
}

export async function handleAnimeStreaming(request: Request): Promise<Response> {
  if (request.method !== "GET")
    return Response.json(
      { error: "Método não permitido." },
      { status: 405, headers: { Allow: "GET" } },
    );
  const url = new URL(request.url);
  const action = url.pathname.match(/^\/api\/anime\/stream\/(search|info|watch)$/)?.[1];
  if (!["search", "info", "watch"].includes(action || ""))
    return Response.json({ error: "Rota não encontrada." }, { status: 404 });
  const query = (url.searchParams.get(action === "search" ? "q" : "id") || "").trim();
  if (!query || query.length > (action === "search" ? 200 : 1000))
    return Response.json({ error: "Consulta inválida." }, { status: 400 });
  try {
    const { base, provider, style } = config();
    const defaults = {
      search: "/anime/{provider}/search/{query}",
      info: "/anime/{provider}/info/{id}",
      watch: "/anime/{provider}/watch/{id}",
    };
    const template =
      process.env[`ANIME_STREAM_${action!.toUpperCase()}_PATH`] ||
      defaults[action as keyof typeof defaults];
    const path =
      style === "anivault"
        ? anivaultPath(action!, query, provider)
        : template
            .replaceAll("{provider}", encodeURIComponent(provider))
            .replaceAll("{query}", encodeURIComponent(query))
            .replaceAll("{id}", encodeURIComponent(query));
    if (!path.startsWith("/") || path.startsWith("//") || /[{}]/.test(path))
      throw new StreamError(503, "Serviço de reprodução indisponível.", "STREAM_NOT_CONFIGURED");
    const target = new URL(base + path);
    if (target.origin !== new URL(base).origin)
      throw new StreamError(503, "Serviço de reprodução indisponível.", "STREAM_NOT_CONFIGURED");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (style === "consumet" && process.env.ANIME_STREAM_API_KEY) {
      headers["X-RapidAPI-Key"] = process.env.ANIME_STREAM_API_KEY;
      headers["X-RapidAPI-Host"] = target.hostname;
    }
    const response = await fetchWithTimeout(
      target.href,
      { signal: request.signal, redirect: "error", headers },
      20_000,
    );
    if (!response.ok)
      throw new StreamError(
        response.status === 429 ? 429 : response.status === 404 ? 404 : 502,
        response.status === 429
          ? "Muitas consultas. Aguarde um momento antes de tentar novamente."
          : "A fonte de reprodução não está disponível no momento.",
        "STREAM_UPSTREAM_ERROR",
        response.status === 429
          ? String(Math.max(1, Math.min(3600, Number(response.headers.get("Retry-After")) || 60)))
          : undefined,
      );
    const raw: unknown = await response.json();
    const body = style === "anivault" ? anivaultResponse(action!, raw, query, base) : raw;
    const data =
      action === "search"
        ? { results: parseStreamSearch(body) }
        : action === "info"
          ? parseStreamInfo(body)
          : parseStreamPlayback(body);
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof StreamError)
      return Response.json(
        { error: error.message, code: error.code },
        {
          status: error.status,
          headers: {
            "Cache-Control": "no-store",
            ...(error.retryAfter ? { "Retry-After": error.retryAfter } : {}),
          },
        },
      );
    console.warn("[Anime streaming] Request failed", {
      action,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      {
        error: "Não foi possível carregar a reprodução. Tente novamente ou selecione outra fonte.",
        code: "STREAM_UNAVAILABLE",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
