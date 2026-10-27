// Step 3 of the import, "Xác nhận": what will be stored, all or nothing. A failed write stays here with "Thử lại".
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DetailList } from '@/components/ui/detail-list';
import { companyDateIso, formatDateRange, formatNumber } from '@/lib/format';
import type { PunchImport } from '../use-punch-import';
import { punchRange } from './punch-check-stats';

export function PunchConfirmStep({ wizard }: { wizard: PunchImport }) {
  const { t } = useTranslation();
  const check = wizard.check!;
  const { newPunches: n, alreadyImported: k, errorRows: m, employees, from, to } = check.summary;
  const { writing, writeFailed } = wizard;
  const count = { n: formatNumber(n), count: n };
  const skipped = [
    m > 0 ? t('attendanceImport.confirm.skippedErrors', { m: formatNumber(m), count: m }) : null,
    k > 0 ? t('attendanceImport.confirm.skippedExisting', { k: formatNumber(k), count: k }) : null,
  ].filter(Boolean);

  return (
    <Card
      title={t('attendanceImport.confirm.title')}
      actions={
        <>
          <Button variant="secondary" disabled={writing} onClick={wizard.backToCheck}>
            {t('attendanceImport.confirm.back')}
          </Button>
          <Button disabled={writing} aria-busy={writing || undefined} onClick={wizard.confirm}>
            {writing ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : null}
            {writing ? t('attendanceImport.confirm.writing', count) : writeFailed ? t('attendanceImport.confirm.retry') : t('attendanceImport.confirm.submit', count)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4" aria-busy={writing || undefined}>
        <DetailList
          items={[
            { label: t('attendanceImport.confirm.willStore'), value: t('attendanceImport.confirm.newPunches', { ...count, employees: formatNumber(employees), employeeCount: employees }) },
            { label: t('attendanceImport.confirm.range'), value: <span className="tabular-nums">{punchRange(check)}</span> },
            { label: t('attendanceImport.confirm.skipped'), value: skipped.length > 0 ? skipped.join(', ') : t('attendanceImport.confirm.none') },
            from && to
              ? { label: t('attendanceImport.confirm.daily'), value: t('attendanceImport.confirm.dailyText', { range: formatDateRange(companyDateIso(from), companyDateIso(to)) }) }
              : { label: t('attendanceImport.confirm.daily'), value: t('attendanceImport.confirm.none') },
            { label: t('attendanceImport.confirm.file'), value: <span className="break-all">{check.fileName}</span> },
          ]}
        />
        {writeFailed ? (
          <Alert variant="danger" title={t('attendanceImport.confirm.failed.title')}>
            {t('attendanceImport.confirm.failed.text')}
          </Alert>
        ) : (
          <Alert variant="info" title={t('attendanceImport.confirm.allOrNothing')}>
            {t('attendanceImport.confirm.allOrNothingText')}
          </Alert>
        )}
      </div>
    </Card>
  );
}
