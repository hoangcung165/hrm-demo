// Human-friendly allowance rows; API stores them as a JSON array.
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export type AllowanceRow = { name: string; amount: number };
export function readAllowanceRows(value: string): AllowanceRow[] | null {
  if (value === '') return [];
  try {
    const decoded: unknown = JSON.parse(value);
    if (!Array.isArray(decoded)) return null;
    return decoded.map(item => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const name = record.name ?? record.type;
      return typeof name === 'string' && typeof record.amount === 'number' && Number.isFinite(record.amount) && record.amount >= 0
        ? { name, amount: record.amount } : null;
    }).every(item => item !== null) ? decoded.map(item => {
      const record = item as { name?: string; type?: string; amount: number };
      return { name: record.name ?? record.type ?? '', amount: record.amount };
    }) : null;
  } catch { return null; }
}
export function AllowancesEditor({ value, onChange, disabled = false, optional = false }: {
  value: string; onChange: (next: string) => void; disabled?: boolean; optional?: boolean;
}) {
  const { t } = useTranslation();
  const key = 'employees.profile.contracts.manage';
  const rows = readAllowanceRows(value);
  const write = (next: AllowanceRow[]) => onChange(JSON.stringify(next));
  if (rows === null) return <div role="alert" className="text-caption text-danger">
    {t(`${key}.invalidAllowances`)}
  </div>;
  return <div className="flex flex-col gap-3">
    {rows.map((row, index) => (
      <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
        <Field label={t(`${key}.allowanceType`)}>
          {props => <Input {...props} value={row.name} disabled={disabled} maxLength={100}
            onChange={event => write(rows.map((x, i) => i === index ? { ...x, name: event.target.value } : x))} />}
        </Field>
        <Field label={t(`${key}.allowanceAmount`)}>
          {props => <Input {...props} type="number" min="0" step="1" value={row.amount} disabled={disabled}
            onChange={event => write(rows.map((x, i) => i === index ? { ...x, amount: Number(event.target.value) } : x))} />}
        </Field>
        {!disabled ? <Button size="icon-sm" variant="ghost"
          aria-label={t(`${key}.removeAllowance`, { number: index + 1 })}
          onClick={() => write(rows.filter((_, i) => i !== index))}>
          <Trash2 aria-hidden="true" />
        </Button> : <span />}
      </div>
    ))}
    {!disabled ? <Button variant="ghost" size="sm" className="self-start"
      onClick={() => write([...rows, { name: '', amount: 0 }])}>
      <Plus aria-hidden="true" /> {t(`${key}.addAllowance`)}
    </Button> : null}
    {optional && value === '' ? <p className="text-caption text-ink-muted">{t(`${key}.keepAllowances`)}</p> : null}
  </div>;
}
