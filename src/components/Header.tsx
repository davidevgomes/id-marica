import {
  ArrowLeft,
  ClipboardList,
  Database,
  Map as MapIcon,
  QrCode,
  RotateCcw,
} from 'lucide-react';
import { useIntegra } from '../context/IntegraContext';
import type { AppViewMode } from '../types/integra';
import { IntegraLogo } from './IntegraLogo';

interface HeaderProps {
  onOpenQr: () => void;
}

export function Header({ onOpenQr }: HeaderProps) {
  const { viewMode, setViewMode, families, mumbucaEvents, resetDemo, returnToPortal } =
    useIntegra();

  const activeSearchCount = families.filter((f) => f.needsActiveSearch).length;

  const navItems: {
    id: AppViewMode;
    label: string;
    mobileLabel: string;
    icon: typeof MapIcon;
    count?: number;
  }[] = [
    {
      id: 'mapa',
      label: 'Mapa de Maricá',
      mobileLabel: 'Mapa',
      icon: MapIcon,
    },
    {
      id: 'busca_ativa',
      label: 'Visitas CRAS',
      mobileLabel: 'Visitas',
      icon: ClipboardList,
      count: activeSearchCount,
    },
    {
      id: 'integracoes',
      label: 'Integrações',
      mobileLabel: 'Sistemas',
      icon: Database,
      count: mumbucaEvents.length,
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b-[3px] border-[#E89B0C] bg-[#0B3B49] text-white">
        <div className="mx-auto flex h-[62px] max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          {/* Left: Return to Public Portal + Brand */}
          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={returnToPortal}
              aria-label="Voltar ao portal do cidadão"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[6px] border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-[#D8E7EC] transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              title="Voltar ao portal do cidadão"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Portal</span>
            </button>
            <IntegraLogo
              variant="light"
              size="sm"
              showSubtitle
              subtitle="Painel de gestão"
            />
          </div>

          {/* Center: 3 Zero-Redundancy Backend Domains */}
          <nav
            aria-label="Navegação do painel de gestão"
            className="hidden items-center gap-1 rounded-[8px] bg-[#072933] p-1 md:flex"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = viewMode === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setViewMode(item.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-[6px] px-3.5 py-1.5 text-[13px] font-semibold transition-all cursor-pointer lg:px-4 ${
                    isActive
                      ? 'bg-white text-[#0B3B49] shadow-sm'
                      : 'text-[#C2D6DC] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`rounded-[4px] px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums ${
                        isActive
                          ? item.id === 'busca_ativa'
                            ? 'bg-[#D93829] text-white'
                            : 'bg-[#0B3B49] text-white'
                          : 'bg-[#E89B0C] text-[#072933]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Presentation Utilities */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onOpenQr}
              aria-label="Abrir QR Code para testar no celular"
              className="flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-[6px] bg-[#D93829] px-3 py-2 text-xs font-bold text-white transition-all hover:bg-[#B52B1E] active:scale-[0.98] cursor-pointer sm:text-[13px]"
            >
              <QrCode className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Testar no celular</span>
            </button>
            <button
              type="button"
              onClick={resetDemo}
              aria-label="Reiniciar dados da demonstração"
              className="flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-[6px] border border-white/25 px-2.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 cursor-pointer"
              title="Reiniciar dados da demonstração"
            >
              <RotateCcw className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden lg:inline">Reiniciar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Navegação móvel da gestão"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#DCE3E8] bg-white px-2 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <div className="grid grid-cols-3 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = viewMode === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setViewMode(item.id)}
                className={`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-[6px] py-1.5 text-[11px] font-bold transition-colors ${
                  isActive
                    ? 'bg-[#0B3B49] text-white'
                    : 'text-[#52646D] hover:bg-[#F4F6F8]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.mobileLabel}</span>
                {item.count !== undefined && item.count > 0 && (
                  <span className="absolute right-3 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#D93829] px-1 text-[10px] font-bold text-white tabular-nums">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
