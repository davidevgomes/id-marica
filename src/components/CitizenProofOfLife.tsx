import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  ChevronRight,
  Crosshair,
  HeartHandshake,
  Home,
  Loader2,
  ScanFace,
  Search,
  ShieldAlert,
  UserRoundCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useIntegra } from '../context/IntegraContext';
import {
  calculateDistanceMeters,
  DISTRICT_BY_ID,
  formatDistance,
} from '../data/maricaGeo';
import {
  calculateFamilyMetrics,
  formatMumbucas,
  maskCpf,
  RAIO_TOLERANCIA_GPS_METROS,
} from '../engine/rulesEngine';
import {
  BiometricFrameGraphic,
  FacialBadgeIcon,
  HomeGeofenceIcon,
  VerifiedSealGraphic,
} from './CivicIcons';
import { GeofenceMiniMap } from './GeofenceMiniMap';

type WizardStep = 1 | 2 | 3 | 4;

const STEP_LIST: { n: WizardStep; title: string; subtitle: string }[] = [
  { n: 1, title: 'Seus dados', subtitle: 'CPF ou NIS cadastrado' },
  { n: 2, title: 'Foto e casa', subtitle: 'Selfie e localização' },
  { n: 3, title: 'Trabalho', subtitle: 'Pergunta rápida' },
  { n: 4, title: 'Comprovante', subtitle: 'Benefício renovado' },
];

