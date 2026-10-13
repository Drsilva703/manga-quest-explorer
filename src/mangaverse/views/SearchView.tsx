import React, { useState, useEffect } from 'react';
import { Search, X, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { MangaItem, MangaStatus, MangaCountry } from '../types/manga';
import { searchManga, SearchFilters } from '../services/api';
import { MangaCard } from '../components/MangaCard';
import { getStoredSettings } from '../services/storage';

interface SearchViewProps {
  initialQuery?: string;
  onSelectManga: (manga: MangaItem) => void;
}

const GENRE_OPTIONS = [
  'Ação',
  'Aventura',
  'Fantasia',
  'Manhwa',
  'Romance',
  'Comédia',
  'Shounen',
  'Seinen',
  'Isekai',
  'Sobrenatural',
  'Horror',
  'Slice of Life',
  'Superpoderes',
  'Drama'
];

export const SearchView: React.FC<SearchViewProps> = ({ initialQuery = '', onSelectManga }) => {
  const settings = getStoredSettings();
  const [query, setQuery] = useState(initialQuery);
  const [selectedCountry, setSelectedCountry] = useState<MangaCountry | ''>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<MangaStatus | ''>('');
  const [nsfw, setNsfw] = useState<boolean>(settings.nsfwEnabled);
  const [results, setResults] = useState<MangaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Sync initial query
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  // Debounced search (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setLoading(true);
      const filters: SearchFilters = {
        query: query.trim(),
        country: selectedCountry,
        genre: selectedGenre,
        status: selectedStatus,
        nsfw: nsfw
      };

      searchManga(filters).then(res => {
        setResults(res);
        setLoading(false);
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [query, selectedCountry, selectedGenre, selectedStatus, nsfw]);

  const clearFilters = () => {
    setQuery('');
    setSelectedGenre('');
    setSelectedStatus('');
    setSelectedCountry('');
  };

  const hasActiveFilters = !!(query || selectedGenre || selectedStatus || selectedCountry);

  return (
    <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 py-4 sm:py-6 pb-24">
      {/* Search Header and Input */}
      <div className="mb-5 sm:mb-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Explorar & Buscar Mangás
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 sm:mt-1">
              Acervo 100% em português (PT-BR) com capítulos completos e leitor HD
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              APIs PT-BR Ativas
            </span>
          </div>
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Digite o título em português, sinônimo ou autor..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 sm:py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter panel - Clean and wraps cleanly on mobile */}
      <div className="mb-5 sm:mb-6 p-3 sm:p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-3 sm:space-y-4 block">
        {/* Country format and Status filters */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-between">
          {/* Format segmented controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-zinc-400 mr-1">Tipo:</span>
            {[
              { id: '', label: 'Todos' },
              { id: 'jp', label: 'Mangás' },
              { id: 'kr', label: 'Manhwas' },
              { id: 'cn', label: 'Manhuas' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedCountry(f.id as any)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCountry === f.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Status segmented controls */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-zinc-400 mr-1">Status:</span>
            {[
              { id: '', label: 'Todos' },
              { id: 'ongoing', label: 'Em andamento' },
              { id: 'completed', label: 'Concluído' },
              { id: 'hiatus', label: 'Hiato' }
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStatus(s.id as any)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedStatus === s.id
                    ? 'bg-zinc-700 text-white'
                    : 'bg-zinc-800/80 text-zinc-400 hover:text-white'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-zinc-400 hover:text-pink-400 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>

        {/* Genre Tags bar */}
        <div>
          <span className="text-xs font-semibold text-zinc-400 block mb-1.5 sm:mb-2">Gêneros populares:</span>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {GENRE_OPTIONS.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGenre(selectedGenre === g ? '' : g)}
                className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[11px] sm:text-xs font-medium transition-all ${
                  selectedGenre === g
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-750 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <span className="text-xs font-medium text-zinc-400">
          {loading ? 'Buscando...' : `${results.length} títulos encontrados`}
        </span>
      </div>

      {/* Results grid - 3 vertical columns on mobile */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="aspect-[3/4] bg-zinc-800/70 rounded-lg sm:rounded-xl" />
              <div className="h-3.5 bg-zinc-800/70 rounded w-3/4" />
              <div className="h-3 bg-zinc-850 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
          {results.map(manga => (
            <MangaCard
              key={manga.id}
              manga={manga}
              onClick={() => onSelectManga(manga)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 sm:py-20 px-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
          <Sparkles className="w-9 h-9 sm:w-10 sm:h-10 text-zinc-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-zinc-200">
            Nenhum resultado encontrado
          </h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
            Tente buscar com outro termo ou ajustar os filtros de gênero e status.
          </p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}
    </div>
  );
};
