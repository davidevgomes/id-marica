import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Camera,
  ChevronRight,
  Cpu,
  Crosshair,
  FileText,
  GraduationCap,
  History,
  Home,
  Loader2,
  MapPin,
  Paperclip,
  Plus,
  ScanFace,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  WifiOff,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useIntegra } from '../context/IntegraContext';
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
  formatDateBr,
  getRegistrationStatus,
  HOUSING_LABELS,
  STATUS_LABELS,
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
import {
  BiometricFrameGraphic,
  FacialBadgeIcon,
  HomeGeofenceIcon,
  VerifiedSealGraphic,
} from './CivicIcons';
import { GeofenceMiniMap } from './GeofenceMiniMap';

type FormStep = 1 | 2 | 3 | 4 | 5;

const MODULES: { n: 1 | 2 | 3 | 4; title: string; subtitle: string }[] = [
  { n: 1, title: 'Dados e moradores', subtitle: 'CPF do titular e da casa' },
  { n: 2, title: 'Renda e políticas', subtitle: 'Trabalho, IA e autodeclaração' },
  { n: 3, title: 'Moradia e GPS', subtitle: 'Bairro, aluguel e mapa' },
  { n: 4, title: 'Documentos e envio', subtitle: 'Anexos, biometria e histórico' },
];

function formatCpfInput(value: string): string {
  if (/[a-zA-Z]/.test(value)) return value;
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function defaultDeclaration(): PolicySelfDeclaration {
  return {
    cadUnicoRegistered: true,
    nis: '',
    ubsRegistered: true,
    ubsName: expandUsfName(MARICA_REAL_USFS[0].name),
    crasRegistered: true,
    crasName: MARICA_CRAS_UNITS[0].name,
    publicSchoolStudent: false,
    schoolName: MARICA_MUNICIPAL_SCHOOLS[0].name,
    studentScope: 'Dependente(s)',
    passaporteUniversitario: false,
    universityName: PASSAPORTE_UNIVERSITIES[0],
    universityCourse: PASSAPORTE_COURSES[0],
    declaredPolicies: ['Renda Básica de Cidadania (Mumbuca)'],
    crossCheckStatus: 'AGUARDANDO_CRUZAMENTO',
    crossCheckNotes: 'Autodeclaração aguardando cruzamento automático com bases oficiais.',
  };
}

function createEmptyDraft() {
  const defaultBairro = OFFICIAL_BAIRROS.find((b) => b.name === 'Barroco') ?? OFFICIAL_BAIRROS[0];
  return {
    id: undefined as string | undefined,
    cpf: '',
    fullName: '',
    birthDate: '1990-05-15',
    gender: 'Feminino' as BeneficiaryRecord['gender'],
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
    employmentStatus: 'EMPREGADO' as EmploymentStatus,
    workRegime: 'CLT' as WorkRegime,
    employerName: '',
    economicSector: 'Comércio',
    individualIncome: 1518,
    householdTotalIncome: 1518,
    incomeContributorsCount: 1,
    otherIncomeSources: 0,
    socialPrograms: [
      { name: 'Renda Básica de Cidadania (Mumbuca)', monthlyValue: 460 },
    ] as SocialProgramBenefit[],
    address: '',
    neighborhood: defaultBairro.name,
    districtId: defaultBairro.districtId as DistrictId,
    cep: '24936-000',
    coords: defaultBairro.center as [number, number],
    housingType: 'ALUGADA' as HousingType,
    rentValue: 800,
    workLocationBairro: 'Centro',
    workCoords: [-22.91589, -42.8168] as [number, number] | undefined,
    documents: {
      idDocAttached: false,
      idDocName: undefined,
      residenceProofAttached: false,
      residenceProofName: undefined,
      facialVerified: false,
      facialConsentLgpd: false,
      facialVerifiedAt: undefined,
    } as BeneficiaryRecord['documents'],
    pendingValidation: false,
  };
}

type BeneficiaryDraft = ReturnType<typeof createEmptyDraft>;

function recordToDraft(b: BeneficiaryRecord): BeneficiaryDraft {
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
    documents: { ...b.documents },
    pendingValidation: b.pendingValidation,
  };
}

