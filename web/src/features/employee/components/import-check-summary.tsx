// The Alert on top of step 2, chosen by the counts: ready, some rows with errors, or nothing importable. After a
// write found a different result, a danger Alert says so first.
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { formatNumber } from '@/lib/format';
import type { ImportCheck } from '../import-api';

export type ImportCheckSummaryProps = { check: ImportCheck; changedCount?: number };

export function ImportCheckSummary({ check, changedCount }: ImportCheckSummaryProps) {
  const { t } = useTranslation();
  const { totalRows, validRows: n, errorRows: m, existingRows: k } = check.summary;
  const counts = { n: formatNumber(n), m: formatNumber(m), k: formatNumber(k), total: formatNumber(totalRows), fileName: check.fileName };
  const changed =
    changedCount !== undefined ? (
      <Alert variant="danger" title={t('employees.import.writeFailed.title')}>
        {t('employees.import.changed', { x: formatNumber(changedCount), count: changedCount })}
      </Alert>
    ) : null;
  let summary;
  if (m === 0) {
    summary = (
      <Alert variant="success" title={t('employees.import.summary.ready', { ...counts, count: n })}>
        {t('employees.import.summary.readyText', { ...counts, count: totalRows })}
        {k > 0 ? ` ${t('employees.import.summary.readyExisting', { ...counts, count: k })}` : null}
      </Alert>
    );
  } else if (n > 0) {
    summary = (
      <Alert variant="warning" title={t('employees.import.summary.someErrors', { ...counts, count: m })}>
        {t('employees.import.summary.someErrorsText', counts)}
      </Alert>
    );
  } else {
    summary = (
      <Alert variant="danger" title={t('employees.import.summary.noneValid')}>
        {t(k > 0 ? 'employees.import.summary.noneValidExistingText' : 'employees.import.summary.noneValidText', { ...counts, count: m })}
      </Alert>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {changed}
      {summary}
    </div>
  );
}
