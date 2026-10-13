import React, { useState, useEffect } from 'react';
import { Bell, BookOpen, Clock, ChevronRight, Sparkles, Check, Radio } from 'lucide-react';
import { MangaItem } from '../types/manga';
import { getStoredLibrary } from '../services/storage';
import { SAMPLE_MANGAS } from '../services/sampleData';
import { fetchPtBrUpdates, ChapterUpdateItem } from '../services/api';

interface UpdatesViewProps {
  onSelectManga: (manga: MangaItem) => void;
  onReadChapter: (manga: MangaItem, chapterNumber?: string) => void;
  onOpenExplore: () => void;
}

export const UpdatesView: React.FC<UpdatesViewProps> = ({
  onSelectManga,
  onReadChapter,
  onOpenExplore
}) => {
  const [filterMode, setFilterMode] = useState<'library' | 'global'>('global');
  const library = getStoredLibrary();

  // Curated baseline timeline with 100% Brazilian Portuguese titles & scans
  const baseUpdates: ChapterUpdateItem[] = [
    {
      chapterId: 'one-piece-cap-1120',
      mangaId: 'one-piece',
      mangaTitle: 'One Piece',
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx30013-BeslEMqiPhlk.jpg',
      chapterNumber: '1120',
      chapterTitle: 'O Legado do Século Perdido',
      scanGroup: 'Mugiwara Scans',
      language: 'pt-br',
      timeAgo: 'Há 2 horas',
      isNew: true
    },
    {
      chapterId: 'solo-leveling-cap-179',
      mangaId: 'solo-leveling',
      mangaTitle: 'Solo Leveling',
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105398-b673Vt5ZSuz3.jpg',
      chapterNumber: '179',
      chapterTitle: 'Epílogo Final - O Fim e o Recomeço',
      scanGroup: 'Neox Scanlator',
      language: 'pt-br',
      timeAgo: 'Há 5 horas',
      isNew: true
    },
    {
      chapterId: 'chainsaw-man-cap-180',
      mangaId: 'chainsaw-man',
      mangaTitle: 'Chainsaw Man (O Homem Motosserra)',
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx105778-euxXZEIfDY2u.png',
      chapterNumber: '180',
      chapterTitle: 'O Retorno da Guerra',
      scanGroup: 'Scan Central BR',
      language: 'pt-br',
      timeAgo: 'Ontem',
      isNew: false
    },
    {
      chapterId: 'berserk-cap-376',
      mangaId: 'berserk',
      mangaTitle: 'Berserk',
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx30002-Cul4OeN7bYtn.jpg',
      chapterNumber: '376',
      chapterTitle: 'O Despertar da Espada',
      scanGroup: 'Scan Oficial BR',
      language: 'pt-br',
      timeAgo: 'Ontem',
      isNew: true
    },
    {
      chapterId: 'omniscient-reader-cap-230',
      mangaId: 'omniscient-reader',
      mangaTitle: 'Ponto de Vista do Leitor Onisciente (ORV)',
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx119257-Pi21aq3ey9GG.jpg',
      chapterNumber: '230',
      chapterTitle: 'Cenário da Constelação',
      scanGroup: 'Reaper Scans BR',
      language: 'pt-br',
      timeAgo: 'Há 2 dias',
      isNew: false
    },
    {
      chapterId: 'jujutsu-kaisen-cap-271',
      mangaId: 'jujutsu-kaisen',
      mangaTitle: 'Jujutsu Kaisen: Batalha de Feiticeiros',
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx101517-H3TdM3g5ZUe9.jpg',
      chapterNumber: '271',
      chapterTitle: 'A Partir de Agora',
      scanGroup: 'Jujutsu Brasil',
      language: 'pt-br',
      timeAgo: 'Há 3 dias',
      isNew: false
    },
    {
      chapterId: 'dandadan-cap-165',
      mangaId: 'dandadan',
      mangaTitle: 'Dandadan',
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/medium/bx132029-prGF4gePdSKv.jpg',
      chapterNumber: '165',
      chapterTitle: 'Batalha Dimensional',
      scanGroup: 'Bakuen Scans',
      language: 'pt-br',
      timeAgo: 'Há 3 dias',
      isNew: false
    },
    {
      chapterId: 'tower-of-god-cap-630',
      mangaId: 'tower-of-god',
      mangaTitle: 'Tower of God (A Torre de Deus)',
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/large/bx85143-23oup3ETbFJk.jpg',
      chapterNumber: '630',
      chapterTitle: 'Batalha pela Linha de Frente',
      scanGroup: 'Tower Scans BR',
      language: 'pt-br',
      timeAgo: 'Há 4 dias',
      isNew: false
    }
  ];

  const [liveUpdates, setLiveUpdates] = useState<ChapterUpdateItem[]>(baseUpdates);

  useEffect(() => {
    let isMounted = true;
    fetchPtBrUpdates().then((res) => {
      if (isMounted && res && res.length > 0) {
        // Merge live chapters from Brazilian scanlations with the curated series
        const merged = [...res, ...baseUpdates];
        // Deduplicate by mangaId + chapterNumber
        const seen = new Set<string>();
        const unique = merged.filter((item) => {
          const key = `${item.mangaId}-${item.chapterNumber}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setLiveUpdates(unique);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const libraryMangaIds = new Set(library.map(l => l.mangaId));
  const displayedUpdates = filterMode === 'library'
    ? liveUpdates.filter(u => libraryMangaIds.has(u.mangaId) || library.some(l => l.manga.title.toLowerCase().includes(u.mangaTitle.toLowerCase())))
    : liveUpdates;

  const handleRead = (updateItem: ChapterUpdateItem) => {
    const existing = SAMPLE_MANGAS.find(m => m.id === updateItem.mangaId || m.title === updateItem.mangaTitle);
    const manga: MangaItem = existing || {
      id: updateItem.mangaId,
      slug: updateItem.mangaId,
      title: updateItem.mangaTitle,
      coverUrl: updateItem.coverUrl,
      description: 'Lançamento recente traduzido em português.',
      genres: ['Ação', 'Aventura'],
      status: 'ongoing',
      authors: [],
      artists: [],
      rating: 9.6,
      views: 350000,
      totalChapters: parseInt(updateItem.chapterNumber, 10) || 50
    };
    onReadChapter(manga, updateItem.chapterNumber);
  };

  const handleSelect = (updateItem: ChapterUpdateItem) => {
    const existing = SAMPLE_MANGAS.find(m => m.id === updateItem.mangaId || m.title === updateItem.mangaTitle);
    const manga: MangaItem = existing || {
      id: updateItem.mangaId,
      slug: updateItem.mangaId,
      title: updateItem.mangaTitle,
      coverUrl: updateItem.coverUrl,
      description: 'Lançamento recente.',
      genres: ['Ação', 'Aventura'],
      status: 'ongoing',
      authors: [],
      artists: [],
      rating: 9.6,
      views: 350000,
      totalChapters: parseInt(updateItem.chapterNumber, 10) || 50
    };
    onSelectManga(manga);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2.5 sm:px-6 py-6 sm:py-8 pb-24">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-400" />
            <span>Atualizações de Capítulos</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Timeline em tempo real de novos capítulos lançados em PT-BR
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setFilterMode('global')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'global'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Todos os Lançamentos
          </button>
          <button
            onClick={() => setFilterMode('library')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'library'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Meus Seguidos ({library.length})
          </button>
        </div>
      </div>

      {/* Updates list */}
      {displayedUpdates.length > 0 ? (
        <div className="space-y-3">
          {displayedUpdates.map((item, idx) => (
            <div
              key={idx}
              className="group p-3 sm:p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-4 shadow-sm"
            >
              {/* Cover & Title */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  onClick={() => handleSelect(item)}
                  className="w-14 sm:w-16 aspect-[3/4] rounded-xl overflow-hidden shrink-0 bg-zinc-950 border border-zinc-800 cursor-pointer"
                >
                  <img
                    src={item.coverUrl}
                    alt={item.mangaTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.dataset.retried && item.coverUrl.startsWith('http')) {
                        img.dataset.retried = 'true';
                        img.src = `/api/proxy-image?url=${encodeURIComponent(item.coverUrl)}`;
                      }
                    }}
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      onClick={() => handleSelect(item)}
                      className="text-sm font-bold text-white hover:text-indigo-300 transition-colors truncate cursor-pointer"
                    >
                      {item.mangaTitle}
                    </h3>
                    {item.isNew && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Novo
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-indigo-300 font-semibold mt-0.5">
                    Capítulo {item.chapterNumber}: {item.chapterTitle}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1">
                    <span>{item.scanGroup}</span>
                    <span className="text-zinc-600" aria-hidden="true">·</span>
                    <span className="uppercase text-zinc-400 font-medium">{item.language}</span>
                    <span className="text-zinc-600" aria-hidden="true">·</span>
                    <span className="text-zinc-500">{item.timeAgo}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleRead(item)}
                className="shrink-0 py-2 px-3.5 sm:px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ler Capítulo</span>
                <span className="sm:hidden">Ler</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 px-4 rounded-2xl bg-zinc-900/40 border border-zinc-800">
          <Bell className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h4 className="text-base font-semibold text-zinc-200">
            Nenhuma atualização encontrada para seus seguidos
          </h4>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
            Adicione mangás à sua biblioteca para receber notificações e novidades automáticas.
          </p>
          <button
            onClick={() => setFilterMode('global')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Ver todos os lançamentos globais
          </button>
        </div>
      )}
    </div>
  );
};
