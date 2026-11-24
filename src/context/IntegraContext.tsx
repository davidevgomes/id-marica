import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  INITIAL_INTEGRATION_LOGS,
  INITIAL_MUMBUCA_EVENTS,
  SEED_FAMILIES,
} from '../data/seedFamilies';
import {
  calculateFamilyMetrics,
  maskCpf,
  maskTitularName,
  RAIO_TOLERANCIA_GPS_METROS,
  SALARIO_MINIMO_BASE,
} from '../engine/rulesEngine';
import type {
  AppSurface,
  AppViewMode,
  DistrictId,
  FamilyRecord,
  IntegrationLogEvent,
  MumbucaWebhookEvent,
  ProofOfLifeRecord,
} from '../types/integra';

interface ToastMessage {
  id: string;
  title: string;
  description: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
}

interface DemoCounters {
  proofsCompletedNow: number;
  cltTransitionsNow: number;
  crasVisitsNow: number;
  estimatedSavingsDelta: number;
}

interface IntegraContextValue {
  surface: AppSurface;
  setSurface: (surface: AppSurface) => void;
  enterManagement: (tab?: AppViewMode) => void;
  returnToPortal: () => void;
  viewMode: AppViewMode;
  setViewMode: (mode: AppViewMode) => void;
  openApiMonitor: () => void;
  families: FamilyRecord[];
  selectedFamilyId: string | null;
  setSelectedFamilyId: (id: string | null) => void;
  selectedFamily: FamilyRecord | null;
  selectedDistrictFilter: DistrictId | 'ALL';
  setSelectedDistrictFilter: (d: DistrictId | 'ALL') => void;
  integrationLogs: IntegrationLogEvent[];
  mumbucaEvents: MumbucaWebhookEvent[];
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  demoCounters: DemoCounters;
  /** Actions */
  simulateCltAdmission: (familyId: string) => void;
  simulateCltDismissal: (familyId: string) => void;
  simulateTerritorialDivergence: (familyId: string) => void;
  submitProofOfLife: (
    familyId: string,
    payload: {
      livenessScore: number;
      facialMatchScore: number;
      distanceMeters: number;
      mockLocationDetected: boolean;
      channel: ProofOfLifeRecord['channel'];
      captureCoords?: [number, number];
      declaredOccupation?: string;
    }
  ) => 'APROVADO' | 'REPROVADO_DISTANCIA';
  registerCrasVisit: (
    familyId: string,
    outcome: 'CONFIRMAR_RESIDENCIA' | 'EMITIR_TOKEN_FAIXA_C' | 'CANCELAR_FASE_4',
    notes?: string
  ) => void;
  openCitizenForFamily: (familyId: string) => void;
  citizenTargetFamilyId: string;
  setCitizenTargetFamilyId: (id: string) => void;
  resetDemo: () => void;
}

const STORAGE_KEY = 'integra_marica_mvp_v1';

const IntegraContext = createContext<IntegraContextValue | null>(null);

