import { UserLibraryItem, UserSettings, ReadingStatus, MangaItem } from '../types/manga';

const STORAGE_KEYS = {
  LIBRARY: 'mangaverse_library',
  HISTORY: 'mangaverse_history',
  SETTINGS: 'mangaverse_settings',
  LAST_SUPPORT_CHAPTERS: 'mangaverse_support_chapters_count'
};

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  nsfwEnabled: false,
  defaultLanguage: 'pt-br',
  defaultSource: 'all',
  readingMode: 'webtoon',
  readingDirection: 'rtl',
  imageQuality: 'original',
  hideAds: false,
  customPixKey: '4970bdb1-d6e0-4a23-9d06-365d1f89687c',
  autoNextChapter: true
};

export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    // Automatically migrate legacy placeholder key to official Pix key
    if (parsed.customPixKey === 'mangaverse.apoio@pix.com.br' || !parsed.customPixKey) {
      parsed.customPixKey = '4970bdb1-d6e0-4a23-9d06-365d1f89687c';
    }
    return parsed;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    // Apply theme class to document if needed
    if (settings.theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function getStoredLibrary(): UserLibraryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LIBRARY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredLibrary(items: UserLibraryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save library:', e);
  }
}

export function updateLibraryItem(
  manga: MangaItem,
  status: ReadingStatus,
  isFavorite?: boolean
): UserLibraryItem[] {
  const library = getStoredLibrary();
  const existingIdx = library.findIndex(item => item.mangaId === manga.id || item.manga.slug === manga.slug);

  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    const existing = library[existingIdx];
    library[existingIdx] = {
      ...existing,
      manga,
      status,
      isFavorite: isFavorite !== undefined ? isFavorite : existing.isFavorite,
      updatedAt: now
    };
  } else {
    library.unshift({
      mangaId: manga.id,
      manga,
      status,
      isFavorite: isFavorite || false,
      addedAt: now,
      updatedAt: now
    });
  }

  saveStoredLibrary(library);
  return library;
}

export function toggleFavorite(manga: MangaItem): boolean {
  const library = getStoredLibrary();
  const existingIdx = library.findIndex(item => item.mangaId === manga.id || item.manga.slug === manga.slug);
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    const newFav = !library[existingIdx].isFavorite;
    library[existingIdx].isFavorite = newFav;
    library[existingIdx].updatedAt = now;
    saveStoredLibrary(library);
    return newFav;
  } else {
    library.unshift({
      mangaId: manga.id,
      manga,
      status: 'reading',
      isFavorite: true,
      addedAt: now,
      updatedAt: now
    });
    saveStoredLibrary(library);
    return true;
  }
}

export function removeLibraryItem(mangaId: string): UserLibraryItem[] {
  const library = getStoredLibrary().filter(item => item.mangaId !== mangaId && item.manga.slug !== mangaId);
  saveStoredLibrary(library);
  return library;
}

export function saveReadingProgress(
  manga: MangaItem,
  chapterId: string,
  chapterNumber: string,
  page = 1,
  totalPages = 1
): void {
  const library = getStoredLibrary();
  const existingIdx = library.findIndex(item => item.mangaId === manga.id || item.manga.slug === manga.slug);
  const now = new Date().toISOString();

  if (existingIdx >= 0) {
    library[existingIdx].lastReadChapterId = chapterId;
    library[existingIdx].lastReadChapterNumber = chapterNumber;
    library[existingIdx].lastReadPage = page;
    library[existingIdx].lastReadTotalPages = totalPages;
    library[existingIdx].lastReadAt = now;
    library[existingIdx].updatedAt = now;
    // Default to 'reading' if it was plan_to_read
    if (library[existingIdx].status === 'plan_to_read') {
      library[existingIdx].status = 'reading';
    }
  } else {
    library.unshift({
      mangaId: manga.id,
      manga,
      status: 'reading',
      isFavorite: false,
      addedAt: now,
      updatedAt: now,
      lastReadChapterId: chapterId,
      lastReadChapterNumber: chapterNumber,
      lastReadPage: page,
      lastReadTotalPages: totalPages,
      lastReadAt: now
    });
  }

  saveStoredLibrary(library);

  // Track total chapters read for support prompt after 10 chapters
  try {
    const count = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_SUPPORT_CHAPTERS) || '0', 10);
    localStorage.setItem(STORAGE_KEYS.LAST_SUPPORT_CHAPTERS, (count + 1).toString());
  } catch {}
}

export function getReadChaptersCount(): number {
  try {
    return parseInt(localStorage.getItem(STORAGE_KEYS.LAST_SUPPORT_CHAPTERS) || '0', 10);
  } catch {
    return 0;
  }
}

export function exportBackupJson(): string {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    library: getStoredLibrary(),
    settings: getStoredSettings()
  };
  return JSON.stringify(data, null, 2);
}

export function importBackupJson(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.library && Array.isArray(data.library)) {
      saveStoredLibrary(data.library);
    }
    if (data.settings && typeof data.settings === 'object') {
      saveStoredSettings(data.settings);
    }
    return true;
  } catch (e) {
    console.error('Failed to import backup:', e);
    return false;
  }
}
