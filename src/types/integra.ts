export type DistrictId = 1 | 2 | 3 | 4 | 5;

export interface DistrictInfo {
  id: DistrictId;
  name: string;
  shortName: string;
  color: string;
  fillColor: string;
  center: [number, number];
  neighborhoods: string[];
  /** Approximate realistic macro count of active families in this district */
  macroFamilies: number;
  macroMumbucaTrabalho: number;
  macroPendingProof: number;
  polygon: [number, number][];
}

export type FacilityType = 'UBS' | 'ESCOLA' | 'CRAS';

export interface PublicFacility {
  id: string;
  name: string;
  type: FacilityType;
  districtId: DistrictId;
  coords: [number, number];
  neighborhood: string;
}

export type ProgramType =
  | 'RBC'
  | 'MUMBUCA_TRABALHO'
  | 'AUX_CUIDAR'
  | 'RECOMECAR'
  | 'INDIGENA'
  | 'BOLSA_FAMILIA'
  | 'BPC';

export type TetoFaixa = 'A' | 'B' | 'C' | 'EMANCIPADO';

export type BenefitStatus = 'ATIVO' | 'ALERTA_D15' | 'SUSPENSO_PREVENTIVO' | 'CANCELADO';

export type ReguaFase = 0 | 1 | 2 | 3 | 4;

export type OccupationalStatus =
  | 'DESEMPREGADO'
  | 'INFORMAL'
  | 'CLT_MUMBUCA'
  | 'IMPEDIDO_LEGAL'
  | 'ESTUDANTE';

export interface FamilyMember {
  id: string;
  name: string;
  role: 'TITULAR' | 'CONJUGE' | 'DEPENDENTE';
  age: number;
  cpf: string;
  occupationalStatus: OccupationalStatus;
  cltSalary: number; // in R$
  employerCnpj?: string;
  employerName?: string;
  isIdosoOrPcd?: boolean;
}

export interface ProofOfLifeRecord {
  id: string;
  cycle: string; // e.g. '2026-Q4'
  date: string; // ISO string
  status: 'APROVADO' | 'REPROVADO_DISTANCIA' | 'REPROVADO_BIOMETRIA' | 'PENDENTE';
  livenessScore: number;
  facialMatchScore: number;
  distanceMeters: number;
  mockLocationDetected: boolean;
  channel: 'APP_FACIAL_GPS' | 'PRESENCIAL_CRAS_UBS' | 'VISITA_IN_LOCO';
  captureCoords?: [number, number];
}

export interface CrossCheckInfo {
  cadUnicoUpdatedAt: string;
  cadUnicoStatus: 'REGULAR' | 'DESATUALIZADO';
  eSocialLastEvent: string;
  ubsId: string;
  ubsLastVisit: string;
  schoolId?: string;
  schoolAttendancePct?: number;
  territorialDivergence: boolean;
  divergenceReason?: string;
}

export interface FamilyRecord {
  id: string;
  cadUnicoCode: string;
  nis: string;
  titularName: string;
  titularCpf: string;
  districtId: DistrictId;
  neighborhood: string;
  address: string;
  coords: [number, number];
  /** LGPD Spatial Obfuscation for Recomeçar sem Violência */
  sigiloEspacial: boolean;
  humanitarianToken?: string;
  members: FamilyMember[];
  programs: ProgramType[];
  federalBenefitsTotal: number; // Bolsa Família + BPC in R$
  municipalExtraBenefits: number; // Auxílio Cuidar, Recomeçar, Indígena in Mumbucas/R$
  status: BenefitStatus;
  reguaFase: ReguaFase;
  daysUntilProofDue: number; // negative means overdue
  lastProofOfLife: ProofOfLifeRecord;
  crossCheck: CrossCheckInfo;
  needsActiveSearch: boolean;
  activeSearchPriority?: 'ALTA' | 'MEDIA' | 'BAIXA';
  activeSearchReason?: string;
  assistedEligible?: boolean; // Idoso / PcD eligible for CRAS/UBS assisted proof
  lastCrasVisit?: string;
  notes?: string;
}

export interface CalculatedFamilyMetrics {
  cltCount: number;
  cltIncomeTotal: number;
  rbcDependentQuotaPct: 100 | 50 | 0;
  mumbucaTrabalhoTotal: number;
  rbcTotal: number;
  totalMumbucasMonthly: number;
  totalHouseholdIncome: number; // Salários + benefícios municipais + federais
  perCapitaIncome: number;
  faixaTeto: TetoFaixa;
  tetoLimitReais: number | null; // null for Faixa C (humanitarian exception)
  exceedsEmancipationCap: boolean;
  mumbucaSplit: {
    livre80: number;
    territorio10: number;
    producaoLocal10: number;
  };
}

export interface IntegrationLogEvent {
  id: string;
  timestamp: string;
  source: 'CADUNICO' | 'ESOCIAL_CAGED' | 'ECIDADE_EDUC' | 'ESUS_SAUDE' | 'PROVA_VIDA' | 'CRAS_CAMPO';
  familyId: string;
  familyName: string;
  districtId: DistrictId;
  eventType: string;
  automatedAction: string;
  severity: 'info' | 'success' | 'warning' | 'danger';
}

export interface MumbucaWebhookEvent {
  id: string;
  timestamp: string;
  familyId: string;
  titularMasked: string;
  command: 'PROVISIONAR_FOLHA' | 'ATUALIZAR_STATUS' | 'REATIVAR_CONTA' | 'SUSPENDER_PREVENTIVO' | 'CANCELAR_BENEFICIO';
  statusConta: 'ATIVO' | 'SUSPENSO_PREVENTIVO' | 'CANCELADO';
  idTerritorio: DistrictId;
  valorMensalMumbucas: number;
  motivo: string;
  httpStatus: 200;
  latencyMs: number;
}

export type AppSurface = 'portal' | 'gestao';
export type AppViewMode = 'mapa' | 'busca_ativa' | 'integracoes';
