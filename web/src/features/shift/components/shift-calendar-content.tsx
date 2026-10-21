// The calendar for the range and filters in the URL: the grid on a desktop, the agenda at 390, the paging by person, the
// legend and the day drawer; and what stands in for them while loading, when it fails, when the Account may not read
// it, and when nobody matches the filters.
import { CalendarOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Loading } from '@/components/ui/loading';
import { Pagination } from '@/components/ui/pagination';
import { StateBlock } from '@/components/ui/state-block';
import { ApiError } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useShiftCalendar } from '../calendar-api';
import { indexShiftCalendar } from '../calendar-model';
import { periodLabel } from '../calendar-period';
import { useAssignDialogs } from '../use-assign-dialogs';
import type { ShiftCalendarFilters } from '../use-calendar-filters';
import { ShiftAssignDialogs } from './shift-assign-dialogs';
import { ShiftCalendarActions } from './shift-calendar-actions';
import { ShiftCalendarAgenda } from './shift-calendar-agenda';
import { ShiftCalendarDayDrawer } from './shift-calendar-day-drawer';
import { ShiftCalendarGrid } from './shift-calendar-grid';
import { ShiftCalendarLegend } from './shift-calendar-legend';
import { ShiftCalendarToolbar } from './shift-calendar-toolbar';

export type ShiftCalendarContentProps = { filters: ShiftCalendarFilters; compact: boolean };

export function ShiftCalendarContent({ filters, compact }: ShiftCalendarContentProps) {
  const { t } = useTranslation();
  const calendar = useShiftCalendar(filters.query);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const dialogs = useAssignDialogs(filters);
  const data = calendar.data;
  const index = useMemo(() => indexShiftCalendar(data), [data]);
  const period = periodLabel(t, filters.view, filters.anchor, filters.range);
  const person = filters.query.employeeId ? data?.rows[0]?.employee : undefined;
  const chosen = person ? { id: person.id, fullName: person.fullName, code: person.code } : null;
  const nobodyOnShift = data !== undefined && data.rows.length > 0 && data.rows.every((row) => row.cells.length === 0);
  const body = () => {
    if (calendar.error instanceof ApiError && calendar.error.status === 403) {
      return <StateBlock variant="denied" title={t('shiftCalendar.denied.title')} description={t('shiftCalendar.denied.text')} />;
    }
    if (calendar.isError) return <ErrorState title={t('shiftCalendar.loadError')} onRetry={() => void calendar.refetch()} />;
    if (!data) return <Loading label={t('shiftCalendar.loading')} />;
    if (data.total === 0) {
      return <EmptyState icon={<CalendarOff />} title={t('shiftCalendar.empty.title')} description={filters.activeCount ? t('shiftCalendar.empty.filtered') : t('shiftCalendar.empty.text')} />;
    }
    return (
      <div className={cn('flex flex-col gap-3', calendar.isPlaceholderData && 'opacity-60')} aria-busy={calendar.isPlaceholderData}>
        {nobodyOnShift ? <p role="status" className="text-body-small text-ink-muted">{t('shiftCalendar.noShifts', { period })}</p> : null}
        {compact ? (
          <ShiftCalendarAgenda calendar={data} index={index} days={filters.days} today={filters.today} label={period} />
        ) : (
          <ShiftCalendarGrid caption={t('shiftCalendar.caption', { period })} calendar={data} index={index} days={filters.days} today={filters.today} openDay={openDay} onOpen={setOpenDay} />
        )}
        <Pagination
          pageIndex={data.page}
          pageSize={data.size}
          total={data.total}
          onPageChange={filters.setPage}
          variant={compact ? 'compact' : 'default'}
          summary={(range) => t('shiftCalendar.pagination', { from: formatNumber(range.from), to: formatNumber(range.to), total: formatNumber(range.total) })}
        />
        <ShiftCalendarLegend />
      </div>
    );
  };
  return (
    <>
      <Card bare>
        <div className="flex flex-col gap-4 p-4 md:p-6">
          <ShiftCalendarToolbar filters={filters} period={period} chosen={chosen} actions={dialogs.allowed ? <ShiftCalendarActions dialogs={dialogs} /> : undefined} />
          {body()}
        </div>
      </Card>
      <ShiftCalendarDayDrawer day={compact ? null : openDay} query={filters.query} onClose={() => setOpenDay(null)} onAssign={dialogs.allowed ? dialogs.openAssign : undefined} />
      <ShiftAssignDialogs dialogs={dialogs} unitId={filters.query.orgUnitId} />
    </>
  );
}
