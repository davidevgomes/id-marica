import {
  Briefcase,
  Info,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { useIntegra } from '../context/IntegraContext';
import { DISTRICT_BY_ID } from '../data/maricaGeo';
import {
  computeSocioeconomicSummary,
  formatCurrency,
} from '../engine/analyticsEngine';

export function IndicatorsEvolutionView() {
  const { beneficiaries, filteredBeneficiaries, filters, resetFilters } = useIntegra();
  const usingSubset = filteredBeneficiaries.length !== beneficiaries.length;
  const dataset = filteredBeneficiaries.length > 0 ? filteredBeneficiaries : beneficiaries;

  const summary = useMemo(() => computeSocioeconomicSummary(dataset), [dataset]);

  const maxBracket = Math.max(1, ...summary.incomeBrackets.map((b) => b.count));
  const maxSector = Math.max(1, ...summary.sectorRanking.map((s) => s.count));
  const maxCycleIncome = Math.max(
    1,
    ...summary.longitudinal.cycles.map((c) => c.avgHouseholdIncome)
  );

  return (
    <div className="anim-step mx-auto max-w-[1440px] space-y-6 px-4 py-6 pb-24 sm:px-6 lg:pb-10">
      {/* Header + Statistical Scope Notice */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#DCE3E8] pb-4">
        <div>
          <div className="h-[3px] w-10 bg-[#E89B0C]" />
          <h1 className="font-display mt-2 text-2xl font-extrabold text-[#0B3B49]">
            Indicadores socioeconômicos e evolução longitudinal
          </h1>
          <p className="mt-1 text-xs text-[#52646D] sm:text-sm">
            Painel dinâmico gerado automaticamente a partir dos cadastros individuais e de suas
            atualizações trimestrais preservadas.
          </p>
        </div>

        {usingSubset && (
          <div className="flex items-center gap-2 rounded-[8px] border border-[#E89B0C] bg-[#FEF3DC] px-3.5 py-2 text-xs font-bold text-[#6E4400]">
            <span>
              Recorte filtrado ativo ({filteredBeneficiaries.length} de {beneficiaries.length}{' '}
              beneficiários)
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="underline hover:text-[#0B3B49] cursor-pointer"
            >
              Ver base completa
            </button>
          </div>
        )}
      </div>

      {/* Mandatory Statistical Scope Disclaimer */}
      <div className="flex items-start gap-2.5 rounded-[10px] border border-[#0E7490]/30 bg-[#EDF7FA] px-4 py-3 text-xs text-[#0B3B49]">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0E7490]" />
        <p className="leading-relaxed">
          <strong>Nota metodológica:</strong> todos os indicadores abaixo representam{' '}
          <strong>exclusivamente a população cadastrada</strong> no Integra Maricá (n ={' '}
          {summary.total} beneficiários no recorte atual), não devendo ser interpretados
          automaticamente como estatísticas do total populacional do município.
        </p>
      </div>

      {/* Primary KPI Strip (Mean + Median + Occupation + Formalization + Benefits-only) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[10px] border border-[#DCE3E8] bg-white p-4">
          <div className="text-xs font-semibold text-[#52646D]">Ocupação na base cadastrada</div>
          <div className="font-display mt-1.5 text-2xl font-extrabold text-[#0B3B49] tabular-nums">
            {summary.occupationRatePct}%
          </div>
          <div className="mt-1 text-xs text-[#52646D]">
            Desemprego na base: <strong className="text-[#D93829]">{summary.unemploymentRatePct}%</strong>
          </div>
        </div>

        <div className="rounded-[10px] border border-[#DCE3E8] bg-white p-4">
          <div className="text-xs font-semibold text-[#52646D]">Vínculo formal (CLT / Est.)</div>
          <div className="font-display mt-1.5 text-2xl font-extrabold text-[#156F48] tabular-nums">
            {summary.formalRatePct}%
          </div>
          <div className="mt-1 text-xs text-[#52646D]">
            {summary.formalCount} formais | {summary.informalOrAutoCount} MEI/informais
          </div>
        </div>

        <div className="rounded-[10px] border border-[#DCE3E8] bg-white p-4">
          <div className="text-xs font-semibold text-[#52646D]">Renda individual</div>
          <div className="font-display mt-1.5 text-2xl font-extrabold text-[#0B3B49] tabular-nums">
            {formatCurrency(summary.avgIndividualIncome)}
          </div>
          <div className="mt-1 text-xs text-[#52646D]">
            Mediana: <strong className="text-[#0B3B49]">{formatCurrency(summary.medianIndividualIncome)}</strong>
          </div>
        </div>

        <div className="rounded-[10px] border border-[#DCE3E8] bg-white p-4">
          <div className="text-xs font-semibold text-[#52646D]">Renda familiar mensal</div>
          <div className="font-display mt-1.5 text-2xl font-extrabold text-[#0B3B49] tabular-nums">
            {formatCurrency(summary.avgHouseholdIncome)}
          </div>
          <div className="mt-1 text-xs text-[#52646D]">
            Mediana: <strong className="text-[#0B3B49]">{formatCurrency(summary.medianHouseholdIncome)}</strong>
          </div>
        </div>

        <div className="rounded-[10px] border border-[#DCE3E8] bg-white p-4">
          <div className="text-xs font-semibold text-[#52646D]">Dependência exclusiva social</div>
          <div className="font-display mt-1.5 text-2xl font-extrabold text-[#D93829] tabular-nums">
            {summary.benefitsOnlyPct}%
          </div>
          <div className="mt-1 text-xs text-[#52646D]">
            Média familiar: <strong>{summary.avgHouseholdSize} pessoas</strong>
          </div>
        </div>
      </div>

      {/* Longitudinal Evolution Panel */}
      <section className="rounded-[12px] border border-[#0B3B49] bg-[#0B3B49] p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-4">
          <div>
            <h2 className="font-display text-lg font-extrabold text-white sm:text-xl">
              Evolução econômica longitudinal dos beneficiários
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#C2D6DC]">
              Comparação do histórico preservado entre o primeiro registro e as atualizações
              trimestrais. Retrata tendências observadas na base sem presumir causalidade exclusiva
              dos programas municipais.
            </p>
          </div>
          <span className="rounded-[5px] bg-[#072933] px-3 py-1.5 text-xs font-bold text-[#E89B0C]">
            Série de 3 ciclos (Mai a Nov/2026)
          </span>
        </div>

        {/* Transition Counters */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-[8px] bg-[#072933] p-4">
            <div className="flex items-center gap-1.5 text-xs text-[#C2D6DC]">
              <Briefcase className="h-4 w-4 text-[#E89B0C]" />
              Conseguiram emprego formal
            </div>
            <div className="font-display mt-1.5 text-3xl font-extrabold text-[#E89B0C] tabular-nums">
              {summary.longitudinal.gotFormalJobCount}
            </div>
            <div className="mt-0.5 text-[11px] text-[#9BC0CC]">
              Migraram para CLT ou Estatutário
            </div>
          </div>

          <div className="rounded-[8px] bg-[#072933] p-4">
            <div className="flex items-center gap-1.5 text-xs text-[#C2D6DC]">
              <TrendingUp className="h-4 w-4 text-[#4ADE80]" />
              Aumentaram a renda
            </div>
            <div className="font-display mt-1.5 text-3xl font-extrabold text-white tabular-nums">
              {summary.longitudinal.increasedIncomeCount}
            </div>
            <div className="mt-0.5 text-[11px] text-[#9BC0CC]">
              Renda familiar acima do 1º ciclo
            </div>
          </div>

          <div className="rounded-[8px] bg-[#072933] p-4">
            <div className="flex items-center gap-1.5 text-xs text-[#C2D6DC]">
              <Users className="h-4 w-4 text-[#38BDF8]" />
              Saíram da informalidade
            </div>
            <div className="font-display mt-1.5 text-3xl font-extrabold text-white tabular-nums">
              {summary.longitudinal.leftInformalityCount}
            </div>
            <div className="mt-0.5 text-[11px] text-[#9BC0CC]">
              Passaram de informal para CLT ou MEI
            </div>
          </div>

          <div className="rounded-[8px] bg-[#072933] p-4">
            <div className="flex items-center gap-1.5 text-xs text-[#C2D6DC]">
              <TrendingDown className="h-4 w-4 text-[#FCA5A5]" />
              Tiveram redução de renda
            </div>
            <div className="font-display mt-1.5 text-3xl font-extrabold text-[#FCA5A5] tabular-nums">
              {summary.longitudinal.decreasedIncomeCount}
            </div>
            <div className="mt-0.5 text-[11px] text-[#9BC0CC]">
              Prioridade para acompanhamento social
            </div>
          </div>
        </div>

        {/* 3-Cycle Visual Comparison Bars */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {summary.longitudinal.cycles.map((c) => (
            <div
              key={c.label}
              className="rounded-[8px] border border-white/12 bg-[#072933]/80 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-extrabold text-[#E89B0C]">
                  Ciclo {c.label}
                </span>
                <span className="font-display text-base font-extrabold text-white tabular-nums">
                  {formatCurrency(c.avgHouseholdIncome)}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-[#C2D6DC]">Renda familiar média na base</div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#E89B0C]"
                  style={{ width: `${Math.round((c.avgHouseholdIncome / maxCycleIncome) * 100)}%` }}
                />
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#C2D6DC]">Vínculo formal (CLT/Est.)</span>
                  <strong className="text-[#4ADE80] tabular-nums">{c.formalPct}%</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#C2D6DC]">Trabalho informal</span>
                  <strong className="text-[#FDE047] tabular-nums">{c.informalPct}%</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#C2D6DC]">Desemprego</span>
                  <strong className="text-[#FCA5A5] tabular-nums">{c.unemployedPct}%</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Two-Column Dynamic Distribution Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Income Brackets */}
        <div className="rounded-[12px] border border-[#DCE3E8] bg-white p-5">
          <h2 className="font-display text-base font-extrabold text-[#0B3B49]">
            Distribuição por faixa de renda individual
          </h2>
          <p className="mt-0.5 text-xs text-[#52646D]">
            Referência: salário mínimo vigente (R$ 1.518)
          </p>
          <div className="mt-4 space-y-3">
            {summary.incomeBrackets.map((br) => (
              <div key={br.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#11222B]">{br.label}</span>
                  <span className="font-bold text-[#0B3B49] tabular-nums">
                    {br.count} ({br.pct}%)
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[#EDF1F4]">
                  <div
                    className="h-full rounded-full bg-[#0E7490] transition-all duration-500"
                    style={{ width: `${Math.round((br.count / maxBracket) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Economic Sectors & Top Occupations */}
        <div className="rounded-[12px] border border-[#DCE3E8] bg-white p-5">
          <h2 className="font-display text-base font-extrabold text-[#0B3B49]">
            Setores econômicos e principais ocupações
          </h2>
          <p className="mt-0.5 text-xs text-[#52646D]">
            Base estratégica para políticas de qualificação e emprego em Maricá
          </p>
          <div className="mt-4 space-y-2.5">
            {summary.sectorRanking.slice(0, 6).map((s) => (
              <div key={s.sector}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#11222B]">{s.sector}</span>
                  <span className="font-bold text-[#0B3B49] tabular-nums">
                    {s.count} ({s.pct}%)
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#EDF1F4]">
                  <div
                    className="h-full rounded-full bg-[#156F48]"
                    style={{ width: `${Math.round((s.count / maxSector) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-[#DCE3E8] pt-3.5">
            <div className="text-xs font-bold text-[#0B3B49]">Ocupações mais frequentes</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {summary.occupationRanking.map((o) => (
                <span
                  key={o.profession}
                  className="rounded-[5px] border border-[#DCE3E8] bg-[#F8FAFB] px-2.5 py-1 text-xs font-semibold text-[#11222B]"
                >
                  {o.profession} ({o.count})
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Per Capita Ranking by Neighborhood */}
      <div className="rounded-[12px] border border-[#DCE3E8] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-extrabold text-[#0B3B49]">
              Renda familiar per capita média por bairro (população cadastrada)
            </h2>
            <p className="mt-0.5 text-xs text-[#52646D]">
              Comparação territorial de renda per capita, formalização e desemprego entre bairros
            </p>
          </div>
          {filters.districtId !== 'ALL' && (
            <span className="rounded-[5px] bg-[#EDF4F6] px-2.5 py-1 text-xs font-bold text-[#0B3B49]">
              Filtrado: {DISTRICT_BY_ID[filters.districtId].name}
            </span>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead>
              <tr className="border-b border-[#DCE3E8] text-[#52646D]">
                <th className="py-2 pr-4 font-bold">Bairro</th>
                <th className="py-2 pr-4 font-bold">Distrito</th>
                <th className="py-2 pr-4 text-right font-bold">Cadastrados</th>
                <th className="py-2 pr-4 text-right font-bold">Per capita médio</th>
                <th className="py-2 pr-4 text-right font-bold">Vínculo formal</th>
                <th className="py-2 text-right font-bold">Desemprego</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F4]">
              {summary.neighborhoodStats.map((n) => (
                <tr key={n.neighborhood} className="hover:bg-[#F8FAFB]">
                  <td className="py-2.5 pr-4 font-bold text-[#0B3B49]">{n.neighborhood}</td>
                  <td className="py-2.5 pr-4 text-[#52646D]">
                    {DISTRICT_BY_ID[n.districtId].shortName}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">{n.count}</td>
                  <td className="py-2.5 pr-4 text-right font-extrabold text-[#156F48] tabular-nums">
                    {formatCurrency(n.avgPerCapita)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-[#0E7490] tabular-nums">
                    {n.formalPct}%
                  </td>
                  <td className="py-2.5 text-right font-semibold text-[#D93829] tabular-nums">
                    {n.unemploymentPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
