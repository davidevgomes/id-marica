import { Download, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

type InstallPrompt = Event & {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function PwaInstall() {
  const [installed, setInstalled] = useState(() =>
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && navigator.standalone === true)
  );
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const rememberPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const finishInstall = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', rememberPrompt);
    window.addEventListener('appinstalled', finishInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', rememberPrompt);
      window.removeEventListener('appinstalled', finishInstall);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    setInstallPrompt(null);
    try {
      await installPrompt.prompt();
    } catch {
      // As instruções do navegador continuam disponíveis.
    }
  };

  return (
    <section id="instalar" tabIndex={-1} aria-labelledby="install-title" className="scroll-mt-4 border-t border-[#DCE3E8] bg-[#EDF4F6]">
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-start justify-between gap-4 px-4 py-8 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0B3B49] text-white"><Smartphone aria-hidden="true" className="size-5" /></span>
          <div>
            <h2 id="install-title" className="font-display text-xl font-extrabold text-[#0B3B49]">ID Maricá na tela inicial</h2>
            <div aria-live="polite" className="mt-1 text-sm leading-relaxed text-[#405661]">
              {installed ? (
                <p>O ID Maricá já está instalado.</p>
              ) : (
                <>
                  <p><strong>Android:</strong> No Chrome, abra o menu e toque em Adicionar à tela inicial ou Instalar app.</p>
                  <p><strong>iPhone:</strong> No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início. Se aparecer, ative Abrir como App.</p>
                </>
              )}
            </div>
          </div>
        </div>
        {!installed && installPrompt && (
          <button type="button" onClick={() => void install()} className="citizen-primary inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-bold">
            <Download aria-hidden="true" className="size-4" />
            Instalar ID Maricá
          </button>
        )}
      </div>
    </section>
  );
}