function nowLabel(): string {
  const d = new Date();
  return `Agora, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

function getInitialSurfaceFromUrl(): AppSurface {
  if (typeof window === 'undefined') return 'portal';
  const params = new URLSearchParams(window.location.search);
  const painel = params.get('painel');
  const modo = params.get('modo');
  if (painel === 'gestao' || modo === 'gestao') return 'gestao';
  return 'portal';
}

function getInitialViewFromUrl(): AppViewMode {
  if (typeof window === 'undefined') return 'mapa';
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  if (tab === 'busca_ativa' || tab === 'integracoes' || tab === 'mapa') return tab;
  return 'mapa';
}

export function IntegraProvider({ children }: { children: React.ReactNode }) {
  const [surface, setSurface] = useState<AppSurface>(getInitialSurfaceFromUrl);
  const [viewMode, setViewMode] = useState<AppViewMode>(getInitialViewFromUrl);

  const enterManagement = (tab: AppViewMode = 'mapa') => {
    setViewMode(tab);
    setSurface('gestao');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const returnToPortal = () => {
    setSurface('portal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openApiMonitor = () => {
    setViewMode('integracoes');
    setSurface('gestao');
  };

  const [families, setFamilies] = useState<FamilyRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.families) && parsed.families.length > 0) {
          return parsed.families;
        }
      }
    } catch {
      // ignore storage errors
    }
    return SEED_FAMILIES;
  });

  const [integrationLogs, setIntegrationLogs] = useState<IntegrationLogEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.integrationLogs)) return parsed.integrationLogs;
      }
    } catch {
      // ignore
    }
    return INITIAL_INTEGRATION_LOGS;
  });

  const [mumbucaEvents, setMumbucaEvents] = useState<MumbucaWebhookEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.mumbucaEvents)) return parsed.mumbucaEvents;
      }
    } catch {
      // ignore
    }
    return INITIAL_MUMBUCA_EVENTS;
  });

  const [demoCounters, setDemoCounters] = useState<DemoCounters>({
    proofsCompletedNow: 0,
    cltTransitionsNow: 0,
    crasVisitsNow: 0,
    estimatedSavingsDelta: 0,
  });

  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>('FAM-001');
  const [citizenTargetFamilyId, setCitizenTargetFamilyId] = useState<string>('FAM-001');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<DistrictId | 'ALL'>('ALL');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ families, integrationLogs, mumbucaEvents })
      );
    } catch {
      // ignore quota errors
    }
  }, [families, integrationLogs, mumbucaEvents]);

  const pushToast = (
    title: string,
    description: string,
    tone: ToastMessage['tone'] = 'info'
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [{ id, title, description, tone }, ...prev].slice(0, 3));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5200);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const pushLogAndWebhook = (
    family: FamilyRecord,
    log: Omit<IntegrationLogEvent, 'id' | 'timestamp' | 'familyId' | 'familyName' | 'districtId'>,
    webhook: Omit<MumbucaWebhookEvent, 'id' | 'timestamp' | 'familyId' | 'titularMasked' | 'idTerritorio' | 'httpStatus' | 'latencyMs'>
  ) => {
    const ts = nowLabel();
    const displayName = maskTitularName(family.titularName, family.sigiloEspacial);
    const maskedTitular = family.sigiloEspacial
      ? `${displayName} (Sigilo LGPD)`
      : `${family.titularName} (${maskCpf(family.titularCpf)})`;

    setIntegrationLogs((prev) => [
      {
        id: `LOG-${Date.now()}`,
        timestamp: ts,
        familyId: family.id,
        familyName: displayName,
        districtId: family.districtId,
        ...log,
      },
      ...prev,
    ]);

    setMumbucaEvents((prev) => [
      {
        id: `WH-${Math.floor(905 + Math.random() * 890)}`,
        timestamp: ts,
        familyId: family.id,
        titularMasked: maskedTitular,
        idTerritorio: family.districtId,
        httpStatus: 200,
        latencyMs: Math.floor(28 + Math.random() * 24),
        ...webhook,
      },
      ...prev,
    ]);
  };

  const simulateCltAdmission = (familyId: string) => {
    const target = families.find((f) => f.id === familyId);
    if (!target) return;

    const adultCandidate = target.members.find(
      (m) => m.age >= 18 && m.occupationalStatus !== 'CLT_MUMBUCA' && !m.isIdosoOrPcd
    );
    if (!adultCandidate) {
      pushToast(
        'Todos os adultos já possuem vínculo CLT',
        'Esta família já atingiu o máximo de vínculos formais simuláveis.',
        'info'
      );
      return;
    }

    const updatedMembers = target.members.map((m) =>
      m.id === adultCandidate.id
        ? {
            ...m,
            occupationalStatus: 'CLT_MUMBUCA' as const,
            cltSalary: SALARIO_MINIMO_BASE,
            employerCnpj: '38.904.112/0001-60',
            employerName: 'Comércio Local Maricá S/A (Juros Zero)',
          }
        : m
    );

    const updatedPrograms = target.programs.includes('MUMBUCA_TRABALHO')
      ? target.programs
      : (['MUMBUCA_TRABALHO', ...target.programs] as FamilyRecord['programs']);

    const updatedFamily: FamilyRecord = {
      ...target,
      members: updatedMembers,
      programs: updatedPrograms,
      status: target.status === 'CANCELADO' ? 'ATIVO' : target.status,
      crossCheck: {
        ...target.crossCheck,
        eSocialLastEvent: `Admissão CLT detectada via eSocial (${adultCandidate.name.split(' ')[0]})`,
      },
    };

    const metrics = calculateFamilyMetrics(updatedFamily);

    setFamilies((prev) => prev.map((f) => (f.id === familyId ? updatedFamily : f)));
    setDemoCounters((c) => ({ ...c, cltTransitionsNow: c.cltTransitionsNow + 1 }));

    const regraTexto =
      metrics.cltCount === 1
        ? '1º vínculo CLT: trabalhador passa p/ M$ 350 e dependentes mantêm 100% RBC (M$ 230).'
        : '2º vínculo CLT: ambos em M$ 350 e dependentes recalculados p/ 50% RBC (M$ 115).';

    pushLogAndWebhook(
      updatedFamily,
      {
        source: 'ESOCIAL_CAGED',
        eventType: `ADMISSAO_CLT (${metrics.cltCount}º Vínculo)`,
        automatedAction: regraTexto,
        severity: 'success',
      },
      {
        command: 'PROVISIONAR_FOLHA',
        statusConta: updatedFamily.status === 'SUSPENSO_PREVENTIVO' ? 'SUSPENSO_PREVENTIVO' : 'ATIVO',
        valorMensalMumbucas: metrics.totalMumbucasMonthly,
        motivo: `Gatilho CAGED/eSocial — ${regraTexto}`,
      }
    );

    pushToast(
      `Transição Mumbuca Trabalho (${metrics.cltCount}º CLT)`,
      `${regraTexto} Folha enviada ao Banco Mumbuca: M$ ${metrics.totalMumbucasMonthly}.`,
      'success'
    );
  };

  const simulateCltDismissal = (familyId: string) => {
    const target = families.find((f) => f.id === familyId);
    if (!target) return;

    const cltMembers = target.members.filter((m) => m.occupationalStatus === 'CLT_MUMBUCA');
    if (cltMembers.length === 0) {
      pushToast(
        'Sem vínculo CLT ativo',
        'Simule primeiro uma admissão CLT para testar a Proteção contra Volatilidade.',
        'info'
      );
      return;
    }

    const dismissed = cltMembers[cltMembers.length - 1];
    const updatedMembers = target.members.map((m) =>
      m.id === dismissed.id
        ? {
            ...m,
            occupationalStatus: 'DESEMPREGADO' as const,
            cltSalary: 0,
            employerCnpj: undefined,
            employerName: undefined,
          }
        : m
    );

    const remainingClt = updatedMembers.filter((m) => m.occupationalStatus === 'CLT_MUMBUCA').length;
    const updatedPrograms =
      remainingClt === 0
        ? target.programs.filter((p) => p !== 'MUMBUCA_TRABALHO')
        : target.programs;

    const updatedFamily: FamilyRecord = {
      ...target,
      members: updatedMembers,
      programs: updatedPrograms.includes('RBC') ? updatedPrograms : ['RBC', ...updatedPrograms],
      status: 'ATIVO',
      reguaFase: 3,
      crossCheck: {
        ...target.crossCheck,
        eSocialLastEvent: 'Demissão sem justa causa — Retorno automático RBC (Fase 3)',
      },
    };

    const metrics = calculateFamilyMetrics(updatedFamily);
    setFamilies((prev) => prev.map((f) => (f.id === familyId ? updatedFamily : f)));

    pushLogAndWebhook(
      updatedFamily,
      {
        source: 'ESOCIAL_CAGED',
        eventType: 'DEMISSAO_SEM_JUSTA_CAUSA (Fase 3)',
        automatedAction: `Proteção contra Volatilidade acionada: cota RBC restaurada automaticamente (M$ ${metrics.totalMumbucasMonthly}).`,
        severity: 'warning',
      },
      {
        command: 'PROVISIONAR_FOLHA',
        statusConta: 'ATIVO',
        valorMensalMumbucas: metrics.totalMumbucasMonthly,
        motivo: 'Fase 3 — Retorno imediato à RBC integral sem burocracia punitiva',
      }
    );

    pushToast(
      'Proteção contra Volatilidade (Fase 3)',
      `Demissão detectada no eSocial. Cota RBC restaurada na hora para M$ ${metrics.totalMumbucasMonthly} sem fila presencial.`,
      'warning'
    );
  };

  const simulateTerritorialDivergence = (familyId: string) => {
    const target = families.find((f) => f.id === familyId);
    if (!target) return;

    const updatedFamily: FamilyRecord = {
      ...target,
      status: 'SUSPENSO_PREVENTIVO',
      reguaFase: 2,
      needsActiveSearch: true,
      activeSearchPriority: 'ALTA',
      activeSearchReason:
        'Alerta de triangulação: sem atendimento recente na UBS do distrito e divergência de matrícula escolar (e-Cidade).',
      crossCheck: {
        ...target.crossCheck,
        territorialDivergence: true,
        divergenceReason: 'Divergência entre residência declarada e uso da rede pública (e-SUS / e-Cidade).',
      },
    };

    setFamilies((prev) => prev.map((f) => (f.id === familyId ? updatedFamily : f)));

    pushLogAndWebhook(
      updatedFamily,
      {
        source: 'ECIDADE_EDUC',
        eventType: 'DIVERGENCIA_TERRITORIAL',
        automatedAction: 'Bloqueio preventivo (Fase 2) + fila prioritária Busca Ativa CRAS.',
        severity: 'danger',
      },
      {
        command: 'SUSPENDER_PREVENTIVO',
        statusConta: 'SUSPENSO_PREVENTIVO',
        valorMensalMumbucas: 0,
        motivo: 'Divergência territorial e-SUS/e-Cidade — aguardando visita CRAS',
      }
    );

    pushToast(
      'Alerta Territorial Disparado',
      `${target.titularName} entrou na fila de Busca Ativa do CRAS e o Banco Mumbuca recebeu suspensão preventiva.`,
      'danger'
    );
  };

  const submitProofOfLife = (
    familyId: string,
    payload: {
      livenessScore: number;
      facialMatchScore: number;
      distanceMeters: number;
      mockLocationDetected: boolean;
      channel: ProofOfLifeRecord['channel'];
      captureCoords?: [number, number];
      declaredOccupation?: string;
    }
  ): 'APROVADO' | 'REPROVADO_DISTANCIA' => {
    const target = families.find((f) => f.id === familyId);
    if (!target) return 'REPROVADO_DISTANCIA';

    const approved =
      payload.channel === 'PRESENCIAL_CRAS_UBS' ||
      (!payload.mockLocationDetected && payload.distanceMeters <= RAIO_TOLERANCIA_GPS_METROS);

    const newProof: ProofOfLifeRecord = {
      id: `PV-${Date.now()}`,
      cycle: '2026-Q4',
      date: new Date().toISOString(),
      status: approved ? 'APROVADO' : 'REPROVADO_DISTANCIA',
      livenessScore: payload.livenessScore,
      facialMatchScore: payload.facialMatchScore,
      distanceMeters: payload.distanceMeters,
      mockLocationDetected: payload.mockLocationDetected,
      channel: payload.channel,
      captureCoords: payload.captureCoords,
    };

    const updatedFamily: FamilyRecord = {
      ...target,
      status: approved ? 'ATIVO' : 'SUSPENSO_PREVENTIVO',
      reguaFase: approved ? 0 : 2,
      daysUntilProofDue: approved ? 90 : -1,
      lastProofOfLife: newProof,
      needsActiveSearch: approved ? false : true,
      activeSearchPriority: approved ? undefined : 'ALTA',
      activeSearchReason: approved
        ? undefined
        : payload.mockLocationDetected
          ? 'Tentativa de GPS Simulado (Mock Location) detectada na Prova de Vida.'
          : `Prova de Vida realizada fora do raio domiciliar (${payload.distanceMeters} m > 100 m).`,
      crossCheck: {
        ...target.crossCheck,
        territorialDivergence: approved ? false : true,
        divergenceReason: approved
          ? undefined
          : `Captura GPS a ${payload.distanceMeters}m do endereço cadastrado.`,
      },
    };

    const metrics = calculateFamilyMetrics(updatedFamily);
    setFamilies((prev) => prev.map((f) => (f.id === familyId ? updatedFamily : f)));
    setDemoCounters((c) => ({
      ...c,
      proofsCompletedNow: c.proofsCompletedNow + 1,
      estimatedSavingsDelta: approved
        ? c.estimatedSavingsDelta
        : c.estimatedSavingsDelta + metrics.totalMumbucasMonthly * 3,
    }));

    if (approved) {
      pushLogAndWebhook(
        updatedFamily,
        {
          source: 'PROVA_VIDA',
          eventType:
            payload.channel === 'PRESENCIAL_CRAS_UBS'
              ? 'PROVA_VIDA_ASSISTIDA_CRAS'
              : `PROVA_VIDA_FACIAL_GPS (${payload.distanceMeters}m)`,
          automatedAction: `Biometria (${payload.facialMatchScore}%) + domicílio confirmados. Ciclo renovado por +90 dias.`,
          severity: 'success',
        },
        {
          command: 'REATIVAR_CONTA',
          statusConta: 'ATIVO',
          valorMensalMumbucas: metrics.totalMumbucasMonthly,
          motivo: 'Prova de Vida Trimestral aprovada (Facial + GPS domiciliar)',
        }
      );

      pushToast(
        'Prova de Vida Aprovada!',
        `Benefício de ${target.titularName} renovado por 90 dias. Webhook ATIVO enviado ao Banco Mumbuca.`,
        'success'
      );
      return 'APROVADO';
    } else {
      pushLogAndWebhook(
        updatedFamily,
        {
          source: 'PROVA_VIDA',
          eventType: payload.mockLocationDetected
            ? 'BLOQUEIO_MOCK_GPS'
            : `REPROVADO_DISTANCIA (${payload.distanceMeters}m)`,
          automatedAction: 'Conta suspensa preventivamente (D+1) + visita CRAS agendada.',
          severity: 'danger',
        },
        {
          command: 'SUSPENDER_PREVENTIVO',
          statusConta: 'SUSPENSO_PREVENTIVO',
          valorMensalMumbucas: 0,
          motivo: payload.mockLocationDetected
            ? 'Fraude GPS (Mock Location) bloqueada'
            : `Captura fora da cerca virtual domiciliar (${payload.distanceMeters}m)`,
        }
      );

      pushToast(
        'Fora do Raio Domiciliar (100m)',
        `Captura a ${payload.distanceMeters}m da residência. Conta suspensa preventivamente e enviada à Busca Ativa.`,
        'danger'
      );
      return 'REPROVADO_DISTANCIA';
    }
  };

  const registerCrasVisit = (
    familyId: string,
    outcome: 'CONFIRMAR_RESIDENCIA' | 'EMITIR_TOKEN_FAIXA_C' | 'CANCELAR_FASE_4',
    notes?: string
  ) => {
    const target = families.find((f) => f.id === familyId);
    if (!target) return;

    let updatedFamily: FamilyRecord;

    if (outcome === 'CANCELAR_FASE_4') {
      updatedFamily = {
        ...target,
        status: 'CANCELADO',
        reguaFase: 4,
        needsActiveSearch: false,
        lastCrasVisit: new Date().toISOString().slice(0, 10),
        notes: notes || 'Mudança definitiva de município confirmada em visita in loco (Fase 4).',
      };
      const prevMetrics = calculateFamilyMetrics(target);
      setDemoCounters((c) => ({
        ...c,
        crasVisitsNow: c.crasVisitsNow + 1,
        estimatedSavingsDelta: c.estimatedSavingsDelta + prevMetrics.totalMumbucasMonthly * 12,
      }));
      setFamilies((prev) => prev.map((f) => (f.id === familyId ? updatedFamily : f)));

      pushLogAndWebhook(
        updatedFamily,
        {
          source: 'CRAS_CAMPO',
          eventType: 'CORTE_DEFINITIVO (Fase 4)',
          automatedAction: 'Residência fora de Maricá confirmada in loco. Folha encerrada.',
          severity: 'danger',
        },
        {
          command: 'CANCELAR_BENEFICIO',
          statusConta: 'CANCELADO',
          valorMensalMumbucas: 0,
          motivo: 'Fase 4 — Saneamento cadastral confirmado por Assistente Social',
        }
      );

      pushToast(
        'Saneamento Cadastral Concluído (Fase 4)',
        `Benefício cancelado após visita in loco. Economia anual estimada: R$ ${(prevMetrics.totalMumbucasMonthly * 12).toLocaleString('pt-BR')}.`,
        'warning'
      );
      return;
    }

    const token =
      outcome === 'EMITIR_TOKEN_FAIXA_C'
        ? `CRAS-HUM-2026-${Math.floor(1000 + Math.random() * 8999)}`
        : target.humanitarianToken;

    updatedFamily = {
      ...target,
      status: 'ATIVO',
      reguaFase: 0,
      daysUntilProofDue: 90,
      needsActiveSearch: false,
      humanitarianToken: token,
      lastCrasVisit: new Date().toISOString().slice(0, 10),
      lastProofOfLife: {
        id: `PV-CRAS-${Date.now()}`,
        cycle: '2026-Q4',
        date: new Date().toISOString(),
        status: 'APROVADO',
        livenessScore: 100,
        facialMatchScore: 100,
        distanceMeters: 4,
        mockLocationDetected: false,
        channel: 'VISITA_IN_LOCO',
      },
      crossCheck: {
        ...target.crossCheck,
        cadUnicoStatus: 'REGULAR',
        territorialDivergence: false,
        divergenceReason: undefined,
      },
      notes:
        notes ||
        (outcome === 'EMITIR_TOKEN_FAIXA_C'
          ? `Exceção Humanitária (Faixa C) liberada com token ${token}.`
          : 'Residência e presença familiar confirmadas in loco com GPS do CRAS.'),
    };

    const metrics = calculateFamilyMetrics(updatedFamily);
    setFamilies((prev) => prev.map((f) => (f.id === familyId ? updatedFamily : f)));
    setDemoCounters((c) => ({ ...c, crasVisitsNow: c.crasVisitsNow + 1 }));

    pushLogAndWebhook(
      updatedFamily,
      {
        source: 'CRAS_CAMPO',
        eventType:
          outcome === 'EMITIR_TOKEN_FAIXA_C'
            ? `TOKEN_FAIXA_C (${token})`
            : 'VISITA_IN_LOCO_APROVADA',
        automatedAction:
          outcome === 'EMITIR_TOKEN_FAIXA_C'
            ? 'Exceção Humanitária ativada e benefício mantido integralmente.'
            : 'Prova de vida presencial validada + conta reativada no Banco Mumbuca.',
        severity: 'success',
      },
      {
        command: 'REATIVAR_CONTA',
        statusConta: 'ATIVO',
        valorMensalMumbucas: metrics.totalMumbucasMonthly,
        motivo:
          outcome === 'EMITIR_TOKEN_FAIXA_C'
            ? `Liberação Faixa C (${token})`
            : 'Validação presencial in loco pela equipe CRAS',
      }
    );

    pushToast(
      outcome === 'EMITIR_TOKEN_FAIXA_C'
        ? 'Token Humanitário Faixa C Emitido'
        : 'Visita CRAS Registrada',
      `${target.titularName} está REGULAR e ATIVO no Banco Mumbuca.`,
      'success'
    );
  };

  const openCitizenForFamily = (familyId: string) => {
    setCitizenTargetFamilyId(familyId);
    setSurface('portal');
    setTimeout(() => {
      document.getElementById('cadastro')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const resetDemo = () => {
    localStorage.removeItem(STORAGE_KEY);
    setFamilies(SEED_FAMILIES);
    setIntegrationLogs(INITIAL_INTEGRATION_LOGS);
    setMumbucaEvents(INITIAL_MUMBUCA_EVENTS);
    setDemoCounters({
      proofsCompletedNow: 0,
      cltTransitionsNow: 0,
      crasVisitsNow: 0,
      estimatedSavingsDelta: 0,
    });
    setSelectedFamilyId('FAM-001');
    setCitizenTargetFamilyId('FAM-001');
    setSelectedDistrictFilter('ALL');
    pushToast(
      'Demonstração Reiniciada',
      'Todos os cadastros, eventos e logs voltaram ao cenário inicial de apresentação.',
      'info'
    );
  };

  const selectedFamily = useMemo(
    () => families.find((f) => f.id === selectedFamilyId) ?? null,
    [families, selectedFamilyId]
  );

  return (
    <IntegraContext.Provider
      value={{
        surface,
        setSurface,
        enterManagement,
        returnToPortal,
        viewMode,
        setViewMode,
        openApiMonitor,
        families,
        selectedFamilyId,
        setSelectedFamilyId,
        selectedFamily,
        selectedDistrictFilter,
        setSelectedDistrictFilter,
        integrationLogs,
        mumbucaEvents,
        toasts,
        dismissToast,
        demoCounters,
        simulateCltAdmission,
        simulateCltDismissal,
        simulateTerritorialDivergence,
        submitProofOfLife,
        registerCrasVisit,
        openCitizenForFamily,
        citizenTargetFamilyId,
        setCitizenTargetFamilyId,
        resetDemo,
      }}
    >
      {children}
    </IntegraContext.Provider>
  );
}

export function useIntegra() {
  const ctx = useContext(IntegraContext);
  if (!ctx) throw new Error('useIntegra must be used within IntegraProvider');
  return ctx;
}
