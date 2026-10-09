// Step 3 of the import, "Xác nhận": what will be written, all or nothing. A failed write stays here with "Thử lại".
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { formatNumber } from '@/lib/format';
import { useNextEmployeeCode } from '../form-api';
import type { EmployeeImport } from '../use-employee-import';

export function ImportConfirmStep({ wizard }: { wizard: EmployeeImport }) {
  const { t } = useTranslation();
  const nextCode = useNextEmployeeCode();
  const check = wizard.check!;
  const { validRows: n, errorRows: m, existingRows: k } = check.summary;
  const valid = check.rows.filter((row) => row.status === 'VALID');
  const probation = valid.filter((row) => row.employeeStatus !== 'OFFICIAL').length;
  const skipped = [
    m > 0 ? t('employees.import.confirm.skippedErrors', { m: formatNumber(m), count: m }) : null,
    k > 0 ? t('employees.import.confirm.skippedExisting', { k: formatNumber(k), count: k }) : null,
  ].filter(Boolean);
  const count = { n: formatNumber(n), count: n };
  const { writing, writeFailed } = wizard;

  return (
    <Card
      title={t('employees.import.confirm.title')}
      actions={
        <>
          <Button variant="secondary" disabled={writing} onClick={wizard.backToCheck}>
            {t('employees.import.confirm.back')}
          </Button>
          <Button disabled={writing} aria-busy={writing || undefined} onClick={wizard.confirm}>
            {writing ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}
            {writing ? t('employees.import.confirm.writing', count) : writeFailed ? t('employees.import.confirm.retry') : t('employees.import.confirm.submit', count)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4" aria-busy={writing || undefined}>
        <DetailList
          items={[
            { label: t('employees.import.confirm.willAdd'), value: t('employees.import.confirm.newEmployees', count) },
            {
              label: t('employees.import.confirm.code'),
              value: nextCode.data ? t('employees.import.confirm.codeFrom', { code: nextCode.data }) : t('employees.import.confirm.codeAuto'),
            },
            {
              label: t('employees.import.confirm.status'),
              value: t('employees.import.confirm.statusCounts', { a: formatNumber(probation), b: formatNumber(n - probation) }),
            },
            { label: t('employees.import.confirm.skipped'), value: skipped.length > 0 ? skipped.join(', ') : t('employees.import.confirm.none') },
            { label: t('employees.import.confirm.file'), value: <span className="break-all">{check.fileName}</span> },
          ]}
        />
        {writeFailed ? (
          <Alert variant="danger" title={t('employees.import.writeFailed.title')}>
            {t('employees.import.writeFailed.text')}
          </Alert>
        ) : (
          <Alert variant="info" title={t('employees.import.confirm.allOrNothing')}>
            {t('employees.import.confirm.allOrNothingText')}
          </Alert>
        )}
      </div>
    </Card>
  );
}
