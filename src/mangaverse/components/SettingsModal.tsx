import React, { useState, useRef } from 'react';
import { X, Moon, Sun, Monitor, ShieldAlert, Globe, BookOpen, Layers, Download, Upload, Check, Sparkles } from 'lucide-react';
import { UserSettings } from '../types/manga';
import { getStoredSettings, saveStoredSettings, exportBackupJson, importBackupJson } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged: (newSettings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSettingsChanged }) => {
  const [settings, setSettings] = useState<UserSettings>(getStoredSettings());
  const [saveToast, setSaveToast] = useState(false);
  const [backupToast, setBackupToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const update = <K extends keyof UserSettings>(key: K, val: UserSettings[K]) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    saveStoredSettings(updated);
    onSettingsChanged(updated);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleExportBackup = () => {
    const json = exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mangaverse-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupToast('Backup exportado com sucesso!');
    setTimeout(() => setBackupToast(null), 3000);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackupJson(content);
      if (success) {
        setBackupToast('Backup restaurado com sucesso! Atualizando...');
        const fresh = getStoredSettings();
        setSettings(fresh);
        onSettingsChanged(fresh);
        setTimeout(() => {
          setBackupToast(null);
          window.location.reload();
        }, 1200);
      } else {
        setBackupToast('Falha ao restaurar: arquivo JSON inválido');
        setTimeout(() => setBackupToast(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="relative w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Fechar modal"
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h3 id="settings-modal-title" className="text-xl font-bold tracking-tight text-white">
              Configurações & Preferências
            </h3>
            <p className="text-xs text-zinc-400">
              Personalize sua experiência de leitura e navegação
            </p>
          </div>
        </div>

        {saveToast && (
          <div className="mb-4 py-2 px-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <Check className="w-3.5 h-3.5" />
            <span>Preferências salvas localmente!</span>
          </div>
        )}

        {backupToast && (
          <div className="mb-4 py-2 px-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{backupToast}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* Tema Visual */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Aparência do Tema
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => update('theme', 'dark')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.theme === 'dark'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700/60 hover:bg-zinc-750'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Escuro (Padrão)</span>
              </button>
              <button
                onClick={() => update('theme', 'amoled')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.theme === 'amoled'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-black text-zinc-300 border-zinc-800 hover:bg-zinc-950'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-black border border-zinc-600" />
                <span>Preto AMOLED</span>
              </button>
              <button
                onClick={() => update('theme', 'light')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.theme === 'light'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700/60 hover:bg-zinc-750'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Claro</span>
              </button>
            </div>
          </div>

          {/* Modo de Leitura Padrão */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Modo Padrão do Leitor
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => update('readingMode', 'webtoon')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.readingMode === 'webtoon'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700/60 hover:bg-zinc-750'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Webtoon (Rolagem Vertical)</span>
              </button>
              <button
                onClick={() => update('readingMode', 'traditional')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.readingMode === 'traditional'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700/60 hover:bg-zinc-750'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Tradicional (Página a Página)</span>
              </button>
            </div>
          </div>

          {/* Direção de Leitura */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Direção no Modo Tradicional
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => update('readingDirection', 'rtl')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.readingDirection === 'rtl'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700/60'
                }`}
              >
                Direita {'->'} Esquerda (RTL - Mangá Tradicional)
              </button>
              <button
                onClick={() => update('readingDirection', 'ltr')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.readingDirection === 'ltr'
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700/60'
                }`}
              >
                Esquerda {'->'} Direita (LTR - Ocidental)
              </button>
            </div>
          </div>

          {/* Idioma Prioritário & Qualidade de Imagem */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Idioma Prioritário
              </label>
              <select
                value={settings.defaultLanguage}
                onChange={(e) => update('defaultLanguage', e.target.value as any)}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="pt-br">Português Brasileiro (PT-BR) Prioritário</option>
                <option value="en">Inglês (EN)</option>
                <option value="es">Espanhol (ES)</option>
                <option value="all">Todos os idiomas disponíveis</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Qualidade das Imagens
              </label>
              <select
                value={settings.imageQuality || 'original'}
                onChange={(e) => update('imageQuality', e.target.value as any)}
                className="w-full py-2.5 px-3 rounded-xl bg-zinc-800 border border-zinc-700 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="original">Alta Resolução (Original)</option>
                <option value="medium">Equilibrada (Padrão)</option>
                <option value="low">Econômica (Carregamento Ultrarrápido)</option>
              </select>
            </div>
          </div>

          {/* Filtro NSFW Toggle */}
          <div className="p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-white block">
                  Exibir Conteúdo Adulto / NSFW (+18)
                </span>
                <p className="text-[11px] text-zinc-400">
                  Por padrão, títulos com classificação adulta ou erótica ficam ocultos.
                </p>
              </div>
            </div>
            <button
              onClick={() => update('nsfwEnabled', !settings.nsfwEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
                settings.nsfwEnabled ? 'bg-amber-600' : 'bg-zinc-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.nsfwEnabled ? 'transform translate-x-6' : ''
                }`}
              />
            </button>
          </div>

          {/* Fontes & APIs em Português */}
          <div className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>APIs em Português (PT-BR) Integradas</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                100% PT-BR Ativo
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              O catálogo prioriza exclusivamente capítulos e sinopses traduzidos por scanlations brasileiras:
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-300">
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-zinc-850">
                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">MangaDex Brasil (PT-BR)</span>
              </div>
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-zinc-850">
                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">ComicK Brasil (PT-BR)</span>
              </div>
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-zinc-850">
                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Scans BR (Mugiwara, Neox, YSY)</span>
              </div>
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-zinc-850">
                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">Tradução Dinâmica PT-BR</span>
              </div>
            </div>
          </div>

          {/* Backup e Restauração */}
          <div className="pt-2 border-t border-zinc-800">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 block">
              Backup da Biblioteca & Histórico
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportBackup}
                className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-medium text-zinc-200 hover:text-white flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Exportar Backup (JSON)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-xs font-medium text-zinc-200 hover:text-white flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Importar Backup</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
