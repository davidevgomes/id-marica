import type {
  BeneficiaryFilterState,
  BeneficiaryRecord,
  DistrictId,
  EmploymentStatus,
  HousingType,
  IncomeTrend,
  RegistrationStatus,
  WorkRegime,
} from '../types/integra';

export const SALARIO_MINIMO_REF = 1518;
export const VALIDADE_CADASTRO_DIAS = 90;
export const REFERENCE_TODAY = '2026-11-23';

export const DEFAULT_FILTER_STATE: BeneficiaryFilterState = {
  search: '',
  districtId: 'ALL',
  neighborhood: 'ALL',
  registrationStatus: 'ALL',
  employmentStatus: 'ALL',
  workRegime: 'ALL',
  economicSector: 'ALL',
  programName: 'ALL',
  maxIndividualIncomeSm: 'ALL',
  minHouseholdSize: 'ALL',
  multiProgramOnly: false,
  incomeTrend: 'ALL',
  cadUnicoOnly: false,
  publicSchoolOnly: false,
  passaporteOnly: false,
  crossCheckStatus: 'ALL',
};

export const EMPLOYMENT_LABELS: Record<EmploymentStatus, string> = {
  EMPREGADO: 'Empregado',
  DESEMPREGADO: 'Desempregado',
  AUTONOMO: 'Autônomo / MEI',
  INFORMAL: 'Trabalhador informal',
  APOSENTADO: 'Aposentado / Pensionista',
  ESTUDANTE: 'Estudante / Estagiário',
};

export const WORK_REGIME_LABELS: Record<WorkRegime, string> = {
  CLT: 'Carteira assinada (CLT)',
  ESTATUTARIO: 'Estatutário / Público',
  MEI: 'MEI / Empreendedor',
  INFORMAL: 'Sem carteira (Informal)',
  SEM_VINCULO: 'Sem vínculo atual',
  APOSENTADO: 'Aposentadoria / BPC',
};

export const HOUSING_LABELS: Record<HousingType, string> = {
  TEMPORARIA: 'Moradia temporária',
  PROPRIA: 'Própria quitada',
  ALUGADA: 'Alugada',
  CEDIDA: 'Cedida / Familiar',
  FINANCIADA: 'Financiada',
  OUTRA: 'Outra condição',
};

export const STATUS_LABELS: Record<RegistrationStatus, string> = {
  ATUALIZADO: 'Atualizado',
  PROXIMO_VENCIMENTO: 'Próximo do vencimento',
  VENCIDO: 'Vencido (aguardando atualização)',
  PENDENTE_VALIDACAO: 'Pendente de validação',
};

export const ECONOMIC_SECTORS = [
  'Comércio',
  'Serviços',
  'Construção Civil',
  'Saúde e Educação',
  'Turismo e Gastronomia',
  'Indústria e Logística',
  'Economia Solidária',
  'Administração Pública',
  'Sem atividade econômica',
] as const;

export const SOCIAL_PROGRAM_OPTIONS = [
  'Renda Básica de Cidadania (Mumbuca)',
  'Mumbuca Trabalho',
  'Mumbuca Futuro (Poupança Jovem)',
  'Mumbuca Gestante / Mãe Maricaense',
  'Passaporte Universitário',
  'Programa de Proteção ao Trabalhador (PPT)',
  'Auxílio Aluguel / Locação Social',
  'Tarifa Zero (Vermelhinhos — Ônibus)',
  'Vermelhinhas (Bicicletas Compartilhadas)',
  'Bolsa Família',
  'BPC / LOAS',
  'Tarifa Social de Energia Elétrica',
] as const;

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function calculateAge(birthDate: string, refDate = REFERENCE_TODAY): number {
  const b = new Date(`${birthDate}T00:00:00`);
  const r = new Date(`${refDate}T00:00:00`);
  if (Number.isNaN(b.getTime())) return 0;
  let age = r.getFullYear() - b.getFullYear();
  const m = r.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && r.getDate() < b.getDate())) age--;
  return Math.max(0, age);
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDaysIso(targetIso: string, refIso = REFERENCE_TODAY): number {
  const t = new Date(`${targetIso}T00:00:00`).getTime();
  const r = new Date(`${refIso}T00:00:00`).getTime();
  return Math.round((t - r) / (1000 * 60 * 60 * 24));
}

