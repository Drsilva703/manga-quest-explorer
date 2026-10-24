import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  searchStreamAnime,
  fetchStreamInfo,
  fetchStreamPlayback,
} from "../services/animeStreaming";
import { AnimeVideo } from "./AnimeVideo";
import type { Anime } from "../types/anime";
import type { StreamEpisode } from "../types/streaming";

export function AnimeWatchDialog({
  anime,
  requestedEpisode,
  onClose,
  onWatched,
}: {
  anime: Anime;
  requestedEpisode: number;
  onClose: () => void;
  onWatched: (number: number) => void;
}) {
  const [input, setInput] = useState(anime.title);
  const [query, setQuery] = useState(anime.title);
  const [showId, setShowId] = useState("");
  const [episode, setEpisode] = useState<StreamEpisode | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const search = useQuery({
    queryKey: ["stream-search", query],
    queryFn: ({ signal }) => searchStreamAnime(query, signal),
    enabled: !!query && !showId,
    retry: false,
    staleTime: 60_000,
  });
  const info = useQuery({
    queryKey: ["stream-info", showId],
    queryFn: ({ signal }) => fetchStreamInfo(showId, signal),
    enabled: !!showId,
    retry: false,
    staleTime: 60_000,
  });
  const playback = useQuery({
    queryKey: ["stream-watch", showId, episode?.id],
    queryFn: ({ signal }) => fetchStreamPlayback(episode!.id, signal),
    enabled: !!episode,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const activeQuery = episode ? playback : showId ? info : search;
  const source = playback.data?.sources[sourceIndex];
  const choose = (next: StreamEpisode) => {
    setEpisode(next);
    setSourceIndex(0);
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-4xl w-[calc(100%-1rem)] max-h-[90dvh] overflow-y-auto bg-zinc-950 border-zinc-800 text-zinc-100 rounded-2xl">
        <DialogTitle className="pr-7">Assistir · {anime.title}</DialogTitle>
        <DialogDescription className="text-zinc-400">
          Escolha a versão e o episódio disponíveis na fonte de reprodução.
        </DialogDescription>
        {activeQuery.isFetching && (
          <p role="status" className="text-indigo-300 text-sm">
            Buscando reprodução…
          </p>
        )}
        {activeQuery.isError && (
          <div role="alert" className="text-sm text-amber-300">
            {activeQuery.error.message}{" "}
            <button onClick={() => activeQuery.refetch()} className="underline ml-2">
              Tentar novamente
            </button>
          </div>
        )}
        {!showId && (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(input.trim());
              }}
              className="flex gap-2"
            >
              <label htmlFor="stream-search" className="sr-only">
                Buscar anime na fonte de reprodução
              </label>
              <input
                id="stream-search"
                value={input}
                maxLength={200}
                onChange={(event) => setInput(event.target.value)}
                className="min-w-0 flex-1 rounded-xl bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
              />
              <button
                disabled={!input.trim()}
                className="bg-indigo-600 rounded-xl px-4 py-2 text-sm disabled:opacity-40"
              >
                Buscar
              </button>
            </form>
            {search.data?.results.length === 0 && (
              <p className="text-sm text-zinc-400">
                Nenhuma versão encontrada. Tente o título original ou outro nome.
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              {search.data?.results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setShowId(item.id)}
                  className="text-left rounded-xl border border-zinc-700 bg-zinc-900 hover:border-indigo-400 px-4 py-3 text-sm"
                >
                  {item.title}
                </button>
              ))}
            </div>
          </>
        )}
        {showId && (
          <button
            onClick={() => {
              setShowId("");
              setEpisode(null);
            }}
            className="text-left text-xs text-indigo-300"
          >
            ← Escolher outra versão
          </button>
        )}
        {info.data && (
          <>
            <h3 className="font-semibold">{info.data.title}</h3>
            <p className="text-xs text-zinc-400">
              Você procurou o episódio {requestedEpisode}. Selecione o episódio correspondente nesta
              versão.
            </p>
            {info.data.episodes.length === 0 ? (
              <p className="text-sm text-zinc-400">Esta versão não possui episódios disponíveis.</p>
            ) : (
              <label className="flex flex-col gap-2 text-sm">
                Episódio
                <select
                  aria-label="Episódio para assistir"
                  value={episode?.id || ""}
                  onChange={(event) => {
                    const next = info.data.episodes.find((item) => item.id === event.target.value);
                    if (next) choose(next);
                  }}
                  className="w-full bg-zinc-900 rounded-lg border border-zinc-700 p-3"
                >
                  <option value="" disabled>
                    Selecione um episódio
                  </option>
                  {info.data.episodes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.number}. {item.title || `Episódio ${item.number}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
        {source && episode && (
          <>
            {playback.data!.sources.length > 1 && (
              <label className="flex items-center gap-2 text-sm">
                Qualidade / fonte
                <select
                  aria-label="Qualidade ou fonte de vídeo"
                  value={sourceIndex}
                  onChange={(event) => setSourceIndex(Number(event.target.value))}
                  className="bg-zinc-900 rounded-lg border border-zinc-700 p-2"
                >
                  {playback.data!.sources.map((item, index) => (
                    <option key={`${item.url}-${index}`} value={index}>
                      {item.quality} ·{" "}
                      {item.type === "embed" ? "Player externo" : item.type.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <AnimeVideo
              key={`${episode.id}-${source.url}`}
              source={source}
              subtitles={playback.data?.subtitles}
              title={`${anime.title} · Episódio ${episode.number}`}
              onEnded={() => onWatched(episode.number)}
            />
            <div className="flex flex-wrap gap-2 justify-between text-sm">
              <button onClick={() => onWatched(episode.number)} className="text-indigo-300">
                Marcar este episódio como visto
              </button>
              {info.data &&
                info.data.episodes.findIndex((item) => item.id === episode.id) <
                  info.data.episodes.length - 1 && (
                  <button
                    onClick={() =>
                      choose(
                        info.data!.episodes[
                          info.data!.episodes.findIndex((item) => item.id === episode.id) + 1
                        ],
                      )
                    }
                    className="bg-indigo-600 rounded-lg px-4 py-2"
                  >
                    Próximo episódio →
                  </button>
                )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
