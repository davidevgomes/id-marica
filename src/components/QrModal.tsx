import { QRCodeSVG } from 'qrcode.react';
import { Copy, Smartphone, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface QrModalProps {
  open: boolean;
  onClose: () => void;
}

export function QrModal({ open, onClose }: QrModalProps) {
  const [targetMode, setTargetMode] = useState<'portal' | 'gestao'>('portal');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const baseUrl = `${window.location.origin}${window.location.pathname}`;

  const shareUrl =
    targetMode === 'portal' ? `${baseUrl}#cadastro` : `${baseUrl}?painel=gestao`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[#072933]/75 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-dialog-title"
        className="anim-modal w-full max-w-md rounded-[12px] border border-[#DCE3E8] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-[#D93829]" />
            <div>
              <h3 id="qr-dialog-title" className="font-display text-lg font-extrabold text-[#0B3B49]">
                Abrir no celular ao vivo
              </h3>
              <p className="text-xs text-[#52646D]">
                Aponte a câmera do celular para acessar direto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar janela"
            className="rounded-[6px] p-1.5 text-[#52646D] hover:bg-[#F4F6F8] hover:text-[#0B3B49] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-1.5 rounded-[8px] border border-[#DCE3E8] bg-[#F4F6F8] p-1">
          <button
            onClick={() => setTargetMode('portal')}
            className={`rounded-[6px] py-2 text-xs font-bold transition-colors cursor-pointer ${
              targetMode === 'portal'
                ? 'bg-[#0B3B49] text-white'
                : 'text-[#52646D] hover:text-[#0B3B49]'
            }`}
          >
            Portal do cidadão
          </button>
          <button
            onClick={() => setTargetMode('gestao')}
            className={`rounded-[6px] py-2 text-xs font-bold transition-colors cursor-pointer ${
              targetMode === 'gestao'
                ? 'bg-[#0B3B49] text-white'
                : 'text-[#52646D] hover:text-[#0B3B49]'
            }`}
          >
            Painel de gestão
          </button>
        </div>

        <div className="mt-5 flex flex-col items-center rounded-[8px] border border-[#DCE3E8] bg-[#F4F6F8] p-6">
          <div className="rounded-[8px] border border-[#DCE3E8] bg-white p-4">
            <QRCodeSVG
              value={shareUrl}
              size={200}
              bgColor="#ffffff"
              fgColor="#0B3B49"
              level="M"
            />
          </div>
          <p className="mt-3 text-center text-xs font-medium text-[#52646D]">
            {targetMode === 'portal'
              ? 'Abre direto na área de cadastro e prova de vida do cidadão.'
              : 'Abre o painel de gestão territorial com mapa e integrações.'}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-[6px] border border-[#DCE3E8] bg-[#F4F6F8] px-3 py-2">
          <span className="flex-1 truncate text-xs font-medium text-[#11222B]">
            {shareUrl}
          </span>
          <button
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1.5 rounded-[6px] bg-[#0B3B49] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#072933] cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Copiado' : 'Copiar link'}
          </button>
        </div>
      </div>
    </div>
  );
}
