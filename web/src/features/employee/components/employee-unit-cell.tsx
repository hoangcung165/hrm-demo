// The unit of an Employee in a list: its name with the unit above as a caption, "Ngừng hoạt động" on a deactivated
// unit, and "Trực thuộc công ty" (muted) for an Employee with no unit.
import { useTranslation } from 'react-i18next';
import type { EmployeeUnitRef } from '../api';

export type EmployeeUnitCellProps = {
  unit: EmployeeUnitRef | null;
  /** Compact rows: the name only, as a caption. */
  compact?: boolean;
};

export function EmployeeUnitCell({ unit, compact = false }: EmployeeUnitCellProps) {
  const { t } = useTranslation();
  if (!unit) return <span className={compact ? 'text-caption text-ink-muted' : 'text-ink-muted'}>{t('employees.underCompany')}</span>;
  if (compact) return <span className="min-w-0 truncate text-caption text-ink-muted">{unit.name}</span>;
  const note = [unit.parentName, unit.active ? null : t('employees.unitInactive')].filter(Boolean).join(' · ');
  return (
    <span className="flex min-w-0 flex-col">
      <span>{unit.name}</span>
      {note ? <span className="text-caption text-ink-muted">{note}</span> : null}
    </span>
  );
}
