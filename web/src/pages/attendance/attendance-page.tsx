// Công theo ngày (HRM-23; Chấm công và nghỉ phép › Chấm công), `/attendance`: one row per Employee and day with the shift,
// In, Out, worked hours and the marks (late, early, missing punch, absent, leave, holiday), computed from the stored
// punches. With ATTENDANCE_VIEW the Account reads its data scope, without it only its own days. Period and filters are in
// the URL.
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { buttonVariants } from '@/components/ui/button';
import { DailyContent } from '@/features/attendance/components/daily-content';
import { useDailyAttendance } from '@/features/attendance/daily-api';
import { useDailyFilters } from '@/features/attendance/use-daily-filters';
import { useCurrentAccount } from '@/features/auth/account-context';
import { formatCompanyDateTime } from '@/lib/format';
import { useMediaQuery } from '@/lib/use-media-query';

/** "Log quẹt thẻ có đến … · nhập lần cuối …", from the same query as the list (one request). */
function LogCaption({ filters }: { filters: ReturnType<typeof useDailyFilters> }) {
  const { t } = useTranslation();
  const data = useDailyAttendance(filters.query, !filters.tooLong).data;
  if (!data?.coveredUntil) return null;
  return (
    <p className="text-caption text-ink-muted">
      {t('attendanceDaily.logUntil', { until: formatCompanyDateTime(data.coveredUntil) })}
      {data.lastImportAt ? ` · ${t('attendanceDaily.lastImport', { at: formatCompanyDateTime(data.lastImportAt) })}` : ''}
    </p>
  );
}

export function AttendancePage() {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 767px)');
  const filters = useDailyFilters();
  const account = useCurrentAccount();
  const canImport = account.permissions.includes('ATTENDANCE_IMPORT');
  const canViewAll = account.permissions.includes('ATTENDANCE_VIEW');
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-title">{t('attendanceDaily.title')}</h1>
          {canViewAll || account.employeeId ? <LogCaption filters={filters} /> : null}
        </div>
        {canImport && !compact ? (
          <Link to="/attendance/import" className={buttonVariants()}>
            <Upload aria-hidden="true" />
            {t('attendanceDaily.import')}
          </Link>
        ) : null}
      </div>
      <DailyContent filters={filters} compact={compact} />
    </div>
  );
}
