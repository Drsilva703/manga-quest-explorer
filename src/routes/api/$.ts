import { createFileRoute } from "@tanstack/react-router";
import { handleMangaverseApi } from "../../server/mangaverse/api";
import { handleAnimeApi } from "../../server/anime/api";

async function handler({ request }: { request: Request }) {
  if (/^\/api\/anime(?:\/|$)/.test(new URL(request.url).pathname)) {
    return handleAnimeApi(request);
  }
  return handleMangaverseApi(request);
}

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
      PUT: handler,
      DELETE: handler,
    },
  },
});
