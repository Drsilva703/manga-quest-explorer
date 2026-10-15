import { createFileRoute } from "@tanstack/react-router";

const safe = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);

export const Route = createFileRoute("/api/upload-page")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const mangaId = safe(url.searchParams.get("mangaId") || "");
        const chapter = safe(url.searchParams.get("chapter") || "");
        const name = safe(url.searchParams.get("name") || "");
        const type = request.headers.get("content-type") || "";
        if (!mangaId || !chapter || !name || !type.startsWith("image/")) {
          return Response.json({ error: "Dados inválidos" }, { status: 400 });
        }
        const body = new Uint8Array(await request.arrayBuffer());
        if (body.byteLength === 0 || body.byteLength > 20 * 1024 * 1024) {
          return Response.json({ error: "Imagem vazia ou maior que 20MB" }, { status: 400 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const path = `${mangaId}/${chapter}/${name}`;
        const { error } = await supabaseAdmin.storage
          .from("manga-pages")
          .upload(path, body, { contentType: type, upsert: true });
        if (error) {
          console.error("upload error", error);
          return Response.json({ error: "Falha ao enviar a página" }, { status: 500 });
        }
        return Response.json({ url: `/api/pages/${path}` });
      },
    },
  },
});
