import {
  Activity,
  Database,
  Fingerprint,
  KeyRound,
  Lock,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import { ROLE_PROFILES, useIntegra } from '../context/IntegraContext';

export function LgpdSecurityView() {
  const { auditLogs, offlineQueue, syncOfflineQueue, authSession } = useIntegra();

  const governancePillars = [
    {
      icon: Lock,
      title: 'Proteção de dados prevista',
      body: 'A arquitetura proposta prevê criptografia da base e separação entre identificadores pessoais e tabelas de análise.',
    },
    {
      icon: KeyRound,
      title: 'Controle de permissões (RBAC)',
      body: 'Os perfis simulam a diferença entre acesso a indicadores por bairro e acesso a registros individuais.',
    },
    {
      icon: Fingerprint,
      title: 'Avaliação específica da biometria facial',
      body: 'O protótipo apresenta o fluxo de câmera e a opção de validação presencial. O uso em produção depende de avaliação específica sobre o tratamento de dados biométricos.',
    },
    {
      icon: Database,
      title: 'Base legal e retenção de dados',
      body: 'A operação com dados reais depende de definir a base legal, os prazos de retenção e os controles de acesso.',
    },
  ];

  const modularIntegrations = [
    {
      name: 'CadÚnico / MDS',
      scope: 'Integração futura para conferência de núcleo familiar e benefícios federais',
      status: 'Integração proposta',
    },
    {
      name: 'CAGED / eSocial',
      scope: 'Conferência opcional de vínculos formais CLT e movimentação de emprego',
      status: 'Integração proposta',
    },
    {
      name: 'e-SUS e Rede Municipal de Saúde',
      scope: 'Mapeamento das 29 Unidades de Saúde da Família já integrado ao território',
      status: 'Camada territorial ativa',
    },
    {
      name: 'Sistemas Municipais e Geoprocessamento',
      scope: 'Base cartográfica oficial de 50 bairros e 5 distritos de Maricá (IBGE 2022)',
      status: 'Camada territorial ativa',
    },
  ];

  return (
    <div className="anim-step mx-auto max-w-[1400px] space-y-6 px-4 py-6 pb-24 sm:px-6 lg:pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#DCE3E8] pb-4">
        <div>
          <div className="h-[3px] w-10 bg-[#E89B0C]" />
          <h1 className="font-display mt-2 text-2xl font-extrabold text-[#0B3B49]">
            Segurança, LGPD, auditoria e arquitetura modular
          </h1>
          <p className="mt-1 text-xs text-[#52646D] sm:text-sm">
            Governança de privacidade, rastreabilidade de acessos, fila offline de campo e
            integrações futuras condicionadas a autorização técnica e jurídica.
          </p>
        </div>
        {authSession && (
          <div className="rounded-[8px] border border-[#DCE3E8] bg-white px-3.5 py-2 text-xs">
            <span className="text-[#52646D]">Sessão ativa: </span>
            <strong className="text-[#0B3B49]">{authSession.userName}</strong> (
            {ROLE_PROFILES[authSession.role].shortLabel})
          </div>
        )}
      </div>

      {/* 4 LGPD Governance Pillars */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {governancePillars.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="rounded-[12px] border border-[#DCE3E8] bg-white p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#EDF4F6] text-[#0B3B49]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-display mt-3.5 text-base font-extrabold text-[#0B3B49]">
                {p.title}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-[#52646D]">{p.body}</p>
            </div>
          );
        })}
      </div>

      {/* Offline Field Queue Card */}
      <div className="rounded-[12px] border border-[#DCE3E8] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FEF3DC] text-[#8A5600]">
              <WifiOff className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-extrabold text-[#0B3B49]">
                Coleta em campo com conectividade limitada (fila offline)
              </h2>
              <p className="mt-0.5 text-xs text-[#52646D]">
                A fila simula a coleta em campo. Os registros fictícios podem ser aplicados à base deste navegador.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-[6px] bg-[#F4F6F8] px-3 py-1.5 text-xs font-bold text-[#0B3B49] tabular-nums">
              {offlineQueue.length} pendente(s) na fila
            </span>
            <button
              type="button"
              disabled={offlineQueue.length === 0}
              onClick={syncOfflineQueue}
              className="rounded-[8px] bg-[#156F48] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#115B3B] disabled:cursor-not-allowed disabled:bg-[#C4D0D7] cursor-pointer"
            >
              Sincronizar fila
            </button>
          </div>
        </div>
      </div>

      {/* Live Audit Trail + Modular Integrations */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Live Audit Log */}
        <div className="rounded-[12px] border border-[#DCE3E8] bg-white p-5">
          <div className="flex items-center justify-between border-b border-[#DCE3E8] pb-3">
            <h2 className="font-display flex items-center gap-2 text-base font-extrabold text-[#0B3B49]">
              <Activity className="h-4 w-4 text-[#D93829]" />
              Trilha de auditoria de acessos e alterações
            </h2>
            <span className="text-xs font-bold text-[#156F48]">{auditLogs.length} eventos</span>
          </div>

          <div className="mt-3 max-h-[420px] divide-y divide-[#EDF1F4] overflow-y-auto pr-1">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-[#0B3B49]">{log.action}</strong>
                  <span className="shrink-0 text-[11px] text-[#52646D]">{log.timestamp}</span>
                </div>
                <div className="mt-1 text-[#11222B]">
                  {log.actorName} ({ROLE_PROFILES[log.actorRole].shortLabel}) | {log.resource}
                </div>
                <div className="mt-0.5 text-[11px] text-[#0E7490]">{log.legalBasis}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Modular Architecture & Future Integrations */}
        <div className="rounded-[12px] border border-[#0B3B49] bg-[#0B3B49] p-5 text-white">
          <div className="flex items-center gap-2 border-b border-white/15 pb-3">
            <ShieldCheck className="h-5 w-5 text-[#E89B0C]" />
            <div>
              <h2 className="font-display text-base font-extrabold">
                Arquitetura modular e integrações previstas
              </h2>
              <p className="text-xs text-[#C2D6DC]">
                Módulos desacoplados preparados para evolução conforme autorização técnica e legal
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {modularIntegrations.map((m) => (
              <div
                key={m.name}
                className="rounded-[8px] border border-white/15 bg-[#072933] p-3.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="font-display text-sm text-white">{m.name}</strong>
                  <span className="rounded-[4px] bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[#E89B0C]">
                    {m.status}
                  </span>
                </div>
                <p className="mt-1 text-[#C2D6DC]">{m.scope}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
