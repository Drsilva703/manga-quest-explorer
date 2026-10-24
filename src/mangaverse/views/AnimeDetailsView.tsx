import { AnimeImage } from "../components/AnimeImage";
import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Star, Tv } from "lucide-react";
import { fetchAnimeDetails, fetchAnimeEpisodes } from "../services/animeService";
import { saveAnime } from "../services/animeStorage";
import { useAnimeLibrary } from "../hooks/useAnimeLibrary";
import { ANIME_STATUS_LABELS } from "../services/animeLabels";
import type { Anime, AnimeShelf } from "../types/anime";

function airedDate(value: string | null) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data não informada"
    : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function AnimeDetailsView({ anime: initial, onBack }: { anime: Anime; onBack: () => void }) {
  const details = useQuery({
    queryKey: ["anime-details", initial.id],
    queryFn: ({ signal }) => fetchAnimeDetails(initial.id, signal),
    staleTime: 300_000,
    retry: false,
  });
  const episodes = useInfiniteQuery({
    queryKey: ["anime-episodes", initial.id],
    initialPageParam: 1,
    queryFn: ({ signal, pageParam }) => fetchAnimeEpisodes(initial.id, pageParam, signal),
    getNextPageParam: (last, _all, previous) => (last.hasNextPage ? previous + 1 : undefined),
    staleTime: 300_000,
    retry: false,
  });
  const anime = details.data || initial;
  const entry = useAnimeLibrary().find((item) => item.anime.id === anime.id);
  const [saveError, setSaveError] = useState("");
  const [trailerOpen, setTrailerOpen] = useState(false);
  const update = (patch: Parameters<typeof saveAnime>[1]) => {
    try {
      saveAnime(anime, patch);
      setSaveError("");
    } catch {
      setSaveError(
        "Não foi possível salvar neste navegador. Verifique as permissões de armazenamento.",
      );
    }
  };
  const episodeList = [
    ...new Map(
      episodes.data?.pages.flatMap((page) => page.items).map((item) => [item.id, item]) || [],
    ).values(),
  ];
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <button
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        Voltar
      </button>
      {details.isPending && (
        <p role="status" className="text-sm text-indigo-300 mb-4">
          Carregando ficha completa…
        </p>
      )}
      {details.isError && (
        <div role="alert" className="text-sm text-amber-300 mb-4">
          {details.error.message}{" "}
          <button onClick={() => details.refetch()} className="underline">
            Tentar novamente
          </button>
        </div>
      )}
      <section className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 mb-8">
        {anime.coverUrl && (
          <AnimeImage
            src={anime.coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-15"
          />
        )}
        <div className="relative p-5 sm:p-8 flex flex-col sm:flex-row gap-6 bg-gradient-to-r from-zinc-950/90 to-zinc-950/40">
          {anime.coverUrl ? (
            <AnimeImage
              src={anime.coverUrl}
              alt={`Capa de ${anime.title}`}
              className="w-36 sm:w-48 aspect-[2/3] object-cover rounded-2xl self-center sm:self-start shadow-xl"
            />
          ) : (
            <Tv className="w-36 h-48 text-zinc-600 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-indigo-300 font-bold tracking-widest mb-2">
              NIPPONBR · ANIME
            </p>
            <h1 className="text-2xl sm:text-4xl text-white font-black">{anime.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300 mt-4">
              {anime.score !== null && (
                <span className="flex items-center gap-1 text-amber-300">
                  <Star size={16} />
                  {anime.score.toFixed(1)} / 10
                </span>
              )}
              {anime.year && <span>{anime.year}</span>}
              {anime.episodeCount !== null && <span>{anime.episodeCount} episódios</span>}
              {anime.status && <span>{anime.status}</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {anime.genres.map((genre) => (
                <span
                  key={genre}
                  className="text-xs rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 text-zinc-300"
                >
                  {genre}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-zinc-400">
              Estúdio: {anime.studios.join(", ") || "Não informado"}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 items-center">
              <label className="sr-only" htmlFor="anime-status">
                Minha lista
              </label>
              <select
                id="anime-status"
                value={entry?.status || ""}
                onChange={(event) => {
                  if (event.target.value) update({ status: event.target.value as AnimeShelf });
                }}
                className="rounded-xl bg-indigo-600 p-3 text-white text-sm font-bold"
              >
                <option value="" disabled>
                  Adicionar à minha lista
                </option>
                {Object.entries(ANIME_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                aria-pressed={entry?.favorite || false}
                onClick={() => update({ favorite: !entry?.favorite })}
                className="rounded-xl bg-zinc-800 text-pink-300 px-4 py-3 flex items-center gap-2 text-sm font-bold"
              >
                <Heart size={16} fill={entry?.favorite ? "currentColor" : "none"} />
                {entry?.favorite ? "Favoritado" : "Favoritar"}
              </button>
            </div>
            {entry && (
              <p role="status" className="text-xs text-indigo-300 mt-3">
                Na sua biblioteca · {entry.watchedEpisodes} episódios vistos · salvo neste navegador
              </p>
            )}
            {saveError && (
              <p role="alert" className="text-sm text-rose-300 mt-3">
                {saveError}
              </p>
            )}
          </div>
        </div>
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-bold text-white mb-3">Sinopse</h2>
        <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-line">
          {anime.synopsis || "Sinopse não informada pelo catálogo."}
        </p>
      </section>
      <section className="mb-8">
        <h2 className="text-xl font-bold text-white mb-3">Trailer oficial</h2>
        {anime.trailerId ? (
          trailerOpen ? (
            <iframe
              title={`Trailer oficial de ${anime.title}`}
              src={`https://www.youtube-nocookie.com/embed/${anime.trailerId}`}
              className="aspect-video w-full max-w-3xl rounded-2xl border border-zinc-800"
              allow="encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <button
              onClick={() => setTrailerOpen(true)}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm text-white font-bold"
            >
              Ver trailer no YouTube
            </button>
          )
        ) : (
          <p className="text-sm text-zinc-400">Trailer não disponível para este anime.</p>
        )}
      </section>
      <section>
        <h2 className="text-xl font-bold text-white mb-2">Episódios</h2>
        <p className="text-xs text-zinc-500 mb-4">
          Títulos e datas de exibição. O NipponBR não transmite episódios completos.
        </p>
        {episodes.isPending && (
          <p role="status" className="text-indigo-300 text-sm py-4">
            Carregando episódios…
          </p>
        )}
        {episodes.isError && (
          <div role="alert" className="text-amber-300 text-sm py-4">
            {episodes.error.message}{" "}
            <button onClick={() => episodes.refetch()} className="underline">
              Tentar novamente
            </button>
          </div>
        )}
        {episodes.data && episodeList.length === 0 && (
          <p className="text-sm text-zinc-400 py-4">
            A Tenrai ainda não informou os episódios deste título.
          </p>
        )}
        <ol className="space-y-2">
          {episodeList.map((episode) => (
            <li
              key={episode.id}
              className="flex flex-wrap sm:flex-nowrap justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  <span className="text-indigo-300 mr-2">{episode.id}.</span>
                  {episode.title}
                </p>
                <p className="mt-1 text-xs text-zinc-500">{airedDate(episode.aired)}</p>
              </div>
              <button
                aria-pressed={(entry?.watchedEpisodes || 0) >= episode.id}
                onClick={() =>
                  update({
                    status: "watching",
                    watchedEpisodes:
                      (entry?.watchedEpisodes || 0) >= episode.id ? episode.id - 1 : episode.id,
                  })
                }
                className={`text-xs rounded-lg px-3 py-2 ${(entry?.watchedEpisodes || 0) >= episode.id ? "bg-indigo-600/20 text-indigo-300" : "bg-zinc-800 text-zinc-300"}`}
              >
                {(entry?.watchedEpisodes || 0) >= episode.id
                  ? "Visto até aqui ✓"
                  : "Marcar visto até aqui"}
              </button>
            </li>
          ))}
        </ol>
        {episodes.hasNextPage && (
          <button
            disabled={episodes.isFetchingNextPage}
            onClick={() => episodes.fetchNextPage()}
            className="mt-4 rounded-xl bg-zinc-800 px-5 py-3 text-sm text-white disabled:opacity-50"
          >
            {episodes.isFetchingNextPage ? "Carregando…" : "Carregar mais episódios"}
          </button>
        )}
      </section>
    </div>
  );
}
