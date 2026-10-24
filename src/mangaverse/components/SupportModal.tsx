import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Heart,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Smartphone,
  Info,
  DollarSign
} from 'lucide-react';
import { getStoredSettings, saveStoredSettings } from '../services/storage';
import {
  OFFICIAL_PIX_KEY,
  generatePixPayload,
  getPixQrCodeUrl,
  formatPixDisplayKey
} from '../services/pixHelper';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVipToggled?: (isVip: boolean) => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose, onVipToggled }) => {
  const [copyState, setCopyState] = useState<'none' | 'key' | 'payload'>('none');
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [isCustomAmount, setIsCustomAmount] = useState<boolean>(false);
  const [pixKey, setPixKey] = useState<string>(OFFICIAL_PIX_KEY);
  const [merchantName, setMerchantName] = useState<string>('NipponBR Apoio');

  const settings = getStoredSettings();
  const [vipActive, setVipActive] = useState<boolean>(settings.hideAds);

  // Load latest Pix configuration from backend or fallback to local storage
  useEffect(() => {
    if (isOpen) {
      const localKey = settings.customPixKey || OFFICIAL_PIX_KEY;
      setPixKey(localKey);

      fetch('/api/pix/config')
        .then(res => res.json())
        .then(data => {
          if (data && data.key) {
            setPixKey(data.key);
            if (data.merchantName) setMerchantName(data.merchantName);
          }
        })
        .catch(() => {
          // Keep local key
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Active numeric amount
  const effectiveAmount = isCustomAmount
    ? Math.max(0, parseFloat(customAmountInput.replace(',', '.')) || 0)
    : selectedAmount;

  // Official Banco Central BR Code EMV payload with valid CRC16
  const pixPayload = generatePixPayload({
    key: pixKey,
    amount: effectiveAmount > 0 ? effectiveAmount : undefined,
    merchantName,
    merchantCity: 'SAO PAULO'
  });

  const qrCodeUrl = getPixQrCodeUrl(pixPayload, 260);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopyState('key');
    setTimeout(() => setCopyState('none'), 3000);
  };

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopyState('payload');
    setTimeout(() => setCopyState('none'), 3000);
  };

  const handleToggleVip = () => {
    const updated = !vipActive;
    setVipActive(updated);
    saveStoredSettings({ ...settings, hideAds: updated });
    if (onVipToggled) onVipToggled(updated);
  };

  const selectPreset = (val: number) => {
    setIsCustomAmount(false);
    setSelectedAmount(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
        className="relative w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 p-5 sm:p-7 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Fechar modal"
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-indigo-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0">
            <Heart className="w-6 h-6 fill-pink-500/30" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 id="support-modal-title" className="text-xl font-black tracking-tight text-white">
                Apoie o NipponBR
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                Pix Oficial
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Contribuição voluntária direta sem intermediários ou taxas
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-zinc-300 mb-5 leading-relaxed">
          Sua doação garante a manutenção dos servidores em alta velocidade, tradução e upload contínuo de novos capítulos em português, mantendo a plataforma livre de anúncios invasivos.
        </p>

        {/* Value selector presets */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              Escolha ou personalize o valor
            </label>
            <span className="text-[11px] text-pink-400 font-medium">
              {effectiveAmount > 0 ? `Valor definido: R$ ${effectiveAmount.toFixed(2)}` : 'Qualquer valor livre'}
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {[5, 10, 25, 50].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => selectPreset(val)}
                className={`py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                  !isCustomAmount && selectedAmount === val
                    ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white border-pink-500 shadow-md shadow-pink-600/20 scale-[1.02]'
                    : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                R$ {val}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setIsCustomAmount(true)}
              className={`py-2 px-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border col-span-4 sm:col-span-1 ${
                isCustomAmount
                  ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white border-pink-500 shadow-md shadow-pink-600/20 scale-[1.02]'
                  : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              Outro
            </button>
          </div>

          {/* Custom amount input if selected */}
          {isCustomAmount && (
            <div className="mt-2.5 flex items-center gap-2 p-2 bg-zinc-950 rounded-xl border border-zinc-800 animate-in fade-in">
              <span className="text-xs font-bold text-zinc-400 pl-2">R$</span>
              <input
                type="number"
                min="1"
                step="0.5"
                placeholder="Ex: 15.00"
                value={customAmountInput}
                onChange={(e) => setCustomAmountInput(e.target.value)}
                className="flex-1 bg-transparent border-0 text-sm font-semibold text-white focus:outline-none focus:ring-0 placeholder:text-zinc-600"
              />
              <span className="text-[11px] text-zinc-500 pr-2">
                QR Code atualiza instantaneamente
              </span>
            </div>
          )}
        </div>

        {/* QR Code and Pix Copy Section */}
        <div className="bg-zinc-950 rounded-2xl p-4 sm:p-5 border border-zinc-800/90 mb-5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5">
            {/* Real Camera-Scannable QR Code */}
            <div className="p-2.5 bg-white rounded-2xl shrink-0 shadow-lg flex flex-col items-center justify-center border border-zinc-200">
              <img
                src={qrCodeUrl}
                alt="QR Code Pix Oficial NipponBR"
                className="w-32 h-32 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="flex items-center gap-1 mt-1 text-[10px] font-black text-zinc-900 uppercase tracking-tight">
                <QrCode className="w-3 h-3 text-emerald-600" />
                <span>Pix {effectiveAmount > 0 ? `· R$ ${effectiveAmount.toFixed(2)}` : '· Livre'}</span>
              </div>
            </div>

            {/* Keys and Copy Actions */}
            <div className="flex-1 w-full space-y-3">
              {/* Random Pix Key Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-zinc-400 font-semibold flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-pink-400" />
                    Chave Pix Oficial (Aleatória):
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">EVP / UUID</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <code className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-indigo-300 font-mono select-all overflow-hidden text-ellipsis whitespace-nowrap">
                    {formatPixDisplayKey(pixKey)}
                  </code>
                  <button
                    onClick={handleCopyKey}
                    type="button"
                    className={`px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shrink-0 ${
                      copyState === 'key'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02]'
                        : 'bg-zinc-800 hover:bg-zinc-750 text-white border border-zinc-700/80 hover:border-pink-500/50'
                    }`}
                    title="Copiar apenas a chave Pix"
                  >
                    {copyState === 'key' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copyState === 'key' ? 'Copiada!' : 'Copiar Chave'}</span>
                  </button>
                </div>
              </div>

              {/* Pix Copia e Cola Button (Banco Central Standard) */}
              <div>
                <button
                  onClick={handleCopyPayload}
                  type="button"
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 border shadow-sm ${
                    copyState === 'payload'
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/30 scale-[1.01]'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-500/50 shadow-emerald-900/20'
                  }`}
                  title="Copiar código Pix Copia e Cola para colar no app do seu banco"
                >
                  {copyState === 'payload' ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Código Copia e Cola Copiado! Cole no App do Banco</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-emerald-200" />
                      <span>Copiar Pix Copia e Cola (Código Completo)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Guide */}
              <div className="flex items-start gap-1.5 text-[11px] text-zinc-400 pt-0.5">
                <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                <p className="leading-tight">
                  Compatível com <strong className="text-zinc-300">Nubank, Inter, Itaú, Santander, Bradesco, Mercado Pago, Caixa e PicPay</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Alternative Support Links */}
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          <a
            href="https://apoia.se"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[130px] px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Apoia.se Mensal</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>

          <a
            href="https://kafe.social"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[130px] px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-semibold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
          >
            <span>☕ Pague um Café</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
        </div>

        {/* Apoiador VIP Reward Toggle */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-white block">
                Modo Apoiador VIP (Sem Anúncios)
              </span>
              <p className="text-[11px] text-indigo-200/70">
                Ative após apoiar para navegar sem avisos ou placeholders.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleVip}
            aria-label="Ativar Modo VIP"
            className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none shrink-0 ${
              vipActive ? 'bg-indigo-600' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                vipActive ? 'transform translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
