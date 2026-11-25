import { ArrowLeft, ArrowRight, Check, Map } from 'lucide-react';
import { useState } from 'react';
import { ROLE_PROFILES, useIntegra } from '../context/IntegraContext';
import type { UserRole } from '../types/integra';
import { IdMaricaLogo } from './IdMaricaLogo';

const ROLE_ORDER: UserRole[] = ['ANALISTA_AGREGADO', 'AUDITOR_LGPD', 'EQUIPE_CAMPO'];

export function AdminLoginGate() {
  const { loginAsRole, returnToPortal } = useIntegra();
  const [selectedRole, setSelectedRole] = useState<UserRole>('ANALISTA_AGREGADO');

  return (
    <main className="min-h-screen bg-[#E7F0EB] px-4 py-6 sm:px-6 sm:py-12 lg:grid lg:place-items-center">
      <div className="mx-auto grid w-full max-w-[1000px] overflow-hidden rounded-3xl border border-[#D4E2DB] bg-white shadow-lg lg:grid-cols-2">
        <div className="relative isolate flex flex-col overflow-hidden bg-[#0B3B49] p-6 text-white sm:p-9">
          <Map aria-hidden="true" className="pointer-events-none absolute -right-16 -bottom-16 -z-10 hidden size-80 text-white/8 lg:block" />
          <button
            type="button"
            onClick={returnToPortal}
            className="mb-7 inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-lg border border-white/35 px-3 text-sm font-bold hover:bg-white/15 lg:mb-14"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Voltar ao portal do cidadão
          </button>
          <IdMaricaLogo showSubtitle subtitle="Identidade cidadã" />
          <h1 className="mt-5 font-display text-3xl leading-tight font-extrabold sm:text-4xl">Painel de gestão</h1>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-[#CCE5E3]">
            Explore o mapa, compare indicadores por bairro e conheça os serviços que apoiam o planejamento de Maricá.
          </p>
        </div>

        <div className="p-6 sm:p-9">
          <p className="text-sm font-bold text-[#226655]">Demonstração com dados fictícios</p>
          <h2 className="font-display mt-2 text-2xl font-extrabold text-[#0B3B49]">Escolha um perfil</h2>
          <div className="mt-5 grid gap-2.5" role="group" aria-label="Perfis de demonstração">
            {ROLE_ORDER.map((role) => {
              const profile = ROLE_PROFILES[role];
              const active = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedRole(role)}
                  className={`flex w-full cursor-pointer items-start justify-between gap-3 rounded-xl border p-3.5 text-left ${active ? 'border-[#226655] bg-[#EAF5ED]' : 'border-[#DCE3E8] hover:border-[#226655]'}`}
                >
                  <span>
                    <span className="block font-display text-base font-extrabold text-[#0B3B49]">{profile.label}</span>
                    <span className="mt-1 block text-sm leading-snug text-[#52646D]">{profile.description}</span>
                  </span>
                  {active && <Check aria-hidden="true" className="size-5 shrink-0 text-[#226655]" />}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => loginAsRole(selectedRole)}
            className="citizen-primary mt-5 inline-flex min-h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white"
          >
            Abrir painel de gestão
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </main>
  );
}
