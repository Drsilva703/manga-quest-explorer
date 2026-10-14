import React, { useState } from 'react';
import { BookOpen, Search, Bookmark, Bell, Heart, Settings, Compass, MessageSquare, Shield } from 'lucide-react';
import { getStoredLibrary } from '../services/storage';
import { AdminUser } from '../types/manga';
import { useAuth } from '../hooks/useAuth';

interface NavbarProps {
  currentTab: 'home' | 'search' | 'library' | 'updates' | 'chat';
  onSelectTab: (tab: 'home' | 'search' | 'library' | 'updates' | 'chat') => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onSearchSubmit: (query: string) => void;
  adminUser?: AdminUser | null;
  onOpenAdminModal?: () => void;
  onOpenAdminLogin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  onOpenSupport,
  onSearchSubmit,
  adminUser,
  onOpenAdminModal,
  onOpenAdminLogin
}) => {
  const [quickQuery, setQuickQuery] = useState('');
  const { user, signInWithGoogle, signOut } = useAuth();
  const library = getStoredLibrary();
  const libraryCount = library.length;

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickQuery.trim()) {
      onSearchSubmit(quickQuery.trim());
      onSelectTab('search');
    }
  };

  return (
    <>
      {/* Top Main Navbar */}
      <header className="sticky top-0 z-40 w-full max-w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2 cursor-pointer select-none group shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                  Manga<span className="text-indigo-400">Verse</span>
                </span>
              </div>
              <p className="hidden lg:block text-[10px] text-zinc-400 -mt-0.5">
                Catálogo & Leitor de Mangás
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-1 shrink-0 py-1">
            <button
              onClick={() => onSelectTab('home')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                currentTab === 'home'
                  ? 'text-white bg-zinc-800 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              Início
            </button>
            <button
              onClick={() => onSelectTab('search')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                currentTab === 'search'
                  ? 'text-white bg-zinc-800 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              Catálogo & Filtros
            </button>
            <button
              onClick={() => onSelectTab('library')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors relative ${
                currentTab === 'library'
                  ? 'text-white bg-zinc-800 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <span>Minha Biblioteca</span>
              {libraryCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                  {libraryCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onSelectTab('updates')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors relative ${
                currentTab === 'updates'
                  ? 'text-white bg-zinc-800 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <span>Lançamentos</span>
              <span className="ml-1.5 w-2 h-2 rounded-full bg-emerald-500 inline-block align-middle" />
            </button>
            <button
              onClick={() => onSelectTab('chat')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors relative flex items-center gap-1.5 ${
                currentTab === 'chat'
                  ? 'text-white bg-zinc-800 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
              <span>Chat</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          </nav>

          {/* Search bar & Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink min-w-0 justify-end">
            {/* Quick search input */}
            <div className="relative w-[92px] sm:w-[160px] 2xl:w-[210px] shrink-0">
              <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar..."
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full pl-7 sm:pl-8 pr-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            {/* Admin Panel button */}
            {adminUser ? (
              <button
                onClick={onOpenAdminModal}
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-sm shadow-amber-500/20"
                title="Painel de Administração MangaVerse"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden 2xl:inline">Painel ADM</span>
              </button>
            ) : (
              <button
                onClick={onOpenAdminLogin}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-amber-300 border border-zinc-800 text-xs font-semibold transition-all flex items-center gap-1 shrink-0"
                title="Acesso Administrador denilsonr703@gmail.com"
              >
                <Shield className="w-3.5 h-3.5 text-zinc-500" />
                <span className="hidden lg:inline text-[11px]">ADM</span>
              </button>
            )}

            {/* Login com Google */}
            {user ? (
              <button
                onClick={() => { if (confirm('Deseja sair da sua conta?')) signOut(); }}
                title={`Conectado como ${user.email ?? ''} — clique para sair`}
                className="flex items-center gap-1.5 shrink-0 rounded-xl border border-zinc-800 bg-zinc-900 p-0.5 sm:pr-2.5 hover:bg-zinc-850 transition-colors"
              >
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="" referrerPolicy="no-referrer" className="w-7 h-7 rounded-lg" />
                ) : (
                  <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    {(user.user_metadata?.full_name || user.email || '?').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:inline text-xs text-zinc-200 max-w-[90px] truncate">
                  {(user.user_metadata?.full_name || user.email || '').split(' ')[0]}
                </span>
              </button>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="flex items-center gap-1.5 shrink-0 rounded-xl bg-white text-zinc-900 px-2 sm:px-3 py-1.5 text-xs font-semibold hover:bg-zinc-200 transition-colors"
              >
                <svg viewBox="0 0 48 48" className="w-3.5 h-3.5"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                <span className="hidden sm:inline">Entrar</span>
              </button>
            )}


            {/* Apoie o Projeto */}
            <button
              onClick={onOpenSupport}
              title="Apoiar com Pix ou Apoia.se"
              className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/20 text-xs font-medium transition-all flex items-center gap-1.5 shrink-0"
            >
              <Heart className="w-3.5 h-3.5 fill-pink-400/40 text-pink-400" />
              <span className="hidden 2xl:inline">Apoiar</span>
            </button>

            {/* Configurações */}
            <button
              onClick={onOpenSettings}
              aria-label="Abrir configurações"
              className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-850 transition-colors shrink-0"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar - Standard app navigation */}
      <nav aria-label="Navegação mobile" className="xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 px-2 py-1 flex items-center justify-around shadow-2xl safe-area-bottom">
        <button
          onClick={() => onSelectTab('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors ${
            currentTab === 'home'
              ? 'text-indigo-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200 font-medium'
          }`}
        >
          <BookOpen className={`w-5 h-5 ${currentTab === 'home' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5">Início</span>
        </button>

        <button
          onClick={() => onSelectTab('search')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors ${
            currentTab === 'search'
              ? 'text-indigo-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200 font-medium'
          }`}
        >
          <Compass className={`w-5 h-5 ${currentTab === 'search' ? 'stroke-[2.5]' : 'stroke-2'}`} />
          <span className="text-[10px] mt-0.5">Catálogo</span>
        </button>

        <button
          onClick={() => onSelectTab('library')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors relative ${
            currentTab === 'library'
              ? 'text-indigo-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200 font-medium'
          }`}
        >
          <div className="relative">
            <Bookmark className={`w-5 h-5 ${currentTab === 'library' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            {libraryCount > 0 && (
              <span className="absolute -top-1 -right-2 px-1 py-0.2 min-w-4 text-center rounded-full bg-indigo-600 text-white text-[9px] font-bold">
                {libraryCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">Biblioteca</span>
        </button>

        <button
          onClick={() => onSelectTab('updates')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors relative ${
            currentTab === 'updates'
              ? 'text-indigo-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200 font-medium'
          }`}
        >
          <div className="relative">
            <Bell className={`w-5 h-5 ${currentTab === 'updates' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <span className="text-[10px] mt-0.5">Lançamentos</span>
        </button>

        <button
          onClick={() => onSelectTab('chat')}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg transition-colors relative ${
            currentTab === 'chat'
              ? 'text-indigo-400 font-bold'
              : 'text-zinc-400 hover:text-zinc-200 font-medium'
          }`}
        >
          <div className="relative">
            <MessageSquare className={`w-5 h-5 ${currentTab === 'chat' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <span className="text-[10px] mt-0.5">Chat</span>
        </button>
      </nav>
    </>
  );
};
