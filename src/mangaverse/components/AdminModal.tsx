import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  FilePlus2,
  Trash2,
  Edit3,
  MessageSquare,
  MessageCircle,
  BarChart3,
  Plus,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Pin,
  RefreshCw,
  LogOut,
  Shield,
  Heart,
  Copy,
  Check,
  QrCode
} from 'lucide-react';
import { AdminUser, MangaItem, CustomChapterData, ChatMessage, ChapterComment } from '../types/manga';
import {
  fetchAdminStats,
  fetchAdminMangas,
  createAdminManga,
  updateAdminManga,
  deleteAdminManga,
  fetchAdminChapters,
  createAdminChapter,
  updateAdminChapterPages,
  deleteAdminChapter,
  fetchChatMessages,
  deleteChatMessage,
  clearChatHistory,
  banUserFromChat,
  fetchChapterComments,
  deleteChapterComment,
  togglePinChapterComment,
  logoutAdmin,
  fetchPixConfig,
  savePixConfig,
  PixConfigData
} from '../services/adminService';
import { SAMPLE_MANGAS } from '../services/sampleData';
import {
  OFFICIAL_PIX_KEY,
  generatePixPayload,
  getPixQrCodeUrl,
  formatPixDisplayKey
} from '../services/pixHelper';
import { getStoredSettings, saveStoredSettings } from '../services/storage';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminUser: AdminUser;
  onLogout: () => void;
  onMangaSelected?: (manga: MangaItem) => void;
}

type TabType = 'overview' | 'mangas' | 'chapters' | 'gaps' | 'chat' | 'comments' | 'pix';

interface GapsAnalysis {
  mangaId: string;
  mangaTitle: string;
  total: number;
  realCount: number;
  missingNumbers: string[];
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  adminUser,
  onLogout,
  onMangaSelected
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState({
    customMangasCount: 0,
    customChaptersCount: 0,
    chatMessagesCount: 0,
    commentsCount: 0,
    bannedUsersCount: 0
  });

  // Mangas state
  const [mangas, setMangas] = useState<MangaItem[]>([]);
  const [mangaSearch, setMangaSearch] = useState('');
  const [isEditingManga, setIsEditingManga] = useState(false);
  const [editingMangaId, setEditingMangaId] = useState<string | null>(null);
  const [mangaForm, setMangaForm] = useState({
    title: '',
    description: '',
    coverUrl: '',
    bannerUrl: '',
    genres: 'Ação, Aventura, Fantasia',
    status: 'ongoing' as MangaItem['status'],
    authors: 'Autor Oficial',
    rating: '9.5',
    totalChapters: '50'
  });

  // Chapters state
  const [selectedMangaId, setSelectedMangaId] = useState<string>('one-piece');
  const [chapters, setChapters] = useState<CustomChapterData[]>([]);
  const [isAddingChapter, setIsAddingChapter] = useState(false);
  const [chapterForm, setChapterForm] = useState({
    chapterNumber: '',
    title: '',
    scanlationGroup: 'MangaVerse Scan (ADM)',
    pagesText: ''
  });
  const [editingPagesChapterNum, setEditingPagesChapterNum] = useState<string | null>(null);
  const [editPagesText, setEditPagesText] = useState('');

  // Chat moderation state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [banInput, setBanInput] = useState('');

  // Comments moderation state
  const [commentsMangaId, setCommentsMangaId] = useState<string>('one-piece');
  const [commentsChapterNum, setCommentsChapterNum] = useState<string>('1');
  const [chapterComments, setChapterComments] = useState<ChapterComment[]>([]);

  // Pix & Donation moderation state
  const [pixConfig, setPixConfig] = useState<PixConfigData>({
    key: OFFICIAL_PIX_KEY,
    merchantName: 'MangaVerse Apoio',
    merchantCity: 'SAO PAULO',
    description: 'Apoio aos servidores e acervo MangaVerse',
    suggestedAmounts: [5, 10, 25, 50]
  });
  const [pixPreviewAmount, setPixPreviewAmount] = useState<number>(10);
  const [copiedPixKey, setCopiedPixKey] = useState(false);
  const [copiedPixPayload, setCopiedPixPayload] = useState(false);
  const [isSavingPix, setIsSavingPix] = useState(false);

