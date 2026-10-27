// The list for the period and filters in the URL: the table (the agenda at 390), its paging and notes, the day drawer,
// and what stands in for them while loading, on an error, for a period that is too long, and when no one matches.
import { CalendarX2, UserX } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { Pagination } from '@/components/ui/pagination';
import { StateBlock } from '@/components/ui/state-block';
import { useCurrentAccount } from '@/features/auth/account-context';
import { ApiError } from '@/lib/api';
import { companyDateIso, formatDateRange, formatDayMonth, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DAILY_MAX_DAYS, useDailyAttendance } from '../daily-api';
import type { DailyFilters } from '../use-daily-filters';
import { DailyAgenda } from './daily-agenda';
import { DailyDetailDrawer } from './daily-detail-drawer';
import { DailyEmpty } from './daily-empty';
import { DailyTable } from './daily-table';
import { DailyToolbar } from './daily-toolbar';

export type DailyContentProps = { filters: DailyFilters; compact: boolean };

export function DailyContent({ filters, compact }: DailyContentProps) {
  const { t } = useTranslation();
  const account = useCurrentAccount();
  const canViewAll = account.permissions.includes('ATTENDANCE_VIEW');
  const canImport = account.permissions.includes('ATTENDANCE_IMPORT');
  const unlinked = !canViewAll && account.employeeId === null;
  const daily = useDailyAttendance(filters.query, !filters.tooLong && !unlinked);
  const [open, setOpen] = useState<{ employeeId: string; date: string } | null>(null);
  const data = daily.data;
  const range = formatDateRange(filters.query.from, filters.query.to);
  const uncovered = data?.coveredUntil && companyDateIso(data.coveredUntil) < filters.query.to;
  const body = () => {
    if (unlinked) return <StateBlock variant="denied" icon={<UserX />} title={t('attendanceDaily.unlinked.title')} description={t('attendanceDaily.unlinked.text')} />;
    if (filters.tooLong) return <EmptyState icon={<CalendarX2 />} title={t('attendanceDaily.period.tooLongTitle', { max: DAILY_MAX_DAYS })} description={t('attendanceDaily.period.tooLongText')} />;
    if (daily.error instanceof ApiError && daily.error.status === 403) return <StateBlock variant="denied" title={t('attendanceDaily.denied.title')} description={t('attendanceDaily.denied.text')} />;
    if (daily.isError) return <ErrorState title={t('attendanceDaily.loadError')} description={t('attendanceDaily.loadErrorText')} onRetry={() => void daily.refetch()} />;
    if (!data) return <Loading label={t('attendanceDaily.loading')} />;
    if (data.total === 0) return <DailyEmpty data={data} filters={filters} canImport={canImport} />;
    const caption = t('attendanceDaily.caption', { range });
    return (
      <div className={cn('flex flex-col gap-3', daily.isPlaceholderData && 'opacity-60')} aria-busy={daily.isPlaceholderData}>
        {uncovered ? (
          <Alert variant="warning" title={t('attendanceDaily.uncovered.title')}>
            {t('attendanceDaily.uncovered.text', { until: formatDayMonth(companyDateIso(data.coveredUntil!)) })}
            {canImport ? <Link to="/attendance/import" className="ml-2 underline">{t('attendanceDaily.import')}</Link> : null}
          </Alert>
        ) : null}
        {compact ? <DailyAgenda data={data} caption={caption} onOpen={(employeeId, date) => setOpen({ employeeId, date })} /> : <DailyTable data={data} caption={caption} onOpen={(employeeId, date) => setOpen({ employeeId, date })} />}
        <Pagination
          pageIndex={data.page}
          pageSize={data.size}
          total={data.total}
          onPageChange={filters.setPage}
          variant={compact ? 'compact' : 'default'}
          summary={(r) => t('attendanceDaily.pagination', { from: formatNumber(r.from), to: formatNumber(r.to), total: formatNumber(r.total), count: r.total })}
        />
        <p className="text-caption text-ink-muted">{t('attendanceDaily.footnote')}</p>
      </div>
    );
  };
  return (
    <>
      <Card bare>
        <div className="flex flex-col gap-4 p-4 md:p-6">
          {!canViewAll && !unlinked ? <Alert variant="info" title={t('attendanceDaily.ownOnly.title')}>{t('attendanceDaily.ownOnly.text')}</Alert> : null}
          <DailyToolbar filters={filters} compact={compact} ownOnly={!canViewAll} />
          {body()}
        </div>
      </Card>
      <DailyDetailDrawer target={open} onClose={() => setOpen(null)} />
    </>
  );
}
