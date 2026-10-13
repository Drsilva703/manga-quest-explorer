// Service for managing personal ratings, notes and reviews for manga

export interface UserMangaReview {
  mangaId: string;
  rating: number; // 1 to 5
  notes: string;
  updatedAt: string;
}

const STORAGE_KEY = 'mangaverse_user_reviews_v1';

function getStoredReviews(): Record<string, UserMangaReview> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveStoredReviews(reviews: Record<string, UserMangaReview>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch (err) {
    console.error('Erro ao salvar avaliações no localStorage:', err);
  }
}

export function getUserReview(mangaId: string): UserMangaReview | null {
  const all = getStoredReviews();
  return all[mangaId] || null;
}

export function saveUserReview(mangaId: string, rating: number, notes: string): UserMangaReview {
  const all = getStoredReviews();
  const entry: UserMangaReview = {
    mangaId,
    rating: Math.max(1, Math.min(5, Math.round(rating))),
    notes: notes.trim(),
    updatedAt: new Date().toISOString()
  };
  all[mangaId] = entry;
  saveStoredReviews(all);
  return entry;
}

export function deleteUserReview(mangaId: string): void {
  const all = getStoredReviews();
  delete all[mangaId];
  saveStoredReviews(all);
}

export function getAllUserReviews(): Record<string, UserMangaReview> {
  return getStoredReviews();
}
