import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Layers,
  BookOpen,
  Maximize,
  Minimize,
  Settings,
  RotateCcw,
  Sparkles,
  HelpCircle,
  ExternalLink,
  Heart,
  Download,
  Check,
  Compass,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  Smartphone,
  Info
} from 'lucide-react';
import { MangaItem, MangaChapter, ReadingMode, ReadingDirection, AdminUser } from '../types/manga';
import { fetchChapterPages } from '../services/api';
import { saveReadingProgress, getStoredSettings, getReadChaptersCount } from '../services/storage';
import {
  isChapterDownloaded,
  saveChapterOffline,
  getOfflineChapterPages,
  downloadChapterToDevice,
  exportOfflineChapterToDevice,
  getStoredDownloadFormat
} from '../services/offlineStorage';
import { AdPlaceholder } from '../components/AdPlaceholder';
import { ChapterComments } from '../components/ChapterComments';

interface ReaderViewProps {
  manga: MangaItem;
  initialChapter: MangaChapter;
  allChapters: MangaChapter[];
  onBackToDetails: () => void;
  onOpenSupport: () => void;
  adminUser?: AdminUser | null;
  onOpenAdminLogin?: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  manga,
  initialChapter,
  allChapters,
  onBackToDetails,
  onOpenSupport,
  adminUser,
  onOpenAdminLogin
}) => {
  const globalSettings = getStoredSettings();
  const [currentChapter, setCurrentChapter] = useState<MangaChapter>(initialChapter);

  // Keep currentChapter in sync when initialChapter prop changes
  useEffect(() => {
    if (initialChapter) {
      setCurrentChapter(initialChapter);
    }
  }, [initialChapter]);

  const [pages, setPages] = useState<string[]>([]);
  const [directPages, setDirectPages] = useState<string[]>([]);
  const [activeQuality, setActiveQuality] = useState<'original' | 'saver'>('original');
  const [sourceBadge, setSourceBadge] = useState<string>('MangaDex API');
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [retriedDirect, setRetriedDirect] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [readingMode, setReadingMode] = useState<ReadingMode>(globalSettings.readingMode || 'webtoon');
  const [direction, setDirection] = useState<ReadingDirection>(globalSettings.readingDirection || 'rtl');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [maxWidth, setMaxWidth] = useState<'normal' | 'wide' | 'full'>('normal');
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  // Offline and Gesture State
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: '50%', y: '50%' });
  const [screenFilter, setScreenFilter] = useState<'normal' | 'warm' | 'dim'>('normal');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [lastTapTimestamp, setLastTapTimestamp] = useState<number>(0);
  const [showGestureGuide, setShowGestureGuide] = useState(false);
  const [tapFeedback, setTapFeedback] = useState<'left' | 'right' | null>(null);
  const [readerToast, setReaderToast] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load pages for the current chapter (checking IndexedDB offline storage first)
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setFailedImages({});
    setRetriedDirect({});
    setCurrentPage(1);
    setIsZoomed(false);

    // 1. Check if chapter is saved in IndexedDB offline storage
    getOfflineChapterPages(manga.id, currentChapter.chapterNumber).then((offlinePages) => {
      if (!mounted) return;

      if (offlinePages && offlinePages.length > 0) {
        setPages(offlinePages);
        setDirectPages(offlinePages);
        setSourceBadge('Disponível Offline');
        setIsOfflineSaved(true);
        saveReadingProgress(manga, currentChapter.id, currentChapter.chapterNumber, 1, offlinePages.length);
        setLoading(false);
        return;
      }

      setIsOfflineSaved(false);

      // 2. Not in offline storage: fetch over the network
      fetchChapterPages(
        currentChapter.id,
        manga.id,
        currentChapter.chapterNumber,
        manga.title,
        activeQuality
      ).then((res) => {
        if (mounted) {
          if (res.pages && res.pages.length > 0) {
            setPages(res.pages);
            setDirectPages(res.directPages || []);
            setSourceBadge(res.source === 'mangadex' ? 'MangaDex Oficial' : 'MangaDex API');

            // Preload first 4 images for instant smoothness
            const toPreload = (res.directPages && res.directPages.length > 0) ? res.directPages : res.pages;
            toPreload.slice(0, 4).forEach((url) => {
              const img = new Image();
              img.src = url;
            });

            // Save initial progress
            saveReadingProgress(manga, currentChapter.id, currentChapter.chapterNumber, 1, res.pages.length);
          } else {
            // Automatic seamless digital edition fallback
            const totalFallback = 16;
            const fallbackUrls = Array.from({ length: totalFallback }, (_, i) =>
              `/api/manga/page-canvas?mangaId=${encodeURIComponent(manga.id)}&chapterNumber=${encodeURIComponent(currentChapter.chapterNumber)}&page=${i + 1}&totalPages=${totalFallback}&title=${encodeURIComponent(manga.title)}`
            );
            setPages(fallbackUrls);
            setDirectPages(fallbackUrls);
            setSourceBadge('Edição Digital MangaVerse');
            saveReadingProgress(manga, currentChapter.id, currentChapter.chapterNumber, 1, totalFallback);
          }
          setLoading(false);
        }
      }).catch(() => {
        if (mounted) {
          const totalFallback = 16;
          const fallbackUrls = Array.from({ length: totalFallback }, (_, i) =>
            `/api/manga/page-canvas?mangaId=${encodeURIComponent(manga.id)}&chapterNumber=${encodeURIComponent(currentChapter.chapterNumber)}&page=${i + 1}&totalPages=${totalFallback}&title=${encodeURIComponent(manga.title)}`
          );
          setPages(fallbackUrls);
          setDirectPages(fallbackUrls);
          setSourceBadge('Edição Digital MangaVerse');
          saveReadingProgress(manga, currentChapter.id, currentChapter.chapterNumber, 1, totalFallback);
          setLoading(false);
        }
      });
    });

    return () => {
      mounted = false;
    };
  }, [currentChapter, manga, activeQuality, reloadTrigger]);

  const displayPages = pages.length > 0 ? pages : directPages;

  // Preload upcoming images as the user advances
  useEffect(() => {
    if (displayPages.length > 0) {
      const nextIdx = currentPage + 1;
      if (nextIdx < displayPages.length) {
        const img = new Image();
        img.src = displayPages[nextIdx];
      }
    }
  }, [currentPage, displayPages]);

  // Track scroll position in Webtoon mode to update current page and auto-hide controls
  useEffect(() => {
    if (readingMode !== 'webtoon') return;

    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Auto-hide controls when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY + 50 && currentScrollY > 150) {
        setControlsVisible(false);
      } else if (currentScrollY < lastScrollY - 30) {
        setControlsVisible(true);
      }
      lastScrollY = currentScrollY;

      // Calculate approximate current page based on scroll height
      if (pages.length > 0) {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalHeight > 0) {
          const progress = Math.min(1, Math.max(0, currentScrollY / totalHeight));
          const pageIndex = Math.min(pages.length, Math.max(1, Math.ceil(progress * pages.length)));
          setCurrentPage(pageIndex);
          saveReadingProgress(manga, currentChapter.id, currentChapter.chapterNumber, pageIndex, pages.length);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [readingMode, pages.length, manga, currentChapter]);

  // Keyboard navigation for traditional paged mode
  const goToNextPage = useCallback(() => {
    if (currentPage < pages.length) {
      const next = currentPage + 1;
      setCurrentPage(next);
      saveReadingProgress(manga, currentChapter.id, currentChapter.chapterNumber, next, pages.length);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // End of chapter -> go to next chapter
      handleNextChapter();
    }
  }, [currentPage, pages.length, manga, currentChapter]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      saveReadingProgress(manga, currentChapter.id, currentChapter.chapterNumber, prev, pages.length);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handlePrevChapter();
    }
  }, [currentPage, pages.length, manga, currentChapter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        direction === 'rtl' ? goToPrevPage() : goToNextPage();
      } else if (e.key === 'ArrowLeft') {
        direction === 'rtl' ? goToNextPage() : goToPrevPage();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, goToNextPage, goToPrevPage, isFullscreen]);

  // Fullscreen handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Ensure chapters are ordered numerically so chronological prev/next is 100% reliable
  const sortedChaptersAsc = React.useMemo(() => {
    return [...allChapters].sort((a, b) => {
      const na = parseFloat(a.chapterNumber) || 0;
      const nb = parseFloat(b.chapterNumber) || 0;
      return na - nb;
    });
  }, [allChapters]);

  const currentNumeric = parseFloat(currentChapter.chapterNumber);
  const currentSortedIdx = sortedChaptersAsc.findIndex(
    (c) =>
      c.id === currentChapter.id ||
      c.chapterNumber === currentChapter.chapterNumber ||
      (!isNaN(currentNumeric) && parseFloat(c.chapterNumber) === currentNumeric)
  );

  // Chronological navigation:
  // prevChapter: earlier chapter (e.g. 199 when reading 200)
  // nextChapter: later chapter (e.g. 201 when reading 200)
  const prevChapter = currentSortedIdx > 0 ? sortedChaptersAsc[currentSortedIdx - 1] : null;
  const nextChapter =
    currentSortedIdx >= 0 && currentSortedIdx < sortedChaptersAsc.length - 1
      ? sortedChaptersAsc[currentSortedIdx + 1]
      : null;

  const handleNextChapter = () => {
    if (nextChapter) {
      setCurrentChapter(nextChapter);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevChapter = () => {
    if (prevChapter) {
      setCurrentChapter(prevChapter);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const toggleControls = () => {
    setControlsVisible((prev) => !prev);
  };

  const handleReload = () => {
    setLoading(true);
    setReloadTrigger((prev) => prev + 1);
  };

  const toggleQuality = () => {
    setLoading(true);
    setActiveQuality((prev) => (prev === 'original' ? 'saver' : 'original'));
  };

  const handleGoToChapter1 = () => {
    const ch1 = allChapters.find((c) => c.chapterNumber === '1') || allChapters[allChapters.length - 1];
    if (ch1) {
      setCurrentChapter(ch1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleImageError = (index: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!retriedDirect[index]) {
      setRetriedDirect((prev) => ({ ...prev, [index]: true }));
      // If direct CDN failed, switch to proxy
      if (pages[index] && !img.src.includes('/api/proxy-image')) {
        img.src = pages[index];
        return;
      }
      // If proxy failed, switch to direct CDN URL
      if (directPages[index] && img.src.includes('/api/proxy-image')) {
        img.src = directPages[index];
        return;
      }
    }
    // If external CDN failed, fallback to high-fidelity canvas page
    if (!img.src.includes('/api/manga/page-canvas')) {
      img.src = `/api/manga/page-canvas?mangaId=${encodeURIComponent(manga.id)}&chapterNumber=${encodeURIComponent(currentChapter.chapterNumber)}&page=${index + 1}&totalPages=${displayPages.length || 16}&title=${encodeURIComponent(manga.title)}`;
      return;
    }
    setFailedImages((prev) => ({ ...prev, [index]: true }));
  };

  const handleGenerateCanvasPages = () => {
    const total = 16;
    const list = Array.from({ length: total }, (_, i) =>
      `/api/manga/page-canvas?mangaId=${encodeURIComponent(manga.id)}&chapterNumber=${encodeURIComponent(currentChapter.chapterNumber)}&page=${i + 1}&totalPages=${total}&title=${encodeURIComponent(manga.title)}`
    );
    setPages(list);
    setDirectPages(list);
    setSourceBadge('Edição Digital PT-BR');
  };

  const retryImage = (index: number) => {
    setFailedImages((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const handleDownloadInReader = async () => {
    if (isDownloading) return;
    const toSave = displayPages.length > 0 ? displayPages : pages;
    if (toSave.length === 0) return;

    const preferredFormat = getStoredDownloadFormat();

    // If already saved offline, export the file in preferred format to user storage
    if (isOfflineSaved) {
      try {
        const exported = await exportOfflineChapterToDevice(manga.id, currentChapter.chapterNumber, preferredFormat);
        if (exported) {
          setReaderToast(`Arquivo ${exported.fileName} salvo no seu armazenamento!`);
          setTimeout(() => setReaderToast(null), 4000);
        }
      } catch (err) {
        console.error('Erro ao exportar capítulo para o armazenamento:', err);
      }
      return;
    }

    setIsDownloading(true);
    setDownloadProgress({ current: 1, total: toSave.length });

    try {
      const result = await downloadChapterToDevice(
        manga,
        currentChapter,
        toSave,
        preferredFormat,
        (curr, tot) => setDownloadProgress({ current: curr, total: tot })
      );
      setIsOfflineSaved(true);
      setSourceBadge('Disponível Offline');
      setReaderToast(`Capítulo ${currentChapter.chapterNumber} baixado com sucesso para seu armazenamento (${result.fileName})!`);
      setTimeout(() => setReaderToast(null), 4000);
    } catch (err) {
      console.error('Erro ao baixar capítulo:', err);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const cycleScreenFilter = () => {
    setScreenFilter((prev) => (prev === 'normal' ? 'warm' : prev === 'warm' ? 'dim' : 'normal'));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartX;
    const deltaY = endY - (touchStartY || 0);

    // Horizontal swipe detected (threshold: 45px and mostly horizontal)
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        // Swiped left
        setTapFeedback('right');
        setTimeout(() => setTapFeedback(null), 250);
        direction === 'rtl' ? goToPrevPage() : goToNextPage();
      } else {
        // Swiped right
        setTapFeedback('left');
        setTimeout(() => setTapFeedback(null), 250);
        direction === 'rtl' ? goToNextPage() : goToPrevPage();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const handleImageTouchTap = (e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapTimestamp < 320) {
      // Double-tap detected on mobile!
      e.stopPropagation();
      const touch = e.changedTouches[0];
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const xPercent = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
      const yPercent = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
      setZoomOrigin({ x: `${xPercent}%`, y: `${yPercent}%` });
      setIsZoomed((prev) => !prev);
      setLastTapTimestamp(0);
    } else {
      setLastTapTimestamp(now);
    }
  };

  const handleImageDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x: `${xPercent}%`, y: `${yPercent}%` });
    setIsZoomed((prev) => !prev);
  };

  // Width container helper
  const widthClass =
    maxWidth === 'normal'
      ? 'max-w-3xl'
      : maxWidth === 'wide'
      ? 'max-w-4xl'
      : 'max-w-full px-0';

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col relative select-none"
    >
      {/* Top Floating Control Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 transition-all duration-300 ${
          controlsVisible ? 'reader-controls-visible' : 'reader-controls-hidden'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Back button and Manga title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBackToDetails}
              aria-label="Voltar aos detalhes"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-bold text-white truncate">
                  {manga.title}
                </h2>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold shrink-0">
                  {sourceBadge}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                Capítulo {currentChapter.chapterNumber} · {currentChapter.title}
              </p>
            </div>
          </div>

          {/* Quick Chapter Selector dropdown & source switch */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Chapter select */}
            <select
              value={currentChapter.id}
              onChange={(e) => {
                const found = allChapters.find((c) => c.id === e.target.value) || allChapters.find((c) => c.chapterNumber === e.target.value);
                if (found) setCurrentChapter(found);
              }}
              className="py-1 px-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 font-semibold focus:outline-none max-w-[110px] sm:max-w-[150px] truncate"
            >
              {[...sortedChaptersAsc].reverse().map((c) => (
                <option key={c.id} value={c.id}>
                  Cap. {c.chapterNumber} {c.title ? `- ${c.title}` : ''}
                </option>
              ))}
            </select>

            {/* Quality Switcher (Original / Data-Saver) */}
            <button
              onClick={toggleQuality}
              title={activeQuality === 'original' ? 'Modo Alta Qualidade. Clique para alternar para Data-Saver (Mais Rápido)' : 'Modo Data-Saver ativo. Clique para alternar para Alta Qualidade'}
              className={`p-1.5 sm:px-2 sm:py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                activeQuality === 'saver'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden md:inline font-mono text-[10px] uppercase">
                {activeQuality === 'original' ? 'HD' : 'Saver'}
              </span>
            </button>

            {/* Offline Chapter Download Button */}
            <button
              onClick={handleDownloadInReader}
              disabled={isDownloading}
              title={isOfflineSaved ? 'Capítulo salvo. Clique para baixar o arquivo .cbz completo para seu armazenamento' : 'Baixar capítulo inteiro para o armazenamento do seu aparelho (.cbz)'}
              className={`p-1.5 sm:px-2 sm:py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                isOfflineSaved
                  ? 'bg-emerald-500/15 hover:bg-emerald-600/30 border-emerald-500/40 text-emerald-300'
                  : isDownloading
                  ? 'bg-indigo-900/40 border-indigo-700/50 text-indigo-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              {isOfflineSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <Download className="w-3 h-3 text-emerald-300" />
                  <span className="hidden md:inline text-[10px]">Baixar .CBZ</span>
                </>
              ) : isDownloading ? (
                <>
                  <div className="w-3 h-3 rounded-full border border-indigo-400 border-t-transparent animate-spin" />
                  <span className="hidden md:inline text-[10px] font-mono">{downloadProgress?.current}/{downloadProgress?.total}</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden md:inline text-[10px]">Baixar</span>
                </>
              )}
            </button>

            {/* Reading Direction Switcher (Traditional mode only) */}
            {readingMode === 'traditional' && (
              <button
                onClick={() => setDirection(direction === 'rtl' ? 'ltr' : 'rtl')}
                title={direction === 'rtl' ? 'Direção Oriental: Direita para Esquerda (Mangá)' : 'Direção Ocidental: Esquerda para Direita'}
                className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors flex items-center gap-1 text-xs"
              >
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline text-[10px]">{direction === 'rtl' ? 'Dir → Esq' : 'Esq → Dir'}</span>
              </button>
            )}

            {/* Night Filter Cycle (Normal / Warm Sépia / Dim) */}
            <button
              onClick={cycleScreenFilter}
              title={`Filtro de Leitura: ${screenFilter === 'warm' ? 'Sépia Quente' : screenFilter === 'dim' ? 'Modo Escuro Suave' : 'Normal'}`}
              className={`p-1.5 sm:p-2 rounded-lg border transition-colors ${
                screenFilter !== 'normal'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
            >
              {screenFilter === 'warm' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : screenFilter === 'dim' ? (
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-zinc-400" />
              )}
            </button>

            {/* Reading Mode Switcher */}
            <button
              onClick={() => setReadingMode(readingMode === 'webtoon' ? 'traditional' : 'webtoon')}
              title={readingMode === 'webtoon' ? 'Mudar para Modo Tradicional' : 'Mudar para Modo Webtoon'}
              className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors flex items-center gap-1 text-xs"
            >
              {readingMode === 'webtoon' ? (
                <>
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Webtoon</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Páginas</span>
                </>
              )}
            </button>

            {/* Mobile Gestures & Tap Zones Guide */}
            <button
              onClick={() => setShowGestureGuide(true)}
              title="Guia de Gestos de Toque e Zonas no Celular"
              aria-label="Gestos e zonas de toque"
              className="p-1.5 sm:px-2 sm:py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors flex items-center gap-1 text-xs"
            >
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden lg:inline text-[10px]">Gestos</span>
            </button>

            {/* Reload Chapter button */}
            <button
              onClick={handleReload}
              title="Recarregar páginas da API MangaDex"
              aria-label="Recarregar capítulo"
              className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              aria-label="Tela cheia"
              className="p-1.5 sm:p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Reading Canvas Area */}
      <main
        onClick={toggleControls}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`flex-1 flex flex-col items-center justify-center pt-14 pb-20 ${widthClass} mx-auto w-full`}
      >
        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-zinc-300">
              Conectando aos servidores MangaDex At-Home...
            </p>
            <p className="text-xs text-zinc-500">
              Carregando páginas do capítulo {currentChapter.chapterNumber}
            </p>
          </div>
        ) : displayPages.length === 0 ? (
          /* Empty / error state */
          <div className="py-20 px-6 max-w-lg mx-auto text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Nenhuma página encontrada para o Capítulo {currentChapter.chapterNumber}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Tentamos carregar as páginas através dos servidores oficiais da API do MangaDex. Você pode carregar a edição digital com painéis em alta resolução ou navegar até outro capítulo.
            </p>
            <div className="pt-2">
              <button
                onClick={handleGenerateCanvasPages}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
              >
                <BookOpen className="w-4 h-4" />
                <span>Carregar Edição Digital (Cap. {currentChapter.chapterNumber})</span>
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {prevChapter && (
                <button
                  onClick={handlePrevChapter}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Capítulo Anterior (Cap. {prevChapter.chapterNumber})</span>
                </button>
              )}

              {nextChapter && (
                <button
                  onClick={handleNextChapter}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <span>Próximo Capítulo (Cap. {nextChapter.chapterNumber})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={handleReload}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium inline-flex items-center gap-2 border border-zinc-700 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reconectar MangaDex</span>
              </button>

              <button
                onClick={handleGoToChapter1}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition-all"
              >
                Capítulo 1
              </button>

              <button
                onClick={onBackToDetails}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-800 transition-all"
              >
                Voltar aos Detalhes
              </button>
            </div>
          </div>
        ) : readingMode === 'webtoon' ? (
          /* Webtoon Continuous Vertical Scroll */
          <div className="w-full flex flex-col items-center">
            {displayPages.map((pageUrl, idx) => (
              <div key={idx} className="relative w-full text-center">
                {failedImages[idx] ? (
                  <div className="py-16 px-4 my-2 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                    <p className="text-xs text-zinc-400 mb-2">
                      Falha ao carregar a página {idx + 1}.
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        retryImage(idx);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Recarregar Página</span>
                    </button>
                  </div>
                ) : (
                  <img
                    src={pageUrl}
                    alt={`Página ${idx + 1}`}
                    loading={idx < 3 ? 'eager' : 'lazy'}
                    referrerPolicy="no-referrer"
                    onError={(e) => handleImageError(idx, e)}
                    onTouchEnd={handleImageTouchTap}
                    onDoubleClick={handleImageDoubleClick}
                    style={{
                      transform: isZoomed ? 'scale(2.2)' : 'none',
                      transformOrigin: `${zoomOrigin.x} ${zoomOrigin.y}`,
                      transition: 'transform 200ms ease-out'
                    }}
                    className={`w-full h-auto object-contain mx-auto block shadow-lg cursor-zoom-in ${
                      isZoomed ? 'z-30 relative' : ''
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Traditional Page-by-Page Reading */
          <div className="w-full min-h-[75vh] flex flex-col items-center justify-center relative">
            {/* Click & Tap zones on left (28%), center (44%), right (28%) */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                setTapFeedback('left');
                setTimeout(() => setTapFeedback(null), 250);
                direction === 'rtl' ? goToNextPage() : goToPrevPage();
              }}
              className="absolute left-0 top-0 bottom-0 w-[28%] z-10 cursor-w-resize group"
              title={direction === 'rtl' ? 'Próxima Página' : 'Página Anterior'}
            >
              <div
                className={`absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-zinc-950/70 border border-zinc-800 text-white/70 transition-opacity ${
                  tapFeedback === 'left' ? 'opacity-100 ring-2 ring-indigo-500' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                toggleControls();
              }}
              className="absolute left-[28%] right-[28%] top-0 bottom-0 z-10 cursor-pointer"
              title="Alternar Menu de Controles"
            />

            <div
              onClick={(e) => {
                e.stopPropagation();
                setTapFeedback('right');
                setTimeout(() => setTapFeedback(null), 250);
                direction === 'rtl' ? goToPrevPage() : goToNextPage();
              }}
              className="absolute right-0 top-0 bottom-0 w-[28%] z-10 cursor-e-resize group"
              title={direction === 'rtl' ? 'Página Anterior' : 'Próxima Página'}
            >
              <div
                className={`absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-2.5 rounded-full bg-zinc-950/70 border border-zinc-800 text-white/70 transition-opacity ${
                  tapFeedback === 'right' ? 'opacity-100 ring-2 ring-indigo-500' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>

            <div className="relative max-h-[88vh] flex items-center justify-center">
              {failedImages[currentPage - 1] ? (
                <div className="py-24 px-8 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                  <p className="text-sm text-zinc-300 mb-3">
                    Erro ao carregar página {currentPage}.
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      retryImage(currentPage - 1);
                    }}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Tentar Novamente</span>
                  </button>
                </div>
              ) : (
                <img
                  src={displayPages[currentPage - 1]}
                  alt={`Página ${currentPage}`}
                  referrerPolicy="no-referrer"
                  onTouchEnd={handleImageTouchTap}
                  onDoubleClick={handleImageDoubleClick}
                  style={{
                    transform: isZoomed ? 'scale(2.2)' : 'none',
                    transformOrigin: `${zoomOrigin.x} ${zoomOrigin.y}`,
                    transition: 'transform 200ms ease-out'
                  }}
                  className={`max-h-[85vh] max-w-full object-contain mx-auto shadow-2xl rounded cursor-zoom-in ${
                    isZoomed ? 'z-30 relative' : ''
                  }`}
                  onError={(e) => handleImageError(currentPage - 1, e)}
                />
              )}
            </div>

            {/* In-screen page navigation buttons */}
            <div className="mt-4 flex items-center gap-4 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  direction === 'rtl' ? goToNextPage() : goToPrevPage();
                }}
                disabled={currentPage <= 1 && !prevChapter}
                className="py-1.5 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{direction === 'rtl' ? 'Próximo' : 'Anterior'}</span>
              </button>

              <span className="text-xs text-zinc-400 font-mono">
                {currentPage} / {pages.length}
              </span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  direction === 'rtl' ? goToPrevPage() : goToNextPage();
                }}
                disabled={currentPage >= pages.length && !nextChapter}
                className="py-1.5 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 transition-colors flex items-center gap-1"
              >
                <span>{direction === 'rtl' ? 'Anterior' : 'Próximo'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* End of chapter notice & Next Chapter trigger */}
        {!loading && (
          <div className="w-full my-8 px-4 text-center space-y-4">
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 text-center max-w-lg mx-auto">
              <span className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">
                Fim do Capítulo {currentChapter.chapterNumber}
              </span>
              <h4 className="text-base font-bold text-white mb-4">
                {nextChapter ? `Próximo: Capítulo ${nextChapter.chapterNumber}` : 'Você leu todos os capítulos disponíveis!'}
              </h4>

              <div className="flex flex-wrap items-center justify-center gap-3">
                {prevChapter && (
                  <button
                    onClick={handlePrevChapter}
                    className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-300 transition-all flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Capítulo {prevChapter.chapterNumber}</span>
                  </button>
                )}

                {nextChapter ? (
                  <button
                    onClick={handleNextChapter}
                    className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
                  >
                    <span>Ler Capítulo {nextChapter.chapterNumber}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onBackToDetails}
                    className="py-2.5 px-5 rounded-xl bg-zinc-800 text-white text-xs font-semibold"
                  >
                    Voltar aos detalhes
                  </button>
                )}
              </div>
            </div>

            {/* Reader Ad Placeholder */}
            <AdPlaceholder type="reader-banner" onOpenSupport={onOpenSupport} />

            {/* Chapter Comments Section at the end of the chapter */}
            <ChapterComments
              mangaId={manga.id}
              chapterNumber={currentChapter.chapterNumber}
              mangaTitle={manga.title}
              adminUser={adminUser || null}
              onOpenAdminLogin={onOpenAdminLogin || (() => {})}
            />
          </div>
        )}
      </main>

      {/* Bottom Floating Progress & Navigation Bar */}
      <footer
        className={`fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 transition-all duration-300 ${
          controlsVisible ? 'reader-bottom-visible' : 'reader-bottom-hidden'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Previous Chapter */}
          <button
            onClick={handlePrevChapter}
            disabled={!prevChapter}
            className="py-1.5 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-850 transition-colors flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Capítulo Anterior</span>
          </button>

          {/* Progress Indicator */}
          <div className="flex items-center gap-3 flex-1 max-w-xs justify-center">
            <span className="text-xs font-mono text-indigo-400 font-bold">
              {currentPage} / {pages.length || 1}
            </span>
            <div className="w-24 sm:w-36 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-200"
                style={{
                  width: `${pages.length ? (currentPage / pages.length) * 100 : 0}%`
                }}
              />
            </div>
          </div>

          {/* Next Chapter action */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleNextChapter}
              disabled={!nextChapter}
              className="py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1 shadow-sm"
            >
              <span className="hidden sm:inline">Próximo Capítulo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>

      {/* Floating Zoom Indicator Pill */}
      {isZoomed && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-indigo-950/95 border border-indigo-500/60 text-white text-xs font-semibold backdrop-blur-md shadow-2xl flex items-center gap-2.5 animate-in fade-in">
          <ZoomIn className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Zoom 2.2x ativo · Toque duplo para redefinir</span>
          <button
            onClick={() => setIsZoomed(false)}
            className="px-2.5 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold transition-colors ml-1"
          >
            Sair
          </button>
        </div>
      )}

      {/* Mobile Gesture Guide Modal */}
      {showGestureGuide && (
        <div
          onClick={() => setShowGestureGuide(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-5 shadow-2xl text-left space-y-4"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Gestos de Toque no Leitor</span>
              </div>
              <button
                onClick={() => setShowGestureGuide(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Visual 3-Zone Touch diagram */}
            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-center">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                Zonas de Toque na Tela (Modo Páginas)
              </span>
              <div className="grid grid-cols-3 gap-1.5 h-20 text-[11px] font-semibold">
                <div className="rounded-lg bg-zinc-900/90 border border-indigo-500/30 flex flex-col items-center justify-center text-indigo-300 p-1">
                  <span>◄</span>
                  <span>{direction === 'rtl' ? 'Próximo' : 'Voltar'}</span>
                  <span className="text-[9px] text-zinc-500">28% tela</span>
                </div>
                <div className="rounded-lg bg-zinc-900/90 border border-zinc-700/50 flex flex-col items-center justify-center text-zinc-300 p-1">
                  <span>☰</span>
                  <span>Menu</span>
                  <span className="text-[9px] text-zinc-500">44% tela</span>
                </div>
                <div className="rounded-lg bg-zinc-900/90 border border-indigo-500/30 flex flex-col items-center justify-center text-indigo-300 p-1">
                  <span>►</span>
                  <span>{direction === 'rtl' ? 'Voltar' : 'Próximo'}</span>
                  <span className="text-[9px] text-zinc-500">28% tela</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-zinc-300">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                  2x
                </div>
                <p>
                  <strong className="text-white">Toque duplo na página:</strong> Amplia a imagem (Zoom 2.2x) exatamente onde você tocou para ler balões pequenos.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                  ⇄
                </div>
                <p>
                  <strong className="text-white">Deslizar o dedo (Swipe):</strong> Mova o dedo para a esquerda ou direita para virar as páginas naturalmente.
                </p>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                  📜
                </div>
                <p>
                  <strong className="text-white">Modo Webtoon:</strong> Rolagem vertical contínua 100% fluida com duplo toque para zoom nas cenas.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGestureGuide(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
            >
              Entendi, boa leitura!
            </button>
          </div>
        </div>
      )}
      {/* Floating Download Success Toast in Reader */}
      {readerToast && (
        <div className="fixed top-18 right-4 z-50 max-w-sm p-3 rounded-2xl bg-zinc-900 border border-emerald-500/50 text-white shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-300">Download Concluído</p>
            <p className="text-[11px] text-zinc-300 truncate">{readerToast}</p>
          </div>
          <button
            onClick={() => setReaderToast(null)}
            className="text-zinc-400 hover:text-white text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
