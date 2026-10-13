import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  BookOpen,
  Trash2,
  CheckCircle,
  Clock,
  Heart,
  Search,
  ArrowUpDown,
  Download,
  Upload,
  Sparkles,
  LayoutGrid,
  List,
  Star,
  HardDrive,
  MessageSquare,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserLibraryItem, ReadingStatus, MangaItem } from '../types/manga';
import { MangaCard } from '../components/MangaCard';
import {
  getStoredLibrary,
  removeLibraryItem,
  updateLibraryItem
} from '../services/storage';
import {
  getAllDownloadedChapters,
  deleteDownloadedChapter,
  clearAllDownloadedChapters,
  exportOfflineChapterToDevice,
  getStoredDownloadFormat,
  formatBytes,
  OfflineChapterMeta
} from '../services/offlineStorage';
import {
  getAllUserReviews,
  getUserReview,
  UserMangaReview
} from '../services/reviewService';

interface LibraryViewProps {
  onSelectManga: (manga: MangaItem) => void;
  onReadChapter: (manga: MangaItem, chapterNumber?: string) => void;
  onOpenSettings: () => void;
  onOpenExplore: () => void;
}

type LibraryTab = 'all' | ReadingStatus | 'favorites' | 'offline' | 'reviews';

export const LibraryView: React.FC<LibraryViewProps> = ({
  onSelectManga,
  onReadChapter,
  onOpenSettings,
  onOpenExplore
}) => {
  const [library, setLibrary] = useState<UserLibraryItem[]>(getStoredLibrary());
  const [activeTab, setActiveTab] = useState<LibraryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'progress' | 'rating'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'detailed'>('grid');

  // Offline downloads state
  const [downloadedChapters, setDownloadedChapters] = useState<OfflineChapterMeta[]>([]);
  const [loadingOffline, setLoadingOffline] = useState(false);
  const [totalStorageBytes, setTotalStorageBytes] = useState(0);

  // Reviews state
  const [userReviews, setUserReviews] = useState<Record<string, UserMangaReview>>(getAllUserReviews());
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);
  const [libraryToast, setLibraryToast] = useState<string | null>(null);

  const loadOfflineData = async () => {
    setLoadingOffline(true);
    try {
      const list = await getAllDownloadedChapters();
      setDownloadedChapters(list);
      const total = list.reduce((sum, item) => sum + (item.sizeBytes || 0), 0);
      setTotalStorageBytes(total);
    } catch (err) {
      console.error('Erro ao carregar capítulos offline:', err);
    } finally {
      setLoadingOffline(false);
    }
  };

  useEffect(() => {
    setLibrary(getStoredLibrary());
    setUserReviews(getAllUserReviews());
    loadOfflineData();
  }, []);

  const handleRemove = (e: React.MouseEvent, mangaId: string) => {
    e.stopPropagation();
    const updated = removeLibraryItem(mangaId);
    setLibrary(updated);
  };

  const handleStatusChange = (e: React.MouseEvent, item: UserLibraryItem, newStatus: ReadingStatus) => {
    e.stopPropagation();
    const updated = updateLibraryItem(item.manga, newStatus, item.isFavorite);
    setLibrary(updated);
  };

  const handleExportOfflineChapter = async (e: React.MouseEvent, item: OfflineChapterMeta) => {
    e.stopPropagation();
    try {
      const fmt = getStoredDownloadFormat();
      const exported = await exportOfflineChapterToDevice(item.mangaId, item.chapterNumber, fmt);
      if (exported) {
        setLibraryToast(`Arquivo ${exported.fileName} salvo no armazenamento do seu aparelho!`);
        setTimeout(() => setLibraryToast(null), 4000);
      }
    } catch (err) {
      console.error('Erro ao baixar arquivo para o aparelho:', err);
    }
  };

  const handleDeleteOfflineChapter = async (e: React.MouseEvent, item: OfflineChapterMeta) => {
    e.stopPropagation();
    try {
      await deleteDownloadedChapter(item.mangaId, item.chapterNumber);
      await loadOfflineData();
    } catch (err) {
      console.error('Erro ao apagar capítulo offline:', err);
    }
  };

  const handleClearAllOffline = async () => {
    if (downloadedChapters.length === 0) return;
    const confirm = window.confirm('Deseja realmente apagar todos os capítulos baixados da memória offline?');
    if (!confirm) return;
    try {
      await clearAllDownloadedChapters();
      await loadOfflineData();
    } catch (err) {
      console.error('Erro ao limpar capítulos offline:', err);
    }
  };

  const handleReadOffline = (item: OfflineChapterMeta) => {
    // Find manga from library or create temporary manga item
    const foundLib = library.find((l) => l.mangaId === item.mangaId);
    const targetManga: MangaItem = foundLib
      ? foundLib.manga
      : {
          id: item.mangaId,
          slug: item.mangaId,
          title: item.mangaTitle,
          coverUrl: item.coverUrl,
          description: 'Mangá disponível offline no MangaVerse.',
          genres: ['Offline'],
          status: 'ongoing',
          authors: [],
          artists: [],
          rating: 9.0,
          views: 1000,
          totalChapters: 50
        };
    onReadChapter(targetManga, item.chapterNumber);
  };

  // Filter items for regular library tabs
  const filtered = library.filter((item) => {
    if (activeTab === 'favorites') {
      if (!item.isFavorite) return false;
    } else if (activeTab === 'reviews') {
      const review = userReviews[item.mangaId];
      if (!review) return false;
      if (selectedStarFilter && review.rating !== selectedStarFilter) return false;
    } else if (activeTab !== 'all' && activeTab !== 'offline') {
      if (item.status !== activeTab) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.manga.title.toLowerCase().includes(q) ||
        (item.manga.altTitles || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Sort items
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'title') {
      return a.manga.title.localeCompare(b.manga.title);
    }
    if (sortBy === 'progress') {
      const na = parseFloat(a.lastReadChapterNumber || '0');
      const nb = parseFloat(b.lastReadChapterNumber || '0');
      return nb - na;
    }
    if (sortBy === 'rating') {
      const ra = userReviews[a.mangaId]?.rating || 0;
      const rb = userReviews[b.mangaId]?.rating || 0;
      return rb - ra;
    }
    // Default: recent
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Stats
  const totalReading = library.filter((i) => i.status === 'reading').length;
  const totalCompleted = library.filter((i) => i.status === 'completed').length;
  const totalFavorites = library.filter((i) => i.isFavorite).length;
  const totalReviewed = Object.keys(userReviews).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 py-6 sm:py-8 pb-24 text-left">
      {/* Header and Stats */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bookmark className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
            <span>Minha Biblioteca</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Organize seus mangás, capítulos offline e suas notas e avaliações pessoais
          </p>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500 mr-1.5">Lendo:</span>
            <span className="font-bold text-white">{totalReading}</span>
          </div>
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500 mr-1.5">Concluídos:</span>
            <span className="font-bold text-emerald-400">{totalCompleted}</span>
          </div>
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500 mr-1.5">Favoritos:</span>
            <span className="font-bold text-pink-400">{totalFavorites}</span>
          </div>
          <div className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <span className="text-zinc-500 mr-1.5">Offline:</span>
            <span className="font-bold text-cyan-400">{downloadedChapters.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'reading', label: 'Lendo' },
            { id: 'plan_to_read', label: 'Quero Ler' },
            { id: 'completed', label: 'Concluídos' },
            { id: 'favorites', label: 'Favoritos ♥' },
            { id: 'offline', label: `Baixados (${downloadedChapters.length})` },
            { id: 'reviews', label: `Minhas Avaliações (${totalReviewed})` },
            { id: 'dropped', label: 'Abandonados' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Sort & View Mode inside library */}
        {activeTab !== 'offline' && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-44">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Filtrar biblioteca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1.5 px-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-medium focus:outline-none"
            >
              <option value="recent">Recentes</option>
              <option value="title">Título</option>
              <option value="progress">Progresso</option>
              <option value="rating">Minha Nota</option>
            </select>

            {/* View toggle (Grade vs Lista) */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                title="Grade (3 colunas)"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('detailed')}
                title="Lista detalhada"
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'detailed'
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --- OFFLINE CHAPTERS TAB --- */}
      {activeTab === 'offline' && (
        <div className="space-y-4">
          {/* Storage Summary Bar */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Armazenamento Offline</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  <span className="text-cyan-300 font-semibold">{downloadedChapters.length} capítulos salvos</span>
                  <span className="mx-1.5 text-zinc-600">·</span>
                  <span className="font-mono text-zinc-300">{formatBytes(totalStorageBytes)}</span> em IndexedDB local
                </p>
              </div>
            </div>

            {downloadedChapters.length > 0 && (
              <button
                onClick={handleClearAllOffline}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-rose-900/40 text-zinc-300 hover:text-rose-300 border border-zinc-700/60 hover:border-rose-700/60 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Todos os Downloads</span>
              </button>
            )}
          </div>

          {downloadedChapters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {downloadedChapters.map((ch) => (
                <div
                  key={ch.id}
                  className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800/90 hover:border-cyan-500/40 transition-all flex gap-3.5 items-center group shadow-md"
                >
                  {/* Cover */}
                  <div className="w-16 h-20 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                    <img
                      src={ch.coverUrl}
                      alt={ch.mangaTitle}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.dataset.retried && ch.coverUrl.startsWith('http')) {
                          img.dataset.retried = 'true';
                          img.src = `/api/proxy-image?url=${encodeURIComponent(ch.coverUrl)}`;
                        }
                      }}
                    />
                  </div>

                  {/* Info & Actions */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">
                      <Download className="w-3 h-3" />
                      <span>Salvo Offline</span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-white truncate mt-0.5 group-hover:text-cyan-300 transition-colors">
                      {ch.mangaTitle}
                    </h4>

                    <p className="text-xs font-semibold text-zinc-300 mt-0.5 truncate">
                      Capítulo {ch.chapterNumber}
                      {ch.chapterTitle && ch.chapterTitle !== `Capítulo ${ch.chapterNumber}` ? ` - ${ch.chapterTitle}` : ''}
                    </p>

                    <div className="text-[11px] text-zinc-400 font-mono mt-1">
                      {ch.pagesCount} páginas · {formatBytes(ch.sizeBytes)}
                    </div>

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800">
                      <button
                        onClick={() => handleReadOffline(ch)}
                        className="flex-1 py-1 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Ler</span>
                      </button>

                      <button
                        onClick={(e) => handleExportOfflineChapter(e, ch)}
                        title={`Baixar arquivo .${getStoredDownloadFormat().toUpperCase()} completo para o armazenamento do seu aparelho`}
                        className="py-1 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1 border border-zinc-700/60"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="hidden sm:inline">Baixar .{getStoredDownloadFormat().toUpperCase()}</span>
                      </button>

                      <button
                        onClick={(e) => handleDeleteOfflineChapter(e, ch)}
                        title="Remover este capítulo baixado"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 px-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
              <Download className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-base font-bold text-zinc-200">
                Nenhum capítulo baixado ainda
              </h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-5">
                Para ler mangás sem internet, clique no botão de download (💾) ao lado de qualquer capítulo na página de detalhes da obra.
              </p>
              <button
                onClick={onOpenExplore}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Explorar Mangás</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- REVIEWS FILTER PILLS (When activeTab === 'reviews') --- */}
      {activeTab === 'reviews' && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 text-xs">
          <span className="text-zinc-500 font-medium mr-1 shrink-0">Filtrar por estrelas:</span>
          <button
            onClick={() => setSelectedStarFilter(null)}
            className={`px-2.5 py-1 rounded-lg border transition-colors shrink-0 ${
              selectedStarFilter === null
                ? 'bg-amber-500 text-black font-bold border-amber-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
            }`}
          >
            Todas ({totalReviewed})
          </button>
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = Object.values(userReviews).filter((r) => r.rating === stars).length;
            return (
              <button
                key={stars}
                onClick={() => setSelectedStarFilter(selectedStarFilter === stars ? null : stars)}
                className={`px-2.5 py-1 rounded-lg border transition-colors shrink-0 flex items-center gap-1 ${
                  selectedStarFilter === stars
                    ? 'bg-amber-500 text-black font-bold border-amber-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Star className="w-3 h-3 fill-current" />
                <span>{stars} ({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* --- REGULAR LIBRARY GRID / LIST (For all other tabs) --- */}
      {activeTab !== 'offline' && (
        sorted.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
              {sorted.map((item) => (
                <MangaCard
                  key={item.mangaId}
                  manga={item.manga}
                  onClick={() => onSelectManga(item.manga)}
                  onFavoriteToggle={() => setLibrary(getStoredLibrary())}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {sorted.map((item) => {
                const hasRead = !!item.lastReadChapterNumber;
                const review = userReviews[item.mangaId];

                return (
                  <div
                    key={item.mangaId}
                    onClick={() => onSelectManga(item.manga)}
                    className="group relative rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-3 hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col justify-between shadow-lg"
                  >
                    <div className="flex gap-3.5">
                      {/* Cover */}
                      <div className="w-20 sm:w-24 aspect-[3/4] rounded-xl overflow-hidden shrink-0 bg-zinc-950 border border-zinc-800">
                        <img
                          src={item.manga.coverUrl}
                          alt={item.manga.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            if (!img.dataset.retried && item.manga.coverUrl.startsWith('http')) {
                              img.dataset.retried = 'true';
                              img.src = `/api/proxy-image?url=${encodeURIComponent(item.manga.coverUrl)}`;
                            }
                          }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                              {item.manga.country === 'kr' ? 'Manhwa' : 'Mangá'}
                            </span>
                            <div className="flex items-center gap-1">
                              {review && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                  <Star className="w-2.5 h-2.5 fill-amber-300" />
                                  <span>{review.rating}/5</span>
                                </span>
                              )}
                              {item.isFavorite && (
                                <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500 shrink-0" />
                              )}
                            </div>
                          </div>

                          <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-300 transition-colors mt-0.5">
                            {item.manga.title}
                          </h4>

                          <div className="text-[11px] text-zinc-400 mt-1">
                            {hasRead ? (
                              <span className="text-indigo-300 font-medium">
                                Último lido: Cap. {item.lastReadChapterNumber}
                              </span>
                            ) : (
                              <span className="text-zinc-500">Não iniciado</span>
                            )}
                          </div>

                          {/* Personal notes preview if present */}
                          {review?.notes && (
                            <div className="mt-1.5 p-1.5 rounded-lg bg-zinc-950/70 border border-zinc-800 text-[10px] text-zinc-300 line-clamp-2 italic">
                              "{review.notes}"
                            </div>
                          )}
                        </div>

                        {/* Status badge & Remove button */}
                        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-zinc-800">
                          <select
                            value={item.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStatusChange(e as any, item, e.target.value as ReadingStatus)}
                            className="py-1 px-1.5 rounded-md bg-zinc-800 text-[10px] font-medium text-zinc-300 focus:outline-none"
                          >
                            <option value="reading">Lendo</option>
                            <option value="plan_to_read">Quero Ler</option>
                            <option value="completed">Concluído</option>
                            <option value="dropped">Abandonado</option>
                          </select>

                          <button
                            onClick={(e) => handleRemove(e, item.mangaId)}
                            aria-label="Remover da biblioteca"
                            className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                            title="Remover da biblioteca"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Continue reading action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReadChapter(item.manga, item.lastReadChapterNumber || '1');
                      }}
                      className="mt-3 w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-indigo-600 text-zinc-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{hasRead ? 'Continuar Leitura' : 'Começar a Ler'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Empty State */
          <div className="text-center py-24 px-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
            <Bookmark className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-zinc-200">
              {activeTab === 'reviews'
                ? 'Nenhuma avaliação encontrada'
                : 'Sua biblioteca está vazia'}
            </h4>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-5">
              {activeTab === 'reviews'
                ? 'Abra a página de detalhes de qualquer mangá e clique nas 5 estrelas para salvar suas notas e avaliações pessoais.'
                : 'Adicione mangás aos seus favoritos ou comece a ler qualquer título para salvá-lo automaticamente aqui.'}
            </p>
            <button
              onClick={onOpenExplore}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explorar Catálogo</span>
            </button>
          </div>
        )
      )}
    </div>
  );
};