  // Feedback notifications
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Missing chapters (lacunas) state
  const [gapsMangaId, setGapsMangaId] = useState<string>('one-piece');
  const [gapsLoading, setGapsLoading] = useState(false);
  const [gapsResult, setGapsResult] = useState<GapsAnalysis | null>(null);

  const analyzeGaps = async () => {
    const manga = allAvailableMangas.find((m) => m.id === gapsMangaId);
    const title = manga?.title || gapsMangaId;
    setGapsLoading(true);
    setGapsResult(null);
    try {
      const res = await fetch(
        `/api/manga/chapters?id=${encodeURIComponent(gapsMangaId)}&mangaTitle=${encodeURIComponent(title)}&lang=pt-br`
      );
      if (!res.ok) throw new Error('Falha ao buscar capítulos');
      const list: { id: string; chapterNumber: string }[] = await res.json();
      // Capítulos gerados automaticamente (sem conteúdo real) têm id iniciando com "gen-"
      const missing = list
        .filter((c) => c.id.startsWith('gen-'))
        .map((c) => c.chapterNumber)
        .sort((a, b) => (parseFloat(a) || 0) - (parseFloat(b) || 0));
      setGapsResult({
        mangaId: gapsMangaId,
        mangaTitle: title,
        total: list.length,
        realCount: list.length - missing.length,
        missingNumbers: missing
      });
    } catch {
      showToast('Não foi possível analisar as lacunas desta obra.');
    } finally {
      setGapsLoading(false);
    }
  };

  const loadAllData = async () => {
    const [s, mList, chList, msgs, comms, pConf] = await Promise.all([
      fetchAdminStats(),
      fetchAdminMangas(),
      fetchAdminChapters(selectedMangaId),
      fetchChatMessages(),
      fetchChapterComments(commentsMangaId, commentsChapterNum),
      fetchPixConfig()
    ]);
    setStats(s);
    setMangas([...mList, ...SAMPLE_MANGAS]);
    setChapters(chList);
    setChatMessages(msgs);
    setChapterComments(comms);
    if (pConf && pConf.key) {
      setPixConfig(pConf);
    }
  };

