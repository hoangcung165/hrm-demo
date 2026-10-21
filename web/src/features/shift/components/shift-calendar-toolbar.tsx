// Over the calendar: the period with its pager and the Tuần / Tháng switch; under them the filters by unit, shift and
// person, and "Xóa bộ lọc" while one is set.
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { PickedEmployee } from '@/features/employee/use-employee-picker';
import type { ShiftCalendarFilters } from '../use-calendar-filters';
import { ShiftCalendarPager } from './shift-calendar-pager';
import { ShiftCalendarPersonFilter } from './shift-calendar-person-filter';
import { ShiftCalendarShiftFilter } from './shift-calendar-shift-filter';
import { ShiftCalendarUnitFilter } from './shift-calendar-unit-filter';
import { ShiftCalendarViewSwitch } from './shift-calendar-view-switch';

export type ShiftCalendarToolbarProps = {
  filters: ShiftCalendarFilters;
  period: string;
  /** The person the filter holds, named by the first answer. */
  chosen: PickedEmployee | null;
};

export function ShiftCalendarToolbar({ filters, period, chosen }: ShiftCalendarToolbarProps) {
  const { t } = useTranslation();
  return (
    <div role="toolbar" aria-label={t('shiftCalendar.toolbar')} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ShiftCalendarPager filters={filters} period={period} />
        <ShiftCalendarViewSwitch view={filters.view} onChange={filters.setView} />
      </div>
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <ShiftCalendarUnitFilter value={filters.query.orgUnitId} onChange={filters.setUnit} className="md:w-64" />
        <ShiftCalendarShiftFilter value={filters.query.shiftId} onChange={filters.setShift} className="max-md:h-11 md:w-56" />
        {/* Keyed by the person it was given, so a link to a person names them as soon as the answer is in. */}
        <ShiftCalendarPersonFilter key={chosen?.id ?? 'none'} value={filters.query.employeeId} onChange={filters.setPerson} initial={chosen} />
        {filters.activeCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={filters.clear}>
            {t('shiftCalendar.filter.clear')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
