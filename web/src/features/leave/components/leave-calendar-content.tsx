// The calendar for the range and filters in the URL: the grid on a desktop, the agenda at 390, the legend and the day
// drawer; and what stands in for them while loading, when it fails, when the Account may not read it, and when nobody
// is off in the range.
import { CalendarOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { StateBlock } from '@/components/ui/state-block';
import { ApiError } from '@/lib/api';
import { useMediaQuery } from '@/lib/use-media-query';
import { cn } from '@/lib/utils';
import { useLeaveCalendar } from '../calendar-api';
import { indexCalendar } from '../calendar-model';
import { periodLabel } from '../calendar-period';
import type { CalendarFilters } from '../use-calendar-filters';
import { LeaveCalendarAgenda } from './leave-calendar-agenda';
import { LeaveCalendarDayDrawer } from './leave-calendar-day-drawer';
import { LeaveCalendarGrid } from './leave-calendar-grid';
import { LeaveCalendarLegend } from './leave-calendar-legend';
import { LeaveCalendarToolbar } from './leave-calendar-toolbar';

export type LeaveCalendarContentProps = { filters: CalendarFilters };

export function LeaveCalendarContent({ filters }: LeaveCalendarContentProps) {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 767px)');
  const calendar = useLeaveCalendar(filters.query);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const index = useMemo(() => indexCalendar(calendar.data), [calendar.data]);
  const period = periodLabel(t, filters.view, filters.anchor, filters.range);
  const body = () => {
    if (calendar.error instanceof ApiError && calendar.error.status === 403) {
      return <StateBlock variant="denied" title={t('leave.calendar.denied.title')} description={t('leave.calendar.denied.text')} />;
    }
    if (calendar.isError) return <ErrorState title={t('leave.calendar.loadError')} onRetry={() => void calendar.refetch()} />;
    if (!calendar.data) return <Loading label={t('leave.calendar.loading')} />;
    return (
      <div className={cn('flex flex-col gap-3', calendar.isPlaceholderData && 'opacity-60')} aria-busy={calendar.isPlaceholderData}>
        {calendar.data.entries.length === 0 ? (
          <EmptyState icon={<CalendarOff />} title={t('leave.calendar.emptyTitle', { period })} description={filters.activeCount ? t('leave.calendar.emptyFiltered') : t('leave.calendar.emptyText')} />
        ) : null}
        {compact ? (
          <LeaveCalendarAgenda days={filters.days} index={index} today={filters.today} label={period} />
        ) : (
          <LeaveCalendarGrid view={filters.view} days={filters.days} anchor={filters.anchor} today={filters.today} index={index} caption={t('leave.calendar.caption', { period })} onOpen={setOpenDay} />
        )}
        <LeaveCalendarLegend />
      </div>
    );
  };
  return (
    <>
      <Card bare>
        <div className="flex flex-col gap-4 p-4 md:p-6">
          <LeaveCalendarToolbar filters={filters} period={period} />
          {body()}
        </div>
      </Card>
      <LeaveCalendarDayDrawer day={openDay} index={index} onClose={() => setOpenDay(null)} />
    </>
  );
}
