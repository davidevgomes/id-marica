import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { INITIAL_AUDIT_LOGS, SEED_BENEFICIARIES } from '../data/seedBeneficiaries';
import {
  addDaysIso,
  applyCombinedFilters,
  DEFAULT_FILTER_STATE,
  getPerCapitaIncome,
  getSocialBenefitsTotal,
  REFERENCE_TODAY,
  VALIDADE_CADASTRO_DIAS,
} from '../engine/analyticsEngine';
import type {
  AppPortalMode,
  AuditLogEntry,
  AuthSession,
  BeneficiaryFilterState,
  BeneficiaryRecord,
  ManagementView,
  ToastMessage,
  UserRole,
} from '../types/integra';

const STORAGE_KEY = 'integra_marica_rework_v2';

export interface RoleProfile {
  role: UserRole;
  label: string;
  shortLabel: string;
  userName: string;
  userEmail: string;
  department: string;
  description: string;
  canViewIndividualPoints: boolean;
  canViewFullPii: boolean;
  canValidateRecords: boolean;
}

export const ROLE_PROFILES: Record<UserRole, RoleProfile> = {
  ANALISTA_AGREGADO: {
    role: 'ANALISTA_AGREGADO',
    label: 'Gestor / Analista (Dados Agregados)',
    shortLabel: 'Analista (Agregado)',
    userName: 'Marina Soares',
    userEmail: 'marina.soares@marica.rj.gov.br',
    department: 'Planejamento e Inteligência de Dados',
    description:
      'Acessa indicadores, filtros combinados, mapa de calor e dados agregados por bairro. Pontos residenciais exatos e CPFs completos permanecem protegidos pela LGPD.',
    canViewIndividualPoints: false,
    canViewFullPii: false,
    canValidateRecords: false,
  },
  AUDITOR_LGPD: {
    role: 'AUDITOR_LGPD',
    label: 'Auditor / Assistente Social (Autorizado LGPD)',
    shortLabel: 'Auditor (LGPD)',
    userName: 'Dra. Helena Vasconcelos',
    userEmail: 'helena.vasconcelos@marica.rj.gov.br',
    department: 'Assistência Social e Governança LGPD',
    description:
      'Acesso nominal autorizado a registros individuais, pontos georreferenciados, histórico longitudinal completo, validação de cadastros e exportação auditada.',
    canViewIndividualPoints: true,
    canViewFullPii: true,
    canValidateRecords: true,
  },
  EQUIPE_CAMPO: {
    role: 'EQUIPE_CAMPO',
    label: 'Coordenação de Campo (Offline e Validação)',
    shortLabel: 'Equipe de Campo',
    userName: 'Paulo Henrique Costa',
    userEmail: 'paulo.campo@marica.rj.gov.br',
    department: 'Busca Ativa e Cadastro Territorial',
    description:
      'Gerencia cadastros realizados em campo com conectividade limitada, sincroniza fila offline e acompanha pendências de validação.',
    canViewIndividualPoints: true,
    canViewFullPii: true,
    canValidateRecords: true,
  },
};

interface OfflineQueueItem {
  queueId: string;
  queuedAt: string;
  record: BeneficiaryRecord;
  isUpdate: boolean;
  note: string;
}

interface UpsertOptions {
  note?: string;
  offlineMode?: boolean;
  updatedBy?: string;
}

interface IntegraContextValue {
  portalMode: AppPortalMode;
  setPortalMode: (mode: AppPortalMode) => void;
  enterManagement: (view?: ManagementView) => void;
  returnToPortal: () => void;

  managementView: ManagementView;
  setManagementView: (view: ManagementView) => void;

  authSession: AuthSession | null;
  activeRoleProfile: RoleProfile | null;
  loginAsRole: (role: UserRole, customEmail?: string) => void;
  switchRole: (role: UserRole) => void;
  logoutManagement: () => void;

  beneficiaries: BeneficiaryRecord[];
  filteredBeneficiaries: BeneficiaryRecord[];
  filters: BeneficiaryFilterState;
  setFilters: React.Dispatch<React.SetStateAction<BeneficiaryFilterState>>;
  updateFilter: <K extends keyof BeneficiaryFilterState>(
    key: K,
    value: BeneficiaryFilterState[K]
  ) => void;
  resetFilters: () => void;

