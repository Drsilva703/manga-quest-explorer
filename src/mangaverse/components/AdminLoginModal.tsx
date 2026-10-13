import React, { useState } from 'react';
import { ShieldCheck, X, Mail, Lock, CheckCircle2, AlertCircle, LogIn } from 'lucide-react';
import { loginAdmin } from '../services/adminService';
import { AdminUser } from '../types/manga';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUser) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [email, setEmail] = useState('denilsonr703@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      setError('Por favor, informe seu email.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await loginAdmin(email, password);
    setLoading(false);

    if (res.success && res.user) {
      onLoginSuccess(res.user);
      onClose();
    } else {
      setError(res.error || 'Erro ao efetuar login de administrador.');
    }
  };

  const handleQuickAdminLogin = () => {
    setEmail('denilsonr703@gmail.com');
    setPassword('admin123');
    setTimeout(() => {
      handleSubmit();
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 relative overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-indigo-500 to-violet-500" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Acesso Administrador</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30">
                ADM
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Painel de controle para gerenciar mangás, capítulos e chat
            </p>
          </div>
        </div>

        {/* Quick auto-admin badge box */}
        <div className="mb-5 p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 via-indigo-950/30 to-zinc-900 border border-amber-500/20 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Acesso Autorizado para denilsonr703@gmail.com</span>
          </div>
          <p className="text-[11px] text-zinc-300 leading-relaxed">
            Seu email possui privilégios de super-administrador permanentes. Clique no botão de acesso rápido abaixo para entrar instantaneamente.
          </p>
          <button
            type="button"
            onClick={handleQuickAdminLogin}
            disabled={loading}
            className="mt-1 w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Entrar como Admin denilsonr703@gmail.com</span>
          </button>
        </div>

        {/* Manual form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Email do Administrador
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="denilsonr703@gmail.com"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Entrando...' : 'Entrar no Painel'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium border border-zinc-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
