import { DISTRICT_BY_ID } from '../data/maricaGeo';
import type { BeneficiaryRecord, UserRole } from '../types/integra';
import {
  calculateAge,
  EMPLOYMENT_LABELS,
  formatDateBr,
  getIncomeEvolution,
  getPerCapitaIncome,
  getRegistrationStatus,
  getSocialBenefitsTotal,
  HOUSING_LABELS,
  maskCpf,
  pseudonymizeName,
  STATUS_LABELS,
  WORK_REGIME_LABELS,
} from './analyticsEngine';

function escapeCsvCell(val: string | number): string {
  const str = String(val ?? '');
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeXml(val: string | number): string {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildExportRows(records: BeneficiaryRecord[], role: UserRole) {
  const isAuthorized = role === 'AUDITOR_LGPD';
  const headers = [
    'ID',
    isAuthorized ? 'Nome Completo' : 'Beneficiário (LGPD)',
    'CPF',
    'Idade',
    'Escolaridade',
    'Bairro',
    'Distrito',
    'Moradia',
    'Aluguel (R$)',
    'Integrantes',
    'Dependentes',
    'Situação Profissional',
    'Regime',
    'Profissão',
    'Setor Econômico',
    'Renda Individual (R$)',
    'Renda Familiar (R$)',
    'Benefícios Sociais (R$)',
    'Renda Per Capita (R$)',
    'Programas',
    'CadÚnico',
    'UBS / USF Declarada',
    'CRAS Declarado',
    'Escola Pública',
    'Passaporte Universitário',
    'Cruzamento Bases',
    'Evolução Renda',
    'Status Cadastral',
    'Próximo Vencimento',
  ];

  const rows = records.map((b) => {
    const evo = getIncomeEvolution(b);
    const decl = b.selfDeclaration;
    return [
      b.id,
      isAuthorized ? b.fullName : pseudonymizeName(b.fullName),
      isAuthorized ? b.cpf : maskCpf(b.cpf),
      calculateAge(b.birthDate),
      b.education,
      b.neighborhood,
      DISTRICT_BY_ID[b.districtId].shortName,
      HOUSING_LABELS[b.housingType],
      b.rentValue,
      b.householdSize,
      b.dependentsCount,
      EMPLOYMENT_LABELS[b.employmentStatus],
      WORK_REGIME_LABELS[b.workRegime],
      b.profession,
      b.economicSector,
      b.individualIncome,
      b.householdTotalIncome,
      getSocialBenefitsTotal(b),
      getPerCapitaIncome(b),
      b.socialPrograms.map((p) => p.name).join(' | '),
      decl?.cadUnicoRegistered ? 'Sim' : 'Não',
      decl?.ubsRegistered ? decl.ubsName ?? 'Sim' : 'Não',
      decl?.crasRegistered ? decl.crasName ?? 'Sim' : 'Não',
      decl?.publicSchoolStudent ? decl.schoolName ?? 'Sim' : 'Não',
      decl?.passaporteUniversitario
        ? `${decl.universityName ?? ''} (${decl.universityCourse ?? ''})`
        : 'Não',
      decl?.crossCheckStatus ?? 'AGUARDANDO_CRUZAMENTO',
      evo.trend === 'AUMENTO'
        ? `Aumento (+R$ ${evo.deltaValue})`
        : evo.trend === 'REDUCAO'
          ? `Redução (R$ ${evo.deltaValue})`
          : 'Estável',
      STATUS_LABELS[getRegistrationStatus(b)],
      formatDateBr(b.nextDueDate),
    ];
  });

  return { headers, rows };
}

export function exportBeneficiariesCsv(
  records: BeneficiaryRecord[],
  role: UserRole,
  filenamePrefix = 'id-marica-relatorio'
) {
  const { headers, rows } = buildExportRows(records, role);
  const lines = [
    headers.map(escapeCsvCell).join(';'),
    ...rows.map((r) => r.map(escapeCsvCell).join(';')),
  ];
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `${filenamePrefix}-${stamp}.csv`);
}

export function exportBeneficiariesExcel(
  records: BeneficiaryRecord[],
  role: UserRole,
  filenamePrefix = 'id-marica-relatorio'
) {
  const { headers, rows } = buildExportRows(records, role);
  const headerXml = `<Row>${headers
    .map((h) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`)
    .join('')}</Row>`;
  const bodyXml = rows
    .map(
      (r) =>
        `<Row>${r
          .map((cell) => {
            const isNum = typeof cell === 'number';
            return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${escapeXml(cell)}</Data></Cell>`;
          })
          .join('')}</Row>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="hdr">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0B3B49" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Beneficiarios_Marica">
  <Table>
   ${headerXml}
   ${bodyXml}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const stamp = new Date().toISOString().slice(0, 10);
  triggerDownload(blob, `${filenamePrefix}-${stamp}.xls`);
}