  selectedBeneficiaryId: string | null;
  setSelectedBeneficiaryId: (id: string | null) => void;
  selectedBeneficiary: BeneficiaryRecord | null;

  offlineQueue: OfflineQueueItem[];
  syncOfflineQueue: () => void;

  auditLogs: AuditLogEntry[];
  recordAuditEvent: (
    action: string,
    resource: string,
    legalBasis: string,
    severity?: AuditLogEntry['severity']
  ) => void;

  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  pushToast: (title: string, description: string, tone?: ToastMessage['tone']) => void;

  upsertBeneficiary: (
    draft: Omit<BeneficiaryRecord, 'id' | 'registeredAt' | 'lastUpdatedAt' | 'nextDueDate' | 'history'> & {
      id?: string;
    },
    options?: UpsertOptions
  ) => { savedId: string; queuedOffline: boolean; nextDueDate: string };

  validatePendingBeneficiary: (id: string) => void;
  notifyDueBeneficiaries: () => void;
  resetDemo: () => void;
}

const IntegraContext = createContext<IntegraContextValue | null>(null);

function nowLabel(): string {
  const now = new Date();
  return `Hoje, ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function IntegraProvider({ children }: { children: React.ReactNode }) {
  const [portalMode, setPortalMode] = useState<AppPortalMode>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('painel') === 'gestao') return 'gestao';
    }
    return 'portal';
  });

  const [managementView, setManagementView] = useState<ManagementView>('mapa');
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);

  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRecord[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as BeneficiaryRecord[];
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // fallback to seed
      }
    }
    return SEED_BENEFICIARIES;
  });

  const [filters, setFilters] = useState<BeneficiaryFilterState>(DEFAULT_FILTER_STATE);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string | null>(
    SEED_BENEFICIARIES[0].id
  );
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(beneficiaries));
    } catch {
      // ignore storage quota errors
    }
  }, [beneficiaries]);

  const pushToast = useCallback(
    (title: string, description: string, tone: ToastMessage['tone'] = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [{ id, title, description, tone }, ...prev].slice(0, 3));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const recordAuditEvent = useCallback(
    (
      action: string,
      resource: string,
      legalBasis: string,
      severity: AuditLogEntry['severity'] = 'info'
    ) => {
      const actorName = authSession?.userName ?? 'Portal do Beneficiário';
      const actorRole: UserRole = authSession?.role ?? 'ANALISTA_AGREGADO';
      const entry: AuditLogEntry = {
        id: `AUD-${Date.now().toString().slice(-4)}`,
        timestamp: nowLabel(),
        actorName,
        actorRole,
        action,
        resource,
        legalBasis,
        severity,
      };
      setAuditLogs((prev) => [entry, ...prev].slice(0, 40));
    },
    [authSession]
  );

  const loginAsRole = useCallback(
    (role: UserRole, customEmail?: string) => {
      const prof = ROLE_PROFILES[role];
      const session: AuthSession = {
        userName: prof.userName,
        userEmail: customEmail?.trim() || prof.userEmail,
        role,
        department: prof.department,
        loggedInAt: nowLabel(),
      };
      setAuthSession(session);
      setAuditLogs((prev) => [
        {
          id: `AUD-${Date.now().toString().slice(-4)}`,
          timestamp: nowLabel(),
          actorName: session.userName,
          actorRole: role,
          action: `Autenticação no painel administrativo (${prof.shortLabel})`,
          resource: 'Controle de acesso RBAC',
          legalBasis: 'Art. 46 da LGPD: rastreabilidade e segurança de acesso',
          severity: 'success',
        },
        ...prev,
      ]);
      pushToast('Acesso autenticado', `Perfil ativo: ${prof.label}.`, 'success');
    },
    [pushToast]
  );

  const switchRole = useCallback(
    (role: UserRole) => {
      loginAsRole(role);
    },
    [loginAsRole]
  );

  const logoutManagement = useCallback(() => {
    recordAuditEvent(
      'Encerramento de sessão administrativa',
      'Portal de gestão',
      'Art. 46 da LGPD: gestão de sessão',
      'info'
    );
    setAuthSession(null);
  }, [recordAuditEvent]);

  const enterManagement = useCallback((view: ManagementView = 'mapa') => {
    setManagementView(view);
    setPortalMode('gestao');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('painel', 'gestao');
      url.hash = '';
      window.history.replaceState({}, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const returnToPortal = useCallback(() => {
    setPortalMode('portal');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('painel');
      window.history.replaceState({}, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const updateFilter = useCallback(
    <K extends keyof BeneficiaryFilterState>(key: K, value: BeneficiaryFilterState[K]) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        if (key === 'districtId') {
          next.neighborhood = 'ALL';
        }
        return next;
      });
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTER_STATE);
  }, []);

  const filteredBeneficiaries = useMemo(
    () => applyCombinedFilters(beneficiaries, filters),
    [beneficiaries, filters]
  );

  const selectedBeneficiary = useMemo(
    () => beneficiaries.find((b) => b.id === selectedBeneficiaryId) ?? null,
    [beneficiaries, selectedBeneficiaryId]
  );

  const upsertBeneficiary: IntegraContextValue['upsertBeneficiary'] = useCallback(
    (draft, options) => {
      const today = REFERENCE_TODAY;
      const nextDueDate = addDaysIso(today, VALIDADE_CADASTRO_DIAS);
      const cleanCpf = draft.cpf.replace(/\D/g, '');
      const existing = beneficiaries.find(
        (b) => (draft.id && b.id === draft.id) || b.cpf.replace(/\D/g, '') === cleanCpf
      );

      const tempRecordForCalc: BeneficiaryRecord = {
        ...draft,
        id: existing ? existing.id : `BEN-${String(beneficiaries.length + 1).padStart(3, '0')}`,
        registeredAt: existing ? existing.registeredAt : today,
        lastUpdatedAt: today,
        nextDueDate,
        history: existing ? existing.history : [],
      };

      const historyEntry = {
        id: `H-${Date.now()}`,
        date: today,
        cycleLabel: 'Nov/2026',
        employmentStatus: draft.employmentStatus,
        workRegime: draft.workRegime,
        profession: draft.profession || 'Sem ocupação atual',
        individualIncome: draft.individualIncome,
        householdTotalIncome: draft.householdTotalIncome,
        perCapitaIncome: getPerCapitaIncome(tempRecordForCalc),
        socialBenefitsTotal: getSocialBenefitsTotal(tempRecordForCalc),
        note:
          options?.note ||
          (existing
            ? 'Atualização trimestral preservando histórico econômico anterior.'
            : 'Novo cadastro individual realizado no aplicativo.'),
        updatedBy: options?.updatedBy || 'Aplicativo do Beneficiário',
      };

      const finalRecord: BeneficiaryRecord = {
        ...tempRecordForCalc,
        capturedOffline: Boolean(options?.offlineMode),
        history: existing ? [...existing.history, historyEntry] : [historyEntry],
      };

      if (options?.offlineMode) {
        setOfflineQueue((prev) => [
          {
            queueId: `OFF-${Date.now()}`,
            queuedAt: nowLabel(),
            record: finalRecord,
            isUpdate: Boolean(existing),
            note: historyEntry.note,
          },
          ...prev,
        ]);
        pushToast(
          'Salvo na fila offline de campo',
          `${finalRecord.fullName} guardado localmente para sincronização posterior.`,
          'warning'
        );
        return { savedId: finalRecord.id, queuedOffline: true, nextDueDate };
      }

      setBeneficiaries((prev) => {
        if (existing) {
          return prev.map((b) => (b.id === existing.id ? finalRecord : b));
        }
        return [finalRecord, ...prev];
      });
      setSelectedBeneficiaryId(finalRecord.id);

      setAuditLogs((prev) => [
        {
          id: `AUD-${Date.now().toString().slice(-4)}`,
          timestamp: nowLabel(),
          actorName: options?.updatedBy || finalRecord.fullName,
          actorRole: options?.updatedBy?.includes('Campo') ? 'EQUIPE_CAMPO' : 'AUDITOR_LGPD',
          action: existing
            ? `Atualização cadastral trimestral (${finalRecord.id})`
            : `Novo cadastro individual (${finalRecord.id})`,
          resource: `${finalRecord.neighborhood} — histórico preservado (${finalRecord.history.length} registros)`,
          legalBasis: 'Art. 7º, III e Art. 23 da LGPD: política pública municipal',
          severity: 'success',
        },
        ...prev,
      ]);

      pushToast(
        existing ? 'Cadastro atualizado com histórico preservado' : 'Novo cadastro registrado',
        `Validade renovada por 3 meses (até ${nextDueDate.split('-').reverse().join('/')}).`,
        'success'
      );

      return { savedId: finalRecord.id, queuedOffline: false, nextDueDate };
    },
    [beneficiaries, pushToast]
  );

  const syncOfflineQueue = useCallback(() => {
    if (offlineQueue.length === 0) return;
    const count = offlineQueue.length;
    setBeneficiaries((prev) => {
      const next = [...prev];
      for (const item of offlineQueue) {
        const idx = next.findIndex((b) => b.id === item.record.id);
        const synced = { ...item.record, capturedOffline: false };
        if (idx >= 0) next[idx] = synced;
        else next.unshift(synced);
      }
      return next;
    });
    setOfflineQueue([]);
    recordAuditEvent(
      `Sincronização de ${count} registro(s) da fila offline de campo`,
      'Base territorial de Maricá',
      'Art. 23 da LGPD: coleta assistida em campo',
      'success'
    );
    pushToast(
      'Fila offline sincronizada',
      `${count} cadastro(s) incorporados à base central e aos indicadores.`,
      'success'
    );
  }, [offlineQueue, pushToast, recordAuditEvent]);

  const validatePendingBeneficiary = useCallback(
    (id: string) => {
      const target = beneficiaries.find((b) => b.id === id);
      if (!target) return;
      const nextDue = addDaysIso(REFERENCE_TODAY, VALIDADE_CADASTRO_DIAS);
      setBeneficiaries((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                pendingValidation: false,
                lastUpdatedAt: REFERENCE_TODAY,
                nextDueDate: nextDue,
              }
            : b
        )
      );
      recordAuditEvent(
        `Validação documental aprovada (${id})`,
        `${target.neighborhood} — validade renovada por 90 dias`,
        'Art. 7º, III da LGPD: conferência cadastral',
        'success'
      );
      pushToast(
        'Cadastro validado',
        `Registro ${id} classificado como Atualizado por 3 meses.`,
        'success'
      );
    },
    [beneficiaries, pushToast, recordAuditEvent]
  );

  const notifyDueBeneficiaries = useCallback(() => {
    recordAuditEvent(
      'Disparo de lembretes de atualização cadastral (sem suspensão automática)',
      'Cadastros vencidos e próximos do vencimento',
      'Art. 7º, III da LGPD: comunicação de serviço público',
      'info'
    );
    pushToast(
      'Lembretes enviados aos beneficiários',
      'Notificações orientando atualização cadastral enviadas. Nenhum benefício foi suspenso automaticamente.',
      'info'
    );
  }, [pushToast, recordAuditEvent]);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setBeneficiaries(SEED_BENEFICIARIES);
    setFilters(DEFAULT_FILTER_STATE);
    setSelectedBeneficiaryId(SEED_BENEFICIARIES[0].id);
    setOfflineQueue([]);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    pushToast('Base restaurada', 'Dados iniciais de demonstração recarregados.', 'info');
  }, [pushToast]);

  const activeRoleProfile = authSession ? ROLE_PROFILES[authSession.role] : null;

  return (
    <IntegraContext.Provider
      value={{
        portalMode,
        setPortalMode,
        enterManagement,
        returnToPortal,
        managementView,
        setManagementView,
        authSession,
        activeRoleProfile,
        loginAsRole,
        switchRole,
        logoutManagement,
        beneficiaries,
        filteredBeneficiaries,
        filters,
        setFilters,
        updateFilter,
        resetFilters,
        selectedBeneficiaryId,
        setSelectedBeneficiaryId,
        selectedBeneficiary,
        offlineQueue,
        syncOfflineQueue,
        auditLogs,
        recordAuditEvent,
        toasts,
        dismissToast,
        pushToast,
        upsertBeneficiary,
        validatePendingBeneficiary,
        notifyDueBeneficiaries,
        resetDemo,
      }}
    >
      {children}
    </IntegraContext.Provider>
  );
}

export function useIntegra() {
  const ctx = useContext(IntegraContext);
  if (!ctx) throw new Error('useIntegra deve ser usado dentro de IntegraProvider');
  return ctx;
}
