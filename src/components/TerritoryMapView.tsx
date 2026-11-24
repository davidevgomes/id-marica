import {
  Briefcase,
  History,
  Lock,
  MapPin,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import { useIntegra } from '../context/IntegraContext';
import { DISTRICT_BY_ID } from '../data/maricaGeo';
import {
  calculateAge,
  computeSocioeconomicSummary,
  DEFAULT_FILTER_STATE,
  EMPLOYMENT_LABELS,
  formatCurrency,
  formatDateBr,
  getIncomeEvolution,
  getPerCapitaIncome,
  getRegistrationStatus,
  getSocialBenefitsTotal,
  HOUSING_LABELS,
  STATUS_LABELS,
  WORK_REGIME_LABELS,
} from '../engine/analyticsEngine';
import type { EmploymentStatus, WorkRegime } from '../types/integra';
import { MaricaMap } from './MaricaMap';

export function TerritoryMapView() {
  const {
    beneficiaries,
    filteredBeneficiaries,
    filters,
    setFilters,
    updateFilter,
    resetFilters,
    selectedBeneficiaryId,
    setSelectedBeneficiaryId,
    activeRoleProfile,
    switchRole,
    validatePendingBeneficiary,
    setManagementView,
  } = useIntegra();

  const canViewPoints = Boolean(activeRoleProfile?.canViewIndividualPoints);
  const canViewPii = Boolean(activeRoleProfile?.canViewFullPii);

  const summary = useMemo(
    () => computeSocioeconomicSummary(filteredBeneficiaries),
    [filteredBeneficiaries]
  );

  const activeBeneficiary = useMemo(() => {
    if (filteredBeneficiaries.length === 0) return null;
    return (
      filteredBeneficiaries.find((b) => b.id === selectedBeneficiaryId) ??
      filteredBeneficiaries[0]
    );
  }, [filteredBeneficiaries, selectedBeneficiaryId]);

  const applyItaipuacuPreset = () => {
    setFilters({
      ...DEFAULT_FILTER_STATE,
      districtId: 4,
      workRegime: 'CLT',
      maxIndividualIncomeSm: '2',
      minHouseholdSize: '4',
    });
  };

  const hasFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTER_STATE);

  return (
    <div className="anim-step grid grid-cols-1 pb-20 lg:grid-cols-[1fr_440px] lg:pb-0">
      {/* Left Interactive Satellite / Choropleth / Heatmap Atlas */}
      <div className="relative">
        <MaricaMap
          beneficiaries={filteredBeneficiaries}
          selectedBeneficiaryId={activeBeneficiary?.id ?? null}
          onSelectBeneficiary={setSelectedBeneficiaryId}
          selectedDistrict={filters.districtId}
          onSelectDistrict={(d) => updateFilter('districtId', d)}
          canViewIndividualPoints={canViewPoints}
        />

        {/* Mobile compact KPI strip */}
        <div className="grid grid-cols-2 gap-3 bg-[#0B3B49] px-4 py-3 text-white sm:hidden">
          <div>
            <div className="font-display text-base font-extrabold text-[#E89B0C] tabular-nums">
              {summary.total}
            </div>
            <div className="text-[11px] text-[#C2D6DC]">Cadastrados no filtro</div>
          </div>
          <div>
            <div className="font-display text-base font-extrabold text-white tabular-nums">
              {formatCurrency(summary.avgPerCapitaIncome)}
            </div>
            <div className="text-[11px] text-[#C2D6DC]">Per capita médio</div>
          </div>
          <div>
            <div className="font-display text-base font-extrabold text-[#E89B0C] tabular-nums">
              {summary.formalRatePct}%
            </div>
            <div className="text-[11px] text-[#C2D6DC]">Vínculo formal</div>
          </div>
          <div>
            <div className="font-display text-base font-extrabold text-white tabular-nums">
              {summary.unemploymentRatePct}%
            </div>
            <div className="text-[11px] text-[#C2D6DC]">Desemprego</div>
          </div>
        </div>
      </div>

      {/* Right Territorial Intelligence & Combined Filters Drawer */}
      <aside className="flex flex-col border-t-[3px] border-[#E89B0C] bg-white lg:h-[calc(100dvh-62px)] lg:border-l-[3px] lg:border-t-0">
        {/* Search + Combined Quick Filters */}
        <div className="border-b border-[#DCE3E8] bg-[#F4F6F8] px-4 py-3.5">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52646D]"
            />
            <input
              type="search"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Buscar bairro, profissão, nome ou CPF..."
              aria-label="Buscar beneficiários no mapa"
              className="w-full rounded-[8px] border border-[#C4D0D7] bg-white py-2 pl-9 pr-9 text-sm text-[#0B3B49]"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => updateFilter('search', '')}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#52646D] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* 1-Click Combined Preset matching the Mayor's exact scenario */}
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={applyItaipuacuPreset}
              className="rounded-[6px] bg-[#0B3B49] px-2.5 py-1 text-[11px] font-bold text-[#E89B0C] hover:bg-[#072933] cursor-pointer"
            >
              Itaipuaçu + CLT + até 2 SM + 4+ pessoas
            </button>
            <button
              type="button"
              onClick={() =>
                setFilters({ ...DEFAULT_FILTER_STATE, employmentStatus: 'DESEMPREGADO' })
              }
              className="rounded-[6px] border border-[#DCE3E8] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0B3B49] hover:border-[#0B3B49] cursor-pointer"
            >
              Desempregados
            </button>
            <button
              type="button"
              onClick={() => setFilters({ ...DEFAULT_FILTER_STATE, multiProgramOnly: true })}
              className="rounded-[6px] border border-[#DCE3E8] bg-white px-2.5 py-1 text-[11px] font-bold text-[#0B3B49] hover:border-[#0B3B49] cursor-pointer"
            >
              2+ programas
            </button>
          </div>

          {/* Compact Combined Filter Row */}
          <div className="mt-2.5 grid grid-cols-2 gap-1.5">
            <select
              aria-label="Filtrar por regime de trabalho"
              value={filters.workRegime}
              onChange={(e) => updateFilter('workRegime', e.target.value as WorkRegime | 'ALL')}
              className="rounded-[6px] border border-[#C4D0D7] bg-white px-2 py-1.5 text-xs font-semibold text-[#0B3B49]"
            >
              <option value="ALL">Todos regimes</option>
              {(Object.keys(WORK_REGIME_LABELS) as WorkRegime[]).map((k) => (
                <option key={k} value={k}>
                  {WORK_REGIME_LABELS[k]}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por renda individual máxima"
              value={filters.maxIndividualIncomeSm}
              onChange={(e) =>
                updateFilter(
                  'maxIndividualIncomeSm',
                  e.target.value as typeof filters.maxIndividualIncomeSm
                )
              }
              className="rounded-[6px] border border-[#C4D0D7] bg-white px-2 py-1.5 text-xs font-semibold text-[#0B3B49]"
            >
              <option value="ALL">Qualquer renda indiv.</option>
              <option value="0">Sem renda do trabalho</option>
              <option value="1">Até 1 SM (R$ 1.518)</option>
              <option value="2">Até 2 SM (R$ 3.036)</option>
              <option value="3">Até 3 SM (R$ 4.554)</option>
            </select>

            <select
              aria-label="Filtrar por tamanho do núcleo familiar"
              value={filters.minHouseholdSize}
              onChange={(e) =>
                updateFilter(
                  'minHouseholdSize',
                  e.target.value as typeof filters.minHouseholdSize
                )
              }
              className="rounded-[6px] border border-[#C4D0D7] bg-white px-2 py-1.5 text-xs font-semibold text-[#0B3B49]"
            >
              <option value="ALL">Qualquer família</option>
              <option value="2">2 ou mais integrantes</option>
              <option value="3">3 ou mais integrantes</option>
              <option value="4">4 ou mais integrantes</option>
              <option value="5">5 ou mais integrantes</option>
            </select>

            <select
              aria-label="Filtrar por situação profissional"
              value={filters.employmentStatus}
              onChange={(e) =>
                updateFilter(
                  'employmentStatus',
                  e.target.value as EmploymentStatus | 'ALL'
                )
              }
              className="rounded-[6px] border border-[#C4D0D7] bg-white px-2 py-1.5 text-xs font-semibold text-[#0B3B49]"
            >
              <option value="ALL">Todas ocupações</option>
              {(Object.keys(EMPLOYMENT_LABELS) as EmploymentStatus[]).map((k) => (
                <option key={k} value={k}>
                  {EMPLOYMENT_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="font-bold text-[#0B3B49] tabular-nums">
              {filteredBeneficiaries.length} de {beneficiaries.length} registros no recorte
            </span>
            <div className="flex items-center gap-3">
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="font-bold text-[#D93829] hover:underline cursor-pointer"
                >
                  Limpar
                </button>
              )}
              <button
                type="button"
                onClick={() => setManagementView('consultas')}
                className="font-bold text-[#0E7490] hover:underline cursor-pointer"
              >
                Mais filtros
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Inspection Body — RBAC Aware! */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!canViewPii ? (
            <div className="space-y-4">
              <div className="rounded-[10px] border border-[#0E7490]/35 bg-[#EDF7FA] p-4 text-xs text-[#0B3B49]">
                <div className="flex items-center gap-2 font-display text-sm font-extrabold">
                  <Lock className="h-4 w-4 text-[#0E7490]" />
                  Modo Analista (Dados Agregados LGPD)
                </div>
                <p className="mt-1.5 leading-relaxed text-[#3B5560]">
                  Para análises gerais, o mapa exibe calor e indicadores agregados por bairro sem
                  expor o endereço exato ou o nome de cada família.
                </p>
                <button
                  type="button"
                  onClick={() => switchRole('AUDITOR_LGPD')}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-[7px] bg-[#0B3B49] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#072933] cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#E89B0C]" />
                  Alternar para Auditor (ver pontos individuais)
                </button>
              </div>

              <div>
                <h3 className="font-display text-sm font-extrabold text-[#0B3B49]">
                  Bairros no recorte atual ({summary.neighborhoodStats.length})
                </h3>
                <div className="mt-2 divide-y divide-[#DCE3E8] rounded-[8px] border border-[#DCE3E8] bg-white">
                  {summary.neighborhoodStats.slice(0, 10).map((n) => (
                    <div
                      key={n.neighborhood}
                      className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs"
                    >
                      <div>
                        <strong className="text-[#0B3B49]">{n.neighborhood}</strong>
                        <div className="text-[11px] text-[#52646D]">
                          {DISTRICT_BY_ID[n.districtId].shortName} | CLT {n.formalPct}% | Desemp.{' '}
                          {n.unemploymentPct}%
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="font-extrabold text-[#0B3B49]">{n.count} fam.</div>
                        <div className="text-[11px] font-semibold text-[#156F48]">
                          {formatCurrency(n.avgPerCapita)}/pes.
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : activeBeneficiary ? (
            <div className="space-y-4">
              {/* Selector when multiple records match */}
              <select
                aria-label="Selecionar beneficiário autorizado"
                value={activeBeneficiary.id}
                onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
                className="w-full rounded-[8px] border border-[#C4D0D7] bg-[#F8FAFB] px-3 py-2 text-xs font-bold text-[#0B3B49]"
              >
                {filteredBeneficiaries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.fullName} ({b.neighborhood})
                  </option>
                ))}
              </select>

              {(() => {
                const st = getRegistrationStatus(activeBeneficiary);
                const evo = getIncomeEvolution(activeBeneficiary);
                const pc = getPerCapitaIncome(activeBeneficiary);
                const benTotal = getSocialBenefitsTotal(activeBeneficiary);
                return (
                  <div className="space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
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
                        <span className="rounded-[4px] bg-[#EEF3F6] px-2 py-0.5 text-[11px] font-bold text-[#0B3B49]">
                          {WORK_REGIME_LABELS[activeBeneficiary.workRegime]}
                        </span>
                      </div>

                      <h2 className="font-display mt-2 text-lg font-extrabold text-[#0B3B49]">
                        {activeBeneficiary.fullName}
                      </h2>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-[#52646D]">
                        <MapPin className="h-3.5 w-3.5 text-[#D93829]" />
                        {activeBeneficiary.neighborhood} ({DISTRICT_BY_ID[activeBeneficiary.districtId].shortName}) |{' '}
                        {calculateAge(activeBeneficiary.birthDate)} anos | {activeBeneficiary.householdSize} pessoas
                      </p>
                    </div>

                    {activeBeneficiary.pendingValidation && (
                      <div className="flex items-center justify-between gap-2 rounded-[8px] border border-[#E89B0C] bg-[#FEF3DC] p-3 text-xs text-[#6E4400]">
                        <span>Cadastro aguardando conferência documental.</span>
                        <button
                          type="button"
                          onClick={() => validatePendingBeneficiary(activeBeneficiary.id)}
                          className="inline-flex shrink-0 items-center gap-1 rounded-[6px] bg-[#156F48] px-3 py-1.5 font-bold text-white cursor-pointer"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Validar
                        </button>
                      </div>
                    )}

                    {/* Financial Strip */}
                    <div className="grid grid-cols-3 gap-2 rounded-[8px] border border-[#DCE3E8] bg-[#F8FAFB] p-3 text-xs">
                      <div>
                        <div className="text-[11px] text-[#52646D]">Individual</div>
                        <div className="font-display text-base font-extrabold text-[#0B3B49] tabular-nums">
                          {formatCurrency(activeBeneficiary.individualIncome)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-[#52646D]">Familiar</div>
                        <div className="font-display text-base font-extrabold text-[#0B3B49] tabular-nums">
                          {formatCurrency(activeBeneficiary.householdTotalIncome)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-[#52646D]">Per capita</div>
                        <div className="font-display text-base font-extrabold text-[#156F48] tabular-nums">
                          {formatCurrency(pc)}
                        </div>
                      </div>
                    </div>

                    {/* Profile & Housing Summary */}
                    <div className="space-y-1.5 rounded-[8px] border border-[#DCE3E8] p-3 text-xs text-[#11222B]">
                      <div className="flex items-center gap-1.5 font-bold text-[#0B3B49]">
                        <Briefcase className="h-3.5 w-3.5 text-[#0E7490]" />
                        {activeBeneficiary.profession} ({activeBeneficiary.economicSector})
                      </div>
                      <div className="text-[#52646D]">
                        Moradia: <strong>{HOUSING_LABELS[activeBeneficiary.housingType]}</strong>
                        {activeBeneficiary.rentValue > 0
                          ? ` (aluguel ${formatCurrency(activeBeneficiary.rentValue)})`
                          : ''}
                      </div>
                      <div className="text-[#52646D]">
                        Benefícios ({activeBeneficiary.socialPrograms.length}):{' '}
                        <strong className="text-[#0B3B49]">{formatCurrency(benTotal)}/mês</strong>
                      </div>
                      <div className="text-[#52646D]">
                        Próxima atualização: <strong>{formatDateBr(activeBeneficiary.nextDueDate)}</strong>
                      </div>
                    </div>

                    {/* Household CPFs Linked */}
                    {(activeBeneficiary.householdMembers ?? []).length > 0 && (
                      <div className="rounded-[8px] border border-[#DCE3E8] bg-white p-3 text-xs">
                        <div className="font-bold text-[#0B3B49]">
                          Moradores vinculados por CPF ({activeBeneficiary.householdMembers?.length})
                        </div>
                        <div className="mt-1.5 space-y-1">
                          {activeBeneficiary.householdMembers?.map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between gap-2 text-[11px] text-[#52646D]"
                            >
                              <span className="truncate font-semibold text-[#11222B]">
                                {m.fullName} ({m.relationship})
                              </span>
                              <span className="font-code shrink-0 text-[#0B3B49]">{m.cpf}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Policy Self-Declaration vs Official Base Cross-Check */}
                    {activeBeneficiary.selfDeclaration && (
                      <div className="rounded-[8px] border border-[#0E7490]/30 bg-[#EDF7FA] p-3 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#0B3B49]">
                            Autodeclaração × Cruzamento
                          </span>
                          <span
                            className={`rounded-[4px] px-2 py-0.5 text-[10px] font-bold ${
                              activeBeneficiary.selfDeclaration.crossCheckStatus === 'CONFIRMADO'
                                ? 'bg-[#E6F4ED] text-[#156F48]'
                                : activeBeneficiary.selfDeclaration.crossCheckStatus === 'DIVERGENCIA'
                                  ? 'bg-[#FDE8E6] text-[#B52B1E]'
                                  : 'bg-[#FEF3DC] text-[#8A5600]'
                            }`}
                          >
                            {activeBeneficiary.selfDeclaration.crossCheckStatus === 'CONFIRMADO'
                              ? 'Confirmado'
                              : activeBeneficiary.selfDeclaration.crossCheckStatus === 'DIVERGENCIA'
                                ? 'Divergência'
                                : 'Aguardando'}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-[11px] text-[#3B5560]">
                          <div>
                            <strong>CadÚnico:</strong>{' '}
                            {activeBeneficiary.selfDeclaration.cadUnicoRegistered
                              ? `Sim (NIS ${activeBeneficiary.selfDeclaration.nis ?? 'informado'})`
                              : 'Não'}
                          </div>
                          <div>
                            <strong>UBS/USF:</strong>{' '}
                            {activeBeneficiary.selfDeclaration.ubsRegistered
                              ? activeBeneficiary.selfDeclaration.ubsName
                              : 'Não informada'}
                          </div>
                          <div>
                            <strong>CRAS:</strong>{' '}
                            {activeBeneficiary.selfDeclaration.crasRegistered
                              ? activeBeneficiary.selfDeclaration.crasName
                              : 'Não informado'}
                          </div>
                          {activeBeneficiary.selfDeclaration.publicSchoolStudent && (
                            <div>
                              <strong>Escola pública:</strong>{' '}
                              {activeBeneficiary.selfDeclaration.schoolName}
                            </div>
                          )}
                          {activeBeneficiary.selfDeclaration.passaporteUniversitario && (
                            <div>
                              <strong>Passaporte Univ.:</strong>{' '}
                              {activeBeneficiary.selfDeclaration.universityName} (
                              {activeBeneficiary.selfDeclaration.universityCourse})
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Longitudinal Evolution Timeline */}
                    <div className="rounded-[8px] border border-[#DCE3E8] bg-[#F8FAFB] p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-display text-xs font-extrabold text-[#0B3B49]">
                          <History className="h-4 w-4 text-[#0E7490]" />
                          Evolução longitudinal ({activeBeneficiary.history.length} ciclos)
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                            evo.trend === 'AUMENTO'
                              ? 'bg-[#E6F4ED] text-[#156F48]'
                              : evo.trend === 'REDUCAO'
                                ? 'bg-[#FDE8E6] text-[#B52B1E]'
                                : 'bg-[#EEF3F6] text-[#52646D]'
                          }`}
                        >
                          {evo.trend === 'AUMENTO' && <TrendingUp className="h-3 w-3" />}
                          {evo.trend === 'REDUCAO' && <TrendingDown className="h-3 w-3" />}
                          {evo.deltaValue >= 0
                            ? `+${formatCurrency(evo.deltaValue)}`
                            : formatCurrency(evo.deltaValue)}
                        </span>
                      </div>

                      <div className="mt-2.5 space-y-2 border-l-2 border-[#0E7490]/40 pl-3 text-xs">
                        {activeBeneficiary.history.map((h) => (
                          <div key={h.id}>
                            <div className="flex items-center justify-between">
                              <strong className="text-[#0B3B49]">
                                {h.cycleLabel} ({WORK_REGIME_LABELS[h.workRegime]})
                              </strong>
                              <span className="font-bold text-[#156F48] tabular-nums">
                                {formatCurrency(h.householdTotalIncome)}
                              </span>
                            </div>
                            <div className="text-[11px] text-[#52646D]">{h.note}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-[#52646D]">
              Nenhum beneficiário encontrado com esta combinação de filtros.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
