import { supabase } from '@/integrations/supabase/client';
import { AdminUser, MangaItem, CustomChapterData, ChatMessage, ChapterComment } from '../types/manga';

const ADMIN_STORAGE_KEY = 'mangaverse_admin_session';

export function getStoredAdminUser(): AdminUser | null {
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      if (user && user.email === 'denilsonr703@gmail.com') {
        return user;
      }
    }
  } catch (err) {
    console.warn('Error reading admin session:', err);
  }
  return null;
}

export function saveAdminUser(user: AdminUser | null): void {
  if (user) {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }
}

export async function loginAdmin(email: string, _password?: string): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() })
    });
    const data = await res.json();
    if (data.success && data.user) {
      if (data.user.role === 'admin') {
        saveAdminUser(data.user);
      }
      return { success: true, user: data.user };
    }
    return { success: false, error: data.error || 'Falha ao autenticar' };
  } catch (err: any) {
    // Client-side fallback if server offline
    if (email.trim().toLowerCase() === 'denilsonr703@gmail.com') {
      const user: AdminUser = {
        email: 'denilsonr703@gmail.com',
        name: 'Denilson (ADM)',
        role: 'admin',
        token: `denilson_adm_token_${Date.now()}`
      };
      saveAdminUser(user);
      return { success: true, user };
    }
    return { success: false, error: err.message };
  }
}

export function logoutAdmin(): void {
  saveAdminUser(null);
}

// Stats
export async function fetchAdminStats() {
  try {
    const res = await fetch('/api/admin/stats');
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to fetch admin stats:', err);
  }
  return {
    customMangasCount: 0,
    customChaptersCount: 0,
    chatMessagesCount: 0,
    commentsCount: 0,
    bannedUsersCount: 0
  };
}

// Mangas
export async function fetchAdminMangas(): Promise<MangaItem[]> {
  try {
    const res = await fetch('/api/admin/mangas');
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to fetch admin mangas:', err);
  }
  return [];
}

export async function createAdminManga(manga: Partial<MangaItem>): Promise<MangaItem | null> {
  try {
    const res = await fetch('/api/admin/mangas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manga)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to create admin manga:', err);
  }
  return null;
}

