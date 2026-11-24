import type {
  CalculatedFamilyMetrics,
  FamilyRecord,
  ProgramType,
  TetoFaixa,
} from '../types/integra';

/** Parâmetros oficiais do documento de arquitetura (base 2027) */
export const SALARIO_MINIMO_BASE = 1741.0; // R$ 1.741,00
export const LIMITE_ENTRADA_PER_CAPITA = SALARIO_MINIMO_BASE * 0.5; // R$ 870,50
export const TETO_FAIXA_A = SALARIO_MINIMO_BASE * 1; // R$ 1.741,00
export const TETO_FAIXA_B = SALARIO_MINIMO_BASE * 2; // R$ 3.482,00
export const TETO_EMANCIPACAO_GLOBAL = SALARIO_MINIMO_BASE * 3; // R$ 5.223,00

export const COTA_RBC_INTEGRAL = 230; // Mumbucas
export const COTA_RBC_REDUZIDA_50 = 115; // Mumbucas (quando há 2 vínculos CLT)
export const COTA_MUMBUCA_TRABALHO = 350; // Mumbucas por vínculo formal
export const RAIO_TOLERANCIA_GPS_METROS = 100; // Cerca virtual domiciliar

export const PROGRAM_LABELS: Record<ProgramType, string> = {
  RBC: 'Renda Básica (RBC)',
  MUMBUCA_TRABALHO: 'Mumbuca Trabalho',
  AUX_CUIDAR: 'Auxílio Cuidar',
  RECOMECAR: 'Recomeçar sem Violência',
  INDIGENA: 'Auxílio Indígena',
  BOLSA_FAMILIA: 'Bolsa Família (Gov)',
  BPC: 'BPC / LOAS (Gov)',
};

export function maskCpf(cpf: string): string {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return cpf;
  return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
}

export function maskTitularName(name: string, sigilo: boolean): string {
  if (!sigilo) return name;
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p, idx) => (idx === 0 ? `${p[0]}***` : `${p[0]}.`))
    .join(' ');
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatMumbucas(value: number): string {
  return `M$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Motor de Regras de Elegibilidade, Tetos e Transição Mumbuca Trabalho (Integra Maricá Core Engine)
 */
export function calculateFamilyMetrics(family: FamilyRecord): CalculatedFamilyMetrics {
  const cltMembers = family.members.filter((m) => m.occupationalStatus === 'CLT_MUMBUCA');
  const cltCount = cltMembers.length;
  const cltIncomeTotal = cltMembers.reduce((sum, m) => sum + m.cltSalary, 0);

  const nonCltMembers = family.members.filter((m) => m.occupationalStatus !== 'CLT_MUMBUCA');

  // Regra 1 e Regra 2 do Mumbuca Trabalho
  let mumbucaTrabalhoTotal = 0;
  let rbcDependentQuotaPct: 100 | 50 | 0 = 100;
  let rbcTotal = 0;

  if (family.status === 'CANCELADO') {
    mumbucaTrabalhoTotal = 0;
    rbcDependentQuotaPct = 0;
    rbcTotal = 0;
  } else if (cltCount === 0) {
    // RBC integral para todos os membros
    rbcDependentQuotaPct = 100;
    rbcTotal = family.members.length * COTA_RBC_INTEGRAL;
  } else if (cltCount === 1) {
    // 1º Vínculo CLT: trabalhador recebe 350, dependentes mantêm 100% (230)
    mumbucaTrabalhoTotal = COTA_MUMBUCA_TRABALHO;
    rbcDependentQuotaPct = 100;
    rbcTotal = nonCltMembers.length * COTA_RBC_INTEGRAL;
  } else {
    // 2º+ Vínculo CLT: trabalhadores recebem 350 cada, dependentes vão para 50% (115)
    mumbucaTrabalhoTotal = cltCount * COTA_MUMBUCA_TRABALHO;
    rbcDependentQuotaPct = 50;
    rbcTotal = nonCltMembers.length * COTA_RBC_REDUZIDA_50;
  }

  const municipalExtra = family.status === 'CANCELADO' ? 0 : family.municipalExtraBenefits;
  const totalMumbucasMonthly = mumbucaTrabalhoTotal + rbcTotal + municipalExtra;

  const totalHouseholdIncome =
    cltIncomeTotal + totalMumbucasMonthly + family.federalBenefitsTotal;

  const perCapitaIncome =
    family.members.length > 0 ? totalHouseholdIncome / family.members.length : 0;

  const hasBolsaFamilia = family.programs.includes('BOLSA_FAMILIA');
  const hasBpc = family.programs.includes('BPC');
  const hasHumanitarianProgram =
    family.programs.includes('RECOMECAR') || family.programs.includes('AUX_CUIDAR');

  // Enquadramento de Faixa de Teto
  let faixaTeto: TetoFaixa = 'A';
  let tetoLimitReais: number | null = TETO_FAIXA_A;

  const exceedsEmancipationCap =
    totalHouseholdIncome > TETO_EMANCIPACAO_GLOBAL && !family.humanitarianToken;

  if (exceedsEmancipationCap) {
    faixaTeto = 'EMANCIPADO';
    tetoLimitReais = TETO_EMANCIPACAO_GLOBAL;
  } else if (
    (hasHumanitarianProgram && (hasBpc || hasBolsaFamilia) && Boolean(family.humanitarianToken)) ||
    (family.programs.includes('RECOMECAR') && Boolean(family.humanitarianToken))
  ) {
    faixaTeto = 'C';
    tetoLimitReais = null; // Exceção Humanitária — Sem teto fixo mediante token CRAS
  } else if (hasBpc || hasBolsaFamilia || hasHumanitarianProgram) {
    faixaTeto = 'B';
    tetoLimitReais = TETO_FAIXA_B;
  } else {
    faixaTeto = 'A';
    tetoLimitReais = TETO_FAIXA_A;
  }

  return {
    cltCount,
    cltIncomeTotal,
    rbcDependentQuotaPct,
    mumbucaTrabalhoTotal,
    rbcTotal,
    totalMumbucasMonthly,
    totalHouseholdIncome,
    perCapitaIncome,
    faixaTeto,
    tetoLimitReais,
    exceedsEmancipationCap,
    mumbucaSplit: {
      livre80: Math.round(totalMumbucasMonthly * 0.8),
      territorio10: Math.round(totalMumbucasMonthly * 0.1),
      producaoLocal10: Math.round(totalMumbucasMonthly * 0.1),
    },
  };
}
