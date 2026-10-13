import React from 'react';
import { Heart, Sparkles, X } from 'lucide-react';
import { getStoredSettings } from '../services/storage';

interface AdPlaceholderProps {
  type: 'leaderboard' | 'rectangle' | 'reader-banner';
  onOpenSupport?: () => void;
  className?: string;
}

export const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ type, onOpenSupport, className = '' }) => {
  const settings = getStoredSettings();

  if (settings.hideAds) {
    return null;
  }

  if (type === 'leaderboard') {
    return (
      <aside aria-label="Espaço publicitário" className={`w-full max-w-4xl mx-auto my-6 px-4 ${className}`}>
        <div className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 p-4 shadow-inner text-center">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] tracking-widest uppercase font-semibold text-zinc-400">
                  Espaço Publicitário
                </span>
                <p className="text-sm font-medium text-zinc-200">
                  Ajude a manter os servidores do MangaVerse velozes e sem custos.
                </p>
              </div>
            </div>

            {onOpenSupport && (
              <button
                onClick={onOpenSupport}
                className="shrink-0 px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 text-xs font-semibold border border-indigo-500/30 transition-all flex items-center gap-1.5"
              >
                <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/30" />
                Apoiar via Pix & Remover Banners
              </button>
            )}
          </div>
        </div>
      </aside>
    );
  }

  if (type === 'rectangle') {
    return (
      <aside aria-label="Espaço publicitário" className={`w-full my-6 ${className}`}>
        <div className="w-full max-w-[340px] mx-auto min-h-[260px] rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col items-center justify-center text-center shadow-lg">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 mb-2">
            Anúncio 300x250
          </span>
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-zinc-200 mb-1">
            Gosta de ler no MangaVerse?
          </h4>
          <p className="text-xs text-zinc-400 mb-4 max-w-[240px]">
            Leitura rápida em alta definição, sem anúncios invasivos.
          </p>
          {onOpenSupport && (
            <button
              onClick={onOpenSupport}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <Heart className="w-3.5 h-3.5 text-pink-300 fill-pink-300/40" />
              Apoie com qualquer valor
            </button>
          )}
        </div>
      </aside>
    );
  }

  // reader-banner
  return (
    <aside aria-label="Espaço publicitário" className={`w-full py-4 px-4 bg-zinc-950/90 border-t border-zinc-800/80 text-center ${className}`}>
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-left">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-zinc-400 block">
            Espaço de Patrocínio
          </span>
          <p className="text-xs text-zinc-300">
            Fim do capítulo! Gostou da leitura? Considere apoiar o projeto com um Pix.
          </p>
        </div>
        {onOpenSupport && (
          <button
            onClick={onOpenSupport}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold transition-all shadow flex items-center gap-1.5"
          >
            <Heart className="w-3.5 h-3.5 fill-white/40" />
            Apoiar via Pix
          </button>
        )}
      </div>
    </aside>
  );
};
