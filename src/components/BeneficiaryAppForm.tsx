import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  KeyRound,
  ChevronRight,
  Cpu,
  Crosshair,
  FileText,
  GraduationCap,
  Home,
  Loader2,
  MapPin,
  Trash2,
  Users,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { citizenAreaUrl, citizenRequest, CitizenRequestError, type CitizenAccount, type CitizenProfile, type DwellingHolder, type EducationEntry, type EmploymentEntry } from '../data/citizenAccount';
import { CONTRACT_LIMIT, MIN_CITIZEN_PASSWORD, cpfDigits, isCpfValid } from '../data/citizenValidation';
import { CitizenHistoryFields } from './CitizenHistoryFields';
import { IdentityCheck } from './IdentityCheck';
import {
  GOVERNMENT_POLICIES_CATALOG,
  MARICA_CRAS_UNITS,
  MARICA_MUNICIPAL_SCHOOLS,
  PASSAPORTE_COURSES,
  PASSAPORTE_UNIVERSITIES,
  suggestPoliciesWithAI,
  type AiPolicySuggestion,
} from '../data/maricaCatalog';
import { DISTRICT_BY_ID, expandUsfName, MARICA_REAL_USFS, OFFICIAL_BAIRROS } from '../data/maricaGeo';
import {
  calculateAge,
  ECONOMIC_SECTORS,
  EMPLOYMENT_LABELS,
  formatCurrency,
  WORK_REGIME_LABELS,
} from '../engine/analyticsEngine';
import type {
  BeneficiaryRecord,
  DistrictId,
  EmploymentStatus,
  HouseholdMemberLink,
  HousingType,
  PolicySelfDeclaration,
  SocialProgramBenefit,
  WorkRegime,
} from '../types/integra';
import { HomeGeofenceIcon } from './CivicIcons';
import { GeofenceMiniMap } from './GeofenceMiniMap';

type FormStep = 1 | 2 | 3 | 4;

const MODULES: { n: 1 | 2 | 3 | 4; title: string; subtitle: string }[] = [
  { n: 1, title: 'Dados e dependentes', subtitle: 'Quem mora com você' },
  { n: 2, title: 'Renda e benefícios', subtitle: 'Trabalho e programas sociais' },
  { n: 3, title: 'Moradia', subtitle: 'Endereço, titular e contrato' },
  { n: 4, title: 'Históricos e envio', subtitle: 'Empregos e formação' },
];

