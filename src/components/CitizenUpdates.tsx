import { ArrowUpRight, Briefcase, GraduationCap, Newspaper } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Post { title: string; link: string; date: string; description: string }
interface Offer {
  id: string; source: string; title: string; quantity: number; district: string; sector: string;
  type: string; education: string; salary: string; benefits: string; requirements: string;
}
interface Updates {
  checkedAt: string;
  news: Post[] | null;
  courses: Post[] | null;
  jobs: { month: string | null; offers: Offer[] } | null;
}

const MUNICIPAL_JOBS = 'https://idr.marica.rj.gov.br/socioeconomico/';
const EMPREGA = 'https://servicos.mte.gov.br/';
const MUNICIPAL_NEWS = 'https://www.marica.rj.gov.br/';
const CAPACITA = 'https://capacita.marica.rj.gov.br/';
const ESCOLA = 'https://www.gov.br/trabalho-e-emprego/pt-br/servicos/mte/programa-escola-do-trabalhador-4.0/programa-escola-do-trabalhador-4.0';
const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'America/Sao_Paulo' });

function OfficialLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="inline-flex min-h-10 items-center gap-2 rounded text-sm font-bold text-[#0B3B49] underline underline-offset-4">
      {children}<ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
    </a>
  );
}

function Posts({ posts, empty }: { posts: Post[] | null | undefined; empty: string }) {
  if (!posts?.length) return <p className="text-sm text-[#52646D]">{empty}</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <li className="rounded-xl border border-[#DCE3E8] bg-white p-4" key={post.link}>
          <time dateTime={post.date} className="text-xs font-semibold text-[#52646D]">{dateFormat.format(new Date(post.date))}</time>
          <h3 className="mt-1 font-display text-base font-extrabold text-[#0B3B49]">{post.title}</h3>
          {post.description && <p className="mt-2 text-sm text-[#405661]">{post.description}</p>}
          <OfficialLink href={post.link}>Ler na Prefeitura</OfficialLink>
        </li>
      ))}
    </ul>
  );
}

