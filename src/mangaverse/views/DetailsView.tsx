import React, { useState, useEffect, useRef } from 'react';
import {
  Star,
  BookOpen,
  Heart,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Share2,
  Clock,
  Layers,
  ArrowLeft,
  Search,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Play,
  Users,
  Tv,
  Sparkles,
  Award,
  Globe,
  ArrowUpDown,
  Download,
  Check,
  Trash2,
  Edit3,
  MessageSquare,
  X,
  CheckSquare,
  Square,
  FileArchive,
  StopCircle
} from 'lucide-react';
import { MangaItem, MangaChapter, MangaSource, ReadingStatus, AdminUser } from '../types/manga';
import { fetchMangaChapters, fetchMangaDetails, fetchChapterPages } from '../services/api';
import {
  getStoredLibrary,
  updateLibraryItem,
  toggleFavorite
} from '../services/storage';
import { getUserReview, saveUserReview, UserMangaReview } from '../services/reviewService';
import {
  isChapterDownloaded,
  saveChapterOffline,
  deleteDownloadedChapter,
  downloadChapterToDevice,
  exportOfflineChapterToDevice,
  downloadBatchChaptersToDevice,
  getStoredDownloadFormat,
  saveStoredDownloadFormat
} from '../services/offlineStorage';
import { AdPlaceholder } from '../components/AdPlaceholder';
import { ChapterComments } from '../components/ChapterComments';

interface DetailsViewProps {
  manga: MangaItem;
  onBack: () => void;
  onReadChapter: (chapter: MangaChapter, allChapters: MangaChapter[]) => void;
  onOpenSupport: () => void;
  onGenreClick: (genre: string) => void;
  onSelectManga?: (manga: MangaItem) => void;
  adminUser?: AdminUser | null;
  onOpenAdminLogin?: () => void;
}

