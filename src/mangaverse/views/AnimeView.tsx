import { AnimeImage } from "../components/AnimeImage";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Film, Search, Tv } from "lucide-react";
import { fetchAnimeCatalog, type AnimeCollection } from "../services/animeService";
import { AnimeCard } from "../components/AnimeCard";
import type { Anime } from "../types/anime";

export function AnimeView({ onSelect }: { onSelect: (anime: Anime) => void }) {
  const [collection, setCollection] = useState<AnimeCollection>("seasonal");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [highlight, setHighlight] = useState(0);
  const result = useQuery({
    queryKey: ["anime-catalog", collection, query, page],
    queryFn: ({ signal }) => fetchAnimeCatalog(collection, query, page, signal),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const changeCollection = (next: AnimeCollection) => {
    setCollection(next);
    setInput("");
    setQuery("");
    setPage(1);
  };
  const highlights = result.data?.items.slice(0, 5) || [];
  const hero =
    !query && collection === "seasonal" ? highlights[highlight % highlights.length] : undefined;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[.25em] text-indigo-400 mb-2">
          Seu próximo universo favorito
        </p>
        <h1 className="text-3xl sm:text-5xl font-black text-white flex items-center gap-3">
          <Tv className="text-indigo-400" />
          Animes
        </h1>
        <p className="mt-3 text-sm text-zinc-400 max-w-xl">
          Explore a temporada, descubra os mais populares e acompanhe seus favoritos no NipponBR.
        </p>
      </div>
      <form
        role="search"
        aria-label="Buscar animes"
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(input.trim());
          setPage(1);
        }}
        className="flex gap-2 mb-5 max-w-2xl"
      >
        <label className="sr-only" htmlFor="anime-query">
          Nome do anime
        </label>
        <input
          id="anime-query"
          maxLength={200}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Qual anime você quer descobrir?"
          className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 font-bold text-sm text-white flex gap-2 items-center"
        >
          <Search size={16} />
          <span className="hidden sm:inline">Buscar</span>
        </button>
      </form>
      <div className="flex flex-wrap gap-2 mb-6" aria-label="Coleções de animes">
        {(
          [
            ["seasonal", "Nesta temporada"],
            ["popular", "Mais populares"],
            ["ranking", "Melhor avaliados"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            aria-pressed={!query && collection === value}
            onClick={() => changeCollection(value)}
            className={`rounded-full px-4 py-2 text-xs font-bold border transition-colors ${!query && collection === value ? "bg-indigo-600 border-indigo-500 text-white" : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {result.isPending && (
        <div role="status" className="py-20 text-center text-indigo-300 animate-pulse">
          Carregando animes…
        </div>
      )}
      {result.isError && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/20 bg-zinc-900 p-8 text-center"
        >
          <Film className="mx-auto text-zinc-500 mb-3" size={32} />
          <p className="text-zinc-200">{result.error.message}</p>
          <button
            onClick={() => result.refetch()}
            className="mt-4 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {hero && (
        <section
          aria-label="Destaques da temporada"
          aria-roledescription="carrossel"
          className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 mb-8"
        >
          {hero.coverUrl && (
            <AnimeImage
              src={hero.coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-20 blur-xl"
            />
          )}
          <div className="relative flex items-center gap-5 sm:gap-8 p-5 sm:p-8 bg-gradient-to-r from-zinc-950/95 to-zinc-950/30">
            {hero.coverUrl && (
              <AnimeImage
                src={hero.coverUrl}
                alt=""
                className="w-24 sm:w-40 aspect-[2/3] object-cover rounded-xl shadow-xl shrink-0"
              />
            )}
            <div className="max-w-xl">
              <p className="text-xs font-bold text-indigo-300 mb-2">EM DESTAQUE NA TEMPORADA</p>
              <h2 className="text-xl sm:text-3xl font-black text-white">{hero.title}</h2>
              <p className="mt-3 text-sm text-zinc-300 hidden sm:line-clamp-3">
                {hero.synopsis || "Conheça a ficha e os episódios deste anime."}
              </p>
              <button
                onClick={() => onSelect(hero)}
                className="mt-4 rounded-xl bg-white hover:bg-indigo-100 text-zinc-950 px-4 py-2 text-sm font-bold"
              >
                Conhecer anime →
              </button>
              {highlights.length > 1 && (
                <div className="flex items-center gap-3 mt-4 text-zinc-300">
                  <button
                    aria-label="Destaque anterior"
                    onClick={() =>
                      setHighlight((value) => (value + highlights.length - 1) % highlights.length)
                    }
                    className="rounded-full border border-zinc-600 p-2 hover:bg-zinc-800"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span aria-live="polite" className="text-xs">
                    {(highlight % highlights.length) + 1} / {highlights.length}
                  </span>
                  <button
                    aria-label="Próximo destaque"
                    onClick={() => setHighlight((value) => (value + 1) % highlights.length)}
                    className="rounded-full border border-zinc-600 p-2 hover:bg-zinc-800"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {result.data && (
        <>
          <h2 className="text-lg font-bold text-white mb-4">
            {query
              ? `Resultados para “${query}”`
              : collection === "seasonal"
                ? "Descobertas da temporada"
                : collection === "ranking"
                  ? "Ranking de animes"
                  : "Mais populares"}
          </h2>
          {result.data.items.length === 0 ? (
            <p className="py-14 text-center text-zinc-400">
              Nenhum anime encontrado. Tente outro nome.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-7">
              {result.data.items.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} onSelect={onSelect} />
              ))}
            </div>
          )}
          <div className="flex items-center justify-center gap-5 mt-8">
            <button
              aria-label="Página anterior de animes"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
              className="p-3 rounded-xl bg-zinc-900 disabled:opacity-30 text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-sm text-zinc-400">Página {page}</span>
            <button
              aria-label="Próxima página de animes"
              disabled={!result.data.hasNextPage}
              onClick={() => setPage((value) => value + 1)}
              className="p-3 rounded-xl bg-zinc-900 disabled:opacity-30 text-white"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      )}
      <p className="mt-10 text-xs text-zinc-500 text-center">
        Dados do MyAnimeList via Tenrai · Informações, episódios e trailers oficiais. Os episódios
        completos não são reproduzidos aqui.
      </p>
    </div>
  );
}
