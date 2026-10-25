/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MangaItem, MangaChapter, UserSettings, AdminUser } from './types/manga';
import { fetchMangaChapters } from './services/api';
import { getStoredSettings, getReadChaptersCount } from './services/storage';
import { getStoredAdminUser, saveAdminUser } from './services/adminService';
import { getDownloadedChapterMeta } from './services/offlineStorage';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { SupportModal } from './components/SupportModal';
import { SettingsModal } from './components/SettingsModal';
import { AdminModal } from './components/AdminModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { HomeView } from './views/HomeView';
import { SearchView } from './views/SearchView';
import { DetailsView } from './views/DetailsView';
import { ReaderView } from './views/ReaderView';
import { LibraryView } from './views/LibraryView';
import { UpdatesView } from './views/UpdatesView';
import { ChatView } from './views/ChatView';
import { BooksView } from './views/BooksView';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'search' | 'books' | 'library' | 'updates' | 'chat'>('home');
  const [booksQuery, setBooksQuery] = useState('');
  const [selectedManga, setSelectedManga] = useState<MangaItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => getStoredAdminUser());
  const [settings, setSettings] = useState<UserSettings>(getStoredSettings());

  // Auto-admin for denilsonr703@gmail.com if requested or found in storage
  useEffect(() => {
    const existing = getStoredAdminUser();
    if (existing) {
      setAdminUser(existing);
    } else {
      // Auto-initialize admin privileges for denilsonr703@gmail.com
      const autoAdmin: AdminUser = {
        email: 'denilsonr703@gmail.com',
        name: 'Denilson (ADM)',
        role: 'admin',
        token: `denilson_adm_auto_${Date.now()}`
      };
      saveAdminUser(autoAdmin);
      setAdminUser(autoAdmin);
    }
  }, []);

  // Reading session state
  const [readingSession, setReadingSession] = useState<{
    manga: MangaItem;
    currentChapter: MangaChapter;
    allChapters: MangaChapter[];
  } | null>(null);

  // Apply visual theme to root body
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'amoled') {
      root.classList.add('bg-black');
      root.classList.remove('bg-[#0B0D13]');
      document.body.className = 'bg-black text-slate-100 antialiased';
    } else if (settings.theme === 'light') {
      root.classList.remove('bg-black');
      document.body.className = 'bg-slate-100 text-slate-900 antialiased';
    } else {
      root.classList.remove('bg-black');
      document.body.className = 'bg-[#0B0D13] text-slate-100 antialiased';
    }
  }, [settings.theme]);

  // Read chapter handler (fetches chapters if not supplied, with offline fallback)
  const handleReadChapter = async (manga: MangaItem, chapterNumber?: string) => {
    try {
      let chapters: MangaChapter[] = [];
      try {
        chapters = await fetchMangaChapters(manga.id, 'pt-br', manga.title);
      } catch (networkErr) {
        console.warn('Network offline or fetch chapters failed:', networkErr);
      }

      // If network failed or returned empty and we have a chapter number, try offline storage
      if (chapters.length === 0 && chapterNumber) {
        const offlineMeta = await getDownloadedChapterMeta(manga.id, chapterNumber);
        if (offlineMeta) {
          const fallbackChapter: MangaChapter = {
            id: offlineMeta.chapterId,
            chapterNumber: offlineMeta.chapterNumber,
            title: offlineMeta.chapterTitle,
            language: 'pt-br',
            scanlationGroup: 'Scan Oficial (Salvo Offline)',
            publishedAt: offlineMeta.downloadedAt,
            pagesCount: offlineMeta.pagesCount
          };
          chapters = [fallbackChapter];
        }
      }

      // If still empty, supply default fallback chapter
      if (chapters.length === 0) {
        chapters = [
          {
            id: `cap-${manga.id}-${chapterNumber || '1'}`,
            chapterNumber: chapterNumber || '1',
            title: `Capítulo ${chapterNumber || '1'}`,
            language: 'pt-br',
            scanlationGroup: 'NipponBR Digital',
            publishedAt: new Date().toISOString(),
            pagesCount: 16
          }
        ];
      }

      // Chapters are ordered descending (e.g. 100... 1). Default to Chapter 1 (beginning of manga)
      let targetChapter = chapters.find(c => c.chapterNumber === '1') || chapters[chapters.length - 1] || chapters[0];

      if (chapterNumber) {
        const cleanTarget = String(chapterNumber).replace(/[^0-9.]/g, '');
        const targetNum = parseFloat(chapterNumber);
        const found = chapters.find(c =>
          c.chapterNumber === chapterNumber ||
          c.chapterNumber.replace(/[^0-9.]/g, '') === cleanTarget ||
          (!isNaN(targetNum) && parseFloat(c.chapterNumber) === targetNum)
        );
        if (found) targetChapter = found;
      }

      setReadingSession({
        manga,
        currentChapter: targetChapter,
        allChapters: chapters
      });

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' as any });

      // Check if user has read 10 chapters to prompt support
      const count = getReadChaptersCount();
      if (count > 0 && count % 10 === 0 && !settings.hideAds) {
        setTimeout(() => setIsSupportOpen(true), 1500);
      }
    } catch (err) {
      console.error('Error starting chapter reading:', err);
    }
  };

  const handleReadSpecificChapter = (chapter: MangaChapter, allChapters: MangaChapter[]) => {
    if (!selectedManga) return;
    setReadingSession({
      manga: selectedManga,
      currentChapter: chapter,
      allChapters: allChapters
    });
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  };

  const handleSelectManga = (manga: MangaItem) => {
    setSelectedManga(manga);
    setReadingSession(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromDetails = () => {
    setSelectedManga(null);
  };

  const handleBackFromReader = () => {
    setReadingSession(null);
  };

  const handleSearchSubmit = (query: string) => {
    if (currentTab === 'books') { setBooksQuery(query.trim()); return; }
    setSearchQuery(query);
    setSelectedManga(null);
    setReadingSession(null);
    setCurrentTab('search');
  };

  const handleGenreClick = (genre: string) => {
    setSelectedManga(null);
    setReadingSession(null);
    setSearchQuery(genre);
    setCurrentTab('search');
  };

  // If in active reader mode, render full-screen immersive ReaderView
  if (readingSession) {
    return (
      <ReaderView
        manga={readingSession.manga}
        initialChapter={readingSession.currentChapter}
        allChapters={readingSession.allChapters}
        onBackToDetails={handleBackFromReader}
        onOpenSupport={() => setIsSupportOpen(true)}
        adminUser={adminUser}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-inherit text-inherit">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedManga(null);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        onSearchSubmit={handleSearchSubmit}
        adminUser={adminUser}
        onOpenAdminModal={() => setIsAdminModalOpen(true)}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full pb-16 xl:pb-0">
        {selectedManga ? (
          <DetailsView
            manga={selectedManga}
            onBack={handleBackFromDetails}
            onReadChapter={handleReadSpecificChapter}
            onOpenSupport={() => setIsSupportOpen(true)}
            onGenreClick={handleGenreClick}
            onSelectManga={handleSelectManga}
            adminUser={adminUser}
            onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          />
        ) : (
          <>
            {currentTab === 'books' && <BooksView key={booksQuery} query={booksQuery} onSearch={setBooksQuery} />}
            {currentTab === 'home' && (
              <HomeView
                onSelectManga={handleSelectManga}
                onReadChapter={handleReadChapter}
                onOpenSupport={() => setIsSupportOpen(true)}
                onOpenExplore={() => setCurrentTab('search')}
              />
            )}

            {currentTab === 'search' && (
              <SearchView
                initialQuery={searchQuery}
                onSelectManga={handleSelectManga}
              />
            )}

            {currentTab === 'library' && (
              <LibraryView
                onSelectManga={handleSelectManga}
                onReadChapter={handleReadChapter}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenExplore={() => setCurrentTab('search')}
              />
            )}

            {currentTab === 'updates' && (
              <UpdatesView
                onSelectManga={handleSelectManga}
                onReadChapter={handleReadChapter}
                onOpenExplore={() => setCurrentTab('search')}
              />
            )}

            {currentTab === 'chat' && (
              <ChatView
                adminUser={adminUser}
                onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      {!selectedManga && currentTab !== 'chat' && (
        <Footer
          onOpenSupport={() => setIsSupportOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Modals */}
      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        onVipToggled={(vip) => setSettings(prev => ({ ...prev, hideAds: vip }))}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChanged={(newSettings) => setSettings(newSettings)}
      />

      {adminUser && (
        <AdminModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          adminUser={adminUser}
          onLogout={() => {
            setAdminUser(null);
            setIsAdminModalOpen(false);
          }}
          onMangaSelected={(m) => {
            setIsAdminModalOpen(false);
            handleSelectManga(m);
          }}
        />
      )}

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={(user) => {
          setAdminUser(user);
          setIsAdminLoginOpen(false);
          setIsAdminModalOpen(true);
        }}
      />
    </div>
  );
}
