// The end of the import: how many punches were stored, what was skipped, and the link to the days it changed.
import { CircleCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StateBlock } from '@/components/ui/state-block';
import { companyDateIso, formatDayMonth, formatDate, formatNumber } from '@/lib/format';
import type { PunchImportResult, PunchImportSummary } from '../import-api';

export type PunchImportResultProps = { result: PunchImportResult; summary: PunchImportSummary; onAnother: () => void };

export function PunchImportResultBlock({ result, summary, onAnother }: PunchImportResultProps) {
  const { t } = useTranslation();
  const { from, to } = summary;
  const fromDay = from ? companyDateIso(from) : null;
  const toDay = to ? companyDateIso(to) : null;
  const skipped = [
    result.refused > 0 ? t('attendanceImport.result.skippedErrors', { m: formatNumber(result.refused), count: result.refused }) : null,
    result.alreadyImported > 0 ? t('attendanceImport.result.skippedExisting', { k: formatNumber(result.alreadyImported), count: result.alreadyImported }) : null,
  ].filter(Boolean);
  const who = fromDay && toDay ? t('attendanceImport.result.of', { employees: formatNumber(summary.employees), count: summary.employees, from: formatDayMonth(fromDay), to: formatDate(toDay) }) : '';
  const description = [who, skipped.length > 0 ? t('attendanceImport.result.skipped', { parts: skipped.join(t('attendanceImport.result.and')) }) : ''].filter(Boolean).join(' ');
  return (
    <Card bare>
      <StateBlock
        variant="success"
        icon={<CircleCheck />}
        title={t('attendanceImport.result.title', { n: formatNumber(result.stored), count: result.stored })}
        description={description}
        actions={
          <>
            <Button variant="secondary" onClick={onAnother}>
              {t('attendanceImport.result.another')}
            </Button>
            <Link to={fromDay && toDay ? `/attendance?from=${fromDay}&to=${toDay}` : '/attendance'} className={buttonVariants()}>
              {t('attendanceImport.viewDaily')}
            </Link>
          </>
        }
      />
    </Card>
  );
}
