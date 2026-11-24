import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Camera,
  ChevronRight,
  Crosshair,
  FileText,
  History,
  Home,
  Loader2,
  Paperclip,
  ScanFace,
  Search,
  ShieldCheck,
  UserPlus,
  WifiOff,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useIntegra } from '../context/IntegraContext';
import { DISTRICT_BY_ID, OFFICIAL_BAIRROS } from '../data/maricaGeo';
import {
  calculateAge,
  ECONOMIC_SECTORS,
  EMPLOYMENT_LABELS,
  formatCurrency,
  formatDateBr,
  getRegistrationStatus,
  HOUSING_LABELS,
  SOCIAL_PROGRAM_OPTIONS,
  STATUS_LABELS,
  WORK_REGIME_LABELS,
} from '../engine/analyticsEngine';
import type {
  BeneficiaryRecord,
  DistrictId,
  EmploymentStatus,
  HousingType,
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
  { n: 1, title: 'Dados pessoais', subtitle: 'CPF, contato e família' },
  { n: 2, title: 'Profissional e renda', subtitle: 'Trabalho, renda e programas' },
  { n: 3, title: 'Moradia e território', subtitle: 'Endereço, bairro e GPS' },
  { n: 4, title: 'Documentos e envio', subtitle: 'Anexos, biometria e histórico' },
];

const DEFAULT_PROGRAM_VALUES: Record<string, number> = {
  'Renda Básica de Cidadania (Mumbuca)': 460,
  'Mumbuca Trabalho': 350,
  'Bolsa Família': 600,
  'Auxílio Aluguel': 500,
  'Passaporte Universitário': 680,
  'BPC / LOAS': 1518,
};

