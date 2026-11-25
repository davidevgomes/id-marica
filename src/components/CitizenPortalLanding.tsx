import { ArrowDown, ArrowRight, Contrast, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BeneficiaryAppForm } from './BeneficiaryAppForm';
import { IdMaricaLogo } from './IdMaricaLogo';
import { NearbyUsfMap } from './NearbyUsfMap';
import { PortalFooter } from './PortalFooter';
import { PwaInstall } from './PwaInstall';

const PORTAL_NAV = [
  { href: '#cadastro', label: 'Cadastro' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#apoio', label: 'Onde buscar ajuda' },
  { href: '#duvidas', label: 'Dúvidas' },
  { href: '#instalar', label: 'Instalar no celular' },
];

const FAQ_ITEMS = [
  {
    question: 'O que preciso para começar?',
    answer: 'Tenha em mãos o CPF, o endereço e as informações sobre quem mora com você. Nesta demonstração, use dados fictícios ou um dos exemplos do formulário.',
  },
  {
    question: 'O que posso atualizar no recadastro?',
    answer: 'Você pode corrigir seu endereço, telefone, renda, trabalho e informações sobre quem mora com você.',
  },
  {
    question: 'Preciso usar a câmera?',
    answer: 'A etapa final oferece a opção de validação presencial. Na demonstração, você pode experimentar o fluxo com dados fictícios.',
  },
  {
    question: 'Onde posso buscar ajuda presencial?',
    answer: 'Use o mapa de serviços para encontrar um CRAS e consultar seus dados de contato. O CRAS orienta sobre o Cadastro Único e serviços de assistência social.',
  },
];

const REGISTRATION_STEPS = [
  ['Separe suas informações', 'Tenha à mão seu CPF, endereço e os dados de quem mora com você.'],
  ['Preencha ou atualize seu cadastro', 'Informe os benefícios e serviços que sua família já utiliza e revise os dados antes de concluir.'],
  ['Consulte a data no comprovante', 'O ciclo apresentado no protótipo é de três meses. Ao terminar, veja quando atualizar seus dados.'],
];

export function CitizenPortalLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [openQuestions, setOpenQuestions] = useState<string[]>([]);
  const [fontStep, setFontStep] = useState(0);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('a11y-lg', fontStep === 1);
    root.classList.toggle('a11y-xl', fontStep === 2);
    root.classList.toggle('a11y-contrast', highContrast);
    return () => root.classList.remove('a11y-lg', 'a11y-xl', 'a11y-contrast');
  }, [fontStep, highContrast]);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <div id="inicio" className="citizen-portal min-h-screen bg-[#F4F6F8] text-[#11222B]">
      <a href="#cadastro" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1200] focus:rounded-lg focus:bg-white focus:p-3">
        Ir direto para o cadastro
      </a>

      <div className="bg-[#072933] text-white">
        <div className="mx-auto flex min-h-10 max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6">
          <p id="portal-accessibility" className="min-w-0 py-1 text-xs leading-snug font-semibold text-[#D8E7EC] sm:text-sm">
            Acessibilidade do portal do beneficiário
          </p>
          <div className="flex shrink-0 items-center gap-1 text-xs font-semibold sm:gap-2" role="group" aria-labelledby="portal-accessibility">
            <button
              type="button"
              className="min-h-10 cursor-pointer rounded px-2 hover:bg-white/15"
              aria-label="Alternar tamanho do texto"
              onClick={() => setFontStep((step) => (step + 1) % 3)}
            >
              {['A+', 'A++', 'A−'][fontStep]}
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded px-2 hover:bg-white/15"
              aria-pressed={highContrast}
              onClick={() => setHighContrast((active) => !active)}
            >
              <Contrast aria-hidden="true" className="size-4" />
              Contraste
            </button>
          </div>
        </div>
      </div>

      <header ref={headerRef} className="sticky top-0 z-50 bg-[#0B2E38] text-white shadow-[0_3px_16px_#07293326]">
        <div className="relative mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-2 px-4 sm:px-6">
          <a href="#inicio" aria-label="ID Maricá, início" onClick={() => setMenuOpen(false)}>
            <IdMaricaLogo />
          </a>

          <div className="flex items-center gap-3">
            <a
              href="#cadastro"
              onClick={() => setMenuOpen(false)}
              className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-bold hover:bg-white/10 sm:inline-flex"
            >
              Meu cadastro
            </a>
            <button
              ref={menuButton}
              type="button"
              aria-expanded={menuOpen}
              aria-controls="portal-nav"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-white/30 px-3 text-sm font-bold text-white transition-colors hover:bg-white/10 aria-expanded:bg-white/15"
            >
              {menuOpen ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
              Menu
            </button>
          </div>

          <nav
            id="portal-nav"
            aria-label="Navegação do portal"
            data-open={menuOpen}
            inert={!menuOpen}
            className="citizen-menu absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border border-[#DCE3E8] bg-white p-2 text-[#0B3B49] shadow-xl sm:right-6 sm:left-auto sm:w-72 sm:rounded-b-xl"
          >
            {PORTAL_NAV.map(({ href, label }) => (
              <a key={href} href={href} onClick={() => setMenuOpen(false)} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-colors hover:bg-[#EDF4F6]">
                {label}
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-[#52646D]" />
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <section aria-labelledby="portal-title" className="citizen-hero relative isolate overflow-hidden bg-[#072933] text-white">
          <img
            src={`${import.meta.env.BASE_URL}hero-marica.jpg`}
            alt=""
            width="1376"
            height="768"
            fetchPriority="high"
            className="citizen-hero-photo absolute inset-0 -z-20 w-full object-cover"
          />
          <div className="mx-auto max-w-[1240px] px-4 pt-[8.6rem] pb-11 sm:px-6 sm:pt-18 sm:pb-25 lg:pt-22 lg:pb-29">
            <div className="anim-hero-2 max-w-[36rem]">
              <p className="mb-3 inline-flex items-center gap-2.5 text-sm font-bold text-[#FFD17A] sm:mb-5">
                <span aria-hidden="true" className="h-[3px] w-6 rounded-full bg-[#D93829]" />
                ID Maricá - identidade cidadã
              </p>
              <h1 id="portal-title" className="citizen-title font-display font-extrabold">
                Seu cadastro cidadão <span className="text-[#FFD17A]">em dia</span>
              </h1>
              <p className="mt-3 max-w-[26rem] text-base leading-relaxed text-[#E2EDF0] sm:mt-5 sm:text-lg">
                Faça ou atualize o cadastro da sua família para os benefícios sociais de Maricá.
              </p>
            </div>
          </div>
        </section>

        <section id="cadastro" tabIndex={-1} aria-label="Cadastro e atendimento" className="relative z-[1] -mt-6 scroll-mt-4 sm:-mt-12">
          <BeneficiaryAppForm />
        </section>

        <section id="como-funciona" tabIndex={-1} className="scroll-mt-4 border-y border-[#DCE3E8] bg-[#EDF4F6] py-12 sm:py-17">
          <div className="mx-auto grid max-w-[1240px] items-start gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <div>
              <h2 className="citizen-heading font-display font-extrabold text-[#0B3B49]">Como funciona o cadastro?</h2>
              <p className="mt-4 max-w-md leading-relaxed text-[#405661]">
                Ter os dados da sua família em dia ajuda a Prefeitura a entender onde fazem falta serviços e programas sociais.
              </p>
              <a href="#cadastro" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg font-bold text-[#0B3B49] underline-offset-4 hover:underline">
                Ir para o cadastro <ArrowRight aria-hidden="true" className="size-4" />
              </a>
            </div>
            <ol className="divide-y divide-[#D3E0E6] border-y border-[#D3E0E6]">
              {REGISTRATION_STEPS.map(([title, description], index) => (
                <li className="flex items-start gap-4 py-5" key={title}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0B3B49] text-sm font-extrabold text-white">{index + 1}</span>
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#0B3B49]">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#405661] sm:text-base">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="apoio" tabIndex={-1} className="scroll-mt-4 border-b border-[#DCE3E8] bg-white py-12 sm:py-17">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <h2 className="citizen-heading font-display font-extrabold text-[#0B3B49]">Serviços perto de você</h2>
            <p className="mt-3 mb-7 max-w-2xl text-base leading-relaxed text-[#405661]">
              Encontre postos de saúde, CRAS, escolas municipais e estações das Vermelhinhas. Escolha um tipo de serviço para ver os pontos no mapa.
            </p>
            <NearbyUsfMap />
          </div>
        </section>

        <section id="duvidas" tabIndex={-1} className="scroll-mt-4 py-12 sm:py-17">
          <div className="mx-auto grid max-w-[1240px] gap-7 px-4 sm:px-6 lg:grid-cols-[0.68fr_1fr] lg:gap-14">
            <h2 className="citizen-heading font-display font-extrabold text-[#0B3B49]">Dúvidas frequentes</h2>
            <div className="divide-y divide-[#DCE3E8] overflow-hidden rounded-2xl border border-[#DCE3E8] bg-white">
              {FAQ_ITEMS.map(({ question, answer }, index) => {
                const open = openQuestions.includes(question);
                return (
                  <div key={question}>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={`portal-answer-${index}`}
                      onClick={() => setOpenQuestions((questions) =>
                        questions.includes(question) ? questions.filter((item) => item !== question) : [...questions, question]
                      )}
                      className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left font-bold text-[#0B3B49] transition-colors hover:bg-[#EDF4F6] aria-expanded:bg-[#F4F8FA]"
                    >
                      {question}
                      <ArrowDown aria-hidden="true" className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    <div id={`portal-answer-${index}`} className="accordion-panel" data-open={open} inert={!open}>
                      <div className="accordion-inner">
                        <p className="px-5 py-4 text-sm leading-relaxed text-[#405661] sm:text-base">{answer}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
        <PwaInstall />
      </main>

      <PortalFooter />
    </div>
  );
}
