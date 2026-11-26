import { ScanFace } from 'lucide-react';
import { useState } from 'react';
import { citizenRequest } from '../data/citizenAccount';

export function IdentityCheck({ cpf, verified, onVerified }: { cpf: string; verified: boolean; onVerified: (value: boolean) => void }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async (start: boolean) => {
    setBusy(true);
    setMessage('');
    try {
      if (start) {
        const result = await citizenRequest<{ pin: string }>('biometria-iniciar', { cpf, authorize: true });
        onVerified(false);
        setPin(result.pin);
      } else {
        const result = await citizenRequest<{ status: 'pending' | 'verified' | 'rejected' }>('biometria-resultado', { cpf });
        onVerified(result.status === 'verified');
        if (result.status === 'pending') setMessage('Aguardando a conclusão no app Datavalid.');
        if (result.status === 'rejected') setMessage('A identidade não pôde ser confirmada. Gere outro código ou procure atendimento presencial.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'A verificação está indisponível.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-[#DCE3E8] bg-[#EDF4F6] p-4">
      <h4 className="flex items-center gap-2 font-display text-lg font-extrabold text-[#0B3B49]">
        <ScanFace aria-hidden="true" className="size-5" /> Verificação facial com prova de vida
      </h4>
      {verified ? (
        <p role="status" className="text-sm font-bold text-[#156F48]">Identidade confirmada pelo Datavalid. Conclua o cadastro.</p>
      ) : (
        <>
          <p className="text-sm text-[#405661]">A captura é feita no app Datavalid, do Serpro. O app compara seu rosto com a foto oficial vinculada ao CPF. O ID Maricá guarda o resultado e a data da verificação.</p>
          <div className="flex flex-wrap gap-3">
            <a href="https://play.google.com/store/apps/details?id=br.gov.serpro.datavalid" target="_blank" rel="noreferrer" className="text-sm font-bold text-[#0B3B49] underline">Datavalid para Android</a>
            <a href="https://apps.apple.com/br/app/datavalid/id6502915751" target="_blank" rel="noreferrer" className="text-sm font-bold text-[#0B3B49] underline">Datavalid para iPhone</a>
            <a href="#apoio" className="text-sm font-bold text-[#0B3B49] underline">Buscar atendimento presencial</a>
          </div>
          {pin && <div className="rounded-lg bg-white p-3">
            <p className="text-sm">Informe seu CPF e este código no Datavalid. Ao terminar, volte aqui para conferir o resultado.</p>
            <p className="mt-2 text-2xl font-extrabold tracking-widest">{pin}</p>
          </div>}
          {message && <p role="status" className="text-sm font-semibold">{message}</p>}
          <div className="flex flex-wrap gap-2">
            {pin && <button type="button" disabled={busy} onClick={() => void run(false)} className="citizen-primary min-h-11 rounded-lg px-3 text-sm font-bold disabled:opacity-60">Conferir resultado</button>}
            <button type="button" disabled={busy} onClick={() => void run(true)} className="min-h-11 rounded-lg border border-[#0B3B49] bg-white px-3 text-sm font-bold disabled:opacity-60">
              {busy ? 'Aguarde…' : pin ? 'Gerar outro código' : 'Quero verificar meu rosto · Gerar código'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