  const handleSavePixConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pixConfig.key.trim()) {
      showToast('A chave Pix não pode estar vazia.');
      return;
    }
    setIsSavingPix(true);
    try {
      const updated = await savePixConfig({
        key: pixConfig.key.trim(),
        merchantName: pixConfig.merchantName.trim(),
        merchantCity: pixConfig.merchantCity.trim(),
        description: pixConfig.description.trim()
      });
      setPixConfig(updated);
      const currentSettings = getStoredSettings();
      saveStoredSettings({ ...currentSettings, customPixKey: updated.key });
      showToast('Chave Pix e configurações de doação salvas com sucesso!');
    } catch {
      showToast('Erro ao salvar configurações do Pix.');
    } finally {
      setIsSavingPix(false);
    }
  };

  const handleResetToDefaultPix = () => {
    setPixConfig((prev) => ({
      ...prev,
      key: OFFICIAL_PIX_KEY,
      merchantName: 'MangaVerse Apoio',
      merchantCity: 'SAO PAULO'
    }));
    showToast('Chave restaurada para a chave oficial padrão.');
  };

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen, selectedMangaId, commentsMangaId, commentsChapterNum]);

  if (!isOpen) return null;

  // Manga actions
  const handleSaveManga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mangaForm.title.trim()) return;

    const payload = {
      title: mangaForm.title.trim(),
      description: mangaForm.description.trim(),
      coverUrl: mangaForm.coverUrl.trim() || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
      bannerUrl: mangaForm.bannerUrl.trim() || mangaForm.coverUrl.trim(),
      genres: mangaForm.genres.split(',').map((g) => g.trim()).filter(Boolean),
      status: mangaForm.status,
      authors: [mangaForm.authors.trim() || 'Autor Desconhecido'],
      artists: [],
      rating: parseFloat(mangaForm.rating) || 9.0,
      totalChapters: parseInt(mangaForm.totalChapters, 10) || 1
    };

    if (isEditingManga && editingMangaId) {
      await updateAdminManga(editingMangaId, payload);
      showToast('Mangá atualizado com sucesso!');
    } else {
      await createAdminManga(payload);
      showToast('Novo mangá adicionado ao catálogo!');
    }

    setIsEditingManga(false);
    setEditingMangaId(null);
    setMangaForm({
      title: '',
      description: '',
      coverUrl: '',
      bannerUrl: '',
      genres: 'Ação, Aventura, Fantasia',
      status: 'ongoing',
      authors: 'Autor Oficial',
      rating: '9.5',
      totalChapters: '50'
    });
    loadAllData();
  };

  const handleDeleteManga = async (id: string, title: string) => {
    if (confirm(`Tem certeza que deseja remover o mangá "${title}"?`)) {
      await deleteAdminManga(id);
      showToast('Mangá removido do site.');
      loadAllData();
    }
  };

  // Chapter actions
  const handleSaveChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterForm.chapterNumber.trim()) return;

    const pages = chapterForm.pagesText
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.startsWith('http') || p.startsWith('/'));

    await createAdminChapter({
      mangaId: selectedMangaId,
      chapterNumber: chapterForm.chapterNumber.trim(),
      title: chapterForm.title.trim() || `Capítulo ${chapterForm.chapterNumber}`,
      pages: pages.length > 0 ? pages : undefined,
      scanlationGroup: chapterForm.scanlationGroup
    });

    showToast(`Capítulo ${chapterForm.chapterNumber} adicionado com sucesso!`);
    setIsAddingChapter(false);
    setChapterForm({
      chapterNumber: '',
      title: '',
      scanlationGroup: 'MangaVerse Scan (ADM)',
      pagesText: ''
    });
    const updated = await fetchAdminChapters(selectedMangaId);
    setChapters(updated);
  };

  const handleSaveEditPages = async (chapterNumber: string) => {
    const pages = editPagesText
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.startsWith('http') || p.startsWith('/'));

    await updateAdminChapterPages(selectedMangaId, chapterNumber, pages);
    showToast(`Páginas do Capítulo ${chapterNumber} atualizadas!`);
    setEditingPagesChapterNum(null);
    const updated = await fetchAdminChapters(selectedMangaId);
    setChapters(updated);
  };

  const handleDeleteChapter = async (chapterNumber: string) => {
    if (confirm(`Remover Capítulo ${chapterNumber} deste mangá?`)) {
      await deleteAdminChapter(selectedMangaId, chapterNumber);
      showToast(`Capítulo ${chapterNumber} removido.`);
      const updated = await fetchAdminChapters(selectedMangaId);
      setChapters(updated);
    }
  };

  // Chat moderation actions
  const handleDeleteChatMessage = async (id: string) => {
    await deleteChatMessage(id);
    setChatMessages((prev) => prev.filter((m) => m.id !== id));
    showToast('Mensagem excluída.');
  };

  const handleClearChat = async () => {
    if (confirm('Tem certeza que deseja limpar todo o histórico do chat ao vivo?')) {
      await clearChatHistory();
      setChatMessages([]);
      showToast('Chat limpo com sucesso.');
      loadAllData();
    }
  };

  const handleBanUser = async () => {
    if (!banInput.trim()) return;
    const res = await banUserFromChat(banInput.trim());
    showToast(res.banned ? `Usuário "${banInput}" banido do chat.` : `Usuário "${banInput}" desbanido.`);
    setBanInput('');
  };

  // Comments moderation actions
  const handleDeleteComment = async (id: string) => {
    await deleteChapterComment(id);
    setChapterComments((prev) => prev.filter((c) => c.id !== id));
    showToast('Comentário removido.');
  };

  const handleTogglePinComment = async (id: string) => {
    const isPinned = await togglePinChapterComment(id);
    setChapterComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isPinned } : c))
    );
    showToast(isPinned ? 'Comentário fixado no topo!' : 'Comentário desafixado.');
  };

  const allAvailableMangas = Array.from(
    new Map(mangas.map((m) => [m.id, m])).values()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-6xl h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white">
                  Painel de Administração MangaVerse
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  {adminUser.email}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Gerenciamento total de mangás, capítulos, chat e comentários
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                logoutAdmin();
                onLogout();
                onClose();
              }}
              title="Encerrar Sessão ADM"
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 py-2.5 bg-zinc-900/40 border-b border-zinc-800/60 flex items-center gap-1 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveTab('mangas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'mangas'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Gerenciar Mangás</span>
          </button>

          <button
            onClick={() => setActiveTab('chapters')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'chapters'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Capítulos & Páginas</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Moderação de Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'comments'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Comentários</span>
          </button>

          <button
            onClick={() => setActiveTab('pix')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'pix'
                ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <Heart className="w-4 h-4 text-pink-400" />
            <span>Doações & Pix</span>
          </button>

          <button
            onClick={() => setActiveTab('gaps')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'gaps'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            <span>Lacunas</span>
          </button>
        </div>

        {/* Feedback Toast */}
        {toast && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2 animate-fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </div>
        )}

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 1. VISÃO GERAL */}
          {activeTab === 'overview' && (
            <div className="space-y-6 max-w-5xl">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
                  <span className="text-xs text-zinc-400">Mangás no Catálogo</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {allAvailableMangas.length}
                  </div>
                  <span className="text-[10px] text-indigo-400 font-medium">
                    {stats.customMangasCount} customizados
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
                  <span className="text-xs text-zinc-400">Capítulos Custom</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {stats.customChaptersCount}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium">
                    Uploads do ADM
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
                  <span className="text-xs text-zinc-400">Mensagens no Chat</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {stats.chatMessagesCount}
                  </div>
                  <span className="text-[10px] text-purple-400 font-medium">
                    Ao vivo
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
                  <span className="text-xs text-zinc-400">Comentários</span>
                  <div className="text-2xl font-black text-white mt-1">
                    {stats.commentsCount}
                  </div>
                  <span className="text-[10px] text-amber-400 font-medium">
                    Nos capítulos
                  </span>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="p-5 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Ações Rápidas de Administração</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      setActiveTab('mangas');
                      setIsEditingManga(false);
                    }}
                    className="p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-left transition-all"
                  >
                    <div className="font-bold text-xs text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-400" />
                      <span>Cadastrar Novo Mangá</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Adicione obras personalizadas com título, sinopse e capa.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('chapters');
                      setIsAddingChapter(true);
                    }}
                    className="p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-left transition-all"
                  >
                    <div className="font-bold text-xs text-white flex items-center gap-2">
                      <FilePlus2 className="w-4 h-4 text-emerald-400" />
                      <span>Adicionar Novo Capítulo</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Adicione capítulos e configure as páginas e imagens.
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveTab('chat')}
                    className="p-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-left transition-all"
                  >
                    <div className="font-bold text-xs text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-400" />
                      <span>Moderar Chat Global</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Apague mensagens, silencie e limpe o chat.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 2. GERENCIAR MANGÁS */}
          {activeTab === 'mangas' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={mangaSearch}
                    onChange={(e) => setMangaSearch(e.target.value)}
                    placeholder="Filtrar mangás por título..."
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-64"
                  />
                </div>
                <button
                  onClick={() => {
                    setIsEditingManga(true);
                    setEditingMangaId(null);
                    setMangaForm({
                      title: '',
                      description: '',
                      coverUrl: '',
                      bannerUrl: '',
                      genres: 'Ação, Aventura, Fantasia',
                      status: 'ongoing',
                      authors: 'Autor Oficial',
                      rating: '9.5',
                      totalChapters: '50'
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Mangá</span>
                </button>
              </div>

              {/* Form add / edit */}
              {isEditingManga && (
                <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-700 animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">
                      {editingMangaId ? 'Editar Mangá' : 'Cadastrar Novo Mangá'}
                    </h3>
                    <button
                      onClick={() => setIsEditingManga(false)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form onSubmit={handleSaveManga} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Título da Obra *
                      </label>
                      <input
                        type="text"
                        required
                        value={mangaForm.title}
                        onChange={(e) => setMangaForm({ ...mangaForm, title: e.target.value })}
                        placeholder="Ex: Solo Leveling: Ragnarok"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Gêneros (separados por vírgula)
                      </label>
                      <input
                        type="text"
                        value={mangaForm.genres}
                        onChange={(e) => setMangaForm({ ...mangaForm, genres: e.target.value })}
                        placeholder="Ação, Aventura, Magia"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        URL da Capa
                      </label>
                      <input
                        type="url"
                        value={mangaForm.coverUrl}
                        onChange={(e) => setMangaForm({ ...mangaForm, coverUrl: e.target.value })}
                        placeholder="https://exemplo.com/capa.jpg"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        URL do Banner (Opcional)
                      </label>
                      <input
                        type="url"
                        value={mangaForm.bannerUrl}
                        onChange={(e) => setMangaForm({ ...mangaForm, bannerUrl: e.target.value })}
                        placeholder="https://exemplo.com/banner.jpg"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Autor(es)
                      </label>
                      <input
                        type="text"
                        value={mangaForm.authors}
                        onChange={(e) => setMangaForm({ ...mangaForm, authors: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Nota (0 a 10)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          max="10"
                          min="0"
                          value={mangaForm.rating}
                          onChange={(e) => setMangaForm({ ...mangaForm, rating: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Status
                        </label>
                        <select
                          value={mangaForm.status}
                          onChange={(e) => setMangaForm({ ...mangaForm, status: e.target.value as any })}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                        >
                          <option value="ongoing">Em Lançamento</option>
                          <option value="completed">Completo</option>
                          <option value="hiatus">Hiato</option>
                        </select>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Sinopse / Descrição
                      </label>
                      <textarea
                        rows={3}
                        value={mangaForm.description}
                        onChange={(e) => setMangaForm({ ...mangaForm, description: e.target.value })}
                        placeholder="História da obra..."
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                      />
                    </div>

                    <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingManga(false)}
                        className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
                      >
                        Salvar Mangá
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Mangas list table */}
              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400">
                    <tr>
                      <th className="p-3">Obra</th>
                      <th className="p-3 hidden sm:table-cell">Gêneros</th>
                      <th className="p-3 hidden md:table-cell">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {allAvailableMangas
                      .filter((m) =>
                        mangaSearch
                          ? m.title.toLowerCase().includes(mangaSearch.toLowerCase())
                          : true
                      )
                      .slice(0, 30)
                      .map((m) => (
                        <tr key={m.id} className="hover:bg-zinc-850/50 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={m.coverUrl}
                                alt={m.title}
                                className="w-9 h-12 rounded object-cover border border-zinc-800 bg-zinc-900"
                              />
                              <div>
                                <span className="font-bold text-white block">{m.title}</span>
                                <span className="text-[10px] text-zinc-400">ID: {m.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 hidden sm:table-cell text-zinc-400">
                            {m.genres?.slice(0, 2).join(', ') || 'Geral'}
                          </td>
                          <td className="p-3 hidden md:table-cell">
                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[10px]">
                              {m.status === 'completed' ? 'Completo' : 'Em lançamento'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedMangaId(m.id);
                                  setActiveTab('chapters');
                                }}
                                title="Ver capítulos"
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                              >
                                <FilePlus2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setIsEditingManga(true);
                                  setEditingMangaId(m.id);
                                  setMangaForm({
                                    title: m.title,
                                    description: m.description,
                                    coverUrl: m.coverUrl,
                                    bannerUrl: m.bannerUrl || '',
                                    genres: m.genres.join(', '),
                                    status: m.status,
                                    authors: m.authors.join(', '),
                                    rating: String(m.rating || 9.5),
                                    totalChapters: String(m.totalChapters || 50)
                                  });
                                }}
                                title="Editar"
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteManga(m.id, m.title)}
                                title="Remover"
                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. GERENCIAR CAPÍTULOS & PÁGINAS */}
          {activeTab === 'chapters' && (
            <div className="space-y-6">
              {/* Select manga header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-zinc-300">Mangá selecionado:</span>
                  <select
                    value={selectedMangaId}
                    onChange={(e) => setSelectedMangaId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white font-medium"
                  >
                    {allAvailableMangas.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setIsAddingChapter(!isAddingChapter)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Capítulo</span>
                </button>
              </div>

              {/* Add Chapter Form */}
              {isAddingChapter && (
                <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-700 animate-fade-in">
                  <h3 className="text-sm font-bold text-white mb-3">
                    Cadastrar Novo Capítulo em {allAvailableMangas.find((m) => m.id === selectedMangaId)?.title}
                  </h3>
                  <form onSubmit={handleSaveChapter} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Número do Capítulo * (Ex: 1, 105, 1121)
                        </label>
                        <input
                          type="text"
                          required
                          value={chapterForm.chapterNumber}
                          onChange={(e) => setChapterForm({ ...chapterForm, chapterNumber: e.target.value })}
                          placeholder="1121"
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Título do Capítulo
                        </label>
                        <input
                          type="text"
                          value={chapterForm.title}
                          onChange={(e) => setChapterForm({ ...chapterForm, title: e.target.value })}
                          placeholder="Ex: O Segredo dos Mares"
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-zinc-300 mb-1">
                          Scanlation / Tradutor
                        </label>
                        <input
                          type="text"
                          value={chapterForm.scanlationGroup}
                          onChange={(e) => setChapterForm({ ...chapterForm, scanlationGroup: e.target.value })}
                          placeholder="MangaVerse Scan"
                          className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-medium text-zinc-300">
                          URLs das Imagens / Páginas (uma por linha)
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const total = 16;
                            const generated = Array.from({ length: total }, (_, i) =>
                              `/api/manga/page-canvas?mangaId=${encodeURIComponent(selectedMangaId)}&chapterNumber=${encodeURIComponent(chapterForm.chapterNumber || '1')}&page=${i + 1}&totalPages=${total}&title=${encodeURIComponent(selectedMangaId)}`
                            ).join('\n');
                            setChapterForm({ ...chapterForm, pagesText: generated });
                          }}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold underline"
                        >
                          Gerar 16 Páginas Digitais Automáticas
                        </button>
                      </div>
                      <textarea
                        rows={5}
                        value={chapterForm.pagesText}
                        onChange={(e) => setChapterForm({ ...chapterForm, pagesText: e.target.value })}
                        placeholder="https://exemplo.com/pagina-1.jpg&#10;https://exemplo.com/pagina-2.jpg&#10;https://exemplo.com/pagina-3.jpg"
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white placeholder-zinc-600"
                      />
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Dica: Caso deixe em branco ou use o botão acima, o leitor gerará páginas digitais de alta definição automaticamente para este capítulo.
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingChapter(false)}
                        className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-400 text-xs font-semibold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        Salvar Capítulo
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Edit Pages Submodal */}
              {editingPagesChapterNum && (
                <div className="p-5 rounded-2xl bg-zinc-900 border border-indigo-500/40 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-indigo-400" />
                      <span>Gerenciar Páginas do Capítulo {editingPagesChapterNum}</span>
                    </h4>
                    <button
                      onClick={() => setEditingPagesChapterNum(null)}
                      className="p-1 text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={editPagesText}
                    onChange={(e) => setEditPagesText(e.target.value)}
                    placeholder="Cole URLs de imagens (uma por linha)"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-white mb-3"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingPagesChapterNum(null)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleSaveEditPages(editingPagesChapterNum)}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                    >
                      Salvar Páginas
                    </button>
                  </div>
                </div>
              )}

              {/* Chapters list */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Capítulos Cadastrados ({chapters.length})
                </h4>
                {chapters.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 text-zinc-400 text-xs">
                    Nenhum capítulo cadastrado manualmente pelo administrador ainda.
                    <br />
                    Clique em <strong className="text-emerald-400 font-bold">"Adicionar Capítulo"</strong> acima para criar capítulos personalizados com suas próprias páginas!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {chapters.map((ch) => (
                      <div
                        key={ch.chapterNumber}
                        className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-700 transition-colors"
                      >
                        <div>
                          <span className="font-bold text-white text-xs block">
                            Capítulo {ch.chapterNumber} - {ch.title}
                          </span>
                          <span className="text-[11px] text-zinc-400 block mt-0.5">
                            {ch.pages?.length || 0} páginas cadastradas · {ch.scanlationGroup || 'ADM'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setEditingPagesChapterNum(ch.chapterNumber);
                              setEditPagesText((ch.pages || []).join('\n'));
                            }}
                            title="Editar páginas"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteChapter(ch.chapterNumber)}
                            title="Remover capítulo"
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. MODERAÇÃO DE CHAT */}
          {activeTab === 'chat' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                    <span>Controle e Moderação do Chat Ao Vivo</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {chatMessages.length} mensagens no histórico recente
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearChat}
                    className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Chat Inteiro</span>
                  </button>
                  <button
                    onClick={loadAllData}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    title="Recarregar"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Ban user box */}
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2">
                <input
                  type="text"
                  value={banInput}
                  onChange={(e) => setBanInput(e.target.value)}
                  placeholder="Nome de usuário para banir ou desbanir do chat..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white"
                />
                <button
                  onClick={handleBanUser}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs"
                >
                  Alternar Banimento
                </button>
              </div>

              {/* Messages list */}
              <div className="rounded-2xl border border-zinc-800 divide-y divide-zinc-800/60 bg-zinc-900/40 max-h-96 overflow-y-auto">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="p-3 flex items-start justify-between gap-3 hover:bg-zinc-850/40">
                    <div className="flex items-start gap-2.5">
                      <img
                        src={msg.avatar}
                        alt={msg.user}
                        className="w-7 h-7 rounded-full object-cover border border-zinc-700 mt-0.5 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white">{msg.user}</span>
                          {msg.role === 'admin' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                              ADM
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteChatMessage(msg.id)}
                      title="Apagar mensagem"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. MODERAÇÃO DE COMENTÁRIOS */}
          {activeTab === 'comments' && (
            <div className="space-y-4 max-w-4xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center gap-3">
                  <select
                    value={commentsMangaId}
                    onChange={(e) => setCommentsMangaId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-white font-medium"
                  >
                    {allAvailableMangas.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 text-xs text-zinc-400">
                    <span>Capítulo:</span>
                    <input
                      type="text"
                      value={commentsChapterNum}
                      onChange={(e) => setCommentsChapterNum(e.target.value)}
                      className="w-16 px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-xs text-white font-medium text-center"
                    />
                  </div>
                </div>

                <span className="text-xs text-zinc-400 font-medium">
                  {chapterComments.length} comentários encontrados
                </span>
              </div>

              {/* Comments list */}
              <div className="space-y-3">
                {chapterComments.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 text-zinc-400 text-xs">
                    Nenhum comentário registrado para este capítulo ainda.
                  </div>
                ) : (
                  chapterComments.map((comm) => (
                    <div
                      key={comm.id}
                      className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={comm.avatar}
                          alt={comm.user}
                          className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0 mt-0.5"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{comm.user}</span>
                            {comm.role === 'admin' && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                ADM
                              </span>
                            )}
                            {comm.isPinned && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center gap-1">
                                <Pin className="w-2.5 h-2.5" />
                                Fixado
                              </span>
                            )}
                            <span className="text-[10px] text-zinc-500">
                              {new Date(comm.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">{comm.text}</p>
                          <div className="mt-2 text-[10px] text-zinc-500">
                            👍 {comm.likes} curtidas · {comm.replies?.length || 0} respostas
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleTogglePinComment(comm.id)}
                          title={comm.isPinned ? 'Desafixar' : 'Fixar no topo'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            comm.isPinned
                              ? 'bg-indigo-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comm.id)}
                          title="Remover comentário"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-600 text-zinc-400 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 6: Pix & Donations Settings */}
          {activeTab === 'pix' && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-5 rounded-2xl bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-zinc-900 border border-pink-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
                    <Heart className="w-6 h-6 fill-pink-500/30" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-black text-white">
                        Configurações de Apoio & Chave Pix
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                        Ativa no Site
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Configure a chave Pix que os leitores visualizam no modal de apoio para doações diretas.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleResetToDefaultPix}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                  title="Restaurar a chave padrão (4970bdb1-d6e0-4a23-9d06-365d1f89687c)"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Restaurar Chave Padrão</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form Column */}
                <form onSubmit={handleSavePixConfig} className="lg:col-span-7 space-y-4">
                  <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-pink-400" />
                      Dados de Recebimento Pix
                    </h3>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-zinc-300">
                          Chave Pix Oficial (Aleatória / E-mail / CPF / Tel)
                        </label>
                        <span className="text-[10px] font-mono text-zinc-500">
                          Chave Ativa dos Leitores
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={pixConfig.key}
                          onChange={(e) => setPixConfig({ ...pixConfig, key: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-pink-500 text-sm font-mono text-pink-300 focus:outline-none transition-colors"
                          placeholder="4970bdb1-d6e0-4a23-9d06-365d1f89687c"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Sua chave cadastrada: <strong className="text-zinc-400 font-mono">4970bdb1-d6e0-4a23-9d06-365d1f89687c</strong> (Chave Aleatória EVP).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                          Nome do Titular / Recebedor
                        </label>
                        <input
                          type="text"
                          value={pixConfig.merchantName}
                          onChange={(e) => setPixConfig({ ...pixConfig, merchantName: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-pink-500 text-xs text-white focus:outline-none"
                          placeholder="MangaVerse Apoio"
                          maxLength={25}
                        />
                        <span className="text-[10px] text-zinc-500">Máximo 25 caracteres (padrão EMV)</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                          Cidade do Titular
                        </label>
                        <input
                          type="text"
                          value={pixConfig.merchantCity}
                          onChange={(e) => setPixConfig({ ...pixConfig, merchantCity: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-pink-500 text-xs text-white focus:outline-none"
                          placeholder="SAO PAULO"
                          maxLength={15}
                        />
                        <span className="text-[10px] text-zinc-500">Máximo 15 caracteres (padrão EMV)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                        Descrição / Mensagem de Agradecimento
                      </label>
                      <textarea
                        rows={2}
                        value={pixConfig.description}
                        onChange={(e) => setPixConfig({ ...pixConfig, description: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-pink-500 text-xs text-white focus:outline-none"
                        placeholder="Apoio aos servidores e acervo MangaVerse"
                      />
                    </div>

                    <div className="pt-2 flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={isSavingPix}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-600/25 transition-all disabled:opacity-50"
                      >
                        {isSavingPix ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Salvar Configurações de Doação</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Informational guide */}
                  <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 space-y-2">
                    <span className="font-bold text-zinc-300 block">💡 Como funciona o recebimento:</span>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-zinc-400">
                      <li>O dinheiro cai <strong>imediatamente e integralmente</strong> na conta bancária vinculada à chave.</li>
                      <li>Não há retenção de taxa por nenhuma plataforma intermediária.</li>
                      <li>O QR Code e o código "Pix Copia e Cola" gerados são 100% compatíveis com o padrão do Banco Central.</li>
                    </ul>
                  </div>
                </form>

                {/* Live Preview Column */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        Pré-visualização ao Vivo
                      </h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                        Modal Leitor
                      </span>
                    </div>

                    {/* Simulation buttons */}
                    <div>
                      <span className="text-[11px] text-zinc-400 font-medium block mb-1.5">
                        Testar valor no QR Code:
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[5, 10, 25, 50].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setPixPreviewAmount(v)}
                            className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border ${
                              pixPreviewAmount === v
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700/60 hover:bg-zinc-750'
                            }`}
                          >
                            R$ {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Visual Card */}
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center text-center">
                      <div className="p-2 bg-white rounded-xl shadow-md mb-3">
                        <img
                          src={getPixQrCodeUrl(
                            generatePixPayload({
                              key: pixConfig.key,
                              amount: pixPreviewAmount,
                              merchantName: pixConfig.merchantName,
                              merchantCity: pixConfig.merchantCity
                            }),
                            200
                          )}
                          alt="QR Code Preview"
                          className="w-32 h-32 object-contain"
                        />
                      </div>

                      <span className="text-xs font-bold text-white mb-0.5">
                        Pix MangaVerse · R$ {pixPreviewAmount.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-zinc-400 mb-3">
                        {pixConfig.merchantName || 'MangaVerse Apoio'} ({pixConfig.merchantCity || 'SAO PAULO'})
                      </span>

                      {/* Display key */}
                      <div className="w-full space-y-2">
                        <div className="flex items-center gap-1.5">
                          <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-indigo-300 font-mono truncate">
                            {formatPixDisplayKey(pixConfig.key)}
                          </code>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(pixConfig.key);
                              setCopiedPixKey(true);
                              setTimeout(() => setCopiedPixKey(false), 2000);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-1 shrink-0 ${
                              copiedPixKey
                                ? 'bg-emerald-600 text-white'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                            }`}
                          >
                            {copiedPixKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedPixKey ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>

                        {/* Copy Full Payload */}
                        <button
                          type="button"
                          onClick={() => {
                            const payload = generatePixPayload({
                              key: pixConfig.key,
                              amount: pixPreviewAmount,
                              merchantName: pixConfig.merchantName,
                              merchantCity: pixConfig.merchantCity
                            });
                            navigator.clipboard.writeText(payload);
                            setCopiedPixPayload(true);
                            setTimeout(() => setCopiedPixPayload(false), 2000);
                          }}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                            copiedPixPayload
                              ? 'bg-emerald-600 border-emerald-500 text-white'
                              : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-600/40'
                          }`}
                        >
                          {copiedPixPayload ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Código Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Pix Copia e Cola</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
