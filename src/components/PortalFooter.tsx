import { ArrowUpRight } from 'lucide-react';
import { IdMaricaLogo } from './IdMaricaLogo';

const OFFICIAL_LINKS = [
  { name: 'Banco Mumbuca', url: 'https://www.bancomumbuca.com.br/', image: 'banco-mumbuca.svg' },
  { name: 'Prefeitura de Maricá', url: 'https://www.marica.rj.gov.br/', image: 'prefeitura-marica.png' },
  { name: 'gov.br', url: 'https://www.gov.br/', image: 'gov-br.png' },
];

export function PortalFooter() {
  return (
    <>
      <section aria-labelledby="official-links-title" className="border-t border-[#DDE4DB] bg-white py-9">
        <div className="mx-auto grid max-w-[1240px] items-center gap-5 px-4 sm:px-6 lg:grid-cols-[0.43fr_1fr]">
          <h2 id="official-links-title" className="font-display text-2xl font-extrabold text-[#0B3B49]">
            Portais oficiais
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {OFFICIAL_LINKS.map(({ name, url, image }) => (
              <a
                key={name}
                href={url}
                className="flex min-h-[76px] items-center justify-between gap-4 rounded-xl border border-[#DDE4DB] bg-white px-4 py-3 hover:border-[#226655] hover:bg-[#FBFCF7]"
              >
                <img src={`${import.meta.env.BASE_URL}brand/${image}`} alt={name} loading="lazy" className="h-9 min-w-0 max-w-[145px] object-contain object-left" />
                <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-[#315659]" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#0B3B49] text-white">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-6 px-4 py-9 sm:px-6">
          <a href="#inicio" aria-label="ID Maricá, voltar ao início">
            <IdMaricaLogo showSubtitle />
          </a>
          <p className="max-w-sm text-sm leading-relaxed text-[#CCE5E3]">Protótipo de recadastramento social e planejamento de políticas públicas em Maricá.</p>
          <nav aria-label="Links do rodapé" className="flex flex-wrap gap-4 text-sm font-bold">
            <a href="#apoio" className="hover:underline">Onde buscar ajuda</a>
            <a href="#duvidas" className="hover:underline">Dúvidas</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