function formatCpfInput(value: string): string {
  if (/[a-zA-Z]/.test(value)) return value;
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function CitizenProofOfLife() {
  const {
    families,
    citizenTargetFamilyId,
    setCitizenTargetFamilyId,
    submitProofOfLife,
  } = useIntegra();

  const family = families.find((f) => f.id === citizenTargetFamilyId) ?? families[0];
  const district = DISTRICT_BY_ID[family.districtId];
  const metrics = calculateFamilyMetrics(family);

  const [step, setStep] = useState<WizardStep>(1);
  const [cpfQuery, setCpfQuery] = useState(family.titularCpf);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  // Camera & Facial Biometrics
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [analyzingFace, setAnalyzingFace] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [facialResult, setFacialResult] = useState<{ liveness: number; match: number } | null>(null);

  // GPS Geofence & Automatic Instability Detection
  const [loadingGps, setLoadingGps] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<[number, number] | null>(null);
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);
  const [gpsModeLabel, setGpsModeLabel] = useState<string>('');
  const [instabilityNotice, setInstabilityNotice] = useState<string | null>(null);
  const [mockGpsFlag, setMockGpsFlag] = useState(false);

  // Self-declaration
  const [declaredOcc, setDeclaredOcc] = useState<string>(
    'Mantive a mesma situação (sem carteira assinada)'
  );
  const [assistedMode, setAssistedMode] = useState(false);
  const [finalOutcome, setFinalOutcome] = useState<'APROVADO' | 'REPROVADO_DISTANCIA' | null>(null);

  useEffect(() => {
    setCpfQuery(family.titularCpf);
    setLookupMessage(null);
    stopCamera();
    setStep(1);
    setCapturedPhoto(null);
    setFacialResult(null);
    setGpsCoords(null);
    setGpsDistance(null);
    setGpsModeLabel('');
    setInstabilityNotice(null);
    setMockGpsFlag(false);
    setAssistedMode(false);
    setFinalOutcome(null);
  }, [family.id]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleLookupCpf = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = cpfQuery.replace(/\D/g, '');
    if (digits.length < 3 && cpfQuery.trim().length < 3) {
      setLookupMessage('Digite o CPF, NIS ou nome do titular cadastrado.');
      return;
    }
    const found = families.find(
      (f) =>
        (digits.length >= 3 && f.titularCpf.replace(/\D/g, '').includes(digits)) ||
        (digits.length >= 3 && f.nis.replace(/\D/g, '').includes(digits)) ||
        f.titularName.toLowerCase().includes(cpfQuery.trim().toLowerCase())
    );
    if (found) {
      setCitizenTargetFamilyId(found.id);
      setLookupMessage(`Cadastro localizado: ${found.titularName}.`);
    } else {
      setLookupMessage('Cadastro não encontrado. Verifique o CPF ou escolha um exemplo abaixo.');
    }
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
      setCameraError('Câmera não encontrada ou sem permissão neste aparelho.');
    }
  };

  const captureFromWebcam = () => {
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
      setFacialResult({
        liveness: Number((98.2 + Math.random() * 1.5).toFixed(1)),
        match: Number((96.8 + Math.random() * 2.1).toFixed(1)),
      });
      setAnalyzingFace(false);
    }, 800);
  };

  const simulateFacialScan = () => {
    setCameraError(null);
    setAnalyzingFace(true);
    stopCamera();
    setTimeout(() => {
      setCapturedPhoto(null);
      setFacialResult({ liveness: 99.1, match: 98.4 });
      setAnalyzingFace(false);
    }, 650);
  };

  const requestRealGps = () => {
    setInstabilityNotice(null);
    setMockGpsFlag(false);
    if (!navigator.geolocation) {
      setInstabilityNotice(
        'Instabilidade detectada no sinal de localização: este aparelho não enviou sinal de GPS. Tente novamente perto de uma janela ou escolha "Em casa" para testar a demonstração.'
      );
      return;
    }
    setLoadingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        const accuracy = pos.coords.accuracy ?? 0;
        const dist = calculateDistanceMeters(family.coords, coords);
        setGpsCoords(coords);
        setGpsDistance(dist);
        setGpsModeLabel('Localização real do aparelho');
        setLoadingGps(false);

        // Automatic GPS instability or spoofing anomaly alert (low precision or suspicious 0m accuracy)
        if (accuracy > 150 || accuracy === 0) {
          setMockGpsFlag(accuracy === 0);
          setInstabilityNotice(
            'Instabilidade detectada no sinal de localização (baixa precisão ou interferência no GPS). Aguarde alguns segundos próximo a uma janela ou realize a confirmação presencial em uma Unidade de Saúde da Família.'
          );
        }
      },
      () => {
        setLoadingGps(false);
        setInstabilityNotice(
          'Instabilidade detectada no sinal de localização: não foi possível confirmar o GPS automaticamente. Verifique a permissão de localização do celular ou utilize os cenários de demonstração abaixo.'
        );
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const simulateHomeGps = () => {
    setInstabilityNotice(null);
    setMockGpsFlag(false);
    const simulated: [number, number] = [family.coords[0] + 0.00012, family.coords[1] - 0.00011];
    setGpsCoords(simulated);
    setGpsDistance(calculateDistanceMeters(family.coords, simulated));
    setGpsModeLabel('Localização dentro da residência');
  };

  const simulateFarGps = () => {
    setInstabilityNotice(null);
    setMockGpsFlag(false);
    const simulated: [number, number] = [-22.8485, -43.0292];
    setGpsCoords(simulated);
    setGpsDistance(calculateDistanceMeters(family.coords, simulated));
    setGpsModeLabel('Localização fora do município');
  };

  const handleFinishProof = () => {
    const outcome = submitProofOfLife(family.id, {
      livenessScore: facialResult?.liveness ?? 98.5,
      facialMatchScore: facialResult?.match ?? 97.4,
      distanceMeters: assistedMode ? 5 : gpsDistance ?? 18,
      mockLocationDetected: assistedMode ? false : mockGpsFlag,
      channel: assistedMode ? 'PRESENCIAL_CRAS_UBS' : 'APP_FACIAL_GPS',
      captureCoords: gpsCoords ?? family.coords,
      declaredOccupation: declaredOcc,
    });
    setFinalOutcome(outcome);
    setStep(4);
  };

  const isWithinRadius =
    assistedMode ||
    (gpsDistance !== null && !mockGpsFlag && gpsDistance <= RAIO_TOLERANCIA_GPS_METROS);

  const quickProfiles = ['FAM-001', 'FAM-003', 'FAM-005']
    .map((id) => families.find((f) => f.id === id))
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-[1260px] px-4 py-16 sm:px-6 md:py-20">
      {/* Generous Accessible Section Header */}
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <div className="h-[4px] w-14 bg-[#D93829]" />
          <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-[#0B3B49] sm:text-4xl lg:text-[42px] lg:leading-[1.1]">
            Faça seu cadastro e prova de vida
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#52646D] sm:text-lg">
            Siga os 4 passos simples abaixo. Tudo é gratuito e feito em menos de dois minutos.
          </p>
        </div>

        {/* Large Clear Progress Bar */}
        <div className="flex items-center gap-4 rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] px-4 py-3">
          <div>
            <div className="text-xs font-semibold text-[#52646D]">Seu progresso</div>
            <div className="font-display text-base font-extrabold text-[#0B3B49] tabular-nums">
              Passo {step} de 4
            </div>
          </div>
          <div className="h-3 w-32 overflow-hidden rounded-full bg-[#DCE3E8]">
            <div
              className="h-full rounded-full bg-[#D93829] transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Unified Large Accessible Studio */}
      <div className="overflow-hidden rounded-[14px] border border-[#DCE3E8] bg-white shadow-[0_18px_46px_-16px_rgba(11,59,73,0.14)]">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
          {/* Left Vertical Step Rail (horizontal compact bar on mobile) */}
          <aside className="flex flex-col justify-between border-b border-[#DCE3E8] bg-[#0B3B49] p-6 text-white lg:border-b-0 lg:border-r lg:p-7">
            <div>
              <div className="text-sm font-bold text-[#E89B0C]">Passos fáceis</div>
              <ol className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-1 lg:space-y-5 lg:gap-0">
                {STEP_LIST.map((item) => {
                  const isCurrent = step === item.n;
                  const isDone = step > item.n;
                  return (
                    <li key={item.n} className="flex items-start gap-3">
                      <span
                        className={`font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-all duration-300 ${
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
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="mt-6 hidden border-t border-white/15 pt-5 text-xs leading-relaxed text-[#C2D6DC] lg:block">
              <strong className="block text-sm text-white">Segurança e privacidade</strong>
              <p className="mt-1">
                Seus dados são protegidos pela LGPD e usados apenas para manter seu benefício ativo
                em Maricá.
              </p>
            </div>
          </aside>

          {/* Right Main Workspace */}
          <div className="p-6 sm:p-9">
            {/* STEP 1: Simple CPF Identification */}
            {step === 1 && (
              <div key="step-1" className="anim-step space-y-6">
                <form onSubmit={handleLookupCpf} className="space-y-3">
                  <label
                    htmlFor="citizen-cpf-input"
                    className="block font-display text-base font-extrabold text-[#0B3B49]"
                  >
                    1. Digite seu CPF ou NIS para consultar
                  </label>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id="citizen-cpf-input"
                      type="text"
                      value={cpfQuery}
                      onChange={(e) => setCpfQuery(formatCpfInput(e.target.value))}
                      placeholder="000.000.000-00"
                      className="min-h-[52px] flex-1 rounded-[8px] border border-[#C4D0D7] bg-[#F9FBFC] px-4 py-3 text-base font-semibold text-[#0B3B49] transition-colors focus:border-[#0B3B49] focus:bg-white"
                    />
                    <button
                      type="submit"
                      className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[8px] bg-[#0B3B49] px-6 py-3 text-sm font-extrabold text-white transition-all hover:bg-[#072933] active:scale-[0.98] cursor-pointer sm:text-base"
                    >
                      <Search className="h-5 w-5" />
                      Buscar cadastro
                    </button>
                  </div>

                  {/* Quick-fill examples */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-[#52646D] sm:text-sm">
                    <span>Cadastros de exemplo:</span>
                    {quickProfiles.map((p) => {
                      if (!p) return null;
                      const parts = p.titularName.split(' ');
                      const shortName = `${parts[0]} ${parts[parts.length - 1]}`;
                      const active = p.id === family.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setCitizenTargetFamilyId(p.id)}
                          className={`min-h-[36px] rounded-[6px] px-3 py-1 font-bold transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#0B3B49] text-white'
                              : 'bg-[#EEF3F6] text-[#0B3B49] hover:bg-[#DCE6EC]'
                          }`}
                        >
                          {shortName}
                        </button>
                      );
                    })}
                  </div>

                  {lookupMessage && (
                    <p className="text-sm font-bold text-[#0E7490]">{lookupMessage}</p>
                  )}
                </form>

                {/* Loaded Citizen Summary */}
                <div className="rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold text-[#52646D] sm:text-sm">
                        Cadastro localizado
                      </div>
                      <h3 className="font-display mt-1 text-2xl font-extrabold text-[#0B3B49]">
                        {family.titularName}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap gap-5 text-sm text-[#52646D]">
                        <span>
                          CPF <strong className="text-[#11222B]">{maskCpf(family.titularCpf)}</strong>
                        </span>
                        <span>
                          NIS <strong className="text-[#11222B]">{family.nis}</strong>
                        </span>
                      </div>
                    </div>
                    <div className="rounded-[8px] bg-[#E6F4ED] px-4 py-2.5 text-right">
                      <div className="text-xs font-bold text-[#156F48]">Benefício mensal</div>
                      <div className="font-display text-xl font-extrabold text-[#0F4D32] tabular-nums">
                        {formatMumbucas(metrics.totalMumbucasMonthly)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-start gap-3 border-t border-[#DCE3E8] pt-4 text-sm">
                    <Home className="mt-0.5 h-5 w-5 shrink-0 text-[#0E7490]" />
                    <div>
                      <div className="font-bold text-[#0B3B49]">
                        {family.sigiloEspacial
                          ? 'Endereço protegido sob sigilo judicial (LGPD)'
                          : family.address}
                      </div>
                      <div className="text-[#52646D]">{district.name}</div>
                    </div>
                  </div>
                </div>

                {family.assistedEligible && (
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-[#0E7490]/35 bg-[#EDF7FA] p-5">
                    <div className="flex items-start gap-3">
                      <HeartHandshake className="mt-0.5 h-6 w-6 shrink-0 text-[#0E7490]" />
                      <div className="text-sm text-[#0B3B49]">
                        <p className="font-extrabold">Atendimento presencial assistido</p>
                        <p className="mt-0.5 text-[#3B5560]">
                          Idosos e pessoas com deficiência podem confirmar presencialmente em uma
                          Unidade de Saúde da Família ou no CRAS.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAssistedMode(true);
                        setFacialResult({ liveness: 99.0, match: 98.5 });
                        setGpsDistance(5);
                        setStep(3);
                      }}
                      className="inline-flex min-h-[46px] items-center gap-2 rounded-[8px] bg-[#0E7490] px-5 py-2.5 text-sm font-extrabold text-white transition-all hover:bg-[#0B5C73] active:scale-[0.98] cursor-pointer"
                    >
                      <UserRoundCheck className="h-4 w-4" />
                      Validar presencialmente
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <p className="text-sm text-[#52646D]">
                    Seu cartão e aplicativo do Banco Mumbuca não mudam.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAssistedMode(false);
                      setStep(2);
                    }}
                    className="inline-flex min-h-[54px] items-center gap-2 rounded-[8px] bg-[#D93829] px-7 py-3.5 text-base font-extrabold text-white transition-all hover:bg-[#B52B1E] active:scale-[0.98] cursor-pointer"
                  >
                    Confirmar dados e avançar
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Facial Biometrics + Home Location (with Em casa / Fora 14 km + Automatic GPS Instability Alert) */}
            {step === 2 && (
              <div key="step-2" className="anim-step space-y-6">
                {/* Automatic Instability / Signal Warning Banner */}
                {instabilityNotice && (
                  <div
                    role="alert"
                    className="anim-step flex items-start gap-3 rounded-[10px] border border-[#E89B0C] bg-[#FEF3DC] p-4 text-sm text-[#6E4400]"
                  >
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#B4690E]" />
                    <div>
                      <strong className="block font-extrabold">
                        Atenção: instabilidade no sinal de localização
                      </strong>
                      <p className="mt-0.5 leading-relaxed">{instabilityNotice}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Left: Facial Biometrics */}
                  <div className="flex flex-col justify-between rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-5">
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-[#0B3B49]">
                          <FacialBadgeIcon />
                          1. Foto do rosto
                        </h3>
                        {facialResult && (
                          <span className="rounded-[4px] bg-[#E6F4ED] px-2.5 py-0.5 text-xs font-bold text-[#156F48]">
                            Validada
                          </span>
                        )}
                      </div>

                      {!facialResult ? (
                        <div className="space-y-3">
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
                                <div className="relative h-44 w-36 rounded-full border-2 border-dashed border-[#E89B0C] shadow-[0_0_0_999px_rgba(7,41,51,0.5)]">
                                  <div className="anim-scanline absolute inset-x-2 top-1/2 h-0.5 bg-[#E89B0C]" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-52 flex-col items-center justify-center rounded-[8px] border border-[#DCE3E8] bg-white px-4 text-center">
                              <BiometricFrameGraphic scanning={analyzingFace} />
                              <p className="mt-3 text-sm font-bold text-[#0B3B49]">
                                Olhe para a câmera em local iluminado
                              </p>
                              <p className="mt-1 text-xs text-[#52646D]">
                                Confirmação rápida de identidade Gov.br
                              </p>
                            </div>
                          )}

                          {cameraError && (
                            <div className="rounded-[6px] bg-[#FEF3DC] p-3 text-xs font-medium text-[#7A4700]">
                              {cameraError}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-52 flex-col items-center justify-center rounded-[8px] border border-[#156F48]/30 bg-[#E6F4ED] p-4 text-center">
                          {capturedPhoto ? (
                            <img
                              src={capturedPhoto}
                              alt="Selfie validada"
                              className="h-20 w-20 rounded-full border-2 border-[#156F48] object-cover"
                            />
                          ) : (
                            <VerifiedSealGraphic />
                          )}
                          <div className="mt-3 font-display text-base font-extrabold text-[#0F4D32]">
                            Identidade confirmada
                          </div>
                          <div className="mt-0.5 text-xs font-semibold text-[#156F48] tabular-nums">
                            Vivacidade {facialResult.liveness}% e match {facialResult.match}%
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFacialResult(null);
                              setCapturedPhoto(null);
                            }}
                            className="mt-2 text-xs font-bold text-[#0F4D32] underline cursor-pointer"
                          >
                            Tirar outra foto
                          </button>
                        </div>
                      )}
                    </div>

                    {!facialResult && (
                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {!cameraActive ? (
                          <button
                            type="button"
                            onClick={startCamera}
                            disabled={analyzingFace}
                            className="flex min-h-[48px] items-center justify-center gap-2 rounded-[8px] bg-[#0B3B49] px-4 py-3 text-sm font-extrabold text-white transition-all hover:bg-[#072933] active:scale-[0.98] cursor-pointer"
                          >
                            <Camera className="h-4 w-4 text-[#E89B0C]" />
                            Abrir câmera
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={captureFromWebcam}
                            disabled={analyzingFace}
                            className="flex min-h-[48px] items-center justify-center gap-2 rounded-[8px] bg-[#156F48] px-4 py-3 text-sm font-extrabold text-white transition-all hover:bg-[#115B3B] active:scale-[0.98] cursor-pointer"
                          >
                            {analyzingFace ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ScanFace className="h-4 w-4" />
                            )}
                            {analyzingFace ? 'Validando...' : 'Tirar foto'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={simulateFacialScan}
                          disabled={analyzingFace}
                          className="flex min-h-[48px] items-center justify-center gap-2 rounded-[8px] border border-[#C4D0D7] bg-white px-4 py-3 text-sm font-bold text-[#0B3B49] transition-colors hover:bg-[#F4F6F8] cursor-pointer"
                        >
                          {analyzingFace && <Loader2 className="h-4 w-4 animate-spin" />}
                          Foto de teste
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: Home Location Confirmation */}
                  <div className="flex flex-col justify-between rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-5">
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="flex items-center gap-2 font-display text-base font-extrabold text-[#0B3B49]">
                          <HomeGeofenceIcon />
                          2. Localização em casa
                        </h3>
                        {gpsDistance !== null && (
                          <span
                            className={`rounded-[4px] px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                              isWithinRadius
                                ? 'bg-[#E6F4ED] text-[#156F48]'
                                : 'bg-[#FDE8E6] text-[#B52B1E]'
                            }`}
                          >
                            {isWithinRadius
                              ? `Em casa (${formatDistance(gpsDistance)})`
                              : `Fora (${formatDistance(gpsDistance)})`}
                          </span>
                        )}
                      </div>

                      <GeofenceMiniMap
                        homeCoords={family.coords}
                        captureCoords={gpsCoords}
                        isWithinRadius={isWithinRadius}
                      />

                      {gpsDistance !== null && (
                        <div
                          className={`mt-3 flex items-start gap-2 rounded-[8px] p-3 text-xs sm:text-sm ${
                            isWithinRadius
                              ? 'bg-[#E6F4ED] text-[#0F4D32]'
                              : 'bg-[#FDE8E6] text-[#8E2016]'
                          }`}
                        >
                          {isWithinRadius ? (
                            <UserRoundCheck className="mt-0.5 h-4 w-4 shrink-0" />
                          ) : (
                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                          )}
                          <div>
                            <strong>{gpsModeLabel}:</strong>{' '}
                            {isWithinRadius
                              ? `${formatDistance(gpsDistance)} do imóvel cadastrado.`
                              : `${formatDistance(gpsDistance)} da residência (limite ${RAIO_TOLERANCIA_GPS_METROS} m).`}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 space-y-2.5">
                      <button
                        type="button"
                        onClick={requestRealGps}
                        disabled={loadingGps}
                        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[8px] bg-[#0B3B49] px-4 py-3 text-sm font-extrabold text-white transition-all hover:bg-[#072933] active:scale-[0.98] cursor-pointer"
                      >
                        {loadingGps ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Crosshair className="h-4 w-4 text-[#E89B0C]" />
                        )}
                        {loadingGps ? 'Verificando localização...' : 'Usar minha localização'}
                      </button>

                      {/* Clean 2-Scenario Presentation Bar (Em casa + Fora 14 km — NO Fake GPS button!) */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={simulateHomeGps}
                          className="min-h-[44px] rounded-[8px] border border-[#156F48]/40 bg-[#E6F4ED] px-3 py-2 text-xs font-extrabold text-[#156F48] transition-colors hover:bg-[#D5ECE0] cursor-pointer sm:text-sm"
                        >
                          Em casa
                        </button>
                        <button
                          type="button"
                          onClick={simulateFarGps}
                          className="min-h-[44px] rounded-[8px] border border-[#D93829]/40 bg-[#FDE8E6] px-3 py-2 text-xs font-extrabold text-[#B52B1E] transition-colors hover:bg-[#FAD6D2] cursor-pointer sm:text-sm"
                        >
                          Fora 14 km
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#DCE3E8] pt-5">
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setStep(1);
                    }}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-[8px] border border-[#C4D0D7] px-5 py-3 text-sm font-bold text-[#52646D] transition-colors hover:bg-[#F4F6F8] cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!facialResult || gpsDistance === null}
                    className="inline-flex min-h-[52px] items-center gap-2 rounded-[8px] bg-[#D93829] px-7 py-3 text-base font-extrabold text-white transition-all hover:bg-[#B52B1E] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#C4D0D7] cursor-pointer"
                  >
                    Continuar
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Simple Self-Declaration */}
            {step === 3 && (
              <div key="step-3" className="anim-step space-y-6">
                <div>
                  <h3 className="font-display text-xl font-extrabold text-[#0B3B49]">
                    Como está a situação de trabalho na sua casa?
                  </h3>
                  <p className="mt-1 text-sm text-[#52646D]">
                    Toque na opção que mais se parece com a sua rotina hoje:
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      'Mantive a mesma situação (sem carteira assinada)',
                      'Trabalho por conta própria ou economia solidária',
                      'Consegui emprego com carteira assinada (CLT)',
                      'Aposentado, idoso ou pessoa com deficiência (PcD)',
                    ].map((option) => {
                      const selected = declaredOcc === option;
                      return (
                        <button
                          type="button"
                          key={option}
                          onClick={() => setDeclaredOcc(option)}
                          className={`flex min-h-[60px] items-center justify-between gap-3 rounded-[10px] border p-4 text-left text-sm font-semibold transition-all cursor-pointer ${
                            selected
                              ? 'border-[#0B3B49] bg-[#0B3B49] text-white'
                              : 'border-[#DCE3E8] bg-[#F9FBFC] text-[#11222B] hover:border-[#0B3B49]/40'
                          }`}
                        >
                          <span>{option}</span>
                          <span
                            className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                              selected ? 'border-[#E89B0C] bg-[#E89B0C]' : 'border-[#C4D0D7]'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] p-4 text-sm sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-[#52646D]">Forma de validação</div>
                    <strong className="mt-0.5 block text-[#0B3B49]">
                      {assistedMode ? 'Presencial assistida' : 'Foto e localização'}
                    </strong>
                  </div>
                  <div>
                    <div className="text-xs text-[#52646D]">Biometria</div>
                    <strong className="mt-0.5 block text-[#156F48]">
                      Aprovada ({facialResult?.match ?? 98.4}%)
                    </strong>
                  </div>
                  <div>
                    <div className="text-xs text-[#52646D]">Localização</div>
                    <strong className={`mt-0.5 block ${isWithinRadius ? 'text-[#156F48]' : 'text-[#D93829]'}`}>
                      {isWithinRadius
                        ? `Confirmada (${formatDistance(gpsDistance ?? 5)})`
                        : `Fora do raio (${formatDistance(gpsDistance ?? 0)})`}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#DCE3E8] pt-5">
                  <button
                    type="button"
                    onClick={() => setStep(assistedMode ? 1 : 2)}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-[8px] border border-[#C4D0D7] px-5 py-3 text-sm font-bold text-[#52646D] hover:bg-[#F4F6F8] cursor-pointer"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </button>
                  <button
                    type="button"
                    onClick={handleFinishProof}
                    className="inline-flex min-h-[52px] items-center gap-2 rounded-[8px] bg-[#156F48] px-7 py-3 text-base font-extrabold text-white transition-all hover:bg-[#115B3B] active:scale-[0.98] cursor-pointer"
                  >
                    Enviar prova de vida
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Animated Receipt */}
            {step === 4 && (
              <div key="step-4" className="anim-step space-y-6">
                {finalOutcome === 'APROVADO' ? (
                  <div className="flex flex-col items-center rounded-[12px] border border-[#156F48]/30 bg-[#E6F4ED] px-6 py-10 text-center">
                    <VerifiedSealGraphic />
                    <h3 className="font-display mt-5 text-2xl font-extrabold text-[#0F4D32] sm:text-3xl">
                      Tudo certo, {family.titularName.split(' ')[0]}
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-[#156F48] sm:text-base">
                      Sua prova de vida foi confirmada e enviada ao Banco Mumbuca. A próxima
                      confirmação será daqui a 90 dias.
                    </p>

                    <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-4 rounded-[10px] border border-[#156F48]/20 bg-white p-5 text-left text-sm sm:grid-cols-3">
                      <div>
                        <div className="text-xs text-[#52646D]">Protocolo</div>
                        <strong className="mt-0.5 block text-[#0B3B49]">
                          {family.lastProofOfLife.id}
                        </strong>
                      </div>
                      <div>
                        <div className="text-xs text-[#52646D]">Banco Mumbuca</div>
                        <strong className="mt-0.5 block text-[#156F48]">Conta liberada</strong>
                      </div>
                      <div>
                        <div className="text-xs text-[#52646D]">Distrito</div>
                        <strong className="mt-0.5 block text-[#0B3B49]">{district.shortName}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4 rounded-[12px] border border-[#D93829]/30 bg-[#FDE8E6] p-6">
                    <AlertTriangle className="mt-0.5 h-8 w-8 shrink-0 text-[#D93829]" />
                    <div>
                      <h3 className="font-display text-xl font-extrabold text-[#8E2016]">
                        Endereço fora da área cadastrada
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-[#8E2016]">
                        A captura ocorreu a {formatDistance(gpsDistance ?? 0)} da residência
                        cadastrada (limite de {RAIO_TOLERANCIA_GPS_METROS} m). Tente novamente
                        dentro de casa ou procure o CRAS ou uma Unidade de Saúde da Família em{' '}
                        {district.shortName} com comprovante de residência.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setFacialResult(null);
                      setGpsCoords(null);
                      setGpsDistance(null);
                      setInstabilityNotice(null);
                      setFinalOutcome(null);
                    }}
                    className="min-h-[48px] rounded-[8px] border border-[#C4D0D7] px-6 py-3 text-sm font-bold text-[#0B3B49] transition-colors hover:bg-[#F4F6F8] cursor-pointer"
                  >
                    Fazer nova consulta
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
