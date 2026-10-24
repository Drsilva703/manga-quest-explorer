import { fetchWithTimeout } from "../../lib/fetch-with-timeout";

export async function handleAnimeCover(request: Request): Promise<Response> {
  const source = new URL(request.url).searchParams.get("url") || "";
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return new Response("Invalid cover URL", { status: 400 });
  }
  // Only proxy the documented MAL cover CDN, never arbitrary URLs or redirects.
  if (
    url.protocol !== "https:" ||
    url.hostname !== "cdn.myanimelist.net" ||
    url.port ||
    url.username ||
    url.password ||
    !/\.(?:jpe?g|png|webp)$/i.test(url.pathname)
  ) {
    return new Response("Cover source not allowed", { status: 400 });
  }
  try {
    const response = await fetchWithTimeout(
      url.href,
      {
        redirect: "error",
        signal: request.signal,
      },
      10_000,
    );
    const contentType = response.headers.get("Content-Type") || "";
    if (!response.ok || !/^image\/(?:jpeg|png|webp)(?:;|$)/i.test(contentType)) {
      return new Response("Cover unavailable", { status: 502 });
    }
    return new Response(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Cover unavailable", { status: 502 });
  }
}
