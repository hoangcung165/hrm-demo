// The people of a Phân ca: a checklist of the Employees the calendar lists for the Account (so only people within its data
// scope), with a search over name and code and a box that chooses everyone the search shows.
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { FormGroup } from '@/components/ui/form-group';
import { Input } from '@/components/ui/input';
import { Loading } from '@/components/ui/loading';
import { fold } from '@/components/ui/tree-select-nodes';
import { formatNumber } from '@/lib/format';
import type { ShiftCalendar } from '../calendar-api';

export type ShiftAssignPeopleProps = {
  /** `undefined` while the list loads. */
  calendar: ShiftCalendar | undefined;
  failed: boolean;
  value: ReadonlySet<string>;
  onChange: (value: ReadonlySet<string>) => void;
  error: string | null;
};

export function ShiftAssignPeople({ calendar, failed, value, onChange, error }: ShiftAssignPeopleProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const needle = fold(search);
  const shown = (calendar?.rows ?? []).filter(({ employee }) => !needle || fold(`${employee.fullName} ${employee.code ?? ''}`).includes(needle));
  const allShown = shown.length > 0 && shown.every(({ employee }) => value.has(employee.id));
  const toggle = (id: string, on: boolean) => onChange(new Set(on ? [...value, id] : [...value].filter((each) => each !== id)));
  const toggleShown = (on: boolean) => {
    const next = new Set(value);
    for (const { employee } of shown) {
      if (on) next.add(employee.id);
      else next.delete(employee.id);
    }
    onChange(next);
  };
  let list;
  if (failed) list = <p role="alert" className="text-body-small text-danger">{t('shiftAssign.people.loadError')}</p>;
  else if (!calendar) list = <Loading label={t('shiftAssign.people.loading')} rows={3} />;
  else if (calendar.total === 0) list = <p className="text-body-small text-ink-muted">{t('shiftAssign.people.none')}</p>;
  else if (shown.length === 0) list = <p className="text-body-small text-ink-muted">{t('shiftAssign.people.noMatch', { search })}</p>;
  else
    list = (
      <ul aria-label={t('shiftAssign.people.label')} className="flex max-h-48 flex-col overflow-y-auto rounded-sm border border-line">
        {shown.map(({ employee }) => (
          <li key={employee.id} className="border-b border-line px-3 py-2 last:border-b-0 max-md:py-3">
            <Checkbox checked={value.has(employee.id)} onChange={(event) => toggle(employee.id, event.target.checked)}>
              <span>{employee.fullName}</span>
              {employee.code ? <span className="text-caption text-ink-muted">{employee.code}</span> : null}
            </Checkbox>
          </li>
        ))}
      </ul>
    );
  return (
    <FormGroup legend={t('shiftAssign.people.label')} required className="border-t-0 pt-0" error={error ? t(error) : undefined}>
      <div className="flex flex-col gap-2">
        <Input type="search" aria-label={t('shiftAssign.people.find')} placeholder={t('shiftAssign.people.find')} value={search} onChange={(event) => setSearch(event.target.value)} leading={<Search aria-hidden="true" />} />
        {list}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Checkbox checked={allShown} disabled={shown.length === 0} onChange={(event) => toggleShown(event.target.checked)}>
            {t('shiftAssign.people.selectShown', { count: shown.length })}
          </Checkbox>
          <span role="status" className="text-caption text-ink-muted">{t('shiftAssign.people.selected', { count: value.size })}</span>
        </div>
        {calendar && calendar.total > calendar.rows.length ? <p className="text-caption text-ink-muted">{t('shiftAssign.people.truncated', { shown: formatNumber(calendar.rows.length), total: formatNumber(calendar.total) })}</p> : null}
      </div>
    </FormGroup>
  );
}
