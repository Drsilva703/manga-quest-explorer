export type MangaSource = 'all' | 'mangadex' | 'comick';

export type MangaStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';

export type MangaCountry = 'jp' | 'kr' | 'cn' | 'other';

export type ReadingStatus = 'reading' | 'plan_to_read' | 'completed' | 'dropped' | 'favorite';

export type ReadingMode = 'webtoon' | 'traditional';

export type ReadingDirection = 'rtl' | 'ltr';

export interface MangaCharacter {
  id: string | number;
  name: string;
  role: 'Protagonista' | 'Principal' | 'Suporte' | string;
  imageUrl?: string;
}

export interface MangaRelation {
  id: string | number;
  title: string;
  relationType: 'Adaptação Anime' | 'Sequência' | 'Prelúdio' | 'Spin-off' | 'História Paralela' | string;
  format: 'TV' | 'Manga' | 'Novel' | 'Filme' | 'OVA' | string;
  coverUrl?: string;
}

export interface MangaRecommendation {
  id: string;
  title: string;
  coverUrl: string;
  rating?: number;
}

export interface MangaReview {
  author: string;
  score: number;
  summary: string;
  date?: string;
}

export interface MangaItem {
  id: string;
  slug?: string;
  title: string;
  altTitles?: string[];
  coverUrl: string;
  bannerUrl?: string;
  description: string;
  genres: string[];
  status: MangaStatus;
  authors: string[];
  artists: string[];
  rating: number; // 0 to 10
  views?: number;
  totalChapters?: number;
  sources?: ('mangadex' | 'comick')[];
  mangadexId?: string;
  comickHid?: string;
  anilistId?: number;
  malId?: number;
  kitsuId?: string | number;
  contentRating?: 'safe' | 'suggestive' | 'erotica' | 'pornographic';
  lastUpdated?: string;
  releaseYear?: number;
  country?: MangaCountry; // Manga (JP), Manhwa (KR), Manhua (CN)
  // Enriched fields from AniList & Jikan/MyAnimeList & Kitsu
  serialization?: string; // Magazine (e.g. Weekly Shonen Jump, Young Jump, etc.)
  malScore?: number;
  malRank?: number;
  anilistScore?: number;
  trailerYoutubeId?: string;
  characters?: MangaCharacter[];
  relations?: MangaRelation[];
  recommendations?: MangaRecommendation[];
  reviews?: MangaReview[];
}

export interface MangaChapter {
  id: string;
  chapterNumber: string;
  volume?: string;
  title: string;
  source?: 'mangadex' | 'comick' | string;
  language: 'pt-br' | 'pt' | 'en' | 'es' | string;
  scanlationGroup?: string;
  publishedAt: string;
  pagesCount?: number;
  externalUrl?: string;
}

export interface ChapterPagesData {
  chapterId: string;
  mangaId: string;
  mangaTitle: string;
  chapterNumber: string;
  chapterTitle?: string;
  source?: string;
  language: string;
  pages: string[];
  prevChapterId?: string;
  nextChapterId?: string;
  allChapters?: { id: string; chapterNumber: string; title: string; language: string }[];
}

export interface ChapterPagesResponse {
  chapterId: string;
  mangaId: string;
  mangaTitle?: string;
  chapterNumber: string;
  chapterTitle?: string;
  pages: string[];
  directPages?: string[];
  dataSaverPages?: string[];
  directDataSaverPages?: string[];
  source?: string;
  pagesCount: number;
}

export interface UserLibraryItem {
  mangaId: string;
  manga: MangaItem;
  status: ReadingStatus;
  isFavorite: boolean;
  addedAt: string;
  updatedAt: string;
  lastReadChapterId?: string;
  lastReadChapterNumber?: string;
  lastReadPage?: number;
  lastReadTotalPages?: number;
  lastReadAt?: string;
}

export interface UserSettings {
  theme: 'dark' | 'amoled' | 'light';
  nsfwEnabled: boolean;
  defaultLanguage: 'pt-br' | 'en' | 'es' | 'all';
  defaultSource?: 'all' | 'mangadex' | 'comick';
  readingMode: 'webtoon' | 'traditional';
  readingDirection: 'rtl' | 'ltr';
  imageQuality: 'original' | 'medium' | 'low';
  hideAds: boolean; // VIP / Apoie feature
  customPixKey: string;
  autoNextChapter: boolean;
}

export interface ApiStatusInfo {
  name: string;
  service: string;
  endpoint: string;
  status: 'online' | 'degraded' | 'offline';
  latencyMs: number;
  description: string;
  features: string[];
}

export interface AdminUser {
  email: string;
  name: string;
  role: 'admin' | 'user';
  token: string;
}

export interface ChatMessage {
  id: string;
  user: string;
  email?: string;
  role?: 'admin' | 'user';
  avatar: string;
  text: string;
  timestamp: string;
  replyTo?: {
    id: string;
    user: string;
    text: string;
  };
}

export interface ChapterCommentReply {
  id: string;
  user: string;
  email?: string;
  role?: 'admin' | 'user';
  avatar: string;
  text: string;
  timestamp: string;
  likes: number;
}

export interface ChapterComment {
  id: string;
  mangaId: string;
  chapterNumber: string;
  user: string;
  email?: string;
  role?: 'admin' | 'user';
  avatar: string;
  text: string;
  timestamp: string;
  likes: number;
  isSpoiler?: boolean;
  isPinned?: boolean;
  replies?: ChapterCommentReply[];
}

export interface CustomChapterData {
  id: string;
  mangaId: string;
  chapterNumber: string;
  title: string;
  volume?: string;
  scanlationGroup?: string;
  language?: string;
  pages: string[];
  publishedAt: string;
}