function formatCpfInput(value: string): string {
  const digits = cpfDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function defaultDeclaration(): PolicySelfDeclaration {
  return {
    cadUnicoRegistered: false,
    nis: '',
    ubsRegistered: false,
    ubsName: expandUsfName(MARICA_REAL_USFS[0].name),
    crasRegistered: false,
    crasName: MARICA_CRAS_UNITS[0].name,
    publicSchoolStudent: false,
    schoolName: MARICA_MUNICIPAL_SCHOOLS[0].name,
    studentScope: 'Dependente(s)',
    passaporteUniversitario: false,
    universityName: PASSAPORTE_UNIVERSITIES[0],
    universityCourse: PASSAPORTE_COURSES[0],
    declaredPolicies: [],
    crossCheckStatus: 'AGUARDANDO_CRUZAMENTO',
    crossCheckNotes: '',
  };
}

function createEmptyDraft() {
  const defaultBairro = OFFICIAL_BAIRROS.find((b) => b.name === 'Barroco') ?? OFFICIAL_BAIRROS[0];
  return {
    id: undefined as string | undefined,
    cpf: '',
    fullName: '',
    birthDate: '',
    gender: 'Prefiro não informar' as BeneficiaryRecord['gender'],
    maritalStatus: 'Solteiro(a)' as BeneficiaryRecord['maritalStatus'],
    education: 'Médio completo' as BeneficiaryRecord['education'],
    phone: '',
    email: '',
    householdSize: 1,
    dependentsCount: 0,
    familyComposition: 'Titular',
    householdMembers: [] as HouseholdMemberLink[],
    selfDeclaration: defaultDeclaration(),
    profession: '',
    employmentStatus: 'DESEMPREGADO' as EmploymentStatus,
    workRegime: 'SEM_VINCULO' as WorkRegime,
    employerName: '',
    economicSector: '',
    individualIncome: 0,
    householdTotalIncome: 0,
    incomeContributorsCount: 0,
    otherIncomeSources: 0,
    socialPrograms: [] as SocialProgramBenefit[],
    address: '',
    neighborhood: '',
    districtId: defaultBairro.districtId as DistrictId,
    cep: '',
    coords: defaultBairro.center as [number, number],
    housingType: '' as HousingType | '',
    rentValue: 0,
    workLocationBairro: '',
    workCoords: undefined as [number, number] | undefined,
    dwellingType: '' as CitizenProfile['dwellingType'] | '',
    dwellingHolder: { kind: 'SELF' } as DwellingHolder,
    employmentHistory: [] as EmploymentEntry[],
    academicHistory: [] as EducationEntry[],
  };
}

type BeneficiaryDraft = ReturnType<typeof createEmptyDraft>;

function recordToDraft(b: CitizenProfile): BeneficiaryDraft {
  const members = (b.householdMembers ?? []).map((m) => ({ ...m }));
  return {
    id: b.id as string | undefined,
    cpf: b.cpf,
    fullName: b.fullName,
    birthDate: b.birthDate,
    gender: b.gender,
    maritalStatus: b.maritalStatus,
    education: b.education,
    phone: b.phone,
    email: b.email,
    householdSize: 1 + members.length,
    dependentsCount: b.dependentsCount,
    familyComposition: b.familyComposition,
    householdMembers: members,
    selfDeclaration: b.selfDeclaration
      ? { ...b.selfDeclaration, declaredPolicies: [...b.selfDeclaration.declaredPolicies] }
      : defaultDeclaration(),
    profession: b.profession,
    employmentStatus: b.employmentStatus,
    workRegime: b.workRegime,
    employerName: b.employerName,
    economicSector: b.economicSector,
    individualIncome: b.individualIncome,
    householdTotalIncome: b.householdTotalIncome,
    incomeContributorsCount: b.incomeContributorsCount,
    otherIncomeSources: b.otherIncomeSources,
    socialPrograms: b.socialPrograms.map((p) => ({ ...p })),
    address: b.address,
    neighborhood: b.neighborhood,
    districtId: b.districtId,
    cep: b.cep,
    coords: [...b.coords] as [number, number],
    housingType: b.housingType,
    rentValue: b.rentValue,
    workLocationBairro: b.workLocationBairro ?? '',
    workCoords: b.workCoords ? ([...b.workCoords] as [number, number]) : undefined,
    dwellingType: b.dwellingType,
    dwellingHolder: b.dwellingHolder,
    employmentHistory: b.employmentHistory,
    academicHistory: b.academicHistory,
  };
}

export function BeneficiaryAppForm({
  account,
  onSaved,
}: {
  account?: CitizenAccount;
  onSaved?: (account: CitizenAccount) => void;
}) {
  const [entryMode, setEntryMode] = useState<'cpf' | 'password' | 'new' | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<FormStep>(1);
  const [lookupInput, setLookupInput] = useState('');
  const [password, setPassword] = useState('');
  const [identity, setIdentity] = useState({ available: false, required: false });
  const [verified, setVerified] = useState(false);
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState('');
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [draft, setDraft] = useState(() => account ? recordToDraft(account.profile) : createEmptyDraft());
  const [formError, setFormError] = useState<string | null>(null);

  // AI Policy Assistant state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiPolicySuggestion[] | null>(null);

  // Real GPS 2-stage state
  const [loadingGps, setLoadingGps] = useState(false);
  const [gpsCapturedCoords, setGpsCapturedCoords] = useState<[number, number] | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [gpsModeText, setGpsModeText] = useState<string>('');

  const focusInWorkspace = (selector: string) => {
    requestAnimationFrame(() => {
      const target = workspaceRef.current?.querySelector<HTMLElement>(selector) ?? workspaceRef.current;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'start' });
    });
  };

  const goToStep = (targetStep: FormStep) => {
    if (targetStep === step) return;
    setFormError(null);
    setStep(targetStep);
    focusInWorkspace('[data-step-heading]');
  };

  const showFormError = (message: string) => {
    setFormError(message);
    focusInWorkspace('#cadastro-erro');
  };

  const openRegistration = () => {
    if (entryMode === null) setEntryMode('cpf');
    focusInWorkspace(entryMode === 'new' ? '[data-step-heading]' : '#buscar-cpf');
  };

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!isCpfValid(lookupInput)) {
      setLookupFeedback('Informe um CPF válido.');
      return;
    }

    setBusy(true);
    setLookupFeedback('');
    try {
      if (entryMode === 'password') {
        await citizenRequest('entrar', { cpf: lookupInput, password });
        window.location.assign(citizenAreaUrl());
        return;
      }
      const result = await citizenRequest<{ registered: boolean; registrationOpen: boolean; biometricAvailable: boolean; biometricRequired: boolean }>('cpf', { cpf: lookupInput });
      if (result.registered) {
        setEntryMode('password');
        focusInWorkspace('#senha-acesso');
      } else if (result.registrationOpen) {
        setDraft({ ...createEmptyDraft(), cpf: lookupInput });
        setIdentity({ available: result.biometricAvailable, required: result.biometricRequired });
        setVerified(false);
        setStep(1);
        setEntryMode('new');
        focusInWorkspace('[data-step-heading]');
      } else {
        setLookupFeedback('Novos cadastros ainda não estão disponíveis.');
      }
    } catch (error) {
      setLookupFeedback(error instanceof Error ? error.message : 'Tente novamente em instantes.');
    } finally {
      setBusy(false);
    }
  };

  const setMemberCount = (count: number) => {
    if (!Number.isInteger(count) || count < 0 || count > 30) return;
    setDraft((current) => ({
      ...current,
      householdSize: 1 + count,
      householdMembers: Array.from({ length: count }, (_, index) => current.householdMembers[index] ?? {
        id: crypto.randomUUID(), fullName: '', cpf: '', relationship: 'Outro', birthDate: '',
      }),
      dependentsCount: Math.min(current.dependentsCount, count),
    }));
  };

  const updateHouseholdMember = <K extends keyof HouseholdMemberLink>(
    id: string,
    key: K,
    value: HouseholdMemberLink[K]
  ) => {
    setDraft((prev) => ({
      ...prev,
      householdMembers: prev.householdMembers.map((m) =>
        m.id === id ? { ...m, [key]: value } : m
      ),
    }));
  };

  const removeHouseholdMember = (id: string) => {
    setDraft((prev) => {
      const members = prev.householdMembers.filter((m) => m.id !== id);
      return {
        ...prev,
        householdMembers: members,
        householdSize: 1 + members.length,
        dependentsCount: Math.min(prev.dependentsCount, members.length),
      };
    });
  };

  const updateDeclaration = <K extends keyof PolicySelfDeclaration>(
    key: K,
    value: PolicySelfDeclaration[K]
  ) => {
    setDraft((prev) => ({
      ...prev,
      selfDeclaration: {
        ...prev.selfDeclaration,
        [key]: value,
        crossCheckStatus: 'AGUARDANDO_CRUZAMENTO',
        crossCheckNotes:
          '',
      },
    }));
  };

  const age = calculateAge(draft.birthDate);
  const totalPeopleInHome = 1 + draft.householdMembers.length;
  const benefitsTotal = draft.socialPrograms.reduce((s, p) => s + (Number(p.monthlyValue) || 0), 0);
  const perCapitaAuto = Math.round(
    ((Number(draft.householdTotalIncome) || 0) + benefitsTotal) / Math.max(1, totalPeopleInHome)
  );

  const togglePolicyDeclaration = (policyName: string, defaultVal: number) => {
    setDraft((prev) => {
      const alreadyDeclared = prev.selfDeclaration.declaredPolicies.includes(policyName);
      const nextDeclared = alreadyDeclared
        ? prev.selfDeclaration.declaredPolicies.filter((n) => n !== policyName)
        : [...prev.selfDeclaration.declaredPolicies, policyName];

      let nextPrograms = prev.socialPrograms;
      if (defaultVal > 0) {
        if (alreadyDeclared) {
          nextPrograms = prev.socialPrograms.filter((p) => p.name !== policyName);
        } else if (!prev.socialPrograms.some((p) => p.name === policyName)) {
          nextPrograms = [...prev.socialPrograms, { name: policyName, monthlyValue: 0 }];
        }
      }

      const nextPassaporte =
        policyName === 'Passaporte Universitário'
          ? !alreadyDeclared
          : prev.selfDeclaration.passaporteUniversitario;

      return {
        ...prev,
        socialPrograms: nextPrograms,
        selfDeclaration: {
          ...prev.selfDeclaration,
          declaredPolicies: nextDeclared,
          passaporteUniversitario: nextPassaporte,
          crossCheckStatus: 'AGUARDANDO_CRUZAMENTO',
        },
      };
    });
  };

  const updateProgramValue = (programName: string, value: number) => {
    setDraft((prev) => ({
      ...prev,
      socialPrograms: prev.socialPrograms.map((p) =>
        p.name === programName ? { ...p, monthlyValue: Math.max(0, value) } : p
      ),
    }));
  };

  const runAiPolicyAssistant = () => {
    setAiLoading(true);
    setTimeout(() => {
      const list = suggestPoliciesWithAI(
        {
          age,
          employmentStatus: draft.employmentStatus,
          workRegime: draft.workRegime,
          housingType: draft.housingType,
          individualIncome: draft.individualIncome,
          householdSize: totalPeopleInHome,
          dependentsCount: draft.dependentsCount,
          education: draft.education,
          hasPublicSchoolStudent: draft.selfDeclaration.publicSchoolStudent,
          hasPassaporte: draft.selfDeclaration.passaporteUniversitario,
          hasCadUnico: draft.selfDeclaration.cadUnicoRegistered,
        },
        aiPrompt
      );
      setAiSuggestions(list);
      setAiLoading(false);
    }, 450);
  };

  const handleNeighborhoodChange = (bairroName: string) => {
    const info = OFFICIAL_BAIRROS.find((b) => b.name === bairroName);
    if (!info) return;
    setDraft((prev) => ({
      ...prev,
      neighborhood: info.name,
      districtId: info.districtId,
      coords: info.center,
    }));
  };

  const handleWorkBairroChange = (bairroName: string) => {
    const info = OFFICIAL_BAIRROS.find((b) => b.name === bairroName);
    setDraft((prev) => ({
      ...prev,
      workLocationBairro: bairroName,
      workCoords: info ? info.center : undefined,
    }));
  };

  const applyRealPosition = (pos: GeolocationPosition, highAccuracy: boolean) => {
    const coords: [number, number] = [
      Number(pos.coords.latitude.toFixed(5)),
      Number(pos.coords.longitude.toFixed(5)),
    ];
    const acc = pos.coords.accuracy ?? 0;
    setGpsCapturedCoords(coords);
    setGpsAccuracy(acc);
    setGpsModeText(highAccuracy ? 'GPS real do aparelho' : 'Localização de rede do aparelho');
    setDraft((prev) => ({ ...prev, coords }));
    setLoadingGps(false);

    if (acc === 0 || acc > 500) {
      setGpsNotice(
        'Sinal de localização com baixa precisão ou instabilidade. Tente próximo a uma janela ou confirme o bairro no seletor acima.'
      );
    }
  };

  const handleGeoFailure = (err: GeolocationPositionError) => {
    setLoadingGps(false);
    if (err.code === err.PERMISSION_DENIED) {
      setGpsNotice(
        'Permissão de localização bloqueada no navegador. Libere o acesso no ícone de cadeado da barra de endereço e tente novamente.'
      );
    } else if (err.code === err.TIMEOUT) {
      setGpsNotice(
        'O GPS demorou para responder. Aproxime-se de uma janela e toque novamente em "Usar minha localização".'
      );
    } else {
      setGpsNotice(
        'Não foi possível obter o GPS agora. As coordenadas do bairro selecionado continuam preenchidas no mapa.'
      );
    }
  };

  const requestRealLocation = () => {
    setGpsNotice(null);
    if (!navigator.geolocation) {
      setGpsNotice('Este navegador não oferece suporte a geolocalização.');
      return;
    }
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => applyRealPosition(pos, true),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          handleGeoFailure(err);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (fallbackPos) => applyRealPosition(fallbackPos, false),
          handleGeoFailure,
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  };

  const validateStep = (targetStep: FormStep) => {
    if (step === 1 && targetStep > 1) {
      if (draft.fullName.trim().length < 4 || !isCpfValid(draft.cpf) || !draft.birthDate || draft.birthDate > today) {
        return showFormError('Confira o nome completo, o CPF e a data de nascimento do titular.');
      }
      if (!account && (password.length < MIN_CITIZEN_PASSWORD || new TextEncoder().encode(password).length > 72)) {
        return showFormError('Crie uma senha de pelo menos 10 caracteres e até 72 bytes.');
      }
      if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
        return showFormError('Confira o endereço de e-mail informado.');
      }
      if (draft.householdMembers.some((member) => member.fullName.trim().length < 3 || !isCpfValid(member.cpf) ||
        !member.birthDate || member.birthDate > today)) {
        return showFormError('Confira o nome, o CPF e a data de nascimento de cada morador.');
      }
      const cpfs = [draft.cpf, ...draft.householdMembers.map((member) => member.cpf)].map(cpfDigits);
      if (new Set(cpfs).size !== cpfs.length) return showFormError('Cada morador deve ter um CPF diferente.');
    }
    if (step === 3 && targetStep > 3) {
      if (draft.address.trim().length < 5 || !draft.neighborhood || !draft.housingType || !draft.dwellingType) {
        return showFormError('Informe o endereço, o bairro e o tipo de moradia e de imóvel.');
      }
      const holder = draft.dwellingHolder;
      if (holder.kind === 'OTHER' && (holder.name.trim().length < 3 || !isCpfValid(holder.cpf) || holder.relationship.trim().length < 2)) {
        return showFormError('Confira o nome, o CPF e o vínculo do titular do imóvel.');
      }
      if (draft.housingType === 'ALUGADA' && !contractFile && !account?.profile.rentalContractName) {
        return showFormError('Anexe o contrato de aluguel em PDF.');
      }
    }
    goToStep(targetStep);
  };

  const handleSubmitAll = async () => {
    if (busy) return;
    if (!account && identity.required && !verified) return showFormError('Conclua a verificação facial para criar o cadastro.');
    if (draft.employmentHistory.some((entry) => !entry.employer.trim() || !entry.role.trim() || !entry.startDate ||
      (entry.endDate && entry.endDate < entry.startDate)) ||
      draft.academicHistory.some((entry) => !entry.institution.trim() || !entry.course.trim() || !entry.startDate ||
      (entry.endDate && entry.endDate < entry.startDate))) {
      return showFormError('Confira os nomes e as datas dos registros de trabalho e de formação.');
    }

    setBusy(true);
    setFormError(null);
    try {
      const contract = contractFile && draft.housingType === 'ALUGADA' ? {
        name: contractFile.name,
        data: await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = reject;
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.readAsDataURL(contractFile);
        }),
      } : null;
      const saved = await citizenRequest<CitizenAccount>(account ? 'salvar' : 'cadastrar', {
        profile: draft, contract,
        ...(account ? { revision: account.revision } : { cpf: draft.cpf, password }),
      });
      setPassword('');
      if (onSaved) onSaved(saved);
      else window.location.assign(citizenAreaUrl());
    } catch (error) {
      if (!account && error instanceof CitizenRequestError && error.status === 403) setVerified(false);
      showFormError(error instanceof Error ? error.message : 'Não foi possível salvar o cadastro.');
    } finally {
      setBusy(false);
    }
  };

  const canEdit = Boolean(account) || entryMode === 'new';
  const fieldClass = 'mt-1 min-h-11 w-full rounded-lg border border-[#C4D0D7] bg-white px-3 text-sm text-[#0B3B49]';

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-9 sm:px-6 sm:pb-13">
      {!account && <div className="grid gap-2 rounded-2xl border border-[#DCE3E8] bg-white p-2.5 shadow-[0_16px_36px_-22px_rgba(7,41,51,0.42)] md:grid-cols-[1.1fr_1fr_1fr]">
        <button
          type="button"
          aria-expanded={entryMode !== null}
          aria-controls="cadastro-formulario"
          onClick={openRegistration}
          className="citizen-service-card citizen-service-primary cursor-pointer text-left"
        >
          <span className="citizen-service-icon"><FileText aria-hidden="true" className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base leading-tight font-extrabold sm:text-lg">Atualizar meu cadastro</span>
            <span className="citizen-service-detail mt-1 block text-sm leading-snug">Use seu CPF para acessar ou criar o cadastro.</span>
          </span>
          <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
        </button>
        <a href="#oportunidades" className="citizen-service-card">
          <span className="citizen-service-icon"><Briefcase aria-hidden="true" className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base leading-tight font-extrabold sm:text-lg">Oportunidades para você</span>
            <span className="citizen-service-detail mt-1 block text-sm leading-snug">Encontre vagas em Maricá e cursos gratuitos.</span>
          </span>
          <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
        </a>
        <a href="#apoio" className="citizen-service-card" aria-labelledby="cadastro-ajuda-acao" aria-describedby="cadastro-ajuda-detalhe">
          <span className="citizen-service-icon citizen-service-icon-help"><MapPin aria-hidden="true" className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span id="cadastro-ajuda-acao" className="block font-display text-base leading-tight font-extrabold sm:text-lg">Encontrar atendimento</span>
            <span id="cadastro-ajuda-detalhe" className="citizen-service-detail mt-1 block text-sm leading-snug">Veja os locais no mapa.</span>
          </span>
          <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
        </a>
      </div>}

      <div id="cadastro-formulario" ref={workspaceRef} tabIndex={-1} hidden={!account && !entryMode} className="mt-5 scroll-mt-4 rounded-xl">
        {canEdit && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] px-4 py-2.5">
              <div>
                <div className="text-[11px] font-semibold text-[#52646D]">Progresso</div>
                <div className="font-display text-sm font-extrabold text-[#0B3B49] tabular-nums">
                  Passo {step} de 4
                </div>
              </div>
              <div className="h-2.5 w-24 overflow-hidden rounded-full bg-[#DCE3E8]">
                <div
                  className="h-full rounded-full bg-[#D93829] transition-all duration-500"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>
        </div>
        )}

      {/* Main Studio Card */}
      <div className="overflow-hidden rounded-[14px] border border-[#DCE3E8] bg-white shadow-[0_18px_46px_-16px_rgba(11,59,73,0.14)]">
        <div className={canEdit ? 'grid grid-cols-1 lg:grid-cols-[260px_1fr]' : ''}>
          {canEdit && <aside className="flex flex-col justify-between border-b border-[#DCE3E8] bg-[#0B3B49] p-5 text-white lg:border-b-0 lg:border-r lg:p-7">
            <div>
              <div className="text-sm font-bold text-[#E89B0C]">Etapas do ID Maricá</div>
              <ol className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-1 lg:space-y-4 lg:gap-0">
                {MODULES.map((item) => {
                  const isCurrent = step === item.n;
                  const isDone = step > item.n;
                  return (
                    <li key={item.n}>
                      <button
                        type="button"
                        aria-current={isCurrent ? 'step' : undefined}
                        disabled={!isDone}
                        onClick={() => goToStep(item.n)}
                        className="flex w-full cursor-pointer items-start gap-2.5 rounded text-left transition-colors hover:bg-white/10 disabled:cursor-default disabled:hover:bg-transparent"
                      >
                        <span
                          className={`font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-all sm:h-9 sm:w-9 ${
                            isDone
                              ? 'bg-[#156F48] text-white'
                              : isCurrent
                                ? 'bg-[#D93829] text-white ring-4 ring-[#D93829]/30'
                                : 'bg-white/12 text-[#A7C1CA]'
                          }`}
                        >
                          {item.n}
                        </span>
                        <div className="leading-snug">
                          <div
                            className={`font-display text-xs font-bold sm:text-sm ${
                              isCurrent || isDone ? 'text-white' : 'text-[#A7C1CA]'
                            }`}
                          >
                            {item.title}
                          </div>
                          <div className="mt-0.5 text-[11px] text-[#A7C1CA]">{item.subtitle}</div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-6 hidden space-y-3 border-t border-white/15 pt-5 text-xs leading-relaxed text-[#C2D6DC] lg:block">
              <div className="rounded-[8px] bg-[#072933] p-3.5">
                <strong className="block text-sm text-[#E89B0C]">Validade de 3 meses</strong>
                <p className="mt-1">
                  O vencimento cadastral{' '}
                  <strong className="text-white">não suspende automaticamente</strong> seu
                  benefício. Serve apenas para manter o cadastro atualizado.
                </p>
              </div>
              <p>
                Confira as informações antes de enviar. Benefícios informados aqui são autodeclarados.
              </p>
            </div>
          </aside>}

          {/* Right Workspace */}
          <div className="p-5 sm:p-8">
            {!canEdit && (
              <form onSubmit={handleLookup} className="citizen-appear mx-auto max-w-xl space-y-4">
                <div>
                  <h3 className="font-display text-2xl font-extrabold text-[#0B3B49]">Acesse seu cadastro</h3>
                  <p className="mt-1 text-sm text-[#52646D]">Digite seu CPF. Se for seu primeiro acesso, você poderá iniciar o cadastro.</p>
                </div>
                <label className="block text-sm font-bold" htmlFor="buscar-cpf">
                  CPF
                  <input
                    id="buscar-cpf"
                    className={fieldClass}
                    inputMode="numeric"
                    autoComplete="username"
                    placeholder="000.000.000-00"
                    value={lookupInput}
                    onChange={(event) => {
                      setLookupInput(formatCpfInput(event.target.value));
                      setEntryMode('cpf');
                      setPassword('');
                      setLookupFeedback('');
                    }}
                    readOnly={busy}
                    required
                  />
                </label>
                {entryMode === 'password' && (
                  <label className="citizen-appear block text-sm font-bold" htmlFor="senha-acesso">
                    Senha
                    <input id="senha-acesso" type="password" autoComplete="current-password" className={fieldClass} value={password}
                      onChange={(event) => setPassword(event.target.value)} maxLength={72} required />
                  </label>
                )}
                {lookupFeedback && <p role="status" className="text-sm font-bold text-[#B52B1E]">{lookupFeedback}</p>}
                <button type="submit" disabled={busy} className="citizen-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-bold disabled:opacity-60">
                  {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <KeyRound aria-hidden="true" className="size-4" />}
                  {entryMode === 'password' ? 'Entrar' : 'Continuar com CPF'}
                </button>
              </form>
            )}

            {formError && (
              <div
                id="cadastro-erro"
                role="alert"
                tabIndex={-1}
                className="citizen-appear mb-5 flex items-center gap-2 rounded-[8px] border border-[#D93829]/40 bg-[#FDE8E6] px-4 py-3 text-sm font-semibold text-[#8E2016]"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* MODULE 1: PERSONAL DATA + CPF-LINKED HOUSEHOLD MEMBERS */}
            {step === 1 && canEdit && (
              <div key="mod-1" className="anim-step space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 data-step-heading tabIndex={-1} className="font-display text-xl font-extrabold text-[#0B3B49]">
                    1. Dados do titular e pessoas na casa (por CPF)
                  </h3>
                  <span className="rounded-[5px] bg-[#EDF7FA] px-2.5 py-1 text-xs font-bold text-[#0E7490] tabular-nums">
                    Total na residência: {totalPeopleInHome}{' '}
                    {totalPeopleInHome === 1 ? 'pessoa' : 'pessoas'}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="f-name" className="block text-xs font-bold text-[#0B3B49]">
                      Nome completo do titular
                    </label>
                    <input
                      id="f-name"
                      type="text"
                      value={draft.fullName}
                      onChange={(e) => setDraft((p) => ({ ...p, fullName: e.target.value }))}
                      placeholder="Nome completo conforme documento"
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm text-[#0B3B49]"
                    />
                  </div>

                  <div>
                    <label htmlFor="f-cpf" className="block text-xs font-bold text-[#0B3B49]">
                      CPF do titular (chave individual)
                    </label>
                    <input
                      id="f-cpf"
                      type="text"
                      value={draft.cpf}
                      readOnly
                      placeholder="000.000.000-00"
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm font-semibold text-[#0B3B49]"
                    />
                  </div>

                  <div>
                    <label htmlFor="f-birth" className="block text-xs font-bold text-[#0B3B49]">
                      Data de nascimento{' '}
                      {draft.birthDate && <span className="font-semibold text-[#0E7490]">({age} anos)</span>}
                    </label>
                    <input
                      id="f-birth"
                      type="date"
                      value={draft.birthDate}
                      onChange={(e) => setDraft((p) => ({ ...p, birthDate: e.target.value }))}
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm text-[#0B3B49]"
                    />
                  </div>

                  <div>
                    <label htmlFor="f-gender" className="block text-xs font-bold text-[#0B3B49]">
                      Sexo / Gênero
                    </label>
                    <select
                      id="f-gender"
                      value={draft.gender}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          gender: e.target.value as BeneficiaryRecord['gender'],
                        }))
                      }
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm text-[#0B3B49]"
                    >
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Outro">Outro</option>
                      <option value="Prefiro não informar">Prefiro não informar</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="f-marital" className="block text-xs font-bold text-[#0B3B49]">
                      Estado civil
                    </label>
                    <select
                      id="f-marital"
                      value={draft.maritalStatus}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          maritalStatus: e.target.value as BeneficiaryRecord['maritalStatus'],
                        }))
                      }
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm text-[#0B3B49]"
                    >
                      <option value="Solteiro(a)">Solteiro(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="União estável">União estável</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viúvo(a)">Viúvo(a)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="f-edu" className="block text-xs font-bold text-[#0B3B49]">
                      Escolaridade
                    </label>
                    <select
                      id="f-edu"
                      value={draft.education}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          education: e.target.value as BeneficiaryRecord['education'],
                        }))
                      }
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm text-[#0B3B49]"
                    >
                      <option value="Fundamental incompleto">Fundamental incompleto</option>
                      <option value="Fundamental completo">Fundamental completo</option>
                      <option value="Médio incompleto">Médio incompleto</option>
                      <option value="Médio completo">Médio completo</option>
                      <option value="Superior incompleto">Superior incompleto</option>
                      <option value="Superior completo">Superior completo</option>
                      <option value="Pós-graduação">Pós-graduação</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="f-phone" className="block text-xs font-bold text-[#0B3B49]">
                      Telefone / WhatsApp
                    </label>
                    <input
                      id="f-phone"
                      type="tel"
                      value={draft.phone}
                      onChange={(e) => setDraft((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="(21) 99999-0000"
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm text-[#0B3B49]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="f-email" className="block text-xs font-bold text-[#0B3B49]">
                      E-mail de contato (opcional)
                    </label>
                    <input
                      id="f-email"
                      type="email"
                      value={draft.email}
                      onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                      placeholder="nome@exemplo.com"
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm text-[#0B3B49]"
                    />
                  </div>
                </div>

                {!account && <label className="block text-sm font-bold" htmlFor="f-new-password">
                  Crie sua senha
                  <input id="f-new-password" type="password" autoComplete="new-password" minLength={MIN_CITIZEN_PASSWORD}
                    maxLength={72} className={fieldClass} value={password} onChange={(event) => setPassword(event.target.value)} />
                  <span className="mt-1 block text-xs font-normal text-[#52646D]">Use pelo menos 10 caracteres. Guarde a senha para voltar à Área do Munícipe.</span>
                </label>}

                {/* CPF-Linked Household Members Section */}
                <div className="rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="flex items-center gap-2 font-display text-base font-extrabold text-[#0B3B49]">
                        <Users className="h-4 w-4 text-[#0E7490]" />
                        Pessoas que moram na casa (vinculadas por CPF)
                      </h4>
                      <p className="mt-0.5 text-xs text-[#52646D]">
                        Informe os moradores e depois indique quantos são seus dependentes.
                      </p>
                    </div>
                    <label className="text-sm font-bold">
                      Quantas pessoas moram no imóvel além de você?
                      <select value={draft.householdMembers.length} onChange={(event) => setMemberCount(Number(event.target.value))} className={fieldClass}>
                        {Array.from({ length: 31 }, (_, count) => <option key={count} value={count}>{count}</option>)}
                      </select>
                    </label>
                  </div>

                  <label className="mt-3 block max-w-xs text-sm font-bold">
                    Quantos desses moradores são seus dependentes?
                    <select value={draft.dependentsCount} className={fieldClass} onChange={(event) => {
                      const dependentsCount = Number(event.target.value);
                      setDraft((current) => ({ ...current, dependentsCount }));
                    }}>
                      {Array.from({ length: draft.householdMembers.length + 1 }, (_, count) => <option key={count} value={count}>{count}</option>)}
                    </select>
                  </label>
                  {draft.householdMembers.length === 0 ? (
                    <div className="mt-3 rounded-[8px] border border-dashed border-[#C4D0D7] bg-white p-4 text-center text-xs text-[#52646D]">
                      Você informou que mora sozinho.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {draft.householdMembers.map((m, idx) => (
                        <div
                          key={m.id}
                          className="rounded-[8px] border border-[#DCE3E8] bg-white p-3.5"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-xs font-extrabold text-[#0B3B49]">
                              Morador {idx + 1} (vínculo por CPF)
                            </span>
                            <button
                              type="button"
                              onClick={() => removeHouseholdMember(m.id)}
                              aria-label={`Remover morador ${idx + 1}`}
                              className="inline-flex items-center gap-1 rounded-[5px] px-2 py-1 text-xs font-bold text-[#B52B1E] hover:bg-[#FDE8E6] cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remover
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                            <input
                              type="text"
                              value={m.fullName}
                              onChange={(e) =>
                                updateHouseholdMember(m.id, 'fullName', e.target.value)
                              }
                              placeholder="Nome completo"
                              aria-label={`Nome completo do morador ${idx + 1}`}
                              className="min-h-[42px] rounded-[7px] border border-[#C4D0D7] px-3 py-1.5 text-xs font-semibold text-[#0B3B49]"
                            />
                            <input
                              type="text"
                              value={m.cpf}
                              onChange={(e) =>
                                updateHouseholdMember(m.id, 'cpf', formatCpfInput(e.target.value))
                              }
                              placeholder="CPF: 000.000.000-00"
                              aria-label={`CPF do morador ${idx + 1}`}
                              className="min-h-[42px] rounded-[7px] border border-[#C4D0D7] px-3 py-1.5 text-xs font-bold text-[#0B3B49]"
                            />
                            <select
                              value={m.relationship}
                              onChange={(e) =>
                                updateHouseholdMember(
                                  m.id,
                                  'relationship',
                                  e.target.value as HouseholdMemberLink['relationship']
                                )
                              }
                              aria-label={`Parentesco do morador ${idx + 1}`}
                              className="min-h-[42px] rounded-[7px] border border-[#C4D0D7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0B3B49]"
                            >
                              <option value="Cônjuge / Companheiro(a)">Cônjuge / Companheiro(a)</option>
                              <option value="Filho(a)">Filho(a)</option>
                              <option value="Mãe / Pai">Mãe / Pai</option>
                              <option value="Neto(a)">Neto(a)</option>
                              <option value="Irmão(ã)">Irmão(ã)</option>
                              <option value="Outro">Outro</option>
                            </select>
                            <input
                              type="date"
                              value={m.birthDate}
                              onChange={(e) =>
                                updateHouseholdMember(m.id, 'birthDate', e.target.value)
                              }
                              aria-label={`Data de nascimento do morador ${idx + 1}`}
                              className="min-h-[42px] rounded-[7px] border border-[#C4D0D7] px-2.5 py-1.5 text-xs text-[#0B3B49]"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end border-t border-[#DCE3E8] pt-5">
                  <button
                    type="button"
                    onClick={() => validateStep(2)}
                    className="inline-flex min-h-[50px] items-center gap-2 rounded-[8px] bg-[#D93829] px-7 py-3 text-sm font-extrabold text-white transition-all hover:bg-[#B52B1E] cursor-pointer sm:text-base"
                  >
                    Continuar para Renda e políticas
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* MODULE 2: ECONOMIC + SELF-DECLARATION OF POLICIES + AI SUGGESTION */}
            {step === 2 && (
              <div key="mod-2" className="anim-step space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 data-step-heading tabIndex={-1} className="flex items-center gap-2 font-display text-xl font-extrabold text-[#0B3B49]">
                    <Briefcase className="h-5 w-5 text-[#0E7490]" />
                    2. Trabalho, renda e autodeclaração de políticas
                  </h3>
                  <div className="rounded-[8px] border border-[#156F48]/30 bg-[#E6F4ED] px-4 py-2 text-right">
                    <div className="text-[11px] font-bold text-[#156F48]">
                      Renda familiar per capita (automática)
                    </div>
                    <div className="font-display text-lg font-extrabold text-[#0F4D32] tabular-nums">
                      {formatCurrency(perCapitaAuto)} / pessoa ({totalPeopleInHome} na casa)
                    </div>
                  </div>
                </div>

                {/* 2A. Work & Income */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label htmlFor="f-emp" className="block text-xs font-bold text-[#0B3B49]">
                      Situação profissional
                    </label>
                    <select
                      id="f-emp"
                      value={draft.employmentStatus}
                      onChange={(e) => {
                        const val = e.target.value as EmploymentStatus;
                        setDraft((p) => ({
                          ...p,
                          employmentStatus: val,
                          workRegime:
                            val === 'DESEMPREGADO'
                              ? 'SEM_VINCULO'
                              : val === 'APOSENTADO'
                                ? 'APOSENTADO'
                                : val === 'INFORMAL'
                                  ? 'INFORMAL'
                                  : val === 'AUTONOMO'
                                    ? 'MEI'
                                    : 'CLT',
                        }));
                      }}
                      className="mt-1 min-h-[44px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
                    >
                      {(Object.keys(EMPLOYMENT_LABELS) as EmploymentStatus[]).map((k) => (
                        <option key={k} value={k}>
                          {EMPLOYMENT_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="f-reg" className="block text-xs font-bold text-[#0B3B49]">
                      Regime de trabalho
                    </label>
                    <select
                      id="f-reg"
                      value={draft.workRegime}
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, workRegime: e.target.value as WorkRegime }))
                      }
                      className="mt-1 min-h-[44px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
                    >
                      {(Object.keys(WORK_REGIME_LABELS) as WorkRegime[]).map((k) => (
                        <option key={k} value={k}>
                          {WORK_REGIME_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="f-sec" className="block text-xs font-bold text-[#0B3B49]">
                      Setor econômico
                    </label>
                    <select
                      id="f-sec"
                      value={draft.economicSector}
                      onChange={(e) => setDraft((p) => ({ ...p, economicSector: e.target.value }))}
                      className="mt-1 min-h-[44px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-xs font-semibold text-[#0B3B49]"
                    >
                      {ECONOMIC_SECTORS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="f-prof" className="block text-xs font-bold text-[#0B3B49]">
                      Profissão / Ocupação
                    </label>
                    <input
                      id="f-prof"
                      type="text"
                      value={draft.profession}
                      onChange={(e) => setDraft((p) => ({ ...p, profession: e.target.value }))}
                      placeholder="Ex.: Operadora de caixa, Eletricista"
                      className="mt-1 min-h-[44px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm text-[#0B3B49]"
                    />
                  </div>

                  <div>
                    <label htmlFor="f-inc" className="block text-xs font-bold text-[#0B3B49]">
                      Salário individual (R$/mês)
                    </label>
                    <input
                      id="f-inc"
                      type="number"
                      min={0}
                      step={50}
                      value={draft.individualIncome}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setDraft((p) => ({
                          ...p,
                          individualIncome: val,
                          householdTotalIncome: Math.max(p.householdTotalIncome, val),
                        }));
                      }}
                      className="mt-1 min-h-[44px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm font-bold text-[#0B3B49]"
                    />
                  </div>

                  <div>
                    <label htmlFor="f-hinc" className="block text-xs font-bold text-[#0B3B49]">
                      Renda familiar total (R$/mês)
                    </label>
                    <input
                      id="f-hinc"
                      type="number"
                      min={0}
                      step={50}
                      value={draft.householdTotalIncome}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          householdTotalIncome: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="mt-1 min-h-[44px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm font-bold text-[#0B3B49]"
                    />
                  </div>
                </div>

                {/* 2B. Structured Self-Declaration: CadÚnico, UBS, CRAS, Public School, Passaporte */}
                <div className="space-y-4 rounded-[12px] border border-[#0B3B49]/20 bg-[#F8FAFB] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="flex items-center gap-2 font-display text-base font-extrabold text-[#0B3B49]">
                        <GraduationCap className="h-5 w-5 text-[#D93829]" />
                        Autodeclaração de redes e serviços públicos acessados
                      </h4>
                      <p className="mt-0.5 text-xs text-[#52646D]">
                        Informe os serviços que sua família utiliza. Esta autodeclaração será
                        cruzada posteriormente com as bases oficiais para validação.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                    {/* CadÚnico */}
                    <div className="rounded-[8px] border border-[#DCE3E8] bg-white p-3.5">
                      <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-extrabold text-[#0B3B49]">
                        <span>Possui cadastro no CadÚnico?</span>
                        <input
                          type="checkbox"
                          checked={draft.selfDeclaration.cadUnicoRegistered}
                          onChange={(e) =>
                            updateDeclaration('cadUnicoRegistered', e.target.checked)
                          }
                          className="h-4 w-4 accent-[#0B3B49]"
                        />
                      </label>
                      {draft.selfDeclaration.cadUnicoRegistered && (
                        <input
                          type="text"
                          value={draft.selfDeclaration.nis ?? ''}
                          onChange={(e) => updateDeclaration('nis', e.target.value)}
                          placeholder="Número do NIS (se souber)"
                          aria-label="Número do NIS no CadÚnico"
                          className="mt-2.5 min-h-[40px] w-full rounded-[6px] border border-[#C4D0D7] px-3 py-1.5 text-xs text-[#0B3B49]"
                        />
                      )}
                    </div>

                    {/* CRAS */}
                    <div className="rounded-[8px] border border-[#DCE3E8] bg-white p-3.5">
                      <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-extrabold text-[#0B3B49]">
                        <span>É atendido em algum CRAS?</span>
                        <input
                          type="checkbox"
                          checked={draft.selfDeclaration.crasRegistered}
                          onChange={(e) => updateDeclaration('crasRegistered', e.target.checked)}
                          className="h-4 w-4 accent-[#0B3B49]"
                        />
                      </label>
                      {draft.selfDeclaration.crasRegistered && (
                        <select
                          aria-label="Qual CRAS"
                          value={draft.selfDeclaration.crasName ?? MARICA_CRAS_UNITS[0].name}
                          onChange={(e) => updateDeclaration('crasName', e.target.value)}
                          className="mt-2.5 min-h-[40px] w-full rounded-[6px] border border-[#C4D0D7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0B3B49]"
                        >
                          {MARICA_CRAS_UNITS.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* UBS / Unidade de Saúde da Família */}
                    <div className="rounded-[8px] border border-[#DCE3E8] bg-white p-3.5">
                      <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-extrabold text-[#0B3B49]">
                        <span>Cadastrado em Unidade de Saúde da Família (UBS)?</span>
                        <input
                          type="checkbox"
                          checked={draft.selfDeclaration.ubsRegistered}
                          onChange={(e) => updateDeclaration('ubsRegistered', e.target.checked)}
                          className="h-4 w-4 accent-[#0B3B49]"
                        />
                      </label>
                      {draft.selfDeclaration.ubsRegistered && (
                        <select
                          aria-label="Qual Unidade de Saúde da Família"
                          value={
                            draft.selfDeclaration.ubsName ?? expandUsfName(MARICA_REAL_USFS[0].name)
                          }
                          onChange={(e) => updateDeclaration('ubsName', e.target.value)}
                          className="mt-2.5 min-h-[40px] w-full rounded-[6px] border border-[#C4D0D7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0B3B49]"
                        >
                          {MARICA_REAL_USFS.map((u) => {
                            const full = expandUsfName(u.name);
                            return (
                              <option key={u.id} value={full}>
                                {full}
                              </option>
                            );
                          })}
                        </select>
                      )}
                    </div>

                    {/* Public School Student */}
                    <div className="rounded-[8px] border border-[#DCE3E8] bg-white p-3.5">
                      <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-extrabold text-[#0B3B49]">
                        <span>Há aluno em escola pública na casa?</span>
                        <input
                          type="checkbox"
                          checked={draft.selfDeclaration.publicSchoolStudent}
                          onChange={(e) =>
                            updateDeclaration('publicSchoolStudent', e.target.checked)
                          }
                          className="h-4 w-4 accent-[#0B3B49]"
                        />
                      </label>
                      {draft.selfDeclaration.publicSchoolStudent && (
                        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <select
                            aria-label="Qual escola pública"
                            value={
                              draft.selfDeclaration.schoolName ?? MARICA_MUNICIPAL_SCHOOLS[0].name
                            }
                            onChange={(e) => updateDeclaration('schoolName', e.target.value)}
                            className="min-h-[40px] w-full rounded-[6px] border border-[#C4D0D7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0B3B49]"
                          >
                            {MARICA_MUNICIPAL_SCHOOLS.map((s) => (
                              <option key={s.id} value={s.name}>
                                {s.name} ({s.neighborhood})
                              </option>
                            ))}
                            <option value="Outra escola pública estadual/municipal">
                              Outra escola pública
                            </option>
                          </select>
                          <select
                            aria-label="Quem estuda na escola pública"
                            value={draft.selfDeclaration.studentScope ?? 'Dependente(s)'}
                            onChange={(e) =>
                              updateDeclaration(
                                'studentScope',
                                e.target.value as PolicySelfDeclaration['studentScope']
                              )
                            }
                            className="min-h-[40px] w-full rounded-[6px] border border-[#C4D0D7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0B3B49]"
                          >
                            <option value="Titular">Titular</option>
                            <option value="Dependente(s)">Dependente(s)</option>
                            <option value="Titular e dependente(s)">Titular e dependente(s)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Passaporte Universitário */}
                    <div className="rounded-[8px] border border-[#DCE3E8] bg-white p-3.5 md:col-span-2">
                      <label className="flex cursor-pointer items-center justify-between gap-2 text-xs font-extrabold text-[#0B3B49]">
                        <span>Beneficiário do Passaporte Universitário de Maricá?</span>
                        <input
                          type="checkbox"
                          checked={draft.selfDeclaration.passaporteUniversitario}
                          onChange={(e) =>
                            updateDeclaration('passaporteUniversitario', e.target.checked)
                          }
                          className="h-4 w-4 accent-[#0B3B49]"
                        />
                      </label>
                      {draft.selfDeclaration.passaporteUniversitario && (
                        <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          <div>
                            <label
                              htmlFor="f-uni"
                              className="block text-[11px] font-bold text-[#52646D]"
                            >
                              Qual universidade credenciada?
                            </label>
                            <select
                              id="f-uni"
                              value={
                                draft.selfDeclaration.universityName ?? PASSAPORTE_UNIVERSITIES[0]
                              }
                              onChange={(e) => updateDeclaration('universityName', e.target.value)}
                              className="mt-1 min-h-[40px] w-full rounded-[6px] border border-[#C4D0D7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0B3B49]"
                            >
                              {PASSAPORTE_UNIVERSITIES.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label
                              htmlFor="f-course"
                              className="block text-[11px] font-bold text-[#52646D]"
                            >
                              Qual curso de graduação?
                            </label>
                            <select
                              id="f-course"
                              value={draft.selfDeclaration.universityCourse ?? PASSAPORTE_COURSES[0]}
                              onChange={(e) =>
                                updateDeclaration('universityCourse', e.target.value)
                              }
                              className="mt-1 min-h-[40px] w-full rounded-[6px] border border-[#C4D0D7] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0B3B49]"
                            >
                              {PASSAPORTE_COURSES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2C. AI Assistant to Pull Matching Government Policies + Full Checklist */}
                <div className="rounded-[12px] border border-[#0E7490]/35 bg-[#EDF7FA] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="flex items-center gap-2 font-display text-base font-extrabold text-[#0B3B49]">
                        <Cpu className="h-5 w-5 text-[#0E7490]" />
                        Assistente de IA: puxar lista de políticas do governo
                      </h4>
                      <p className="mt-0.5 text-xs text-[#3B5560]">
                        A IA analisa seu perfil preenchido (ou uma frase sua) para listar os
                        programas municipais e federais compatíveis para você marcar.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Opcional: ex. pago aluguel, tenho filho na escola e uso Vermelhinho"
                      aria-label="Descreva sua situação para o assistente de IA sugerir políticas"
                      className="min-h-[44px] flex-1 rounded-[8px] border border-[#0E7490]/35 bg-white px-3.5 py-2 text-xs text-[#0B3B49]"
                    />
                    <button
                      type="button"
                      onClick={runAiPolicyAssistant}
                      disabled={aiLoading}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[8px] bg-[#0B3B49] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#072933] cursor-pointer"
                    >
                      {aiLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Cpu className="h-4 w-4 text-[#E89B0C]" />
                      )}
                      {aiLoading ? 'Analisando perfil...' : 'Puxar lista com IA'}
                    </button>
                  </div>

                  {aiSuggestions && (
                    <div className="mt-3 rounded-[8px] border border-[#0E7490]/30 bg-white p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-[#0B3B49]">
                          {aiSuggestions.length} políticas sugeridas pela IA para o seu perfil
                        </span>
                      </div>
                      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {aiSuggestions.map((s) => (
                          <div
                            key={s.policy.id}
                            className="rounded-[6px] bg-[#F8FAFB] px-3 py-2 text-xs"
                          >
                            <strong className="text-[#0B3B49]">{s.policy.name}</strong>
                            <p className="mt-0.5 text-[11px] text-[#52646D]">{s.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full Self-Declaration Policy Checklist */}
                  <div className="mt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-extrabold text-[#0B3B49]">
                        Políticas que você acessa (autodeclaração —{' '}
                        {draft.selfDeclaration.declaredPolicies.length} marcadas)
                      </span>
                      <span className="font-extrabold text-[#156F48] tabular-nums">
                        Benefícios financeiros: {formatCurrency(benefitsTotal)}/mês
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {GOVERNMENT_POLICIES_CATALOG.map((pol) => {
                        const checked = draft.selfDeclaration.declaredPolicies.includes(pol.name);
                        const progItem = draft.socialPrograms.find((p) => p.name === pol.name);
                        return (
                          <div
                            key={pol.id}
                            className={`flex items-center justify-between gap-2 rounded-[8px] border px-3 py-2 text-xs transition-colors ${
                              checked
                                ? 'border-[#0B3B49] bg-white'
                                : 'border-[#DCE3E8] bg-white/70 text-[#52646D]'
                            }`}
                          >
                            <label className="flex flex-1 cursor-pointer items-start gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePolicyDeclaration(pol.name, pol.defaultValue)}
                                className="mt-0.5 h-4 w-4 accent-[#0B3B49]"
                              />
                              <span>
                                <span className="block font-bold text-[#0B3B49]">{pol.name}</span>
                                <span className="text-[10px] text-[#52646D]">{pol.sphere}</span>
                              </span>
                            </label>
                            {checked && pol.defaultValue > 0 && progItem && (
                              <input
                                type="number"
                                min={0}
                                step={10}
                                aria-label={`Valor mensal ${pol.name}`}
                                value={progItem.monthlyValue}
                                onChange={(e) =>
                                  updateProgramValue(pol.name, Number(e.target.value) || 0)
                                }
                                className="w-20 rounded-[5px] border border-[#C4D0D7] px-2 py-1 text-right font-bold text-[#0B3B49]"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#DCE3E8] pt-5">
                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-[8px] border border-[#C4D0D7] px-5 py-2.5 text-sm font-bold text-[#52646D] hover:bg-[#F4F6F8] cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => validateStep(3)}
                    className="inline-flex min-h-[50px] items-center gap-2 rounded-[8px] bg-[#D93829] px-7 py-3 text-sm font-extrabold text-white hover:bg-[#B52B1E] cursor-pointer sm:text-base"
                  >
                    Continuar para Moradia e GPS
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* MODULE 3: HOUSING & REAL GPS */}
            {step === 3 && (
              <div key="mod-3" className="anim-step space-y-5">
                <h3 data-step-heading tabIndex={-1} className="flex items-center gap-2 font-display text-xl font-extrabold text-[#0B3B49]">
                  <Home className="h-5 w-5 text-[#0E7490]" />
                  3. Dados habitacionais e georreferenciamento
                </h3>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="f-addr" className="block text-xs font-bold text-[#0B3B49]">
                        Endereço residencial completo
                      </label>
                      <input
                        id="f-addr"
                        type="text"
                        value={draft.address}
                        onChange={(e) => setDraft((p) => ({ ...p, address: e.target.value }))}
                        placeholder="Rua, número, lote ou quadra"
                        className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm text-[#0B3B49]"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="f-bairro" className="block text-xs font-bold text-[#0B3B49]">
                          Bairro oficial (50 bairros)
                        </label>
                        <select
                          id="f-bairro"
                          value={draft.neighborhood}
                          onChange={(e) => handleNeighborhoodChange(e.target.value)}
                          className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm font-semibold text-[#0B3B49]"
                        >
                          <option value="">Selecione seu bairro</option>
                          {OFFICIAL_BAIRROS.map((b) => (
                            <option key={b.name} value={b.name}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="f-cep" className="block text-xs font-bold text-[#0B3B49]">
                          CEP ({DISTRICT_BY_ID[draft.districtId].shortName})
                        </label>
                        <input
                          id="f-cep"
                          type="text"
                          value={draft.cep}
                          onChange={(e) => setDraft((p) => ({ ...p, cep: e.target.value }))}
                          placeholder="24900-000"
                          className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm text-[#0B3B49]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label htmlFor="f-housing" className="block text-xs font-bold text-[#0B3B49]">
                          Tipo de moradia
                        </label>
                        <select
                          id="f-housing"
                          value={draft.housingType}
                          onChange={(e) => {
                            const val = e.target.value as HousingType | '';
                            setDraft((p) => ({
                              ...p,
                              housingType: val,
                              rentValue: val === 'ALUGADA' ? p.rentValue : 0,
                            }));
                          }}
                          className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm text-[#0B3B49]"
                        >
                          <option value="">Selecione</option>
                          <option value="PROPRIA">Moradia própria</option>
                          <option value="ALUGADA">Aluguel</option>
                          <option value="TEMPORARIA">Moradia temporária</option>
                        </select>
                      </div>

                      {draft.housingType === 'ALUGADA' && (
                        <div>
                          <label htmlFor="f-rent" className="block text-xs font-bold text-[#0B3B49]">
                            Valor do aluguel (R$/mês)
                          </label>
                          <input
                            id="f-rent"
                            type="number"
                            min={0}
                            step={50}
                            value={draft.rentValue}
                            onChange={(e) =>
                              setDraft((p) => ({
                                ...p,
                                rentValue: Math.max(0, Number(e.target.value) || 0),
                              }))
                            }
                            className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm font-bold text-[#0B3B49]"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-bold">
                        O imóvel é casa ou apartamento?
                        <select value={draft.dwellingType} className={fieldClass}
                          onChange={(event) => setDraft((current) => ({ ...current, dwellingType: event.target.value as typeof draft.dwellingType }))}>
                          <option value="">Selecione</option>
                          <option value="CASA">Casa</option>
                          <option value="APARTAMENTO">Apartamento</option>
                        </select>
                      </label>
                      <label className="text-sm font-bold">
                        Quem é o titular do imóvel ou aluguel?
                        <select value={draft.dwellingHolder.kind} className={fieldClass}
                          onChange={(event) => setDraft((current) => ({
                            ...current, dwellingHolder: event.target.value === 'SELF'
                              ? { kind: 'SELF' }
                              : { kind: 'OTHER', name: '', cpf: '', relationship: '' },
                          }))}>
                          <option value="SELF">Eu mesmo</option>
                          <option value="OTHER">Outra pessoa</option>
                        </select>
                      </label>
                    </div>
                    {draft.dwellingHolder.kind === 'SELF' ? (
                      <p className="text-sm text-[#52646D]"><strong>Titular do imóvel:</strong> {draft.fullName} · CPF {draft.cpf}</p>
                    ) : (
                      <div className="citizen-appear grid gap-3 sm:grid-cols-3">
                        {([['name', 'Nome do titular'], ['cpf', 'CPF do titular'], ['relationship', 'Vínculo com você']] as const).map(([key, label]) => (
                          <label key={key} className="text-sm font-bold">
                            {label}
                            <input className={fieldClass} value={draft.dwellingHolder.kind === 'OTHER' ? draft.dwellingHolder[key] : ''}
                              inputMode={key === 'cpf' ? 'numeric' : undefined}
                              onChange={(event) => {
                                const value = key === 'cpf' ? formatCpfInput(event.target.value) : event.target.value;
                                setDraft((current) => current.dwellingHolder.kind === 'OTHER'
                                  ? { ...current, dwellingHolder: { ...current.dwellingHolder, [key]: value } } : current);
                              }} />
                          </label>
                        ))}
                      </div>
                    )}
                    {draft.housingType === 'ALUGADA' && (
                      <label className="citizen-appear block text-sm font-bold">
                        Contrato de aluguel (PDF de até 2 MB)
                        <input type="file" accept=".pdf,application/pdf" className={fieldClass}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file && (!/\.pdf$/i.test(file.name) || file.size > CONTRACT_LIMIT)) {
                              event.target.value = '';
                              showFormError('Escolha um arquivo PDF de até 2 MB.');
                              return;
                            }
                            setContractFile(file ?? null);
                            setFormError(null);
                          }} />
                        {account?.profile.rentalContractName && !contractFile &&
                          <span className="mt-1 block text-xs font-normal">Já anexado: {account.profile.rentalContractName}</span>}
                      </label>
                    )}

                    <div>
                      <label htmlFor="f-workb" className="block text-xs font-bold text-[#0B3B49]">
                        Bairro do local de trabalho (deslocamento)
                      </label>
                      <select
                        id="f-workb"
                        value={draft.workLocationBairro}
                        onChange={(e) => handleWorkBairroChange(e.target.value)}
                        className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm text-[#0B3B49]"
                      >
                        <option value="">Não se aplica / Trabalho em casa</option>
                        {OFFICIAL_BAIRROS.map((b) => (
                          <option key={b.name} value={b.name}>
                            {b.name} ({DISTRICT_BY_ID[b.districtId].shortName})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Real GPS Box */}
                  <div className="flex flex-col justify-between rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-4">
                    <div>
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-display text-sm font-extrabold text-[#0B3B49]">
                          <HomeGeofenceIcon />
                          Georreferenciamento
                        </span>
                        <span className="font-code text-[11px] font-semibold text-[#52646D]">
                          {draft.coords[0].toFixed(4)}, {draft.coords[1].toFixed(4)}
                        </span>
                      </div>

                      <GeofenceMiniMap
                        homeCoords={draft.coords}
                        captureCoords={gpsCapturedCoords}
                        accuracyMeters={gpsAccuracy}
                        isWithinRadius
                      />

                      {gpsModeText && (
                        <div className="mt-2.5 rounded-[6px] bg-[#E6F4ED] px-3 py-2 text-xs font-semibold text-[#156F48]">
                          {gpsModeText} confirmado nas coordenadas do mapa.
                        </div>
                      )}

                      {gpsNotice && (
                        <div
                          role="alert"
                          className="mt-2.5 flex items-start gap-2 rounded-[6px] border border-[#E89B0C] bg-[#FEF3DC] px-3 py-2 text-xs text-[#6E4400]"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#B4690E]" />
                          <span>{gpsNotice}</span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={requestRealLocation}
                      disabled={loadingGps}
                      className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#0B3B49] px-4 py-3 text-sm font-extrabold text-white transition-all hover:bg-[#072933] active:scale-[0.98] disabled:opacity-75 cursor-pointer"
                    >
                      {loadingGps ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Crosshair className="h-4 w-4 text-[#E89B0C]" />
                      )}
                      {loadingGps
                        ? 'Obtendo sinal de GPS...'
                        : gpsCapturedCoords
                          ? 'Atualizar minha localização'
                          : 'Usar minha localização'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#DCE3E8] pt-5">
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-[8px] border border-[#C4D0D7] px-5 py-2.5 text-sm font-bold text-[#52646D] hover:bg-[#F4F6F8] cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => validateStep(4)}
                    className="inline-flex min-h-[50px] items-center gap-2 rounded-[8px] bg-[#D93829] px-7 py-3 text-sm font-extrabold text-white hover:bg-[#B52B1E] cursor-pointer sm:text-base"
                  >
                    Continuar para históricos
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div key="mod-4" className="anim-step space-y-5">
                <h3 data-step-heading tabIndex={-1} className="font-display text-xl font-extrabold text-[#0B3B49]">
                  4. Histórico de empregos e de formação
                </h3>
                <p className="text-sm text-[#52646D]">Você pode informar experiências de trabalho e estudos agora ou acrescentá-los depois na Área do Munícipe.</p>
                <CitizenHistoryFields title="Histórico de empregos" records={draft.employmentHistory}
                  emptyRecord={{ employer: '', role: '', startDate: '', endDate: '' }}
                  nameFields={[{ key: 'employer', label: 'Empregador' }, { key: 'role', label: 'Cargo ou função' }]}
                  onChange={(employmentHistory) => setDraft((current) => ({ ...current, employmentHistory }))} />
                <CitizenHistoryFields title="Histórico acadêmico / escolar" records={draft.academicHistory}
                  emptyRecord={{ institution: '', course: '', startDate: '', endDate: '' }}
                  nameFields={[{ key: 'institution', label: 'Escola ou instituição' }, { key: 'course', label: 'Curso ou série' }]}
                  onChange={(academicHistory) => setDraft((current) => ({ ...current, academicHistory }))} />
                {!account && identity.available && <IdentityCheck cpf={draft.cpf} verified={verified} onVerified={setVerified} />}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DCE3E8] pt-5">
                  <button type="button" onClick={() => goToStep(3)} disabled={busy}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C4D0D7] px-4 text-sm font-bold text-[#0B3B49]">
                    <ArrowLeft aria-hidden="true" className="size-4" /> Voltar
                  </button>
                  <button type="button" onClick={() => void handleSubmitAll()} disabled={busy}
                    className="citizen-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-5 text-sm font-bold disabled:opacity-60">
                    {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
                    {busy ? 'Salvando…' : account ? 'Salvar alterações' : 'Criar cadastro'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
