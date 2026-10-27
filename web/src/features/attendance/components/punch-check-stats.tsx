// The top of step 2: the four numbers of the file, then the Alert chosen by the counts (ready, some rows with errors,
// nothing importable) and the notes that go with it (more errors than listed, the file changed since the check).
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/ui/alert';
import { StatTile } from '@/components/ui/stat-tile';
import { formatCompanyDateTime, formatNumber } from '@/lib/format';
import { PUNCH_IMPORT_MAX_ERRORS_LISTED, type PunchImportCheck } from '../import-api';

export type PunchCheckStatsProps = { check: PunchImportCheck; fileSize?: number; changed: boolean };

export function PunchCheckStats({ check, changed }: PunchCheckStatsProps) {
  const { t } = useTranslation();
  const { rowsRead, newPunches: n, alreadyImported: k, errorRows: m } = check.summary;
  const counts = { n: formatNumber(n), m: formatNumber(m), k: formatNumber(k) };
  const listed = check.errors.length;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatTile label={t('attendanceImport.stat.rows')} value={formatNumber(rowsRead)} />
        <StatTile label={t('attendanceImport.stat.new')} value={formatNumber(n)} hint={t('attendanceImport.stat.newHint')} />
        <StatTile label={t('attendanceImport.stat.existing')} value={formatNumber(k)} hint={t('attendanceImport.stat.existingHint')} />
        <StatTile label={t('attendanceImport.stat.errors')} value={formatNumber(m)} hint={t('attendanceImport.stat.errorsHint')} tone={m > 0 ? 'danger' : 'default'} />
      </div>
      {changed ? (
        <Alert variant="danger" title={t('attendanceImport.changed.title')}>
          {t('attendanceImport.changed.text')}
        </Alert>
      ) : null}
      {m === 0 ? (
        <Alert variant="success" title={t('attendanceImport.summary.ready', { ...counts, count: n })}>
          {k > 0 ? t('attendanceImport.summary.readyExisting', { ...counts, count: k }) : t('attendanceImport.summary.readyText')}
        </Alert>
      ) : n > 0 ? (
        <Alert variant="warning" title={t('attendanceImport.summary.someErrors', { ...counts, count: m })}>
          {t('attendanceImport.summary.someErrorsText', { ...counts, count: n })}
        </Alert>
      ) : (
        <Alert variant="danger" title={t('attendanceImport.summary.noneValid')}>
          {t(k > 0 ? 'attendanceImport.summary.noneValidExistingText' : 'attendanceImport.summary.noneValidText', { ...counts, count: m })}
        </Alert>
      )}
      {m > listed ? (
        <Alert variant="warning" title={t('attendanceImport.summary.moreThanListed', { limit: formatNumber(PUNCH_IMPORT_MAX_ERRORS_LISTED) })}>
          {t('attendanceImport.summary.moreThanListedText', { listed: formatNumber(listed), total: formatNumber(m) })}
        </Alert>
      ) : null}
    </div>
  );
}

/** "12/10/2026 06:51 – 17/10/2026 06:03", the time range of the valid punches; empty when there is none. */
export function punchRange(check: PunchImportCheck): string {
  const { from, to } = check.summary;
  return from && to ? `${formatCompanyDateTime(from)} – ${formatCompanyDateTime(to)}` : '';
}
