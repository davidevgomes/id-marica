import { ArrowDown, ArrowRight, Contrast, LockKeyhole, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useIntegra } from '../context/IntegraContext';
import { BeneficiaryAppForm } from './BeneficiaryAppForm';
import { IdMaricaLogo } from './IdMaricaLogo';
import { NearbyUsfMap } from './NearbyUsfMap';
import { PortalFooter } from './PortalFooter';

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
  const { enterManagement } = useIntegra();
  const [fontStep, setFontStep] = useState(0);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('a11y-lg', fontStep === 1);
    root.classList.toggle('a11y-xl', fontStep === 2);
    root.classList.toggle('a11y-contrast', highContrast);
    return () => root.classList.remove('a11y-lg', 'a11y-xl', 'a11y-contrast');
  }, [fontStep, highContrast]);

  return (
    <div id="inicio" className="citizen-portal min-h-screen bg-[#F7F7EE] text-[#11222B]">
      <a href="#cadastro" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1200] focus:rounded-lg focus:bg-white focus:p-3">
        Ir direto para o cadastro
      </a>

      <header className="border-b border-[#DDE4DB] bg-[#FBFCF7]">
        <div className="bg-[#0B3B49] text-white">
          <div className="mx-auto flex min-h-10 max-w-[1240px] flex-wrap items-center justify-between gap-x-3 px-4 sm:px-6">
            <p className="text-xs font-semibold leading-snug">Demonstração <span className="text-[#BCE7D9]">· use dados fictícios</span></p>
            <div className="flex items-center gap-2 text-xs font-semibold" role="group" aria-label="Acessibilidade">
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
        <div className="mx-auto flex min-h-[76px] max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="#inicio" aria-label="ID Maricá, início">
            <IdMaricaLogo variant="dark" showSubtitle />
          </a>
          <nav aria-label="Navegação do portal" className="hidden items-center gap-7 text-sm font-bold text-[#315659] md:flex">
            <a href="#cadastro" className="hover:text-[#0B3B49] hover:underline">Cadastro</a>
            <a href="#como-funciona" className="hover:text-[#0B3B49] hover:underline">Como funciona</a>
            <a href="#apoio" className="hover:text-[#0B3B49] hover:underline">Serviços próximos</a>
            <a href="#duvidas" className="hover:text-[#0B3B49] hover:underline">Dúvidas</a>
          </nav>
          <button
            type="button"
            onClick={() => enterManagement('mapa')}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#CDDAD4] bg-white px-3 text-xs font-bold text-[#0B3B49] hover:bg-[#E7F3EB] sm:px-4 sm:text-sm"
          >
            <LockKeyhole aria-hidden="true" className="size-4" />
            <span><span className="hidden sm:inline">Painel de </span>Gestão</span>
          </button>
        </div>
      </header>

      <main>
        <section aria-labelledby="portal-title" className="overflow-hidden bg-[radial-gradient(ellipse_at_top_left,#FBF6E5,transparent_67%)]">
          <div className="mx-auto grid max-w-[1240px] items-center gap-7 px-4 py-9 sm:px-6 sm:py-13 lg:grid-cols-[1.02fr_0.98fr] lg:gap-11 lg:py-15">
            <div className="anim-hero-2">
              <p className="mb-4 inline-flex items-center gap-2.5 text-sm font-bold text-[#235B50]">
                <span aria-hidden="true" className="h-px w-7 bg-[#398571]" />
                ID Maricá - identidade cidadã
              </p>
              <h1 id="portal-title" className="citizen-title font-display font-extrabold text-[#092F39]">
                Seu cadastro <span className="block text-[#226655]">sempre em dia.</span>
              </h1>
              <p className="mt-5 max-w-[33rem] text-base leading-relaxed text-[#40595A] sm:text-lg">
                Faça ou atualize o cadastro da sua família para os benefícios sociais da cidade. Encontre atendimento perto de casa.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#cadastro" className="citizen-primary inline-flex min-h-[54px] items-center justify-center gap-3 rounded-xl px-5 py-3 text-base font-bold text-white">
                  Fazer ou atualizar cadastro <ArrowRight aria-hidden="true" className="size-5" />
                </a>
                <a href="#apoio" className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl border border-[#C9D8CD] bg-white/80 px-4 py-3 text-sm font-bold text-[#0B3B49] hover:bg-white">
                  <MapPin aria-hidden="true" className="size-5 text-[#226655]" /> Encontrar atendimento
                </a>
              </div>
            </div>

            <div className="citizen-hero-photo relative isolate overflow-hidden rounded-[1.6rem] bg-[#0B3B49] sm:rounded-[2rem]">
              <img
                src={`${import.meta.env.BASE_URL}hero-marica.jpg`}
                alt="Mulher sorrindo com um celular na varanda de casa"
                width="1376"
                height="768"
                fetchPriority="high"
                className="absolute inset-0 size-full object-cover object-[77%_center]"
              />
            </div>
          </div>
        </section>

        <section id="cadastro" className="scroll-mt-5 border-y border-[#DDE4DB] bg-[#FBFCF7]">
          <BeneficiaryAppForm />
        </section>

        <section id="como-funciona" className="scroll-mt-5 bg-[#E9F3EC] py-14 sm:py-20">
          <div className="mx-auto grid max-w-[1240px] items-start gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <div>
              <h2 className="citizen-heading font-display font-extrabold text-[#0B3B49]">Como funciona o cadastro?</h2>
              <p className="mt-4 max-w-md leading-relaxed text-[#40595A]">
                Com os dados atualizados, a gestão pode entender o que falta em cada bairro e planejar serviços públicos mais perto de quem precisa.
              </p>
              <a href="#cadastro" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg font-bold text-[#0B3B49] underline-offset-4 hover:underline">
                Ir para o cadastro <ArrowRight aria-hidden="true" className="size-4" />
              </a>
            </div>
            <ol className="divide-y divide-[#CBDDD2] border-y border-[#CBDDD2]">
              {REGISTRATION_STEPS.map(([title, description], index) => (
                <li className="flex items-start gap-4 py-5" key={title}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0B3B49] text-sm font-extrabold text-white">{index + 1}</span>
                  <div>
                    <h3 className="font-display text-xl font-bold text-[#0B3B49]">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-[#40595A] sm:text-base">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="apoio" className="scroll-mt-5 border-y border-[#DDE4DB] bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
            <h2 className="citizen-heading font-display font-extrabold text-[#0B3B49]">Serviços perto de você</h2>
            <p className="mt-3 mb-7 max-w-2xl text-base leading-relaxed text-[#40595A]">
              Encontre postos de saúde, CRAS, escolas municipais e estações das Vermelhinhas. Escolha um tipo de serviço para ver os pontos no mapa.
            </p>
            <NearbyUsfMap />
          </div>
        </section>

        <section id="duvidas" className="scroll-mt-5 py-14 sm:py-20">
          <div className="mx-auto grid max-w-[1240px] gap-7 px-4 sm:px-6 lg:grid-cols-[0.68fr_1fr] lg:gap-14">
            <h2 className="citizen-heading font-display font-extrabold text-[#0B3B49]">Dúvidas frequentes</h2>
            <div className="divide-y divide-[#D9E3DA] overflow-hidden rounded-2xl border border-[#D9E3DA] bg-[#FBFCF7]">
              {FAQ_ITEMS.map(({ question, answer }) => (
                <details key={question} className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-bold text-[#0B3B49] hover:bg-[#E9F3EC]">
                    {question}
                    <ArrowDown aria-hidden="true" className="size-4 shrink-0 group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-4 text-sm leading-relaxed text-[#40595A] sm:text-base">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PortalFooter />
    </div>
  );
}