export const DetailsView: React.FC<DetailsViewProps> = ({
  manga: initialManga,
  onBack,
  onReadChapter,
  onOpenSupport,
  onGenreClick,
  onSelectManga,
  adminUser,
  onOpenAdminLogin
}) => {
  const [manga, setManga] = useState<MangaItem>(initialManga);
  const [chapters, setChapters] = useState<MangaChapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [sourceFilter, setSourceFilter] = useState<MangaSource>('all');
  const [chapterSearch, setChapterSearch] = useState('');
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>('plan_to_read');
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortAscending, setSortAscending] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [showTrailerModal, setShowTrailerModal] = useState(false);

  // Review & Rating State
  const [userReview, setUserReview] = useState<UserMangaReview | null>(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewModalRating, setReviewModalRating] = useState(5);
  const [reviewModalNotes, setReviewModalNotes] = useState('');

  // Offline Chapters State
  const [downloadedMap, setDownloadedMap] = useState<Record<string, boolean>>({});
  const [downloadingMap, setDownloadingMap] = useState<Record<string, { current: number; total: number }>>({});
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // Batch Download & Format Selection State
  const [downloadFormat, setDownloadFormat] = useState<'cbz' | 'zip'>(() => getStoredDownloadFormat());
  const [batchMode, setBatchMode] = useState(false);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{
    currentChapterIdx: number;
    totalChapters: number;
    chapterNumber: string;
    currentPage: number;
    totalPages: number;
    message: string;
  } | null>(null);
  const cancelBatchRef = useRef<boolean>(false);

  // Chapter Comments Modal State
  const [activeCommentsChapter, setActiveCommentsChapter] = useState<MangaChapter | null>(null);

  const ITEMS_PER_PAGE = 20;

  // Sync state if initialManga prop changes
  useEffect(() => {
    setManga(initialManga);
  }, [initialManga]);

  // Enrich manga details from backend without corrupting title or cover
  useEffect(() => {
    let mounted = true;
    fetchMangaDetails(initialManga.id).then((enriched) => {
      if (mounted && enriched) {
        setManga((prev) => ({
          ...prev,
          ...enriched,
          title: (enriched.title && enriched.title !== 'Manga Detalhado') ? enriched.title : prev.title,
          coverUrl: (enriched.coverUrl && !enriched.coverUrl.includes('unsplash.com')) ? enriched.coverUrl : prev.coverUrl,
          bannerUrl: enriched.bannerUrl || prev.bannerUrl
        }));
      }
    });
    return () => {
      mounted = false;
    };
  }, [initialManga.id]);

  // Sync library item status
  useEffect(() => {
    const library = getStoredLibrary();
    const item = library.find((i) => i.mangaId === manga.id || i.manga.slug === manga.slug);
    if (item) {
      setReadingStatus(item.status);
      setIsFavorite(item.isFavorite);
    }
  }, [manga]);

  // Sync user reviews & personal notes
  useEffect(() => {
    const rev = getUserReview(manga.id);
    setUserReview(rev);
    if (rev) {
      setReviewModalRating(rev.rating);
      setReviewModalNotes(rev.notes);
    }
  }, [manga.id]);

  // Fetch chapters
  useEffect(() => {
    let mounted = true;
    setLoadingChapters(true);
    fetchMangaChapters(manga.id, 'pt-br', manga.title).then((list) => {
      if (mounted) {
        setChapters(list);
        setLoadingChapters(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [manga.id, manga.title]);

  // Sync offline downloaded chapters state from IndexedDB
  useEffect(() => {
    let mounted = true;
    if (chapters.length > 0) {
      Promise.all(
        chapters.map(async (c) => {
          const isDl = await isChapterDownloaded(manga.id, c.chapterNumber);
          return { num: c.chapterNumber, isDl };
        })
      ).then((results) => {
        if (mounted) {
          const map: Record<string, boolean> = {};
          results.forEach((r) => {
            if (r.isDl) map[r.num] = true;
          });
          setDownloadedMap(map);
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, [manga.id, chapters]);

  const library = getStoredLibrary();
  const currentLibItem = library.find((i) => i.mangaId === manga.id || i.manga.slug === manga.slug);
  const lastReadChapterNum = currentLibItem?.lastReadChapterNumber;

  const handleStatusChange = (newStatus: ReadingStatus) => {
    setReadingStatus(newStatus);
    updateLibraryItem(manga, newStatus, isFavorite);
  };

  const handleToggleFavorite = () => {
    const fav = toggleFavorite(manga);
    setIsFavorite(fav);
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }
  };

  const handleStarClick = (stars: number) => {
    const updated = saveUserReview(manga.id, stars, userReview?.notes || '');
    setUserReview(updated);
  };

  const handleOpenReviewModal = () => {
    setReviewModalRating(userReview?.rating || 5);
    setReviewModalNotes(userReview?.notes || '');
    setShowReviewModal(true);
  };

  const handleSaveModalReview = () => {
    const updated = saveUserReview(manga.id, reviewModalRating, reviewModalNotes);
    setUserReview(updated);
    setShowReviewModal(false);
  };

  const handleFormatChange = (fmt: 'cbz' | 'zip') => {
    setDownloadFormat(fmt);
    saveStoredDownloadFormat(fmt);
    setDownloadToast(`Formato padrão alterado para .${fmt.toUpperCase()}`);
    setTimeout(() => setDownloadToast(null), 2500);
  };

  const handleDownloadChapter = async (e: React.MouseEvent, chap: MangaChapter) => {
    e.stopPropagation();
    if (downloadingMap[chap.chapterNumber]) return;

    try {
      // If already stored in offline DB, export directly to user device storage without re-fetching
      if (downloadedMap[chap.chapterNumber]) {
        setDownloadingMap((prev) => ({
          ...prev,
          [chap.chapterNumber]: { current: 1, total: 1 }
        }));
        const exported = await exportOfflineChapterToDevice(manga.id, chap.chapterNumber, downloadFormat);
        if (exported) {
          setDownloadToast(`Capítulo ${chap.chapterNumber} baixado para o seu aparelho (${exported.fileName})!`);
          setTimeout(() => setDownloadToast(null), 4000);
          return;
        }
      }

      setDownloadingMap((prev) => ({
        ...prev,
        [chap.chapterNumber]: { current: 1, total: 16 }
      }));

      const res = await fetchChapterPages(chap.id, manga.id, chap.chapterNumber, manga.title);
      const pageUrls = (res.directPages && res.directPages.length > 0) ? res.directPages : res.pages;

      if (!pageUrls || pageUrls.length === 0) {
        throw new Error('Sem páginas para download');
      }

      const result = await downloadChapterToDevice(manga, chap, pageUrls, downloadFormat, (curr, tot) => {
        setDownloadingMap((prev) => ({
          ...prev,
          [chap.chapterNumber]: { current: curr, total: tot }
        }));
      });

      setDownloadedMap((prev) => ({ ...prev, [chap.chapterNumber]: true }));
      setDownloadToast(`Capítulo ${chap.chapterNumber} baixado com sucesso para o seu aparelho (${result.fileName})!`);
      setTimeout(() => setDownloadToast(null), 4000);
    } catch (err) {
      console.error('Erro ao baixar capítulo:', err);
    } finally {
      setDownloadingMap((prev) => {
        const next = { ...prev };
        delete next[chap.chapterNumber];
        return next;
      });
    }
  };

  const handleDeleteChapterOffline = async (e: React.MouseEvent, chap: MangaChapter) => {
    e.stopPropagation();
    try {
      await deleteDownloadedChapter(manga.id, chap.chapterNumber);
      setDownloadedMap((prev) => {
        const next = { ...prev };
        delete next[chap.chapterNumber];
        return next;
      });
    } catch (err) {
      console.error('Erro ao remover capítulo offline:', err);
    }
  };

  const handleToggleSelectChapter = (chapId: string) => {
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapId)) {
        next.delete(chapId);
      } else {
        next.add(chapId);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (selectedBatchIds.size === filteredChapters.length) {
      setSelectedBatchIds(new Set());
    } else {
      setSelectedBatchIds(new Set(filteredChapters.map((c) => c.id)));
    }
  };

  const handleSelectNextN = (count: number) => {
    const nextChapters = filteredChapters
      .filter((c) => !downloadedMap[c.chapterNumber])
      .slice(0, count);
    setSelectedBatchIds((prev) => {
      const next = new Set(prev);
      nextChapters.forEach((c) => next.add(c.id));
      return next;
    });
  };

  const handleClearBatchSelection = () => {
    setSelectedBatchIds(new Set());
  };

  const handleStartBatchDownload = async () => {
    if (batchDownloading) return;
    const targets = chapters.filter((c) => selectedBatchIds.has(c.id));
    if (targets.length === 0) return;

    setBatchDownloading(true);
    cancelBatchRef.current = false;
    setBatchProgress({
      currentChapterIdx: 1,
      totalChapters: targets.length,
      chapterNumber: targets[0].chapterNumber,
      currentPage: 0,
      totalPages: 0,
      message: `Iniciando download de ${targets.length} capítulos (.${downloadFormat.toUpperCase()})...`
    });

    try {
      const { downloadedCount } = await downloadBatchChaptersToDevice(
        manga,
        targets,
        async (chap) => {
          const res = await fetchChapterPages(chap.id, manga.id, chap.chapterNumber, manga.title);
          return (res.directPages && res.directPages.length > 0) ? res.directPages : res.pages;
        },
        downloadFormat,
        (info) => {
          setBatchProgress(info);
          setDownloadedMap((prev) => ({ ...prev, [info.chapterNumber]: true }));
        },
        () => cancelBatchRef.current
      );

      // Refresh downloaded map
      const updatedMap = { ...downloadedMap };
      targets.slice(0, downloadedCount).forEach((c) => {
        updatedMap[c.chapterNumber] = true;
      });
      setDownloadedMap(updatedMap);

      if (cancelBatchRef.current) {
        setDownloadToast(`Download em lote interrompido. ${downloadedCount} de ${targets.length} capítulos salvos.`);
      } else {
        setDownloadToast(`Download em lote concluído! ${downloadedCount} capítulos em .${downloadFormat.toUpperCase()} salvos no seu armazenamento.`);
        setSelectedBatchIds(new Set());
        setBatchMode(false);
      }
      setTimeout(() => setDownloadToast(null), 5000);
    } catch (err) {
      console.error('Erro no download em lote:', err);
      setDownloadToast('Ocorreu um erro durante o download em lote.');
      setTimeout(() => setDownloadToast(null), 4000);
    } finally {
      setBatchDownloading(false);
      setBatchProgress(null);
    }
  };

  const handleCancelBatchDownload = () => {
    cancelBatchRef.current = true;
    setDownloadToast('Cancelando download em lote...');
  };

  // Amazon affiliate search link
  const amazonSearchUrl = `https://www.amazon.com.br/s?k=${encodeURIComponent(
    `manga ${manga.title}`
  )}&tag=mangaverse-20`;

  // Filtered and sorted chapters
  const filteredChapters = chapters
    .filter((c) => {
      if (!chapterSearch) return true;
      const q = chapterSearch.toLowerCase().trim();
      return (
        c.chapterNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.scanlationGroup || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const na = parseFloat(a.chapterNumber) || 0;
      const nb = parseFloat(b.chapterNumber) || 0;
      return sortAscending ? na - nb : nb - na;
    });

  // Pagination calculations
  const totalPages = Math.ceil(filteredChapters.length / ITEMS_PER_PAGE) || 1;
  const paginatedChapters = filteredChapters.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Resume chapter logic
  const resumeChapter =
    chapters.find((c) => c.chapterNumber === lastReadChapterNum) || chapters[chapters.length - 1];
  const firstChapter =
    chapters.find((c) => c.chapterNumber === '1') ||
    chapters[chapters.length - 1] || {
      id: 'first',
      chapterNumber: '1',
      title: 'Capítulo 1',
      language: 'pt-br',
      publishedAt: new Date().toISOString()
    };

  return (
    <div className="w-full pb-20">
      {/* Blurred Hero Backdrop */}
      <div className="relative w-full h-80 sm:h-96 overflow-hidden">
        <img
          src={manga.bannerUrl || manga.coverUrl}
          alt={manga.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center filter blur-2xl opacity-35 transform scale-110"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            if (!img.dataset.retried && manga.bannerUrl) {
              img.dataset.retried = 'true';
              img.src = `/api/proxy-image?url=${encodeURIComponent(manga.bannerUrl)}`;
            } else {
              img.style.display = 'none';
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0D13] via-[#0B0D13]/70 to-transparent" />

        {/* Back navigation button */}
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="absolute top-6 left-4 sm:left-8 z-20 p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 backdrop-blur-md transition-all flex items-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Catálogo</span>
        </button>
      </div>

      {/* Main Content Info */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 -mt-44 sm:-mt-56 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Cover image with zoom hover */}
          <div className="w-48 sm:w-56 md:w-64 shrink-0 mx-auto md:mx-0 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-zinc-700/60 bg-zinc-900 group relative">
            <img
              src={manga.coverUrl}
              alt={manga.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                if (!img.dataset.retried && manga.coverUrl && manga.coverUrl.startsWith('http')) {
                  img.dataset.retried = 'true';
                  img.src = `/api/proxy-image?url=${encodeURIComponent(manga.coverUrl)}`;
                }
              }}
            />

            {/* Trailer preview trigger button over cover if trailer available */}
            {manga.trailerYoutubeId && (
              <button
                onClick={() => setShowTrailerModal(true)}
                className="absolute inset-0 bg-black/40 hover:bg-black/60 backdrop-blur-[2px] transition-all flex flex-col items-center justify-center gap-2 text-white group-hover:opacity-100 opacity-90"
              >
                <div className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg transition-transform transform group-hover:scale-110">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-black/60 px-2 py-0.5 rounded">
                  Trailer Oficial
                </span>
              </button>
            )}
          </div>

          {/* Details Column */}
          <div className="flex-1 space-y-4 text-left">
            {/* Title & Favorite & Share */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                  {manga.title}
                </h1>
                {manga.altTitles && manga.altTitles.length > 0 && (
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                    {manga.altTitles.join(' · ')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleShare}
                  aria-label="Compartilhar"
                  className="p-2.5 rounded-xl bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors"
                  title="Compartilhar"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToggleFavorite}
                  aria-label="Favoritar"
                  className={`p-2.5 rounded-xl border transition-all ${
                    isFavorite
                      ? 'bg-pink-600 border-pink-500 text-white shadow-lg shadow-pink-600/30'
                      : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white border-zinc-700/60'
                  }`}
                  title="Favoritar"
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
                </button>
              </div>
            </div>

            {shareToast && (
              <div className="py-1.5 px-3 rounded-lg bg-indigo-900/60 border border-indigo-500/40 text-indigo-200 text-xs inline-block">
                Link copiado para a área de transferência!
              </div>
            )}

            {/* Clean unboxed metadata (zero-pill discipline) */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300 font-medium">
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {manga.rating.toFixed(1)} / 10
              </span>
              <span className="text-zinc-600" aria-hidden="true">·</span>
              <span className="capitalize">{manga.status === 'completed' ? 'Finalizado' : 'Em andamento'}</span>
              <span className="text-zinc-600" aria-hidden="true">·</span>
              <span>{manga.authors.join(', ') || 'Autor oficial'}</span>
              <span className="text-zinc-600" aria-hidden="true">·</span>
              <span className="text-indigo-400">
                {manga.country === 'kr' ? 'Manhwa' : 'Mangá'}
              </span>
            </div>

            {/* Multi-API Live Badges: AniList Score, MAL Rank, Serialization */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-300">
              {manga.serialization && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-850 border border-zinc-700/60">
                  <Globe className="w-3 h-3 text-indigo-400" />
                  <span className="text-zinc-400">Revista:</span>
                  <span className="font-semibold text-white">{manga.serialization}</span>
                </div>
              )}

              {manga.malScore && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-850 border border-zinc-700/60">
                  <Award className="w-3 h-3 text-sky-400" />
                  <span className="text-zinc-400">MAL Score:</span>
                  <span className="font-semibold text-sky-300">{manga.malScore.toFixed(2)}</span>
                </div>
              )}

              {manga.anilistScore && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-850 border border-zinc-700/60">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span className="text-zinc-400">AniList:</span>
                  <span className="font-semibold text-emerald-300">{(manga.anilistScore * 10).toFixed(0)}%</span>
                </div>
              )}
            </div>

            {/* Clickable genre tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {manga.genres.map((g) => (
                <button
                  key={g}
                  onClick={() => onGenreClick(g)}
                  className="px-2.5 py-1 rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Expandable Synopsis */}
            <div className="relative bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4">
              <p
                className={`text-xs sm:text-sm text-zinc-300 leading-relaxed ${
                  synopsisExpanded ? '' : 'line-clamp-3'
                }`}
              >
                {manga.description}
              </p>
              {manga.description.length > 180 && (
                <button
                  onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                >
                  <span>{synopsisExpanded ? 'Ler menos' : 'Ler sinopse completa'}</span>
                  {synopsisExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Personal Rating & Review Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300">Sua Avaliação:</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || userReview?.rating || 0) >= star;
                    return (
                      <button
                        key={star}
                        onClick={() => handleStarClick(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Avaliar com ${star} estrelas`}
                        className="p-0.5 text-zinc-600 hover:text-amber-400 transition-colors focus:outline-none"
                      >
                        <Star className={`w-4 h-4 transition-transform hover:scale-110 ${active ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    );
                  })}
                </div>
                {userReview?.rating ? (
                  <span className="text-xs font-bold text-amber-400 ml-1">
                    {userReview.rating}/5
                  </span>
                ) : (
                  <span className="text-[11px] text-zinc-500 ml-1 hidden sm:inline">Clique para avaliar</span>
                )}
              </div>

              <button
                onClick={handleOpenReviewModal}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700/60 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{userReview?.notes ? 'Editar Notas' : 'Minha Crítica / Notas'}</span>
              </button>
            </div>

            {/* Display personal notes if user has written any */}
            {userReview?.notes && (
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-left">
                <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-300 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Minhas Notas Pessoais ({new Date(userReview.updatedAt).toLocaleDateString('pt-BR')})</span>
                  </span>
                  <button onClick={handleOpenReviewModal} className="text-zinc-400 hover:text-white transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-zinc-300 italic whitespace-pre-wrap leading-relaxed">{userReview.notes}</p>
              </div>
            )}

            {/* Action buttons bar */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {lastReadChapterNum ? (
                <button
                  onClick={() => onReadChapter(resumeChapter, chapters)}
                  className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Continuar Cap. {lastReadChapterNum}</span>
                </button>
              ) : (
                <button
                  onClick={() => onReadChapter(firstChapter, chapters)}
                  className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Começar a Ler (Cap. 1)</span>
                </button>
              )}

              {/* Status Selector */}
              <div className="relative">
                <select
                  value={readingStatus}
                  onChange={(e) => handleStatusChange(e.target.value as ReadingStatus)}
                  className="py-2.5 px-3 rounded-xl bg-zinc-850 border border-zinc-700 text-xs sm:text-sm text-zinc-200 font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="reading">📖 Lendo</option>
                  <option value="plan_to_read">📌 Quero Ler</option>
                  <option value="completed">✅ Concluído</option>
                  <option value="dropped">🛑 Abandonado</option>
                </select>
              </div>

              {/* Amazon Affiliate Buy Physical Volume Button */}
              <a
                href={amazonSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Comprar volume físico na Amazon</span>
                <ExternalLink className="w-3.5 h-3.5 text-amber-400/70" />
              </a>
            </div>
          </div>
        </div>

        {/* Characters from AniList API */}
        {manga.characters && manga.characters.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Personagens Principais
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {manga.characters.map((char) => (
                <div
                  key={char.id}
                  className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-2.5"
                >
                  {char.imageUrl ? (
                    <img
                      src={char.imageUrl}
                      alt={char.name}
                      className="w-10 h-10 rounded-lg object-cover shrink-0 bg-zinc-800"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 text-xs font-bold shrink-0">
                      {char.name[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h5 className="text-xs font-semibold text-white truncate">{char.name}</h5>
                    <span className="text-[10px] text-zinc-400 block">{char.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Anime Adaptations & Relations from AniList API */}
        {manga.relations && manga.relations.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Tv className="w-4 h-4 text-sky-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Adaptações em Anime & Obras Relacionadas
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {manga.relations.map((rel) => (
                <div
                  key={rel.id}
                  className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-3"
                >
                  {rel.coverUrl && (
                    <img
                      src={rel.coverUrl}
                      alt={rel.title}
                      className="w-12 h-16 rounded-lg object-cover shrink-0 bg-zinc-800"
                    />
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">
                      {rel.relationType} ({rel.format})
                    </span>
                    <h5 className="text-xs font-semibold text-white truncate mt-0.5">{rel.title}</h5>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ad Placeholder Between Details and Chapters */}
        <div className="my-8">
          <AdPlaceholder type="rectangle" onOpenSupport={onOpenSupport} />
        </div>

        {/* Chapter List Section */}
        <section className="mt-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Capítulos Disponíveis
              </h3>
              <span className="text-xs text-zinc-400">
                {filteredChapters.length} capítulos encontrados · Leitura garantida em PT-BR
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {/* Batch mode toggle button */}
              <button
                disabled={batchDownloading || chapters.length === 0}
                onClick={() => {
                  setBatchMode((prev) => !prev);
                  if (!batchMode && selectedBatchIds.size === 0) {
                    // Preselect first 5 undownloaded
                    const undownloaded = filteredChapters.filter((c) => !downloadedMap[c.chapterNumber]).slice(0, 5);
                    setSelectedBatchIds(new Set(undownloaded.map((c) => c.id)));
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all ${
                  batchMode
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500'
                    : 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                }`}
                title="Ativar seleção múltipla de capítulos para download em lote"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{batchMode ? 'Sair da Seleção' : 'Baixar em Lote'}</span>
              </button>

              {/* Format selector (CBZ default with ZIP option) */}
              <div
                className="flex items-center gap-0.5 bg-zinc-800 p-0.5 rounded-lg border border-zinc-700 text-[11px]"
                title="Escolha o formato dos arquivos baixados para seu dispositivo"
              >
                <span className="px-1.5 text-zinc-400 font-medium text-[10px] hidden sm:inline">Formato:</span>
                <button
                  type="button"
                  onClick={() => handleFormatChange('cbz')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    downloadFormat === 'cbz'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Formato CBZ (Padrão para leitores de mangá/quadrinhos)"
                >
                  CBZ
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatChange('zip')}
                  className={`px-2 py-0.5 rounded font-bold transition-all ${
                    downloadFormat === 'zip'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  title="Formato ZIP (Compactado universal)"
                >
                  ZIP
                </button>
              </div>

              {/* Sort order toggle button */}
              <button
                onClick={() => {
                  setSortAscending(prev => !prev);
                  setCurrentPage(1);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border border-zinc-700 transition-colors font-medium shrink-0"
                title="Inverter ordem dos capítulos"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                <span>{sortAscending ? 'Do Início (1 → ...)' : 'Mais Recentes (... → 1)'}</span>
              </button>

              {/* Search chapter number */}
              <div className="relative flex-1 sm:w-44">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filtrar capítulo..."
                  value={chapterSearch}
                  onChange={(e) => {
                    setChapterSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Sticky Batch Download Action Toolbar */}
          {batchMode && (
            <div className="mb-4 p-3 sm:p-4 rounded-xl bg-zinc-900 border border-indigo-500/50 shadow-xl shadow-indigo-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                  {selectedBatchIds.size} selecionado(s)
                </span>
                <span className="text-zinc-600">·</span>
                <button
                  onClick={handleSelectAllVisible}
                  className="text-[11px] font-medium text-zinc-300 hover:text-white px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
                >
                  {selectedBatchIds.size === paginatedChapters.length ? 'Desmarcar Página' : 'Selecionar Página'}
                </button>
                <button
                  onClick={() => handleSelectNextN(5)}
                  className="text-[11px] font-medium text-zinc-300 hover:text-white px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
                >
                  + Próximos 5
                </button>
                <button
                  onClick={() => handleSelectNextN(10)}
                  className="text-[11px] font-medium text-zinc-300 hover:text-white px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
                >
                  + Próximos 10
                </button>
                {selectedBatchIds.size > 0 && (
                  <button
                    onClick={handleClearBatchSelection}
                    className="text-[11px] font-medium text-zinc-400 hover:text-red-400 px-1.5 py-1 transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setBatchMode(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 border border-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  disabled={selectedBatchIds.size === 0 || batchDownloading}
                  onClick={handleStartBatchDownload}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {batchDownloading
                      ? 'Baixando...'
                      : `Baixar ${selectedBatchIds.size} em .${downloadFormat.toUpperCase()}`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Active Batch Download Progress Banner */}
          {batchProgress && (
            <div className="mb-4 p-4 rounded-xl bg-indigo-950/90 border border-indigo-500 shadow-xl backdrop-blur-md animate-in fade-in">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                  <span className="text-xs font-bold text-white">
                    Baixando Lote ({batchProgress.currentChapterIdx}/{batchProgress.totalChapters} capítulos) · Formato .{downloadFormat.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={handleCancelBatchDownload}
                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              </div>
              <div className="w-full bg-zinc-800/80 rounded-full h-2 overflow-hidden mb-2">
                <div
                  className="bg-indigo-500 h-2 transition-all duration-300 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((batchProgress.currentChapterIdx - 1 + (batchProgress.currentPage / (batchProgress.totalPages || 1))) /
                          batchProgress.totalChapters) *
                          100
                      )
                    )}%`
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-indigo-200">
                <span>{batchProgress.message}</span>
                <span className="font-semibold">
                  {Math.min(
                    100,
                    Math.round(
                      ((batchProgress.currentChapterIdx - 1 + (batchProgress.currentPage / (batchProgress.totalPages || 1))) /
                        batchProgress.totalChapters) *
                        100
                    )
                  )}%
                </span>
              </div>
            </div>
          )}

          {/* Quick chapter range shortcuts */}
          {chapters.length > 20 && (
            <div className="flex items-center gap-1.5 mb-5 pb-2 overflow-x-auto text-[11px] border-b border-zinc-800/60">
              <span className="text-zinc-500 shrink-0 font-medium mr-1">Atalhos rápidos:</span>
              <button
                onClick={() => {
                  setSortAscending(true);
                  setChapterSearch('');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md border transition-colors shrink-0 ${
                  sortAscending && !chapterSearch
                    ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                    : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Primeiro Capítulo (Cap. 1)
              </button>
              <button
                onClick={() => {
                  setSortAscending(false);
                  setChapterSearch('');
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md border transition-colors shrink-0 ${
                  !sortAscending && !chapterSearch
                    ? 'bg-indigo-600 border-indigo-500 text-white font-semibold'
                    : 'bg-zinc-800/80 border-zinc-700/80 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                Último Lançamento
              </button>
            </div>
          )}

          {/* Chapters Grid / List */}
          {loadingChapters ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 bg-zinc-800/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : paginatedChapters.length > 0 ? (
            <div className="divide-y divide-zinc-800/80">
              {paginatedChapters.map((chap) => {
                const isRead = currentLibItem?.lastReadChapterNumber === chap.chapterNumber;
                const isSelected = selectedBatchIds.has(chap.id);
                return (
                  <div
                    key={chap.id}
                    onClick={() => {
                      if (batchMode) {
                        handleToggleSelectChapter(chap.id);
                      } else {
                        onReadChapter(chap, chapters);
                      }
                    }}
                    className={`py-3 px-3 rounded-xl transition-colors flex items-center justify-between gap-4 cursor-pointer group ${
                      isSelected && batchMode
                        ? 'bg-indigo-950/40 border border-indigo-500/40'
                        : 'hover:bg-zinc-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Batch checkbox */}
                      {batchMode ? (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSelectChapter(chap.id);
                          }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-indigo-400" />
                          ) : (
                            <Square className="w-5 h-5 text-zinc-500 hover:text-zinc-300" />
                          )}
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 group-hover:bg-indigo-600/20 text-zinc-300 group-hover:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 transition-colors">
                          {chap.chapterNumber}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-semibold text-zinc-100 group-hover:text-indigo-300 transition-colors truncate">
                            Capítulo {chap.chapterNumber}: {chap.title}
                          </h4>
                          {isRead && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span>{chap.scanlationGroup || 'Scan Oficial'}</span>
                          <span className="text-zinc-600" aria-hidden="true">·</span>
                          <span className="uppercase text-[10px] text-indigo-400 font-semibold">
                            {chap.language}
                          </span>
                          <span className="text-zinc-600" aria-hidden="true">·</span>
                          <span className="text-[10px] text-emerald-400 font-medium">
                            Disponível
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 sm:gap-3">
                      {/* Chapter Comments Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCommentsChapter(chap);
                        }}
                        title={`Comentários e discussões do Capítulo ${chap.chapterNumber}`}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Comentários</span>
                      </button>

                      {/* Offline Download Button or Status */}
                      {downloadingMap[chap.chapterNumber] ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-[10px] text-indigo-300">
                          <div className="w-3 h-3 rounded-full border border-indigo-400 border-t-transparent animate-spin" />
                          <span>Baixando {downloadingMap[chap.chapterNumber].current}/{downloadingMap[chap.chapterNumber].total}</span>
                        </div>
                      ) : downloadedMap[chap.chapterNumber] ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleDownloadChapter(e, chap)}
                            title={`Baixar arquivo .${downloadFormat.toUpperCase()} para o armazenamento do seu dispositivo`}
                            className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-emerald-400 hover:text-white px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-600/30 border border-emerald-500/30 transition-all"
                          >
                            <Check className="w-3 h-3 text-emerald-400" />
                            <Download className="w-3 h-3 text-emerald-300" />
                            <span className="hidden sm:inline">Baixar .{downloadFormat.toUpperCase()}</span>
                          </button>
                          <button
                            onClick={(e) => handleDeleteChapterOffline(e, chap)}
                            title="Remover download"
                            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleDownloadChapter(e, chap)}
                          title={`Fazer download do capítulo inteiro para seu armazenamento (.${downloadFormat.toUpperCase()})`}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 transition-colors flex items-center gap-1 text-xs"
                        >
                          <Download className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="hidden lg:inline text-[11px]">Baixar .{downloadFormat.toUpperCase()}</span>
                        </button>
                      )}

                      <span className="hidden sm:inline text-xs text-zinc-400">
                        {new Date(chap.publishedAt).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="hidden md:inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-zinc-800 group-hover:bg-indigo-600 text-zinc-300 group-hover:text-white font-medium transition-all">
                        <span>Ler</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                      <ChevronRight className="md:hidden w-4 h-4 text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400 text-xs">
              Nenhum capítulo encontrado com esse filtro.
            </div>
          )}

          {/* Pagination Navigation */}
          {totalPages > 1 && (
            <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>

              <span className="text-xs text-zinc-400 font-medium">
                Página {currentPage} de {totalPages}
              </span>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors flex items-center gap-1"
              >
                <span>Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </section>
      </div>

      {/* Review & Personal Notes Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700/80 p-5 sm:p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Minha Avaliação & Notas</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 truncate max-w-sm">
                  {manga.title}
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Star selector */}
            <div className="my-4">
              <label className="block text-xs font-semibold text-zinc-300 mb-2">
                Sua Nota (1 a 5 estrelas):
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewModalRating(star)}
                      className="p-1 text-zinc-600 hover:text-amber-400 focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          reviewModalRating >= star ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-sm font-bold text-amber-400 ml-2">
                  {reviewModalRating} / 5 estrelas
                </span>
              </div>
            </div>

            {/* Notes textarea */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Minhas Anotações & Resenha (Opcional):
              </label>
              <textarea
                value={reviewModalNotes}
                onChange={(e) => setReviewModalNotes(e.target.value)}
                placeholder="Escreva suas impressões, teorias, capítulos favoritos ou pontos marcantes desta obra..."
                rows={4}
                className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
              />
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModalReview}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar Avaliação</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Comments Drawer / Modal */}
      {activeCommentsChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white flex items-center gap-2 truncate">
                    Comentários · Cap. {activeCommentsChapter.chapterNumber}
                    {activeCommentsChapter.title && (
                      <span className="text-xs font-normal text-zinc-400 hidden sm:inline truncate max-w-[200px]">
                        ({activeCommentsChapter.title})
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate">
                    {manga.title} · Discussões e opiniões da comunidade
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveCommentsChapter(null)}
                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors shrink-0"
                title="Fechar comentários"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <ChapterComments
                mangaId={manga.id}
                chapterNumber={activeCommentsChapter.chapterNumber}
                mangaTitle={manga.title}
                adminUser={adminUser || null}
                onOpenAdminLogin={onOpenAdminLogin || (() => {})}
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating Download Success Toast */}
      {downloadToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm p-3.5 rounded-2xl bg-zinc-900 border border-emerald-500/50 text-white shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-300">Download Concluído</p>
            <p className="text-[11px] text-zinc-300 truncate mt-0.5">{downloadToast}</p>
          </div>
          <button
            onClick={() => setDownloadToast(null)}
            className="text-zinc-400 hover:text-white text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
