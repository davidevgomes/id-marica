export type DistrictId = 1 | 2 | 3 | 4 | 5;

export type AppPortalMode = 'portal' | 'gestao';

export type ManagementView =
  | 'mapa'
  | 'consultas'
  | 'indicadores'
  | 'relatorios'
  | 'lgpd';

export type UserRole = 'ANALISTA_AGREGADO' | 'AUDITOR_LGPD' | 'EQUIPE_CAMPO';

export interface AuthSession {
  userName: string;
  userEmail: string;
  role: UserRole;
  department: string;
  loggedInAt: string;
}

export type RegistrationStatus =
  | 'ATUALIZADO'
  | 'PROXIMO_VENCIMENTO'
  | 'VENCIDO'
  | 'PENDENTE_VALIDACAO';

export type EmploymentStatus =
  | 'EMPREGADO'
  | 'DESEMPREGADO'
  | 'AUTONOMO'
  | 'INFORMAL'
  | 'APOSENTADO'
  | 'ESTUDANTE';

export type WorkRegime =
  | 'CLT'
  | 'ESTATUTARIO'
  | 'MEI'
  | 'INFORMAL'
  | 'SEM_VINCULO'
  | 'APOSENTADO';

export type HousingType = 'PROPRIA' | 'ALUGADA' | 'CEDIDA' | 'FINANCIADA' | 'OUTRA';

export type IncomeTrend = 'AUMENTO' | 'REDUCAO' | 'ESTAVEL';

export interface SocialProgramBenefit {
  name: string;
  monthlyValue: number;
}

export interface BeneficiaryDocuments {
  idDocAttached: boolean;
  idDocName?: string;
  residenceProofAttached: boolean;
  residenceProofName?: string;
  facialVerified: boolean;
  facialConsentLgpd: boolean;
  facialVerifiedAt?: string;
}

export interface BeneficiaryHistoryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  cycleLabel: string; // e.g., "Mai/2026", "Ago/2026", "Nov/2026"
  employmentStatus: EmploymentStatus;
  workRegime: WorkRegime;
  profession: string;
  individualIncome: number;
  householdTotalIncome: number;
  perCapitaIncome: number;
  socialBenefitsTotal: number;
  note: string;
  updatedBy: string;
}

export interface BeneficiaryRecord {
  id: string;
  cpf: string;
  fullName: string;
  birthDate: string; // YYYY-MM-DD
  gender: 'Feminino' | 'Masculino' | 'Outro' | 'Prefiro não informar';
  maritalStatus: 'Solteiro(a)' | 'Casado(a)' | 'União estável' | 'Divorciado(a)' | 'Viúvo(a)';
  education:
    | 'Fundamental incompleto'
    | 'Fundamental completo'
    | 'Médio incompleto'
    | 'Médio completo'
    | 'Superior incompleto'
    | 'Superior completo'
    | 'Pós-graduação';
  phone: string;
  email: string;
  householdSize: number;
  dependentsCount: number;
  familyComposition: string;

  // Profissional e econômico
  profession: string;
  employmentStatus: EmploymentStatus;
  workRegime: WorkRegime;
  employerName: string;
  economicSector: string;
  individualIncome: number; // R$ / mês
  householdTotalIncome: number; // R$ / mês (total do domicílio incluindo salários e outras rendas)
  incomeContributorsCount: number;
  otherIncomeSources: number;
  socialPrograms: SocialProgramBenefit[];

  // Habitacional e territorial
  address: string;
  neighborhood: string;
  districtId: DistrictId;
  cep: string;
  coords: [number, number];
  housingType: HousingType;
  rentValue: number;
  workLocationBairro?: string;
  workCoords?: [number, number];

  // Documentos e biometria
  documents: BeneficiaryDocuments;

  // Validade cadastral (ciclo de 90 dias — nunca suspende benefício automaticamente)
  registeredAt: string; // YYYY-MM-DD
  lastUpdatedAt: string; // YYYY-MM-DD
  nextDueDate: string; // YYYY-MM-DD
  pendingValidation: boolean;
  capturedOffline?: boolean;

  // Histórico longitudinal
  history: BeneficiaryHistoryEntry[];
}

export interface BeneficiaryFilterState {
  search: string;
  districtId: DistrictId | 'ALL';
  neighborhood: string; // 'ALL' or exact neighborhood
  registrationStatus: RegistrationStatus | 'ALL';
  employmentStatus: EmploymentStatus | 'ALL';
  workRegime: WorkRegime | 'ALL';
  economicSector: string; // 'ALL' or sector
  programName: string; // 'ALL' or program name
  maxIndividualIncomeSm: 'ALL' | '0' | '1' | '2' | '3';
  minHouseholdSize: 'ALL' | '2' | '3' | '4' | '5';
  multiProgramOnly: boolean;
  incomeTrend: IncomeTrend | 'ALL';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  resource: string;
  legalBasis: string;
  severity: 'info' | 'success' | 'warning';
}

export interface DistrictInfo {
  id: DistrictId;
  name: string;
  shortName: string;
  color: string;
  fillColor: string;
  center: [number, number];
  neighborhoods: string[];
  macroFamilies: number;
  macroMumbucaTrabalho: number;
  macroPendingProof: number;
  polygon: [number, number][];
}

export interface PublicFacility {
  id: string;
  name: string;
  type: 'UBS' | 'ESCOLA' | 'CRAS';
  districtId: DistrictId;
  coords: [number, number];
  neighborhood: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
}
