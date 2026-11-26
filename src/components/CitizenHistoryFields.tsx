import { Plus, Trash2 } from 'lucide-react';

const fieldClass = 'min-h-11 w-full rounded-lg border border-[#C4D0D7] bg-white px-3 text-sm';

export function CitizenHistoryFields<T extends { startDate: string; endDate: string }>({
  title,
  records,
  emptyRecord,
  nameFields,
  onChange,
}: {
  title: string;
  records: T[];
  emptyRecord: T;
  nameFields: { key: keyof T; label: string }[];
  onChange: (records: T[]) => void;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-[#DCE3E8] bg-[#F8FAFB] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display text-base font-extrabold text-[#0B3B49]">{title}</h4>
        <button
          type="button"
          disabled={records.length >= 30}
          onClick={() => onChange([...records, emptyRecord])}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#C4D0D7] bg-white px-3 text-sm font-bold text-[#0B3B49]"
        >
          <Plus aria-hidden="true" className="size-4" /> Adicionar
        </button>
      </div>
      {records.length === 0 && <p className="text-sm text-[#52646D]">Nenhum registro informado.</p>}
      {records.map((record, index) => (
        <fieldset key={index} className="grid gap-3 rounded-lg bg-white p-3 sm:grid-cols-2">
          <legend className="px-2 text-sm font-bold">Registro {index + 1}</legend>
          {([...nameFields, { key: 'startDate' as const, label: 'Data de início' }, { key: 'endDate' as const, label: 'Data de término (opcional)' }]).map(({ key, label }) => (
            <label className="block space-y-1 text-sm font-semibold" key={String(key)}>
              <span>{label}</span>
              <input
                className={fieldClass}
                type={key === 'startDate' || key === 'endDate' ? 'date' : 'text'}
                maxLength={180}
                value={String(record[key])}
                onChange={(event) => {
                  const value = event.target.value;
                  onChange(records.map((item, position) => position === index ? { ...item, [key]: value } : item));
                }}
              />
            </label>
          ))}
          <button
            type="button"
            onClick={() => onChange(records.filter((_, position) => position !== index))}
            className="inline-flex min-h-10 items-center gap-2 text-left text-sm font-bold text-[#B52B1E]"
          >
            <Trash2 aria-hidden="true" className="size-4" /> Remover registro {index + 1}
          </button>
        </fieldset>
      ))}
    </section>
  );
}
