import { MangaItem, ChatMessage, ChapterComment } from '../../mangaverse/types/manga';

// In-memory stores (ported from JSON-file persistence; serverless runtimes have no fs)
const memoryFiles = new Map<string, string>();
const ADMIN_DATA_FILE = 'admin_data.json';
const CHAT_FILE = 'chat_data.json';
const COMMENTS_FILE = 'comments_data.json';
const PIX_FILE = 'pix_data.json';

export interface PixAdminConfig {
  key: string;
  merchantName: string;
  merchantCity: string;
  description: string;
  suggestedAmounts: number[];
  updatedAt: string;
}

const DEFAULT_PIX_CONFIG: PixAdminConfig = {
  key: '4970bdb1-d6e0-4a23-9d06-365d1f89687c',
  merchantName: 'NipponBR Apoio',
  merchantCity: 'SAO PAULO',
  description: 'Apoio aos servidores e acervo NipponBR',
  suggestedAmounts: [5, 10, 25, 50],
  updatedAt: new Date().toISOString()
};

interface AdminStore {
  customMangas: MangaItem[];
  deletedMangaIds: string[];
}

interface ChatStore {
  messages: ChatMessage[];
  bannedUsers: string[];
}

interface CommentsStore {
  comments: ChapterComment[];
}

function safeRead<T>(filePath: string, fallback: T): T {
  try {
    const content = memoryFiles.get(filePath);
    if (content) {
      return JSON.parse(content) as T;
    }
  } catch (err) {
    console.warn(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

function safeWrite(filePath: string, data: any): void {
  try {
    memoryFiles.set(filePath, JSON.stringify(data));
  } catch (err) {
    console.warn(`Error writing ${filePath}:`, err);
  }
}

// Initial seed chat messages
const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome-adm',
    user: 'Denilson (ADM)',
    email: 'denilsonr703@gmail.com',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    text: 'Sejam bem-vindos ao chat oficial do NipponBR! Sintam-se à vontade para compartilhar recomendações e teorias dos capítulos.',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'msg-otaku-1',
    user: 'Renan_Uchiha',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    text: 'O novo capítulo de One Piece tá absurdo demais! A revelação do Gorosei superou qualquer expectativa!',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString()
  },
  {
    id: 'msg-otaku-2',
    user: 'Mariana_JJK',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    text: 'Vocês viram a qualidade do leitor? Carrega muito rápido no celular!',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'msg-otaku-3',
    user: 'Lucas_Solo',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    text: 'Esperando ansioso a atualização do próximo capítulo de Solo Leveling Ragnarok!',
    timestamp: new Date(Date.now() - 1800000).toISOString()
  }
];

// Initial seed comments
const INITIAL_COMMENTS: ChapterComment[] = [
  {
    id: 'comm-init-1',
    mangaId: 'one-piece',
    chapterNumber: '1',
    user: 'Denilson (ADM)',
    email: 'denilsonr703@gmail.com',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    text: 'Capítulo 1 lendário! O início da jornada de Monkey D. Luffy rumo ao Rei dos Piratas. Comentem o que acharam!',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    likes: 12,
    isPinned: true,
    replies: [
      {
        id: 'reply-init-1',
        user: 'Zoro_Solador',
        role: 'user',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        text: 'Nostalgia pura reler este primeiro capítulo com essa qualidade.',
        timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
        likes: 4
      }
    ]
  },
  {
    id: 'comm-init-2',
    mangaId: 'one-piece',
    chapterNumber: '1',
    user: 'Sakura_Reader',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    text: 'A cena do Shanks com o Luffy pequeno sempre me emociona. Obra-prima!',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    likes: 7
  }
];

// Storage state
let adminStore: AdminStore = safeRead<AdminStore>(ADMIN_DATA_FILE, {
  customMangas: [],
  deletedMangaIds: [],
});

let chatStore: ChatStore = safeRead<ChatStore>(CHAT_FILE, {
  messages: INITIAL_CHAT_MESSAGES,
  bannedUsers: []
});

let commentsStore: CommentsStore = safeRead<CommentsStore>(COMMENTS_FILE, {
  comments: INITIAL_COMMENTS
});

// Admin verification
export function isAdminEmail(email?: string): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === 'denilsonr703@gmail.com';
}

export function verifyAdminToken(token?: string): boolean {
  if (!token) return false;
  return token.includes('denilson_adm_valid_token');
}

// Manga Operations
export function getCustomMangas(): MangaItem[] {
  return adminStore.customMangas;
}

export function isMangaDeleted(id: string): boolean {
  return adminStore.deletedMangaIds.includes(id);
}

export function addCustomManga(manga: MangaItem): MangaItem {
  adminStore.deletedMangaIds = adminStore.deletedMangaIds.filter(i => i !== manga.id);
  const existingIdx = adminStore.customMangas.findIndex(m => m.id === manga.id);
  if (existingIdx >= 0) {
    adminStore.customMangas[existingIdx] = manga;
  } else {
    adminStore.customMangas.unshift(manga);
  }
  safeWrite(ADMIN_DATA_FILE, adminStore);
  return manga;
}

export function updateCustomManga(id: string, updates: Partial<MangaItem>): MangaItem | null {
  const existingIdx = adminStore.customMangas.findIndex(m => m.id === id);
  if (existingIdx >= 0) {
    adminStore.customMangas[existingIdx] = { ...adminStore.customMangas[existingIdx], ...updates };
    safeWrite(ADMIN_DATA_FILE, adminStore);
    return adminStore.customMangas[existingIdx];
  }
  return null;
}

