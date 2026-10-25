import React from 'react';
import { Heart, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';

interface FooterProps {
  onOpenSupport: () => void;
  onOpenSettings: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSupport, onOpenSettings }) => {
  return (
    <footer className="w-full border-t border-zinc-800/80 bg-zinc-950 py-10 px-4 sm:px-6 mb-16 md:mb-0">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand and Description */}
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">
              Nippon<span className="text-indigo-400">BR</span>
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-md">
            Seu universo de livros, mangás, manhwas e quadrinhos digitais.
            Prioridade total para traduções em português brasileiro (PT-BR) com alta definição.
          </p>
          <div className="flex items-center justify-center md:justify-start gap-2 text-[11px] text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>NipponBR · Leitor digital rápido, responsivo e gratuito.</span>
          </div>
        </div>

        {/* Quick Links and Support */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-xs">
          <button
            onClick={onOpenSupport}
            className="px-4 py-2 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 font-semibold transition-all flex items-center gap-1.5"
          >
            <Heart className="w-4 h-4 fill-pink-400/40 text-pink-400" />
            <span>Apoiar Projeto via Pix</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="px-3 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Preferências & Backup
          </button>
        </div>
      </div>
    </footer>
  );
};
