// Two-letter ISO nationality filter, applying only completed codes so the backend never sees a partial value.
import { useEffect, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import type { EmployeeFilters } from '../use-employee-filters';

export function EmployeeNationalityFilter({ filters, id, disabled, className }: {
  filters: EmployeeFilters; id?: string; disabled?: boolean; className?: string;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(filters.query.nationality);
  useEffect(() => setDraft(filters.query.nationality), [filters.query.nationality]);
  const commit = (next: string) => {
    const country = next.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    setDraft(country);
    if (!country || country.length === 2) filters.setNationality(country);
  };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
  };
  return (
    <Input id={id} aria-label={id ? undefined : t('employees.filter.nationality')}
      placeholder={t('employees.filter.nationalityPlaceholder')} value={draft}
      maxLength={2} className={className} disabled={disabled}
      onChange={e => commit(e.target.value)}
      onKeyDown={keyDown}
      onBlur={() => { if (draft.length === 1) setDraft(filters.query.nationality); }} />
  );
}
