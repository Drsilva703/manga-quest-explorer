import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  ThumbsUp,
  Reply,
  Pin,
  Trash2,
  AlertTriangle,
  Eye,
  Shield,
  Smile,
  CheckCircle2
} from 'lucide-react';
import { ChapterComment, AdminUser } from '../types/manga';
import {
  fetchChapterComments,
  postChapterComment,
  replyChapterComment,
  likeChapterComment,
  togglePinChapterComment,
  deleteChapterComment
} from '../services/adminService';

interface ChapterCommentsProps {
  mangaId: string;
  chapterNumber: string;
  mangaTitle: string;
  adminUser: AdminUser | null;
  onOpenAdminLogin: () => void;
}

const AVATARS = [
  { name: 'Luffy', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { name: 'Naruto', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
  { name: 'Zoro', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80' },
  { name: 'Sakura', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' }
];

export const ChapterComments: React.FC<ChapterCommentsProps> = ({
  mangaId,
  chapterNumber,
  mangaTitle,
  adminUser,
  onOpenAdminLogin
}) => {
  const [comments, setComments] = useState<ChapterComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('mangaverse_comment_name') || (adminUser ? 'Denilson (ADM)' : 'Leitor');
  });
  const [avatar, setAvatar] = useState(() => {
    return localStorage.getItem('mangaverse_comment_avatar') || AVATARS[0].url;
  });
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'likes'>('newest');

  useEffect(() => {
    if (adminUser) {
      setUserName('Denilson (ADM)');
      setAvatar(AVATARS[0].url);
    }
  }, [adminUser]);

  const loadComments = async () => {
    setLoading(true);
    const data = await fetchChapterComments(mangaId, chapterNumber);
    setComments(data);
    setLoading(false);
  };

  useEffect(() => {
    loadComments();
  }, [mangaId, chapterNumber]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;

    localStorage.setItem('mangaverse_comment_name', userName);
    localStorage.setItem('mangaverse_comment_avatar', avatar);

    const posted = await postChapterComment({
      mangaId,
      chapterNumber,
      user: adminUser ? 'Denilson (ADM)' : userName.trim() || 'Leitor',
      email: adminUser?.email,
      role: adminUser ? 'admin' : 'user',
      avatar,
      text: newText.trim(),
      isSpoiler
    });

    if (posted) {
      setComments((prev) => [posted, ...prev]);
      setNewText('');
      setIsSpoiler(false);
    }
  };

  const handlePostReply = async (commentId: string) => {
    if (!replyText.trim()) return;

    const updated = await replyChapterComment(commentId, {
      user: adminUser ? 'Denilson (ADM)' : userName.trim() || 'Leitor',
      email: adminUser?.email,
      role: adminUser ? 'admin' : 'user',
      avatar,
      text: replyText.trim()
    });

    if (updated) {
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setReplyingToId(null);
      setReplyText('');
    }
  };

  const handleLike = async (commentId: string) => {
    const newLikes = await likeChapterComment(commentId);
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, likes: newLikes } : c))
    );
  };

  const handlePin = async (commentId: string) => {
    const isPinned = await togglePinChapterComment(commentId);
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, isPinned } : c))
    );
  };

  const handleDelete = async (commentId: string) => {
    await deleteChapterComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const sortedComments = [...comments].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    if (sortBy === 'likes') {
      return (b.likes || 0) - (a.likes || 0);
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="w-full max-w-4xl mx-auto mt-14 mb-10 px-4 sm:px-6">
      <div className="p-6 rounded-3xl bg-zinc-950/90 border border-zinc-800 shadow-2xl backdrop-blur-md">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-6 border-b border-zinc-800/80">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <span>Comentários · Capítulo {chapterNumber}</span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold">
                {comments.length}
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Compartilhe suas reações e opiniões sobre este capítulo de {mangaTitle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs">
              <button
                onClick={() => setSortBy('newest')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  sortBy === 'newest' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Mais Recentes
              </button>
              <button
                onClick={() => setSortBy('likes')}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                  sortBy === 'likes' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Mais Curtidos
              </button>
            </div>

            {!adminUser && (
              <button
                onClick={onOpenAdminLogin}
                className="p-2 rounded-xl text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 transition-colors"
                title="Acesso Administrador"
              >
                <Shield className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Comment Form */}
        <form onSubmit={handlePostComment} className="pt-6 pb-6 border-b border-zinc-800/60 space-y-3">
          {/* User Info & Avatar Selection */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <img
                src={avatar}
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover border border-zinc-700"
              />
              <input
                type="text"
                disabled={!!adminUser}
                value={adminUser ? 'Denilson (ADM)' : userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Seu nome / apelido..."
                maxLength={25}
                className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white font-semibold focus:outline-none focus:border-indigo-500 w-36 sm:w-48"
              />
              {adminUser && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[10px] border border-amber-500/30">
                  ADM
                </span>
              )}
            </div>

            {!adminUser && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-zinc-500">Avatar:</span>
                {AVATARS.map((av) => (
                  <button
                    key={av.name}
                    type="button"
                    onClick={() => setAvatar(av.url)}
                    className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-transform ${
                      avatar === av.url ? 'border-indigo-500 scale-110' : 'border-zinc-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Area */}
          <div className="relative">
            <textarea
              rows={3}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="O que você achou deste capítulo? Deixe seu comentário..."
              className="w-full p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400 hover:text-zinc-300">
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Contém Spoilers do capítulo</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={!newText.trim()}
              className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publicar Comentário</span>
            </button>
          </div>
        </form>

        {/* Comments Feed */}
        <div className="pt-6 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              Carregando comentários...
            </div>
          ) : sortedComments.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs">
              Nenhum comentário publicado para este capítulo ainda. Seja o primeiro a comentar!
            </div>
          ) : (
            sortedComments.map((comm) => {
              const isAdm = comm.role === 'admin' || comm.user.includes('ADM');
              const showSpoiler = revealedSpoilers[comm.id];

              return (
                <div
                  key={comm.id}
                  className={`p-4 rounded-2xl transition-all ${
                    comm.isPinned
                      ? 'bg-indigo-950/20 border border-indigo-500/30'
                      : 'bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-750'
                  }`}
                >
                  {/* Comment Author line */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={comm.avatar}
                        alt={comm.user}
                        className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{comm.user}</span>
                          {isAdm && (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[9px] border border-amber-500/30">
                              👑 ADM
                            </span>
                          )}
                          {comm.isPinned && (
                            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[9px] flex items-center gap-0.5">
                              <Pin className="w-2.5 h-2.5" />
                              Fixado
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-500 block -mt-0.5">
                          {new Date(comm.timestamp).toLocaleDateString()} às{' '}
                          {new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Admin options */}
                    {adminUser && (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <button
                          onClick={() => handlePin(comm.id)}
                          title={comm.isPinned ? 'Desafixar comentário' : 'Fixar comentário'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            comm.isPinned ? 'text-indigo-400' : 'hover:text-white'
                          }`}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(comm.id)}
                          title="Remover comentário"
                          className="p-1.5 rounded-lg hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comment Text with Spoiler Blur Protection */}
                  {comm.isSpoiler && !showSpoiler ? (
                    <div className="my-2 p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-amber-300 font-medium">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Este comentário contém spoilers do capítulo.</span>
                      </div>
                      <button
                        onClick={() =>
                          setRevealedSpoilers((prev) => ({ ...prev, [comm.id]: true }))
                        }
                        className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Mostrar</span>
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-300 leading-relaxed my-2 whitespace-pre-wrap">
                      {comm.text}
                    </p>
                  )}

                  {/* Interaction buttons */}
                  <div className="flex items-center gap-4 text-xs text-zinc-400 mt-3 pt-2 border-t border-zinc-800/40">
                    <button
                      onClick={() => handleLike(comm.id)}
                      className="flex items-center gap-1.5 hover:text-indigo-400 font-medium transition-colors"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{comm.likes || 0}</span>
                    </button>

                    <button
                      onClick={() =>
                        setReplyingToId(replyingToId === comm.id ? null : comm.id)
                      }
                      className="flex items-center gap-1.5 hover:text-indigo-400 font-medium transition-colors"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>Responder</span>
                    </button>
                  </div>

                  {/* Reply Input Form */}
                  {replyingToId === comm.id && (
                    <div className="mt-3 pl-4 border-l-2 border-indigo-500/50 space-y-2 animate-fade-in">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Responder a @${comm.user}...`}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReplyingToId(null)}
                          className="px-3 py-1 rounded-lg text-xs text-zinc-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePostReply(comm.id)}
                          disabled={!replyText.trim()}
                          className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold"
                        >
                          Enviar Resposta
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Threaded Replies */}
                  {comm.replies && comm.replies.length > 0 && (
                    <div className="mt-3 pl-4 sm:pl-6 space-y-2 border-l-2 border-zinc-800">
                      {comm.replies.map((rep) => {
                        const isRepAdm = rep.role === 'admin' || rep.user.includes('ADM');
                        return (
                          <div key={rep.id} className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/60">
                            <div className="flex items-center gap-2 mb-1">
                              <img
                                src={rep.avatar}
                                alt={rep.user}
                                className="w-5 h-5 rounded-full object-cover border border-zinc-700"
                              />
                              <span className="font-bold text-xs text-white">{rep.user}</span>
                              {isRepAdm && (
                                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[8px] border border-amber-500/30">
                                  ADM
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-500">
                                {new Date(rep.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-300 pl-7">{rep.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