export function deleteManga(id: string): boolean {
  if (!adminStore.deletedMangaIds.includes(id)) {
    adminStore.deletedMangaIds.push(id);
  }
  adminStore.customMangas = adminStore.customMangas.filter(m => m.id !== id);
  safeWrite(ADMIN_DATA_FILE, adminStore);
  return true;
}

// Chat Operations
export function getChatMessages(): ChatMessage[] {
  return chatStore.messages.slice(-100);
}

export function addChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'> & { timestamp?: string }): ChatMessage {
  const isAdm = isAdminEmail(msg.email) || msg.role === 'admin';
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user: isAdm ? 'Denilson (ADM)' : msg.user || 'Leitor',
    email: msg.email,
    role: isAdm ? 'admin' : 'user',
    avatar: msg.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    text: msg.text.trim(),
    timestamp: msg.timestamp || new Date().toISOString(),
    replyTo: msg.replyTo
  };

  chatStore.messages.push(newMsg);
  if (chatStore.messages.length > 200) {
    chatStore.messages = chatStore.messages.slice(-200);
  }
  safeWrite(CHAT_FILE, chatStore);
  return newMsg;
}

export function deleteChatMessage(id: string): boolean {
  chatStore.messages = chatStore.messages.filter(m => m.id !== id);
  safeWrite(CHAT_FILE, chatStore);
  return true;
}

export function clearChat(): boolean {
  chatStore.messages = [
    {
      id: `msg-${Date.now()}`,
      user: 'Denilson (ADM)',
      email: 'denilsonr703@gmail.com',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      text: 'O histórico do chat foi reiniciado pela moderação.',
      timestamp: new Date().toISOString()
    }
  ];
  safeWrite(CHAT_FILE, chatStore);
  return true;
}

export function isUserBanned(usernameOrEmail: string): boolean {
  return chatStore.bannedUsers.includes(usernameOrEmail.toLowerCase().trim());
}

export function toggleBanUser(usernameOrEmail: string): { banned: boolean } {
  const norm = usernameOrEmail.toLowerCase().trim();
  const idx = chatStore.bannedUsers.indexOf(norm);
  let banned = false;
  if (idx >= 0) {
    chatStore.bannedUsers.splice(idx, 1);
    banned = false;
  } else {
    chatStore.bannedUsers.push(norm);
    banned = true;
  }
  safeWrite(CHAT_FILE, chatStore);
  return { banned };
}

// Comments Operations
export function getChapterComments(mangaId: string, chapterNumber: string): ChapterComment[] {
  const filtered = commentsStore.comments.filter(
    c => c.mangaId === mangaId && String(c.chapterNumber) === String(chapterNumber)
  );

  return filtered.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

export function addChapterComment(
  commentData: Omit<ChapterComment, 'id' | 'timestamp' | 'likes'>
): ChapterComment {
  const isAdm = isAdminEmail(commentData.email) || commentData.role === 'admin';
  const newComment: ChapterComment = {
    ...commentData,
    id: `comm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user: isAdm ? 'Denilson (ADM)' : commentData.user || 'Leitor',
    role: isAdm ? 'admin' : 'user',
    timestamp: new Date().toISOString(),
    likes: 0,
    replies: []
  };

  commentsStore.comments.unshift(newComment);
  safeWrite(COMMENTS_FILE, commentsStore);
  return newComment;
}

export function addCommentReply(
  commentId: string,
  replyData: { user: string; email?: string; role?: 'admin' | 'user'; avatar: string; text: string }
): ChapterComment | null {
  const comment = commentsStore.comments.find(c => c.id === commentId);
  if (!comment) return null;

  const isAdm = isAdminEmail(replyData.email) || replyData.role === 'admin';
  const reply = {
    id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user: isAdm ? 'Denilson (ADM)' : replyData.user || 'Leitor',
    email: replyData.email,
    role: isAdm ? ('admin' as const) : ('user' as const),
    avatar: replyData.avatar,
    text: replyData.text.trim(),
    timestamp: new Date().toISOString(),
    likes: 0
  };

  if (!comment.replies) comment.replies = [];
  comment.replies.push(reply);
  safeWrite(COMMENTS_FILE, commentsStore);
  return comment;
}

export function likeComment(commentId: string): number {
  const comment = commentsStore.comments.find(c => c.id === commentId);
  if (comment) {
    comment.likes = (comment.likes || 0) + 1;
    safeWrite(COMMENTS_FILE, commentsStore);
    return comment.likes;
  }
  return 0;
}

export function togglePinComment(commentId: string): boolean {
  const comment = commentsStore.comments.find(c => c.id === commentId);
  if (comment) {
    comment.isPinned = !comment.isPinned;
    safeWrite(COMMENTS_FILE, commentsStore);
    return comment.isPinned;
  }
  return false;
}

export function deleteComment(commentId: string): boolean {
  const len = commentsStore.comments.length;
  commentsStore.comments = commentsStore.comments.filter(c => c.id !== commentId);
  safeWrite(COMMENTS_FILE, commentsStore);
  return commentsStore.comments.length < len;
}

export function getStats() {
  return {
    customMangasCount: adminStore.customMangas.length,
    customChaptersCount: 0,
    chatMessagesCount: chatStore.messages.length,
    commentsCount: commentsStore.comments.length,
    bannedUsersCount: chatStore.bannedUsers.length
  };
}

export function getPixConfig(): PixAdminConfig {
  return safeRead<PixAdminConfig>(PIX_FILE, DEFAULT_PIX_CONFIG);
}

export function updatePixConfig(patch: Partial<PixAdminConfig>): PixAdminConfig {
  const current = getPixConfig();
  const updated: PixAdminConfig = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  safeWrite(PIX_FILE, updated);
  return updated;
}

