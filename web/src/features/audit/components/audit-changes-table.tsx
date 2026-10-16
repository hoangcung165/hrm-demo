// The before → after comparison of one record: a row per audited field, in the order the server recorded them. A
// CREATE has no "before" and a DELETE no "after"; a masked field (identity numbers…) shows that it changed, not its value.
import { ArrowRight, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AuditLogRecord } from '../api';
import { MASK, useAuditLabels } from '../use-audit-labels';

export type AuditChangesTableProps = { record: AuditLogRecord };

export function AuditChangesTable({ record }: AuditChangesTableProps) {
  const { t } = useTranslation();
  const labels = useAuditLabels();
  const fields = [...new Set([...Object.keys(record.before ?? {}), ...Object.keys(record.after ?? {})])];
  if (fields.length === 0) return <p className="text-ink-muted">{t('audit.record.noFields')}</p>;

  const cell = (values: AuditLogRecord['before'], name: string) => {
    if (values === null) return <span className="text-ink-muted">—</span>;
    const value = values[name];
    if (value === MASK) {
      return (
        <span className="inline-flex items-center gap-1 text-ink-muted">
          <Lock aria-hidden="true" className="size-4 stroke-[1.5]" />
          {t('audit.record.masked')}
        </span>
      );
    }
    return <span className="wrap-break-word tabular-nums">{labels.value(value)}</span>;
  };

  return (
    <table className="w-full border-separate border-spacing-0 text-body">
      <caption className="sr-only">{t('audit.record.changes')}</caption>
      <thead>
        <tr className="text-caption text-ink-muted">
          <th scope="col" className="border-b border-line py-2 pr-3 text-left font-normal">{t('audit.record.field')}</th>
          <th scope="col" className="border-b border-line py-2 pr-3 text-left font-normal">{t('audit.record.before')}</th>
          <th scope="col" className="w-6 border-b border-line py-2">
            <span className="sr-only">{t('audit.record.becomes')}</span>
          </th>
          <th scope="col" className="border-b border-line py-2 text-left font-normal">{t('audit.record.after')}</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((name) => (
          <tr key={name} className="align-top [&:last-child>*]:border-b-0">
            <th scope="row" className="border-b border-line py-3 pr-3 text-left font-medium">
              {labels.field(record.entityType, name)}
            </th>
            <td className="border-b border-line py-3 pr-3">{cell(record.before, name)}</td>
            <td className="border-b border-line py-3 text-ink-muted">
              <ArrowRight aria-hidden="true" className="size-4 stroke-[1.5]" />
            </td>
            <td className="border-b border-line py-3 font-medium">{cell(record.after, name)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
