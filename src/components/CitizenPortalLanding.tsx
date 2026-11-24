import {
  ChevronDown,
  Contrast,
  Menu,
  ShieldCheck,
  UserCheck,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import { BeneficiaryAppForm } from './BeneficiaryAppForm';
import {
  StepAlertGraphic,
  StepRenewGraphic,
  StepSelfieGpsGraphic,
} from './CivicIcons';
import { IntegraLogo } from './IntegraLogo';
import { NearbyUsfMap } from './NearbyUsfMap';
import { PortalFooter } from './PortalFooter';

const FAQ_ITEMS = [
  {
    q: 'Se o meu cadastro vencer após 3 meses, meu benefício é suspenso automaticamente?',
    a: 'Não. O vencimento cadastral de 3 meses não suspende automaticamente nenhum benefício. O sistema apenas envia lembretes para atualização dos dados, pois qualquer consequência administrativa depende das regras específicas de cada programa municipal.',
  },
  {
    q: 'Preciso preencher tudo de novo a cada atualização trimestral?',
    a: 'Não. Basta localizar seu CPF para carregar seus dados atuais e atualizar apenas o que mudou — como um novo emprego, mudança de renda ou endereço. Todas as informações anteriores continuam guardadas no histórico.',
  },
  {
    q: 'A captura facial (biometria) é obrigatória?',
    a: 'Não. Por ser um dado pessoal sensível pela LGPD, a biometria facial exige consentimento expresso e oferece alternativa de validação documental presencial no CRAS ou na Unidade de Saúde da Família mais próxima.',
  },
  {
    q: 'Como meus dados pessoais e meu endereço são protegidos?',
    a: 'O sistema segue rigorosamente a LGPD (Lei nº 13.709/2018): usa criptografia, controle de permissões por perfil e trilha de auditoria. Para análises gerais de políticas públicas, apenas dados agregados por bairro são exibidos, sem expor o endereço exato de cada família.',
  },
];

export function CitizenPortalLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fontStep, setFontStep] = useState<0 | 1 | 2>(0);
  const [highContrast, setHighContrast] = useState(false);

  const stepsReveal = useReveal();
  const supportReveal = useReveal();
  const faqReveal = useReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('a11y-lg', 'a11y-xl', 'a11y-contrast');
    if (fontStep === 1) root.classList.add('a11y-lg');
    if (fontStep === 2) root.classList.add('a11y-xl');
    if (highContrast) root.classList.add('a11y-contrast');
    return () => {
      root.classList.remove('a11y-lg', 'a11y-xl', 'a11y-contrast');
    };
  }, [fontStep, highContrast]);

  const navLinks = [
    { href: '#inicio', label: 'Início' },
    { href: '#cadastro', label: 'Cadastro' },
    { href: '#como-funciona', label: 'Ciclo trimestral' },
    { href: '#apoio', label: 'Onde ir' },
    { href: '#duvidas', label: 'Dúvidas' },
  ];

  const solidHeader = scrolled || mobileMenuOpen;

  return (
    <div id="inicio" className="min-h-screen bg-[#F4F6F8] text-[#11222B]">
      <a
        href="#cadastro"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1200] focus:rounded-[6px] focus:bg-[#E89B0C] focus:px-4 focus:py-2.5 focus:text-sm focus:font-extrabold focus:text-[#072933]"
      >
        Ir direto para o cadastro do beneficiário
      </a>

      {/* Public Header + Accessibility Bar */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          solidHeader
            ? 'border-b border-[#DCE3E8] bg-white shadow-[0_6px_24px_-12px_rgba(11,59,73,0.18)]'
            : 'border-b border-white/10 bg-[#072933]/80'
        }`}
      >
        <div
          className={`border-b text-xs transition-colors ${
            solidHeader
              ? 'border-[#DCE3E8] bg-[#F4F6F8] text-[#0B3B49]'
              : 'border-white/10 bg-[#051F27] text-[#D8E7EC]'
          }`}
        >
          <div className="mx-auto flex h-9 max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6">
            <span className="hidden font-medium sm:inline">
              Acessibilidade do portal do beneficiário
            </span>
            <span className="font-medium sm:hidden">Acessibilidade</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFontStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2) : 0))}
                aria-label="Diminuir tamanho da letra"
                className={`rounded-[4px] border px-2 py-0.5 font-bold cursor-pointer ${
                  solidHeader
                    ? 'border-[#C4D0D7] bg-white hover:bg-[#EDF4F6]'
                    : 'border-white/25 hover:bg-white/10'
                }`}
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontStep(0)}
                aria-label="Tamanho padrão da letra"
                className={`rounded-[4px] border px-2 py-0.5 font-bold cursor-pointer ${
                  solidHeader
                    ? 'border-[#C4D0D7] bg-white hover:bg-[#EDF4F6]'
                    : 'border-white/25 hover:bg-white/10'
                }`}
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : 2))}
                aria-label="Aumentar tamanho da letra"
                className={`rounded-[4px] border px-2 py-0.5 font-bold cursor-pointer ${
                  solidHeader
                    ? 'border-[#C4D0D7] bg-white hover:bg-[#EDF4F6]'
                    : 'border-white/25 hover:bg-white/10'
                }`}
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setHighContrast((v) => !v)}
                aria-pressed={highContrast}
                className={`inline-flex items-center gap-1 rounded-[4px] border px-2.5 py-0.5 font-bold cursor-pointer ${
                  highContrast
                    ? 'border-[#E89B0C] bg-[#E89B0C] text-[#072933]'
                    : solidHeader
                      ? 'border-[#C4D0D7] bg-white hover:bg-[#EDF4F6]'
                      : 'border-white/25 hover:bg-white/10'
                }`}
              >
                <Contrast className="h-3.5 w-3.5" />
                <span>Contraste</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto flex h-[74px] max-w-[1320px] items-center justify-between gap-3 px-4 sm:px-6">
          <a href="#inicio" className="shrink-0" onClick={() => setMobileMenuOpen(false)}>
            <IntegraLogo
              variant={solidHeader ? 'dark' : 'light'}
              size="md"
              showSubtitle
              subtitle="Prefeitura de Maricá"
            />
          </a>

          <nav aria-label="Navegação do portal" className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`relative py-1 text-[15px] font-semibold transition-colors after:absolute after:bottom-0 after:left-0 after:h-[2.5px] after:w-0 after:bg-[#D93829] after:transition-all after:duration-200 hover:after:w-full ${
                  solidHeader
                    ? 'text-[#3B5560] hover:text-[#0B3B49]'
                    : 'text-[#E5F0F4] hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <a
              href="#cadastro"
              className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] bg-[#D93829] px-3 py-2 text-xs font-extrabold text-white transition-all hover:bg-[#B52B1E] active:scale-[0.98] sm:gap-2 sm:px-5 sm:py-2.5 sm:text-sm"
            >
              <UserCheck className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Atualizar cadastro</span>
              <span className="sm:hidden">Meu cadastro</span>
            </a>

            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-[8px] border transition-colors lg:hidden cursor-pointer ${
                solidHeader
                  ? 'border-[#DCE3E8] text-[#0B3B49] hover:bg-[#F4F6F8]'
                  : 'border-white/30 text-white hover:bg-white/10'
              }`}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            aria-label="Menu móvel"
            className="anim-step border-t border-[#DCE3E8] bg-white px-4 py-4 shadow-lg lg:hidden"
          >
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[46px] items-center rounded-[8px] px-3 text-base font-bold text-[#0B3B49] hover:bg-[#EDF4F6]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Full-Bleed Editorial Hero */}
      <section className="relative flex min-h-[88dvh] items-center overflow-hidden bg-[#072933] pt-32 pb-20 text-white">
        <img
          src={`${import.meta.env.BASE_URL}hero-marica.jpg`}
          alt="Moradora de Maricá atualizando seu cadastro social pelo celular na varanda de casa"
          className="anim-hero-photo absolute inset-0 h-full w-full object-cover object-[72%_center] sm:object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(96deg, rgba(7,41,51,0.96) 0%, rgba(7,41,51,0.88) 46%, rgba(7,41,51,0.40) 74%, rgba(7,41,51,0.16) 100%)',
          }}
        />

        <div className="relative mx-auto grid w-full max-w-[1320px] grid-cols-1 items-end gap-10 px-4 sm:px-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <div className="anim-hero-1 inline-flex items-center gap-2.5 text-sm font-bold text-[#E89B0C]">
              <span className="h-[3px] w-8 bg-[#E89B0C]" />
              Cadastro Socioeconômico de Maricá
            </div>

            <h1 className="anim-hero-2 font-display mt-5 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[60px]">
              Seu cadastro sempre em dia, do jeito mais simples
            </h1>

            <p className="anim-hero-3 mt-5 max-w-xl text-base leading-relaxed text-[#E3EEF2] sm:text-lg">
              Atualize seus dados pessoais, profissionais e de moradia a cada 3 meses pelo celular
              ou presencialmente. O histórico completo é preservado e{' '}
              <strong className="text-white">nenhum benefício é suspenso automaticamente</strong>.
            </p>

            <div className="anim-hero-4 mt-8 flex flex-wrap items-center gap-3.5">
              <a
                href="#cadastro"
                className="inline-flex min-h-[54px] items-center justify-center rounded-[8px] bg-[#D93829] px-7 py-3.5 text-base font-extrabold text-white transition-all hover:bg-[#B52B1E] active:scale-[0.98]"
              >
                Acessar meu cadastro
              </a>
              <a
                href="#apoio"
                className="inline-flex min-h-[54px] items-center justify-center rounded-[8px] border border-white/40 bg-[#072933]/65 px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-white/15"
              >
                Unidade de Saúde perto de mim
              </a>
            </div>

            <div className="anim-hero-4 mt-12 grid max-w-xl grid-cols-3 gap-6 border-t border-white/20 pt-6">
              <div>
                <div className="font-display text-3xl font-extrabold text-[#E89B0C] tabular-nums sm:text-4xl">
                  5
                </div>
                <div className="mt-1 text-xs font-medium text-[#D0E1E7] sm:text-sm">
                  Distritos integrados
                </div>
              </div>
              <div>
                <div className="font-display text-3xl font-extrabold text-[#E89B0C] tabular-nums sm:text-4xl">
                  50
                </div>
                <div className="mt-1 text-xs font-medium text-[#D0E1E7] sm:text-sm">
                  Bairros mapeados
                </div>
              </div>
              <div>
                <div className="font-display text-3xl font-extrabold text-[#E89B0C] tabular-nums sm:text-4xl">
                  90 dias
                </div>
                <div className="mt-1 text-xs font-medium text-[#D0E1E7] sm:text-sm">
                  Ciclo de atualização
                </div>
              </div>
            </div>
          </div>

          <div className="anim-hero-4 hidden justify-end lg:flex">
            <div className="max-w-sm rounded-[12px] border border-white/20 bg-[#072933]/92 p-6 text-white">
              <div className="flex items-center gap-2 text-sm font-bold text-[#E89B0C]">
                <ShieldCheck className="h-5 w-5" />
                Privacidade e segurança LGPD
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-[#E3EEF2]">
                Seus dados pessoais são protegidos por criptografia e controle de permissões.
                Análises gerais usam apenas indicadores agregados por bairro.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Beneficiary Modular Registration & Update App */}
      <section id="cadastro" className="scroll-mt-24 border-b border-[#DCE3E8] bg-white">
        <BeneficiaryAppForm />
      </section>

      {/* Quarterly Cycle Explanation */}
      <section
        id="como-funciona"
        className="scroll-mt-24 bg-[#0B3B49] py-16 text-white sm:py-20"
      >
        <div
          ref={stepsReveal.ref}
          className={`reveal-block mx-auto max-w-[1320px] px-4 sm:px-6 ${stepsReveal.visible ? 'is-visible' : ''}`}
        >
          <div className="max-w-2xl">
            <div className="h-[4px] w-14 bg-[#E89B0C]" />
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Como funciona o ciclo de atualização de 3 meses
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#C2D6DC] sm:text-lg">
              Você mantém seu cadastro atualizado sem burocracia e ajuda o município a planejar
              cursos, vagas de emprego, saúde e assistência onde as famílias mais precisam.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                graphic: <StepAlertGraphic />,
                title: '1. Lembrete automático',
                text: 'Antes de completar 3 meses, o sistema avisa que é hora de revisar seus dados. O vencimento nunca suspende benefícios automaticamente.',
              },
              {
                graphic: <StepSelfieGpsGraphic />,
                title: '2. Atualize apenas o que mudou',
                text: 'Localize seu CPF, informe mudanças de emprego, renda ou endereço e anexe documentos pelo celular ou com apoio em campo.',
              },
              {
                graphic: <StepRenewGraphic />,
                title: '3. Histórico sempre preservado',
                text: 'As informações anteriores ficam registradas para acompanhar a evolução econômica real das famílias ao longo do tempo.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[12px] border border-white/12 bg-[#072933] p-6"
              >
                {item.graphic}
                <h3 className="font-display mt-5 text-xl font-extrabold text-white">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-[#D0E1E7] sm:text-base">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nearby Health Units & In-Person Support */}
      <section
        id="apoio"
        className="scroll-mt-24 border-b border-[#DCE3E8] bg-white py-16 sm:py-20"
      >
        <div
          ref={supportReveal.ref}
          className={`reveal-block mx-auto max-w-[1320px] px-4 sm:px-6 ${supportReveal.visible ? 'is-visible' : ''}`}
        >
          <div className="mb-8 max-w-3xl">
            <div className="h-[4px] w-14 bg-[#0E7490]" />
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-[#0B3B49] sm:text-4xl">
              Atendimento presencial perto da sua casa
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#52646D] sm:text-lg">
              Prefere fazer o cadastro ou a atualização com ajuda presencial? Encontre no mapa a{' '}
              <strong className="text-[#0B3B49]">Unidade de Saúde da Família</strong> mais próxima
              ou procure o CRAS do seu distrito.
            </p>
          </div>

          <NearbyUsfMap />
        </div>
      </section>

      {/* Smooth Accessible FAQ */}
      <section
        id="duvidas"
        className="scroll-mt-24 bg-[#F4F6F8] py-16 sm:py-20"
      >
        <div
          ref={faqReveal.ref}
          className={`reveal-block mx-auto max-w-[980px] px-4 sm:px-6 ${faqReveal.visible ? 'is-visible' : ''}`}
        >
          <div className="h-[4px] w-14 bg-[#D93829]" />
          <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-[#0B3B49] sm:text-4xl">
            Perguntas frequentes
          </h2>

          <div className="mt-8 divide-y divide-[#DCE3E8] overflow-hidden rounded-[12px] border border-[#DCE3E8] bg-white">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex min-h-[62px] w-full items-center justify-between gap-4 px-6 py-4 text-left font-display text-base font-bold text-[#0B3B49] transition-colors hover:bg-[#F8FAFB] cursor-pointer sm:text-lg"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-[#52646D] transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#D93829]' : ''
                      }`}
                    />
                  </button>
                  <div className="accordion-panel" data-open={isOpen}>
                    <div className="accordion-inner">
                      <p className="px-6 pb-5 text-sm leading-relaxed text-[#52646D] sm:text-base">
                        {item.a}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <PortalFooter />
    </div>
  );
}
