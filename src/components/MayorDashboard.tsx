import {
  AlertTriangle,
  Briefcase,
  Building2,
  ChevronRight,
  ExternalLink,
  GraduationCap,
  HeartPulse,
  Lock,
  MapPin,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useIntegra } from '../context/IntegraContext';
import {
  calculateDistanceMeters,
  DISTRICT_BY_ID,
  FACILITY_BY_ID,
  formatDistance,
  MARICA_DISTRICTS,
} from '../data/maricaGeo';
import {
  calculateFamilyMetrics,
  formatCurrency,
  formatMumbucas,
  maskCpf,
  maskTitularName,
  PROGRAM_LABELS,
  TETO_EMANCIPACAO_GLOBAL,
} from '../engine/rulesEngine';
import { MaricaMap } from './MaricaMap';

type QuickFilter = 'ALL' | 'EM_DIA' | 'MUMBUCA_TRABALHO' | 'ATENCAO' | 'SIGILO';
type DossierTab = 'resumo' | 'bases';

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function MayorDashboard() {
  const {
    families,
    selectedFamilyId,
    setSelectedFamilyId,
    selectedDistrictFilter,
    setSelectedDistrictFilter,
    demoCounters,
    simulateCltAdmission,
    simulateCltDismissal,
    simulateTerritorialDivergence,
    openCitizenForFamily,
    openApiMonitor,
  } = useIntegra();

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dossierTab, setDossierTab] = useState<DossierTab>('resumo');

  const filteredFamilies = useMemo(() => {
    const q = normalizeText(searchQuery.trim());
    const qDigits = searchQuery.replace(/\D/g, '');
    return families.filter((f) => {
      if (selectedDistrictFilter !== 'ALL' && f.districtId !== selectedDistrictFilter) {
        return false;
      }
      if (quickFilter === 'EM_DIA' && f.status !== 'ATIVO') return false;
      if (quickFilter === 'MUMBUCA_TRABALHO' && !f.programs.includes('MUMBUCA_TRABALHO')) {
        return false;
      }
      if (
        quickFilter === 'ATENCAO' &&
        !(f.status === 'ALERTA_D15' || f.status === 'SUSPENSO_PREVENTIVO' || f.needsActiveSearch)
      ) {
        return false;
      }
      if (quickFilter === 'SIGILO' && !f.sigiloEspacial) return false;

      if (q.length > 0) {
        const districtName = DISTRICT_BY_ID[f.districtId].shortName;
        const searchable = normalizeText(
          `${maskTitularName(f.titularName, f.sigiloEspacial)} ${f.neighborhood} ${f.address} ${districtName}`
        );
        const cpfDigits = f.titularCpf.replace(/\D/g, '');
        const matchesText = searchable.includes(q);
        const matchesCpf = qDigits.length >= 2 && cpfDigits.includes(qDigits);
        if (!matchesText && !matchesCpf) return false;
      }
      return true;
    });
  }, [families, selectedDistrictFilter, quickFilter, searchQuery]);

  const activeFamily = useMemo(() => {
    if (filteredFamilies.length === 0) return null;
    return filteredFamilies.find((f) => f.id === selectedFamilyId) ?? filteredFamilies[0];
  }, [filteredFamilies, selectedFamilyId]);

  const hasActiveFilters =
    quickFilter !== 'ALL' || selectedDistrictFilter !== 'ALL' || searchQuery.trim().length > 0;

  const clearAllFilters = () => {
    setSearchQuery('');
    setQuickFilter('ALL');
    setSelectedDistrictFilter('ALL');
  };

  const telemetry = useMemo(() => {
    const baseFamilies = MARICA_DISTRICTS.reduce((s, d) => s + d.macroFamilies, 0);
    const baseClt = MARICA_DISTRICTS.reduce((s, d) => s + d.macroMumbucaTrabalho, 0);
    const basePending = MARICA_DISTRICTS.reduce((s, d) => s + d.macroPendingProof, 0);
    const activeSearchCount = families.filter((f) => f.needsActiveSearch).length;
    const adjustedPending = Math.max(0, basePending - demoCounters.proofsCompletedNow * 15);
    const proofPct = (((baseFamilies - adjustedPending) / baseFamilies) * 100)
      .toFixed(1)
      .replace('.', ',');

    return {
      totalFamilies: baseFamilies,
      totalClt: baseClt + demoCounters.cltTransitionsNow,
      activeSearchCount,
      proofPct,
      annualSavingsMil: (14.8 + demoCounters.estimatedSavingsDelta / 1_000_000)
        .toFixed(2)
        .replace('.', ','),
    };
  }, [families, demoCounters]);

  const selectedMetrics = useMemo(
    () => (activeFamily ? calculateFamilyMetrics(activeFamily) : null),
    [activeFamily]
  );

  const selectedUbs = activeFamily ? FACILITY_BY_ID[activeFamily.crossCheck.ubsId] : null;
  const selectedSchool =
    activeFamily?.crossCheck.schoolId
      ? FACILITY_BY_ID[activeFamily.crossCheck.schoolId]
      : null;

  const statusMeta = (status: string) => {
    switch (status) {
      case 'ATIVO':
        return { text: 'Regular e ativo', cls: 'bg-[#E6F4ED] text-[#156F48]' };
      case 'ALERTA_D15':
        return { text: 'Alerta D-15 (Fase 1)', cls: 'bg-[#FEF3DC] text-[#8A5600]' };
      case 'SUSPENSO_PREVENTIVO':
        return { text: 'Suspenso (Fase 2)', cls: 'bg-[#FDE8E6] text-[#B52B1E]' };
      default:
        return { text: 'Cancelado (Fase 4)', cls: 'bg-[#E5E7EB] text-[#374151]' };
    }
  };

  const faixaMeta = (faixa: string) => {
    switch (faixa) {
      case 'A':
        return { text: 'Faixa A (teto 1 SM)', cls: 'bg-[#EDF7FA] text-[#0E7490]' };
      case 'B':
        return { text: 'Faixa B (teto 2 SM)', cls: 'bg-[#EEF3F6] text-[#0B3B49]' };
      case 'C':
        return { text: 'Faixa C (humanitária)', cls: 'bg-[#F6E8F1] text-[#7B245A]' };
      default:
        return { text: 'Emancipado (> 3 SM)', cls: 'bg-[#E6F4ED] text-[#156F48]' };
    }
  };

  return (
    <div className="anim-step grid grid-cols-1 pb-20 lg:grid-cols-[1fr_436px] lg:pb-0">
      {/* Left Full-Bleed Maricá Cartographic Atlas */}
      <div className="relative">
        <MaricaMap
          families={filteredFamilies}
          selectedFamilyId={activeFamily?.id ?? null}
          onSelectFamily={setSelectedFamilyId}
          selectedDistrict={selectedDistrictFilter}
          onSelectDistrict={setSelectedDistrictFilter}
          telemetry={telemetry}
        />

        {/* Mobile-only compact telemetry strip */}
        <div className="grid grid-cols-2 gap-3 bg-[#0B3B49] px-4 py-3 text-white sm:hidden">
          <div>
            <div className="font-display text-base font-extrabold text-[#E89B0C] tabular-nums">
              {telemetry.totalFamilies.toLocaleString('pt-BR')}
            </div>
            <div className="text-[11px] text-[#C2D6DC]">Famílias mapeadas</div>
          </div>
          <div>
            <div className="font-display text-base font-extrabold text-[#E89B0C] tabular-nums">
              {telemetry.totalClt.toLocaleString('pt-BR')}
            </div>
            <div className="text-[11px] text-[#C2D6DC]">Mumbuca Trabalho</div>
          </div>
          <div>
            <div className="font-display text-base font-extrabold tabular-nums">
              {telemetry.proofPct}%
            </div>
            <div className="text-[11px] text-[#C2D6DC]">Prova de vida em dia</div>
          </div>
          <div>
            <div className="font-display text-base font-extrabold tabular-nums">
              R$ {telemetry.annualSavingsMil} mi
            </div>
            <div className="text-[11px] text-[#C2D6DC]">Saneamento anual</div>
          </div>
        </div>
      </div>

      {/* Right Focused Inspection Drawer with Instant Search & Intuitive Filters */}
      <aside className="flex flex-col border-t-[3px] border-[#E89B0C] bg-white lg:h-[calc(100dvh-62px)] lg:border-l-[3px] lg:border-t-0">
        {/* Search Bar + Status Filter Chips + Active Family Picker */}
        <div className="border-b border-[#DCE3E8] bg-[#F4F6F8] px-4 py-3.5 sm:px-5">
          {/* Real Instant Search Input */}
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52646D]"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, CPF ou bairro..."
              aria-label="Buscar família por nome, CPF ou bairro"
              className="w-full rounded-[8px] border border-[#C4D0D7] bg-white py-2.5 pl-9 pr-9 text-sm text-[#0B3B49] placeholder:text-[#6B7E88]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[5px] p-1 text-[#52646D] hover:bg-[#F4F6F8] hover:text-[#0B3B49] cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Clear Status Filter Pills */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: 'Todos' },
                { id: 'EM_DIA', label: 'Em dia' },
                { id: 'MUMBUCA_TRABALHO', label: 'CLT' },
                { id: 'ATENCAO', label: 'Atenção' },
                { id: 'SIGILO', label: 'Sigilo LGPD' },
              ] as { id: QuickFilter; label: string }[]
            ).map((f) => (
              <button
                type="button"
                key={f.id}
                onClick={() => setQuickFilter(f.id)}
                className={`rounded-[6px] px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                  quickFilter === f.id
                    ? 'bg-[#D93829] text-white'
                    : 'border border-[#DCE3E8] bg-white text-[#52646D] hover:border-[#0B3B49]/40 hover:text-[#0B3B49]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Count + Quick Selector / Live Search Matches */}
          <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
            <label htmlFor="family-select" className="font-bold text-[#0B3B49]">
              Mostrando {filteredFamilies.length} de {families.length} famílias
            </label>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="font-bold text-[#0E7490] hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {filteredFamilies.length > 0 && (
            <>
              <select
                id="family-select"
                value={activeFamily?.id ?? ''}
                onChange={(e) => setSelectedFamilyId(e.target.value)}
                className="mt-1.5 w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49] cursor-pointer"
              >
                {filteredFamilies.map((f) => (
                  <option key={f.id} value={f.id}>
                    {maskTitularName(f.titularName, f.sigiloEspacial)} ({f.neighborhood})
                  </option>
                ))}
              </select>

              {searchQuery.trim().length > 0 && filteredFamilies.length > 1 && (
                <div className="mt-2 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                  {filteredFamilies.map((f) => {
                    const isCurrent = f.id === activeFamily?.id;
                    return (
                      <button
                        type="button"
                        key={f.id}
                        onClick={() => setSelectedFamilyId(f.id)}
                        className={`rounded-[6px] px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#0B3B49] text-white'
                            : 'border border-[#DCE3E8] bg-white text-[#11222B] hover:border-[#0B3B49]'
                        }`}
                      >
                        {maskTitularName(f.titularName, f.sigiloEspacial)} ({DISTRICT_BY_ID[f.districtId].shortName})
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {activeFamily && selectedMetrics ? (
          <>
            {/* Family Identity Summary + 2 Clean Sub-Tabs */}
            <div className="border-b border-[#DCE3E8] px-5 pt-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-[4px] px-2 py-0.5 text-[11px] font-bold ${
                    statusMeta(activeFamily.status).cls
                  }`}
                >
                  {statusMeta(activeFamily.status).text}
                </span>
                <span
                  className={`rounded-[4px] px-2 py-0.5 text-[11px] font-bold ${
                    faixaMeta(selectedMetrics.faixaTeto).cls
                  }`}
                >
                  {faixaMeta(selectedMetrics.faixaTeto).text}
                </span>
              </div>

              <h2 className="font-display mt-2 text-xl font-extrabold leading-tight text-[#0B3B49]">
                {maskTitularName(activeFamily.titularName, activeFamily.sigiloEspacial)}
              </h2>

              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#52646D]">
                <span className="flex items-center gap-1 font-semibold text-[#11222B]">
                  <MapPin className="h-3.5 w-3.5 text-[#D93829]" />
                  {activeFamily.neighborhood}
                </span>
                <span>CPF {maskCpf(activeFamily.titularCpf)}</span>
              </div>

              {/* Clean Dossier Sub-Tabs */}
              <div className="mt-4 flex gap-5">
                <button
                  type="button"
                  onClick={() => setDossierTab('resumo')}
                  className={`relative pb-2.5 text-xs font-bold transition-colors cursor-pointer ${
                    dossierTab === 'resumo'
                      ? 'text-[#0B3B49]'
                      : 'text-[#52646D] hover:text-[#0B3B49]'
                  }`}
                >
                  Benefício e simulação
                  {dossierTab === 'resumo' && (
                    <span className="absolute inset-x-0 bottom-0 h-[2.5px] bg-[#D93829]" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDossierTab('bases')}
                  className={`relative flex items-center gap-1.5 pb-2.5 text-xs font-bold transition-colors cursor-pointer ${
                    dossierTab === 'bases'
                      ? 'text-[#0B3B49]'
                      : 'text-[#52646D] hover:text-[#0B3B49]'
                  }`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Bases cruzadas e família ({activeFamily.members.length})
                  {dossierTab === 'bases' && (
                    <span className="absolute inset-x-0 bottom-0 h-[2.5px] bg-[#D93829]" />
                  )}
                </button>
              </div>
            </div>

            {/* Scrollable Tab Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {dossierTab === 'resumo' ? (
                <div key="tab-resumo" className="anim-step space-y-5">
                  {activeFamily.sigiloEspacial && (
                    <div className="flex items-start gap-2.5 rounded-[6px] border border-[#7B245A]/30 bg-[#F6E8F1] p-3 text-xs text-[#54163D]">
                      <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#7B245A]" />
                      <div>
                        <strong>Sigilo espacial LGPD ativo.</strong> Coordenadas criptografadas
                        (AES-256) e ofuscadas no mapa. Token CRAS:{' '}
                        <strong>{activeFamily.humanitarianToken}</strong>.
                      </div>
                    </div>
                  )}

                  {activeFamily.crossCheck.territorialDivergence && (
                    <div className="flex items-start gap-2.5 rounded-[6px] border border-[#D93829]/30 bg-[#FDE8E6] p-3 text-xs text-[#8E2016]">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#D93829]" />
                      <div>
                        <strong>Alerta territorial:</strong>{' '}
                        {activeFamily.crossCheck.divergenceReason}
                      </div>
                    </div>
                  )}

                  {/* Financial Metrics with Live Pop Animation */}
                  <div className="grid grid-cols-3 gap-3 rounded-[8px] border border-[#DCE3E8] bg-[#F8FAFB] p-3.5">
                    <div>
                      <div className="text-[11px] font-medium text-[#52646D]">Folha Mumbuca</div>
                      <div
                        key={selectedMetrics.totalMumbucasMonthly}
                        className="anim-value-pop font-display mt-0.5 text-lg font-extrabold text-[#0B3B49] tabular-nums"
                      >
                        {formatMumbucas(selectedMetrics.totalMumbucasMonthly)}
                      </div>
                      <div className="text-[11px] text-[#52646D]">
                        {selectedMetrics.cltCount > 0
                          ? `CLT ${selectedMetrics.cltCount}x + RBC ${selectedMetrics.rbcDependentQuotaPct}%`
                          : 'RBC integral'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-[#52646D]">Renda global</div>
                      <div
                        key={selectedMetrics.totalHouseholdIncome}
                        className="anim-value-pop font-display mt-0.5 text-lg font-extrabold text-[#11222B] tabular-nums"
                      >
                        {formatCurrency(selectedMetrics.totalHouseholdIncome)}
                      </div>
                      <div className="text-[11px] text-[#52646D]">Salários e auxílios</div>
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-[#52646D]">Prova de vida</div>
                      <div
                        className={`font-display mt-0.5 text-lg font-extrabold tabular-nums ${
                          activeFamily.daysUntilProofDue <= 0
                            ? 'text-[#D93829]'
                            : activeFamily.daysUntilProofDue <= 15
                              ? 'text-[#8A5600]'
                              : 'text-[#156F48]'
                        }`}
                      >
                        {activeFamily.daysUntilProofDue > 0
                          ? `${activeFamily.daysUntilProofDue} dias`
                          : `${Math.abs(activeFamily.daysUntilProofDue)}d venc.`}
                      </div>
                      <div className="text-[11px] text-[#52646D]">Ciclo de 90 dias</div>
                    </div>
                  </div>

                  {/* Emancipation Cap Meter */}
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#52646D]">
                        Teto de emancipação (3 SM = {formatCurrency(TETO_EMANCIPACAO_GLOBAL)})
                      </span>
                      <span className="font-bold text-[#0B3B49] tabular-nums">
                        {Math.min(
                          100,
                          Math.round(
                            (selectedMetrics.totalHouseholdIncome / TETO_EMANCIPACAO_GLOBAL) * 100
                          )
                        )}
                        %
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#E2E8EC]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round(
                              (selectedMetrics.totalHouseholdIncome / TETO_EMANCIPACAO_GLOBAL) * 100
                            )
                          )}%`,
                          backgroundColor: selectedMetrics.exceedsEmancipationCap
                            ? '#156F48'
                            : selectedMetrics.cltCount > 0
                              ? '#0E7490'
                              : '#E89B0C',
                        }}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {activeFamily.programs.map((p) => (
                        <span
                          key={p}
                          className="rounded-[4px] border border-[#DCE3E8] bg-[#F8FAFB] px-2.5 py-0.5 text-[11px] font-semibold text-[#11222B]"
                        >
                          {PROGRAM_LABELS[p]}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Rules Engine Live Actions */}
                  <div className="border-t border-[#DCE3E8] pt-4">
                    <div className="mb-2.5 flex items-center justify-between">
                      <h3 className="font-display text-sm font-extrabold text-[#0B3B49]">
                        Simular evento no motor de regras
                      </h3>
                      <button
                        type="button"
                        onClick={openApiMonitor}
                        className="inline-flex items-center gap-0.5 text-xs font-bold text-[#0E7490] hover:underline cursor-pointer"
                      >
                        Ver integrações
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => simulateCltAdmission(activeFamily.id)}
                        className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[6px] bg-[#156F48] px-3 py-2 text-xs font-bold text-white transition-all hover:bg-[#115B3B] active:scale-[0.98] cursor-pointer"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Admissão CLT
                      </button>
                      <button
                        type="button"
                        onClick={() => simulateCltDismissal(activeFamily.id)}
                        className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[6px] bg-[#E89B0C] px-3 py-2 text-xs font-bold text-[#072933] transition-all hover:bg-[#D48D09] active:scale-[0.98] cursor-pointer"
                      >
                        <TrendingDown className="h-3.5 w-3.5" />
                        Demissão (Fase 3)
                      </button>
                      <button
                        type="button"
                        onClick={() => simulateTerritorialDivergence(activeFamily.id)}
                        className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[6px] border border-[#D93829]/40 bg-white px-3 py-2 text-xs font-bold text-[#D93829] transition-colors hover:bg-[#FDE8E6] cursor-pointer"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Alerta territorial
                      </button>
                      <button
                        type="button"
                        onClick={() => openCitizenForFamily(activeFamily.id)}
                        className="flex min-h-[42px] items-center justify-center gap-1.5 rounded-[6px] bg-[#0B3B49] px-3 py-2 text-xs font-bold text-white transition-all hover:bg-[#072933] active:scale-[0.98] cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-[#E89B0C]" />
                        Abrir no portal
                      </button>
                    </div>
                  </div>

                  {/* Decoupled Banco Mumbuca Note */}
                  <div className="flex items-start gap-2.5 border-l-[3px] border-[#0B3B49] bg-[#F4F6F8] p-3 text-xs text-[#52646D]">
                    <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-[#0B3B49]" />
                    <p>
                      A carteira do <strong>Banco Mumbuca</strong> segue intacta. Cada regra acima
                      envia apenas o comando de status, distrito e valor da folha via API.
                    </p>
                  </div>
                </div>
              ) : (
                <div key="tab-bases" className="anim-step space-y-5">
                  {/* Full-width Intersectoral Cross-Check Rows */}
                  <div>
                    <h3 className="font-display mb-2 text-sm font-extrabold text-[#0B3B49]">
                      Cruzamento intersetorial de bases
                    </h3>
                    <div className="divide-y divide-[#DCE3E8] rounded-[8px] border border-[#DCE3E8] bg-[#F8FAFB] text-xs">
                      <div className="flex items-start gap-3 p-3">
                        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#0E7490]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <strong className="text-[#0B3B49]">CadÚnico / MDS</strong>
                            <span
                              className={`font-bold ${
                                activeFamily.crossCheck.cadUnicoStatus === 'REGULAR'
                                  ? 'text-[#156F48]'
                                  : 'text-[#D93829]'
                              }`}
                            >
                              {activeFamily.crossCheck.cadUnicoStatus}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#52646D]">
                            Atualizado em {activeFamily.crossCheck.cadUnicoUpdatedAt}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3">
                        <Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-[#156F48]" />
                        <div className="min-w-0 flex-1">
                          <strong className="text-[#0B3B49]">CAGED / eSocial</strong>
                          <div className="mt-0.5 text-[11px] text-[#52646D]">
                            {activeFamily.crossCheck.eSocialLastEvent}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3">
                        <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-[#D93829]" />
                        <div className="min-w-0 flex-1">
                          <strong className="text-[#0B3B49]">Unidade de Saúde da Família (e-SUS)</strong>
                          <div className="mt-0.5 text-[11px] text-[#52646D]">
                            {selectedUbs
                              ? `${selectedUbs.name} (${
                                  activeFamily.sigiloEspacial
                                    ? 'distância protegida por LGPD'
                                    : `${formatDistance(
                                        calculateDistanceMeters(
                                          activeFamily.coords,
                                          selectedUbs.coords
                                        )
                                      )} da residência`
                                })`
                              : 'Sem registro de atendimento'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3">
                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-[#0B3B49]" />
                        <div className="min-w-0 flex-1">
                          <strong className="text-[#0B3B49]">e-Cidade Educação</strong>
                          <div className="mt-0.5 text-[11px] text-[#52646D]">
                            {selectedSchool
                              ? `${selectedSchool.name} (frequência escolar ${activeFamily.crossCheck.schoolAttendancePct}%)`
                              : 'Sem dependentes em idade escolar'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Household Members */}
                  <div>
                    <h3 className="font-display mb-2 text-sm font-extrabold text-[#0B3B49]">
                      Composição familiar ({activeFamily.members.length})
                    </h3>
                    <div className="divide-y divide-[#DCE3E8] border-y border-[#DCE3E8]">
                      {activeFamily.members.map((m) => {
                        const isClt = m.occupationalStatus === 'CLT_MUMBUCA';
                        const quotaValue =
                          activeFamily.status === 'CANCELADO'
                            ? 0
                            : isClt
                              ? 350
                              : selectedMetrics.rbcDependentQuotaPct === 50
                                ? 115
                                : 230;
                        return (
                          <div
                            key={m.id}
                            className="flex items-center justify-between py-2.5 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-[#0B3B49]">
                                {activeFamily.sigiloEspacial
                                  ? maskTitularName(m.name, true)
                                  : m.name}
                              </span>
                              <span className="ml-1.5 text-[11px] text-[#52646D]">
                                {m.age} anos ({m.role.toLowerCase()})
                              </span>
                            </div>
                            <span
                              className={`shrink-0 rounded-[4px] px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                                isClt
                                  ? 'bg-[#EDF7FA] text-[#0E7490]'
                                  : 'bg-[#F4F6F8] text-[#11222B]'
                              }`}
                            >
                              {isClt ? 'CLT M$ 350' : `RBC M$ ${quotaValue}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <Search className="h-8 w-8 text-[#8FA3AF]" />
            <p className="font-display mt-3 text-base font-extrabold text-[#0B3B49]">
              Nenhuma família encontrada
            </p>
            <p className="mt-1 text-xs text-[#52646D]">
              Ajuste o termo buscado ou limpe os filtros de distrito e situação.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 rounded-[8px] bg-[#0B3B49] px-4 py-2 text-xs font-bold text-white hover:bg-[#072933] cursor-pointer"
              >
                Limpar busca e filtros
              </button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
