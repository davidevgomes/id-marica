import {
  Bell,
  Download,
  History,
  Lock,
  MapPin,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useIntegra } from '../context/IntegraContext';
import { DISTRICT_BY_ID, MARICA_DISTRICTS, OFFICIAL_BAIRROS } from '../data/maricaGeo';
import {
  calculateAge,
  computeSocioeconomicSummary,
  DEFAULT_FILTER_STATE,
  ECONOMIC_SECTORS,
  EMPLOYMENT_LABELS,
  formatCurrency,
  formatDateBr,
  getIncomeEvolution,
  getPerCapitaIncome,
  getRegistrationStatus,
  getSocialBenefitsTotal,
  maskCpf,
  pseudonymizeName,
  SOCIAL_PROGRAM_OPTIONS,
  STATUS_LABELS,
  WORK_REGIME_LABELS,
} from '../engine/analyticsEngine';
import { exportBeneficiariesCsv } from '../engine/exportUtils';
import type {
  DistrictId,
  EmploymentStatus,
  IncomeTrend,
  RegistrationStatus,
  WorkRegime,
} from '../types/integra';

export function CombinedQueryView() {
  const {
    beneficiaries,
    filteredBeneficiaries,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    activeRoleProfile,
    authSession,
    validatePendingBeneficiary,
    notifyDueBeneficiaries,
    recordAuditEvent,
    setSelectedBeneficiaryId,
    setManagementView,
  } = useIntegra();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const canViewPii = Boolean(activeRoleProfile?.canViewFullPii);
  const canValidate = Boolean(activeRoleProfile?.canValidateRecords);

  const summary = useMemo(
    () => computeSocioeconomicSummary(filteredBeneficiaries),
    [filteredBeneficiaries]
  );

  const availableBairros = useMemo(() => {
    if (filters.districtId === 'ALL') return OFFICIAL_BAIRROS;
    return OFFICIAL_BAIRROS.filter((b) => b.districtId === filters.districtId);
  }, [filters.districtId]);

  const handleQuickExport = () => {
    const role = authSession?.role ?? 'ANALISTA_AGREGADO';
    exportBeneficiariesCsv(filteredBeneficiaries, role, 'consulta-combinada-marica');
    recordAuditEvent(
      `Exportação CSV de consulta combinada (${filteredBeneficiaries.length} registros)`,
      'Consultas e cadastros',
      'Art. 7º, III da LGPD: relatório autorizado',
      'warning'
    );
  };

  return (
    <div className="anim-step mx-auto max-w-[1440px] space-y-6 px-4 py-6 pb-24 sm:px-6 lg:pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#DCE3E8] pb-4">
        <div>
          <div className="h-[3px] w-10 bg-[#E89B0C]" />
          <h1 className="font-display mt-2 text-2xl font-extrabold text-[#0B3B49]">
            Consultas combinadas e gestão cadastral
          </h1>
          <p className="mt-1 text-xs text-[#52646D] sm:text-sm">
            Combine território, vínculo trabalhista, faixa de renda, composição familiar, programas
            e evolução econômica. O vencimento cadastral nunca suspende benefícios automaticamente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={notifyDueBeneficiaries}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] border border-[#0B3B49] bg-white px-3.5 py-2 text-xs font-bold text-[#0B3B49] hover:bg-[#EDF4F6] cursor-pointer"
          >
            <Bell className="h-3.5 w-3.5 text-[#E89B0C]" />
            Notificar vencidos ({summary.byStatus.VENCIDO + summary.byStatus.PROXIMO_VENCIMENTO})
          </button>
          <button
            type="button"
            onClick={handleQuickExport}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[8px] bg-[#0B3B49] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#072933] cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#E89B0C]" />
            Exportar recorte CSV
          </button>
        </div>
      </div>

      {/* Presets Strip */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 text-xs font-bold text-[#52646D]">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Consultas prontas:
        </span>
        <button
          type="button"
          onClick={() =>
            setFilters({
              ...DEFAULT_FILTER_STATE,
              districtId: 4,
              workRegime: 'CLT',
              maxIndividualIncomeSm: '2',
              minHouseholdSize: '4',
            })
          }
          className="rounded-[6px] bg-[#0B3B49] px-3 py-1.5 text-xs font-bold text-[#E89B0C] hover:bg-[#072933] cursor-pointer"
        >
          Itaipuaçu + CLT + até 2 SM + família 4+
        </button>
        <button
          type="button"
          onClick={() => setFilters({ ...DEFAULT_FILTER_STATE, incomeTrend: 'AUMENTO' })}
          className="rounded-[6px] border border-[#DCE3E8] bg-white px-3 py-1.5 text-xs font-bold text-[#156F48] hover:border-[#156F48] cursor-pointer"
        >
          Tiveram aumento de renda
        </button>
        <button
          type="button"
          onClick={() => setFilters({ ...DEFAULT_FILTER_STATE, multiProgramOnly: true })}
          className="rounded-[6px] border border-[#DCE3E8] bg-white px-3 py-1.5 text-xs font-bold text-[#0B3B49] hover:border-[#0B3B49] cursor-pointer"
        >
          Mais de 1 programa social
        </button>
        <button
          type="button"
          onClick={() => setFilters({ ...DEFAULT_FILTER_STATE, registrationStatus: 'VENCIDO' })}
          className="rounded-[6px] border border-[#DCE3E8] bg-white px-3 py-1.5 text-xs font-bold text-[#B52B1E] hover:border-[#B52B1E] cursor-pointer"
        >
          Cadastros vencidos
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-[6px] px-2.5 py-1.5 text-xs font-bold text-[#52646D] hover:text-[#D93829] cursor-pointer"
        >
          Limpar tudo
        </button>
      </div>

      {/* Full Combined Filter Grid */}
      <div className="rounded-[12px] border border-[#DCE3E8] bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52646D]"
            />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Buscar por nome, CPF, profissão, empresa ou bairro..."
              className="min-h-[42px] w-full rounded-[8px] border border-[#C4D0D7] bg-[#F9FBFC] py-2 pl-9 pr-3 text-sm text-[#0B3B49]"
            />
          </div>

          <select
            aria-label="Distrito"
            value={String(filters.districtId)}
            onChange={(e) =>
              updateFilter(
                'districtId',
                e.target.value === 'ALL' ? 'ALL' : (Number(e.target.value) as DistrictId)
              )
            }
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Todos os 5 distritos</option>
            {MARICA_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Bairro"
            value={filters.neighborhood}
            onChange={(e) => updateFilter('neighborhood', e.target.value)}
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Todos os bairros ({availableBairros.length})</option>
            {availableBairros.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Regime de trabalho"
            value={filters.workRegime}
            onChange={(e) => updateFilter('workRegime', e.target.value as WorkRegime | 'ALL')}
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Regime: todos</option>
            {(Object.keys(WORK_REGIME_LABELS) as WorkRegime[]).map((k) => (
              <option key={k} value={k}>
                {WORK_REGIME_LABELS[k]}
              </option>
            ))}
          </select>

          <select
            aria-label="Situação profissional"
            value={filters.employmentStatus}
            onChange={(e) =>
              updateFilter('employmentStatus', e.target.value as EmploymentStatus | 'ALL')
            }
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Situação: todas</option>
            {(Object.keys(EMPLOYMENT_LABELS) as EmploymentStatus[]).map((k) => (
              <option key={k} value={k}>
                {EMPLOYMENT_LABELS[k]}
              </option>
            ))}
          </select>

          <select
            aria-label="Setor econômico"
            value={filters.economicSector}
            onChange={(e) => updateFilter('economicSector', e.target.value)}
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Setor econômico: todos</option>
            {ECONOMIC_SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            aria-label="Programa social"
            value={filters.programName}
            onChange={(e) => updateFilter('programName', e.target.value)}
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Programa: todos</option>
            {SOCIAL_PROGRAM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            aria-label="Faixa de renda individual"
            value={filters.maxIndividualIncomeSm}
            onChange={(e) =>
              updateFilter(
                'maxIndividualIncomeSm',
                e.target.value as typeof filters.maxIndividualIncomeSm
              )
            }
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Renda individual: qualquer</option>
            <option value="0">Sem renda do trabalho</option>
            <option value="1">Até 1 SM (R$ 1.518)</option>
            <option value="2">Até 2 SM (R$ 3.036)</option>
            <option value="3">Até 3 SM (R$ 4.554)</option>
          </select>

          <select
            aria-label="Integrantes na família"
            value={filters.minHouseholdSize}
            onChange={(e) =>
              updateFilter('minHouseholdSize', e.target.value as typeof filters.minHouseholdSize)
            }
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Núcleo familiar: qualquer</option>
            <option value="2">2 ou mais integrantes</option>
            <option value="3">3 ou mais integrantes</option>
            <option value="4">4 ou mais integrantes</option>
            <option value="5">5 ou mais integrantes</option>
          </select>

          <select
            aria-label="Validade cadastral"
            value={filters.registrationStatus}
            onChange={(e) =>
              updateFilter('registrationStatus', e.target.value as RegistrationStatus | 'ALL')
            }
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Validade: todas</option>
            {(Object.keys(STATUS_LABELS) as RegistrationStatus[]).map((k) => (
              <option key={k} value={k}>
                {STATUS_LABELS[k]}
              </option>
            ))}
          </select>

          <select
            aria-label="Evolução de renda"
            value={filters.incomeTrend}
            onChange={(e) => updateFilter('incomeTrend', e.target.value as IncomeTrend | 'ALL')}
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Evolução de renda: todas</option>
            <option value="AUMENTO">Aumento de renda</option>
            <option value="ESTAVEL">Renda estável</option>
            <option value="REDUCAO">Redução de renda</option>
          </select>
        </div>

        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-[#0B3B49]">
          <input
            type="checkbox"
            checked={filters.multiProgramOnly}
            onChange={(e) => updateFilter('multiProgramOnly', e.target.checked)}
            className="h-4 w-4 accent-[#0B3B49]"
          />
          Exibir apenas beneficiários que recebem mais de um programa social
        </label>
      </div>

      {/* Live Aggregated Metrics for Current Query */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-[10px] border border-[#DCE3E8] bg-[#0B3B49] p-4 text-white">
          <div className="text-xs text-[#C2D6DC]">Resultado do filtro</div>
          <div className="font-display mt-1 text-2xl font-extrabold text-[#E89B0C] tabular-nums">
            {summary.total}
            <span className="ml-1 text-xs font-normal text-[#C2D6DC]">/ {beneficiaries.length}</span>
          </div>
        </div>
        <div className="rounded-[10px] border border-[#DCE3E8] bg-white p-4">
          <div className="text-xs text-[#52646D]">Renda indiv. média</div>
          <div className="font-display mt-1 text-xl font-extrabold text-[#0B3B49] tabular-nums">
            {formatCurrency(summary.avgIndividualIncome)}
          </div>
        </div>
        <div className="rounded-[10px] border border-[#DCE3E8] bg-white p-4">
          <div className="text-xs text-[#52646D]">Renda familiar média</div>
          <div className="font-display mt-1 text-xl font-extrabold text-[#0B3B49] tabular-nums">
            {formatCurrency(summary.avgHouseholdIncome)}
          </div>
        </div>
        <div className="rounded-[10px] border border-[#DCE3E8] bg-white p-4">
          <div className="text-xs text-[#52646D]">Per capita médio</div>
          <div className="font-display mt-1 text-xl font-extrabold text-[#156F48] tabular-nums">
            {formatCurrency(summary.avgPerCapitaIncome)}
          </div>
        </div>
        <div className="col-span-2 rounded-[10px] border border-[#DCE3E8] bg-white p-4 sm:col-span-1">
          <div className="text-xs text-[#52646D]">Formalização (CLT/Est.)</div>
          <div className="font-display mt-1 text-xl font-extrabold text-[#0E7490] tabular-nums">
            {summary.formalRatePct}%
          </div>
        </div>
      </div>

      {/* RBAC Notice when in Analista mode */}
      {!canViewPii && (
        <div className="flex items-center gap-2.5 rounded-[10px] border border-[#0E7490]/35 bg-[#EDF7FA] px-4 py-3 text-xs text-[#0B3B49]">
          <Lock className="h-4 w-4 shrink-0 text-[#0E7490]" />
          <span>
            <strong>Proteção LGPD ativa:</strong> no perfil Analista, nomes e CPFs aparecem
            pseudonimizados. Alterne para <strong>Auditor (LGPD)</strong> no topo para acesso
            nominal autorizado.
          </span>
        </div>
      )}

      {/* Results List */}
      <div className="overflow-hidden rounded-[12px] border border-[#DCE3E8] bg-white">
        {filteredBeneficiaries.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#52646D]">
            Nenhum registro corresponde aos critérios combinados.
          </div>
        ) : (
          <div className="divide-y divide-[#DCE3E8]">
            {filteredBeneficiaries.map((b) => {
              const st = getRegistrationStatus(b);
              const evo = getIncomeEvolution(b);
              const pc = getPerCapitaIncome(b);
              const benTotal = getSocialBenefitsTotal(b);
              const isOpen = expandedId === b.id;

              return (
                <div key={b.id} className="p-4 transition-colors hover:bg-[#F9FBFC]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="font-display text-base font-extrabold text-[#0B3B49]">
                          {canViewPii ? b.fullName : pseudonymizeName(b.fullName)}
                        </strong>
                        <span className="text-xs text-[#52646D]">
                          {canViewPii ? b.cpf : maskCpf(b.cpf)}
                        </span>
                        <span
                          className={`rounded-[4px] px-2 py-0.5 text-[11px] font-bold ${
                            st === 'ATUALIZADO'
                              ? 'bg-[#E6F4ED] text-[#156F48]'
                              : st === 'VENCIDO'
                                ? 'bg-[#FDE8E6] text-[#B52B1E]'
                                : 'bg-[#FEF3DC] text-[#8A5600]'
                          }`}
                        >
                          {STATUS_LABELS[st]}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#52646D]">
                        <span className="flex items-center gap-1 font-semibold text-[#11222B]">
                          <MapPin className="h-3.5 w-3.5 text-[#D93829]" />
                          {b.neighborhood} ({DISTRICT_BY_ID[b.districtId].shortName})
                        </span>
                        <span>
                          {b.profession} ({WORK_REGIME_LABELS[b.workRegime]})
                        </span>
                        <span>
                          {b.householdSize} pessoas ({calculateAge(b.birthDate)} anos)
                        </span>
                        <span>
                          {b.socialPrograms.length} programa(s): {formatCurrency(benTotal)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <div className="text-right tabular-nums">
                        <div className="font-extrabold text-[#0B3B49]">
                          Indiv. {formatCurrency(b.individualIncome)}
                        </div>
                        <div className="font-semibold text-[#156F48]">
                          Per capita {formatCurrency(pc)}
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-[5px] px-2 py-1 text-[11px] font-bold tabular-nums ${
                          evo.trend === 'AUMENTO'
                            ? 'bg-[#E6F4ED] text-[#156F48]'
                            : evo.trend === 'REDUCAO'
                              ? 'bg-[#FDE8E6] text-[#B52B1E]'
                              : 'bg-[#EEF3F6] text-[#52646D]'
                        }`}
                      >
                        {evo.trend === 'AUMENTO' && <TrendingUp className="h-3 w-3" />}
                        {evo.trend === 'REDUCAO' && <TrendingDown className="h-3 w-3" />}
                        {evo.trend === 'AUMENTO'
                          ? `+${formatCurrency(evo.deltaValue)}`
                          : evo.trend === 'REDUCAO'
                            ? formatCurrency(evo.deltaValue)
                            : 'Estável'}
                      </span>

                      {canValidate && b.pendingValidation && (
                        <button
                          type="button"
                          onClick={() => validatePendingBeneficiary(b.id)}
                          className="inline-flex items-center gap-1 rounded-[6px] bg-[#156F48] px-2.5 py-1.5 font-bold text-white cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Validar
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : b.id)}
                        className="rounded-[6px] border border-[#DCE3E8] bg-white px-2.5 py-1.5 font-bold text-[#0B3B49] hover:border-[#0B3B49] cursor-pointer"
                      >
                        {isOpen ? 'Ocultar histórico' : `Histórico (${b.history.length})`}
                      </button>

                      {canViewPii && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBeneficiaryId(b.id);
                            setManagementView('mapa');
                          }}
                          className="font-bold text-[#0E7490] hover:underline cursor-pointer"
                        >
                          No mapa
                        </button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-3 rounded-[8px] border border-[#DCE3E8] bg-[#F8FAFB] p-3.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DCE3E8] pb-2">
                        <span className="flex items-center gap-1.5 font-bold text-[#0B3B49]">
                          <History className="h-4 w-4 text-[#0E7490]" />
                          Linha do tempo socioeconômica preservada
                        </span>
                        <span className="text-[#52646D]">
                          Próximo vencimento: <strong>{formatDateBr(b.nextDueDate)}</strong>
                        </span>
                      </div>
                      <div className="mt-2.5 grid grid-cols-1 gap-2 md:grid-cols-3">
                        {b.history.map((h) => (
                          <div
                            key={h.id}
                            className="rounded-[6px] border border-[#DCE3E8] bg-white p-2.5"
                          >
                            <div className="flex items-center justify-between">
                              <strong className="text-[#0B3B49]">{h.cycleLabel}</strong>
                              <span className="font-bold text-[#156F48] tabular-nums">
                                {formatCurrency(h.householdTotalIncome)}
                              </span>
                            </div>
                            <div className="mt-0.5 font-semibold text-[#0E7490]">
                              {WORK_REGIME_LABELS[h.workRegime]}
                            </div>
                            <p className="mt-1 text-[11px] text-[#52646D]">{h.note}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
