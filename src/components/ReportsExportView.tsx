import {
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  Printer,
} from 'lucide-react';
import { useMemo } from 'react';
import { useIntegra } from '../context/IntegraContext';
import { DISTRICT_BY_ID, MARICA_DISTRICTS } from '../data/maricaGeo';
import {
  computeSocioeconomicSummary,
  EMPLOYMENT_LABELS,
  formatCurrency,
  getPerCapitaIncome,
  getRegistrationStatus,
  maskCpf,
  pseudonymizeName,
  SOCIAL_PROGRAM_OPTIONS,
  STATUS_LABELS,
  WORK_REGIME_LABELS,
} from '../engine/analyticsEngine';
import { exportBeneficiariesCsv, exportBeneficiariesExcel } from '../engine/exportUtils';
import type { DistrictId, EmploymentStatus } from '../types/integra';

export function ReportsExportView() {
  const {
    filteredBeneficiaries,
    filters,
    updateFilter,
    resetFilters,
    authSession,
    activeRoleProfile,
    recordAuditEvent,
    pushToast,
  } = useIntegra();

  const summary = useMemo(
    () => computeSocioeconomicSummary(filteredBeneficiaries),
    [filteredBeneficiaries]
  );

  const role = authSession?.role ?? 'ANALISTA_AGREGADO';
  const canViewPii = Boolean(activeRoleProfile?.canViewFullPii);

  const handleExportCsv = () => {
    exportBeneficiariesCsv(filteredBeneficiaries, role);
    recordAuditEvent(
      `Exportação de planilha CSV (${filteredBeneficiaries.length} registros)`,
      canViewPii ? 'Dados nominais autorizados' : 'Dados pseudonimizados (LGPD)',
      'Art. 7º, III da LGPD: gestão de políticas públicas',
      'warning'
    );
    pushToast('Arquivo CSV gerado', `${filteredBeneficiaries.length} registros exportados.`, 'success');
  };

  const handleExportExcel = () => {
    exportBeneficiariesExcel(filteredBeneficiaries, role);
    recordAuditEvent(
      `Exportação de planilha Excel .xls (${filteredBeneficiaries.length} registros)`,
      canViewPii ? 'Dados nominais autorizados' : 'Dados pseudonimizados (LGPD)',
      'Art. 7º, III da LGPD: gestão de políticas públicas',
      'warning'
    );
    pushToast('Planilha Excel gerada', `Download .xls concluído (${filteredBeneficiaries.length} linhas).`, 'success');
  };

  const handleExportPdf = () => {
    recordAuditEvent(
      `Emissão de relatório consolidado PDF (${filteredBeneficiaries.length} registros)`,
      'Relatório gerencial consolidado',
      'Art. 12 da LGPD: relatório estatístico',
      'info'
    );
    window.print();
  };

  return (
    <div className="anim-step mx-auto max-w-[1380px] space-y-6 px-4 py-6 pb-24 sm:px-6 lg:pb-10">
      {/* Header (Hidden on print for clean executive PDF) */}
      <div className="print:hidden flex flex-wrap items-end justify-between gap-4 border-b border-[#DCE3E8] pb-4">
        <div>
          <div className="h-[3px] w-10 bg-[#E89B0C]" />
          <h1 className="font-display mt-2 text-2xl font-extrabold text-[#0B3B49]">
            Relatórios personalizados e exportação
          </h1>
          <p className="mt-1 text-xs text-[#52646D] sm:text-sm">
            Configure o recorte por território, programa ou situação profissional e exporte em
            Excel, CSV ou PDF consolidado com registro automático na auditoria LGPD.
          </p>
        </div>
      </div>

      {/* Report Filter Controls + Export Actions */}
      <div className="print:hidden rounded-[12px] border border-[#DCE3E8] bg-white p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            aria-label="Filtrar relatório por distrito"
            value={String(filters.districtId)}
            onChange={(e) =>
              updateFilter(
                'districtId',
                e.target.value === 'ALL' ? 'ALL' : (Number(e.target.value) as DistrictId)
              )
            }
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Território: Toda Maricá</option>
            {MARICA_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar relatório por programa"
            value={filters.programName}
            onChange={(e) => updateFilter('programName', e.target.value)}
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Benefício: Todos programas</option>
            {SOCIAL_PROGRAM_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            aria-label="Filtrar relatório por situação profissional"
            value={filters.employmentStatus}
            onChange={(e) =>
              updateFilter('employmentStatus', e.target.value as EmploymentStatus | 'ALL')
            }
            className="min-h-[42px] rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
          >
            <option value="ALL">Situação: Todas</option>
            {(Object.keys(EMPLOYMENT_LABELS) as EmploymentStatus[]).map((k) => (
              <option key={k} value={k}>
                {EMPLOYMENT_LABELS[k]}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={resetFilters}
            className="min-h-[42px] rounded-[8px] border border-[#DCE3E8] bg-[#F4F6F8] px-3 py-2 text-xs font-bold text-[#0B3B49] hover:bg-[#E8EEF2] cursor-pointer"
          >
            Redefinir filtros ({filteredBeneficiaries.length} registros)
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE3E8] pt-4">
          <div className="flex items-center gap-2 text-xs text-[#52646D]">
            <Lock className="h-4 w-4 text-[#0E7490]" />
            <span>
              Exportação no perfil <strong>{activeRoleProfile?.shortLabel}</strong>:{' '}
              {canViewPii
                ? 'inclui identificação nominal autorizada e registra log LGPD.'
                : 'nomes e CPFs são automaticamente pseudonimizados (LGPD).'}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[8px] bg-[#156F48] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#115B3B] cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel (.xls)
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[8px] bg-[#0B3B49] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#072933] cursor-pointer"
            >
              <Download className="h-4 w-4 text-[#E89B0C]" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[8px] bg-[#D93829] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#B52B1E] cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Relatório PDF
            </button>
          </div>
        </div>
      </div>

      {/* Printable Consolidated Executive Report Preview */}
      <article className="rounded-[12px] border border-[#DCE3E8] bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#0B3B49] pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#0E7490]">
              <FileText className="h-4 w-4" />
              Prévia do Relatório Consolidado: ID Maricá
            </div>
            <h2 className="font-display mt-1 text-xl font-extrabold text-[#0B3B49]">
              Síntese Socioeconômica da População Cadastrada
            </h2>
            <p className="mt-1 text-xs text-[#52646D]">
              Emitido por {authSession?.userName ?? 'Gestão'} ({activeRoleProfile?.shortLabel}) |
              Recorte: {filteredBeneficiaries.length} beneficiários | Dados restritos à base
              cadastrada.
            </p>
          </div>
          <div className="text-right text-xs text-[#52646D]">
            <div>Prefeitura Municipal de Maricá</div>
            <div className="font-bold text-[#0B3B49]">Ciclo Novembro/2026</div>
          </div>
        </div>

        {/* Summary KPI Table */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[8px] border border-[#DCE3E8] bg-[#F8FAFB] p-3.5">
            <div className="text-[11px] text-[#52646D]">Total no recorte</div>
            <div className="font-display mt-0.5 text-xl font-extrabold text-[#0B3B49] tabular-nums">
              {summary.total}
            </div>
          </div>
          <div className="rounded-[8px] border border-[#DCE3E8] bg-[#F8FAFB] p-3.5">
            <div className="text-[11px] text-[#52646D]">Per capita médio</div>
            <div className="font-display mt-0.5 text-xl font-extrabold text-[#156F48] tabular-nums">
              {formatCurrency(summary.avgPerCapitaIncome)}
            </div>
          </div>
          <div className="rounded-[8px] border border-[#DCE3E8] bg-[#F8FAFB] p-3.5">
            <div className="text-[11px] text-[#52646D]">Vínculo formal</div>
            <div className="font-display mt-0.5 text-xl font-extrabold text-[#0E7490] tabular-nums">
              {summary.formalRatePct}%
            </div>
          </div>
          <div className="rounded-[8px] border border-[#DCE3E8] bg-[#F8FAFB] p-3.5">
            <div className="text-[11px] text-[#52646D]">Conseguiram emprego CLT</div>
            <div className="font-display mt-0.5 text-xl font-extrabold text-[#0B3B49] tabular-nums">
              {summary.longitudinal.gotFormalJobCount}
            </div>
          </div>
        </div>

        {/* Preview Rows */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-[#DCE3E8] text-[#52646D]">
                <th className="py-2 pr-3 font-bold">Beneficiário</th>
                <th className="py-2 pr-3 font-bold">CPF</th>
                <th className="py-2 pr-3 font-bold">Bairro / Distrito</th>
                <th className="py-2 pr-3 font-bold">Regime</th>
                <th className="py-2 pr-3 text-right font-bold">Per capita</th>
                <th className="py-2 text-right font-bold">Validade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDF1F4]">
              {filteredBeneficiaries.slice(0, 12).map((b) => (
                <tr key={b.id}>
                  <td className="py-2 pr-3 font-semibold text-[#0B3B49]">
                    {canViewPii ? b.fullName : pseudonymizeName(b.fullName)}
                  </td>
                  <td className="py-2 pr-3 text-[#52646D]">
                    {canViewPii ? b.cpf : maskCpf(b.cpf)}
                  </td>
                  <td className="py-2 pr-3 text-[#11222B]">
                    {b.neighborhood} ({DISTRICT_BY_ID[b.districtId].shortName})
                  </td>
                  <td className="py-2 pr-3 text-[#52646D]">{WORK_REGIME_LABELS[b.workRegime]}</td>
                  <td className="py-2 pr-3 text-right font-bold text-[#156F48] tabular-nums">
                    {formatCurrency(getPerCapitaIncome(b))}
                  </td>
                  <td className="py-2 text-right text-[#52646D]">
                    {STATUS_LABELS[getRegistrationStatus(b)]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredBeneficiaries.length > 12 && (
            <p className="mt-3 text-xs text-[#52646D]">
              Exibindo 12 de {filteredBeneficiaries.length} registros na prévia. O arquivo Excel ou
              CSV contém a listagem completa do recorte.
            </p>
          )}
        </div>
      </article>
    </div>
  );
}
