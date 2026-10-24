import { createFileRoute } from "@tanstack/react-router";
import App from "../mangaverse/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NipponBR — Animes e mangás em português" },
      {
        name: "description",
        content:
          "NipponBR: explore animes, leia mangás em PT-BR, acompanhe seus favoritos e converse com a comunidade.",
      },
      { property: "og:title", content: "NipponBR — Animes e mangás em português" },
      {
        property: "og:description",
        content:
          "Descubra animes, leia mangás em PT-BR e monte sua biblioteca no NipponBR.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <App />;
}
