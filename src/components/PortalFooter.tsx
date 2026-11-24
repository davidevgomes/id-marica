import { Lock } from 'lucide-react';
import { useIntegra } from '../context/IntegraContext';
import { IntegraLogo } from './IntegraLogo';

export function PortalFooter() {
  const { enterManagement } = useIntegra();

  return (
    <footer className="border-t-[3px] border-[#E89B0C] bg-[#072933] text-white">
      <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_0.9fr]">
          {/* Column 1: Integra Maricá Identity */}
          <div className="space-y-4">
            <IntegraLogo
              variant="light"
              size="md"
              showSubtitle
              subtitle="Prefeitura Municipal de Maricá"
            />
            <p className="max-w-md text-sm leading-relaxed text-[#C2D6DC]">
              Plataforma oficial do Integra Maricá para cadastro socioeconômico, atualização
              trimestral e inteligência territorial voltada ao planejamento de políticas públicas.
            </p>
          </div>

          {/* Column 2: Municipal Citizen Support */}
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Atendimento ao cidadão
            </h3>
            <div className="mt-3 space-y-2 text-sm leading-relaxed text-[#C2D6DC]">
              <p>Rede CRAS e 29 Unidades de Saúde da Família</p>
              <p>Atendimento presencial: segunda a sexta-feira, das 8h às 17h</p>
              <p>Prefeitura Municipal de Maricá — Centro, Maricá/RJ</p>
              <p>E-mail: atendimento.integra@marica.rj.gov.br</p>
            </div>
          </div>

          {/* Column 3: Portal Sections */}
          <div>
            <h3 className="font-display text-base font-bold text-white">
              Navegação
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-[#C2D6DC]">
              <li>
                <a href="#inicio" className="transition-colors hover:text-[#E89B0C]">
                  Início
                </a>
              </li>
              <li>
                <a href="#cadastro" className="transition-colors hover:text-[#E89B0C]">
                  Cadastro e atualização trimestral
                </a>
              </li>
              <li>
                <a href="#como-funciona" className="transition-colors hover:text-[#E89B0C]">
                  Como funciona o ciclo trimestral
                </a>
              </li>
              <li>
                <a href="#apoio" className="transition-colors hover:text-[#E89B0C]">
                  Unidades de Saúde da Família e CRAS
                </a>
              </li>
              <li>
                <a href="#duvidas" className="transition-colors hover:text-[#E89B0C]">
                  Perguntas frequentes
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright + Subtle Backend Management Access */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-5 text-xs text-[#91B1BC]">
          <div>
            © 2026 Integra Maricá — Prefeitura Municipal de Maricá. Dados protegidos conforme a LGPD
            (Lei nº 13.709/2018).
          </div>
          <button
            type="button"
            onClick={() => enterManagement('mapa')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#91B1BC] transition-colors hover:text-[#E89B0C] cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" />
            Painel de gestão
          </button>
        </div>
      </div>
    </footer>
  );
}
