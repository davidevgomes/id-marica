import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Ban,
  Briefcase,
  Building2,
  GraduationCap,
  HeartHandshake,
  HeartPulse,
  MapPin,
  Search,
  UserRoundCheck,
  Wallet,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useIntegra } from '../context/IntegraContext';
import { DISTRICT_BY_ID, MARICA_DISTRICTS } from '../data/maricaGeo';
import {
  calculateFamilyMetrics,
  formatMumbucas,
  maskTitularName,
} from '../engine/rulesEngine';
import type { DistrictId } from '../types/integra';

interface CrasAndIntegrationsViewProps {
  mode: 'busca_ativa' | 'integracoes';
}

function normalizeQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function CrasAndIntegrationsView({ mode }: CrasAndIntegrationsViewProps) {
  const {
    families,
    integrationLogs,
    mumbucaEvents,
    registerCrasVisit,
    setSelectedFamilyId,
    setViewMode,
  } = useIntegra();

  const [districtFilter, setDistrictFilter] = useState<DistrictId | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const priorityOrder = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
  const normalizedQ = normalizeQuery(searchQuery.trim());
  const activeSearchQueue = families
    .filter((f) => f.needsActiveSearch)
    .filter((f) => districtFilter === 'ALL' || f.districtId === districtFilter)
    .filter((f) => {
      if (!normalizedQ) return true;
      const distName = DISTRICT_BY_ID[f.districtId].shortName;
      const haystack = normalizeQuery(
        `${maskTitularName(f.titularName, f.sigiloEspacial)} ${f.neighborhood} ${f.address} ${f.activeSearchReason ?? ''} ${distName}`
      );
      return haystack.includes(normalizedQ);
    })
    .sort(
      (a, b) =>
        (priorityOrder[a.activeSearchPriority ?? 'BAIXA'] ?? 2) -
        (priorityOrder[b.activeSearchPriority ?? 'BAIXA'] ?? 2)
    );

  const recentlyVisited = families.filter((f) => Boolean(f.lastCrasVisit));

  const apiSources = [
    {
      name: 'CadÚnico / MDS',
      detail: 'Bolsa Família, BPC/LOAS e renda per capita (0,5 SM)',
      protocol: 'Conecta Gov.br',
      cadence: 'Mensal',
      icon: Building2,
    },
    {
      name: 'CAGED / eSocial (MTE)',
      detail: 'Admissões e demissões CLT para Mumbuca Trabalho',
      protocol: 'REST / Webhooks',
      cadence: 'Tempo real',
      icon: Briefcase,
    },
    {
      name: 'e-Cidade (Municipal)',
      detail: 'Matrícula, frequência escolar, IPTU e alvarás',
      protocol: 'REST / CDC',
      cadence: 'Diário',
      icon: GraduationCap,
    },
    {
      name: 'e-SUS Saúde',
      detail: 'Presença nas 29 Unidades de Saúde da Família, vacinação e laudos PcD',
      protocol: 'FHIR / REST',
      cadence: 'Diário',
      icon: HeartPulse,
    },
    {
      name: 'Banco Mumbuca (saída)',
      detail: 'Recebe apenas status, distrito (1 a 5) e valor da folha',
      protocol: 'Webhook TLS 1.3',
      cadence: 'Tempo real',
      icon: Wallet,
    },
  ];

  return (
    <div key={mode} className="anim-step mx-auto max-w-[1380px] space-y-6 px-4 py-6 pb-24 sm:px-6 md:pb-10">
      {/* Clean Contextual Header */}
      <div className="space-y-4 border-b border-[#DCE3E8] pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="h-[3px] w-10 bg-[#E89B0C]" />
            <h1 className="font-display mt-2.5 text-2xl font-extrabold text-[#0B3B49]">
              {mode === 'busca_ativa'
                ? 'Visitas domiciliares e busca ativa (CRAS)'
                : 'Integrações de sistemas e saída Banco Mumbuca'}
            </h1>
            <p className="mt-1 text-xs text-[#52646D] sm:text-sm">
              {mode === 'busca_ativa'
                ? 'Famílias sinalizadas por distância GPS, divergência territorial ou elegibilidade ao atendimento assistido.'
                : 'Integração bidirecional das bases públicas e envio desacoplado de status e folha para o Banco Mumbuca.'}
            </p>
          </div>

          {mode === 'busca_ativa' && (
            <div className="relative w-full sm:w-80">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52646D]"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar família, bairro ou motivo..."
                aria-label="Buscar família, bairro ou motivo da visita CRAS"
                className="w-full rounded-[8px] border border-[#C4D0D7] bg-white py-2 pl-9 pr-9 text-sm text-[#0B3B49] placeholder:text-[#6B7E88]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Limpar busca de visitas"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[5px] p-1 text-[#52646D] hover:bg-[#F4F6F8] hover:text-[#0B3B49] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {mode === 'busca_ativa' && (
          <div className="no-scrollbar flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setDistrictFilter('ALL')}
              className={`shrink-0 rounded-[7px] px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                districtFilter === 'ALL'
                  ? 'bg-[#0B3B49] text-white'
                  : 'border border-[#DCE3E8] bg-white text-[#52646D] hover:text-[#0B3B49]'
              }`}
            >
              Todos distritos
            </button>
            {MARICA_DISTRICTS.map((d) => (
              <button
                type="button"
                key={d.id}
                onClick={() => setDistrictFilter(districtFilter === d.id ? 'ALL' : d.id)}
                className={`shrink-0 rounded-[7px] px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  districtFilter === d.id
                    ? 'bg-[#0B3B49] text-white'
                    : 'border border-[#DCE3E8] bg-white text-[#52646D] hover:text-[#0B3B49]'
                }`}
              >
                {d.shortName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VIEW 1: CRAS ACTIVE SEARCH */}
      {mode === 'busca_ativa' && (
        <div className="space-y-5">
          {activeSearchQueue.length === 0 ? (
            <div className="rounded-[10px] border border-[#156F48]/30 bg-[#E6F4ED] p-10 text-center">
              <UserRoundCheck className="mx-auto h-10 w-10 text-[#156F48]" />
              <h2 className="font-display mt-3 text-lg font-extrabold text-[#0F4D32]">
                Nenhuma pendência neste filtro
              </h2>
              <p className="mt-1 text-xs text-[#156F48]">
                Todas as visitas territoriais selecionadas foram concluídas ou não correspondem à
                busca atual.
              </p>
              {(districtFilter !== 'ALL' || searchQuery.trim().length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setDistrictFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-4 rounded-[8px] bg-[#0B3B49] px-4 py-2 text-xs font-bold text-white hover:bg-[#072933] cursor-pointer"
                >
                  Mostrar todas as pendências
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {activeSearchQueue.map((fam) => {
                const dist = DISTRICT_BY_ID[fam.districtId];
                const metrics = calculateFamilyMetrics(fam);
                const priorityCls =
                  fam.activeSearchPriority === 'ALTA'
                    ? 'bg-[#FDE8E6] text-[#B52B1E]'
                    : fam.activeSearchPriority === 'MEDIA'
                      ? 'bg-[#FEF3DC] text-[#8A5600]'
                      : 'bg-[#EDF7FA] text-[#0E7490]';
                const priorityLabel =
                  fam.activeSearchPriority === 'ALTA'
                    ? 'alta'
                    : fam.activeSearchPriority === 'MEDIA'
                      ? 'média'
                      : 'baixa';

                return (
                  <div
                    key={fam.id}
                    className="flex flex-col justify-between rounded-[10px] border border-[#DCE3E8] bg-white p-5"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`rounded-[4px] px-2 py-0.5 text-[11px] font-bold ${priorityCls}`}>
                            Prioridade {priorityLabel}
                          </span>
                          <span className="rounded-[4px] border border-[#DCE3E8] bg-[#F4F6F8] px-2 py-0.5 text-[11px] font-semibold text-[#11222B]">
                            {dist.shortName}
                          </span>
                          {fam.assistedEligible && (
                            <span className="rounded-[4px] bg-[#EDF7FA] px-2 py-0.5 text-[11px] font-semibold text-[#0E7490]">
                              Idoso / PcD
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFamilyId(fam.id);
                            setViewMode('mapa');
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#0E7490] hover:underline cursor-pointer"
                        >
                          Ver no mapa
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <h3 className="font-display mt-3 text-base font-extrabold text-[#0B3B49]">
                        {maskTitularName(fam.titularName, fam.sigiloEspacial)}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#52646D]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#D93829]" />
                        {fam.address} (folha {formatMumbucas(metrics.totalMumbucasMonthly)})
                      </p>

                      <div className="mt-3 flex items-start gap-2 rounded-[6px] border-l-[3px] border-[#E89B0C] bg-[#FEF8E8] p-3 text-xs text-[#573A00]">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B4690E]" />
                        <div>
                          <strong>Motivo da visita: </strong>
                          {fam.activeSearchReason}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-[#DCE3E8] pt-3.5">
                      <div className="mb-2 text-[11px] font-semibold text-[#52646D]">
                        Registrar desfecho da visita domiciliar (GPS do agente CRAS)
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        <button
                          type="button"
                          onClick={() => registerCrasVisit(fam.id, 'CONFIRMAR_RESIDENCIA')}
                          className="flex items-center justify-center gap-1.5 rounded-[6px] bg-[#156F48] px-3 py-2 text-xs font-bold text-white transition-all hover:bg-[#115B3B] active:scale-[0.98] cursor-pointer"
                        >
                          <UserRoundCheck className="h-3.5 w-3.5" />
                          Confirmar casa
                        </button>
                        <button
                          type="button"
                          onClick={() => registerCrasVisit(fam.id, 'EMITIR_TOKEN_FAIXA_C')}
                          className="flex items-center justify-center gap-1.5 rounded-[6px] bg-[#7B245A] px-3 py-2 text-xs font-bold text-white transition-all hover:bg-[#621B47] active:scale-[0.98] cursor-pointer"
                        >
                          <HeartHandshake className="h-3.5 w-3.5" />
                          Token Faixa C
                        </button>
                        <button
                          type="button"
                          onClick={() => registerCrasVisit(fam.id, 'CANCELAR_FASE_4')}
                          className="flex items-center justify-center gap-1.5 rounded-[6px] border border-[#D93829]/40 bg-white px-3 py-2 text-xs font-bold text-[#D93829] transition-colors hover:bg-[#FDE8E6] cursor-pointer"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Fora de Maricá
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {recentlyVisited.length > 0 && (
            <div className="rounded-[10px] border border-[#DCE3E8] bg-white p-4">
              <h3 className="font-display text-sm font-extrabold text-[#0B3B49]">
                Visitas registradas nesta sessão ({recentlyVisited.length})
              </h3>
              <div className="mt-2.5 divide-y divide-[#DCE3E8]">
                {recentlyVisited.map((fam) => (
                  <div
                    key={fam.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                  >
                    <div>
                      <strong className="text-[#0B3B49]">{fam.titularName}</strong>
                      <span className="ml-2 text-[#52646D]">{fam.notes}</span>
                    </div>
                    <span
                      className={`rounded-[4px] px-2 py-0.5 text-[11px] font-bold ${
                        fam.status === 'CANCELADO'
                          ? 'bg-[#FDE8E6] text-[#B52B1E]'
                          : 'bg-[#E6F4ED] text-[#156F48]'
                      }`}
                    >
                      {fam.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: INTEGRATED API BUS & BANCO MUMBUCA WEBHOOKS */}
      {mode === 'integracoes' && (
        <div className="space-y-5">
          {/* 5 Connected Sources Strip */}
          <div className="grid grid-cols-1 divide-y divide-[#DCE3E8] rounded-[10px] border border-[#DCE3E8] bg-white sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-5 xl:divide-x">
            {apiSources.map((src) => {
              const Icon = src.icon;
              return (
                <div key={src.name} className="p-4">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-[#0B3B49]" />
                    <span className="rounded-[4px] bg-[#E6F4ED] px-2 py-0.5 text-[10px] font-bold text-[#156F48]">
                      Conectado
                    </span>
                  </div>
                  <h3 className="font-display mt-3 text-sm font-extrabold text-[#0B3B49]">
                    {src.name}
                  </h3>
                  <p className="mt-1 text-xs leading-snug text-[#52646D]">{src.detail}</p>
                  <div className="mt-3 flex items-center justify-between border-t border-[#DCE3E8] pt-2 text-[11px] text-[#52646D]">
                    <span>{src.protocol}</span>
                    <strong className="text-[#0B3B49]">{src.cadence}</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Two-Column Live Event Feeds */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Audit Log */}
            <div className="rounded-[10px] border border-[#DCE3E8] bg-white p-5">
              <div className="flex items-center justify-between border-b border-[#DCE3E8] pb-3">
                <h2 className="font-display flex items-center gap-2 text-sm font-extrabold text-[#0B3B49]">
                  <Activity className="h-4 w-4 text-[#D93829]" />
                  Trilha de cruzamento intersetorial (LGPD)
                </h2>
                <span className="text-xs font-semibold text-[#52646D]">Tempo real</span>
              </div>

              <div className="mt-3 max-h-[480px] divide-y divide-[#DCE3E8] overflow-y-auto pr-1">
                {integrationLogs.map((log) => {
                  const dot =
                    log.severity === 'success'
                      ? '#156F48'
                      : log.severity === 'danger'
                        ? '#D93829'
                        : log.severity === 'warning'
                          ? '#E89B0C'
                          : '#0E7490';
                  return (
                    <div key={log.id} className="py-3 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: dot }}
                          />
                          <span className="font-bold text-[#0B3B49]">{log.eventType}</span>
                        </div>
                        <span className="text-[11px] text-[#52646D]">{log.timestamp}</span>
                      </div>
                      <p className="mt-1 text-[#11222B]">{log.automatedAction}</p>
                      <div className="mt-1 text-[11px] text-[#52646D]">
                        Origem {log.source} | Família <strong>{log.familyName}</strong> (
                        {DISTRICT_BY_ID[log.districtId].shortName})
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Outbound Banco Mumbuca Webhook Feed */}
            <div className="rounded-[10px] border border-[#0B3B49] bg-[#0B3B49] p-5 text-white">
              <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-3">
                <div>
                  <h2 className="font-display flex items-center gap-2 text-sm font-extrabold">
                    <Wallet className="h-4 w-4 text-[#E89B0C]" />
                    API de saída para o Banco Mumbuca
                  </h2>
                  <p className="mt-0.5 text-xs text-[#C2D6DC]">
                    Envia apenas status, distrito e valor da folha sem alterar o aplicativo do banco.
                  </p>
                </div>
                <span className="rounded-[4px] bg-[#156F48] px-2.5 py-1 text-[11px] font-bold text-white">
                  HTTP 200
                </span>
              </div>

              <div className="mt-4 max-h-[460px] space-y-3 overflow-y-auto pr-1">
                {mumbucaEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-[6px] border border-white/15 bg-[#072933] p-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-semibold text-[#E89B0C]">
                        POST /api/v1/operadora/folha-status
                      </span>
                      <span className="text-[#C2D6DC] tabular-nums">
                        {ev.latencyMs} ms ({ev.timestamp})
                      </span>
                    </div>
                    <pre className="font-code mt-2 overflow-x-auto rounded-[4px] bg-black/35 p-2.5 text-[11px] leading-relaxed text-[#E2E8F0]">
{`{
  "evento_id": "${ev.id}",
  "comando": "${ev.command}",
  "titular": "${ev.titularMasked}",
  "status_conta": "${ev.statusConta}",
  "id_territorio": ${ev.idTerritorio},
  "valor_mensal_mumbucas": ${ev.valorMensalMumbucas},
  "motivo": "${ev.motivo}"
}`}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
