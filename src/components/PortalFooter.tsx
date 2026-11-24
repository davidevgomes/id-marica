import { ExternalLink, Lock } from 'lucide-react';
import { useIntegra } from '../context/IntegraContext';
import { IntegraLogo } from './IntegraLogo';

function PrefeituraBadge() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="40" height="40" rx="10" fill="#0B3B49" />
      <path d="M10 29H30M12 29V18L20 12L28 18V29" stroke="#FFFFFF" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M16.5 29V22H23.5V29" stroke="#E89B0C" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="20" cy="16.5" r="1.6" fill="#D93829" />
    </svg>
  );
}

function GovBrBadge() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="40" height="40" rx="10" fill="#1351B4" />
      <circle cx="13" cy="20" r="4.5" fill="#FFCD07" />
      <circle cx="21" cy="20" r="4.5" fill="#168821" />
      <circle cx="28" cy="20" r="3.5" fill="#FFFFFF" />
    </svg>
  );
}

function BancoMumbucaBadge() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" aria-hidden="true" className="shrink-0">
      <rect width="40" height="40" rx="10" fill="#D93829" />
      <rect x="8" y="12" width="24" height="16" rx="3" stroke="#FFFFFF" strokeWidth="2.2" />
      <line x1="8" y1="17.5" x2="32" y2="17.5" stroke="#E89B0C" strokeWidth="2.4" />
      <circle cx="26.5" cy="23" r="2.2" fill="#E89B0C" />
    </svg>
  );
}

export function PortalFooter() {
  const { enterManagement } = useIntegra();

  const officialPartners = [
    {
      name: 'Prefeitura de Maricá',
      subtitle: 'Portal Oficial do Município',
      url: 'https://www.marica.rj.gov.br/',
      badge: <PrefeituraBadge />,
    },
    {
      name: 'Gov.br',
      subtitle: 'Serviços e Identidade Digital',
      url: 'https://www.gov.br/',
      badge: <GovBrBadge />,
    },
    {
      name: 'Banco Mumbuca',
      subtitle: 'Moeda Social e Economia Solidária',
      url: 'https://www.bancomumbuca.com.br/',
      badge: <BancoMumbucaBadge />,
    },
  ];

  return (
    <div>
      {/* Institutional Logos Strip Above Footer (Prefeitura, Gov.br, Banco Mumbuca) */}
      <section
        aria-label="Portais e integrações institucionais"
        className="border-t border-[#DCE3E8] bg-white py-10"
      >
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-sm">
              <div className="font-display text-sm font-extrabold text-[#0B3B49]">
                Ecossistema institucional oficial
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#52646D]">
                Acesse os canais oficiais da Prefeitura de Maricá, do Governo Federal e do Banco
                Mumbuca.
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto">
              {officialPartners.map((partner) => (
                <a
                  key={partner.name}
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-[68px] items-center justify-between gap-3 rounded-[10px] border border-[#DCE3E8] bg-[#F8FAFB] px-4 py-3 transition-all hover:border-[#0B3B49] hover:bg-white"
                >
                  <div className="flex items-center gap-3">
                    {partner.badge}
                    <div className="leading-tight">
                      <div className="font-display text-sm font-extrabold text-[#0B3B49] group-hover:text-[#D93829]">
                        {partner.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#52646D]">{partner.subtitle}</div>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-[#8FA3AF] group-hover:text-[#0B3B49]" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Dark Civic Footer */}
      <footer className="border-t-[3px] border-[#E89B0C] bg-[#072933] text-white">
        <div className="mx-auto max-w-[1320px] px-4 py-14 sm:px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.35fr_1fr_0.9fr_0.9fr]">
            {/* Column 1: ID Maricá Identity */}
            <div className="space-y-4">
              <IntegraLogo
                variant="light"
                size="md"
                showSubtitle
                subtitle="Prefeitura Municipal de Maricá"
              />
              <p className="max-w-md text-sm leading-relaxed text-[#C2D6DC]">
                Plataforma oficial do ID Maricá para cadastro socioeconômico, vinculação familiar
                por CPF, atualização trimestral e inteligência territorial para políticas públicas.
              </p>
            </div>

            {/* Column 2: Municipal Citizen Support */}
            <div>
              <h3 className="font-display text-base font-bold text-white">
                Atendimento ao cidadão
              </h3>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-[#C2D6DC]">
                <p>7 CRAS e 29 Unidades de Saúde da Família</p>
                <p>Atendimento presencial: segunda a sexta, das 8h às 17h</p>
                <p>Prefeitura Municipal de Maricá — Centro, Maricá/RJ</p>
                <p>E-mail: atendimento.idmarica@marica.rj.gov.br</p>
              </div>
            </div>

            {/* Column 3: Portal Sections */}
            <div>
              <h3 className="font-display text-base font-bold text-white">Navegação</h3>
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
                    Equipamentos públicos perto de mim
                  </a>
                </li>
                <li>
                  <a href="#duvidas" className="transition-colors hover:text-[#E89B0C]">
                    Perguntas frequentes
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Official External Links */}
            <div>
              <h3 className="font-display text-base font-bold text-white">Links oficiais</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#C2D6DC]">
                <li>
                  <a
                    href="https://www.marica.rj.gov.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-[#E89B0C]"
                  >
                    Prefeitura de Maricá
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.gov.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-[#E89B0C]"
                  >
                    Portal Gov.br
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.bancomumbuca.com.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-[#E89B0C]"
                  >
                    Banco Mumbuca
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://passaporteuniversitario.marica.rj.gov.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-[#E89B0C]"
                  >
                    Passaporte Universitário
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright + Subtle Backend Management Access */}
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-5 text-xs text-[#91B1BC]">
            <div>
              © 2026 ID Maricá — Prefeitura Municipal de Maricá. Dados protegidos conforme a LGPD
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
    </div>
  );
}
