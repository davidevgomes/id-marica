import {
  Briefcase,
  ChevronDown,
  Contrast,
  HeartPulse,
  Menu,
  ScanFace,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useReveal } from '../hooks/useReveal';
import { CitizenProofOfLife } from './CitizenProofOfLife';
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
    q: 'Meu cartão ou o aplicativo do Banco Mumbuca vão mudar?',
    a: 'Não. Sua conta, seu cartão e o aplicativo do Banco Mumbuca continuam exatamente iguais. O Integra Maricá apenas confirma seu cadastro e libera o pagamento automaticamente.',
  },
  {
    q: 'Idosos e pessoas com deficiência precisam usar o celular?',
    a: 'Não é obrigatório. Pessoas idosas, pessoas com deficiência ou moradores sem celular com GPS podem fazer a prova de vida presencialmente em qualquer uma das 29 Unidades de Saúde da Família, nos CRAS de Maricá ou por visita em casa.',
  },
  {
    q: 'O que acontece se eu conseguir um emprego com carteira assinada?',
    a: 'O sistema identifica o vínculo automaticamente e ativa o Mumbuca Trabalho (M$ 350), mantendo o apoio aos dependentes da família. Em caso de demissão sem justa causa, o retorno à cota integral é automático.',
  },
  {
    q: 'E se o sinal de GPS falhar ou eu estiver fora de casa?',
    a: 'Se houver instabilidade no GPS, o site avisa na hora para você tentar perto de uma janela. Se estiver fora do endereço cadastrado, basta repetir em casa ou procurar a Unidade de Saúde da Família ou o CRAS mais próximo.',
  },
];

