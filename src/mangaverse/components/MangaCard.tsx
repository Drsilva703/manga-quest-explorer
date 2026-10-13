import React, { useState } from 'react';
import { Star, Heart, BookOpen } from 'lucide-react';
import { MangaItem } from '../types/manga';
import { toggleFavorite, getStoredLibrary } from '../services/storage';
import { getUserReview } from '../services/reviewService';

interface MangaCardProps {
  manga: MangaItem;
  onClick: () => void;
  onFavoriteToggle?: () => void;
}

export const MangaCard: React.FC<MangaCardProps> = ({ manga, onClick, onFavoriteToggle }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const library = getStoredLibrary();
  const libraryItem = library.find(item => item.mangaId === manga.id || item.manga.slug === manga.slug);
  const isFavorite = libraryItem?.isFavorite;
  const hasHistory = !!libraryItem?.lastReadChapterNumber;
  const userReview = getUserReview(manga.id);

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(manga);
    if (onFavoriteToggle) onFavoriteToggle();
  };

  const statusLabel =
    manga.status === 'completed'
      ? 'Concluído'
      : manga.status === 'hiatus'
      ? 'Em Hiato'
      : manga.status === 'cancelled'
      ? 'Cancelado'
      : 'Em lançamento';

  const typeLabel =
    manga.country === 'kr'
      ? 'Manhwa'
      : manga.country === 'cn'
      ? 'Manhua'
      : 'Mangá';

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer transition-all duration-200 select-none text-left w-full"
    >
      {/* Cover container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg sm:rounded-xl bg-zinc-900 border border-zinc-800/80 shadow-md transition-all duration-300 group-hover:border-indigo-500/40 group-hover:shadow-indigo-500/10">
        {!imageFailed ? (
          <img
            src={manga.coverUrl}
            alt={manga.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.retried && manga.coverUrl && manga.coverUrl.startsWith('http')) {
                img.dataset.retried = 'true';
                img.src = `/api/proxy-image?url=${encodeURIComponent(manga.coverUrl)}`;
              } else {
                setImageFailed(true);
              }
            }}
          />
        ) : (
          /* Elegant Typographic Cover for this specific manga */
          <div className="h-full w-full flex flex-col justify-between p-2.5 sm:p-4 bg-gradient-to-br from-zinc-800 via-zinc-900 to-indigo-950 border border-zinc-700/50">
            <div className="flex items-center justify-between text-zinc-400">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-indigo-300">{typeLabel}</span>
            </div>
            <div>
              <h5 className="text-[11px] sm:text-xs font-bold text-white line-clamp-2 sm:line-clamp-3 leading-snug">
                {manga.title}
              </h5>
              <p className="text-[9px] sm:text-[10px] text-zinc-400 mt-0.5 line-clamp-1">
                {manga.authors?.[0] || 'Quadrinho'}
              </p>
            </div>
          </div>
        )}

        {/* Gradient shadow for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/25 to-transparent pointer-events-none" />

        {/* Quick bookmark heart button */}
        <button
          onClick={handleFavorite}
          aria-label="Favoritar"
          className={`absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 p-1 sm:p-1.5 rounded-md sm:rounded-lg backdrop-blur-md transition-all ${
            isFavorite
              ? 'bg-pink-600/85 text-white shadow-md shadow-pink-600/40'
              : 'bg-zinc-950/65 text-zinc-400 hover:text-white hover:bg-zinc-900/90'
          }`}
        >
          <Heart className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isFavorite ? 'fill-white' : ''}`} />
        </button>

        {/* Bottom overlay info inside cover */}
        <div className="absolute bottom-1.5 left-1.5 right-1.5 sm:bottom-2 sm:left-2.5 sm:right-2.5 pointer-events-none">
          {/* Unboxed clean metadata line */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-medium text-zinc-300">
            <span className="flex items-center gap-0.5 text-amber-400 font-semibold shrink-0">
              <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-amber-400" />
              {manga.rating.toFixed(1)}
              {userReview && (
                <span className="ml-1 text-[9px] text-amber-300 font-bold bg-amber-500/20 px-1 rounded" title={`Sua nota: ${userReview.rating}/5`}>
                  ★{userReview.rating}
                </span>
              )}
            </span>
            <span className="text-zinc-400 text-[9px] sm:text-[10px] font-medium truncate max-w-[55%] text-right">
              {manga.totalChapters ? `${manga.totalChapters} caps` : typeLabel}
            </span>
          </div>

          {/* Reading progress bar if user has history */}
          {hasHistory && libraryItem?.lastReadChapterNumber && (
            <div className="mt-1 pt-1 border-t border-zinc-700/60 flex items-center justify-between text-[9px] sm:text-[10px] text-indigo-300">
              <span className="truncate">C.{libraryItem.lastReadChapterNumber}</span>
              <span className="text-emerald-400 font-semibold text-[8px] sm:text-[9px]">Ler</span>
            </div>
          )}
        </div>
      </div>

      {/* Title & Metadata below card */}
      <div className="mt-1.5 sm:mt-2.5 px-0.5">
        <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 line-clamp-2 leading-tight group-hover:text-indigo-400 transition-colors">
          {manga.title}
        </h4>

        {/* Clean unboxed status & chapters */}
        <div className="mt-0.5 sm:mt-1 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-zinc-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/80 shrink-0" />
          <span className="truncate">{statusLabel}</span>
          <span className="text-zinc-600 hidden sm:inline" aria-hidden="true">·</span>
          <span className="text-zinc-400 truncate hidden sm:inline">
            {manga.totalChapters ? `${manga.totalChapters} Caps` : 'Em dia'}
          </span>
        </div>
      </div>
    </div>
  );
};
