import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Trash2,
  Reply,
  Shield,
  Smile,
  Users,
  Volume2,
  VolumeX,
  Sparkles,
  X
} from 'lucide-react';
import { ChatMessage, AdminUser } from '../types/manga';
import {
  fetchChatMessages,
  sendChatMessage,
  deleteChatMessage
} from '../services/adminService';

interface ChatViewProps {
  adminUser: AdminUser | null;
  onOpenAdminLogin: () => void;
}

const AVATAR_OPTIONS = [
  { name: 'Luffy', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { name: 'Naruto', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
  { name: 'Zoro', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80' },
  { name: 'Sakura', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { name: 'Gojo', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' }
];

const QUICK_EMOJIS = ['🔥', '⚔️', '🍙', '⭐', '💀', '💥', '❤️', '👏', '👒', '☕'];

export const ChatView: React.FC<ChatViewProps> = ({ adminUser, onOpenAdminLogin }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('mangaverse_chat_username') || (adminUser ? 'Denilson (ADM)' : 'Leitor Otaku');
  });
  const [selectedAvatar, setSelectedAvatar] = useState(() => {
    return localStorage.getItem('mangaverse_chat_avatar') || AVATAR_OPTIONS[0].url;
  });
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [onlineCount] = useState(148);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync admin user nickname and avatar
  useEffect(() => {
    if (adminUser) {
      setUserName('Denilson (ADM)');
      setSelectedAvatar(AVATAR_OPTIONS[0].url);
    }
  }, [adminUser]);

  // Save nickname changes
  const handleNameChange = (name: string) => {
    setUserName(name);
    localStorage.setItem('mangaverse_chat_username', name);
  };

  const handleAvatarChange = (url: string) => {
    setSelectedAvatar(url);
    localStorage.setItem('mangaverse_chat_avatar', url);
  };

  // Poll chat messages every 3 seconds for live conversation
  useEffect(() => {
    let mounted = true;
    const loadMessages = async () => {
      const msgs = await fetchChatMessages();
      if (mounted) {
        setMessages(msgs);
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const replyData = replyingTo
      ? { id: replyingTo.id, user: replyingTo.user, text: replyingTo.text }
      : undefined;

    const newMsg = await sendChatMessage({
      user: adminUser ? 'Denilson (ADM)' : userName.trim() || 'Leitor',
      email: adminUser?.email,
      role: adminUser ? 'admin' : 'user',
      avatar: selectedAvatar,
      text: inputText.trim(),
      replyTo: replyData
    });

    setIsSubmitting(false);
    if (newMsg) {
      setMessages((prev) => [...prev, newMsg]);
      setInputText('');
      setReplyingTo(null);
    }
  };

  const handleDeleteMsg = async (id: string) => {
    await deleteChatMessage(id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-6 py-6 pb-24 flex flex-col h-[calc(100vh-4.5rem)]">
      {/* Header bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white">
                Chat da Comunidade
              </h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                AO VIVO
              </span>
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
              <span>Bate-papo em tempo real com fãs de mangá do Brasil</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1 text-zinc-300 font-medium">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                {onlineCount} online
              </span>
            </p>
          </div>
        </div>

        {/* User profile bar / Admin indicator */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {adminUser ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Conectado como Administrador</span>
            </div>
          ) : (
            <button
              onClick={onOpenAdminLogin}
              className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>Entrar como ADM</span>
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Silenciar alertas' : 'Ativar alertas sonoros'}
            className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Messages Stream Container */}
      <div className="flex-1 overflow-y-auto rounded-2xl bg-zinc-950/60 border border-zinc-800/80 p-4 space-y-3 flex flex-col mb-3">
        {messages.length === 0 ? (
          <div className="my-auto text-center py-12 text-zinc-500 text-xs">
            <Sparkles className="w-8 h-8 mx-auto text-indigo-400 mb-2 opacity-60" />
            Nenhuma mensagem recente. Seja o primeiro a puxar conversa!
          </div>
        ) : (
          messages.map((msg) => {
            const isAdm = msg.role === 'admin' || msg.user.includes('ADM');
            const isMe = adminUser ? isAdm : msg.user === userName;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 group transition-all ${
                  isMe ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <img
                  src={msg.avatar}
                  alt={msg.user}
                  className="w-8 h-8 rounded-full object-cover border border-zinc-700 shrink-0 mt-0.5 shadow-sm"
                />

                {/* Message Body */}
                <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {/* Metadata line */}
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] text-zinc-400">
                    <span className="font-bold text-zinc-200">{msg.user}</span>
                    {isAdm && (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-extrabold text-[9px] border border-amber-500/30 flex items-center gap-0.5">
                        <span>👑</span>
                        <span>ADM</span>
                      </span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Quoted message if reply */}
                  {msg.replyTo && (
                    <div className="mb-1 px-3 py-1 rounded-lg bg-zinc-850/80 border-l-2 border-indigo-500 text-[11px] text-zinc-400 max-w-full truncate">
                      <span className="font-semibold text-zinc-300">@{msg.replyTo.user}: </span>
                      <span>{msg.replyTo.text}</span>
                    </div>
                  )}

                  {/* Text bubble */}
                  <div
                    className={`relative px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                      isAdm
                        ? 'bg-gradient-to-r from-amber-950/40 to-zinc-900 border border-amber-500/30 text-amber-100 font-medium'
                        : isMe
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Message Action buttons on hover */}
                  <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-zinc-400">
                    <button
                      onClick={() => {
                        setReplyingTo(msg);
                        inputRef.current?.focus();
                      }}
                      className="hover:text-indigo-400 flex items-center gap-1"
                    >
                      <Reply className="w-3 h-3" />
                      <span>Responder</span>
                    </button>

                    {adminUser && (
                      <button
                        onClick={() => handleDeleteMsg(msg.id)}
                        className="hover:text-red-400 flex items-center gap-1 text-zinc-500"
                        title="Apagar como Administrador"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Excluir</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quoted Reply Banner */}
      {replyingTo && (
        <div className="px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-indigo-500/30 flex items-center justify-between gap-2 text-xs mb-2 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <Reply className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-zinc-400">Respondendo a</span>
            <span className="font-bold text-indigo-300">@{replyingTo.user}:</span>
            <span className="text-zinc-300 truncate">{replyingTo.text}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Profile quick settings (Name & Avatar for non-admin) */}
      {!adminUser && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/60 flex items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 font-medium">Seu Apelido:</span>
            <input
              type="text"
              value={userName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Digite seu nome..."
              maxLength={25}
              className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 hidden sm:inline">Avatar:</span>
            <div className="flex items-center gap-1">
              {AVATAR_OPTIONS.map((av) => (
                <button
                  key={av.name}
                  onClick={() => handleAvatarChange(av.url)}
                  title={av.name}
                  className={`w-6 h-6 rounded-full overflow-hidden border-2 transition-transform ${
                    selectedAvatar === av.url ? 'border-indigo-500 scale-110 shadow-sm' : 'border-zinc-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={av.url} alt={av.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick emoji tray */}
      <div className="flex items-center gap-1 mb-2 px-1 overflow-x-auto shrink-0">
        <span className="text-[10px] text-zinc-500 font-medium mr-1 flex items-center gap-0.5">
          <Smile className="w-3 h-3 text-zinc-400" />
        </span>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => setInputText((prev) => prev + emoji)}
            className="px-2 py-0.5 rounded-lg hover:bg-zinc-850 text-xs transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            adminUser
              ? 'Escreva um comunicado ou mensagem como Administrador...'
              : 'Digite sua mensagem no chat ao vivo...'
          }
          className="flex-1 px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors shadow-inner"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isSubmitting}
          className="p-3 sm:px-5 sm:py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </form>
    </div>
  );
};
