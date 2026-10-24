// Service for managing offline manga chapters and pages via IndexedDB and device file downloads
import JSZip from 'jszip';

export interface OfflineChapterMeta {
  id: string; // `${mangaId}_${chapterNumber}`
  mangaId: string;
  mangaTitle: string;
  coverUrl: string;
  chapterId: string;
  chapterNumber: string;
  chapterTitle: string;
  pagesCount: number;
  downloadedAt: string;
  sizeBytes: number;
}

export interface OfflinePageRecord {
  id: string; // `${chapterDbId}_${pageIndex}`
  chapterDbId: string;
  pageIndex: number;
  blob: Blob;
  mimeType: string;
}

const DB_NAME = 'mangaverse_offline_db';
const DB_VERSION = 1;
const STORE_CHAPTERS = 'downloaded_chapters';
const STORE_PAGES = 'chapter_pages';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB não suportado neste navegador'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
        db.createObjectStore(STORE_CHAPTERS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_PAGES)) {
        const pagesStore = db.createObjectStore(STORE_PAGES, { keyPath: 'id' });
        pagesStore.createIndex('chapterDbId', 'chapterDbId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export function getChapterDbKey(mangaId: string, chapterNumber: string): string {
  const cleanNum = chapterNumber.replace(/^0+/, '') || chapterNumber;
  return `${mangaId}_ch_${cleanNum}`;
}

export async function isChapterDownloaded(mangaId: string, chapterNumber: string): Promise<boolean> {
  try {
    const db = await openDB();
    const key = getChapterDbKey(mangaId, chapterNumber);

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readonly');
      const store = tx.objectStore(STORE_CHAPTERS);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve(!!req.result);
      };
      req.onerror = () => {
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

export async function getDownloadedChapterMeta(mangaId: string, chapterNumber: string): Promise<OfflineChapterMeta | null> {
  try {
    const db = await openDB();
    const key = getChapterDbKey(mangaId, chapterNumber);

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readonly');
      const store = tx.objectStore(STORE_CHAPTERS);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function getAllDownloadedChapters(): Promise<OfflineChapterMeta[]> {
  try {
    const db = await openDB();

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CHAPTERS, 'readonly');
      const store = tx.objectStore(STORE_CHAPTERS);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = req.result || [];
        // Sort by most recently downloaded
        list.sort((a, b) => new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime());
        resolve(list);
      };
      req.onerror = () => {
        resolve([]);
      };
    });
  } catch {
    return [];
  }
}

// Fetch image with fallback through server proxy to avoid CORS issues
async function fetchImageBlob(url: string): Promise<{ blob: Blob; size: number }> {
  try {
    // Try direct fetch first
    let res = await fetch(url).catch(() => null);

    // If failed or opaque, try proxy
    if (!res || !res.ok) {
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      res = await fetch(proxyUrl);
    }

    if (!res.ok) {
      throw new Error(`Falha ao obter imagem (${res.status})`);
    }

    const blob = await res.blob();
    return { blob, size: blob.size };
  } catch (err) {
    // Fallback: create placeholder SVG blob so chapter stays complete
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200"><rect width="800" height="1200" fill="#18181b"/><text x="400" y="600" fill="#71717a" text-anchor="middle" font-family="sans-serif" font-size="20">Página Offline</text></svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    return { blob, size: blob.size };
  }
}

export async function saveChapterOffline(
  manga: { id: string; title: string; coverUrl?: string },
  chapter: { id: string; chapterNumber: string; title?: string },
  pageUrls: string[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const db = await openDB();
  const chapterDbId = getChapterDbKey(manga.id, chapter.chapterNumber);

  let totalSize = 0;
  const pageBlobs: OfflinePageRecord[] = [];

  for (let i = 0; i < pageUrls.length; i++) {
    const { blob, size } = await fetchImageBlob(pageUrls[i]);
    totalSize += size;

    pageBlobs.push({
      id: `${chapterDbId}_${i}`,
      chapterDbId,
      pageIndex: i,
      blob,
      mimeType: blob.type || 'image/jpeg'
    });

    if (onProgress) {
      onProgress(i + 1, pageUrls.length);
    }
  }

  const meta: OfflineChapterMeta = {
    id: chapterDbId,
    mangaId: manga.id,
    mangaTitle: manga.title,
    coverUrl: manga.coverUrl || '',
    chapterId: chapter.id,
    chapterNumber: chapter.chapterNumber,
    chapterTitle: chapter.title || `Capítulo ${chapter.chapterNumber}`,
    pagesCount: pageUrls.length,
    downloadedAt: new Date().toISOString(),
    sizeBytes: totalSize
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CHAPTERS, STORE_PAGES], 'readwrite');
    const chStore = tx.objectStore(STORE_CHAPTERS);
    const pagesStore = tx.objectStore(STORE_PAGES);

    chStore.put(meta);

    for (const page of pageBlobs) {
      pagesStore.put(page);
    }

    tx.oncomplete = () => {
      resolve();
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

export async function getOfflineChapterPages(mangaId: string, chapterNumber: string): Promise<string[] | null> {
  try {
    const db = await openDB();
    const chapterDbId = getChapterDbKey(mangaId, chapterNumber);

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PAGES, 'readonly');
      const store = tx.objectStore(STORE_PAGES);
      const index = store.index('chapterDbId');
      const req = index.getAll(chapterDbId);

      req.onsuccess = () => {
        const records = (req.result || []) as OfflinePageRecord[];
        if (records.length === 0) {
          return resolve(null);
        }

        records.sort((a, b) => a.pageIndex - b.pageIndex);
        const objectUrls = records.map((r) => URL.createObjectURL(r.blob));
        resolve(objectUrls);
      };

      req.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function deleteDownloadedChapter(mangaId: string, chapterNumber: string): Promise<void> {
  const db = await openDB();
  const chapterDbId = getChapterDbKey(mangaId, chapterNumber);

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CHAPTERS, STORE_PAGES], 'readwrite');
    const chStore = tx.objectStore(STORE_CHAPTERS);
    const pagesStore = tx.objectStore(STORE_PAGES);

    chStore.delete(chapterDbId);

    const index = pagesStore.index('chapterDbId');
    const req = index.getAllKeys(chapterDbId);

    req.onsuccess = () => {
      const keys = req.result || [];
      for (const k of keys) {
        pagesStore.delete(k);
      }
    };

    tx.oncomplete = () => {
      resolve();
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

export async function clearAllDownloadedChapters(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_CHAPTERS, STORE_PAGES], 'readwrite');
    tx.objectStore(STORE_CHAPTERS).clear();
    tx.objectStore(STORE_PAGES).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTotalOfflineStorageSize(): Promise<number> {
  const chapters = await getAllDownloadedChapters();
  return chapters.reduce((sum, ch) => sum + (ch.sizeBytes || 0), 0);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}

function detectFileExtension(blob: Blob, url: string): string {
  if (blob.type.includes('png')) return 'png';
  if (blob.type.includes('webp')) return 'webp';
  if (blob.type.includes('gif')) return 'gif';
  if (blob.type.includes('svg')) return 'svg';
  if (url.includes('.png')) return 'png';
  if (url.includes('.webp')) return 'webp';
  return 'jpg';
}

export async function downloadChapterToDevice(
  manga: { id: string; title: string; coverUrl?: string },
  chapter: { id: string; chapterNumber: string; title?: string },
  pageUrls: string[],
  format: 'cbz' | 'zip' = 'cbz',
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ fileName: string; sizeBytes: number }> {
  const zip = new JSZip();
  const db = await openDB();
  const chapterDbId = getChapterDbKey(manga.id, chapter.chapterNumber);

  let totalSize = 0;
  const pageBlobs: OfflinePageRecord[] = [];

  for (let i = 0; i < pageUrls.length; i++) {
    const pageNum = i + 1;
    if (onProgress) {
      onProgress(pageNum, pageUrls.length, `Baixando página ${pageNum} de ${pageUrls.length}...`);
    }

    const { blob, size } = await fetchImageBlob(pageUrls[i]);
    totalSize += size;
    const ext = detectFileExtension(blob, pageUrls[i]);
    const padded = String(pageNum).padStart(3, '0');
    zip.file(`page_${padded}.${ext}`, blob);

    pageBlobs.push({
      id: `${chapterDbId}_${i}`,
      chapterDbId,
      pageIndex: i,
      blob,
      mimeType: blob.type || `image/${ext}`
    });
  }

  // Add ComicInfo metadata (CBZ standard for comic readers like Tachiyomi, Mihon, CDisplayEx)
  const comicInfo = `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Title>${chapter.title || `Capítulo ${chapter.chapterNumber}`}</Title>
  <Series>${manga.title}</Series>
  <Number>${chapter.chapterNumber}</Number>
  <PageCount>${pageUrls.length}</PageCount>
  <LanguageISO>pt-BR</LanguageISO>
  <Manga>Yes</Manga>
  <ScanInformation>NipponBR Scan Oficial</ScanInformation>
</ComicInfo>`;
  zip.file('ComicInfo.xml', comicInfo);

  if (onProgress) {
    onProgress(pageUrls.length, pageUrls.length, 'Empacotando arquivo para o seu dispositivo...');
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'STORE'
  });

  const cleanManga = manga.title.replace(/[/\\?%*:|"<>]/g, '_').trim();
  const cleanCh = chapter.chapterNumber.replace(/[/\\?%*:|"<>]/g, '_').trim();
  const fileName = `${cleanManga} - Cap ${cleanCh}.${format}`;

  // Trigger real file download directly to the user's phone or computer downloads folder
  triggerFileDownload(zipBlob, fileName);

  // Also save to IndexedDB so the user can read inside the app anytime
  try {
    const meta: OfflineChapterMeta = {
      id: chapterDbId,
      mangaId: manga.id,
      mangaTitle: manga.title,
      coverUrl: manga.coverUrl || '',
      chapterId: chapter.id,
      chapterNumber: chapter.chapterNumber,
      chapterTitle: chapter.title || `Capítulo ${chapter.chapterNumber}`,
      pagesCount: pageUrls.length,
      downloadedAt: new Date().toISOString(),
      sizeBytes: totalSize
    };

    const tx = db.transaction([STORE_CHAPTERS, STORE_PAGES], 'readwrite');
    const chStore = tx.objectStore(STORE_CHAPTERS);
    const pagesStore = tx.objectStore(STORE_PAGES);

    chStore.put(meta);
    for (const page of pageBlobs) {
      pagesStore.put(page);
    }
  } catch (err) {
    console.warn('Erro ao salvar cópia em IndexedDB:', err);
  }

  return { fileName, sizeBytes: zipBlob.size };
}

export async function exportOfflineChapterToDevice(
  mangaId: string,
  chapterNumber: string,
  format: 'cbz' | 'zip' = 'cbz'
): Promise<{ fileName: string; sizeBytes: number } | null> {
  const db = await openDB();
  const chapterDbId = getChapterDbKey(mangaId, chapterNumber);
  const meta = await getDownloadedChapterMeta(mangaId, chapterNumber);
  if (!meta) return null;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PAGES, 'readonly');
    const store = tx.objectStore(STORE_PAGES);
    const index = store.index('chapterDbId');
    const req = index.getAll(chapterDbId);

    req.onsuccess = async () => {
      const records = (req.result || []) as OfflinePageRecord[];
      if (records.length === 0) return resolve(null);

      records.sort((a, b) => a.pageIndex - b.pageIndex);
      const zip = new JSZip();

      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const ext = detectFileExtension(r.blob, '');
        const padded = String(i + 1).padStart(3, '0');
        zip.file(`page_${padded}.${ext}`, r.blob);
      }

      const comicInfo = `<?xml version="1.0" encoding="utf-8"?>
<ComicInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Title>${meta.chapterTitle}</Title>
  <Series>${meta.mangaTitle}</Series>
  <Number>${meta.chapterNumber}</Number>
  <PageCount>${records.length}</PageCount>
  <LanguageISO>pt-BR</LanguageISO>
  <Manga>Yes</Manga>
</ComicInfo>`;
      zip.file('ComicInfo.xml', comicInfo);

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE'
      });

      const cleanManga = meta.mangaTitle.replace(/[/\\?%*:|"<>]/g, '_').trim();
      const cleanCh = meta.chapterNumber.replace(/[/\\?%*:|"<>]/g, '_').trim();
      const fileName = `${cleanManga} - Cap ${cleanCh}.${format}`;

      triggerFileDownload(zipBlob, fileName);
      resolve({ fileName, sizeBytes: zipBlob.size });
    };

    req.onerror = () => reject(req.error);
  });
}

const FORMAT_PREF_KEY = 'mangaverse_download_format_pref';

export function getStoredDownloadFormat(): 'cbz' | 'zip' {
  if (typeof window === 'undefined') return 'cbz';
  const val = localStorage.getItem(FORMAT_PREF_KEY);
  return val === 'zip' ? 'zip' : 'cbz';
}

export function saveStoredDownloadFormat(format: 'cbz' | 'zip'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FORMAT_PREF_KEY, format);
}

export async function downloadBatchChaptersToDevice(
  manga: { id: string; title: string; coverUrl?: string },
  chapters: { id: string; chapterNumber: string; title?: string }[],
  pageResolver: (chapter: { id: string; chapterNumber: string; title?: string }) => Promise<string[]>,
  format: 'cbz' | 'zip' = 'cbz',
  onProgress?: (info: {
    currentChapterIdx: number;
    totalChapters: number;
    chapterNumber: string;
    currentPage: number;
    totalPages: number;
    message: string;
  }) => void,
  shouldCancel?: () => boolean
): Promise<{ downloadedCount: number; failedCount: number }> {
  let downloadedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < chapters.length; i++) {
    if (shouldCancel && shouldCancel()) {
      break;
    }

    const chap = chapters[i];
    try {
      if (onProgress) {
        onProgress({
          currentChapterIdx: i + 1,
          totalChapters: chapters.length,
          chapterNumber: chap.chapterNumber,
          currentPage: 0,
          totalPages: 0,
          message: `Iniciando capítulo ${chap.chapterNumber} (${i + 1}/${chapters.length})...`
        });
      }

      const pageUrls = await pageResolver(chap);
      if (!pageUrls || pageUrls.length === 0) {
        throw new Error('Sem páginas para download');
      }

      await downloadChapterToDevice(
        manga,
        chap,
        pageUrls,
        format,
        (curr, tot, msg) => {
          if (onProgress) {
            onProgress({
              currentChapterIdx: i + 1,
              totalChapters: chapters.length,
              chapterNumber: chap.chapterNumber,
              currentPage: curr,
              totalPages: tot,
              message: `Cap. ${chap.chapterNumber}: página ${curr}/${tot}`
            });
          }
        }
      );

      downloadedCount++;
      // Pause 400ms between chapters to give browser breathing room
      await new Promise((r) => setTimeout(r, 400));
    } catch (err) {
      console.error(`Erro ao baixar capítulo ${chap.chapterNumber} no lote:`, err);
      failedCount++;
    }
  }

  return { downloadedCount, failedCount };
}
