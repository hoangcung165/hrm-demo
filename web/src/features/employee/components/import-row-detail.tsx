// The "Chi tiết" cell of an import row: every error of the row ("E · Số CCCD “0123” — message"), the profile an
// existing row matches, or the preview of a valid row with the codes resolved to names.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatDate } from '@/lib/format';
import type { ImportCellError, ImportRow } from '../import-api';
import { importCellMessage } from '../import-messages';

export type ImportRowDetailProps = { row: ImportRow; errors: ImportCellError[] };

export function ImportRowDetail({ row, errors }: ImportRowDetailProps) {
  const { t } = useTranslation();
  if (row.status === 'INVALID') {
    return (
      <ul className="flex flex-col gap-1">
        {errors.map((error) => (
          <li key={`${error.column}-${error.code}`}>
            <span className="text-body-strong">
              {error.column} · {error.header}
            </span>{' '}
            <span className="text-ink-muted tabular-nums">{error.value ? `“${error.value}”` : t('employees.import.table.empty')}</span>
            {' — '}
            {importCellMessage(error, t)}
          </li>
        ))}
      </ul>
    );
  }
  if (row.status === 'EXISTING') {
    const by = t(`employees.import.matchedBy.${row.matchedBy ?? 'ID_NUMBER'}`);
    if (!row.existing) return <>{t('employees.import.existingOther', { by })}</>;
    return (
      <>
        {t('employees.import.existingBefore', { by })}
        <Link to={`/employees/${row.existing.id}`} target="_blank" rel="noopener" className="text-brand-blue underline-offset-2 hover:underline">
          {row.existing.fullName} ({row.existing.code})
        </Link>
        {t('employees.import.existingAfter')}
      </>
    );
  }
  const parts = [
    row.orgUnit?.name,
    row.position?.name,
    row.hireDate ? t('employees.import.startsOn', { date: formatDate(row.hireDate) }) : null,
    row.employeeStatus ? t(`employees.status.${row.employeeStatus}`) : null,
  ];
  return <>{parts.filter(Boolean).join(' · ')}</>;
}
