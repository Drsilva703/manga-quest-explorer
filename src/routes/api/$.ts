import { createFileRoute } from "@tanstack/react-router";
import { handleMangaverseApi } from "../../server/mangaverse/api";

async function handler({ request }: { request: Request }) {
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