function formatCpfInput(value: string): string {
  if (/[a-zA-Z]/.test(value)) return value;
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
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
    householdSize: 3,
    dependentsCount: 1,
    familyComposition: 'Titular e dependentes',
    profession: '',
    employmentStatus: 'EMPREGADO' as EmploymentStatus,
    workRegime: 'CLT' as WorkRegime,
    employerName: '',
    economicSector: 'Comércio',
    individualIncome: 1518,
    householdTotalIncome: 2200,
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
    householdSize: b.householdSize,
    dependentsCount: b.dependentsCount,
    familyComposition: b.familyComposition,
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

  const [step, setStep] = useState<FormStep>(1);
  const [lookupInput, setLookupInput] = useState(beneficiaries[0]?.cpf ?? '');
  const [lookupFeedback, setLookupFeedback] = useState<string | null>(null);
  const [loadedRecord, setLoadedRecord] = useState<BeneficiaryRecord | null>(beneficiaries[0] ?? null);
  const [draft, setDraft] = useState<BeneficiaryDraft>(() =>
    beneficiaries[0] ? recordToDraft(beneficiaries[0]) : createEmptyDraft()
  );
  const [offlineFieldMode, setOfflineFieldMode] = useState(false);
  const [updateNote, setUpdateNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

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

  // Confirmation receipt state
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

  const loadBeneficiary = (b: BeneficiaryRecord) => {
    stopCamera();
    setLoadedRecord(b);
    setDraft(recordToDraft(b));
    setLookupInput(b.cpf);
    setLookupFeedback(null);
    setFormError(null);
    setGpsCapturedCoords(null);
    setGpsAccuracy(null);
    setGpsNotice(null);
    setGpsModeText('');
    setCapturedPhoto(null);
    setStep(1);
  };

  const startNewRegistration = () => {
    stopCamera();
    setLoadedRecord(null);
    setDraft(createEmptyDraft());
    setLookupInput('');
    setLookupFeedback('Novo cadastro individual iniciado. Preencha os 4 módulos abaixo.');
    setFormError(null);
    setGpsCapturedCoords(null);
    setGpsAccuracy(null);
    setGpsNotice(null);
    setCapturedPhoto(null);
    setStep(1);
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = lookupInput.replace(/\D/g, '');
    const text = lookupInput.trim().toLowerCase();
    if (digits.length < 3 && text.length < 3) {
      setLookupFeedback('Informe CPF ou nome completo para localizar seu cadastro.');
      return;
    }
    const found = beneficiaries.find(
      (b) =>
        (digits.length >= 3 && b.cpf.replace(/\D/g, '').includes(digits)) ||
        b.fullName.toLowerCase().includes(text)
    );
    if (found) {
      loadBeneficiary(found);
      setLookupFeedback(`Cadastro localizado: ${found.fullName}. Você pode atualizar sem perder o histórico.`);
    } else {
      setLookupFeedback('CPF não localizado na base. Clique em "Novo cadastro" para iniciar.');
    }
  };

  const age = calculateAge(draft.birthDate);
  const benefitsTotal = draft.socialPrograms.reduce((s, p) => s + (Number(p.monthlyValue) || 0), 0);
  const perCapitaAuto = Math.round(
    ((Number(draft.householdTotalIncome) || 0) + benefitsTotal) / Math.max(1, draft.householdSize)
  );

  const toggleProgram = (programName: string) => {
    setDraft((prev) => {
      const exists = prev.socialPrograms.some((p) => p.name === programName);
      if (exists) {
        return {
          ...prev,
          socialPrograms: prev.socialPrograms.filter((p) => p.name !== programName),
        };
      }
      return {
        ...prev,
        socialPrograms: [
          ...prev.socialPrograms,
          { name: programName, monthlyValue: DEFAULT_PROGRAM_VALUES[programName] ?? 300 },
        ],
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
          facialVerifiedAt: '2026-11-23',
        },
      }));
      setAnalyzingFace(false);
    }, 650);
  };

  const validateStep = (targetStep: FormStep) => {
    setFormError(null);
    if (step === 1 && targetStep > 1) {
      if (draft.fullName.trim().length < 4) {
        setFormError('Informe o nome completo do beneficiário.');
        return;
      }
      if (draft.cpf.replace(/\D/g, '').length < 11) {
        setFormError('Informe um CPF válido com 11 dígitos.');
        return;
      }
    }
    if (step === 3 && targetStep > 3) {
      if (draft.address.trim().length < 5) {
        setFormError('Informe o endereço residencial completo.');
        return;
      }
    }
    setStep(targetStep);
  };

  const handleSubmitAll = () => {
    setFormError(null);
    const result = upsertBeneficiary(
      {
        ...draft,
        householdTotalIncome: Math.max(draft.householdTotalIncome, draft.individualIncome),
        pendingValidation: !draft.documents.idDocAttached || !draft.documents.residenceProofAttached,
      },
      {
        offlineMode: offlineFieldMode,
        updatedBy: offlineFieldMode ? 'Equipe de Campo (Offline)' : 'Aplicativo do Beneficiário',
        note:
          updateNote.trim() ||
          (loadedRecord
            ? 'Atualização trimestral concluída com preservação do histórico anterior.'
            : 'Cadastro inicial individual vinculado ao CPF.'),
      }
    );
    setReceipt({ ...result, perCapita: perCapitaAuto });
    setStep(5);
  };

  const quickExamples = ['BEN-001', 'BEN-011', 'BEN-006']
    .map((id) => beneficiaries.find((b) => b.id === id))
    .filter((b): b is BeneficiaryRecord => Boolean(b));

  const currentStatus = loadedRecord ? getRegistrationStatus(loadedRecord) : null;

  return (
    <div className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6 md:py-20">
      {/* Section Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <div className="h-[4px] w-14 bg-[#D93829]" />
          <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-[#0B3B49] sm:text-4xl lg:text-[42px] lg:leading-[1.1]">
            Aplicativo de cadastro e atualização trimestral
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#52646D] sm:text-lg">
            Atualize seus dados a cada 3 meses sem criar um novo cadastro. Todo o histórico
            econômico fica preservado para melhorar as políticas públicas de Maricá.
          </p>
        </div>

        {/* Field Offline Toggle + Progress */}
        <div className="flex flex-wrap items-center gap-3">
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
            {offlineFieldMode ? 'Modo campo offline ativo' : 'Simular coleta offline'}
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
                  Módulo {step} de 4
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
      </div>

      {/* Main Studio Card */}
      <div className="overflow-hidden rounded-[14px] border border-[#DCE3E8] bg-white shadow-[0_18px_46px_-16px_rgba(11,59,73,0.14)]">
        <div className="grid grid-cols-1 lg:grid-cols-[296px_1fr]">
          {/* Left Module Navigation Rail */}
          <aside className="flex flex-col justify-between border-b border-[#DCE3E8] bg-[#0B3B49] p-6 text-white lg:border-b-0 lg:border-r lg:p-7">
            <div>
              <div className="text-sm font-bold text-[#E89B0C]">Módulos do cadastro</div>
              <ol className="mt-5 grid grid-cols-2 gap-3.5 lg:grid-cols-1 lg:space-y-4 lg:gap-0">
                {MODULES.map((item) => {
                  const isCurrent = step === item.n;
                  const isDone = step > item.n;
                  return (
                    <li key={item.n}>
                      <button
                        type="button"
                        onClick={() => step <= 4 && validateStep(item.n)}
                        className="flex w-full items-start gap-3 text-left cursor-pointer"
                      >
                        <span
                          className={`font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-all ${
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
                            className={`font-display text-sm font-bold sm:text-base ${
                              isCurrent || isDone ? 'text-white' : 'text-[#A7C1CA]'
                            }`}
                          >
                            {item.title}
                          </div>
                          <div className="mt-0.5 text-xs text-[#A7C1CA]">{item.subtitle}</div>
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
                  O vencimento cadastral serve para manter seus dados atualizados e{' '}
                  <strong className="text-white">não suspende automaticamente</strong> nenhum
                  benefício.
                </p>
              </div>
              <p>
                Proteção LGPD (Lei nº 13.709/2018): dados individuais ficam restritos a servidores
                autorizados com trilha de auditoria.
              </p>
            </div>
          </aside>

          {/* Right Workspace */}
          <div className="p-6 sm:p-8">
            {/* CPF Lookup / New Registration Toolbar (always accessible on Step 1) */}
            {step === 1 && (
              <div className="mb-6 rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-4 sm:p-5">
                <form onSubmit={handleLookup} className="flex flex-col gap-2.5 sm:flex-row">
                  <div className="relative flex-1">
                    <Search
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#52646D]"
                    />
                    <input
                      type="text"
                      value={lookupInput}
                      onChange={(e) => setLookupInput(formatCpfInput(e.target.value))}
                      placeholder="Buscar cadastro existente por CPF ou nome..."
                      aria-label="Buscar cadastro existente por CPF ou nome"
                      className="min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white py-2.5 pl-10 pr-4 text-sm font-semibold text-[#0B3B49]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[8px] bg-[#0B3B49] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#072933] cursor-pointer"
                  >
                    Localizar CPF
                  </button>
                  <button
                    type="button"
                    onClick={startNewRegistration}
                    className="inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-[8px] border border-[#0B3B49] bg-white px-4 py-2.5 text-sm font-bold text-[#0B3B49] hover:bg-[#EDF4F6] cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    Novo cadastro
                  </button>
                </form>

                {/* Quick Example Profiles + Validity Status */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-[#52646D]">Carregar exemplo:</span>
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
                          {ex.fullName.split(' ')[0]} ({st === 'VENCIDO' ? 'Vencido' : st === 'PENDENTE_VALIDACAO' ? 'Pendente' : 'Atualizado'})
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
                  <p className="mt-2 text-xs font-bold text-[#0E7490]">{lookupFeedback}</p>
                )}
              </div>
            )}

            {formError && (
              <div
                role="alert"
                className="mb-5 flex items-center gap-2 rounded-[8px] border border-[#D93829]/40 bg-[#FDE8E6] px-4 py-3 text-sm font-semibold text-[#8E2016]"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            {/* MODULE 1: PERSONAL DATA */}
            {step === 1 && (
              <div key="mod-1" className="anim-step space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-extrabold text-[#0B3B49]">
                    1. Dados pessoais e núcleo familiar
                  </h3>
                  {loadedRecord && (
                    <span className="text-xs font-semibold text-[#52646D]">
                      Cadastrado em {formatDateBr(loadedRecord.registeredAt)} (histórico com{' '}
                      {loadedRecord.history.length} ciclo(s))
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="f-name" className="block text-xs font-bold text-[#0B3B49]">
                      Nome completo
                    </label>
                    <input
                      id="f-name"
                      type="text"
                      value={draft.fullName}
                      onChange={(e) => setDraft((p) => ({ ...p, fullName: e.target.value }))}
                      placeholder="Digite o nome completo do beneficiário"
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm text-[#0B3B49]"
                    />
                  </div>

                  <div>
                    <label htmlFor="f-cpf" className="block text-xs font-bold text-[#0B3B49]">
                      CPF (chave individual)
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

                  <div>
                    <label htmlFor="f-email" className="block text-xs font-bold text-[#0B3B49]">
                      E-mail para notificações
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="f-hsize" className="block text-xs font-bold text-[#0B3B49]">
                        Pessoas na casa
                      </label>
                      <input
                        id="f-hsize"
                        type="number"
                        min={1}
                        max={15}
                        value={draft.householdSize}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            householdSize: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                        className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm font-bold text-[#0B3B49]"
                      />
                    </div>
                    <div>
                      <label htmlFor="f-dep" className="block text-xs font-bold text-[#0B3B49]">
                        Dependentes
                      </label>
                      <input
                        id="f-dep"
                        type="number"
                        min={0}
                        max={14}
                        value={draft.dependentsCount}
                        onChange={(e) =>
                          setDraft((p) => ({
                            ...p,
                            dependentsCount: Math.max(0, Number(e.target.value) || 0),
                          }))
                        }
                        className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm font-bold text-[#0B3B49]"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t border-[#DCE3E8] pt-5">
                  <button
                    type="button"
                    onClick={() => validateStep(2)}
                    className="inline-flex min-h-[50px] items-center gap-2 rounded-[8px] bg-[#D93829] px-7 py-3 text-sm font-extrabold text-white transition-all hover:bg-[#B52B1E] active:scale-[0.98] cursor-pointer sm:text-base"
                  >
                    Continuar para Profissional e renda
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* MODULE 2: PROFESSIONAL & ECONOMIC */}
            {step === 2 && (
              <div key="mod-2" className="anim-step space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 font-display text-xl font-extrabold text-[#0B3B49]">
                    <Briefcase className="h-5 w-5 text-[#0E7490]" />
                    2. Dados profissionais e econômicos
                  </h3>
                  <div className="rounded-[8px] border border-[#156F48]/30 bg-[#E6F4ED] px-4 py-2 text-right">
                    <div className="text-[11px] font-bold text-[#156F48]">
                      Renda familiar per capita (automática)
                    </div>
                    <div className="font-display text-lg font-extrabold text-[#0F4D32] tabular-nums">
                      {formatCurrency(perCapitaAuto)} / pessoa
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="f-emp" className="block text-xs font-bold text-[#0B3B49]">
                      Situação profissional atual
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
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm text-[#0B3B49]"
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
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm text-[#0B3B49]"
                    >
                      {(Object.keys(WORK_REGIME_LABELS) as WorkRegime[]).map((k) => (
                        <option key={k} value={k}>
                          {WORK_REGIME_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="f-prof" className="block text-xs font-bold text-[#0B3B49]">
                      Profissão / Ocupação atual
                    </label>
                    <input
                      id="f-prof"
                      type="text"
                      value={draft.profession}
                      onChange={(e) => setDraft((p) => ({ ...p, profession: e.target.value }))}
                      placeholder="Ex.: Operadora de caixa, Eletricista..."
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm text-[#0B3B49]"
                    />
                  </div>

                  <div>
                    <label htmlFor="f-sec" className="block text-xs font-bold text-[#0B3B49]">
                      Setor econômico
                    </label>
                    <select
                      id="f-sec"
                      value={draft.economicSector}
                      onChange={(e) => setDraft((p) => ({ ...p, economicSector: e.target.value }))}
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3 py-2 text-sm text-[#0B3B49]"
                    >
                      {ECONOMIC_SECTORS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="f-employer" className="block text-xs font-bold text-[#0B3B49]">
                      Empregador / Empresa (quando aplicável)
                    </label>
                    <input
                      id="f-employer"
                      type="text"
                      value={draft.employerName}
                      onChange={(e) => setDraft((p) => ({ ...p, employerName: e.target.value }))}
                      placeholder="Nome da empresa ou MEI"
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm text-[#0B3B49]"
                    />
                  </div>

                  <div>
                    <label htmlFor="f-contrib" className="block text-xs font-bold text-[#0B3B49]">
                      Pessoas que contribuem para a renda
                    </label>
                    <input
                      id="f-contrib"
                      type="number"
                      min={0}
                      max={10}
                      value={draft.incomeContributorsCount}
                      onChange={(e) =>
                        setDraft((p) => ({
                          ...p,
                          incomeContributorsCount: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm font-bold text-[#0B3B49]"
                    />
                  </div>

                  <div>
                    <label htmlFor="f-inc" className="block text-xs font-bold text-[#0B3B49]">
                      Salário / Rendimento individual (R$/mês)
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
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm font-bold text-[#0B3B49]"
                    />
                  </div>

                  <div>
                    <label htmlFor="f-hinc" className="block text-xs font-bold text-[#0B3B49]">
                      Renda familiar mensal total (sem benefícios, R$)
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
                      className="mt-1 min-h-[46px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm font-bold text-[#0B3B49]"
                    />
                  </div>
                </div>

                {/* Social Programs Selector */}
                <div className="rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#0B3B49]">
                      Programas sociais ou municipais recebidos
                    </span>
                    <span className="text-xs font-extrabold text-[#0E7490] tabular-nums">
                      Total em benefícios: {formatCurrency(benefitsTotal)}/mês
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {SOCIAL_PROGRAM_OPTIONS.map((progName) => {
                      const active = draft.socialPrograms.find((p) => p.name === progName);
                      return (
                        <div
                          key={progName}
                          className={`flex items-center justify-between gap-2 rounded-[8px] border px-3 py-2 text-xs ${
                            active
                              ? 'border-[#0B3B49] bg-white'
                              : 'border-[#DCE3E8] bg-[#F4F6F8] text-[#52646D]'
                          }`}
                        >
                          <label className="flex flex-1 cursor-pointer items-center gap-2 font-semibold text-[#0B3B49]">
                            <input
                              type="checkbox"
                              checked={Boolean(active)}
                              onChange={() => toggleProgram(progName)}
                              className="h-4 w-4 accent-[#0B3B49]"
                            />
                            <span>{progName}</span>
                          </label>
                          {active && (
                            <input
                              type="number"
                              min={0}
                              step={10}
                              aria-label={`Valor mensal ${progName}`}
                              value={active.monthlyValue}
                              onChange={(e) =>
                                updateProgramValue(progName, Number(e.target.value) || 0)
                              }
                              className="w-20 rounded-[5px] border border-[#C4D0D7] px-2 py-1 text-right font-bold text-[#0B3B49]"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#DCE3E8] pt-5">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
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
                    Continuar para Moradia e território
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* MODULE 3: HOUSING & GEOREFERENCING */}
            {step === 3 && (
              <div key="mod-3" className="anim-step space-y-5">
                <h3 className="flex items-center gap-2 font-display text-xl font-extrabold text-[#0B3B49]">
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
                        Bairro do local de trabalho (análise de deslocamento)
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

                  {/* Right: Real GPS Capture Box */}
                  <div className="flex flex-col justify-between rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-4">
                    <div>
                      <div className="mb-2.5 flex items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-display text-sm font-extrabold text-[#0B3B49]">
                          <HomeGeofenceIcon />
                          Georreferenciamento da residência
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
                          {gpsModeText} capturado nas coordenadas exibidas no mapa.
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
                    onClick={() => setStep(2)}
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

            {/* MODULE 4: DOCUMENTS, FACIAL LGPD & HISTORY */}
            {step === 4 && (
              <div key="mod-4" className="anim-step space-y-5">
                <h3 className="flex items-center gap-2 font-display text-xl font-extrabold text-[#0B3B49]">
                  <FileText className="h-5 w-5 text-[#0E7490]" />
                  4. Documentação, identificação e revisão
                </h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {/* Left: Document Attachments + Update Note */}
                  <div className="space-y-4">
                    <div className="rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-4 space-y-3">
                      <div className="text-sm font-extrabold text-[#0B3B49]">
                        Anexos comprobatórios
                      </div>

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
                        placeholder="Ex.: Novo emprego CLT, mudança de endereço ou abertura de MEI"
                        className="mt-1 min-h-[44px] w-full rounded-[8px] border border-[#C4D0D7] bg-white px-3.5 py-2 text-sm text-[#0B3B49]"
                      />
                    </div>

                    {/* Preserved Longitudinal History */}
                    {loadedRecord && loadedRecord.history.length > 0 && (
                      <div className="rounded-[10px] border border-[#DCE3E8] bg-white p-4">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0B3B49]">
                          <History className="h-4 w-4 text-[#0E7490]" />
                          Histórico preservado ({loadedRecord.history.length} registros)
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

                  {/* Right: Optional Biometrics with Explicit LGPD Consent */}
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
                        Dado pessoal sensível (Art. 5º, II da LGPD): a captura facial é opcional
                        para quem preferir validação documental presencial no CRAS ou Unidade de
                        Saúde da Família.
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
                    onClick={() => {
                      stopCamera();
                      setStep(3);
                    }}
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
                        ? 'Salvar atualização trimestral'
                        : 'Concluir novo cadastro'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: RECEIPT */}
            {step === 5 && receipt && (
              <div key="mod-5" className="anim-step flex flex-col items-center py-6 text-center">
                <VerifiedSealGraphic />
                <h3 className="font-display mt-5 text-2xl font-extrabold text-[#0B3B49]">
                  {receipt.queuedOffline
                    ? 'Cadastro guardado na fila offline de campo'
                    : 'Cadastro atualizado com sucesso'}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#52646D]">
                  Protocolo <strong className="text-[#0B3B49]">{receipt.savedId}</strong> vinculado
                  ao CPF informado. Todo o histórico econômico anterior foi preservado para estudos
                  longitudinais e planejamento de políticas públicas.
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
                    <div className="text-xs text-[#52646D]">Bairro / Distrito</div>
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
                      Sincronizar agora com a base central
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex min-h-[46px] items-center gap-2 rounded-[8px] border border-[#0B3B49] bg-white px-5 py-2.5 text-sm font-bold text-[#0B3B49] hover:bg-[#EDF4F6] cursor-pointer"
                  >
                    Realizar nova consulta ou atualização
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
