import { ArrowLeft, KeyRound, Lock, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { ROLE_PROFILES, useIntegra } from '../context/IntegraContext';
import type { UserRole } from '../types/integra';
import { IntegraLogo } from './IntegraLogo';

const ROLE_ORDER: UserRole[] = ['ANALISTA_AGREGADO', 'AUDITOR_LGPD', 'EQUIPE_CAMPO'];

export function AdminLoginGate() {
  const { loginAsRole, returnToPortal } = useIntegra();
  const [selectedRole, setSelectedRole] = useState<UserRole>('ANALISTA_AGREGADO');
  const [email, setEmail] = useState(ROLE_PROFILES.ANALISTA_AGREGADO.userEmail);
  const [password, setPassword] = useState('••••••••••••');

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(ROLE_PROFILES[role].userEmail);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginAsRole(selectedRole, email);
  };

  return (
    <div className="min-h-screen bg-[#072933] px-4 py-10 text-white sm:px-6 lg:flex lg:items-center lg:justify-center">
      <div className="mx-auto grid w-full max-w-[1040px] grid-cols-1 overflow-hidden rounded-[14px] border border-white/15 bg-white text-[#11222B] shadow-2xl lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left Institutional Context */}
        <div className="flex flex-col justify-between bg-[#0B3B49] p-7 text-white sm:p-9">
          <div>
            <button
              type="button"
              onClick={returnToPortal}
              className="inline-flex items-center gap-1.5 rounded-[6px] border border-white/20 px-3 py-1.5 text-xs font-semibold text-[#D8E7EC] hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao portal do cidadão
            </button>

            <div className="mt-8">
              <IntegraLogo
                variant="light"
                size="md"
                showSubtitle
                subtitle="Portal de Gestão e Inteligência"
              />
            </div>

            <h1 className="font-display mt-6 text-2xl font-extrabold leading-tight sm:text-3xl">
              Acesso administrativo com controle de permissões LGPD
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#C2D6DC]">
              Cada perfil enxerga apenas o nível de detalhe autorizado. Análises gerais exibem
              indicadores e mapas agregados por bairro; registros individuais e pontos residenciais
              ficam restritos a servidores autorizados com auditoria.
            </p>
          </div>

          <div className="mt-8 space-y-2.5 border-t border-white/15 pt-5 text-xs text-[#C2D6DC]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#E89B0C]" />
              <span>Criptografia TLS 1.3 / AES-256 e trilha completa de acessos</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-[#E89B0C]" />
              <span>Troque o perfil ao vivo dentro do painel para demonstrar a LGPD</span>
            </div>
          </div>
        </div>

        {/* Right Login Form + RBAC Role Selector */}
        <form onSubmit={handleSubmit} className="p-7 sm:p-9">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0E7490]">
            <Lock className="h-4 w-4" />
            Autenticação por nível de acesso (RBAC)
          </div>
          <h2 className="font-display mt-1.5 text-xl font-extrabold text-[#0B3B49]">
            Selecione o perfil de acesso
          </h2>

          <div className="mt-4 space-y-2.5">
            {ROLE_ORDER.map((roleKey) => {
              const prof = ROLE_PROFILES[roleKey];
              const active = selectedRole === roleKey;
              return (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => handleSelectRole(roleKey)}
                  className={`w-full rounded-[10px] border p-3.5 text-left transition-all cursor-pointer ${
                    active
                      ? 'border-[#0B3B49] bg-[#EDF4F6] ring-1 ring-[#0B3B49]'
                      : 'border-[#DCE3E8] bg-white hover:border-[#0B3B49]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-extrabold text-[#0B3B49]">
                      {prof.label}
                    </span>
                    <span
                      className={`rounded-[4px] px-2 py-0.5 text-[10px] font-bold ${
                        prof.canViewIndividualPoints
                          ? 'bg-[#FEF3DC] text-[#8A5600]'
                          : 'bg-[#E6F4ED] text-[#156F48]'
                      }`}
                    >
                      {prof.canViewIndividualPoints ? 'Nominal autorizado' : 'Agregado LGPD'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#52646D]">{prof.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-[#0B3B49]">
                E-mail institucional
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 min-h-[44px] w-full rounded-[8px] border border-[#C4D0D7] bg-[#F8FAFB] px-3 py-2 text-xs font-semibold text-[#0B3B49]"
              />
            </div>
            <div>
              <label htmlFor="login-pass" className="block text-xs font-bold text-[#0B3B49]">
                Credencial / Token Gov
              </label>
              <input
                id="login-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 min-h-[44px] w-full rounded-[8px] border border-[#C4D0D7] bg-[#F8FAFB] px-3 py-2 text-xs font-semibold text-[#0B3B49]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#D93829] px-5 py-3 text-sm font-extrabold text-white transition-all hover:bg-[#B52B1E] active:scale-[0.98] cursor-pointer"
          >
            <KeyRound className="h-4 w-4" />
            Entrar no portal de gestão
          </button>
        </form>
      </div>
    </div>
  );
}
