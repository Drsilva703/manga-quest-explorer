import { AnimeImage } from "./AnimeImage";
import { Film, Star } from "lucide-react";
import type { Anime } from "../types/anime";

export function AnimeCard({ anime, onSelect }: { anime: Anime; onSelect: (anime: Anime) => void }) {
  return (
    <button
      onClick={() => onSelect(anime)}
      className="group text-left min-w-0"
      aria-label={`Ver detalhes de ${anime.title}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 group-hover:border-indigo-400 transition-colors">
        <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
          <Film size={36} />
        </div>
        {anime.coverUrl && (
          <AnimeImage
            src={anime.coverUrl}
            alt={anime.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="relative w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        {anime.score !== null && (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-black/80 px-2 py-1 text-xs font-bold text-amber-300">
            <Star size={12} />
            {anime.score.toFixed(1)}
          </span>
        )}
        <span className="absolute bottom-2 left-2 rounded-md bg-indigo-600/90 px-2 py-1 text-[10px] text-white font-bold">
          ANIME
        </span>
      </div>
      <h3 className="mt-2 text-sm font-bold text-zinc-100 group-hover:text-indigo-300 line-clamp-2">
        {anime.title}
      </h3>
      <p className="mt-1 text-xs text-zinc-400">
        {anime.year || "Ano não informado"}
        {anime.episodeCount ? ` · ${anime.episodeCount} episódios` : ""}
      </p>
    </button>
  );
}
