// Over the calendar: the period with its pager and the Tuần / Tháng switch; under them the filters by unit and by
// project, each only for an Account that may list them (the others see themselves, so there is nothing to filter).
import { useTranslation } from 'react-i18next';
import { useCurrentAccount } from '@/features/auth/account-context';
import type { CalendarFilters } from '../use-calendar-filters';
import { LeaveCalendarPager } from './leave-calendar-pager';
import { LeaveCalendarProjectFilter } from './leave-calendar-project-filter';
import { LeaveCalendarUnitFilter } from './leave-calendar-unit-filter';
import { LeaveCalendarViewSwitch } from './leave-calendar-view-switch';

export type LeaveCalendarToolbarProps = { filters: CalendarFilters; period: string };

export function LeaveCalendarToolbar({ filters, period }: LeaveCalendarToolbarProps) {
  const { t } = useTranslation();
  const { permissions } = useCurrentAccount();
  const byUnit = permissions.includes('EMPLOYEE_VIEW') || permissions.includes('ORG_VIEW');
  const byProject = permissions.includes('PROJECT_VIEW');
  return (
    <div role="toolbar" aria-label={t('leave.calendar.toolbar')} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LeaveCalendarPager filters={filters} period={period} />
        <LeaveCalendarViewSwitch view={filters.view} onChange={filters.setView} />
      </div>
      {byUnit || byProject ? (
        <div className="flex flex-col gap-2 md:flex-row">
          {byUnit ? <LeaveCalendarUnitFilter value={filters.query.orgUnitId} onChange={filters.setUnit} className="md:w-72" /> : null}
          {byProject ? <LeaveCalendarProjectFilter value={filters.query.projectId} onChange={filters.setProject} className="md:w-72" /> : null}
        </div>
      ) : null}
    </div>
  );
}
