import { ArrowLeft, Briefcase, CalendarDays, Download, FileText, Gift, GraduationCap, House, LogOut, Pencil, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { citizenApiUrl, citizenRequest, CitizenRequestError, type CitizenAccount } from '../data/citizenAccount';
import { formatCurrency, formatDateBr } from '../engine/analyticsEngine';
import { BeneficiaryAppForm } from './BeneficiaryAppForm';
import { IdMaricaLogo } from './IdMaricaLogo';

const tabs = [
  { key: 'dados', label: 'Informações cadastrais', icon: FileText },
  { key: 'familia', label: 'Núcleo familiar e dependentes', icon: Users },
  { key: 'beneficios', label: 'Benefícios', icon: Gift },
  { key: 'empregos', label: 'Histórico de empregos', icon: Briefcase },
  { key: 'formacao', label: 'Histórico acadêmico / escolar', icon: GraduationCap },
] as const;

function download(filename: string, value: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DataList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-px overflow-hidden rounded-lg border border-[#DCE3E8] bg-[#DCE3E8] sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0 bg-white p-3.5">
          <dt className="text-xs font-bold text-[#52646D]">{label}</dt>
          <dd className="mt-1 text-sm break-words text-[#0B3B49]">{value || 'Não informado'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CitizenArea() {
  const [account, setAccount] = useState<CitizenAccount | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<(typeof tabs)[number]['key']>('dados');
  const home = window.location.pathname;

  useEffect(() => {
    let active = true;
    void citizenRequest<CitizenAccount>('perfil').then((result) => {
      if (active) setAccount(result);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof CitizenRequestError ? reason.message : 'Não foi possível carregar seu cadastro.');
    });
    return () => { active = false; };
  }, []);

  const logout = async () => {
    setNotice('');
    try {
      await citizenRequest('sair', {});
      window.location.replace(`${home}#cadastro`);
    } catch {
      setNotice('Não foi possível sair. Tente novamente.');
    }
  };

  const profile = account?.profile;
  const holder = profile?.dwellingHolder;
  const rent = profile?.housingType === 'ALUGADA';
  const ready = Boolean(profile);
  const otherPrograms = profile?.selfDeclaration?.declaredPolicies.filter(
    (name) => !profile.socialPrograms.some((program) => program.name === name)
  ) ?? [];

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-[#11222B]">
      <header className="sticky top-0 z-40 bg-[#072933] text-white">
        <div className="mx-auto flex min-h-16 max-w-[1240px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 sm:px-6">
          <a href={home} aria-label="ID Maricá, início"><IdMaricaLogo /></a>
          <div className="flex gap-2">
            <a href={home} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-bold hover:bg-white/10">
              <ArrowLeft aria-hidden="true" className="size-4" /> Portal
            </a>
            {ready && <button type="button" onClick={() => void logout()} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/35 px-2 text-sm font-bold hover:bg-white/10">
              <LogOut aria-hidden="true" className="size-4" /> Sair
            </button>}
          </div>
        </div>
      </header>
      <main>
        <section className="bg-[#0B3B49] px-4 py-9 text-white sm:px-6 sm:py-12">
          <div className="mx-auto max-w-[1192px]">
            <h1 className="font-display text-3xl font-extrabold sm:text-5xl">Área do Munícipe</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#D8E7EC] sm:text-base">Acompanhe seu cadastro, seus benefícios informados e seus históricos de trabalho e estudo.</p>
          </div>
        </section>
        {notice && <p role="status" className="mx-auto max-w-[1192px] px-4 py-3 text-sm font-bold text-[#0B3B49]">{notice}</p>}
        {!profile && <div className="mx-auto max-w-[1192px] space-y-4 px-4 py-8">
          <p role="status">{error || 'Carregando seus dados…'}</p>
          {error && <a href={`${home}#cadastro`} className="inline-flex min-h-11 items-center rounded-lg bg-[#0B3B49] px-4 font-bold text-white">Ir para o cadastro</a>}
        </div>}
        {profile && account && (
          <div className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-6">
            <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DCE3E8] bg-white p-4 sm:p-6">
              <div>
                <h2 className="font-display text-2xl font-extrabold text-[#0B3B49]">{profile.fullName}</h2>
                <p className="mt-1 text-sm text-[#52646D]">CPF {profile.cpf} · Atualizado em {formatDateBr(profile.lastUpdatedAt)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setEditing((open) => !open)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C4D0D7] px-3 text-sm font-bold text-[#0B3B49]">
                  <Pencil aria-hidden="true" className="size-4" /> {editing ? 'Voltar aos dados' : 'Editar cadastro'}
                </button>
                {!editing && <button type="button" onClick={() => download('meus-dados-id-marica.json', profile)} className="citizen-primary inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold">
                  <Download aria-hidden="true" className="size-4" /> Baixar meus dados
                </button>}
              </div>
            </section>

            {editing ? (
              <div className="citizen-appear rounded-2xl border border-[#DCE3E8] bg-white pt-1">
                <BeneficiaryAppForm account={account} onSaved={(saved) => {
                  setAccount(saved);
                  setEditing(false);
                  setNotice('Cadastro atualizado.');
                  window.scrollTo({ top: 0 });
                }} />
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: House, label: 'Pessoas na residência', value: String(profile.householdSize) },
                    { icon: Gift, label: 'Benefícios informados', value: String(profile.socialPrograms.length + otherPrograms.length) },
                    { icon: CalendarDays, label: 'Próxima atualização', value: formatDateBr(profile.nextDueDate) },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-[#DCE3E8] bg-white p-4">
                      <Icon aria-hidden="true" className="size-5 text-[#0E7490]" />
                      <div><p className="text-xs font-bold text-[#52646D]">{label}</p><p className="font-display text-lg font-extrabold text-[#0B3B49]">{value}</p></div>
                    </div>
                  ))}
                </div>
                <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
                  <nav aria-label="Seções do cadastro" className="grid gap-1 rounded-xl border border-[#DCE3E8] bg-white p-2 sm:grid-cols-2 lg:grid-cols-1">
                    {tabs.map(({ key, label, icon: Icon }) => (
                      <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}
                        className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-[#0B3B49] transition-colors hover:bg-[#EDF4F6] aria-pressed:bg-[#0B3B49] aria-pressed:text-white">
                        <Icon aria-hidden="true" className="size-4 shrink-0" /> {label}
                      </button>
                    ))}
                  </nav>
                  <section key={tab} className="citizen-appear space-y-4 rounded-xl border border-[#DCE3E8] bg-white p-4 sm:p-6">
                    <h2 className="font-display text-xl font-extrabold text-[#0B3B49]">{tabs.find((item) => item.key === tab)?.label}</h2>
                    {tab === 'dados' && <>
                      <DataList rows={[
                        ['Identidade', profile.documents.facialVerified ? 'Confirmada pelo Datavalid' : 'Aguardando validação'], ['Nome completo', profile.fullName], ['Nascimento', formatDateBr(profile.birthDate)],
                        ['Telefone', profile.phone], ['E-mail', profile.email], ['Endereço', profile.address], ['Bairro', profile.neighborhood],
                        ['CEP', profile.cep], ['Escolaridade', profile.education], ['Renda familiar', formatCurrency(profile.householdTotalIncome)],
                        ['Tipo de moradia', rent ? 'Aluguel' : profile.housingType === 'PROPRIA' ? 'Moradia própria' : 'Moradia temporária'],
                        ['Imóvel', profile.dwellingType === 'CASA' ? 'Casa' : 'Apartamento'],
                        ['Titular do imóvel', holder?.kind === 'OTHER' ? `${holder.name} · ${holder.cpf} · ${holder.relationship}` : profile.fullName],
                        ...(rent ? [['Valor do aluguel', formatCurrency(profile.rentValue)] as [string, string]] : []),
                      ]} />
                      {profile.rentalContractName && <a href={citizenApiUrl('contrato')} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#0B3B49] underline">
                        <Download aria-hidden="true" className="size-4" /> Baixar contrato de aluguel
                      </a>}
                    </>}
                    {tab === 'familia' && <>
                      <p className="text-sm text-[#52646D]">{profile.dependentsCount} dependente(s) informado(s).</p>
                      {!profile.householdMembers?.length && <p className="text-sm">Nenhum outro morador informado.</p>}
                      {profile.householdMembers?.map((member) => <DataList key={member.id} rows={[
                        ['Nome', member.fullName], ['CPF', member.cpf], ['Data de nascimento', formatDateBr(member.birthDate)], ['Vínculo', member.relationship],
                      ]} />)}
                    </>}
                    {tab === 'beneficios' && <>
                      <p className="text-sm text-[#52646D]">Benefícios autodeclarados no cadastro. A concessão deve ser consultada no órgão responsável.</p>
                      {profile.socialPrograms.length > 0 && <DataList rows={profile.socialPrograms.map((item) => [item.name, formatCurrency(item.monthlyValue)])} />}
                      {otherPrograms.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm">{otherPrograms.map((name) => <li key={name}>{name}</li>)}</ul>}
                      {profile.socialPrograms.length === 0 && otherPrograms.length === 0 && <p className="text-sm">Nenhum benefício informado.</p>}
                    </>}
                    {tab === 'empregos' && <>
                      <p className="text-sm text-[#52646D]">Experiências de trabalho informadas por você.</p>
                      <button type="button" onClick={() => download('historico-de-empregos.json', profile.employmentHistory)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C4D0D7] px-3 text-sm font-bold text-[#0B3B49]">
                        <Download aria-hidden="true" className="size-4" /> Baixar histórico de empregos
                      </button>
                      {!profile.employmentHistory.length && <p className="text-sm">Nenhuma experiência cadastrada.</p>}
                      {profile.employmentHistory.map((entry, index) => <DataList key={index} rows={[
                        ['Empregador', entry.employer], ['Cargo ou função', entry.role],
                        ['Início', formatDateBr(entry.startDate)], ['Término', entry.endDate ? formatDateBr(entry.endDate) : 'Em andamento'],
                      ]} />)}
                    </>}
                    {tab === 'formacao' && <>
                      {!profile.academicHistory.length && <p className="text-sm">Nenhum registro de formação cadastrado.</p>}
                      {profile.academicHistory.map((entry, index) => <DataList key={index} rows={[
                        ['Instituição', entry.institution], ['Curso ou série', entry.course],
                        ['Início', formatDateBr(entry.startDate)], ['Término', entry.endDate ? formatDateBr(entry.endDate) : 'Em andamento'],
                      ]} />)}
                    </>}
                  </section>
                </div>
                <a href={`${home}#oportunidades`} className="citizen-service-card">
                  <span className="citizen-service-icon"><Briefcase aria-hidden="true" className="size-5" /></span>
                  <span><strong className="block">Oportunidades para você</strong><span className="text-sm text-[#52646D]">Ver vagas e cursos gratuitos no portal.</span></span>
                </a>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
