import {
  ArrowLeft,
  FileSpreadsheet,
  Filter,
  LogOut,
  Map as MapIcon,
  QrCode,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { ROLE_PROFILES, useIntegra } from '../context/IntegraContext';
import type { ManagementView, UserRole } from '../types/integra';
import { IdMaricaLogo } from './IdMaricaLogo';

interface HeaderProps {
  onOpenQr: () => void;
}

export function Header({ onOpenQr }: HeaderProps) {
  const {
    managementView,
    setManagementView,
    filteredBeneficiaries,
    auditLogs,
    authSession,
    switchRole,
    logoutManagement,
    resetDemo,
    returnToPortal,
  } = useIntegra();

  const navItems: {
    id: ManagementView;
    label: string;
    mobileLabel: string;
    icon: typeof MapIcon;
    count?: number;
  }[] = [
    { id: 'mapa', label: 'Mapa territorial', mobileLabel: 'Mapa', icon: MapIcon },
    {
      id: 'consultas',
      label: 'Consultas',
      mobileLabel: 'Consultas',
      icon: Filter,
      count: filteredBeneficiaries.length,
    },
    { id: 'indicadores', label: 'Indicadores', mobileLabel: 'Indicadores', icon: TrendingUp },
    { id: 'relatorios', label: 'Relatórios', mobileLabel: 'Relatórios', icon: FileSpreadsheet },
    {
      id: 'lgpd',
      label: 'LGPD',
      mobileLabel: 'LGPD',
      icon: ShieldCheck,
      count: auditLogs.length,
    },
  ];

  return (
    <>
      <header className="print:hidden sticky top-0 z-50 border-b-[3px] border-[#E89B0C] bg-[#0B3B49] text-white">
        <div className="mx-auto flex h-[62px] max-w-[1640px] items-center justify-between gap-2 px-3 sm:px-5">
          {/* Left: Return to Public Portal + Brand */}
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={returnToPortal}
              aria-label="Voltar ao portal do cidadão"
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-[6px] border border-white/20 px-2.5 py-1.5 text-xs font-semibold text-[#D8E7EC] transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              title="Voltar ao portal do cidadão"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Portal</span>
            </button>
            <IdMaricaLogo
              variant="light"
              size="sm"
              showSubtitle
              subtitle="Painel de gestão"
            />
          </div>

          {/* Center: 5 Core Management Domains */}
          <nav
            aria-label="Navegação do painel de gestão"
            className="hidden items-center gap-1 rounded-[8px] bg-[#072933] p-1 lg:flex"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = managementView === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setManagementView(item.id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer xl:text-[13px] ${
                    isActive
                      ? 'bg-white text-[#0B3B49] shadow-sm'
                      : 'text-[#C2D6DC] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums ${
                        isActive ? 'bg-[#0B3B49] text-white' : 'bg-[#E89B0C] text-[#072933]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right: Live RBAC Role Switcher + QR + Reset + Logout */}
          <div className="flex shrink-0 items-center gap-1.5">
            {authSession && (
              <label className="hidden items-center gap-1.5 rounded-[6px] border border-white/20 bg-[#072933] px-2 py-1 text-[11px] sm:flex">
                <span className="sr-only">Perfil de permissão RBAC</span>
                <select
                  aria-label="Alternar perfil de permissão LGPD"
                  value={authSession.role}
                  onChange={(e) => switchRole(e.target.value as UserRole)}
                  className="bg-transparent pr-1 font-bold text-[#E89B0C] outline-none cursor-pointer"
                >
                  {(Object.keys(ROLE_PROFILES) as UserRole[]).map((r) => (
                    <option key={r} value={r} className="bg-[#0B3B49] text-white">
                      {ROLE_PROFILES[r].shortLabel}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <button
              type="button"
              onClick={onOpenQr}
              aria-label="Abrir QR Code para testar no celular"
              className="flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-[6px] bg-[#D93829] px-2.5 py-2 text-xs font-bold text-white transition-all hover:bg-[#B52B1E] cursor-pointer"
            >
              <QrCode className="h-4 w-4 shrink-0" />
              <span className="hidden xl:inline">Celular</span>
            </button>

            <button
              type="button"
              onClick={resetDemo}
              aria-label="Reiniciar dados da demonstração"
              title="Reiniciar dados da demonstração"
              className="flex min-h-[38px] items-center justify-center rounded-[6px] border border-white/20 px-2.5 py-2 text-white hover:bg-white/10 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={logoutManagement}
              aria-label="Trocar login ou sair"
              title="Sair para tela de login"
              className="flex min-h-[38px] items-center justify-center rounded-[6px] border border-white/20 px-2.5 py-2 text-white hover:bg-white/10 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation (5 compact accessible tabs) */}
      <nav
        aria-label="Navegação móvel da gestão"
        className="print:hidden fixed inset-x-0 bottom-0 z-50 border-t border-[#DCE3E8] bg-white px-1.5 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = managementView === item.id;
            return (
              <button
                type="button"
                key={item.id}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => setManagementView(item.id)}
                className={`relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-[6px] py-1 text-[10px] font-bold transition-colors ${
                  isActive ? 'bg-[#0B3B49] text-white' : 'text-[#52646D] hover:bg-[#F4F6F8]'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.mobileLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
