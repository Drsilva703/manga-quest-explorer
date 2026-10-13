import { createFileRoute } from "@tanstack/react-router";
import App from "../mangaverse/App";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MangaVerse — Leia mangás, manhwas e manhuas em português" },
      {
        name: "description",
        content:
          "MangaVerse: seu universo de mangás. Leia capítulos em PT-BR, acompanhe atualizações, monte sua biblioteca e converse com a comunidade.",
      },
      { property: "og:title", content: "MangaVerse — Leia mangás em português" },
      {
        property: "og:description",
        content:
          "Leia mangás, manhwas e manhuas em PT-BR, acompanhe atualizações e monte sua biblioteca no MangaVerse.",
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