export function CitizenUpdates() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [updates, setUpdates] = useState<Updates | null>(null);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const base = new URL(import.meta.env.BASE_URL, document.baseURI);
    const load = async () => {
      try {
        const response = await fetch(new URL('api/atualizacoes', base), { signal: controller.signal });
        if (!response.ok) throw new Error();
        const result = await response.json() as Updates;
        setUpdates(result);
        setStatus('ok');
      } catch {
        if (!controller.signal.aborted) setStatus('error');
      }
    };
    void load();
    const interval = window.setInterval(() => { if (!document.hidden) void load(); }, 300_000);
    return () => {
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const offers = updates?.jobs?.offers.filter((offer) =>
    (!source || source === offer.source) && normalize(`${offer.title} ${offer.district} ${offer.requirements}`).includes(normalize(search.trim()))
  ) ?? [];
  const month = updates?.jobs?.month;
  const listedMonth = month && new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
  const hasSourceError = status === 'error' || (status === 'ok' && !updates?.jobs);

  return (
    <>
      <section id="oportunidades" tabIndex={-1} aria-labelledby="opportunities-title" className="scroll-mt-4 border-y border-[#DCE3E8] bg-[#EDF4F6] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-[1192px] space-y-7">
          <div>
            <h2 id="opportunities-title" className="citizen-heading flex items-center gap-3 font-display font-extrabold text-[#0B3B49]">
              <Briefcase aria-hidden="true" className="size-7 shrink-0 text-[#0E7490]" /> Oportunidades para você
            </h2>
            <p className="mt-3 text-[#405661]">Encontre vagas em Maricá e cursos gratuitos para se qualificar.</p>
          </div>
          <div className="space-y-4 rounded-2xl border border-[#DCE3E8] bg-white p-4 sm:p-6">
            <h3 className="font-display text-xl font-extrabold text-[#0B3B49]">Vagas de emprego em Maricá</h3>
            {listedMonth && <p className="text-sm text-[#405661]">Publicações de <strong>{listedMonth}</strong>. Confirme se a vaga continua disponível antes de se candidatar.</p>}
            {status === 'loading' && <p role="status" className="text-sm">Consultando o monitor de vagas…</p>}
            {hasSourceError && <p role="status" className="text-sm">A consulta ao monitor está indisponível agora. Use os canais oficiais abaixo.</p>}
            {updates?.jobs && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold">Buscar cargo ou requisito
                    <input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
                      className="mt-1 block min-h-11 w-full rounded-lg border border-[#C4D0D7] px-3" />
                  </label>
                  <label className="text-sm font-semibold">Canal da vaga
                    <select value={source} onChange={(event) => setSource(event.target.value)} className="mt-1 block min-h-11 w-full rounded-lg border border-[#C4D0D7] bg-white px-3">
                      <option value="">Todos</option>
                      <option>Casa do Trabalhador</option><option>SINE Maricá</option>
                    </select>
                  </label>
                </div>
                <p role="status" className="text-sm text-[#52646D]">{offers.length ? `${offers.length} anúncios no recorte` : 'Nenhum anúncio encontrado.'}</p>
                <div className="grid items-start gap-3 lg:grid-cols-2">
                  {offers.slice(0, showAll ? undefined : 6).map((offer) => (
                    <details key={offer.id} className="rounded-xl border border-[#DCE3E8] bg-[#F8FAFB] p-3">
                      <summary className="cursor-pointer font-bold text-[#0B3B49]">
                        {offer.title}
                        <span className="mt-1 block pl-4 text-xs font-semibold text-[#52646D]">{offer.source} · {offer.quantity} {offer.quantity === 1 ? 'vaga' : 'vagas'}{offer.district && ` · ${offer.district}`}</span>
                      </summary>
                      <dl className="mt-3 space-y-2 border-t border-[#DCE3E8] pt-3 text-sm text-[#405661]">
                        {([
                          ['Bairro ou distrito', offer.district], ['Setor', offer.sector], ['Tipo', offer.type],
                          ['Escolaridade', offer.education], ['Salário', offer.salary], ['Benefícios', offer.benefits], ['Requisitos', offer.requirements],
                        ] as const).map(([label, value]) => (
                          <div key={label}><dt className="inline font-bold">{label}</dt><dd className="inline"> · {value || 'Não informado'}</dd></div>
                        ))}
                      </dl>
                      <OfficialLink href={offer.source === 'SINE Maricá' ? EMPREGA : MUNICIPAL_JOBS}>Consultar o canal oficial</OfficialLink>
                    </details>
                  ))}
                </div>
                {offers.length > 6 && <button type="button" className="citizen-primary min-h-11 rounded-lg px-4 text-sm font-bold" onClick={() => setShowAll(!showAll)}>{showAll ? 'Mostrar menos vagas' : 'Mostrar todas as vagas'}</button>}
              </>
            )}
            <div className="flex flex-wrap gap-x-5">
              <OfficialLink href={MUNICIPAL_JOBS}>Monitor do IDR</OfficialLink>
              <OfficialLink href={EMPREGA}>Portal Emprega Brasil</OfficialLink>
              <OfficialLink href="https://www.marica.rj.gov.br/vagasdeemprego/">Atendimento do SINE em Maricá</OfficialLink>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-display text-xl font-extrabold text-[#0B3B49]"><GraduationCap aria-hidden="true" className="size-5" /> Cursos gratuitos</h3>
            <div className="flex flex-wrap gap-x-5">
              <OfficialLink href={CAPACITA}>Capacita Maricá · Cursos presenciais</OfficialLink>
              <OfficialLink href={ESCOLA}>Escola do Trabalhador 4.0 · Cursos online</OfficialLink>
              <OfficialLink href="https://www.escolavirtual.gov.br/catalogo">Escola Virtual de Governo</OfficialLink>
            </div>
            <Posts posts={updates?.courses} empty={status === 'loading' ? 'Consultando anúncios da Prefeitura…' : 'Consulte nos portais oficiais as turmas e inscrições abertas.'} />
          </div>
        </div>
      </section>
      <section id="noticias" tabIndex={-1} aria-labelledby="news-title" className="scroll-mt-4 border-b border-[#DCE3E8] bg-[#F4F6F8] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-[1192px] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="news-title" className="citizen-heading flex items-center gap-3 font-display font-extrabold text-[#0B3B49]"><Newspaper aria-hidden="true" className="size-7 shrink-0 text-[#0E7490]" /> Notícias de Maricá</h2>
            <OfficialLink href={MUNICIPAL_NEWS}>Portal da Prefeitura</OfficialLink>
          </div>
          <Posts posts={updates?.news} empty={status === 'loading' ? 'Consultando as notícias mais recentes…' : 'As notícias estão disponíveis no portal da Prefeitura.'} />
          {updates?.news && <p className="text-xs text-[#52646D]">Consulta ao portal oficial em {dateFormat.format(new Date(updates.checkedAt))}. Atualização automática a cada cinco minutos.</p>}
        </div>
      </section>
    </>
  );
}
