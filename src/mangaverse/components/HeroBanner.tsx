import React, { useState, useEffect } from 'react';
import { BookOpen, Star, ChevronLeft, ChevronRight, Info, Sparkles } from 'lucide-react';
import { MangaItem } from '../types/manga';

interface HeroBannerProps {
  items: MangaItem[];
  onSelectManga: (manga: MangaItem) => void;
  onReadChapter: (manga: MangaItem, chapterNumber?: string) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ items, onSelectManga, onReadChapter }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const displayItems = items.slice(0, 5);

  useEffect(() => {
    if (displayItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayItems.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [displayItems.length]);

  if (displayItems.length === 0) return null;

  const current = displayItems[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + displayItems.length) % displayItems.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % displayItems.length);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-2xl mb-6 sm:mb-8 group">
      {/* Blurred background image with ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src={current.bannerUrl || current.coverUrl}
          alt={current.title}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center filter blur-xl opacity-30 transform scale-110 transition-all duration-700"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.dataset.retried && current.bannerUrl) {
              img.dataset.retried = 'true';
              img.src = `/api/proxy-image?url=${encodeURIComponent(current.bannerUrl)}`;
            } else {
              img.style.display = 'none';
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 sm:gap-6 p-4 sm:p-8 md:p-10 max-w-7xl mx-auto">
        {/* Cover artwork */}
        <div
          onClick={() => onSelectManga(current)}
          className="w-28 sm:w-44 md:w-52 shrink-0 aspect-[3/4] rounded-lg sm:rounded-xl overflow-hidden shadow-2xl border border-zinc-700/60 cursor-pointer transform hover:scale-[1.02] transition-transform duration-300 bg-zinc-900"
        >
          <img
            src={current.coverUrl}
            alt={current.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              if (!img.dataset.retried && current.coverUrl.startsWith('http')) {
                img.dataset.retried = 'true';
                img.src = `/api/proxy-image?url=${encodeURIComponent(current.coverUrl)}`;
              }
            }}
          />
        </div>

        {/* Text and actions */}
        <div className="flex-1 text-center md:text-left space-y-2 sm:space-y-3">
          {/* Unboxed kicker */}
          <div className="flex items-center justify-center md:justify-start gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-indigo-400 font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="uppercase tracking-wider">Destaque</span>
            <span className="text-zinc-600" aria-hidden="true">·</span>
            <span className="text-zinc-400 font-normal">{current.country === 'kr' ? 'Manhwa' : 'Mangá'}</span>
          </div>

          <h2
            onClick={() => onSelectManga(current)}
            className="text-lg sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white hover:text-indigo-300 transition-colors cursor-pointer line-clamp-2"
          >
            {current.title}
          </h2>

          {/* Clean unboxed metadata */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-zinc-300">
            <span className="flex items-center gap-1 font-semibold text-amber-400">
              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400" />
              {current.rating.toFixed(1)}
            </span>
            <span className="text-zinc-600" aria-hidden="true">·</span>
            <span>{current.status === 'completed' ? 'Concluído' : 'Em lançamento'}</span>
            <span className="text-zinc-600" aria-hidden="true">·</span>
            <span>{current.totalChapters ? `${current.totalChapters} Capítulos` : 'Em dia'}</span>
            {current.genres.slice(0, 2).map((g) => (
              <React.Fragment key={g}>
                <span className="text-zinc-600" aria-hidden="true">·</span>
                <span className="text-zinc-400">{g}</span>
              </React.Fragment>
            ))}
          </div>

          <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 sm:line-clamp-3 leading-relaxed max-w-2xl hidden xs:block">
            {current.description}
          </p>

          {/* Action buttons */}
          <div className="pt-1 sm:pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2 sm:gap-3">
            <button
              onClick={() => onReadChapter(current, '1')}
              className="py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5 sm:gap-2"
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Ler Capítulo 1</span>
            </button>

            <button
              onClick={() => onSelectManga(current)}
              className="py-2 sm:py-2.5 px-3.5 sm:px-4 rounded-xl bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-200 hover:text-white text-xs sm:text-sm font-medium border border-zinc-700/60 transition-all flex items-center gap-1.5 sm:gap-2"
            >
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Detalhes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {displayItems.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Item anterior"
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-zinc-950/70 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Próximo item"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-zinc-950/70 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 z-20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 right-6 z-20 flex items-center gap-1.5">
            {displayItems.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(i);
                }}
                aria-label={`Ir para destaque ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  currentIndex === i ? 'w-6 bg-indigo-500' : 'w-2 bg-zinc-600 hover:bg-zinc-400'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
