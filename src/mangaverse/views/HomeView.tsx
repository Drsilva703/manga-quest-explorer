import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, Clock, Flame, ChevronRight, BookOpen, Layers } from 'lucide-react';
import { MangaItem } from '../types/manga';
import { fetchFeaturedManga, FeaturedResult } from '../services/api';
import { getStoredLibrary } from '../services/storage';
import { HeroBanner } from '../components/HeroBanner';
import { MangaCard } from '../components/MangaCard';
import { AdPlaceholder } from '../components/AdPlaceholder';

interface HomeViewProps {
  onSelectManga: (manga: MangaItem) => void;
  onReadChapter: (manga: MangaItem, chapterNumber?: string) => void;
  onOpenSupport: () => void;
  onOpenExplore: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectManga,
  onReadChapter,
  onOpenSupport,
  onOpenExplore
}) => {
  const [featured, setFeatured] = useState<FeaturedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [libraryRefresh, setLibraryRefresh] = useState(0);

  const library = getStoredLibrary();
  const continueReadingList = library
    .filter(item => item.lastReadChapterNumber)
    .slice(0, 5);

  useEffect(() => {
    let mounted = true;
    fetchFeaturedManga().then(data => {
      if (mounted) {
        setFeatured(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleFavoriteChanged = () => {
    setLibraryRefresh(prev => prev + 1);
  };

  return (
    <div className="w-full pb-16">
      {/* Hero Carousel */}
      {featured && featured.trending.length > 0 && (
        <HeroBanner
          items={featured.trending}
          onSelectManga={onSelectManga}
          onReadChapter={onReadChapter}
        />
      )}

      {/* Top Monetization Leaderboard Banner */}
      <AdPlaceholder type="leaderboard" onOpenSupport={onOpenSupport} />

      {/* Continuar de onde parou Section (if user has read anything) */}
      {continueReadingList.length > 0 && (
        <section className="mb-10 px-2.5 sm:px-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 sm:w-2 h-4 sm:h-5 rounded-full bg-emerald-500" />
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Continuar de onde parou
              </h3>
            </div>
            <span className="text-[11px] sm:text-xs text-zinc-400">
              Histórico salvo
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            {continueReadingList.map(item => (
              <div
                key={item.mangaId}
                onClick={() => onReadChapter(item.manga, item.lastReadChapterNumber)}
                className="group relative rounded-xl bg-zinc-900 border border-zinc-800/80 p-2 sm:p-3 hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="aspect-[3/4] w-full sm:w-14 sm:h-18 rounded-lg overflow-hidden shrink-0 bg-zinc-950">
                    <img
                      src={item.manga.coverUrl}
                      alt={item.manga.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.dataset.retried && item.manga.coverUrl.startsWith('http')) {
                          img.dataset.retried = 'true';
                          img.src = `/api/proxy-image?url=${encodeURIComponent(item.manga.coverUrl)}`;
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[11px] sm:text-xs font-semibold text-white truncate group-hover:text-indigo-400 transition-colors">
                      {item.manga.title}
                    </h4>
                    <span className="text-[10px] sm:text-[11px] text-indigo-300 font-medium block mt-0.5">
                      Cap. {item.lastReadChapterNumber}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-zinc-400 block">
                      Pág. {item.lastReadPage || 1}
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] sm:text-[11px] text-zinc-400">
                  <span className="truncate">Retomar</span>
                  <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Populares da Semana */}
      <section className="mb-10 sm:mb-12 px-2.5 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Mais Lidos da Semana
            </h3>
            <span className="text-xs text-zinc-400 font-normal hidden md:inline">
              · Os mangás e manhwas mais acompanhados
            </span>
          </div>
          <button
            onClick={onOpenExplore}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="aspect-[3/4] bg-zinc-800/70 rounded-lg sm:rounded-xl" />
                <div className="h-3.5 bg-zinc-800/70 rounded w-3/4" />
                <div className="h-3 bg-zinc-850 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 md:gap-6">
            {featured?.popular.map(manga => (
              <MangaCard
                key={manga.id}
                manga={manga}
                onClick={() => onSelectManga(manga)}
                onFavoriteToggle={handleFavoriteChanged}
              />
            ))}
          </div>
        )}
      </section>

      {/* Lançamentos Recentes */}
      <section className="mb-10 sm:mb-12 px-2.5 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Lançamentos Recentes
            </h3>
            <span className="text-xs text-zinc-400 font-normal hidden md:inline">
              · Últimos capítulos traduzidos em PT-BR
            </span>
          </div>
          <button
            onClick={onOpenExplore}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
          >
            <span>Explorar</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="aspect-[3/4] bg-zinc-800/70 rounded-lg sm:rounded-xl" />
                <div className="h-3.5 bg-zinc-800/70 rounded w-3/4" />
                <div className="h-3 bg-zinc-850 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 md:gap-6">
            {featured?.latest.map(manga => (
              <MangaCard
                key={manga.id}
                manga={manga}
                onClick={() => onSelectManga(manga)}
                onFavoriteToggle={handleFavoriteChanged}
              />
            ))}
          </div>
        )}
      </section>

      {/* Atualizados Recentemente */}
      <section className="mb-10 sm:mb-12 px-2.5 sm:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-pink-400" />
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Atualizados Recentemente
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 md:gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="aspect-[3/4] bg-zinc-800/70 rounded-lg sm:rounded-xl" />
                <div className="h-3.5 bg-zinc-800/70 rounded w-3/4" />
                <div className="h-3 bg-zinc-850 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4 md:gap-6">
            {featured?.updated.map(manga => (
              <MangaCard
                key={manga.id}
                manga={manga}
                onClick={() => onSelectManga(manga)}
                onFavoriteToggle={handleFavoriteChanged}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