export function CitizenPortalLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [fontStep, setFontStep] = useState<0 | 1 | 2>(0);
  const [highContrast, setHighContrast] = useState(false);

  const cadastroReveal = useReveal(0.06);
  const journeyReveal = useReveal(0.1);
  const supportReveal = useReveal(0.08);
  const faqReveal = useReveal(0.1);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('a11y-lg', 'a11y-xl', 'a11y-contrast');
    if (fontStep === 1) html.classList.add('a11y-lg');
    if (fontStep === 2) html.classList.add('a11y-xl');
    if (highContrast) html.classList.add('a11y-contrast');
  }, [fontStep, highContrast]);

  const navLinks = [
    { href: '#inicio', label: 'Início' },
    { href: '#cadastro', label: 'Prova de vida' },
    { href: '#como-funciona', label: 'Como funciona' },
    { href: '#apoio', label: 'Onde ir' },
    { href: '#duvidas', label: 'Dúvidas' },
  ];

  const solidHeader = scrolled || mobileMenuOpen;

  return (
    <div id="inicio" className="min-h-screen bg-[#F4F6F8]">
      {/* Skip Link for Keyboard / Screen Reader Accessibility */}
      <a
        href="#cadastro"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[2000] focus:rounded-[6px] focus:bg-[#D93829] focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        Ir direto para o cadastro e prova de vida
      </a>

      {/* Fixed Header with Real Accessibility Controls */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          solidHeader
            ? 'border-b border-[#DCE3E8] bg-white text-[#0B3B49] shadow-[0_6px_24px_-12px_rgba(11,59,73,0.18)]'
            : 'bg-transparent text-white'
        }`}
      >
        {/* Top Accessibility Strip */}
        <div
          className={`border-b text-xs transition-colors ${
            solidHeader
              ? 'border-[#DCE3E8] bg-[#F4F6F8] text-[#0B3B49]'
              : 'border-white/15 bg-[#072933]/85 text-[#D8E7EC]'
          }`}
        >
          <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-2 px-4 py-1.5 sm:px-6">
            <span className="hidden font-medium sm:inline">
              Acessibilidade do portal do cidadão
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

        {/* Main Navigation Row */}
        <div className="mx-auto flex h-[74px] max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6">
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
              <ScanFace className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Fazer prova de vida</span>
              <span className="sm:hidden">Prova de vida</span>
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

        {/* Accessible Mobile Menu Drawer */}
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
                  className="flex min-h-[48px] items-center rounded-[8px] px-4 text-base font-bold text-[#0B3B49] hover:bg-[#F4F6F8]"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Bold Full-Bleed Editorial Hero */}
      <section className="relative flex min-h-[88dvh] items-center overflow-hidden bg-[#072933] pt-32 pb-20 text-white">
        <img
          src={`${import.meta.env.BASE_URL}hero-marica.jpg`}
          alt="Moradora de Maricá confirmando seu cadastro pelo celular na varanda de casa"
          className="anim-hero-photo absolute inset-0 h-full w-full object-cover object-[72%_center] sm:object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(96deg, rgba(7,41,51,0.96) 0%, rgba(7,41,51,0.88) 46%, rgba(7,41,51,0.40) 74%, rgba(7,41,51,0.16) 100%)',
          }}
        />

        <div className="relative mx-auto w-full max-w-[1320px] px-4 sm:px-6">
          <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="max-w-2xl">
              <div className="anim-hero-1 inline-flex items-center gap-3">
                <span className="h-[3px] w-10 bg-[#E89B0C]" />
                <span className="text-sm font-bold text-[#E89B0C] sm:text-base">
                  Portal do Cidadão de Maricá
                </span>
              </div>

              <h1 className="anim-hero-2 font-display mt-5 text-4xl font-extrabold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[62px]">
                Confirme seu benefício sem sair de casa
              </h1>

              <p className="anim-hero-3 mt-6 max-w-xl text-base leading-relaxed text-[#E2EFF2] sm:text-lg">
                Faça a prova de vida trimestral e mantenha seu cadastro atualizado pelo celular. Seu
                cartão e o aplicativo do <strong>Banco Mumbuca</strong> seguem funcionando
                normalmente.
              </p>

              <div className="anim-hero-3 mt-9 flex flex-wrap items-center gap-4">
                <a
                  href="#cadastro"
                  className="inline-flex min-h-[56px] items-center justify-center rounded-[8px] bg-[#D93829] px-8 py-4 text-base font-extrabold text-white transition-all hover:bg-[#B52B1E] active:scale-[0.98]"
                >
                  Iniciar prova de vida agora
                </a>
                <a
                  href="#apoio"
                  className="inline-flex min-h-[56px] items-center justify-center rounded-[8px] border border-white/45 bg-[#072933]/65 px-6 py-4 text-base font-bold text-white transition-colors hover:bg-[#072933]"
                >
                  Unidade de Saúde perto de mim
                </a>
              </div>

              {/* Generous Municipal Numbers */}
              <div className="anim-hero-4 mt-12 flex flex-wrap items-start gap-10 border-t border-white/20 pt-8">
                <div>
                  <div className="font-display text-4xl font-extrabold leading-none text-[#E89B0C] tabular-nums">
                    5
                  </div>
                  <div className="mt-2 text-sm text-[#CBE0E6]">Distritos de Maricá</div>
                </div>
                <div>
                  <div className="font-display text-4xl font-extrabold leading-none text-[#E89B0C] tabular-nums">
                    50
                  </div>
                  <div className="mt-2 text-sm text-[#CBE0E6]">Bairros atendidos</div>
                </div>
                <div>
                  <div className="font-display text-4xl font-extrabold leading-none text-[#E89B0C] tabular-nums">
                    29
                  </div>
                  <div className="mt-2 text-sm text-[#CBE0E6]">
                    Unidades de Saúde da Família
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom-Right Reassurance Card */}
            <div className="anim-hero-4 hidden justify-end lg:flex">
              <div className="max-w-sm rounded-[12px] border border-white/20 bg-[#072933]/92 p-6 text-white">
                <div className="flex items-center gap-2.5 text-sm font-bold text-[#E89B0C]">
                  <Wallet className="h-5 w-5" />
                  Banco Mumbuca sem alterações
                </div>
                <p className="mt-2.5 text-sm leading-relaxed text-[#D8E7EC]">
                  Você continua usando o mesmo cartão e o mesmo aplicativo para pagar no comércio de
                  Maricá. Aqui você só confirma que está tudo em dia.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Focal Band: Citizen Registration & Proof of Life Studio */}
      <section
        id="cadastro"
        ref={cadastroReveal.ref}
        className={`reveal-block scroll-mt-28 border-b border-[#DCE3E8] bg-white ${
          cadastroReveal.visible ? 'is-visible' : ''
        }`}
      >
        <CitizenProofOfLife />
      </section>

      {/* Visual 3-Step Journey (Deep Atlantic Teal Band with Custom Graphics) */}
      <section
        id="como-funciona"
        ref={journeyReveal.ref}
        className={`reveal-block scroll-mt-28 bg-[#0B3B49] py-20 text-white ${
          journeyReveal.visible ? 'is-visible' : ''
        }`}
      >
        <div className="mx-auto max-w-[1260px] px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="h-[4px] w-14 bg-[#E89B0C]" />
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Como funciona o ciclo de 90 dias
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#C2D6DC] sm:text-lg">
              Um passo a passo simples, pensado para qualquer morador concluir sem dificuldade.
            </p>
          </div>

          <ol className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            <li className="rounded-[12px] border border-white/15 bg-[#072933]/70 p-6">
              <div className="flex items-center justify-between">
                <StepAlertGraphic />
                <span className="font-display text-sm font-extrabold text-[#E89B0C]">Passo 1</span>
              </div>
              <h3 className="font-display mt-5 text-xl font-extrabold text-white">
                Aviso 15 dias antes
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#C2D6DC] sm:text-base">
                Antes de vencer o trimestre, você recebe uma mensagem avisando o prazo para
                confirmar seu cadastro sem correr risco de bloqueio.
              </p>
            </li>

            <li className="rounded-[12px] border border-white/15 bg-[#072933]/70 p-6">
              <div className="flex items-center justify-between">
                <StepSelfieGpsGraphic />
                <span className="font-display text-sm font-extrabold text-[#E89B0C]">Passo 2</span>
              </div>
              <h3 className="font-display mt-5 text-xl font-extrabold text-white">
                Foto e localização em casa
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#C2D6DC] sm:text-base">
                Pelo celular, a câmera confirma sua identidade Gov.br e a localização valida o raio
                de 100 metros da sua residência em Maricá.
              </p>
            </li>

            <li className="rounded-[12px] border border-white/15 bg-[#072933]/70 p-6">
              <div className="flex items-center justify-between">
                <StepRenewGraphic />
                <span className="font-display text-sm font-extrabold text-[#E89B0C]">Passo 3</span>
              </div>
              <h3 className="font-display mt-5 text-xl font-extrabold text-white">
                Benefício liberado na hora
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-[#C2D6DC] sm:text-base">
                O comprovante sai imediatamente na tela e o pagamento continua garantido por mais 90
                dias no Banco Mumbuca.
              </p>
            </li>
          </ol>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-white/15 bg-[#072933] px-6 py-6">
            <div className="flex items-start gap-4">
              <Briefcase className="mt-0.5 h-6 w-6 shrink-0 text-[#E89B0C]" />
              <div className="max-w-2xl text-sm leading-relaxed text-[#D8E7EC] sm:text-base">
                <strong className="text-white">Assinou carteira de trabalho?</strong> O Integra
                Maricá ativa automaticamente o <strong>Mumbuca Trabalho (M$ 350)</strong> sem cortar
                o apoio dos dependentes, e garante retorno automático em caso de demissão.
              </div>
            </div>
            <a
              href="#cadastro"
              className="inline-flex min-h-[48px] shrink-0 items-center rounded-[8px] bg-[#E89B0C] px-6 py-3 text-sm font-extrabold text-[#072933] transition-colors hover:bg-[#D48D09]"
            >
              Consultar meu cadastro
            </a>
          </div>
        </div>
      </section>

      {/* Band 4: Interactive Map — Unidade de Saúde da Família perto de mim */}
      <section
        id="apoio"
        ref={supportReveal.ref}
        className={`reveal-block scroll-mt-28 border-b border-[#DCE3E8] bg-white py-20 ${
          supportReveal.visible ? 'is-visible' : ''
        }`}
      >
        <div className="mx-auto max-w-[1260px] px-4 sm:px-6">
          <div className="mb-8 max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-bold text-[#D93829]">
              <HeartPulse className="h-5 w-5" />
              Atendimento presencial gratuito
            </div>
            <h2 className="font-display mt-2 text-3xl font-extrabold text-[#0B3B49] sm:text-4xl">
              Encontre a Unidade de Saúde da Família perto de você
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#52646D] sm:text-lg">
              Idosos, pessoas com deficiência ou moradores que preferem ajuda presencial podem fazer
              a prova de vida gratuitamente em qualquer uma das 29 Unidades de Saúde da Família ou
              nos CRAS de Maricá.
            </p>
          </div>

          <NearbyUsfMap />

          <div className="mt-6 flex items-center gap-2.5 text-sm font-semibold text-[#156F48]">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            Leve apenas um documento oficial com foto e um comprovante de residência.
          </div>
        </div>
      </section>

      {/* Band 5: Accessible FAQ Accordion */}
      <section
        id="duvidas"
        ref={faqReveal.ref}
        className={`reveal-block scroll-mt-28 mx-auto max-w-[1000px] px-4 py-20 sm:px-6 ${
          faqReveal.visible ? 'is-visible' : ''
        }`}
      >
        <div className="mb-8">
          <div className="text-sm font-bold text-[#0E7490]">Tira-dúvidas</div>
          <h2 className="font-display mt-2 text-3xl font-extrabold text-[#0B3B49] sm:text-4xl">
            Perguntas frequentes
          </h2>
        </div>

        <div className="divide-y divide-[#DCE3E8] rounded-[12px] border border-[#DCE3E8] bg-white">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex min-h-[60px] w-full items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-[#F8FAFB] cursor-pointer"
                >
                  <span className="font-display text-base font-extrabold text-[#0B3B49] sm:text-lg">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#52646D] transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#D93829]' : ''
                    }`}
                  />
                </button>
                <div className="accordion-panel" data-open={isOpen}>
                  <div className="accordion-inner">
                    <div className="px-6 pb-5 text-sm leading-relaxed text-[#52646D] sm:text-base">
                      {item.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <PortalFooter />
    </div>
  );
}