export function BeneficiaryAppForm() {
  const { beneficiaries, offlineQueue, syncOfflineQueue, upsertBeneficiary } = useIntegra();

  const [entryMode, setEntryMode] = useState<'new' | 'update' | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<FormStep>(1);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupFeedback, setLookupFeedback] = useState<string | null>(null);
  const [loadedRecord, setLoadedRecord] = useState<BeneficiaryRecord | null>(null);
  const [draft, setDraft] = useState<BeneficiaryDraft>(createEmptyDraft);
  const [offlineFieldMode, setOfflineFieldMode] = useState(false);
  const [updateNote, setUpdateNote] = useState('');
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

  // Facial Biometrics camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [analyzingFace, setAnalyzingFace] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<{
    savedId: string;
    queuedOffline: boolean;
    nextDueDate: string;
    perCapita: number;
  } | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const focusInWorkspace = (selector: string) => {
    requestAnimationFrame(() => {
      const target = workspaceRef.current?.querySelector<HTMLElement>(selector) ?? workspaceRef.current;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'start' });
    });
  };

  const goToStep = (targetStep: FormStep) => {
    if (targetStep === step) return;
    if (step === 4) stopCamera();
    setFormError(null);
    setStep(targetStep);
    focusInWorkspace('[data-step-heading]');
  };

  const showFormError = (message: string) => {
    setFormError(message);
    focusInWorkspace('#cadastro-erro');
  };

  const loadBeneficiary = (b: BeneficiaryRecord) => {
    stopCamera();
    setLoadedRecord(b);
    setDraft(recordToDraft(b));
    setLookupInput(b.cpf);
    setLookupFeedback(null);
    setFormError(null);
    setAiSuggestions(null);
    setGpsCapturedCoords(null);
    setGpsAccuracy(null);
    setGpsNotice(null);
    setGpsModeText('');
    setCapturedPhoto(null);
    setStep(1);
    focusInWorkspace('[data-step-heading]');
  };

  const startNewRegistration = () => {
    stopCamera();
    setLoadedRecord(null);
    setDraft(createEmptyDraft());
    setLookupInput('');
    setLookupFeedback(null);
    setFormError(null);
    setUpdateNote('');
    setAiSuggestions(null);
    setGpsCapturedCoords(null);
    setGpsAccuracy(null);
    setGpsNotice(null);
    setGpsModeText('');
    setCapturedPhoto(null);
    setReceipt(null);
    setStep(1);
  };

  const openRegistration = (mode: 'new' | 'update') => {
    if (mode !== entryMode || step === 5) {
      startNewRegistration();
      setEntryMode(mode);
    }
    focusInWorkspace(mode === 'update' ? '#buscar-cpf' : '[data-step-heading]');
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = lookupInput.replace(/\D/g, '');
    if (digits.length !== 11) {
      setLookupFeedback('Digite os 11 números do CPF.');
      return;
    }
    const found = beneficiaries.find(
      (b) => b.cpf.replace(/\D/g, '') === digits ||
        (b.householdMembers ?? []).some((m) => m.cpf.replace(/\D/g, '') === digits)
    );
    if (found) {
      loadBeneficiary(found);
      setLookupFeedback(`Cadastro localizado. Confira os dados de ${found.fullName} e atualize o que mudou.`);
    } else {
      setLookupFeedback('CPF não localizado. Confira o número ou escolha Fazer meu primeiro cadastro.');
    }
  };

  // Household CPF-linked member handlers
  const addHouseholdMember = () => {
    const nextMember: HouseholdMemberLink = {
      id: `M-${Date.now()}`,
      fullName: '',
      cpf: '',
      relationship: 'Filho(a)',
      birthDate: '2014-05-10',
    };
    setDraft((prev) => {
      const members = [...prev.householdMembers, nextMember];
      return {
        ...prev,
        householdMembers: members,
        householdSize: 1 + members.length,
        dependentsCount: Math.max(prev.dependentsCount, members.length),
      };
    });
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
          'Autodeclaração atualizada; pronta para cruzamento automático com as bases oficiais.',
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
          nextPrograms = [...prev.socialPrograms, { name: policyName, monthlyValue: defaultVal }];
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

  const applyAllAiSuggestions = () => {
    if (!aiSuggestions) return;
    setDraft((prev) => {
      const declaredSet = new Set(prev.selfDeclaration.declaredPolicies);
      const programs = [...prev.socialPrograms];
      let hasPass = prev.selfDeclaration.passaporteUniversitario;
      for (const s of aiSuggestions) {
        declaredSet.add(s.policy.name);
        if (s.policy.defaultValue > 0 && !programs.some((p) => p.name === s.policy.name)) {
          programs.push({ name: s.policy.name, monthlyValue: s.policy.defaultValue });
        }
        if (s.policy.name === 'Passaporte Universitário') hasPass = true;
      }
      return {
        ...prev,
        socialPrograms: programs,
        selfDeclaration: {
          ...prev.selfDeclaration,
          declaredPolicies: Array.from(declaredSet),
          passaporteUniversitario: hasPass,
          crossCheckStatus: 'AGUARDANDO_CRUZAMENTO',
        },
      };
    });
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

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraError('Câmera indisponível ou sem permissão neste aparelho.');
    }
  };

  const captureWebcamPhoto = () => {
    setAnalyzingFace(true);
    let dataUrl: string | null = null;
    if (videoRef.current && videoRef.current.videoWidth > 0) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0);
        dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      }
    }
    setTimeout(() => {
      stopCamera();
      setCapturedPhoto(dataUrl);
      setDraft((prev) => ({
        ...prev,
        documents: {
          ...prev.documents,
          facialVerified: true,
          facialConsentLgpd: true,
          facialVerifiedAt: '2026-11-24',
        },
      }));
      setAnalyzingFace(false);
    }, 650);
  };

  const validateStep = (targetStep: FormStep) => {
    if (step === 1 && targetStep > 1) {
      if (draft.fullName.trim().length < 4) {
        showFormError('Informe o nome completo do titular.');
        return;
      }
      if (draft.cpf.replace(/\D/g, '').length < 11) {
        showFormError('Informe um CPF válido (11 dígitos) para o titular.');
        return;
      }
      for (let i = 0; i < draft.householdMembers.length; i++) {
        const m = draft.householdMembers[i];
        if (m.fullName.trim().length < 3 || m.cpf.replace(/\D/g, '').length < 11) {
          showFormError(
            `Preencha nome e CPF completo (11 dígitos) da pessoa ${i + 1} vinculada na casa.`
          );
          return;
        }
      }
    }
    if (step === 3 && targetStep > 3) {
      if (draft.address.trim().length < 5) {
        showFormError('Informe o endereço residencial completo.');
        return;
      }
    }
    goToStep(targetStep);
  };

  const handleSubmitAll = () => {
    const result = upsertBeneficiary(
      {
        ...draft,
        householdSize: totalPeopleInHome,
        householdTotalIncome: Math.max(draft.householdTotalIncome, draft.individualIncome),
        pendingValidation: !draft.documents.idDocAttached || !draft.documents.residenceProofAttached,
      },
      {
        offlineMode: offlineFieldMode,
        updatedBy: offlineFieldMode ? 'Equipe de Campo (Offline)' : 'Aplicativo ID Maricá',
        note:
          updateNote.trim() ||
          (loadedRecord
            ? 'Atualização trimestral com autodeclaração de políticas e CPFs da casa preservados.'
            : 'Novo cadastro individual vinculado ao CPF no ID Maricá.'),
      }
    );
    setReceipt({ ...result, perCapita: perCapitaAuto });
    goToStep(5);
  };

  const quickExamples = ['BEN-001', 'BEN-003', 'BEN-011']
    .map((id) => beneficiaries.find((b) => b.id === id))
    .filter((b): b is BeneficiaryRecord => Boolean(b));

  const currentStatus = loadedRecord ? getRegistrationStatus(loadedRecord) : null;

  const canEdit = entryMode === 'new' || Boolean(loadedRecord);

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-9 sm:px-6 sm:pb-13">
      <div className="grid gap-2 rounded-2xl border border-[#DCE3E8] bg-white p-2.5 shadow-[0_16px_36px_-22px_rgba(7,41,51,0.42)] md:grid-cols-[1.1fr_1fr_1fr]">
        {([
          { mode: 'update', icon: FileText, label: 'Atualizar meu cadastro', description: 'Use o CPF cadastrado.' },
          { mode: 'new', icon: UserPlus, label: 'Fazer meu primeiro cadastro', description: 'Cadastre sua família.' },
        ] as const).map(({ mode, icon: Icon, label, description }) => (
          <button
            key={mode}
            type="button"
            aria-pressed={entryMode === mode}
            aria-controls="cadastro-formulario"
            aria-labelledby={`cadastro-${mode}-acao`}
            aria-describedby={`cadastro-${mode}-detalhe`}
            onClick={() => openRegistration(mode)}
            className={`citizen-service-card cursor-pointer text-left ${mode === 'update' ? 'citizen-service-primary' : ''}`}
          >
            <span className="citizen-service-icon"><Icon aria-hidden="true" className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span id={`cadastro-${mode}-acao`} className="block font-display text-base leading-tight font-extrabold sm:text-lg">{label}</span>
              <span id={`cadastro-${mode}-detalhe`} className="citizen-service-detail mt-1 block text-sm leading-snug">{description}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
          </button>
        ))}
        <a href="#apoio" className="citizen-service-card" aria-labelledby="cadastro-ajuda-acao" aria-describedby="cadastro-ajuda-detalhe">
          <span className="citizen-service-icon citizen-service-icon-help"><MapPin aria-hidden="true" className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span id="cadastro-ajuda-acao" className="block font-display text-base leading-tight font-extrabold sm:text-lg">Encontrar atendimento</span>
            <span id="cadastro-ajuda-detalhe" className="citizen-service-detail mt-1 block text-sm leading-snug">Veja os locais no mapa.</span>
          </span>
          <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
        </a>
      </div>

      <div id="cadastro-formulario" ref={workspaceRef} tabIndex={-1} hidden={!entryMode} className="mt-5 scroll-mt-4 rounded-xl">
        <p className="mb-4 text-sm font-semibold text-[#405661]">Use dados fictícios para testar. O cadastro fica salvo neste navegador.</p>
        {canEdit && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setOfflineFieldMode((v) => !v)}
            aria-pressed={offlineFieldMode}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-[8px] border px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
              offlineFieldMode
                ? 'border-[#E89B0C] bg-[#FEF3DC] text-[#7A4B00]'
                : 'border-[#DCE3E8] bg-white text-[#52646D] hover:border-[#0B3B49]/40 hover:text-[#0B3B49]'
            }`}
          >
            <WifiOff className="h-4 w-4" />
            {offlineFieldMode ? 'Modo campo offline ativo' : 'Coleta offline (campo)'}
          </button>

          {offlineQueue.length > 0 && (
            <button
              type="button"
              onClick={syncOfflineQueue}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[8px] bg-[#156F48] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#115B3B] cursor-pointer"
            >
              Sincronizar fila ({offlineQueue.length})
            </button>
          )}

          {step <= 4 && (
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
          )}
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
                        disabled={!isDone || step === 5}
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
                Nesta demonstração, o preenchimento é feito com dados de exemplo.
              </p>
            </div>
          </aside>}

          {/* Right Workspace */}
          <div className="p-5 sm:p-8">
            {/* CPF Lookup Toolbar */}
            {step === 1 && entryMode === 'update' && (
              <div className="citizen-appear rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-4 sm:p-5">
                <label htmlFor="buscar-cpf" className="mb-2 block font-display text-lg font-bold text-[#0B3B49]">Qual é o CPF cadastrado?</label>
                <form onSubmit={handleLookup} className="flex flex-col gap-2.5 sm:flex-row">
                  <div className="relative flex-1">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52646D]"
                    />
                    <input
                      id="buscar-cpf"
                      type="text"
                      inputMode="numeric"
                      value={lookupInput}
                      onChange={(e) => setLookupInput(formatCpfInput(e.target.value))}
                      placeholder="000.000.000-00"
                      className="min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-[#0B3B49]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[8px] bg-[#0B3B49] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#072933] cursor-pointer"
                  >
                    Buscar cadastro
                  </button>
                </form>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-[#52646D]">Exemplos:</span>
                    {quickExamples.map((ex) => {
                      const st = getRegistrationStatus(ex);
                      const active = loadedRecord?.id === ex.id;
                      return (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => loadBeneficiary(ex)}
                          className={`rounded-[6px] px-2.5 py-1 font-bold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#0B3B49] text-white'
                              : 'border border-[#DCE3E8] bg-white text-[#0B3B49] hover:bg-[#EDF4F6]'
                          }`}
                        >
                          {ex.fullName.split(' ')[0]} (
                          {st === 'VENCIDO' ? 'Vencido' : ex.selfDeclaration?.passaporteUniversitario ? 'Passaporte' : 'Atualizado'})
                        </button>
                      );
                    })}
                  </div>

                  {loadedRecord && currentStatus && (
                    <span
                      className={`rounded-[5px] px-2.5 py-1 font-bold ${
                        currentStatus === 'ATUALIZADO'
                          ? 'bg-[#E6F4ED] text-[#156F48]'
                          : currentStatus === 'VENCIDO'
                            ? 'bg-[#FDE8E6] text-[#B52B1E]'
                            : 'bg-[#FEF3DC] text-[#8A5600]'
                      }`}
                    >
                      {STATUS_LABELS[currentStatus]} (vence {formatDateBr(loadedRecord.nextDueDate)})
                    </span>
                  )}
                </div>

                {lookupFeedback && (
                  <p role="status" className="citizen-appear mt-2 text-sm font-bold text-[#0E7490]">{lookupFeedback}</p>
                )}
              </div>
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
                      onChange={(e) =>
                        setDraft((p) => ({ ...p, cpf: formatCpfInput(e.target.value) }))
                      }
                      placeholder="000.000.000-00"
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm font-semibold text-[#0B3B49]"
                    />
                  </div>

                  <div>
                    <label htmlFor="f-birth" className="block text-xs font-bold text-[#0B3B49]">
                      Data de nascimento{' '}
                      <span className="font-semibold text-[#0E7490]">({age} anos)</span>
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
                      E-mail para avisos de atualização
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

                {/* CPF-Linked Household Members Section */}
                <div className="rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="flex items-center gap-2 font-display text-base font-extrabold text-[#0B3B49]">
                        <Users className="h-4 w-4 text-[#0E7490]" />
                        Pessoas que moram na casa (vinculadas por CPF)
                      </h4>
                      <p className="mt-0.5 text-xs text-[#52646D]">
                        Cada integrante do domicílio deve ter seu cadastro vinculado ao próprio CPF.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addHouseholdMember}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-[8px] bg-[#0B3B49] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#072933] cursor-pointer"
                    >
                      <Plus className="h-4 w-4 text-[#E89B0C]" />
                      Adicionar pessoa (CPF)
                    </button>
                  </div>

                  {draft.householdMembers.length === 0 ? (
                    <div className="mt-3 rounded-[8px] border border-dashed border-[#C4D0D7] bg-white p-4 text-center text-xs text-[#52646D]">
                      Apenas o titular reside no imóvel. Caso morem outras pessoas, clique em{' '}
                      <strong>Adicionar pessoa (CPF)</strong>.
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
                        <button
                          type="button"
                          onClick={applyAllAiSuggestions}
                          className="rounded-[6px] bg-[#156F48] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#115B3B] cursor-pointer"
                        >
                          Marcar todas sugeridas
                        </button>
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
                            const val = e.target.value as HousingType;
                            setDraft((p) => ({
                              ...p,
                              housingType: val,
                              rentValue: val === 'ALUGADA' ? p.rentValue || 750 : 0,
                            }));
                          }}
                          className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm text-[#0B3B49]"
                        >
                          {(Object.keys(HOUSING_LABELS) as HousingType[]).map((k) => (
                            <option key={k} value={k}>
                              {HOUSING_LABELS[k]}
                            </option>
                          ))}
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
                    Continuar para Documentos
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* MODULE 4: DOCUMENTS, BIOMETRICS & HISTORY */}
            {step === 4 && (
              <div key="mod-4" className="anim-step space-y-5">
                <h3 data-step-heading tabIndex={-1} className="flex items-center gap-2 font-display text-xl font-extrabold text-[#0B3B49]">
                  <FileText className="h-5 w-5 text-[#0E7490]" />
                  4. Documentação, identificação e envio
                </h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="space-y-3 rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-4">
                      <div className="text-sm font-extrabold text-[#0B3B49]">Anexos do cadastro</div>

                      <label className="flex min-h-[54px] cursor-pointer items-center justify-between gap-3 rounded-[8px] border border-dashed border-[#0B3B49]/35 bg-white px-3.5 py-2.5 text-xs hover:bg-[#EDF4F6]">
                        <span className="flex items-center gap-2 font-semibold text-[#0B3B49]">
                          <Paperclip className="h-4 w-4 text-[#0E7490]" />
                          {draft.documents.idDocName || 'Anexar documento de identificação (RG/CNH)'}
                        </span>
                        <span className="shrink-0 rounded-[4px] bg-[#EEF3F6] px-2 py-1 font-bold text-[#0B3B49]">
                          {draft.documents.idDocAttached ? 'Anexado' : 'Escolher'}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setDraft((p) => ({
                              ...p,
                              documents: { ...p.documents, idDocAttached: true, idDocName: f.name },
                            }));
                          }}
                        />
                      </label>

                      <label className="flex min-h-[54px] cursor-pointer items-center justify-between gap-3 rounded-[8px] border border-dashed border-[#0B3B49]/35 bg-white px-3.5 py-2.5 text-xs hover:bg-[#EDF4F6]">
                        <span className="flex items-center gap-2 font-semibold text-[#0B3B49]">
                          <Paperclip className="h-4 w-4 text-[#0E7490]" />
                          {draft.documents.residenceProofName ||
                            'Anexar comprovante de residência atual'}
                        </span>
                        <span className="shrink-0 rounded-[4px] bg-[#EEF3F6] px-2 py-1 font-bold text-[#0B3B49]">
                          {draft.documents.residenceProofAttached ? 'Anexado' : 'Escolher'}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="sr-only"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            setDraft((p) => ({
                              ...p,
                              documents: {
                                ...p.documents,
                                residenceProofAttached: true,
                                residenceProofName: f.name,
                              },
                            }));
                          }}
                        />
                      </label>
                    </div>

                    <div>
                      <label htmlFor="f-note" className="block text-xs font-bold text-[#0B3B49]">
                        Observação sobre mudanças neste trimestre (opcional)
                      </label>
                      <input
                        id="f-note"
                        type="text"
                        value={updateNote}
                        onChange={(e) => setUpdateNote(e.target.value)}
                        placeholder="Ex.: Novo emprego CLT, matrícula na escola ou Passaporte"
                        className="mt-1 min-h-[44px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm text-[#0B3B49]"
                      />
                    </div>

                    {loadedRecord && loadedRecord.history.length > 0 && (
                      <div className="rounded-[10px] border border-[#DCE3E8] bg-white p-4">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0B3B49]">
                          <History className="h-4 w-4 text-[#0E7490]" />
                          Histórico preservado ({loadedRecord.history.length} ciclos)
                        </div>
                        <div className="mt-2.5 space-y-2 text-xs">
                          {loadedRecord.history.slice(-3).map((h) => (
                            <div
                              key={h.id}
                              className="flex items-center justify-between gap-2 rounded-[6px] bg-[#F8FAFB] px-3 py-2"
                            >
                              <div>
                                <strong className="text-[#0B3B49]">{h.cycleLabel}</strong>{' '}
                                <span className="text-[#52646D]">
                                  {WORK_REGIME_LABELS[h.workRegime]}
                                </span>
                              </div>
                              <span className="font-bold text-[#156F48] tabular-nums">
                                {formatCurrency(h.householdTotalIncome)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Optional Biometrics (LGPD) */}
                  <div className="flex flex-col justify-between rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-4">
                    <div>
                      <div className="mb-2.5 flex items-center justify-between">
                        <span className="flex items-center gap-2 font-display text-sm font-extrabold text-[#0B3B49]">
                          <FacialBadgeIcon />
                          Verificação facial (LGPD)
                        </span>
                        {draft.documents.facialVerified && (
                          <span className="rounded-[4px] bg-[#E6F4ED] px-2 py-0.5 text-[11px] font-bold text-[#156F48]">
                            Confirmada
                          </span>
                        )}
                      </div>

                      <p className="mb-3 text-xs leading-relaxed text-[#52646D]">
                        Dado pessoal sensível (Art. 5º, II da LGPD): opcional para quem preferir
                        conferência presencial no CRAS ou na Unidade de Saúde da Família.
                      </p>

                      {cameraActive ? (
                        <div className="relative aspect-[4/3] overflow-hidden rounded-[8px] bg-[#072933]">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full scale-x-[-1] object-cover"
                          />
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="relative h-36 w-28 rounded-full border-2 border-dashed border-[#E89B0C]">
                              <div className="anim-scanline absolute inset-x-2 top-1/2 h-0.5 bg-[#E89B0C]" />
                            </div>
                          </div>
                        </div>
                      ) : draft.documents.facialVerified ? (
                        <div className="flex h-44 flex-col items-center justify-center rounded-[8px] border border-[#156F48]/30 bg-[#E6F4ED] p-4 text-center">
                          {capturedPhoto ? (
                            <img
                              src={capturedPhoto}
                              alt="Foto facial verificada"
                              className="h-16 w-16 rounded-full border-2 border-[#156F48] object-cover"
                            />
                          ) : (
                            <ShieldCheck className="h-10 w-10 text-[#156F48]" />
                          )}
                          <div className="mt-2 font-display text-sm font-extrabold text-[#0F4D32]">
                            Biometria verificada com consentimento LGPD
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-44 flex-col items-center justify-center rounded-[8px] border border-[#DCE3E8] bg-white p-4 text-center">
                          <BiometricFrameGraphic scanning={analyzingFace} />
                          <p className="mt-2 text-xs font-semibold text-[#52646D]">
                            Autorize o termo abaixo para ativar a câmera frontal
                          </p>
                        </div>
                      )}

                      {cameraError && (
                        <p className="mt-2 text-xs font-semibold text-[#B52B1E]">{cameraError}</p>
                      )}

                      <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-[#11222B]">
                        <input
                          type="checkbox"
                          checked={draft.documents.facialConsentLgpd}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              documents: { ...p.documents, facialConsentLgpd: e.target.checked },
                            }))
                          }
                          className="mt-0.5 h-4 w-4 accent-[#0B3B49]"
                        />
                        <span>
                          Autorizo a verificação facial exclusivamente para confirmação de
                          identidade cadastral (LGPD).
                        </span>
                      </label>
                    </div>

                    <div className="mt-3 flex gap-2">
                      {!cameraActive ? (
                        <button
                          type="button"
                          disabled={!draft.documents.facialConsentLgpd}
                          onClick={startCamera}
                          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#0B3B49] px-3 py-2 text-xs font-extrabold text-white hover:bg-[#072933] disabled:cursor-not-allowed disabled:bg-[#C4D0D7] cursor-pointer"
                        >
                          <Camera className="h-4 w-4 text-[#E89B0C]" />
                          Abrir câmera
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={captureWebcamPhoto}
                          disabled={analyzingFace}
                          className="flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[8px] bg-[#156F48] px-3 py-2 text-xs font-extrabold text-white cursor-pointer"
                        >
                          <ScanFace className="h-4 w-4" />
                          {analyzingFace ? 'Validando...' : 'Capturar foto'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#DCE3E8] pt-5">
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-[8px] border border-[#C4D0D7] px-5 py-2.5 text-sm font-bold text-[#52646D] hover:bg-[#F4F6F8] cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitAll}
                    className="inline-flex min-h-[52px] items-center gap-2 rounded-[8px] bg-[#156F48] px-7 py-3 text-sm font-extrabold text-white transition-all hover:bg-[#115B3B] active:scale-[0.98] cursor-pointer sm:text-base"
                  >
                    {offlineFieldMode
                      ? 'Guardar na fila offline'
                      : loadedRecord
                        ? 'Salvar atualização no ID Maricá'
                        : 'Concluir cadastro no ID Maricá'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: RECEIPT */}
            {step === 5 && receipt && (
              <div key="mod-5" className="anim-step flex flex-col items-center py-6 text-center">
                <VerifiedSealGraphic />
                <h3 data-step-heading tabIndex={-1} className="font-display mt-5 text-2xl font-extrabold text-[#0B3B49]">
                  {receipt.queuedOffline
                    ? 'Cadastro guardado na fila offline de campo'
                    : 'Cadastro salvo no ID Maricá'}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#52646D]">
                  Protocolo <strong className="text-[#0B3B49]">{receipt.savedId}</strong> com{' '}
                  <strong>{totalPeopleInHome} CPF(s) vinculados</strong> no domicílio e{' '}
                  <strong>{draft.selfDeclaration.declaredPolicies.length} política(s)</strong>{' '}
                  informada(s) na demonstração.
                </p>

                <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-3 rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-5 text-left sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-[#52646D]">Validade (3 meses)</div>
                    <div className="font-display mt-0.5 text-base font-extrabold text-[#0B3B49] tabular-nums">
                      Até {formatDateBr(receipt.nextDueDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#52646D]">Renda per capita</div>
                    <div className="font-display mt-0.5 text-base font-extrabold text-[#156F48] tabular-nums">
                      {formatCurrency(receipt.perCapita)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#52646D]">Bairro</div>
                    <div className="font-display mt-0.5 text-base font-extrabold text-[#0B3B49]">
                      {draft.neighborhood}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {receipt.queuedOffline && (
                    <button
                      type="button"
                      onClick={syncOfflineQueue}
                      className="inline-flex min-h-[46px] items-center gap-2 rounded-[8px] bg-[#156F48] px-5 py-2.5 text-sm font-extrabold text-white hover:bg-[#115B3B] cursor-pointer"
                    >
                      Salvar fila neste navegador
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openRegistration('update')}
                    className="inline-flex min-h-[46px] items-center gap-2 rounded-[8px] border border-[#0B3B49] bg-white px-5 py-2.5 text-sm font-bold text-[#0B3B49] hover:bg-[#EDF4F6] cursor-pointer"
                  >
                    Fazer nova consulta ou atualização
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