export async function updateAdminManga(id: string, updates: Partial<MangaItem>): Promise<MangaItem | null> {
  try {
    const res = await fetch(`/api/admin/mangas/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to update admin manga:', err);
  }
  return null;
}

export async function deleteAdminManga(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/mangas/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete admin manga:', err);
    return false;
  }
}

// Chapters
async function chapterAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchAdminChapters(mangaId?: string): Promise<CustomChapterData[]> {
  try {
    const url = mangaId ? `/api/admin/chapters?mangaId=${encodeURIComponent(mangaId)}` : '/api/admin/chapters';
    const res = await fetch(url);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to fetch admin chapters:', err);
  }
  return [];
}

export async function createAdminChapter(data: {
  mangaId: string;
  chapterNumber: string;
  title?: string;
  pages?: string[];
  scanlationGroup?: string;
}): Promise<CustomChapterData | null> {
  try {
    const res = await fetch('/api/admin/chapters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await chapterAuthHeaders()) },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to create admin chapter:', err);
  }
  return null;
}

export async function updateAdminChapterPages(mangaId: string, chapterNumber: string, pages: string[]): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/chapters/pages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(await chapterAuthHeaders()) },
      body: JSON.stringify({ mangaId, chapterNumber, pages })
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to update admin chapter pages:', err);
    return false;
  }
}

export async function deleteAdminChapter(mangaId: string, chapterNumber: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/admin/chapters?mangaId=${encodeURIComponent(mangaId)}&chapterNumber=${encodeURIComponent(chapterNumber)}`, {
      method: 'DELETE',
      headers: await chapterAuthHeaders()
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete admin chapter:', err);
    return false;
  }
}

// Live Chat
export async function fetchChatMessages(): Promise<ChatMessage[]> {
  try {
    const res = await fetch('/api/chat/messages');
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to fetch chat messages:', err);
  }
  return [];
}

export async function sendChatMessage(data: {
  user: string;
  email?: string;
  role?: 'admin' | 'user';
  avatar?: string;
  text: string;
  replyTo?: { id: string; user: string; text: string };
}): Promise<ChatMessage | null> {
  try {
    const res = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to send chat message:', err);
  }
  return null;
}

export async function deleteChatMessage(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/chat/messages/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete chat message:', err);
    return false;
  }
}

export async function clearChatHistory(): Promise<boolean> {
  try {
    const res = await fetch('/api/chat/clear', { method: 'POST' });
    return res.ok;
  } catch (err) {
    console.warn('Failed to clear chat:', err);
    return false;
  }
}

export async function banUserFromChat(username: string): Promise<{ banned: boolean }> {
  try {
    const res = await fetch('/api/chat/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to ban user:', err);
  }
  return { banned: false };
}

// Chapter Comments
export async function fetchChapterComments(mangaId: string, chapterNumber: string): Promise<ChapterComment[]> {
  try {
    const res = await fetch(`/api/comments?mangaId=${encodeURIComponent(mangaId)}&chapterNumber=${encodeURIComponent(chapterNumber)}`);
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to fetch comments:', err);
  }
  return [];
}

export async function postChapterComment(data: {
  mangaId: string;
  chapterNumber: string;
  user: string;
  email?: string;
  role?: 'admin' | 'user';
  avatar?: string;
  text: string;
  isSpoiler?: boolean;
}): Promise<ChapterComment | null> {
  try {
    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to post comment:', err);
  }
  return null;
}

export async function replyChapterComment(commentId: string, data: {
  user: string;
  email?: string;
  role?: 'admin' | 'user';
  avatar?: string;
  text: string;
}): Promise<ChapterComment | null> {
  try {
    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('Failed to post comment reply:', err);
  }
  return null;
}

export async function likeChapterComment(commentId: string): Promise<number> {
  try {
    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}/like`, {
      method: 'POST'
    });
    if (res.ok) {
      const data = await res.json();
      return data.likes || 0;
    }
  } catch (err) {
    console.warn('Failed to like comment:', err);
  }
  return 0;
}

export async function togglePinChapterComment(commentId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}/pin`, {
      method: 'POST'
    });
    if (res.ok) {
      const data = await res.json();
      return !!data.isPinned;
    }
  } catch (err) {
    console.warn('Failed to pin comment:', err);
  }
  return false;
}

export async function deleteChapterComment(commentId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete comment:', err);
    return false;
  }
}

export interface PixConfigData {
  key: string;
  merchantName: string;
  merchantCity: string;
  description: string;
  suggestedAmounts: number[];
  updatedAt?: string;
}

export async function fetchPixConfig(): Promise<PixConfigData> {
  try {
    const res = await fetch('/api/admin/pix');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to fetch Pix config from server:', err);
  }
  return {
    key: '4970bdb1-d6e0-4a23-9d06-365d1f89687c',
    merchantName: 'MangaVerse Apoio',
    merchantCity: 'SAO PAULO',
    description: 'Apoio aos servidores e acervo MangaVerse',
    suggestedAmounts: [5, 10, 25, 50]
  };
}

export async function savePixConfig(patch: Partial<PixConfigData>): Promise<PixConfigData> {
  try {
    const res = await fetch('/api/admin/pix', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Failed to save Pix config to server:', err);
  }
  return {
    key: patch.key || '4970bdb1-d6e0-4a23-9d06-365d1f89687c',
    merchantName: patch.merchantName || 'MangaVerse Apoio',
    merchantCity: patch.merchantCity || 'SAO PAULO',
    description: patch.description || 'Apoio aos servidores e acervo MangaVerse',
    suggestedAmounts: patch.suggestedAmounts || [5, 10, 25, 50]
  };
}

