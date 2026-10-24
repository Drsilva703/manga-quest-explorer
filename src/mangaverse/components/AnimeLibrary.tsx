import { AnimeImage } from "./AnimeImage";
import { useState } from "react";
import { Heart, Trash2, Tv } from "lucide-react";
import { useAnimeLibrary } from "../hooks/useAnimeLibrary";
import { removeAnime, saveAnime } from "../services/animeStorage";
import type { Anime, AnimeShelf } from "../types/anime";

import { ANIME_STATUS_LABELS } from "../services/animeLabels";

export function AnimeLibrary({
  onSelect,
  onExplore,
}: {
  onSelect: (anime: Anime) => void;
  onExplore: () => void;
}) {
  const items = useAnimeLibrary();
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const visible = items.filter(
    (item) => filter === "all" || (filter === "favorites" ? item.favorite : item.status === filter),
  );
  const change = (action: () => void) => {
    try {
      action();
      setError("");
    } catch {
      setError(
        "Não foi possível salvar neste navegador. Verifique o espaço e as permissões de armazenamento.",
      );
    }
  };
  return (
    <section
      className="mb-10 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 sm:p-6"
      aria-labelledby="anime-library-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2
          id="anime-library-title"
          className="text-lg font-bold text-white flex items-center gap-2"
        >
          <Tv className="text-indigo-400" size={20} />
          Meus animes <span className="text-sm text-zinc-400">({items.length})</span>
        </h2>
        <button onClick={onExplore} className="text-sm text-indigo-300 hover:text-white">
          Explorar animes →
        </button>
      </div>
      <p className="text-xs text-zinc-400 mb-4">Favoritos e progresso salvos neste navegador.</p>
      <label className="text-sm text-zinc-300 flex items-center gap-3 mb-4">
        Mostrar
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2"
        >
          <option value="all">Todos</option>
          <option value="favorites">Favoritos</option>
          {Object.entries(ANIME_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="text-sm text-rose-300 mb-3">
          {error}
        </p>
      )}
      {visible.length === 0 ? (
        <p className="py-5 text-sm text-zinc-400">
          {items.length
            ? "Nenhum anime neste filtro."
            : "Abra um anime e adicione à sua lista para começar a acompanhar."}
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((item) => (
            <article
              key={item.anime.id}
              className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-3"
            >
              <div className="flex gap-3">
                <button
                  onClick={() => onSelect(item.anime)}
                  className="shrink-0"
                  aria-label={`Ver ${item.anime.title}`}
                >
                  {item.anime.coverUrl ? (
                    <AnimeImage
                      src={item.anime.coverUrl}
                      alt=""
                      className="w-16 h-24 object-cover rounded-lg"
                      loading="lazy"
                    />
                  ) : (
                    <Tv className="w-16 h-24 text-zinc-600" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => onSelect(item.anime)}
                    className="text-left font-bold text-sm text-white hover:text-indigo-300"
                  >
                    {item.anime.title}
                  </button>
                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    <select
                      aria-label={`Status de ${item.anime.title}`}
                      value={item.status}
                      onChange={(event) =>
                        change(() => {
                          saveAnime(item.anime, { status: event.target.value as AnimeShelf });
                        })
                      }
                      className="bg-zinc-900 rounded-lg p-1.5 text-xs text-zinc-300 border border-zinc-700"
                    >
                      {Object.entries(ANIME_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      aria-label={`Favoritar ${item.anime.title}`}
                      aria-pressed={item.favorite}
                      onClick={() =>
                        change(() => {
                          saveAnime(item.anime, { favorite: !item.favorite });
                        })
                      }
                      className={`p-2 rounded-lg hover:bg-zinc-800 ${item.favorite ? "text-pink-400" : "text-zinc-400"}`}
                    >
                      <Heart size={16} fill={item.favorite ? "currentColor" : "none"} />
                    </button>
                    <button
                      aria-label={`Remover ${item.anime.title}`}
                      onClick={() => change(() => removeAnime(item.anime.id))}
                      className="p-2 text-zinc-400 hover:text-rose-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                    Episódios vistos
                    <input
                      aria-label={`Episódios vistos de ${item.anime.title}`}
                      type="number"
                      min={0}
                      max={item.anime.episodeCount ?? undefined}
                      value={item.watchedEpisodes}
                      onChange={(event) =>
                        change(() => {
                          saveAnime(item.anime, { watchedEpisodes: Number(event.target.value) });
                        })
                      }
                      className="w-16 rounded-md bg-zinc-900 border border-zinc-700 p-1 text-white"
                    />
                    / {item.anime.episodeCount ?? "?"}
                  </label>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