export function formatDateBr(isoDate: string): string {
  if (!isoDate || !isoDate.includes('-')) return isoDate;
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export function maskCpf(cpf: string): string {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function pseudonymizeName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return `${parts[0]?.charAt(0) ?? 'B'}.***`;
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}. (LGPD)`;
}

export function getSocialBenefitsTotal(b: BeneficiaryRecord): number {
  return b.socialPrograms.reduce((sum, p) => sum + p.monthlyValue, 0);
}

export function getPerCapitaIncome(b: BeneficiaryRecord): number {
  const size = Math.max(1, b.householdSize);
  const totalWithBenefits = b.householdTotalIncome + getSocialBenefitsTotal(b);
  return Math.round(totalWithBenefits / size);
}

export function getRegistrationStatus(
  b: Pick<BeneficiaryRecord, 'nextDueDate' | 'pendingValidation'>
): RegistrationStatus {
  if (b.pendingValidation) return 'PENDENTE_VALIDACAO';
  const daysLeft = diffDaysIso(b.nextDueDate);
  if (daysLeft < 0) return 'VENCIDO';
  if (daysLeft <= 15) return 'PROXIMO_VENCIMENTO';
  return 'ATUALIZADO';
}

export function getIncomeEvolution(b: BeneficiaryRecord): {
  trend: IncomeTrend;
  deltaValue: number;
  firstIncome: number;
  currentIncome: number;
  gotFormalJob: boolean;
  leftInformality: boolean;
} {
  const sorted = [...b.history].sort((a, c) => a.date.localeCompare(c.date));
  const earliest = sorted[0];
  const currentIncome = b.householdTotalIncome;
  const firstIncome = earliest ? earliest.householdTotalIncome : currentIncome;
  const deltaValue = currentIncome - firstIncome;
  const trend: IncomeTrend =
    deltaValue >= 100 ? 'AUMENTO' : deltaValue <= -100 ? 'REDUCAO' : 'ESTAVEL';

  const gotFormalJob = Boolean(
    earliest &&
      earliest.workRegime !== 'CLT' &&
      earliest.workRegime !== 'ESTATUTARIO' &&
      (b.workRegime === 'CLT' || b.workRegime === 'ESTATUTARIO')
  );

  const leftInformality = Boolean(
    earliest &&
      earliest.workRegime === 'INFORMAL' &&
      (b.workRegime === 'CLT' || b.workRegime === 'MEI' || b.workRegime === 'ESTATUTARIO')
  );

  return { trend, deltaValue, firstIncome, currentIncome, gotFormalJob, leftInformality };
}

export function applyCombinedFilters(
  records: BeneficiaryRecord[],
  filters: BeneficiaryFilterState
): BeneficiaryRecord[] {
  const q = normalizeSearch(filters.search.trim());
  const qDigits = filters.search.replace(/\D/g, '');

  return records.filter((b) => {
    if (filters.districtId !== 'ALL' && b.districtId !== filters.districtId) return false;
    if (
      filters.neighborhood !== 'ALL' &&
      normalizeSearch(b.neighborhood) !== normalizeSearch(filters.neighborhood)
    ) {
      return false;
    }
    if (
      filters.registrationStatus !== 'ALL' &&
      getRegistrationStatus(b) !== filters.registrationStatus
    ) {
      return false;
    }
    if (
      filters.employmentStatus !== 'ALL' &&
      b.employmentStatus !== filters.employmentStatus
    ) {
      return false;
    }
    if (filters.workRegime !== 'ALL' && b.workRegime !== filters.workRegime) return false;
    if (
      filters.economicSector !== 'ALL' &&
      b.economicSector !== filters.economicSector
    ) {
      return false;
    }
    if (
      filters.programName !== 'ALL' &&
      !b.socialPrograms.some((p) => p.name === filters.programName)
    ) {
      return false;
    }
    if (filters.maxIndividualIncomeSm !== 'ALL') {
      const cap = Number(filters.maxIndividualIncomeSm) * SALARIO_MINIMO_REF;
      if (b.individualIncome > cap) return false;
    }
    if (filters.minHouseholdSize !== 'ALL') {
      if (b.householdSize < Number(filters.minHouseholdSize)) return false;
    }
    if (filters.multiProgramOnly && b.socialPrograms.length < 2) return false;
    if (filters.incomeTrend !== 'ALL') {
      if (getIncomeEvolution(b).trend !== filters.incomeTrend) return false;
    }
    if (filters.cadUnicoOnly && !b.selfDeclaration?.cadUnicoRegistered) return false;
    if (filters.publicSchoolOnly && !b.selfDeclaration?.publicSchoolStudent) return false;
    if (filters.passaporteOnly && !b.selfDeclaration?.passaporteUniversitario) return false;
    if (
      filters.crossCheckStatus !== 'ALL' &&
      b.selfDeclaration?.crossCheckStatus !== filters.crossCheckStatus
    ) {
      return false;
    }
    if (q.length > 0) {
      const membersCpfs = (b.householdMembers ?? []).map((m) => m.cpf.replace(/\D/g, '')).join(' ');
      const membersNames = (b.householdMembers ?? []).map((m) => m.fullName).join(' ');
      const declText = `${b.selfDeclaration?.ubsName ?? ''} ${b.selfDeclaration?.crasName ?? ''} ${b.selfDeclaration?.schoolName ?? ''} ${b.selfDeclaration?.universityName ?? ''} ${b.selfDeclaration?.universityCourse ?? ''}`;
      const hay = normalizeSearch(
        `${b.fullName} ${membersNames} ${b.neighborhood} ${b.profession} ${b.employerName} ${b.economicSector} ${declText}`
      );
      const cpfDigits = `${b.cpf.replace(/\D/g, '')} ${membersCpfs}`;
      const matchText = hay.includes(q);
      const matchCpf = qDigits.length >= 2 && cpfDigits.includes(qDigits);
      if (!matchText && !matchCpf) return false;
    }
    return true;
  });
}

function calcMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : Math.round(sorted[mid]);
}

function calcMean(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

export interface SocioeconomicSummary {
  total: number;
  byStatus: Record<RegistrationStatus, number>;
  employedCount: number;
  unemployedCount: number;
  formalCount: number;
  informalOrAutoCount: number;
  occupationRatePct: number;
  unemploymentRatePct: number;
  formalRatePct: number;
  benefitsOnlyPct: number;
  multiProgramCount: number;
  avgIndividualIncome: number;
  medianIndividualIncome: number;
  avgHouseholdIncome: number;
  medianHouseholdIncome: number;
  avgPerCapitaIncome: number;
  avgHouseholdSize: number;
  incomeBrackets: { label: string; count: number; pct: number }[];
  sectorRanking: { sector: string; count: number; pct: number }[];
  occupationRanking: { profession: string; count: number }[];
  neighborhoodStats: {
    neighborhood: string;
    districtId: DistrictId;
    count: number;
    avgPerCapita: number;
    unemploymentPct: number;
    formalPct: number;
  }[];
  longitudinal: {
    gotFormalJobCount: number;
    increasedIncomeCount: number;
    decreasedIncomeCount: number;
    leftInformalityCount: number;
    cycles: {
      label: string;
      avgHouseholdIncome: number;
      formalPct: number;
      unemployedPct: number;
      informalPct: number;
    }[];
  };
}

export function computeSocioeconomicSummary(
  records: BeneficiaryRecord[]
): SocioeconomicSummary {
  const total = records.length;
  const byStatus: Record<RegistrationStatus, number> = {
    ATUALIZADO: 0,
    PROXIMO_VENCIMENTO: 0,
    VENCIDO: 0,
    PENDENTE_VALIDACAO: 0,
  };

  let employedCount = 0;
  let unemployedCount = 0;
  let formalCount = 0;
  let informalOrAutoCount = 0;
  let benefitsOnlyCount = 0;
  let multiProgramCount = 0;

  let gotFormalJobCount = 0;
  let increasedIncomeCount = 0;
  let decreasedIncomeCount = 0;
  let leftInformalityCount = 0;

  const indivIncomes: number[] = [];
  const houseIncomes: number[] = [];
  const perCapitas: number[] = [];
  let totalHouseholdMembers = 0;

  const sectorMap = new Map<string, number>();
  const profMap = new Map<string, number>();
  const neighMap = new Map<
    string,
    {
      districtId: DistrictId;
      count: number;
      sumPerCapita: number;
      unemployed: number;
      formal: number;
    }
  >();

  for (const b of records) {
    byStatus[getRegistrationStatus(b)]++;
    if (
      b.employmentStatus === 'EMPREGADO' ||
      b.employmentStatus === 'AUTONOMO' ||
      b.employmentStatus === 'INFORMAL'
    ) {
      employedCount++;
    }
    if (b.employmentStatus === 'DESEMPREGADO') unemployedCount++;
    if (b.workRegime === 'CLT' || b.workRegime === 'ESTATUTARIO') formalCount++;
    if (b.workRegime === 'MEI' || b.workRegime === 'INFORMAL') informalOrAutoCount++;
    if (b.householdTotalIncome === 0 && b.socialPrograms.length > 0) benefitsOnlyCount++;
    if (b.socialPrograms.length >= 2) multiProgramCount++;

    indivIncomes.push(b.individualIncome);
    houseIncomes.push(b.householdTotalIncome);
    const pc = getPerCapitaIncome(b);
    perCapitas.push(pc);
    totalHouseholdMembers += b.householdSize;

    sectorMap.set(b.economicSector, (sectorMap.get(b.economicSector) ?? 0) + 1);
    if (b.profession && b.profession !== 'Sem ocupação atual') {
      profMap.set(b.profession, (profMap.get(b.profession) ?? 0) + 1);
    }

    const nKey = b.neighborhood;
    const prevN = neighMap.get(nKey) ?? {
      districtId: b.districtId,
      count: 0,
      sumPerCapita: 0,
      unemployed: 0,
      formal: 0,
    };
    prevN.count++;
    prevN.sumPerCapita += pc;
    if (b.employmentStatus === 'DESEMPREGADO') prevN.unemployed++;
    if (b.workRegime === 'CLT' || b.workRegime === 'ESTATUTARIO') prevN.formal++;
    neighMap.set(nKey, prevN);

    const evo = getIncomeEvolution(b);
    if (evo.gotFormalJob) gotFormalJobCount++;
    if (evo.trend === 'AUMENTO') increasedIncomeCount++;
    if (evo.trend === 'REDUCAO') decreasedIncomeCount++;
    if (evo.leftInformality) leftInformalityCount++;
  }

  const pct = (num: number) => (total > 0 ? Math.round((num / total) * 1000) / 10 : 0);

  const bracketsDef = [
    { label: 'Sem renda do trabalho', test: (v: number) => v === 0 },
    { label: 'Até 1 SM (R$ 1.518)', test: (v: number) => v > 0 && v <= SALARIO_MINIMO_REF },
    {
      label: '1 a 2 SM (até R$ 3.036)',
      test: (v: number) => v > SALARIO_MINIMO_REF && v <= SALARIO_MINIMO_REF * 2,
    },
    {
      label: '2 a 3 SM (até R$ 4.554)',
      test: (v: number) => v > SALARIO_MINIMO_REF * 2 && v <= SALARIO_MINIMO_REF * 3,
    },
    { label: 'Acima de 3 SM', test: (v: number) => v > SALARIO_MINIMO_REF * 3 },
  ];

  const incomeBrackets = bracketsDef.map((br) => {
    const count = records.filter((b) => br.test(b.individualIncome)).length;
    return { label: br.label, count, pct: pct(count) };
  });

  const sectorRanking = Array.from(sectorMap.entries())
    .map(([sector, count]) => ({ sector, count, pct: pct(count) }))
    .sort((a, b) => b.count - a.count);

  const occupationRanking = Array.from(profMap.entries())
    .map(([profession, count]) => ({ profession, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const neighborhoodStats = Array.from(neighMap.entries())
    .map(([neighborhood, s]) => ({
      neighborhood,
      districtId: s.districtId,
      count: s.count,
      avgPerCapita: Math.round(s.sumPerCapita / s.count),
      unemploymentPct: Math.round((s.unemployed / s.count) * 100),
      formalPct: Math.round((s.formal / s.count) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.avgPerCapita - b.avgPerCapita);

  // Build 3-cycle longitudinal time series from history snapshots
  const cycleLabels = ['Mai/2026', 'Ago/2026', 'Nov/2026'];
  const cycles = cycleLabels.map((label, idx) => {
    let sumHouse = 0;
    let cFormal = 0;
    let cUnemp = 0;
    let cInf = 0;
    let n = 0;
    for (const b of records) {
      const snap =
        idx === 2
          ? {
              householdTotalIncome: b.householdTotalIncome,
              workRegime: b.workRegime,
              employmentStatus: b.employmentStatus,
            }
          : b.history.find((h) => h.cycleLabel === label) ?? b.history[0];
      if (!snap) continue;
      n++;
      sumHouse += snap.householdTotalIncome;
      if (snap.workRegime === 'CLT' || snap.workRegime === 'ESTATUTARIO') cFormal++;
      if (snap.employmentStatus === 'DESEMPREGADO') cUnemp++;
      if (snap.workRegime === 'INFORMAL') cInf++;
    }
    const denom = Math.max(1, n);
    return {
      label,
      avgHouseholdIncome: Math.round(sumHouse / denom),
      formalPct: Math.round((cFormal / denom) * 1000) / 10,
      unemployedPct: Math.round((cUnemp / denom) * 1000) / 10,
      informalPct: Math.round((cInf / denom) * 1000) / 10,
    };
  });

  return {
    total,
    byStatus,
    employedCount,
    unemployedCount,
    formalCount,
    informalOrAutoCount,
    occupationRatePct: pct(employedCount),
    unemploymentRatePct: pct(unemployedCount),
    formalRatePct: pct(formalCount),
    benefitsOnlyPct: pct(benefitsOnlyCount),
    multiProgramCount,
    avgIndividualIncome: calcMean(indivIncomes),
    medianIndividualIncome: calcMedian(indivIncomes),
    avgHouseholdIncome: calcMean(houseIncomes),
    medianHouseholdIncome: calcMedian(houseIncomes),
    avgPerCapitaIncome: calcMean(perCapitas),
    avgHouseholdSize: total > 0 ? Number((totalHouseholdMembers / total).toFixed(1)) : 0,
    incomeBrackets,
    sectorRanking,
    occupationRanking,
    neighborhoodStats,
    longitudinal: {
      gotFormalJobCount,
      increasedIncomeCount,
      decreasedIncomeCount,
      leftInformalityCount,
      cycles,
    },
  };
}
