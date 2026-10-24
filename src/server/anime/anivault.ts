import { z } from "zod";
const object = z.record(z.unknown());

export function anivaultPath(action: string, query: string, source: string): string {
  if (action === "search") return `/api/search?${new URLSearchParams({ q: query })}`;
  const match = query.match(/^(mal|al)-([1-9]\d{0,8})\/(sub|dub)(?:\/([1-9]\d*(?:\.\d+)?))?$/);
  if (!match || (action === "watch" && !match[4])) throw new Error("Invalid AniVault identity");
  if (action === "info")
    return `/api/episodes?${new URLSearchParams({ [match[1] === "mal" ? "malId" : "anilistId"]: match[2], source })}`;
  return `/api/watch/${encodeURIComponent(source)}/${match[1] === "mal" ? "mal-" : ""}${match[2]}/${match[4]}/${match[3]}`;
}

export function anivaultResponse(
  action: string,
  value: unknown,
  query: string,
  base: string,
): unknown {
  const body = object.parse(value);
  if (action === "search")
    return {
      results: z
        .array(object)
        .parse(body.results)
        .slice(0, 25)
        .flatMap((item) => {
          const mal = z.coerce.number().int().positive().safeParse(item.malId);
          const id = mal.success
            ? `mal-${mal.data}`
            : `al-${z.coerce.number().int().positive().parse(item.id)}`;
          return ["sub", "dub"].map((audio) => ({
            id: `${id}/${audio}`,
            title: `${String(item.title)} · ${audio === "sub" ? "Legendado" : "Dublado"} (conforme disponibilidade)`,
            image: item.coverImage,
          }));
        }),
    };
  if (action === "info")
    return {
      title: body.title,
      episodes: z
        .array(object)
        .max(10000)
        .parse(body.episodes)
        .map((item) => {
          const number = z.coerce.number().finite().positive().parse(item.num);
          return {
            id: `${query}/${number}`,
            number,
            title: typeof item.title === "string" ? item.title : "",
          };
        }),
    };
  const sources: Record<string, unknown>[] = [];
  const resolve = (value: unknown) => {
    if (typeof value !== "string" || !value) return undefined;
    try {
      return new URL(value, base).href;
    } catch {
      return undefined;
    }
  };
  const hls = resolve(body.hlsProxyUrl);
  const embed = resolve(body.embedUrl);
  if (hls && body.iframeOnly !== true)
    sources.push({
      url: hls,
      isM3U8: true,
      quality: typeof body.server === "string" ? body.server : "HLS",
    });
  if (embed) sources.push({ url: embed, type: "embed", quality: "Player externo" });
  return {
    sources,
    subtitles: Array.isArray(body.subtitles)
      ? body.subtitles.map((value) => {
          const item = object.parse(value);
          const url = resolve(item.url);
          return { url, label: typeof item.lang === "string" ? item.lang : "Legenda" };
        })
      : [],
  };
}
